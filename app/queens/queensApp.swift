//
//  queensApp.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI

@main
struct queensApp: App {
    @State private var settings    = AppSettings()
    @State private var puzzleCache = PuzzleCache()
    @State private var authManager = AuthManager()

    init() {
        let currentSettings = AppSettings()
        currentSettings.incrementLaunchCount()
        print("📱 App launched \(currentSettings.appLaunchCount) time(s)")
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
                .environment(puzzleCache)
                .environment(authManager)
                .onOpenURL { url in handleDeepLink(url) }
        }
    }

    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "queens",
              url.host == "puzzle",
              let code = url.pathComponents.last,
              code != "/" else { return }
        NotificationCenter.default.post(name: .openPuzzle, object: nil, userInfo: ["code": code])
    }
}

// MARK: - Root routing view

struct RootView: View {
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        Group {
            switch authManager.state {
            case .unknown, .needsRegistration, .registering, .failed:
                RegistrationView()
            case .registered:
                ContentView()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .authenticationExpired)) { _ in
            handleAuthenticationExpired()
        }
    }
    
    private func handleAuthenticationExpired() {
        // Reset auth state to trigger re-registration
        authManager.state = .needsRegistration
    }
}

extension Notification.Name {
    static let openPuzzle = Notification.Name("openPuzzle")
    static let authenticationExpired = Notification.Name("authenticationExpired")
}

