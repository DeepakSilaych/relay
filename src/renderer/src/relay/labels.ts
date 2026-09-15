// Relay retains English labels for the shared Orca primitives without loading its language catalog.
export function translate(_key: string, fallback: string): string {
  return fallback
}
