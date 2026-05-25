//
//  RegistrationView.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI

struct RegistrationView: View {
    @Environment(AuthManager.self) private var authManager
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.94, blue: 0.98),
                    Color(red: 0.89, green: 0.93, blue: 0.97)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 40) {
                Spacer()

                VStack(spacing: 16) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color(red: 0.4, green: 0.5, blue: 0.7),
                                         Color(red: 0.5, green: 0.6, blue: 0.8)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )

                    Text("Welcome to Queens")
                        .font(.system(size: 32, weight: .light, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))

                    ProgressView()
                        .scaleEffect(1.3)
                        .tint(Color(red: 0.4, green: 0.5, blue: 0.7))
                        .padding(.top, 20)
                }

                Spacer()
            }
            .padding(.horizontal, 24)
        }
        .onAppear {
            Task {
                await authManager.register()
            }
        }
    }
}
#Preview {
    RegistrationView()
        .environment(AuthManager())
}

