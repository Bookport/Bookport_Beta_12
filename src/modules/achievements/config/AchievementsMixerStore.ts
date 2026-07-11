let courseStartTimestamp: number | null = null

export function getCourseStartTimestamp(): number | null {
  return courseStartTimestamp
}

export function setCourseStartTimestamp(): void {
  if (courseStartTimestamp === null) {
    courseStartTimestamp = Date.now()
  }
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
