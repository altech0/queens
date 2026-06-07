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
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(settings)
                .environment(puzzleCache)
                .environment(authManager)
                .onOpenURL { url in handleDeepLink(url) }
                .onReceive(NotificationCenter.default.publisher(for: .authenticationExpired)) { _ in
                    Task { await authManager.register() }
                }
        }
    }

    private func handleDeepLink(_ url: URL) {
        // Universal link: https://queens.knittedmice.com/puzzle?code=12847
        if url.scheme == "https",
           url.host == "queens.knittedmice.com",
           url.path == "/puzzle",
           let code = URLComponents(url: url, resolvingAgainstBaseURL: false)?
               .queryItems?.first(where: { $0.name == "code" })?.value {
            NotificationCenter.default.post(name: .openPuzzle, object: nil, userInfo: ["code": code])
            return
        }
        // Custom scheme: queens://puzzle/12847
        if url.scheme == "queens",
           url.host == "puzzle",
           let code = url.pathComponents.last,
           code != "/" {
            NotificationCenter.default.post(name: .openPuzzle, object: nil, userInfo: ["code": code])
        }
    }
}

extension Notification.Name {
    static let openPuzzle = Notification.Name("openPuzzle")
    static let authenticationExpired = Notification.Name("authenticationExpired")
}

