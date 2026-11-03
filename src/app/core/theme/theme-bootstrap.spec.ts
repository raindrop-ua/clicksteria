import { readFileSync } from 'node:fs';

const html = readFileSync('src/index.html', 'utf8');
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
  theme_color: string;
  background_color: string;
};

describe('Dark appearance before first paint', () => {
  it('declares dark controls without reading a saved or system theme', () => {
    expect(html).toContain('<meta name="color-scheme" content="dark" />');
    expect(html).not.toMatch(/clicksteria\.theme|prefers-color-scheme|dataset\.theme/);
  });

  it('uses the same dark browser chrome and installed-app background', () => {
    expect(html).toContain(`<meta name="theme-color" content="${manifest.theme_color}" />`);
    expect(manifest.background_color).toBe(manifest.theme_color);
    expect(manifest.theme_color).toBe('#10143c');
  });
});
