export type GameSoundBank = 'small' | 'medium' | 'large' | 'single';
export type GameSoundStyle = 'bubbles' | 'clicks';
export interface GameSoundSample {
  readonly style: GameSoundStyle;
  readonly bank: GameSoundBank;
  readonly variation: number;
  readonly url: string;
  readonly volume: number;
}

export function soundBankForGroup(count: number): Exclude<GameSoundBank, 'single'> {
  return count < 5 ? 'small' : count < 12 ? 'medium' : 'large';
}

export function soundSample(
  bank: GameSoundBank,
  variation: number,
  style: GameSoundStyle = 'bubbles',
): GameSoundSample {
  const prefix = style === 'bubbles' ? 'bubble-' : '';
  return {
    style,
    bank,
    variation,
    url:
      bank === 'single'
        ? `/audio/${prefix}single-block.wav`
        : `/audio/${prefix}pop-${bank}-${variation + 1}.wav`,
    volume: bank === 'single' ? 0.28 : 0.34,
  };
}

export const GAME_SOUND_SAMPLES: readonly GameSoundSample[] = (
  ['bubbles', 'clicks'] as const
).flatMap((style) => [
  ...(['small', 'medium', 'large'] as const).flatMap((bank) =>
    [0, 1, 2].map((variation) => soundSample(bank, variation, style)),
  ),
  soundSample('single', 0, style),
]);

/** Pick directly from the remaining alternatives; repeated rolls are unnecessary. */
export class GameSoundSelector {
  private readonly previous = new Map<`${GameSoundStyle}:${GameSoundBank}`, number>();

  next(
    bank: GameSoundBank,
    style: GameSoundStyle = 'bubbles',
    random: () => number = Math.random,
  ): GameSoundSample {
    if (bank === 'single') return soundSample(bank, 0, style);
    const key = `${style}:${bank}` as const;
    const previous = this.previous.get(key);
    const count = previous === undefined ? 3 : 2;
    const index = Math.floor(random() * count);
    const variation = previous !== undefined && index >= previous ? index + 1 : index;
    this.previous.set(key, variation);
    return soundSample(bank, variation, style);
  }
}
