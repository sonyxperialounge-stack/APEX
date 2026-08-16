/**
 * L1 tool surface (MCP-004..006).
 *
 * Tool DESCRIPTIONS are prompt, not documentation — the model reads them every turn.
 * They are written so the correct behaviour is obvious from the schema alone.
 *
 * Failures return a teaching REJECTION rather than throwing. An actionable refusal
 * changes what the model does next; an exception just becomes noise.
 */

import path from "node:path"
import { Ledger } from "../engines/ledger.ts"
import { Verifier } from "../engines/verifier.ts"
import { Governor } from "../engines/governor.ts"
import { Warden, renderPacket } from "../engines/warden.ts"
import { Council } from "../engines/council.ts"
import { NullHostClient } from "../host/types.ts"
import { UserDecisionRequired } from "../core/errors.ts"
import { RealCommandRunner } from "../core/exec.ts"
import { REQ_STATUSES, VERIFY_TYPES, type ReqStatus, type VerificationRecord, type VerifyType } from "../core/types.ts"
import { ApexError } from "../core/errors.ts"
import { log } from "../core/log.ts"

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>
  isError?: boolean
}

const str = (description: string) => ({ type: "string", description })
const strArray = (description: string) => ({ type: "array", items: { type: "string" }, description })

export const TOOLS: ToolDefinition[] = [
  {
    name: "apex_init",
    description:
      "Create the APEX ledger for a project and detect its real verification commands. " +
      "Safe to call twice: an existing ledger is never overwritten, it is loaded. " +
      "Call this once at the start of a session, before any implementation work.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: str("Absolute path to the project. Defaults to the current directory."),
        autonomy: { type: "string", enum: ["MANUAL", "GUARDED", "AUTO", "FULL_AUTO"], description: "Default GUARDED." },
        doNotRead: strArray("Paths that must never be opened, summarised, or sent to a subagent."),
        doNotTouch: strArray("Paths that must never be modified, moved, renamed or deleted."),
        sourcesOfTruth: strArray("Plan and specification files that define the work."),
      },
    },
  },
  {
    name: "apex_status",
    description:
      "Current APEX state: requirement counts by status, the active requirement, every " +
      "blocker, the resume point, and the binding level. Call this at the start of a " +
      "session and whenever you are unsure what is already done.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "apex_req_add",
    description:
      "Record one requirement extracted from a plan, spec, or user message. Split compound " +
      "requirements — 'add auth and rate limiting' is TWO requirements, because they fail " +
      "independently. Every requirement needs an acceptance criterion and the command that " +
      "would prove it; if you cannot state those, you are not ready to start it.",
    inputSchema: {
      type: "object",
      properties: {
        source: str("Where it came from, e.g. 'docs/plan.md §3.2' or 'user message'."),
        text: str("The requirement itself."),
        acceptance: str("What must be demonstrably true. Not 'works well' — something checkable."),
        verifyBy: str("The exact command that would prove it, e.g. 'pytest tests/test_auth.py'."),
        component: str("Optional component or area."),
        dependsOn: strArray("Requirement IDs that must be done first."),
        notes: str("Optional notes, exclusions, or scope boundaries."),
      },
      required: ["source", "text", "acceptance", "verifyBy"],
    },
  },
  {
    name: "apex_req_list",
    description: "List requirements, optionally filtered by status. Use this instead of remembering them.",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: [...REQ_STATUSES] } },
    },
  },
  {
    name: "apex_req_status",
    description:
      "Set a requirement's status. The legal path is NOT_STARTED → IN_PROGRESS → " +
      "IMPLEMENTED_NOT_VERIFIED → VERIFIED_COMPLETE. Nothing skips a step. " +
      "VERIFIED_COMPLETE is REJECTED unless a passing verification record already references " +
      "this requirement — run apex_verify first. BLOCKED and NOT_APPLICABLE both require a " +
      "written reason with real evidence.",
    inputSchema: {
      type: "object",
      properties: {
        id: str("e.g. REQ-014"),
        status: { type: "string", enum: REQ_STATUSES.filter((s) => s !== "NOT_STARTED") },
        reason: str("Required for BLOCKED and NOT_APPLICABLE. State the evidence."),
        files: strArray("Files that implement this requirement."),
      },
      required: ["id", "status"],
    },
  },
  {
    name: "apex_verify",
    description:
      "Run the verification cascade (parse → types → lint → targeted test → suite → build) " +
      "and record the LITERAL output as evidence. This is the only way to earn " +
      "VERIFIED_COMPLETE. A tool that is not installed is recorded as NOT_RUN, never as a " +
      "pass. Run this after every edit — not at the end of the session.",
    inputSchema: {
      type: "object",
      properties: {
        files: strArray("Files you just changed. Used to pick the smallest relevant test."),
        reqIds: strArray("Requirement IDs this verification covers."),
        maxTier: { type: "string", enum: [...VERIFY_TYPES], description: "Stop after this tier. Use 'unit' for a fast post-edit check." },
        stopAtFirstFailure: { type: "boolean", description: "Default true — do not run expensive checks on broken code." },
      },
      required: ["reqIds"],
    },
  },
  {
    name: "apex_check",
    description:
      "Ask whether an operation is permitted BEFORE doing it. Returns allowed/denied with the " +
      "rule that decided and why. Use it before anything destructive, bulk, or irreversible.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["read", "write", "delete", "bash", "network", "deploy", "payment", "message"] },
        path: str("The file the operation targets, if any."),
        command: str("The shell command, if any."),
      },
      required: ["kind"],
    },
  },
  {
    name: "apex_snapshot",
    description:
      "Copy files before a risky change so exactly that change can be undone later, without " +
      "touching the user's unrelated work. Take one before any meaningful edit.",
    inputSchema: {
      type: "object",
      properties: { reqId: str("Requirement this belongs to."), files: strArray("Files to snapshot.") },
      required: ["reqId", "files"],
    },
  },
  {
    name: "apex_rollback",
    description:
      "Restore ONLY the files in a snapshot. Never touches anything else. A rollback is not a " +
      "completion — the requirement returns to IN_PROGRESS and the work is still owed.",
    inputSchema: {
      type: "object",
      properties: { snapshotId: str("The id returned by apex_snapshot.") },
      required: ["snapshotId"],
    },
  },
  {
    name: "apex_gate",
    description:
      "Run the completion gate. Returns whether the work may be called complete, and every " +
      "check that is not satisfied. Call this BEFORE using the words complete, done, or " +
      "finished. If it fails, report the true state instead of softening the language.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "apex_handoff",
    description:
      "Generate the handoff briefing from recorded state — not from your summary. Call it " +
      "before ending a session, before switching models, when context is getting long, and " +
      "after any blocker.",
    inputSchema: {
      type: "object",
      properties: {
        architecture: str("Two or three facts not obvious from any single file."),
        environment: str("Runtime versions, env vars, ports, what is NOT available here."),
      },
    },
  },
  {
    name: "apex_resume",
    description:
      "Set the resume point: exactly what to do next, what must not be redone, and what to " +
      "verify first. Update it after every unit of work.",
    inputSchema: {
      type: "object",
      properties: {
        nextAction: str("The precise next action."),
        doNotRedo: str("Work already verified."),
        verifyFirst: str("The command that confirms the tree is still sane."),
        watchOut: str("Traps for the next session."),
      },
    },
  },
  {
    name: "apex_decision",
    description:
      "Record a judgment call made where the specification was silent. Not every choice — only " +
      "ones that would matter to someone reading the code later. This is a record of a gap " +
      "filled minimally, never a licence to invent scope.",
    inputSchema: {
      type: "object",
      properties: {
        context: str("Which requirement, and what the source does or does not say."),
        problem: str("The actual problem."),
        options: strArray("The options considered."),
        chose: str("What you chose."),
        whyNotAViolation: str("Why this does not contradict the plan."),
        affects: strArray("Files affected."),
        reversible: str("Whether and how it can be undone."),
      },
      required: ["context", "problem", "chose", "whyNotAViolation"],
    },
  },
  {
    name: "apex_finding",
    description:
      "Record a real problem you noticed OUTSIDE your scope, instead of fixing it. This is how " +
      "you avoid scope drift without ignoring the problem.",
    inputSchema: {
      type: "object",
      properties: {
        where: str("file:line"),
        what: str("The problem."),
        whyNotFixed: str("Why it is out of scope."),
        recommend: str("Suggested follow-up."),
      },
      required: ["where", "what"],
    },
  },
  {
    name: "apex_memory_read",
    description:
      "Read project memory: environment facts, real commands, architecture, traps, and " +
      "approaches that already failed. Read it at the start of every session — it is what " +
      "stops you rediscovering things that cost a previous session an hour.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "apex_memory_write",
    description:
      "Append a fact that was expensive to learn and is not obvious from the code. Especially: " +
      "approaches that FAILED and why they were deliberately abandoned — without that, a " +
      "future session helpfully 'fixes' a deliberate decision back to the broken version.",
    inputSchema: {
      type: "object",
      properties: {
        section: { type: "string", enum: ["Environment", "Commands", "Architecture", "Traps", "Failed approaches", "User preferences"] },
        fact: str("One to three lines. Never a secret."),
      },
      required: ["section", "fact"],
    },
  },
  {
    name: "apex_delegate",
    description:
      "Spawn a supervised subagent from a packet. The packet is recorded BEFORE the spawn, " +
      "so a crash loses nothing. If the user named models, they are used EXACTLY — this never " +
      "substitutes an unavailable model; it returns USER_DECISION_REQUIRED instead. Remember " +
      "that a subagent's report is a claim: you must read its diff and re-run its checks.",
    inputSchema: {
      type: "object",
      properties: {
        objective: str("Exactly what this subagent must do. Nothing adjacent."),
        reqIds: strArray("Requirement IDs it covers."),
        allowedPaths: strArray("The ONLY paths it may write."),
        acceptance: strArray("Criteria, each checkable individually."),
        requiredVerification: strArray("Commands it must run and paste literal output for."),
        model: str("Exact model key. Omit to use the configured worker."),
        role: { type: "string", enum: ["researcher", "implementer", "reviewer", "tester"] },
        context: str("What it needs to know that it cannot infer."),
      },
      required: ["objective", "allowedPaths", "acceptance"],
    },
  },
  {
    name: "apex_subagent_status",
    description:
      "State, checkpoint and attempt count for delegated work. An idle subagent whose " +
      "acceptance criteria are unmet is a FAILURE, not a completion — that is the state most " +
      "often mistaken for success.",
    inputSchema: { type: "object", properties: { id: str("Subagent id, e.g. W-0001. Omit for all.") } },
  },
  {
    name: "apex_council",
    description:
      "Convene an independent reviewer for a diff. Only for: security-relevant changes, " +
      "irreversible operations, expensive architectural decisions, a third consecutive failure, " +
      "or requirement diffing. For routine work this REFUSES — verification is cheaper and " +
      "stronger than a second opinion. The reviewer must be a different model from the " +
      "implementer, and its findings are hypotheses you must verify before acting on them.",
    inputSchema: {
      type: "object",
      properties: {
        reqId: str("Requirement under review."),
        diff: str("The change to review."),
        testOutput: str("Literal output of the checks that ran."),
        implementerModel: str("The model that wrote it — the reviewer must differ."),
        trigger: { type: "string", enum: ["third_failure", "security", "irreversible", "architecture", "requirement_extraction"] },
      },
      required: ["reqId", "diff", "implementerModel"],
    },
  },
  {
    name: "apex_findings",
    description: "List every out-of-scope problem recorded so far, so none is quietly forgotten.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "apex_task_result",
    description:
      "Poll a long-running operation started by apex_verify with a full tier. Returns the " +
      "records once finished, or {status:'running'} while it is still going.",
    inputSchema: {
      type: "object",
      properties: { taskId: str("The id returned by the async call.") },
      required: ["taskId"],
    },
  },
]

