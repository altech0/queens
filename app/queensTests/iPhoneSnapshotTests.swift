import XCTest
import SnapshotTesting
import SwiftUI
@testable import queens

/// Set to true once to write reference images, then flip back to false.
private let recording = true

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

// MARK: - ContentView

final class ContentViewSnapshotTests: XCTestCase {
    func testLight() {
        assertSnapshot(of: wrapped(ContentView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testDark() {
        assertSnapshot(of: wrapped(ContentView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testDarkEnhanced() {
        assertSnapshot(of: wrapped(ContentView(), s: settings(dark: true, enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "dark_enhanced", record: recording)
    }
}

// MARK: - GameSetupView

final class GameSetupViewSnapshotTests: XCTestCase {
    func testLight() {
        assertSnapshot(of: wrapped(GameSetupView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testDark() {
        assertSnapshot(of: wrapped(GameSetupView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
}

// MARK: - SettingsView

final class SettingsViewSnapshotTests: XCTestCase {
    func testLight() {
        assertSnapshot(of: wrapped(SettingsView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testDark() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testEnhancedContrastOn() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "enhanced", record: recording)
    }
    func testDarkEnhanced() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(dark: true, enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "dark_enhanced", record: recording)
    }
    func testHideTimerOn() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(hideTimer: true)), as: .image(layout: .device(config: iPhone)), named: "hide_timer", record: recording)
    }
    func testHighlightConflictsOff() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(highlightConflicts: false)), as: .image(layout: .device(config: iPhone)), named: "conflicts_off", record: recording)
    }
    func testSingleTapOn() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(singleTap: true)), as: .image(layout: .device(config: iPhone)), named: "single_tap", record: recording)
    }
    func testShowHintsOff() {
        assertSnapshot(of: wrapped(SettingsView(), s: settings(showHints: false)), as: .image(layout: .device(config: iPhone)), named: "hints_off", record: recording)
    }
}

// MARK: - GameView (loading state — no network needed)

final class GameViewSnapshotTests: XCTestCase {
    func testLoadingLight() {
        assertSnapshot(of: wrapped(GameView()), as: .image(layout: .device(config: iPhone)), named: "loading_light", record: recording)
    }
    func testLoadingDark() {
        assertSnapshot(of: wrapped(GameView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "loading_dark", record: recording)
    }
    func testLoadingHideTimer() {
        assertSnapshot(of: wrapped(GameView(), s: settings(hideTimer: true)), as: .image(layout: .device(config: iPhone)), named: "loading_hide_timer", record: recording)
    }
    func testLoadingEnhanced() {
        assertSnapshot(of: wrapped(GameView(), s: settings(enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "loading_enhanced", record: recording)
    }
    func testLoadingDarkEnhanced() {
        assertSnapshot(of: wrapped(GameView(), s: settings(dark: true, enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "loading_dark_enhanced", record: recording)
    }
}

// MARK: - HowToPlayView

final class HowToPlayViewSnapshotTests: XCTestCase {
    func testLight() {
        assertSnapshot(of: wrapped(HowToPlayView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testDark() {
        assertSnapshot(of: wrapped(HowToPlayView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testEnhanced() {
        assertSnapshot(of: wrapped(HowToPlayView(), s: settings(enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "enhanced", record: recording)
    }
}

// MARK: - AboutView

final class AboutViewSnapshotTests: XCTestCase {
    func testLight() {
        assertSnapshot(of: wrapped(AboutView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testDark() {
        assertSnapshot(of: wrapped(AboutView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
}

// MARK: - SpecificPuzzleView

final class SpecificPuzzleViewSnapshotTests: XCTestCase {
    func testLight() {
        assertSnapshot(of: wrapped(SpecificPuzzleView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testDark() {
        assertSnapshot(of: wrapped(SpecificPuzzleView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
}

// MARK: - OfflinePuzzlesView

final class OfflinePuzzlesViewSnapshotTests: XCTestCase {
    func testLight() {
        assertSnapshot(of: wrapped(OfflinePuzzlesView()), as: .image(layout: .device(config: iPhone)), named: "light", record: recording)
    }
    func testDark() {
        assertSnapshot(of: wrapped(OfflinePuzzlesView(), s: settings(dark: true)), as: .image(layout: .device(config: iPhone)), named: "dark", record: recording)
    }
    func testEnhanced() {
        assertSnapshot(of: wrapped(OfflinePuzzlesView(), s: settings(enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "enhanced", record: recording)
    }
    func testDarkEnhanced() {
        assertSnapshot(of: wrapped(OfflinePuzzlesView(), s: settings(dark: true, enhanced: true)), as: .image(layout: .device(config: iPhone)), named: "dark_enhanced", record: recording)
    }
}
