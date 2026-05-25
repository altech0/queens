//
//  AboutView.swift
//  queens
//
//  Created by Alex on 06/04/2026.
//

import SwiftUI

struct AboutView: View {
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
            
            VStack(spacing: 40) {
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
                    
                    Text("About")
                        .font(.system(size: 24, weight: .medium, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                    
                    Spacer()
                    
                    // Invisible spacer for symmetry
                    Color.clear
                        .frame(width: 44, height: 44)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)
                
                ScrollView {
                    VStack(spacing: 32) {
                        // Icon + title
                        VStack(spacing: 16) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 80))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [
                                            Color(red: 0.4, green: 0.5, blue: 0.7),
                                            Color(red: 0.5, green: 0.6, blue: 0.8)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)

                            Text("Queens")
                                .font(.system(size: 40, weight: .light, design: .rounded))
                                .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))

                            Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")")
                                .font(.system(size: 14, weight: .regular, design: .rounded))
                                .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                .opacity(0.7)
                        }
                        .padding(.top, 8)

                        // About text
                        VStack(spacing: 16) {
                            Text("Thanks for downloading! I built this app simply because I love these puzzles and couldn't find a clean, ad-free version.")
                                .font(.system(size: 16, weight: .regular, design: .rounded))
                                .foregroundColor(Color(red: 0.35, green: 0.4, blue: 0.55))
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)

                            Text("There is zero data collection and no annoying ads here — just pure puzzles. This project is a true labor of love, so please enjoy it for free!")
                                .font(.system(size: 16, weight: .regular, design: .rounded))
                                .foregroundColor(Color(red: 0.35, green: 0.4, blue: 0.55))
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)

                            Text("If you'd like to show your appreciation, you can buy me a decaf oat latte below. No reciprocation expected — it's purely a tip jar and won't unlock any extra features.")
                                .font(.system(size: 16, weight: .regular, design: .rounded))
                                .foregroundColor(Color(red: 0.35, green: 0.4, blue: 0.55))
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)
                        }
                        .padding(.horizontal, 8)

                        // Latte link
                        Link(destination: URL(string: "https://donate.stripe.com/5kQ14p1RcfQ20W8h2a0x200")!) {
                            HStack(spacing: 8) {
                                Text("☕")
                                    .font(.system(size: 18))
                                Text("Buy me a decaf oat latte")
                                    .font(.system(size: 17, weight: .medium, design: .rounded))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 14)
                            .background(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }

                        Spacer(minLength: 32)
                    }
                    .padding(.horizontal, 24)
                }
            }
        }
        .navigationBarBackButtonHidden(true)
    }
}

#Preview {
    NavigationStack {
        AboutView()
    }
}
