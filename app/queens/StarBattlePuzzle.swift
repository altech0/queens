//
//
//  StarBattlePuzzle.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import Foundation

/// Canonical puzzle size/stars combinations, mirroring the API's ALLOWED_COMBOS.
enum PuzzleConfig {
    static let sizeOptions: [Int] = [5, 6, 8, 10]
    static let starOptions: [Int] = [1, 2]

    static func starsForSize(_ size: Int) -> Int {
        switch size {
        case 10: return 2
        default: return 1
        }
    }

    static func availableStars(for size: Int) -> [Int] {
        [starsForSize(size)]
    }

    // MARK: - Difficulty

    /// All difficulty buckets, in display order.
    static let allDifficulties = ["easy", "medium", "hard", "very_hard"]

    /// Which difficulty buckets actually exist for a given grid size (from the
    /// puzzle DB distribution). Others are greyed out in the picker.
    static func validDifficulties(for size: Int) -> Set<String> {
        switch size {
        case 5:  return ["easy", "hard"]
        case 6:  return ["easy", "medium", "hard"]
        case 8:  return ["easy", "medium", "hard"]
        case 10: return ["easy", "medium", "hard", "very_hard"]
        default: return ["easy", "medium", "hard"]
        }
    }

    static func difficultyDisplayName(_ d: String) -> String {
        switch d {
        case "easy": return "Easy"
        case "medium": return "Medium"
        case "hard": return "Hard"
        case "very_hard": return "Very Hard"
        default: return d
        }
    }
}

/// Represents a position in the grid
struct GridPosition: Hashable, Codable {
    let row: Int
    let column: Int
}

/// Represents a Star Battle puzzle with its solution and regions
struct StarBattlePuzzle: Codable, Hashable {
    let size: Int
    let starsPerRegion: Int
    let regions: [[Int]] // Each cell contains a region ID (0-based)
    let solution: Set<GridPosition> // The correct star positions
    let code: String? // Puzzle code/ID for display
    var difficulty: String? = nil // easy | medium | hard | very_hard (nil for older API)
    
    /// Check if a position is valid within the grid
    func isValid(row: Int, column: Int) -> Bool {
        return row >= 0 && row < size && column >= 0 && column < size
    }
    
    /// Get the region ID for a given cell
    func regionAt(row: Int, column: Int) -> Int {
        guard isValid(row: row, column: column) else { return -1 }
        return regions[row][column]
    }
}

/// Generates valid Star Battle puzzles
class PuzzleGenerator {
    
    /// Generate a complete valid puzzle - NEW APPROACH: Solution first, then regions
    static func generate(size: Int, starsPerRegion: Int) -> StarBattlePuzzle? {
        // Limit total attempts to prevent infinite loops
        var totalAttempts = 0
        let maxTotalAttempts = 200 // Increased from 100
        
        while totalAttempts < maxTotalAttempts {
            totalAttempts += 1
            
            // Step 1: Generate a valid star placement (ignoring regions)
            guard let solution = generateSolutionFirst(size: size, starsPerRegion: starsPerRegion) else {
                continue
            }
            
            // Step 2: Build regions around the stars to satisfy constraints
            guard let regions = generateRegionsAroundSolution(size: size, solution: solution, starsPerRegion: starsPerRegion) else {
                continue
            }
            
            // Step 3: Create the puzzle
            let puzzle = StarBattlePuzzle(
                size: size,
                starsPerRegion: starsPerRegion,
                regions: regions,
                solution: solution,
                code: nil
            )
            
            // Step 4: STRICT validation - must have EXACTLY one unique solution
            if hasValidSolution(puzzle: puzzle) {
                return puzzle
            }
        }
        
        // Try simple fallback but with STRICT validation
        for _ in 0..<50 {
            if let fallback = generateSimpleFallbackPuzzle(size: size, starsPerRegion: starsPerRegion) {
                if hasValidSolution(puzzle: fallback) {
                    return fallback
                }
            }
        }
        
        return nil
    }
    
