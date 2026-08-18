/*
 * APEX — ARMY V3 — Copyright (c) 2026 Lalit. All rights reserved.
 * Licensed under the APEX Personal Use License 1.0 (see the LICENSE file).
 * Not open source: personal, non-commercial use of unmodified copies only.
 * Modification, resale, commercial use, and renaming are prohibited.
 * Removing this notice or the LICENSE grants no rights whatsoever.
 */

/** Host abstraction. Engines depend on this interface, never on a concrete host. */

export interface ModelRef {
  key: string
  providerId: string
  modelId: string
  name: string
  connected: boolean
}

export interface SessionRef {
  id: string
  parentId?: string
  title?: string
}

export interface HostEvent {
  type: string
  sessionId?: string
  path?: string
  message?: string
  properties?: Record<string, unknown>
}

export interface HostClient {
  /** Live model catalog. Never hardcoded — see FLT-004. */
  listModels(): Promise<ModelRef[]>
  createSession(title: string, parentId?: string): Promise<SessionRef>
  children(sessionId: string): Promise<SessionRef[]>
  prompt(sessionId: string, model: string, text: string, opts?: { agent?: string; timeoutMs?: number }): Promise<string>
  abort(sessionId: string): Promise<void>
  sessionDiff(sessionId: string): Promise<string | null>
  events(sessionId?: string): AsyncIterable<HostEvent>
  statusFor(models: string[]): Promise<Record<string, string>>
  isAvailable(): Promise<boolean>
}

/** No host reachable: delegation degrades to sequential, and says so (FLT-017). */
export class NullHostClient implements HostClient {
  async listModels(): Promise<ModelRef[]> {
    return []
  }
  async createSession(_title: string, _parentId?: string): Promise<SessionRef> {
    throw new Error("No host is available: this environment cannot spawn subagents.")
  }
  async children(_sessionId: string): Promise<SessionRef[]> {
    return []
  }
  async prompt(_sessionId: string, _model: string, _text: string): Promise<string> {
    throw new Error("No host is available: this environment cannot call a model.")
  }
  async abort(_sessionId: string): Promise<void> {}
  async sessionDiff(_sessionId: string): Promise<string | null> {
    return null
  }
  async *events(_sessionId?: string): AsyncIterable<HostEvent> {}
  async statusFor(models: string[]): Promise<Record<string, string>> {
    return Object.fromEntries(models.map((m) => [m, "no host available"]))
  }
  async isAvailable(): Promise<boolean> {
    return false
  }
}
