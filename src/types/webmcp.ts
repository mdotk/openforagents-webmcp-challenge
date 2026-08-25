export interface JsonSchema {
  readonly type: 'object'
  readonly properties: Readonly<Record<string, unknown>>
  readonly required?: readonly string[]
  readonly additionalProperties: false
}

export interface WebMcpToolResult {
  readonly content: readonly {
    readonly type: 'text'
    readonly text: string
  }[]
}

export interface WebMcpTool {
  readonly name: string
  readonly description: string
  readonly inputSchema: JsonSchema
  readonly annotations?: {
    readonly readOnlyHint: boolean
    readonly untrustedContentHint: boolean
  }
  execute(
    args: Record<string, unknown>,
    context?: { readonly signal?: AbortSignal },
  ): Promise<WebMcpToolResult> | WebMcpToolResult
}

export interface RegisteredWebMcpTool {
  readonly name: string
}

export interface WebMcpModelContext {
  registerTool(
    tool: WebMcpTool,
    options: { readonly signal: AbortSignal },
  ): Promise<unknown>
  getTools(): Promise<readonly RegisteredWebMcpTool[]>
  addEventListener?(
    type: 'toolchange',
    listener: EventListenerOrEventListenerObject,
  ): void
  removeEventListener?(
    type: 'toolchange',
    listener: EventListenerOrEventListenerObject,
  ): void
}

export interface WebMcpDocumentScope {
  readonly modelContext?: WebMcpModelContext
}

export interface MissionToolsRegistration {
  readonly supported: boolean
  readonly permanentToolNames: readonly string[]
  getRegisteredToolNames(): Promise<readonly string[]>
  getLastError(): Error | null
  whenIdle(): Promise<void>
  dispose(): Promise<void>
}
