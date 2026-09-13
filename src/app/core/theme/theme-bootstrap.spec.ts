import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the actual pre-paint script, which runs before Angular and hydration.
const html = readFileSync('src/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

describe('Theme before first paint', () => {
  it.each([
    { saved: null, systemDark: true, preference: 'system', color: '#14131d' },
    { saved: null, systemDark: false, preference: 'system', color: '#f6f5f0' },
    { saved: 'light', systemDark: true, preference: 'light', color: '#f6f5f0' },
    { saved: 'dark', systemDark: false, preference: 'dark', color: '#14131d' },
    { saved: 'invalid', systemDark: true, preference: 'system', color: '#14131d' },
  ])(
    'applies $preference with saved=$saved and systemDark=$systemDark',
    ({ saved, systemDark, preference, color }) => {
      const dataset: Record<string, string> = {};
      const meta = { content: '' };
      const getItem = vi.fn(() => saved);
      expect(script).toBeTruthy();
      runInNewContext(script!, {
        localStorage: { getItem },
        matchMedia: () => ({ matches: systemDark }),
        document: { documentElement: { dataset }, querySelector: () => meta },
      });
      expect(getItem).toHaveBeenCalledWith('clicksteria.theme');
      expect(dataset['theme']).toBe(preference);
      expect(meta.content).toBe(color);
    },
  );

  it('uses system appearance if storage is blocked', () => {
    const dataset: Record<string, string> = {};
    const meta = { content: '' };
    runInNewContext(script!, {
      localStorage: {
        getItem: () => {
          throw new Error('denied');
        },
      },
      matchMedia: () => ({ matches: true }),
      document: { documentElement: { dataset }, querySelector: () => meta },
    });
    expect(dataset['theme']).toBe('system');
    expect(meta.content).toBe('#14131d');
  });
});