    /// Check if puzzle has exactly one unique solution
    private static func hasValidSolution(puzzle: StarBattlePuzzle) -> Bool {
        var foundSolutions: [Set<GridPosition>] = []
        
        // Use optimized backtracking to find up to 2 solutions
        findSolutionsOptimized(
            puzzle: puzzle,
            currentSolution: Set<GridPosition>(),
            rowCounts: Array(repeating: 0, count: puzzle.size),
            colCounts: Array(repeating: 0, count: puzzle.size),
            regionCounts: Array(repeating: 0, count: puzzle.size),
            row: 0,
            foundSolutions: &foundSolutions,
            maxSolutions: 2 // Stop after finding 2
        )
        
        if foundSolutions.isEmpty {
            return false
        } else if foundSolutions.count > 1 {
            return false
        } else if foundSolutions[0] != puzzle.solution {
            return false
        } else {
            return true
        }
    }
    
    /// Optimized solution finder using row-by-row approach
    private static func findSolutionsOptimized(
        puzzle: StarBattlePuzzle,
        currentSolution: Set<GridPosition>,
        rowCounts: [Int],
        colCounts: [Int],
        regionCounts: [Int],
        row: Int,
        foundSolutions: inout [Set<GridPosition>],
        maxSolutions: Int
    ) {
        // Early exit if we found enough solutions
        if foundSolutions.count >= maxSolutions {
            return
        }
        
        // Base case: processed all rows
        if row >= puzzle.size {
            // Check if this is a complete valid solution
            if rowCounts.allSatisfy({ $0 == puzzle.starsPerRegion }) &&
               colCounts.allSatisfy({ $0 == puzzle.starsPerRegion }) &&
               regionCounts.allSatisfy({ $0 == puzzle.starsPerRegion }) {
                foundSolutions.append(currentSolution)
            }
            return
        }
        
        // If current row doesn't have enough stars yet, try placing them
        if rowCounts[row] < puzzle.starsPerRegion {
            // Try each column in this row
            for col in 0..<puzzle.size {
                let position = GridPosition(row: row, column: col)
                
                // Check if we can place a star here
                if canPlaceStar(
                    at: position,
                    size: puzzle.size,
                    regions: puzzle.regions,
                    solution: currentSolution,
                    colCounts: colCounts,
                    regionCounts: regionCounts,
                    starsPerRegion: puzzle.starsPerRegion
                ) {
                    // Place star and recurse
                    var newSolution = currentSolution
                    newSolution.insert(position)
                    
                    var newRowCounts = rowCounts
                    var newColCounts = colCounts
                    var newRegionCounts = regionCounts
                    
                    newRowCounts[row] += 1
                    newColCounts[col] += 1
                    newRegionCounts[puzzle.regions[row][col]] += 1
                    
                    // If row is now full, move to next row
                    if newRowCounts[row] == puzzle.starsPerRegion {
                        findSolutionsOptimized(
                            puzzle: puzzle,
                            currentSolution: newSolution,
                            rowCounts: newRowCounts,
                            colCounts: newColCounts,
                            regionCounts: newRegionCounts,
                            row: row + 1,
                            foundSolutions: &foundSolutions,
                            maxSolutions: maxSolutions
                        )
                    } else {
                        // Continue filling current row
                        findSolutionsOptimized(
                            puzzle: puzzle,
                            currentSolution: newSolution,
                            rowCounts: newRowCounts,
                            colCounts: newColCounts,
                            regionCounts: newRegionCounts,
                            row: row,
                            foundSolutions: &foundSolutions,
                            maxSolutions: maxSolutions
                        )
                    }
                }
            }
        } else {
            // Row is full, move to next row
            findSolutionsOptimized(
                puzzle: puzzle,
                currentSolution: currentSolution,
                rowCounts: rowCounts,
                colCounts: colCounts,
                regionCounts: regionCounts,
                row: row + 1,
                foundSolutions: &foundSolutions,
                maxSolutions: maxSolutions
            )
        }
    }
    

