export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePuzzle(
  gridSize: number,
  stars: number,
  regions: number[][],
  solution: number[][]
): ValidationResult {
  const errors: string[] = []

  // 1. Grid coverage
  if (regions.length !== gridSize) {
    errors.push(`regions has ${regions.length} rows (expected ${gridSize})`)
  } else {
    for (let r = 0; r < gridSize; r++) {
      if (regions[r].length !== gridSize) {
        errors.push(`regions[${r}] has ${regions[r].length} cols (expected ${gridSize})`)
      }
    }
  }
  const regionIdsSeen = new Set<number>()
  for (let r = 0; r < regions.length; r++) {
    for (let c = 0; c < (regions[r]?.length ?? 0); c++) {
      const id = regions[r][c]
      if (id < 0 || id >= gridSize) {
        errors.push(`regions[${r}][${c}] = ${id} is out of range 0..${gridSize - 1}`)
      } else {
        regionIdsSeen.add(id)
      }
    }
  }
  for (let id = 0; id < gridSize; id++) {
    if (!regionIdsSeen.has(id)) errors.push(`Region ${id} never appears in grid`)
  }

  // 2. Region contiguity
  if (regions.length === gridSize && regions.every(row => row.length === gridSize)) {
    const cellsByRegion = new Map<number, [number, number][]>()
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const id = regions[r][c]
        if (!cellsByRegion.has(id)) cellsByRegion.set(id, [])
        cellsByRegion.get(id)!.push([r, c])
      }
    }
    for (const [id, cells] of cellsByRegion) {
      if (!isContiguous(cells, gridSize)) {
        errors.push(`Region ${id} is not contiguous`)
      }

      // 3. Region size
      const minSize = stars === 1 ? 2 : 3
      if (cells.length < minSize) {
        errors.push(`Region ${id} has ${cells.length} cells (minimum ${minSize} for stars=${stars})`)
      }
    }
    const minSizeThreshold = stars === 1 ? 2 : 3
    const smallCount = [...cellsByRegion.values()].filter(c => c.length <= minSizeThreshold).length
    if (smallCount > 2) {
      errors.push(`${smallCount} regions are at minimum size (max allowed: 2)`)
    }
  }

  // 4. Solution shape
  if (solution.length !== gridSize) {
    errors.push(`solution has ${solution.length} rows (expected ${gridSize})`)
  } else {
    for (let r = 0; r < gridSize; r++) {
      const row = solution[r]
      if (row.length !== stars) {
        errors.push(`solution[${r}] has ${row.length} stars (expected ${stars})`)
        continue
      }
      for (const c of row) {
        if (c < 0 || c >= gridSize) errors.push(`solution[${r}] column ${c} out of range`)
      }
      for (let i = 1; i < row.length; i++) {
        if (row[i] <= row[i - 1]) errors.push(`solution[${r}] columns not sorted ascending`)
      }
      if (stars === 2 && row.length === 2 && Math.abs(row[1] - row[0]) <= 1) {
        errors.push(`solution[${r}] columns ${row[0]} and ${row[1]} are adjacent`)
      }
    }
  }

  // 5. Column constraint
  if (solution.length === gridSize) {
    const colCount = new Array(gridSize).fill(0)
    for (const row of solution) {
      for (const c of row) {
        if (c >= 0 && c < gridSize) colCount[c]++
      }
    }
    for (let c = 0; c < gridSize; c++) {
      if (colCount[c] !== stars) {
        errors.push(`Column ${c} has ${colCount[c]} stars (expected ${stars})`)
      }
    }
  }

  // 6. Adjacency constraint (kings-move, all pairs)
  if (solution.length === gridSize) {
    const allStars: [number, number][] = []
    for (let r = 0; r < gridSize; r++) {
      for (const c of solution[r]) {
        allStars.push([r, c])
      }
    }
    for (let i = 0; i < allStars.length; i++) {
      for (let j = i + 1; j < allStars.length; j++) {
        const [r1, c1] = allStars[i]
        const [r2, c2] = allStars[j]
        if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) {
          errors.push(`Stars at (${r1},${c1}) and (${r2},${c2}) are kings-move adjacent`)
        }
      }
    }
  }

  // 7. Region constraint
  if (solution.length === gridSize && regions.length === gridSize) {
    const regionCount = new Array(gridSize).fill(0)
    for (let r = 0; r < gridSize; r++) {
      for (const c of solution[r]) {
        if (c >= 0 && c < gridSize && r < regions.length && regions[r].length > c) {
          regionCount[regions[r][c]]++
        }
      }
    }
    for (let id = 0; id < gridSize; id++) {
      if (regionCount[id] !== stars) {
        errors.push(`Region ${id} has ${regionCount[id]} stars (expected ${stars})`)
      }
    }
  }

  // 8. Region-solution consistency
  if (solution.length === gridSize && regions.length === gridSize) {
    for (let r = 0; r < gridSize; r++) {
      for (const c of solution[r]) {
        if (c >= 0 && c < gridSize) {
          const regionId = regions[r][c]
          if (regionId < 0 || regionId >= gridSize) {
            errors.push(`Star at (${r},${c}) is in invalid region ${regionId}`)
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

function isContiguous(cells: [number, number][], gridSize: number): boolean {
  if (cells.length <= 1) return true
  const set = new Set(cells.map(([r, c]) => r * gridSize + c))
  const visited = new Set<number>()
  const queue: [number, number][] = [cells[0]]
  visited.add(cells[0][0] * gridSize + cells[0][1])
  while (queue.length > 0) {
    const [r, c] = queue.pop()!
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
      const nr = r + dr, nc = c + dc
      const key = nr * gridSize + nc
      if (set.has(key) && !visited.has(key)) {
        visited.add(key)
        queue.push([nr, nc])
      }
    }
  }
  return visited.size === cells.length
}
