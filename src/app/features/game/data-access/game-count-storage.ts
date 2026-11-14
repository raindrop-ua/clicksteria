import { Service } from '@angular/core';

const STORAGE_KEY = 'clicksteria:games-started:v1';

function isCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/** Optional browser persistence for the number of games that have been started. */
@Service()
export class GameCountStorage {
  read(): number {
    try {
      const serialized = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!serialized || !/^\d+$/.test(serialized)) return 0;
      const count = Number(serialized);
      return isCount(count) ? count : 0;
    } catch {
      return 0;
    }
  }

  write(count: number): void {
    if (!isCount(count)) return;
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, String(count));
    } catch {
      // The in-memory count still advances when persistence is unavailable.
    }
  }

  increment(current: number): number {
    const latest = Math.max(isCount(current) ? current : 0, this.read());
    const next = latest === Number.MAX_SAFE_INTEGER ? latest : latest + 1;
    this.write(next);
    return next;
  }
}
