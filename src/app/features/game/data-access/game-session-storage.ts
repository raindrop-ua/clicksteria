import { Service } from '@angular/core';
import { decodeGameSession, GameSessionSnapshot } from '@features/game/domain/game-session';

const STORAGE_KEY = 'clicksteria:classic:session:v1';
const MAX_SERIALIZED_LENGTH = 1_000_000;

/** A complete game and its undo history share one optional, atomic browser save. */
@Service()
export class GameSessionStorage {
  read(): GameSessionSnapshot | null {
    let storage: Storage | undefined;
    let serialized: string | null;
    try {
      storage = globalThis.localStorage;
      serialized = storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
    if (serialized === null) return null;
    if (serialized.length <= MAX_SERIALIZED_LENGTH) {
      try {
        const snapshot = decodeGameSession(JSON.parse(serialized) as unknown);
        if (snapshot) return snapshot;
      } catch {
        // Invalid JSON is discarded just like an unsupported or damaged snapshot.
      }
    }
    try {
      storage?.removeItem(STORAGE_KEY);
    } catch {
      // A blocked cleanup must not prevent a fresh in-memory game.
    }
    return null;
  }

  write(snapshot: GameSessionSnapshot): void {
    try {
      const serialized = JSON.stringify(snapshot);
      if (serialized.length > MAX_SERIALIZED_LENGTH) return;
      globalThis.localStorage?.setItem(STORAGE_KEY, serialized);
    } catch {
      // Keep the previous successful save when serialization or storage is unavailable.
    }
  }
}
