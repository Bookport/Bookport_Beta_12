let godModeEnabled = false

export function isGodModeEnabled(): boolean {
  return godModeEnabled
}

export function setGodMode(enabled: boolean): void {
  godModeEnabled = enabled
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('godmode-changed', { detail: { enabled } }))
  }
}
