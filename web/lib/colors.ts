const PASTEL = [
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

const HIGH_CONTRAST = [
  '#a07fd4', // vivid lavender
  '#5b9fd6', // vivid blue
  '#5bbf8a', // vivid green
  '#d4a83c', // vivid gold
  '#d45b80', // vivid rose
  '#5b7dd4', // vivid indigo
  '#d47845', // vivid orange
  '#7bbf5b', // vivid lime
  '#9b5bd4', // vivid purple
  '#5bbfb5', // vivid teal
]

const DARK = [
  '#7a6898', // muted lavender
  '#5a7898', // muted blue
  '#5a8870', // muted mint
  '#8c7848', // muted sand
  '#8c5870', // muted rose
  '#5a6898', // muted periwinkle
  '#886048', // muted peach
  '#6a8858', // muted green
  '#6a5898', // muted purple
  '#508880', // muted aqua
]

export function regionColor(regionId: number, enhanced = false, dark = false): string {
  if (dark) return DARK[regionId % DARK.length]
  return (enhanced ? HIGH_CONTRAST : PASTEL)[regionId % PASTEL.length]
}
