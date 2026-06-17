//
//  PuzzleScreenshotPreview.swift
//  queens
//
//  Screenshot helper — renders puzzle 10442 grid edge-to-edge, no chrome.
//  Use Xcode Canvas (Variants > Color Scheme) to capture light + dark.
//

import SwiftUI

private let puzzle10442 = StarBattlePuzzle(
    size: 6,
    starsPerRegion: 1,
    regions: [
        [1, 1, 0, 0, 0, 3],
        [1, 0, 0, 0, 0, 3],
        [1, 5, 0, 0, 3, 3],
        [5, 5, 5, 2, 3, 3],
        [4, 5, 2, 2, 2, 3],
        [4, 2, 2, 2, 3, 3],
    ],
    solution: [],
    code: "10442"
)

private struct GridScreenshot: View {
    @Environment(\.colorScheme) private var colorScheme

    private var regionColors: [Int: Color] {
        let palette = AppColors.regionColors(enhancedContrast: false, scheme: colorScheme)
        return Dictionary(uniqueKeysWithValues: (0..<puzzle10442.size).map { ($0, palette[$0 % palette.count]) })
    }

    @State private var cellStates: [GridPosition: CellState] = [:]

    var body: some View {
        GameGridView(
            puzzle: puzzle10442,
            cellStates: $cellStates,
            errorCells: [],
            showingErrors: false,
            conflictCells: [],
            showConflicts: false,
            enhancedContrast: false,
            regionColors: regionColors,
            singleTapMode: false,
            onCellToggle: {},
            onSaveUndo: {}
        )
        .shadow(color: .clear, radius: 0)
    }
}

#Preview("Light", traits: .fixedLayout(width: 390, height: 390)) {
    GridScreenshot()
        .preferredColorScheme(.light)
}

#Preview("Dark", traits: .fixedLayout(width: 390, height: 390)) {
    GridScreenshot()
        .preferredColorScheme(.dark)
}
