import { Injectable } from '@angular/core';

/** Browser persistence is optional: blocked storage must never interrupt a game. */
@Injectable({ providedIn: 'root' })
export class RecordStorage {
  private readonly key = 'clixie:classic:best:v1';
  read(): number {
    try {
      const value = Number(globalThis.localStorage?.getItem(this.key));
      return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }
  write(score: number): void {
    try {
      globalThis.localStorage?.setItem(this.key, String(score));
    } catch {
      /* In-memory record still works. */
    }
  }
}
