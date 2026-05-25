export const REGION_COLORS = [
  '#c8b4e8', // lavender
  '#b4d4f0', // sky blue
  '#b4e8c8', // mint
  '#f0e0b4', // warm sand
  '#f0b4c8', // rose
  '#b4c8f0', // periwinkle
  '#e8c8b4', // peach
  '#c8e8b4', // light green
  '#d4b4f0', // purple
  '#b4f0e8', // aqua
]

export function regionColor(regionId: number): string {
  return REGION_COLORS[regionId % REGION_COLORS.length]
}
