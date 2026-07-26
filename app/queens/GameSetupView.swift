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
    @Environment(\.colorScheme) private var colorScheme
    @Environment(AppSettings.self) private var settings
    @State private var selectedStars: Int = 1
    @State private var selectedSize: Int = 6
    @State private var selectedDifficulties: Set<String> = []
    @State private var navigateToGame = false

    let starOptions = PuzzleConfig.starOptions
    let sizeOptions = PuzzleConfig.sizeOptions

    private var isIPadLandscape: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }

    private var availableStarOptions: [Int] {
        PuzzleConfig.availableStars(for: selectedSize)
    }

    var body: some View {
        ZStack {
            AppColors.backgroundGradient(colorScheme)
                .ignoresSafeArea()

            VStack(spacing: 40) {
                // Header — hide on iPad landscape
                if !isIPadLandscape {
                    HStack {
                        Button(action: { dismiss() }) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 20, weight: .medium))
                                .foregroundColor(AppColors.primary(colorScheme))
                                .frame(width: 44, height: 44)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 10)
                }

                Text("New Game")
                    .font(.system(size: 36, weight: .light, design: .rounded))
                    .foregroundColor(AppColors.textPrimary(colorScheme))
                    .padding(.top, isIPadLandscape ? 20 : 0)

                VStack(spacing: 32) {
                    // Stars Per Region selector
                    VStack(spacing: 12) {
                        Text("Stars Per Region")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(AppColors.textPrimary(colorScheme))
                            .frame(maxWidth: .infinity, alignment: .center)

                        HStack(spacing: 16) {
                            ForEach(starOptions, id: \.self) { stars in
                                let isAvailable = availableStarOptions.contains(stars)
                                Button(action: {
                                    if isAvailable { selectedStars = stars }
                                }) {
                                    Text("\(stars) Star\(stars > 1 ? "s" : "")")
                                        .font(.system(size: 18, weight: .medium, design: .rounded))
                                        .foregroundColor(isAvailable ? (selectedStars == stars ? .white : AppColors.primary(colorScheme)) : AppColors.textDisabled(colorScheme))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(selectedStars == stars && isAvailable
                                                    ? AppColors.primaryGradient(colorScheme)
                                                    : LinearGradient(colors: [AppColors.surface(colorScheme), AppColors.surface(colorScheme)], startPoint: .leading, endPoint: .trailing)
                                                )
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(selectedStars == stars ? AppColors.primary(colorScheme) : Color.clear, lineWidth: 2)
                                        )
                                        .opacity(isAvailable ? 1.0 : 0.5)
                                }
                                .disabled(!isAvailable)
                            }
                        }
                        .frame(maxWidth: isIPadLandscape ? 500 : .infinity)
                    }

                    // Grid Size selector
                    VStack(spacing: 12) {
                        Text("Size")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(AppColors.textPrimary(colorScheme))
                            .frame(maxWidth: .infinity, alignment: .center)

                        HStack(spacing: 16) {
                            ForEach(sizeOptions, id: \.self) { size in
                                Button(action: {
                                    selectedSize = size
                                    if !availableStarOptions.contains(selectedStars) {
                                        selectedStars = availableStarOptions.first ?? 1
                                    }
                                    pruneDifficulties()
                                }) {
                                    Text("\(size)×\(size)")
                                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                                        .foregroundColor(selectedSize == size ? .white : AppColors.primary(colorScheme))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(selectedSize == size
                                                    ? AppColors.primaryGradient(colorScheme)
                                                    : LinearGradient(colors: [AppColors.surface(colorScheme), AppColors.surface(colorScheme)], startPoint: .leading, endPoint: .trailing)
                                                )
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(selectedSize == size ? AppColors.primary(colorScheme) : Color.clear, lineWidth: 2)
                                        )
                                }
                            }
                        }
                        .frame(maxWidth: isIPadLandscape ? 500 : .infinity)
                    }

                    // Difficulty multi-select
                    VStack(spacing: 12) {
                        Text("Difficulty")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(AppColors.textPrimary(colorScheme))
                            .frame(maxWidth: .infinity, alignment: .center)

                        HStack(spacing: 10) {
                            ForEach(PuzzleConfig.allDifficulties, id: \.self) { diff in
                                let isValid = PuzzleConfig.validDifficulties(for: selectedSize).contains(diff)
                                let isSelected = selectedDifficulties.contains(diff)
                                Button(action: { toggleDifficulty(diff) }) {
                                    Text(PuzzleConfig.difficultyDisplayName(diff))
                                        .font(.system(size: 14, weight: .medium, design: .rounded))
                                        .foregroundColor(!isValid ? AppColors.textDisabled(colorScheme)
                                                         : (isSelected ? .white : AppColors.primary(colorScheme)))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 11)
                                        .background(
                                            RoundedRectangle(cornerRadius: 10)
                                                .fill(isSelected && isValid
                                                      ? AppColors.primaryGradient(colorScheme)
                                                      : LinearGradient(colors: [AppColors.surface(colorScheme), AppColors.surface(colorScheme)], startPoint: .leading, endPoint: .trailing))
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 10)
                                                .stroke(isSelected && isValid ? AppColors.primary(colorScheme) : Color.clear, lineWidth: 2)
                                        )
                                        .opacity(isValid ? 1.0 : 0.4)
                                }
                                .disabled(!isValid)
                            }
                        }
                        .frame(maxWidth: isIPadLandscape ? 500 : .infinity)
                    }
                }
                .padding(.horizontal, 24)

                Spacer()

                // Start Button
                Button(action: { navigateToGame = true }) {
                    Text("Start")
                        .font(.system(size: 22, weight: .medium, design: .rounded))
                        .foregroundColor(.white)
                        .frame(maxWidth: isIPadLandscape ? 500 : .infinity)
                        .padding(.vertical, 18)
                        .background(AppColors.primaryGradient(colorScheme))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: AppColors.primary(colorScheme).opacity(0.3), radius: 15, x: 0, y: 8)
                }
                .padding(.horizontal, 24)

                Spacer()
                    .frame(height: 40)
            }
        }
        .navigationBarBackButtonHidden(!isIPadLandscape)
        .navigationTitle(isIPadLandscape ? "New Game" : "")
        .navigationDestination(isPresented: $navigateToGame) {
            GameView(puzzleSize: selectedSize, starsPerUnit: selectedStars,
                     difficulties: selectedDifficulties)
        }
        .onAppear {
            selectedDifficulties = settings.selectedDifficulties
            pruneDifficulties()
        }
    }

    private func toggleDifficulty(_ diff: String) {
        if selectedDifficulties.contains(diff) {
            // Enforce at least one selected.
            if selectedDifficulties.count > 1 {
                selectedDifficulties.remove(diff)
            }
        } else {
            selectedDifficulties.insert(diff)
        }
        settings.selectedDifficulties = selectedDifficulties
    }

    /// Drop any selected difficulties that aren't valid for the current size;
    /// if that empties the set, fall back to the first valid bucket.
    private func pruneDifficulties() {
        let valid = PuzzleConfig.validDifficulties(for: selectedSize)
        selectedDifficulties.formIntersection(valid)
        if selectedDifficulties.isEmpty {
            if let first = PuzzleConfig.allDifficulties.first(where: { valid.contains($0) }) {
                selectedDifficulties = [first]
            }
        }
        settings.selectedDifficulties = selectedDifficulties
    }
}

#Preview {
    NavigationStack {
        GameSetupView()
    }
}
