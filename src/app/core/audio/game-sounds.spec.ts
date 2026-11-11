import { GAME_SOUND_SAMPLES, GameSoundSelector, soundBankForGroup } from './game-sounds';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Native game sound catalog', () => {
  it.each([
    [2, 'small'],
    [4, 'small'],
    [5, 'medium'],
    [11, 'medium'],
    [12, 'large'],
    [150, 'large'],
  ] as const)('uses the native bank for %i removed tiles', (count, bank) => {
    expect(soundBankForGroup(count)).toBe(bank);
  });
  it('provides three variants per group bank and one quieter singleton', () => {
    expect(GAME_SOUND_SAMPLES).toHaveLength(30);
    expect(new Set(GAME_SOUND_SAMPLES.map((sample) => sample.url)).size).toBe(30);
    for (const sample of GAME_SOUND_SAMPLES) {
      expect(sample.url).toMatch(
        /^\/audio\/((bubble|spectrum)-)?(pop-(small|medium|large)-[123]|single-block)\.wav$/,
      );
      expect(sample.volume).toBe(
        sample.style === 'spectrum'
          ? sample.bank === 'single'
            ? 0.16
            : 0.22
          : sample.bank === 'single'
            ? 0.28
            : 0.34,
      );
      expect(sample.url.startsWith('/audio/bubble-')).toBe(sample.style === 'bubbles');
      expect(sample.url.startsWith('/audio/spectrum-')).toBe(sample.style === 'spectrum');
    }
    expect(GAME_SOUND_SAMPLES.filter((sample) => sample.style === 'bubbles')).toHaveLength(10);
    expect(GAME_SOUND_SAMPLES.filter((sample) => sample.style === 'clicks')).toHaveLength(10);
    expect(GAME_SOUND_SAMPLES.filter((sample) => sample.style === 'spectrum')).toHaveLength(10);
  });
  it('avoids an immediate repeat separately in each bank without retrying random rolls', () => {
    const selector = new GameSoundSelector();
    const choose = vi.fn(() => 0);
    expect(selector.next('small', 'bubbles', choose).variation).toBe(0);
    expect(selector.next('medium', 'bubbles', choose).variation).toBe(0);
    expect(selector.next('small', 'bubbles', choose).variation).toBe(1);
    expect(selector.next('medium', 'bubbles', choose).variation).toBe(1);
    expect(selector.next('small', 'bubbles', choose).variation).toBe(0);
    expect(selector.next('single', 'bubbles', choose).variation).toBe(0);
    expect(choose).toHaveBeenCalledTimes(5);
  });
  it('can select all three alternatives and skips the previous high index', () => {
    const selector = new GameSoundSelector();
    expect(selector.next('large', 'bubbles', () => 0.999).variation).toBe(2);
    expect(selector.next('large', 'bubbles', () => 0.999).variation).toBe(1);
    expect(selector.next('large', 'bubbles', () => 0.999).variation).toBe(2);
  });
  it('keeps variation history separate when switching between bubbles and clicks', () => {
    const selector = new GameSoundSelector();
    const choose = () => 0;
    expect(selector.next('small', 'bubbles', choose).url).toBe('/audio/bubble-pop-small-1.wav');
    expect(selector.next('small', 'clicks', choose).url).toBe('/audio/pop-small-1.wav');
    expect(selector.next('small', 'bubbles', choose).url).toBe('/audio/bubble-pop-small-2.wav');
    expect(selector.next('small', 'clicks', choose).url).toBe('/audio/pop-small-2.wav');
    expect(selector.next('single', 'clicks', choose).url).toBe('/audio/single-block.wav');
    expect(selector.next('single', 'bubbles', choose).url).toBe('/audio/bubble-single-block.wav');
  });
  it.each(['small', 'medium', 'large'] as const)(
    'keeps Spectrum %s variants independent without adjacent repeats',
    (bank) => {
      const selector = new GameSoundSelector();
      const choose = () => 0;
      expect(selector.next(bank, 'spectrum', choose).variation).toBe(0);
      expect(selector.next(bank, 'bubbles', choose).variation).toBe(0);
      expect(selector.next(bank, 'clicks', choose).variation).toBe(0);
      expect(selector.next(bank, 'spectrum', choose).variation).toBe(1);
      expect(selector.next(bank, 'spectrum', choose).variation).toBe(0);
    },
  );
  it('ships ten distinct, short, DC-free PCM beeper samples within the asset budget', () => {
    const samples = GAME_SOUND_SAMPLES.filter((sample) => sample.style === 'spectrum');
    const files = samples.map((sample) =>
      readFileSync(resolve(process.cwd(), 'public', sample.url.slice(1))),
    );
    expect(files.reduce((sum, file) => sum + file.length, 0)).toBeLessThanOrEqual(200_000);
    expect(new Set(files.map((file) => file.toString('base64'))).size).toBe(10);
    const durations = new Map<string, number[]>();
    files.forEach((wav, index) => {
      expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
      expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
      expect(wav.toString('ascii', 8, 16)).toBe('WAVEfmt ');
      expect(wav.readUInt32LE(16)).toBe(16);
      expect(wav.readUInt16LE(20)).toBe(1);
      expect(wav.readUInt16LE(22)).toBe(1);
      expect(wav.readUInt32LE(24)).toBe(22_050);
      expect(wav.readUInt32LE(28)).toBe(44_100);
      expect(wav.readUInt16LE(32)).toBe(2);
      expect(wav.readUInt16LE(34)).toBe(16);
      expect(wav.toString('ascii', 36, 40)).toBe('data');
      expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
      const frames = (wav.length - 44) / 2;
      const duration = frames / 22_050;
      expect(duration).toBeGreaterThanOrEqual(0.06);
      expect(duration).toBeLessThanOrEqual(0.23);
      expect(wav.readInt16LE(44)).toBe(0);
      expect(wav.readInt16LE(wav.length - 2)).toBe(0);
      let sum = 0;
      let peak = 0;
      let crossings = 0;
      let lastSign = 0;
      for (let frame = 0; frame < frames; frame++) {
        const value = wav.readInt16LE(44 + frame * 2);
        sum += value;
        peak = Math.max(peak, Math.abs(value));
        const sign = Math.sign(value);
        if (sign && lastSign && sign !== lastSign) crossings++;
        if (sign) lastSign = sign;
      }
      expect(sum).toBe(0);
      expect(peak / 32_767).toBeGreaterThan(0.3);
      expect(peak / 32_767).toBeLessThanOrEqual(0.63);
      expect(crossings).toBeGreaterThan(20);
      const bank = samples[index].bank;
      durations.set(bank, [...(durations.get(bank) ?? []), duration]);
    });
    expect(Math.max(...durations.get('single')!)).toBeLessThan(
      Math.min(...durations.get('small')!),
    );
    expect(Math.max(...durations.get('small')!)).toBeLessThan(
      Math.min(...durations.get('medium')!),
    );
    expect(Math.max(...durations.get('medium')!)).toBeLessThan(
      Math.min(...durations.get('large')!),
    );
  });
});
