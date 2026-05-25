//
//  GameSetupView.swift
//  queens
//
//  Created by Alex on 06/04/2026.
//

import SwiftUI

struct GameSetupView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    @State private var selectedStars: Int = 1
    @State private var selectedSize: Int = 6
    @State private var navigateToGame = false
    
    let starOptions = [1, 2]
    let sizeOptions = [6, 8, 10]
    
    private var isIPadLandscape: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }
    
    // Valid combinations: 6×6 (1 star), 8×8 (1 star), 10×10 (2 stars)
    private func isValidCombination(size: Int, stars: Int) -> Bool {
        switch size {
        case 6:
            return stars == 1
        case 8:
            return stars == 1
        case 10:
            return stars == 2
        default:
            return false
        }
    }

    private var availableStarOptions: [Int] {
        switch selectedSize {
        case 6:
            return [1]
        case 8:
            return [1]
        case 10:
            return [2]
        default:
            return [1]
        }
    }
    
    var body: some View {
        ZStack {
            // Matching gradient background
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.94, blue: 0.98), // Soft lavender
                    Color(red: 0.89, green: 0.93, blue: 0.97)  // Pale blue
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 40) {
                // Header with back button - hide on iPad landscape
                if !isIPadLandscape {
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
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 10)
                }
                
                // Title
                Text("New Game")
                    .font(.system(size: 36, weight: .light, design: .rounded))
                    .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                    .padding(.top, isIPadLandscape ? 20 : 0)
                
                VStack(spacing: 32) {
                    // Stars Per Region Selector
                    VStack(spacing: 12) {
                        Text("Stars Per Region")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                            .frame(maxWidth: .infinity, alignment: .center)
                        
                        HStack(spacing: 16) {
                            ForEach(starOptions, id: \.self) { stars in
                                let isAvailable = availableStarOptions.contains(stars)
                                
                                Button(action: {
                                    if isAvailable {
                                        selectedStars = stars
                                    }
                                }) {
                                    Text("\(stars) Star\(stars > 1 ? "s" : "")")
                                        .font(.system(size: 18, weight: .medium, design: .rounded))
                                        .foregroundColor(isAvailable ? (selectedStars == stars ? .white : Color(red: 0.45, green: 0.55, blue: 0.75)) : Color(red: 0.6, green: 0.62, blue: 0.68))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(selectedStars == stars && isAvailable ?
                                                    LinearGradient(
                                                        colors: [
                                                            Color(red: 0.45, green: 0.55, blue: 0.75),
                                                            Color(red: 0.5, green: 0.6, blue: 0.8)
                                                        ],
                                                        startPoint: .leading,
                                                        endPoint: .trailing
                                                    ) :
                                                    LinearGradient(
                                                        colors: [
                                                            Color(red: 0.92, green: 0.92, blue: 0.95),
                                                            Color(red: 0.92, green: 0.92, blue: 0.95)
                                                        ],
                                                        startPoint: .leading,
                                                        endPoint: .trailing
                                                    )
                                                )
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(selectedStars == stars ? Color(red: 0.45, green: 0.55, blue: 0.75) : Color.clear, lineWidth: 2)
                                        )
                                        .opacity(isAvailable ? 1.0 : 0.5)
                                }
                                .disabled(!isAvailable)
                            }
                        }
                        .frame(maxWidth: isIPadLandscape ? 500 : .infinity)
                    }
                    
                    // Grid Size Selector
                    VStack(spacing: 12) {
                        Text("Size")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                            .frame(maxWidth: .infinity, alignment: .center)
                        
                        HStack(spacing: 16) {
                            ForEach(sizeOptions, id: \.self) { size in
                                Button(action: {
                                    selectedSize = size
                                    // Auto-adjust stars to valid option for this size
                                    if !availableStarOptions.contains(selectedStars) {
                                        selectedStars = availableStarOptions.first ?? 1
                                    }
                                }) {
                                    Text("\(size)×\(size)")
                                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                                        .foregroundColor(selectedSize == size ? .white : Color(red: 0.45, green: 0.55, blue: 0.75))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(selectedSize == size ?
                                                LinearGradient(
                                                    colors: [
                                                        Color(red: 0.45, green: 0.55, blue: 0.75),
                                                        Color(red: 0.5, green: 0.6, blue: 0.8)
                                                    ],
                                                    startPoint: .leading,
                                                    endPoint: .trailing
                                                ) :
                                                LinearGradient(
                                                    colors: [
                                                        Color(red: 0.92, green: 0.92, blue: 0.95),
                                                        Color(red: 0.92, green: 0.92, blue: 0.95)
                                                    ],
                                                    startPoint: .leading,
                                                    endPoint: .trailing
                                                )
                                            )
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(selectedSize == size ? Color(red: 0.45, green: 0.55, blue: 0.75) : Color.clear, lineWidth: 2)
                                    )
                                }
                            }
                        }
                        .frame(maxWidth: isIPadLandscape ? 500 : .infinity)
                    }
                }
                .padding(.horizontal, 24)
                
                Spacer()
                
                // Start Button
                Button(action: {
                    navigateToGame = true
                }) {
                    Text("Start")
                        .font(.system(size: 22, weight: .medium, design: .rounded))
                        .foregroundColor(.white)
                        .frame(maxWidth: isIPadLandscape ? 500 : .infinity)
                        .padding(.vertical, 18)
                        .background(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.45, green: 0.55, blue: 0.75),
                                    Color(red: 0.5, green: 0.6, blue: 0.8)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: Color(red: 0.4, green: 0.5, blue: 0.7).opacity(0.3), radius: 15, x: 0, y: 8)
                }
                .padding(.horizontal, 24)

                Spacer()
                    .frame(height: 40)
            }
        }
        .navigationBarBackButtonHidden(!isIPadLandscape)
        .navigationTitle(isIPadLandscape ? "New Game" : "")
        .navigationDestination(isPresented: $navigateToGame) {
            GameView(puzzleSize: selectedSize, starsPerUnit: selectedStars)
        }
    }
}

#Preview {
    NavigationStack {
        GameSetupView()
    }
}
