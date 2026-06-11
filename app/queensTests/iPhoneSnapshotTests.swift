import XCTest
import SnapshotTesting
import SwiftUI
@testable import queens

/// Set to true once to write reference images, then flip back to false.
private let recording = false

private let iPhone = ViewImageConfig.iPhone13Pro

private func settings(
    dark: Bool = false,
    enhanced: Bool = false,
    hideTimer: Bool = false,
    highlightConflicts: Bool = true,
    singleTap: Bool = false,
    showHints: Bool = true
) -> AppSettings {
    let s = AppSettings()
    s.darkMode = dark
    s.enhancedContrastMode = enhanced
    s.hideTimer = hideTimer
    s.highlightConflicts = highlightConflicts
    s.singleTapMode = singleTap
    s.showCompletionHints = showHints
    return s
}

private func wrapped<V: View>(_ view: V, s: AppSettings = AppSettings()) -> some View {
    NavigationStack { view }
        .environment(s)
        .environment(PuzzleCache())
        .environment(AuthManager())
        .preferredColorScheme(s.darkMode ? .dark : .light)
}

private func stubPuzzle() -> StarBattlePuzzle {
    StarBattlePuzzle(
        size: 6,
        starsPerRegion: 1,
        regions: [
            [0, 0, 1, 1, 2, 2],
            [0, 0, 1, 1, 2, 2],
            [3, 3, 4, 4, 5, 5],
            [3, 3, 4, 4, 5, 5],
            [3, 3, 4, 4, 5, 5],
            [3, 3, 4, 4, 5, 5],
        ],
        solution: [
            GridPosition(row: 0, column: 2),
            GridPosition(row: 1, column: 5),
            GridPosition(row: 2, column: 0),
            GridPosition(row: 3, column: 3),
            GridPosition(row: 4, column: 1),
            GridPosition(row: 5, column: 4),
        ],
        code: "SNAP01"
    )
}

final class iPhoneSnapshotTests: XCTestCase {

    // MARK: - ContentView

    func testContentView_light() {
        assertSnapshot(of: wrapped(ContentView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testContentView_dark() {
        assertSnapshot(of: wrapped(ContentView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testContentView_darkEnhanced() {
        assertSnapshot(of: wrapped(ContentView(), s: settings(dark: true, enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "dark_enhanced", record: recording)
    }

    // MARK: - GameSetupView

    func testGameSetupView_light() {
        assertSnapshot(of: wrapped(GameSetupView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testGameSetupView_dark() {
        assertSnapshot(of: wrapped(GameSetupView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }

    // MARK: - SettingsView

    func testSettingsView_light() {
        assertSnapshot(of: wrapped(SettingsView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testSettingsView_dark() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testSettingsView_enhanced() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "enhanced", record: recording)
    }
    func testSettingsView_darkEnhanced() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(dark: true, enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "dark_enhanced", record: recording)
    }
    func testSettingsView_hideTimer() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(hideTimer: true)), as: .image(layout: .device(config: iPhone)), named: "hide_timer", record: recording)
    }
    func testSettingsView_conflictsOff() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(highlightConflicts: false)), as: .image(layout: .device(config: iPhone)), named: "conflicts_off", record: recording)
    }
    func testSettingsView_singleTap() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(singleTap: true)), as: .image(layout: .device(config: iPhone)), named: "single_tap", record: recording)
    }
    func testSettingsView_hintsOff() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(showHints: false)), as: .image(layout: .device(config: iPhone)), named: "hints_off", record: recording)
    }

    // MARK: - GameView

    func testGameView_light() {
        assertSnapshot(of: wrapped(GameView(puzzle: stubPuzzle(), puzzleID: "SNAP01")), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testGameView_dark() {
        assertSnapshot(of: wrapped(GameView(puzzle: stubPuzzle(), puzzleID: "SNAP01"), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testGameView_hideTimer() {
        assertSnapshot(of: wrapped(GameView(puzzle: stubPuzzle(), puzzleID: "SNAP01"), s: settings(hideTimer: true)), as: .image(layout: .device(config: iPhone)), named: "hide_timer", record: recording)
    }
    func testGameView_enhanced() {
        assertSnapshot(of: wrapped(GameView(puzzle: stubPuzzle(), puzzleID: "SNAP01"), s: settings(enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "enhanced", record: recording)
    }
    func testGameView_darkEnhanced() {
        assertSnapshot(of: wrapped(GameView(puzzle: stubPuzzle(), puzzleID: "SNAP01"), s: settings(dark: true, enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "dark_enhanced", record: recording)
    }

    // MARK: - HowToPlayView

    func testHowToPlayView_light() {
        assertSnapshot(of: wrapped(HowToPlayView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testHowToPlayView_dark() {
        assertSnapshot(of: wrapped(HowToPlayView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testHowToPlayView_enhanced() {
        assertSnapshot(of: wrapped(HowToPlayView(), s: settings(enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "enhanced", record: recording)
    }

    // MARK: - AboutView

    func testAboutView_light() {
        assertSnapshot(of: wrapped(AboutView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testAboutView_dark() {
        assertSnapshot(of: wrapped(AboutView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }

    // MARK: - SpecificPuzzleView

    func testSpecificPuzzleView_light() {
        assertSnapshot(of: wrapped(SpecificPuzzleView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testSpecificPuzzleView_dark() {
        assertSnapshot(of: wrapped(SpecificPuzzleView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }

    // MARK: - OfflinePuzzlesView

    func testOfflinePuzzlesView_light() {
        assertSnapshot(of: wrapped(OfflinePuzzlesView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testOfflinePuzzlesView_dark() {
        assertSnapshot(of: wrapped(OfflinePuzzlesView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testOfflinePuzzlesView_enhanced() {
        assertSnapshot(of: wrapped(OfflinePuzzlesView(), s: settings(enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "enhanced", record: recording)
    }
    func testOfflinePuzzlesView_darkEnhanced() {
        assertSnapshot(of: wrapped(OfflinePuzzlesView(), s: settings(dark: true, enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "dark_enhanced", record: recording)
    }
}
