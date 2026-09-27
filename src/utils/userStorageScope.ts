// Этап 2.3: WebView Telegram отдаёт один и тот же localStorage всем аккаунтам телефона,
// поэтому кэш одного человека открывается второму. Здесь «рабочий» набор ключей принадлежит
// тому, кто открыт сейчас, а данные остальных лежат припаркованными под `u_<telegramId>__`.
//
// Активные ключи сознательно остаются БЕЗ префикса: два обхода целиком завязаны на него —
// `src/services/SystemKeysStore.ts:75` (читает хранилище при импорте модуля) и ночной сброс
// `src/App.tsx:529` (`startsWith("wfpb_daily_")`). Переписывать 66 мест обращения дороже,
// чем один проход здесь.
//
// Ключ владельца не начинается с `wfpb_`, иначе SystemKeysStore примет его за состояние
// и положит в свой кэш.

const OWNER_KEY = "bp_storage_owner_v1";
const PARK_PREFIX = "u_";

// Семьи ключей этого приложения: личные данные и их кэш, не флаги браузера.
const FAMILIES = ["wfpb_", "calculators.", "notif_last_shown_"];
const STANDALONE = ["isGodMode"];

export type ScopeResult = {
  owner: string | null;
  previous: string | null;
  parked: number;
  restored: number;
  reason?: "no-window" | "no-telegram-id" | "same-owner";
};

function currentTelegramId(): string | null {
  try {
    const webApp = (window as any).Telegram?.WebApp;
    const fromUnsafe = webApp?.initDataUnsafe?.user?.id;
    if (fromUnsafe) return String(fromUnsafe);
    // initDataUnsafe пуст, если SDK ещё не инициализирован; `user` есть и в самой строке
    // initData — читаем её локально, проверкой подписи на клиенте заниматься незачем.
    const raw = webApp?.initData;
    if (raw) {
      const user = JSON.parse(new URLSearchParams(raw).get("user") || "null");
      if (user?.id) return String(user.id);
    }
  } catch {
    // хранилище или SDK биты — остаёмся на текущем наборе ключей
  }
  return null;
}

function isOurActiveKey(key: string): boolean {
  if (key === OWNER_KEY || key.startsWith(PARK_PREFIX)) return false;
  return FAMILIES.some((f) => key.startsWith(f)) || STANDALONE.includes(key);
}

function readKeys(store: Storage): string[] {
  const out: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k) out.push(k);
  }
  return out;
}

function move(store: Storage, from: string, to: string): void {
  const value = store.getItem(from);
  if (value === null) return;
  store.setItem(to, value);
  store.removeItem(from);
}

export function scopeStorageToCurrentUser(): ScopeResult {
  if (typeof window === "undefined") return { owner: null, previous: null, parked: 0, restored: 0, reason: "no-window" };
  let store: Storage | null = null;
  try {
    store = window.localStorage;
  } catch {
    store = null;
  }
  if (!store) return { owner: null, previous: null, parked: 0, restored: 0, reason: "no-window" };

  const owner = currentTelegramId();
  if (!owner) return { owner: null, previous: store.getItem(OWNER_KEY), parked: 0, restored: 0, reason: "no-telegram-id" };

  const previous = store.getItem(OWNER_KEY);
  if (previous === owner) return { owner, previous, parked: 0, restored: 0, reason: "same-owner" };

  let parked = 0;
  let restored = 0;

  // У безымянного набора (первый запуск после этого апгрейда) владельца не выдумываем:
  // он принадлежал тому, кто открыл приложение первым, — то есть, скорее всего, текущему.
  if (previous) {
    for (const key of readKeys(store)) {
      if (!isOurActiveKey(key)) continue;
      move(store, key, `${PARK_PREFIX}${previous}__${key}`);
      parked++;
    }
  }

  const ownPrefix = `${PARK_PREFIX}${owner}__`;
  for (const key of readKeys(store)) {
    if (!key.startsWith(ownPrefix)) continue;
    move(store, key, key.slice(ownPrefix.length));
    restored++;
  }

  store.setItem(OWNER_KEY, owner);
  return { owner, previous, parked, restored };
}

scopeStorageToCurrentUser();
