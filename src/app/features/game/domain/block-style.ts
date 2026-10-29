export const BLOCK_STYLES = [
  { id: 'classic', label: 'Classic', description: 'Bright blocks with matching shapes.' },
  { id: 'minimal', label: 'Minimal', description: 'Simple, flat colors without symbols.' },
  { id: 'glass', label: 'Glass', description: 'Translucent blocks with a soft glass shine.' },
] as const;

export type BlockStyle = (typeof BLOCK_STYLES)[number]['id'];

export function isBlockStyle(value: unknown): value is BlockStyle {
  return BLOCK_STYLES.some((style) => style.id === value);
}
