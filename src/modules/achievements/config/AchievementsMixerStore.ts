let courseStartTimestamp: number | null = null

export function initFromISOString(iso: string | null | undefined): void {
  if (!iso) {
    courseStartTimestamp = Date.now()
    return
  }
  const ts = new Date(iso).getTime()
  if (!isNaN(ts)) courseStartTimestamp = ts
}
