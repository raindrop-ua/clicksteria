export const BLOCK_STYLES = [
  { id: 'classic', label: 'Classic', description: 'Glossy jelly blocks with playful motion.' },
  {
    id: 'minimal',
    label: 'Minimalist',
    description: 'Simple blocks with matching shapes and the classic color palette.',
  },
  {
    id: 'spectrum',
    label: 'ZX Spectrum',
    description: 'Bright 8-bit blocks, pixel symbols and classic beeper sounds.',
  },
] as const;

export type BlockStyle = (typeof BLOCK_STYLES)[number]['id'];

export function isBlockStyle(value: unknown): value is BlockStyle {
  return BLOCK_STYLES.some((style) => style.id === value);
}