    /// Generate a simple fallback puzzle with rectangular regions (always solvable)
    private static func generateSimpleFallbackPuzzle(size: Int, starsPerRegion: Int) -> StarBattlePuzzle? {
        // Create simple rectangular regions
        var regions = Array(repeating: Array(repeating: 0, count: size), count: size)
        
        if size == 6 {
            // Create 6 regions of 2x3 each
            for row in 0..<size {
                for col in 0..<size {
                    let regionRow = row / 2
                    let regionCol = col / 3
                    regions[row][col] = regionRow * 2 + regionCol
                }
            }
        }
        
        // Find a valid solution using backtracking
        guard let solution = findSolution(size: size, starsPerRegion: starsPerRegion, regions: regions) else {
            return nil
        }
        
        return StarBattlePuzzle(
            size: size,
            starsPerRegion: starsPerRegion,
            regions: regions,
            solution: solution,
            code: nil
        )
    }
    
    /// Generate a valid star placement (1 per row, 1 per column, no adjacencies)
    private static func generateSolutionFirst(size: Int, starsPerRegion: Int) -> Set<GridPosition>? {
        // For a 6x6 grid with 1 star per row/column, we need exactly 6 stars
        // This is essentially solving n-queens with the adjacency constraint
        
        // Try multiple times since random placement might fail
        for _ in 0..<100 {
            var solution = Set<GridPosition>()
            var columnsTaken = Set<Int>()
            var success = true
            
            // For each row, place a star in a random valid column
            for row in 0..<size {
                var validColumns = Set(0..<size).subtracting(columnsTaken)
                
                // Remove columns that would be adjacent to existing stars in the previous row
                for star in solution where star.row == row - 1 {
                    // Only check adjacency to stars in the immediately previous row
                    for colOffset in -1...1 {
                        validColumns.remove(star.column + colOffset)
                    }
                }
                
                // Pick a random valid column
                guard let column = validColumns.randomElement() else {
                    // Failed this attempt, try again
                    success = false
                    break
                }
                
                let position = GridPosition(row: row, column: column)
                
                // Double-check adjacency constraint with all placed stars
                var isValidPlacement = true
                for star in solution {
                    let rowDiff = abs(star.row - row)
                    let colDiff = abs(star.column - column)
                    if rowDiff <= 1 && colDiff <= 1 {
                        isValidPlacement = false
                        break
                    }
                }
                
                if !isValidPlacement {
                    success = false
                    break
                }
                
                solution.insert(position)
                columnsTaken.insert(column)
            }
            
            if success {
                return solution
            }
        }

        return nil
    }
    
    /// Get orthogonally adjacent neighbors of a cell
    private static func getNeighbors(of cell: GridPosition, size: Int) -> [GridPosition] {
        let offsets = [(0, 1), (1, 0), (0, -1), (-1, 0)] // Right, Down, Left, Up
        var neighbors: [GridPosition] = []
        
        for (rowOffset, colOffset) in offsets {
            let newRow = cell.row + rowOffset
            let newCol = cell.column + colOffset
            
            if newRow >= 0 && newRow < size && newCol >= 0 && newCol < size {
                neighbors.append(GridPosition(row: newRow, column: newCol))
            }
        }
        
        return neighbors
    }
    
