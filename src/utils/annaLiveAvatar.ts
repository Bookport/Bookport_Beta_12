const ANNA_LIVE_AVATAR_SOURCES = Array.from(
  { length: 20 },
  (_, index) => `/anna/live/idle-${String(index + 1).padStart(2, "0")}.webp`,
);

let currentIndex: number | null = null;

export function getNextAnnaLiveAvatar(): string {
  if (currentIndex === null) {
    currentIndex = Math.floor(
      Math.random() * ANNA_LIVE_AVATAR_SOURCES.length,
    );
    return ANNA_LIVE_AVATAR_SOURCES[currentIndex];
  }

  const nextOffset =
    1 + Math.floor(Math.random() * (ANNA_LIVE_AVATAR_SOURCES.length - 1));

  currentIndex =
    (currentIndex + nextOffset) % ANNA_LIVE_AVATAR_SOURCES.length;

  return ANNA_LIVE_AVATAR_SOURCES[currentIndex];
}