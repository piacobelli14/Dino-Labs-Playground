//
//  NetworkMonitor.swift
//
//  Created by Peter Iacobelli on 2/12/25.
//

import SwiftUI
import AVKit

struct NavigationBar: View {
    let geometry: GeometryProxy
    @Binding var currentView: AppView
    @State private var isHamburger = false
    @State private var tokenExpired = false
    @StateObject private var auth = AuthViewModel()
    @StateObject private var networkMonitor = NetworkMonitor()
    
    var body: some View {
        ZStack(alignment: .top) {
            if isHamburger {
                VStack(spacing: 0) {
                    Color.clear.frame(height: 50)
                    Color(hex: 0x191919).opacity(0.9)
                        .edgesIgnoringSafeArea(.bottom)
                        .overlay(
                            VStack(spacing: 0) {
                                if auth.token == nil {
                                    NavigatorButtonMain {
                                        currentView = .RegisterAuth
                                        isHamburger = false
                                    }
                                    .applyPopoutButtonStyle(icon: "person.badge.plus", text: "Sign Up", width: geometry.size.width)
                                    NavigatorButtonMain {
                                        currentView = .LoginAuth
                                        isHamburger = false
                                    }
                                    .applyPopoutButtonStyle(icon: "arrow.right.square", text: "Login", width: geometry.size.width)
                                } else {
                                    NavigatorButtonMain {
                                        currentView = .DinoLabsPlayground
                                        isHamburger = false
                                    }
                                    .applyPopoutButtonStyle(icon: "chevron.left.slash.chevron.right", text: "Dino Labs Playground", width: geometry.size.width)
                                    NavigatorButtonMain {
                                        currentView = .Settings
                                        isHamburger = false
                                    }
                                    .applyPopoutButtonStyle(icon: "gearshape", text: "Settings", width: geometry.size.width)
                                    NavigatorButtonMain {
                                        handleLogout()
                                        isHamburger = false
                                    }
                                    .applyPopoutButtonStyle(icon: "arrow.left.square", text: "Sign Out", width: geometry.size.width)
                                }
                                Spacer()
                            }
                        )
                }
            }
            
            HStack {
                Image("DinoLabsLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 25, height: 25)
                Text("Dino Labs Web IDE")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(hex: 0xf5f5f5))
                    .shadow(color: Color.white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                  
                Spacer()
                HStack {
                    Circle()
                        .fill(connectionColor)
                        .frame(width: 10, height: 10)
                    Text(networkMonitor.downloadSpeed)
                        .foregroundColor(.white)
                        .font(.subheadline)
                }
                .padding(.trailing, 20)
                .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                .onTapGesture {
                    currentView = .Settings
                }
                
                NavigatorButtonMain {
                    isHamburger.toggle()
                }
                .containerHelper(
                    backgroundColor: Color(hex: 0x222222),
                    borderColor: Color.clear,
                    borderWidth: 0,
                    topLeft: 5,
                    topRight: 5,
                    bottomLeft: 5,
                    bottomRight: 5,
                    shadowColor: Color.white.opacity(0.5),
                    shadowRadius: 1,
                    shadowX: 0,
                    shadowY: 0
                )
                .frame(width: 25, height: 25)
                .overlay(
                    Image(systemName: isHamburger ? "xmark" : "line.horizontal.3")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                        .allowsHitTesting(false)
                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                )
            }
            .padding()
            .frame(height: 50)
            .background(Color(hex: 0x191919))
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                alignment: .bottom
            )
        }
        .onAppear { checkTokenExpiration() }
        .onChange(of: auth.token) { _ in checkTokenExpiration() }
    }
    
    var connectionColor: Color {
        switch networkMonitor.signalStrength {
        case "Poor Connection":
            return .red
        case "Moderate Connection":
            return .orange
        case "Good Connection":
            return .yellow
        case "Excellent Connection":
            return .green
        case "Connected":
            return .blue
        default:
            return .gray
        }
    }
    
    func checkTokenExpiration() {
        if let token = auth.token {
            tokenExpired = isTokenExpired(token: token)
        } else {
            tokenExpired = false
        }
    }
    
    func handleLogout() {
        auth.token = nil
        auth.isAdmin = false
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: "authToken",
            kSecAttrService: Bundle.main.bundleIdentifier ?? "com.dinolabs.playground"
        ] as CFDictionary
        let status = SecItemDelete(query)
        if status != errSecSuccess && status != errSecItemNotFound {
            return
        }
        withAnimation {
            currentView = .LoginAuth
            isHamburger = false
        }
    }
}

extension View {
    func applyPopoutButtonStyle(icon: String, text: String, width: CGFloat) -> some View {
        self
            .containerHelper(
                backgroundColor: Color(hex: 0x242424),
                borderColor: Color.clear,
                borderWidth: 0,
                topLeft: 6,
                topRight: 6,
                bottomLeft: 6,
                bottomRight: 6
            )
            .frame(width: width, height: 50)
            .overlay(
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                        .allowsHitTesting(false)
                        .padding(.trailing, 8)
                    Text(text)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(hex: 0xced6dd))
                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                        .allowsHitTesting(false)
                    Spacer()
                    Image(systemName: "arrow.up.forward")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                        .allowsHitTesting(false)
                }
                .padding(.horizontal, 20)
            )
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                alignment: .bottom
            )
            .hoverEffect(opacity: 0.5, cursor: .pointingHand)
            .clickEffect(opacity: 1.0)
    }
}

class AuthViewModel: ObservableObject {
    @Published var token: String? = nil
    @Published var isAdmin: Bool = false
    @Published var loading: Bool = false
    
    init() {
        token = loadTokenFromKeychain()
    }
}