/**
 * MCP-010 — long operations must not block the protocol loop.
 *
 * A full suite can run for minutes. Blocking the stdio reader for that long makes the
 * host look hung and stops it cancelling anything.
 */
interface AsyncTask {
  id: string
  status: "running" | "done" | "failed"
  startedAt: number
  result?: unknown
  error?: string
}

const TASKS = new Map<string, AsyncTask>()
let taskCounter = 0

export function startTask<T>(work: Promise<T>): AsyncTask {
  const task: AsyncTask = {
    id: `T-${String(++taskCounter).padStart(3, "0")}`,
    status: "running",
    startedAt: Date.now(),
  }
  TASKS.set(task.id, task)
  work.then(
    (result) => Object.assign(task, { status: "done", result }),
    (err) => Object.assign(task, { status: "failed", error: String(err) }),
  )
  return task
}

export function getTask(id: string): AsyncTask | undefined {
  return TASKS.get(id)
}

/**
 * Wait for every in-flight task to settle.
 *
 * Used at shutdown and in tests. Without it a background cascade keeps writing to the
 * ledger after the caller has moved on, which surfaces as a directory that will not
 * delete — and, in production, as evidence landing after the report was written.
 */
export async function awaitAllTasks(timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (![...TASKS.values()].some((t) => t.status === "running")) return
    await new Promise((r) => setTimeout(r, 50))
  }
}

