/**
 * Browser-side login throttle for /auth.
 *
 * After a few wrong passwords the form locks itself for a while, and the wait
 * grows with every new streak of failures. This is a usability guard against
 * password guessing from this device — it lives in the browser only, so treat
 * it as a speed bump rather than a server-enforced security boundary.
 */

const KEY = "pvt.loginAttempts";

/** Failures allowed before the form locks. */
export const MAX_ATTEMPTS = 5;
/** Escalating lock windows, in seconds, per lock round. */
const LOCK_STEPS = [60, 300, 900, 1800];
/** Failures older than this are forgotten. */
const WINDOW_MS = 15 * 60 * 1000;

type Record_ = {
  fails: number;
  /** How many times this address has already been locked. */
  locks: number;
  lastFail: number;
  lockedUntil: number;
};

type Store = Record<string, Record_>;

const empty: Record_ = { fails: 0, locks: 0, lastFail: 0, lockedUntil: 0 };

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // private mode or full storage: the throttle simply resets
  }
}

function entry(store: Store, key: string): Record_ {
  const found = store[key];
  if (!found) return { ...empty };
  // Drop a stale streak so an honest user is not punished hours later.
  if (found.lockedUntil <= Date.now() && Date.now() - found.lastFail > WINDOW_MS) {
    return { ...empty, locks: found.locks };
  }
  return found;
}

export type LockState = {
  locked: boolean;
  /** Seconds left on the lock, 0 when open. */
  secondsLeft: number;
  /** Attempts left before the next lock. */
  attemptsLeft: number;
};

export function getLockState(email: string): LockState {
  const key = normalize(email);
  if (!key) return { locked: false, secondsLeft: 0, attemptsLeft: MAX_ATTEMPTS };
  const record = entry(read(), key);
  const secondsLeft = Math.max(0, Math.ceil((record.lockedUntil - Date.now()) / 1000));
  return {
    locked: secondsLeft > 0,
    secondsLeft,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - record.fails),
  };
}

/** Records a wrong password and returns the resulting lock state. */
export function registerFailure(email: string): LockState {
  const key = normalize(email);
  if (!key) return { locked: false, secondsLeft: 0, attemptsLeft: MAX_ATTEMPTS };
  const store = read();
  const record = entry(store, key);
  const fails = record.fails + 1;
  const next: Record_ = { ...record, fails, lastFail: Date.now() };

  if (fails >= MAX_ATTEMPTS) {
    const step = LOCK_STEPS[Math.min(record.locks, LOCK_STEPS.length - 1)]!;
    next.lockedUntil = Date.now() + step * 1000;
    next.locks = record.locks + 1;
    next.fails = 0;
  }

  store[key] = next;
  write(store);
  return getLockState(email);
}

/** Clears the streak after a successful sign-in. */
export function clearFailures(email: string) {
  const key = normalize(email);
  if (!key) return;
  const store = read();
  delete store[key];
  write(store);
}

export function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest}s`;
}
