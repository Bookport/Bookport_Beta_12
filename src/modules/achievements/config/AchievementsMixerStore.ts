let courseStartTimestamp: number | null = null

export function getCourseStartTimestamp(): number | null {
  return courseStartTimestamp
}

export function setCourseStartTimestamp(ts?: number): void {
  if (courseStartTimestamp !== null) return
  courseStartTimestamp = ts ?? Date.now()
}

export function initFromISOString(iso: string | null | undefined): void {
  if (!iso) {
    setCourseStartTimestamp(Date.now())
    return
  }
  const ts = new Date(iso).getTime()
  if (!isNaN(ts)) setCourseStartTimestamp(ts)
}

export function getDaysSinceCourseStart(): number {
  const ts = getCourseStartTimestamp()
  if (!ts) return 0
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24))
}

export function canMix(
  isFreshUnlock: boolean,
  isMixerConsumed: boolean,
): boolean {
  if (!isFreshUnlock) return false
  if (isMixerConsumed) return false
  if (getDaysSinceCourseStart() < 3) return false
  return true
}