/** Drop finished tasks. Running ones are left alone. */
export function clearFinishedTasks(): void {
  for (const [id, task] of TASKS) if (task.status !== "running") TASKS.delete(id)
}

/** Tiers heavy enough that the caller should poll rather than wait. */
const SLOW_TIERS = new Set(["suite", "build", "runtime", "integration"])

export interface ToolContext {
  projectRoot: string
}

export async function callTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  try {
    return await dispatch(name, args, ctx)
  } catch (err) {
    // MCP-005 — a rejection teaches; an exception is noise. Return, do not throw.
    const message = err instanceof ApexError ? err.message : `Unexpected error: ${(err as Error).message}`
    log.warn(`tool ${name} rejected`, { message })
    return text(`REJECTED: ${message}`)
  }
}

async function dispatch(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const root = String(args.projectRoot ?? ctx.projectRoot)
  const ledger = new Ledger(root)

  switch (name) {
    case "apex_init": {
      const result = await ledger.init({
        projectRoot: root,
        autonomy: args.autonomy as never,
        doNotRead: (args.doNotRead as string[]) ?? [],
        doNotTouch: (args.doNotTouch as string[]) ?? [],
        sourcesOfTruth: (args.sourcesOfTruth as string[]) ?? [],
      })
      const config = await ledger.loadConfig()
      const verifier = new Verifier(config, new RealCommandRunner(), ledger)
      const commands = await verifier.ensureCommands()
      const memory = await readMemory(ledger)
      return json({
        created: result.created,
        ledger: path.join(root, ".apex"),
        message: result.created
          ? "Ledger created."
          : "An existing ledger was found and loaded. It is a previous session's memory — read HANDOFF.md before changing anything.",
        autonomy: config.autonomy,
        protectedPaths: { doNotRead: config.doNotRead, doNotTouch: config.doNotTouch },
        verifyCommands: commands,
        verifyCommandsNote: Object.values(commands).some((v) => v)
          ? "Detected from the project's own configuration."
          : "None detected. Verification will be limited to NOT_RUN until commands are configured — say so rather than claiming work is verified.",
        memory: memory.slice(0, 2000),
      })
    }

    case "apex_status":
      return json(await ledger.status())

    case "apex_req_add": {
      const req = await ledger.addRequirement({
        source: String(args.source),
        text: String(args.text),
        acceptance: String(args.acceptance),
        verifyBy: String(args.verifyBy),
        component: args.component ? String(args.component) : undefined,
        dependsOn: (args.dependsOn as string[]) ?? [],
        notes: args.notes ? String(args.notes) : undefined,
      })
      return json({ requirement: req, note: "Status is NOT_STARTED. Set IN_PROGRESS when you begin." })
    }

    case "apex_req_list":
      return json(await ledger.listRequirements(args.status ? { status: args.status as ReqStatus } : undefined))

    case "apex_req_status": {
      const req = await ledger.setStatus(String(args.id), args.status as ReqStatus, {
        reason: args.reason ? String(args.reason) : undefined,
        files: (args.files as string[]) ?? undefined,
      })
      return json({ requirement: req, totals: await ledger.totals() })
    }

    case "apex_verify": {
      const config = await ledger.loadConfig()
      const verifier = new Verifier(config, new RealCommandRunner(), ledger)

      // MCP-010 — a heavy tier returns a task id immediately instead of holding the loop.
      if (args.maxTier && SLOW_TIERS.has(String(args.maxTier)) && args.await !== true) {
        const task = startTask(
          verifier.cascade((args.files as string[]) ?? [], (args.reqIds as string[]) ?? [], {
            maxTier: args.maxTier as VerifyType,
            stopAtFirstFailure: args.stopAtFirstFailure !== false,
          }),
        )
        return json({
          taskId: task.id,
          status: "running",
          poll: "apex_task_result",
          note:
            `The ${String(args.maxTier)} tier can take minutes. Poll apex_task_result with this ` +
            `id. Nothing is verified until it returns.`,
        })
      }

      const records = await verifier.cascade(
        (args.files as string[]) ?? [],
        (args.reqIds as string[]) ?? [],
        {
          maxTier: args.maxTier as VerifyType | undefined,
          stopAtFirstFailure: args.stopAtFirstFailure !== false,
        },
      )
      const failed = records.filter((r) => r.result === "FAIL")
      const notRun = records.filter((r) => r.result === "NOT_RUN")
      return json({
        records: records.map((r) => ({
          id: r.id,
          type: r.type,
          command: r.command,
          result: r.result,
          reason: r.reason,
          output: r.actual.slice(0, 4000),
        })),
        tierReached: Verifier.tierReached(records),
        verdict: failed.length
          ? "FAILED — fix this before continuing. Do not report success."
          : Verifier.allPassed(records)
            ? "PASSED — this evidence can now support VERIFIED_COMPLETE."
            : "NOTHING RAN — every tier was NOT_RUN. You cannot claim this is verified.",
        notRun: notRun.map((r) => ({ type: r.type, reason: r.reason })),
      })
    }

    case "apex_task_result": {
      const task = getTask(String(args.taskId))
      if (!task) {
        return text(
          `REJECTED: no task ${String(args.taskId)}. It may have been started in a previous ` +
            `server run — re-run apex_verify.`,
        )
      }
      if (task.status === "running") {
        return json({ taskId: task.id, status: "running", elapsedMs: Date.now() - task.startedAt })
      }
      if (task.status === "failed") {
        return json({ taskId: task.id, status: "failed", error: task.error })
      }
      const done = task.result as VerificationRecord[]
      const failedRecords = done.filter((r) => r.result === "FAIL")
      return json({
        taskId: task.id,
        status: "done",
        records: done.map((r) => ({
          id: r.id, type: r.type, command: r.command, result: r.result,
          reason: r.reason, output: r.actual.slice(0, 4000),
        })),
        tierReached: Verifier.tierReached(done),
        verdict: failedRecords.length
          ? "FAILED — fix this before continuing. Do not report success."
          : Verifier.allPassed(done)
            ? "PASSED — this evidence can now support VERIFIED_COMPLETE."
            : "NOTHING RAN — every tier was NOT_RUN. You cannot claim this is verified.",
      })
    }

    case "apex_delegate": {
      const config = await ledger.loadConfig()
      const warden = new Warden(new NullHostClient(), ledger, new Governor(config), config)
      const existing = await ledger.listSubagents()
      const packet = {
        id: `W-${String(existing.length + 1).padStart(4, "0")}`,
        reqIds: (args.reqIds as string[]) ?? [],
        objective: String(args.objective),
        context: String(args.context ?? ""),
        readThese: [],
        allowedPaths: (args.allowedPaths as string[]) ?? [],
        doNotRead: config.doNotRead,
        doNotTouch: config.doNotTouch,
        expectedOutput: "Working result plus the literal output of every required check.",
        acceptance: (args.acceptance as string[]) ?? [],
        requiredVerification: (args.requiredVerification as string[]) ?? [],
        model: String(args.model ?? config.delegation.models.workers[0] ?? ""),
        role: (args.role as "implementer") ?? "implementer",
        writer: true,
        timeoutMs: 900_000,
        checkpointIntervalMs: 600_000,
        alreadyExists: [] as string[],
        previousFailure: "",
        strategyChange: "",
        attempt: 1,
        maxAttempts: config.limits.maxSubagentRetries,
        fleetId: "FLEET-001",
        wave: 0,
      }

      // WAR-011 / FLT-010 — refuse overlapping writers before anything is spawned.
      const safety = warden.checkWriteSafety([packet])
      if (!safety.safe) return text(`REJECTED: ${safety.conflict}`)

      try {
        const record = await warden.dispatch(packet)
        return json({ subagent: record, packet: renderPacket(packet) })
      } catch (err) {
        if (err instanceof UserDecisionRequired) return text(`USER_DECISION_REQUIRED: ${err.message}`)
        // FLT-017 — no host to spawn into. Hand back the packet and say plainly that no
        // subagent ran, rather than letting the caller imply one did.
        await ledger.upsertSubagent({
          id: packet.id, parentReqIds: packet.reqIds, sessionId: "", scope: packet.objective,
          allowedPaths: packet.allowedPaths, forbiddenPaths: packet.doNotTouch,
          acceptance: packet.acceptance.join(" | "), state: "ASSIGNED", checkpoint: "",
          filesChanged: [], parentVerification: "", failureClass: "", attempt: 1,
          maxAttempts: packet.maxAttempts, nextStrategy: "", model: packet.model,
          fleetId: packet.fleetId,
        })
        return json({
          spawned: false,
          reason: (err as Error).message,
          packet: renderPacket(packet),
          note:
            "This host cannot spawn subagents. Run this packet yourself, sequentially, and say " +
            "so — do not report that a subagent ran.",
        })
      }
    }

    case "apex_subagent_status": {
      const all = await ledger.listSubagents()
      const wanted = args.id ? all.filter((s) => s.id === String(args.id)) : all
      return json({
        subagents: wanted,
        note: wanted.some((s) => s.state === "RETURNED_UNVERIFIED")
          ? "A subagent returned unverified work. Read its diff and re-run its checks yourself before accepting anything."
          : undefined,
      })
    }

    case "apex_council": {
      const config = await ledger.loadConfig()
      const council = new Council(new NullHostClient(), ledger, config)
      const trigger = String(args.trigger ?? "")
      const gate = council.shouldConvene({
        consecutiveFailures: trigger === "third_failure" ? 3 : 0,
        securityRelevant: trigger === "security",
        irreversible: trigger === "irreversible",
        architectural: trigger === "architecture",
        reversalCostHours: trigger === "architecture" ? 4 : 0,
        kind: trigger === "requirement_extraction" ? "requirement-extraction" : "review",
      })
      if (!gate.yes) return text(`DECLINED: ${gate.reason}`)
      try {
        const result = await council.review({
          requirementId: String(args.reqId),
          requirementText: String(args.requirementText ?? ""),
          acceptance: String(args.acceptance ?? ""),
          diff: String(args.diff),
          testOutput: String(args.testOutput ?? ""),
          implementerModel: String(args.implementerModel),
        })
        return json({ ...result, trigger: gate.trigger })
      } catch (err) {
        return text(`DECLINED: ${(err as Error).message}`)
      }
    }

    case "apex_findings": {
      const findings = await ledger.listFindings()
      return json({
        findings,
        count: findings.length,
        note: findings.length
          ? "These were noticed and deliberately not fixed. None may be silently dropped."
          : undefined,
      })
    }

    case "apex_check": {
      const config = await ledger.loadConfig()
      const governor = new Governor(config)
      const op = {
        kind: args.kind as never,
        path: args.path ? String(args.path) : undefined,
        command: args.command ? String(args.command) : undefined,
      }
      const decision = governor.decide(op)
      const violations =
        op.command && Governor.looksBulk(op.command) ? await governor.bulkViolations(op.command) : []
      return json({
        ...decision,
        bulkViolations: violations,
        bulkNote: violations.length
          ? `This command expands onto ${violations.length} protected path(s). Narrow it so it touches only what you intend.`
          : undefined,
      })
    }

    case "apex_snapshot": {
      const config = await ledger.loadConfig()
      const ref = await new Governor(config).snapshot(String(args.reqId), (args.files as string[]) ?? [])
      return json({ snapshotId: ref.id, dir: ref.dir, files: ref.files.length, preExistingDirty: ref.preExistingDirty })
    }

    case "apex_rollback": {
      const config = await ledger.loadConfig()
      const ref = await findSnapshot(root, String(args.snapshotId))
      if (!ref) return text(`REJECTED: no snapshot ${String(args.snapshotId)} was found.`)
      const report = await new Governor(config).rollback(ref)
      return json({
        ...report,
        note: "A rollback is not a completion. The requirement returns to IN_PROGRESS.",
      })
    }

    case "apex_gate":
      return json(await runGate(ledger))

    case "apex_handoff":
      return text(
        await ledger.generateHandoff({
          architecture: args.architecture ? String(args.architecture) : undefined,
          environment: args.environment ? String(args.environment) : undefined,
        }),
      )

    case "apex_resume":
      await ledger.setResumePoint({
        nextAction: args.nextAction ? String(args.nextAction) : undefined,
        doNotRedo: args.doNotRedo ? String(args.doNotRedo) : undefined,
        verifyFirst: args.verifyFirst ? String(args.verifyFirst) : undefined,
        watchOut: args.watchOut ? String(args.watchOut) : undefined,
      } as never)
      return json({ resumePoint: await ledger.getResumePoint() })

    case "apex_decision":
      return json(
        await ledger.addDecision({
          context: String(args.context),
          problem: String(args.problem),
          options: (args.options as string[]) ?? [],
          chose: String(args.chose),
          whyNotAViolation: String(args.whyNotAViolation),
          affects: (args.affects as string[]) ?? [],
          reversible: String(args.reversible ?? "unknown"),
        }),
      )

    case "apex_finding":
      return json(
        await ledger.addFinding({
          where: String(args.where),
          what: String(args.what),
          whyNotFixed: String(args.whyNotFixed ?? "out of scope for the current requirement"),
          recommend: String(args.recommend ?? "follow-up task"),
        }),
      )

    case "apex_memory_read":
      return text((await readMemory(ledger)) || "# Project Memory\n(empty — nothing learned yet)")

    case "apex_memory_write": {
      await appendMemory(ledger, String(args.section), String(args.fact))
      return json({ ok: true, section: args.section })
    }

    default:
      return text(`REJECTED: unknown tool "${name}". Available: ${TOOLS.map((t) => t.name).join(", ")}`)
  }
}

