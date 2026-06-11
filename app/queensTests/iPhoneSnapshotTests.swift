import XCTest
import SnapshotTesting
import SwiftUI
@testable import queens

final class iPhoneSnapshotTests: XCTestCase {

    // iPhone 16 Pro — 393×852 pt at 3x
    private let deviceConfig = ViewImageConfig.iPhone13Pro

    private func record() -> Bool { false } // flip to true to re-record references

    // MARK: - ContentView

    func testContentView_light() {
        let view = ContentView()
            .environment(AppSettings())
            .environment(PuzzleCache())
            .environment(AuthManager())
            .preferredColorScheme(.light)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    func testContentView_dark() {
        let view = ContentView()
            .environment(AppSettings())
            .environment(PuzzleCache())
            .environment(AuthManager())
            .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    // MARK: - GameSetupView

    func testGameSetupView_light() {
        let view = NavigationStack { GameSetupView() }
            .environment(AppSettings())
            .preferredColorScheme(.light)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    func testGameSetupView_dark() {
        let view = NavigationStack { GameSetupView() }
            .environment(AppSettings())
            .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    // MARK: - SettingsView

    func testSettingsView_light() {
        let view = NavigationStack { SettingsView() }
            .environment(AppSettings())
            .preferredColorScheme(.light)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    func testSettingsView_dark() {
        let view = NavigationStack { SettingsView() }
            .environment(AppSettings())
            .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    func testSettingsView_darkEnhanced() {
        let settings = AppSettings()
        settings.darkMode = true
        settings.enhancedContrastMode = true
        let view = NavigationStack { SettingsView() }
            .environment(settings)
            .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    // MARK: - GameView loading state

    func testGameView_loading_light() {
        let view = NavigationStack { GameView() }
            .environment(AppSettings())
            .environment(PuzzleCache())
            .environment(AuthManager())
            .preferredColorScheme(.light)
        // Snapshot immediately — puzzle won't have loaded yet so we capture the loading state
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    func testGameView_loading_dark() {
        let view = NavigationStack { GameView() }
            .environment(AppSettings())
            .environment(PuzzleCache())
            .environment(AuthManager())
            .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    // MARK: - HowToPlayView

    func testHowToPlayView_light() {
        let view = NavigationStack { HowToPlayView() }
            .environment(AppSettings())
            .preferredColorScheme(.light)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    func testHowToPlayView_dark() {
        let view = NavigationStack { HowToPlayView() }
            .environment(AppSettings())
            .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    // MARK: - AboutView

    func testAboutView_light() {
        let view = NavigationStack { AboutView() }
            .environment(AppSettings())
            .preferredColorScheme(.light)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }

    func testAboutView_dark() {
        let view = NavigationStack { AboutView() }
            .environment(AppSettings())
            .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: deviceConfig)), record: record())
    }
}
