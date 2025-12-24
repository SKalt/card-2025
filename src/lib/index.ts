// place files you want to import through the `$lib` alias in this folder.

export function fuzzyScore(name: string, search: string): number {
  name = name.toLowerCase()
  search = search.toLowerCase()
  let score = 0
  if (name.startsWith(search)) score += 100
  let idx = name.lastIndexOf(search)
  while (idx > 0 && name.length > 0) {
    score += 10
    name = name.substring(idx + search.length)
    idx = name.indexOf(search)
  }
  return score
}