// ── gate ────────────────────────────────────────────────────────────────────

export async function runGate(ledger: Ledger): Promise<{
  passed: boolean
  failures: string[]
  totals: Record<string, number>
  verdict: string
}> {
  const reqs = await ledger.listRequirements()
  const verifications = await ledger.listVerifications()
  const subagents = await ledger.listSubagents()
  const totals = await ledger.totals()
  const failures: string[] = []

  if (reqs.length === 0) failures.push("No requirements are recorded. An empty ledger cannot pass the gate.")

  for (const r of reqs) {
    if (r.status === "NOT_STARTED") failures.push(`${r.id} is NOT_STARTED.`)
    if (r.status === "IN_PROGRESS") failures.push(`${r.id} is still IN_PROGRESS.`)
    if (r.status === "IMPLEMENTED_NOT_VERIFIED")
      failures.push(`${r.id} is implemented but NOT verified — ${r.reason || "no reason recorded"}.`)
    if (r.status === "BLOCKED") failures.push(`${r.id} is BLOCKED — ${r.reason}.`)
    if (r.status === "NOT_APPLICABLE" && !r.reason) failures.push(`${r.id} is NOT_APPLICABLE without a justification.`)
    if (r.status === "VERIFIED_COMPLETE") {
      const mine = verifications.filter((v) => v.reqIds.includes(r.id))
      const passing = mine.filter((v) => v.result === "PASS")
      if (!passing.length) {
        failures.push(`${r.id} claims VERIFIED_COMPLETE but has no passing verification record.`)
      } else {
        // Evidence is TEMPORAL. A later failure supersedes an earlier pass — otherwise a
        // regression introduced after the requirement was closed would sail through the
        // gate on stale proof.
        const latest = latestOf(mine)
        if (latest && latest.result === "FAIL") {
          failures.push(
            `${r.id} is marked VERIFIED_COMPLETE, but its most recent check (${latest.id}, ` +
              `\`${latest.command}\`) FAILED${latest.reason ? ` — ${latest.reason}` : ""}. ` +
              `The earlier pass is stale. Reopen it as IN_PROGRESS.`,
          )
        }
      }
    }
  }

  // A regression anywhere invalidates the run, even if no single requirement owns it.
  const latestSuite = latestOf(verifications.filter((v) => v.type === "suite" || v.type === "build"))
  if (latestSuite?.result === "FAIL") {
    failures.push(
      `The most recent full check (${latestSuite.id}, \`${latestSuite.command}\`) FAILED. ` +
        `The suite must pass in its FINAL state, not in a remembered earlier one.`,
    )
  }

  const sum = Object.values(totals).reduce((a, b) => a + b, 0)
  if (sum !== reqs.length) failures.push(`Totals do not reconcile: ${sum} counted vs ${reqs.length} rows.`)

  for (const s of subagents) {
    if (!["VERIFIED_ACCEPTED", "ABANDONED_BLOCKED"].includes(s.state))
      failures.push(`Subagent ${s.id} is ${s.state} — delegated work must reach a terminal state.`)
  }

  const resume = await ledger.getResumePoint()
  if (!resume.nextAction) failures.push("No resume point is recorded. A successor could not continue.")

  const anyRealCheck = verifications.some((v) => v.result === "PASS" || v.result === "FAIL")
  if (!anyRealCheck) failures.push("No verification has actually run. Nothing here is proven.")

  return {
    passed: failures.length === 0,
    failures,
    totals,
    verdict:
      failures.length === 0
        ? "GATE PASSED. You may write the completion report."
        : `GATE FAILED — ${failures.length} unmet check(s). Do not claim completion. Report the true state instead.`,
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * The most recent record in a set. Verification ids are monotonic (V-001, V-002…), so
 * they order reliably even when two records share a timestamp.
 */
function latestOf<T extends { id: string; timestamp: string }>(records: T[]): T | null {
  if (!records.length) return null
  return [...records].sort((a, b) => {
    const byTime = a.timestamp.localeCompare(b.timestamp)
    if (byTime !== 0) return byTime
    return numericSuffix(a.id) - numericSuffix(b.id)
  })[records.length - 1]!
}

function numericSuffix(id: string): number {
  return Number(/-(\d+)$/.exec(id)?.[1] ?? 0)
}

function text(value: string): ToolResult {
  return { content: [{ type: "text", text: value }] }
}

function json(value: unknown): ToolResult {
  return text(JSON.stringify(value, null, 2))
}

async function readMemory(ledger: Ledger): Promise<string> {
  const { readTextOrNull } = await import("../core/json.ts")
  return (await readTextOrNull(ledger.file("MEMORY.md"))) ?? ""
}

async function appendMemory(ledger: Ledger, section: string, fact: string): Promise<void> {
  const { readTextOrNull, writeText } = await import("../core/json.ts")
  const current = (await readTextOrNull(ledger.file("MEMORY.md"))) ?? "# Project Memory\n"
  const heading = `## ${section}`
  const line = `- ${fact.trim()}`
  if (current.includes(line)) return // deduped
  const next = current.includes(heading)
    ? current.replace(heading, `${heading}\n${line}`)
    : `${current.trimEnd()}\n\n${heading}\n${line}\n`
  await writeText(ledger.file("MEMORY.md"), next)
}

async function findSnapshot(root: string, id: string) {
  const { readJson } = await import("../core/json.ts")
  const fsp = await import("node:fs/promises")
  const base = path.join(root, ".apex", "snapshots")
  const stack = [base]
  while (stack.length) {
    const dir = stack.pop()!
    let entries
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true, encoding: "utf8" })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === id) return readJson(path.join(full, "manifest.json"), null)
        stack.push(full)
      }
    }
  }
  return null
}
