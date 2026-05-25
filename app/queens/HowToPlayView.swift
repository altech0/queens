//
//  HowToPlayView.swift
//  queens
//
//  Created by Alex on 06/04/2026.
//

import SwiftUI

struct HowToPlayView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            // Matching gradient background
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.94, blue: 0.98),
                    Color(red: 0.89, green: 0.93, blue: 0.97)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header with back button
                HStack {
                    Button(action: {
                        dismiss()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .frame(width: 44, height: 44)
                    }
                    
                    Spacer()
                    
                    Text("How to Play")
                        .font(.system(size: 24, weight: .medium, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                    
                    Spacer()
                    
                    // Invisible spacer for symmetry
                    Color.clear
                        .frame(width: 44, height: 44)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)
                .padding(.bottom, 20)
                
                // Scrollable content
                ScrollView {
                    VStack(spacing: 32) {
                        // Puzzle Variations Section
                        InstructionCard(
                            icon: "star.circle",
                            title: "Puzzle Variations",
                            description: "Puzzles come in different difficulties. A 1-star puzzle requires 1 star per row, column, and region. A 2-star puzzle requires 2 stars per row, column, and region. The puzzle setup screen will tell you how many stars are needed."
                        )
                        
                        // Objective Section
                        InstructionCard(
                            icon: "target",
                            title: "Objective",
                            description: "Place stars in the grid so that each row, column, and region contains exactly the required number of stars."
                        )
                        
                        // Rule 1: Stars per region
                        InstructionCard(
                            icon: "square.grid.3x3",
                            title: "Stars Per Region",
                            description: "Each colored region must contain exactly the required number of stars. Regions are shown in different colors."
                        )
                        
                        // Rule 2: Stars per row/column
                        InstructionCard(
                            icon: "tablecells",
                            title: "Stars Per Row & Column",
                            description: "Each row and each column must have exactly the required number of stars. This applies across the entire grid."
                        )
                        
                        // Rule 3: No adjacent stars
                        InstructionCard(
                            icon: "arrow.up.left.and.arrow.down.right",
                            title: "No Touching Stars",
                            description: "Stars cannot touch each other, not even diagonally. Keep them separated!"
                        )
                        
                        // How to play
                        VStack(alignment: .leading, spacing: 16) {
                            HStack(spacing: 12) {
                                Image(systemName: "hand.tap")
                                    .font(.system(size: 28))
                                    .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                    .frame(width: 44)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Controls")
                                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                                    
                                    Text("Tap a cell once for an X mark\nTap again to place a star\nTap again to clear")
                                        .font(.system(size: 15, weight: .regular, design: .rounded))
                                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                
                                Spacer()
                            }
                            .padding(20)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white.opacity(0.6))
                                    .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
                            )
                        }
                        
                        // Visual example
                        VStack(spacing: 16) {
                            Text("Example")
                                .font(.system(size: 20, weight: .semibold, design: .rounded))
                                .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                            
                            // Mini grid example
                            MiniGridExample()
                            
                            Text("The X marks show where you cannot place another star: adjacent cells, same row/column, and same region.")
                                .font(.system(size: 14, weight: .regular, design: .rounded))
                                .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 20)
                        }
                        .padding(.vertical, 20)
                        .padding(.horizontal, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.6))
                                .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
                        )
                        
                        // Tips
                        InstructionCard(
                            icon: "lightbulb",
                            title: "Tips",
                            description: "• Start with regions that have limited placement options\n• Use X marks to eliminate impossible cells\n• Look for rows or columns that are almost full"
                        )
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                }
            }
        }
        .navigationBarBackButtonHidden(true)
    }
}

struct InstructionCard: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 28))
                .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                .frame(width: 44)
            
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                
                Text(description)
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.6))
                .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
        )
    }
}

struct MiniGridExample: View {
    let gridSize = 6
    
    // Real puzzle from API
    let regions: [[Int]] = [
        [4, 0, 1, 1, 1, 1],
        [4, 4, 4, 1, 1, 2],
        [4, 4, 4, 4, 2, 2],
        [3, 3, 3, 4, 4, 4],
        [3, 3, 3, 4, 4, 4],
        [5, 5, 3, 4, 4, 4]
    ]
    
    // Show just the first star from solution (row 0, column 1)
    let starPosition = (0, 1)
    
