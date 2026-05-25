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
                
                Spacer()
                
                // Content
                VStack(spacing: 24) {
                    // Icon
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
                    
                    // App name
                    Text("Queens")
                        .font(.system(size: 40, weight: .light, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                    
                    // Version (you can update this)
                    Text("Version 1.0")
                        .font(.system(size: 14, weight: .regular, design: .rounded))
                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                        .opacity(0.7)
                    
                    // Made with love message
                    VStack(spacing: 12) {
                        HStack(spacing: 8) {
                            Image(systemName: "heart.fill")
                                .font(.system(size: 20))
                                .foregroundColor(Color(red: 0.9, green: 0.4, blue: 0.5))
                            
                            Text("Made with love")
                                .font(.system(size: 22, weight: .medium, design: .rounded))
                                .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                        }
                        .padding(.top, 20)
                        
                        Text("A peaceful puzzle experience")
                            .font(.system(size: 16, weight: .regular, design: .rounded))
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                            .opacity(0.8)
                    }
                }
                
                Spacer()
                Spacer()
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