    /// Build regions around a given solution to ensure each region has exactly starsPerRegion stars
    private static func generateRegionsAroundSolution(size: Int, solution: Set<GridPosition>, starsPerRegion: Int) -> [[Int]]? {
        let numRegions = size // For 6x6 with 1 star per region, we need 6 regions
        let cellsPerRegion = (size * size) / numRegions
        
        // Try multiple times to generate valid regions
        for _ in 0..<50 {
            var regions = Array(repeating: Array(repeating: -1, count: size), count: size)
            var unassignedCells = Set<GridPosition>()
            var regionCells: [Int: Set<GridPosition>] = [:]
            
            // Initialize all cells as unassigned
            for row in 0..<size {
                for col in 0..<size {
                    unassignedCells.insert(GridPosition(row: row, column: col))
                }
            }
            
            // Step 1: Assign each star to a different region as a seed
            let stars = Array(solution).shuffled() // Shuffle for variety
            for (index, star) in stars.enumerated() {
                let regionId = index % numRegions
                regions[star.row][star.column] = regionId
                regionCells[regionId, default: Set()].insert(star)
                unassignedCells.remove(star)
            }
            
            // Step 2: Grow each region to target size using breadth-first flood fill
            var allRegionsValid = true
            for regionId in 0..<numRegions {
                var frontier = Array(regionCells[regionId] ?? Set())
                let targetSize = cellsPerRegion
                
                // Grow region using BFS
                while frontier.count < targetSize && !unassignedCells.isEmpty {
                    var nextFrontier: [GridPosition] = []
                    var addedThisRound = false
                    
                    // Find all unassigned neighbors
                    for cell in frontier {
                        let neighbors = getNeighbors(of: cell, size: size)
                            .filter { unassignedCells.contains($0) }
                        
                        for neighbor in neighbors {
                            if regions[neighbor.row][neighbor.column] == -1 {
                                regions[neighbor.row][neighbor.column] = regionId
                                regionCells[regionId]?.insert(neighbor)
                                unassignedCells.remove(neighbor)
                                nextFrontier.append(neighbor)
                                addedThisRound = true
                                
                                if regionCells[regionId]?.count ?? 0 >= targetSize {
                                    break
                                }
                            }
                        }
                        
                        if regionCells[regionId]?.count ?? 0 >= targetSize {
                            break
                        }
                    }
                    
                    frontier.append(contentsOf: nextFrontier)
                    
                    // If we couldn't add any cells this round, the region is stuck
                    if !addedThisRound {
                        break
                    }
                }
                
                // Check if this region reached target size
                if regionCells[regionId]?.count ?? 0 < targetSize - 1 { // Allow 1 cell tolerance
                    allRegionsValid = false
                    break
                }
            }
            
            if !allRegionsValid {
                continue // Try again
            }
            
            // Step 3: Assign any remaining cells to neighboring regions
            while let cell = unassignedCells.first {
                let neighbors = getNeighbors(of: cell, size: size)
                    .filter { regions[$0.row][$0.column] != -1 }
                
                if let neighbor = neighbors.randomElement() {
                    let regionId = regions[neighbor.row][neighbor.column]
                    regions[cell.row][cell.column] = regionId
                    regionCells[regionId]?.insert(cell)
                } else {
                    // No assigned neighbors, assign to smallest region
                    if let (smallestRegion, _) = regionCells.min(by: { $0.value.count < $1.value.count }) {
                        regions[cell.row][cell.column] = smallestRegion
                        regionCells[smallestRegion]?.insert(cell)
                    } else {
                        regions[cell.row][cell.column] = 0 // Fallback
                    }
                }
                unassignedCells.remove(cell)
            }
            
            // Step 4: Verify each region is contiguous
            var allContiguous = true
            for regionId in 0..<numRegions {
                if !isRegionContiguous(regions: regions, regionId: regionId, size: size) {
                    allContiguous = false
                    break
                }
            }
            
            if allContiguous {
                return regions
            }
        }
        
        return nil
    }
    
    /// Check if a region is contiguous (all cells are connected)
    private static func isRegionContiguous(regions: [[Int]], regionId: Int, size: Int) -> Bool {
        // Find all cells in this region
        var regionCells: [GridPosition] = []
        for row in 0..<size {
            for col in 0..<size {
                if regions[row][col] == regionId {
                    regionCells.append(GridPosition(row: row, column: col))
                }
            }
        }
        
        guard !regionCells.isEmpty else { return true }
        
        // BFS to check connectivity
        var visited = Set<GridPosition>()
        var queue = [regionCells[0]]
        visited.insert(regionCells[0])
        
        while !queue.isEmpty {
            let current = queue.removeFirst()
            let neighbors = getNeighbors(of: current, size: size)
                .filter { regions[$0.row][$0.column] == regionId && !visited.contains($0) }
            
            for neighbor in neighbors {
                visited.insert(neighbor)
                queue.append(neighbor)
            }
        }
        
        return visited.count == regionCells.count
    }
    
