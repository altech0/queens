import XCTest
import SnapshotTesting
import SwiftUI
@testable import queens

// MARK: - Helpers

private let iPhone = ViewImageConfig.iPhone13Pro  // 390×844 pt, matches iPhone 16 Pro class

private func snap<V: View>(_ view: V, record: Bool = false) {
    assertSnapshot(of: view, as: .image(layout: .device(config: iPhone)), record: record)
}

/// Set to true once to write reference images, then flip back to false.
private let recording = false

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

private func wrapped<V: View>(_ view: V, settings s: AppSettings = AppSettings()) -> some View {
    NavigationStack { view }
        .environment(s)
        .environment(PuzzleCache())
        .environment(AuthManager())
        .preferredColorScheme(s.darkMode ? .dark : .light)
}

// MARK: - ContentView

final class ContentViewSnapshotTests: XCTestCase {
    func testLight()         { snap(wrapped(ContentView(), settings: settings())) }
    func testDark()          { snap(wrapped(ContentView(), settings: settings(dark: true))) }
    func testDarkEnhanced()  { snap(wrapped(ContentView(), settings: settings(dark: true, enhanced: true))) }
}

// MARK: - GameSetupView

final class GameSetupViewSnapshotTests: XCTestCase {
    func testLight()  { snap(wrapped(GameSetupView())) }
    func testDark()   { snap(wrapped(GameSetupView(), settings: settings(dark: true))) }
}

// MARK: - SettingsView — layout + all toggle states

final class SettingsViewSnapshotTests: XCTestCase {
    func testLight()                { snap(wrapped(SettingsView())) }
    func testDark()                 { snap(wrapped(SettingsView(), settings: settings(dark: true))) }
    func testDarkModeOn()           { snap(wrapped(SettingsView(), settings: settings(dark: true))) }
    func testEnhancedContrastOn()   { snap(wrapped(SettingsView(), settings: settings(enhanced: true))) }
    func testDarkEnhanced()         { snap(wrapped(SettingsView(), settings: settings(dark: true, enhanced: true))) }
    func testHideTimerOn()          { snap(wrapped(SettingsView(), settings: settings(hideTimer: true))) }
    func testHighlightConflictsOff(){ snap(wrapped(SettingsView(), settings: settings(highlightConflicts: false))) }
    func testSingleTapOn()          { snap(wrapped(SettingsView(), settings: settings(singleTap: true))) }
    func testShowHintsOff()         { snap(wrapped(SettingsView(), settings: settings(showHints: false))) }
}

// MARK: - GameView (loading + error states; no network needed)

final class GameViewSnapshotTests: XCTestCase {
    func testLoadingLight()         { snap(wrapped(GameView())) }
    func testLoadingDark()          { snap(wrapped(GameView(), settings: settings(dark: true))) }
    func testLoadingHideTimer()     { snap(wrapped(GameView(), settings: settings(hideTimer: true))) }
    func testLoadingEnhanced()      { snap(wrapped(GameView(), settings: settings(enhanced: true))) }
    func testLoadingDarkEnhanced()  { snap(wrapped(GameView(), settings: settings(dark: true, enhanced: true))) }
}

// MARK: - HowToPlayView

final class HowToPlayViewSnapshotTests: XCTestCase {
    func testLight()  { snap(wrapped(HowToPlayView())) }
    func testDark()   { snap(wrapped(HowToPlayView(), settings: settings(dark: true))) }
    func testEnhanced() { snap(wrapped(HowToPlayView(), settings: settings(enhanced: true))) }
}

// MARK: - AboutView

final class AboutViewSnapshotTests: XCTestCase {
    func testLight() { snap(wrapped(AboutView())) }
    func testDark()  { snap(wrapped(AboutView(), settings: settings(dark: true))) }
}

// MARK: - SpecificPuzzleView

final class SpecificPuzzleViewSnapshotTests: XCTestCase {
    func testLight() { snap(wrapped(SpecificPuzzleView())) }
    func testDark()  { snap(wrapped(SpecificPuzzleView(), settings: settings(dark: true))) }
}

// MARK: - OfflinePuzzlesView

final class OfflinePuzzlesViewSnapshotTests: XCTestCase {
    func testLight()        { snap(wrapped(OfflinePuzzlesView())) }
    func testDark()         { snap(wrapped(OfflinePuzzlesView(), settings: settings(dark: true))) }
    func testEnhanced()     { snap(wrapped(OfflinePuzzlesView(), settings: settings(enhanced: true))) }
    func testDarkEnhanced() { snap(wrapped(OfflinePuzzlesView(), settings: settings(dark: true, enhanced: true))) }
}
