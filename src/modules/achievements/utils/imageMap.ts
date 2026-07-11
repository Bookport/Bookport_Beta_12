const artModules = import.meta.glob('/src/assets/images/achievements/art/*.webp', { eager: true }) as Record<string, { default: string }>
const bgModules = import.meta.glob('/src/assets/images/achievements/bg/*.webp', { eager: true }) as Record<string, { default: string }>

const artMap = new Map<string, string>()
for (const [path, mod] of Object.entries(artModules)) {
  const filename = path.split('/').pop()!.toLowerCase()
  artMap.set(filename, mod.default)
}

const bgMap = new Map<string, string>()
for (const [path, mod] of Object.entries(bgModules)) {
  const filename = path.split('/').pop()!.toLowerCase()
  bgMap.set(filename, mod.default)
}

export function getArtUrl(filename: string): string | undefined {
  return artMap.get(filename.toLowerCase())
}

export function getBgUrl(filename: string): string | undefined {
  return bgMap.get(filename.toLowerCase())
}