    // X marks for cells that can't have stars (adjacent to star, same row/col/region)
    var forbiddenCells: [(Int, Int)] {
        var cells: [(Int, Int)] = []
        let (starRow, starCol) = starPosition
        
        // Add all adjacent cells (including diagonals)
        for rowOffset in -1...1 {
            for colOffset in -1...1 {
                if rowOffset == 0 && colOffset == 0 { continue }
                let adjRow = starRow + rowOffset
                let adjCol = starCol + colOffset
                if adjRow >= 0 && adjRow < gridSize && adjCol >= 0 && adjCol < gridSize {
                    cells.append((adjRow, adjCol))
                }
            }
        }
        
        // Add all cells in the same row (not already added)
        for col in 0..<gridSize {
            if col != starCol && !cells.contains(where: { $0.0 == starRow && $0.1 == col }) {
                cells.append((starRow, col))
            }
        }
        
        // Add all cells in the same column (not already added)
        for row in 0..<gridSize {
            if row != starRow && !cells.contains(where: { $0.0 == row && $0.1 == starCol }) {
                cells.append((row, starCol))
            }
        }
        
        // Add all cells in the same region (not already added)
        let starRegion = regions[starRow][starCol]
        for row in 0..<gridSize {
            for col in 0..<gridSize {
                if regions[row][col] == starRegion && (row != starRow || col != starCol) {
                    if !cells.contains(where: { $0.0 == row && $0.1 == col }) {
                        cells.append((row, col))
                    }
                }
            }
        }
        
        return cells
    }
    
    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                ForEach(0..<gridSize, id: \.self) { row in
                    HStack(spacing: 0) {
                        ForEach(0..<gridSize, id: \.self) { col in
                            let regionId = regions[row][col]
                            let hasStar = (row == starPosition.0 && col == starPosition.1)
                            let isForbidden = forbiddenCells.contains(where: { $0.0 == row && $0.1 == col })
                            
                            ZStack {
                                Rectangle()
                                    .fill(regionColor(regionId))
                                    .frame(width: 33, height: 33)
                                
                                // Thin inner grid lines (like in the game)
                                Rectangle()
                                    .stroke(Color(red: 0.8, green: 0.82, blue: 0.86), lineWidth: 0.5)
                                    .frame(width: 33, height: 33)
                                
                                if hasStar {
                                    Image(systemName: "star.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                } else if isForbidden {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color(red: 0.6, green: 0.62, blue: 0.68))
                                }
                            }
                        }
                    }
                }
            }
            
            // Draw thick region borders on top (like in the game)
            Canvas { context, size in
                let borderColor = Color(red: 0.5, green: 0.55, blue: 0.65)
                let borderWidth: CGFloat = 3
                let cellSize: CGFloat = 33
                
                for row in 0..<gridSize {
                    for col in 0..<gridSize {
                        let currentRegion = regions[row][col]
                        
                        // Top border
                        if row == 0 || regions[row - 1][col] != currentRegion {
                            let x = CGFloat(col) * cellSize
                            let y = CGFloat(row) * cellSize
                            let path = Path { p in
                                p.move(to: CGPoint(x: x, y: y))
                                p.addLine(to: CGPoint(x: x + cellSize, y: y))
                            }
                            context.stroke(path, with: .color(borderColor), lineWidth: borderWidth)
                        }
                        
                        // Bottom border
                        if row == gridSize - 1 || regions[row + 1][col] != currentRegion {
                            let x = CGFloat(col) * cellSize
                            let y = CGFloat(row + 1) * cellSize
                            let path = Path { p in
                                p.move(to: CGPoint(x: x, y: y))
                                p.addLine(to: CGPoint(x: x + cellSize, y: y))
                            }
                            context.stroke(path, with: .color(borderColor), lineWidth: borderWidth)
                        }
                        
                        // Left border
                        if col == 0 || regions[row][col - 1] != currentRegion {
                            let x = CGFloat(col) * cellSize
                            let y = CGFloat(row) * cellSize
                            let path = Path { p in
                                p.move(to: CGPoint(x: x, y: y))
                                p.addLine(to: CGPoint(x: x, y: y + cellSize))
                            }
                            context.stroke(path, with: .color(borderColor), lineWidth: borderWidth)
                        }
                        
                        // Right border
                        if col == gridSize - 1 || regions[row][col + 1] != currentRegion {
                            let x = CGFloat(col + 1) * cellSize
                            let y = CGFloat(row) * cellSize
                            let path = Path { p in
                                p.move(to: CGPoint(x: x, y: y))
                                p.addLine(to: CGPoint(x: x, y: y + cellSize))
                            }
                            context.stroke(path, with: .color(borderColor), lineWidth: borderWidth)
                        }
                    }
                }
            }
            .frame(width: 198, height: 198)
        }
        .frame(width: 198, height: 198)
        .background(Color.white.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
    }
    
    func regionColor(_ id: Int) -> Color {
        // Use the actual game colors
        return RegionColorPalette.allStandardColors[id % RegionColorPalette.allStandardColors.count]
    }
}

#Preview {
    NavigationStack {
        HowToPlayView()
    }
}
