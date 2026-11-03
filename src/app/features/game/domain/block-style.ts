export const BLOCK_STYLES = [
  { id: 'classic', label: 'Classic', description: 'Glossy jelly blocks with playful motion.' },
  {
    id: 'minimal',
    label: 'Minimalist',
    description: 'Original bright blocks with matching shapes.',
  },
] as const;

export type BlockStyle = (typeof BLOCK_STYLES)[number]['id'];

export function isBlockStyle(value: unknown): value is BlockStyle {
  return BLOCK_STYLES.some((style) => style.id === value);
}