    /// Generate regions for the puzzle (simple rectangular regions for 6x6)
    private static func generateRegions(size: Int) -> [[Int]] {
        var regions = Array(repeating: Array(repeating: 0, count: size), count: size)
        
        // For a 6x6 grid, create 6 regions of 2x3 each
        if size == 6 {
            for row in 0..<size {
                for col in 0..<size {
                    // Create 6 rectangular regions (2 rows x 3 columns)
                    let regionRow = row / 2
                    let regionCol = col / 3
                    regions[row][col] = regionRow * 2 + regionCol
                }
            }
        }
        
        return regions
    }
    
    /// Find a valid solution using backtracking
    private static func findSolution(size: Int, starsPerRegion: Int, regions: [[Int]]) -> Set<GridPosition>? {
        var solution = Set<GridPosition>()
        var rowCounts = Array(repeating: 0, count: size)
        var colCounts = Array(repeating: 0, count: size)
        var regionCounts = Array(repeating: 0, count: size)
        
        var attempts = 0
        
        // Try to place stars row by row
        if backtrack(
            row: 0,
            size: size,
            starsPerRegion: starsPerRegion,
            regions: regions,
            solution: &solution,
            rowCounts: &rowCounts,
            colCounts: &colCounts,
            regionCounts: &regionCounts,
            attempts: &attempts
        ) {
            return solution
        }

        return nil
    }
    
    /// Backtracking algorithm to find a valid solution
    private static func backtrack(
        row: Int,
        size: Int,
        starsPerRegion: Int,
        regions: [[Int]],
        solution: inout Set<GridPosition>,
        rowCounts: inout [Int],
        colCounts: inout [Int],
        regionCounts: inout [Int],
        attempts: inout Int
    ) -> Bool {
        attempts += 1
        
        
        // Safety check - if too many attempts, abort
        if attempts > 100000 {
            print("⚠️ Too many attempts, aborting")
            return false
        }
        
        // Base case: we've filled all rows
        if row == size {
            // Check if all constraints are satisfied
            return rowCounts.allSatisfy { $0 == starsPerRegion } &&
                   colCounts.allSatisfy { $0 == starsPerRegion } &&
                   regionCounts.allSatisfy { $0 == starsPerRegion }
        }
        
        // If current row already has enough stars, move to next row
        if rowCounts[row] == starsPerRegion {
            return backtrack(
                row: row + 1,
                size: size,
                starsPerRegion: starsPerRegion,
                regions: regions,
                solution: &solution,
                rowCounts: &rowCounts,
                colCounts: &colCounts,
                regionCounts: &regionCounts,
                attempts: &attempts
            )
        }
        
        // Try placing stars in this row
        for col in 0..<size {
            let position = GridPosition(row: row, column: col)
            let regionId = regions[row][col]
            
            // Check if we can place a star here
            if canPlaceStar(
                at: position,
                size: size,
                regions: regions,
                solution: solution,
                colCounts: colCounts,
                regionCounts: regionCounts,
                starsPerRegion: starsPerRegion
            ) {
                // Place the star
                solution.insert(position)
                rowCounts[row] += 1
                colCounts[col] += 1
                regionCounts[regionId] += 1
                
                // Recursively try to complete the puzzle
                if backtrack(
                    row: row,
                    size: size,
                    starsPerRegion: starsPerRegion,
                    regions: regions,
                    solution: &solution,
                    rowCounts: &rowCounts,
                    colCounts: &colCounts,
                    regionCounts: &regionCounts,
                    attempts: &attempts
                ) {
                    return true
                }
                
                // Backtrack
                solution.remove(position)
                rowCounts[row] -= 1
                colCounts[col] -= 1
                regionCounts[regionId] -= 1
            }
        }
        
        // If current row doesn't have enough stars yet, try next row
        // (it might get stars from previous rows via backtracking)
        if rowCounts[row] < starsPerRegion {
            return backtrack(
                row: row + 1,
                size: size,
                starsPerRegion: starsPerRegion,
                regions: regions,
                solution: &solution,
                rowCounts: &rowCounts,
                colCounts: &colCounts,
                regionCounts: &regionCounts,
                attempts: &attempts
            )
        }
        
        return false
    }
    
