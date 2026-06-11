//
//  AboutView.swift
//  queens
//
//  Created by Alex on 06/04/2026.
//

import SwiftUI

struct AboutView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            AppColors.backgroundGradient(colorScheme)
                .ignoresSafeArea()
            
            VStack(spacing: 40) {
                // Header with back button
                HStack {
                    Button(action: {
                        dismiss()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(AppColors.primary(colorScheme))
                            .frame(width: 44, height: 44)
                    }
                    
                    Spacer()
                    
                    Text("About")
                        .font(.system(size: 24, weight: .medium, design: .rounded))
                        .foregroundColor(AppColors.textPrimary(colorScheme))
                    
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
                                .foregroundStyle(AppColors.primaryGradient(colorScheme))
                                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)

                            Text("Queens")
                                .font(.system(size: 40, weight: .light, design: .rounded))
                                .foregroundColor(AppColors.textPrimary(colorScheme))

                            Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")")
                                .font(.system(size: 14, weight: .regular, design: .rounded))
                                .foregroundColor(AppColors.textSecondary(colorScheme))
                                .opacity(0.7)
                        }
                        .padding(.top, 8)

                        // About text
                        VStack(spacing: 16) {
                            Text("Thanks for downloading! I built this to keep me occupied on the train to and from work and also couldn't stand the paid ones out there.")
                                .font(.system(size: 16, weight: .regular, design: .rounded))
                                .foregroundColor(AppColors.textPrimary(colorScheme))
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)

                            Text("Zero data collection. Zero ads. Zero bloat (1.1Mb last time I checked)")
                                .font(.system(size: 16, weight: .regular, design: .rounded))
                                .foregroundColor(AppColors.textPrimary(colorScheme))
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)

                            Link(destination: URL(string: "https://knittedmice.com")!) {
                                Text("If you notice something not working, have a feature suggestion, or just want to chat — visit knittedmice.com")
                                    .font(.system(size: 16, weight: .regular, design: .rounded))
                                    .foregroundColor(AppColors.primary(colorScheme))
                                    .multilineTextAlignment(.center)
                                    .lineSpacing(4)
                            }

                            Text("This project is a labour of love — please enjoy it for free")
                                .font(.system(size: 16, weight: .regular, design: .rounded))
                                .foregroundColor(AppColors.textPrimary(colorScheme))
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)

                            Text("If you really want to make my day, you can buy me a decaf oat latte below. No reciprocation expected — it's purely a tip jar.")
                                .font(.system(size: 16, weight: .regular, design: .rounded))
                                .foregroundColor(AppColors.textPrimary(colorScheme))
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
                            .background(AppColors.primary(colorScheme))
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
