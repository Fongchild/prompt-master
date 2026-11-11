export type Status = 'idle' | 'working' | 'error'

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': { status: Status; original: string | null; suggestion: string | null }
  }
}