    /// Check if a star can be placed at the given position
    private static func canPlaceStar(
        at position: GridPosition,
        size: Int,
        regions: [[Int]],
        solution: Set<GridPosition>,
        colCounts: [Int],
        regionCounts: [Int],
        starsPerRegion: Int
    ) -> Bool {
        // Check if this cell already has a star
        if solution.contains(position) {
            return false
        }
        
        // Check column constraint
        if colCounts[position.column] >= starsPerRegion {
            return false
        }
        
        // Check region constraint
        let regionId = regions[position.row][position.column]
        if regionCounts[regionId] >= starsPerRegion {
            return false
        }
        
        // Check adjacency constraint (no two stars can be adjacent, including diagonally)
        let adjacentOffsets = [
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1)
        ]
        
        for (rowOffset, colOffset) in adjacentOffsets {
            let adjRow = position.row + rowOffset
            let adjCol = position.column + colOffset
            
            if adjRow >= 0 && adjRow < size && adjCol >= 0 && adjCol < size {
                let adjPosition = GridPosition(row: adjRow, column: adjCol)
                if solution.contains(adjPosition) {
                    return false
                }
            }
        }
        
        return true
    }
}

/// Validates a player's solution
class PuzzleValidator {
    
    /// Check if the current solution is valid (complete and correct)
    static func validate(
        stars: Set<GridPosition>,
        puzzle: StarBattlePuzzle
    ) -> ValidationResult {
        let size = puzzle.size
        let starsPerRegion = puzzle.starsPerRegion
        
        var errors: [ValidationError] = []
        
        // Count stars per row
        var rowCounts = Array(repeating: 0, count: size)
        for star in stars {
            rowCounts[star.row] += 1
        }
        
        // Count stars per column
        var colCounts = Array(repeating: 0, count: size)
        for star in stars {
            colCounts[star.column] += 1
        }
        
        // Count stars per region
        var regionCounts = Array(repeating: 0, count: size)
        for star in stars {
            let regionId = puzzle.regions[star.row][star.column]
            regionCounts[regionId] += 1
        }
        
        // Check row constraints
        for (row, count) in rowCounts.enumerated() {
            if count > starsPerRegion {
                errors.append(.tooManyInRow(row))
            }
        }
        
        // Check column constraints
        for (col, count) in colCounts.enumerated() {
            if count > starsPerRegion {
                errors.append(.tooManyInColumn(col))
            }
        }
        
        // Check region constraints
        for (region, count) in regionCounts.enumerated() {
            if count > starsPerRegion {
                errors.append(.tooManyInRegion(region))
            }
        }
        
        // Check adjacency constraint
        for star in stars {
            let adjacentOffsets = [
                (-1, -1), (-1, 0), (-1, 1),
                (0, -1),           (0, 1),
                (1, -1),  (1, 0),  (1, 1)
            ]
            
            for (rowOffset, colOffset) in adjacentOffsets {
                let adjRow = star.row + rowOffset
                let adjCol = star.column + colOffset
                
                if adjRow >= 0 && adjRow < size && adjCol >= 0 && adjCol < size {
                    let adjPosition = GridPosition(row: adjRow, column: adjCol)
                    if stars.contains(adjPosition) {
                        errors.append(.adjacentStars(star, adjPosition))
                    }
                }
            }
        }
        
        // Check if complete
        let isComplete = rowCounts.allSatisfy { $0 == starsPerRegion } &&
                        colCounts.allSatisfy { $0 == starsPerRegion } &&
                        regionCounts.allSatisfy { $0 == starsPerRegion }
        
        if errors.isEmpty && isComplete {
            return .valid
        } else if errors.isEmpty {
            return .incomplete
        } else {
            return .invalid(errors)
        }
    }
}

enum ValidationResult {
    case valid
    case incomplete
    case invalid([ValidationError])
}

enum ValidationError {
    case tooManyInRow(Int)
    case tooManyInColumn(Int)
    case tooManyInRegion(Int)
    case adjacentStars(GridPosition, GridPosition)
}
