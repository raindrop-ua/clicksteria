import { GAME_SOUND_SAMPLES, GameSoundSelector, soundBankForGroup } from './game-sounds';

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
    expect(GAME_SOUND_SAMPLES).toHaveLength(20);
    expect(new Set(GAME_SOUND_SAMPLES.map((sample) => sample.url)).size).toBe(20);
    for (const sample of GAME_SOUND_SAMPLES) {
      expect(sample.url).toMatch(
        /^\/audio\/(bubble-)?(pop-(small|medium|large)-[123]|single-block)\.wav$/,
      );
      expect(sample.volume).toBe(sample.bank === 'single' ? 0.28 : 0.34);
      expect(sample.url.startsWith('/audio/bubble-')).toBe(sample.style === 'bubbles');
    }
    expect(GAME_SOUND_SAMPLES.filter((sample) => sample.style === 'bubbles')).toHaveLength(10);
    expect(GAME_SOUND_SAMPLES.filter((sample) => sample.style === 'clicks')).toHaveLength(10);
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
});
