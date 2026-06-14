//
//  queensApp.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI
import UIKit

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
                .preferredColorScheme(settings.darkMode ? .dark : .light)
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

/// Snapshot the current window, flip the colour scheme underneath, then fade the snapshot out.
func crossfadeColorScheme(duration: TimeInterval = 0.4, action: @escaping () -> Void) {
    guard let window = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .first?.windows.first else {
        action()
        return
    }
    guard let snapshot = window.snapshotView(afterScreenUpdates: false) else {
        action()
        return
    }
    window.addSubview(snapshot)
    action()
    UIView.animate(withDuration: duration, delay: 0, options: .curveEaseInOut) {
        snapshot.alpha = 0
    } completion: { _ in
        snapshot.removeFromSuperview()
    }
}

extension Notification.Name {
    static let openPuzzle = Notification.Name("openPuzzle")
    static let authenticationExpired = Notification.Name("authenticationExpired")
}

