//
//  ContentView.swift
//
//  Created by Peter Iacobelli on 2/12/25.
//

import SwiftUI

struct ContentView: View {
    @ObservedObject private var sessionManager = SessionStateManager.shared
    @State private var currentView: AppView = .DinoLabsPlayground
    @State private var authenticatedUsername: String = "piacobelli"
    @State private var authenticatedOrgID: String = "100000"
    @State private var isLoggedOut: Bool = false
    @StateObject private var auth = AuthViewModel()

    var body: some View {
        GeometryReader { geometry in
            Group {
                switch currentView {
                case .Loading:
                    VStack {
                        Spacer()
                    }
                case .LoginAuth:
                    LoginAuth(currentView: $currentView,
                              authenticatedUsername: $authenticatedUsername,
                              authenticatedOrgID: $authenticatedOrgID)
                case .ResetAuth:
                    ResetAuth(currentView: $currentView,
                              authenticatedUsername: $authenticatedUsername,
                              authenticatedOrgID: $authenticatedOrgID)
                case .RegisterAuth:
                    RegisterAuth(currentView: $currentView,
                                 authenticatedUsername: $authenticatedUsername,
                                 authenticatedOrgID: $authenticatedOrgID)
                case .DinoLabsPlayground:
                    DinoLabsPlayground(currentView: $currentView,
                                       authenticatedUsername: $authenticatedUsername,
                                       authenticatedOrgID: $authenticatedOrgID,
                                       directoryURL: $sessionManager.directoryURL,
                                       displayedChildren: $sessionManager.displayedChildren)
                    .onAppear {
                        checkToken()
                    }
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .onAppear {
                initializeView()
            }
        }
    }

    func checkToken() {
        if let token = loadTokenFromKeychain() {
            if isTokenExpired(token: token) {
                handleTokenExpiration()
            } else {
                decodeToken(token: token)
            }
        } else {
            redirectToLogin()
        }
    }

    func handleTokenExpiration() {
        withAnimation {
            deleteTokenFromKeychain()
            auth.token = nil
            auth.isAdmin = false
            isLoggedOut = true
            currentView = .DinoLabsPlayground//.LoginAuth
        }
    }

    func redirectToLogin() {
        withAnimation {
            isLoggedOut = true
            currentView = .DinoLabsPlayground//.LoginAuth
        }
    }

    func initializeView() {
        if let token = loadTokenFromKeychain() {
            if !isTokenExpired(token: token) {
                decodeToken(token: token)
                withAnimation {
                    currentView = .DinoLabsPlayground
                }
            } else {
                handleTokenExpiration()
            }
        } else {
            redirectToLogin()
        }
    }

    func decodeToken(token: String) {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else {
            handleTokenExpiration()
            return
        }

        let payload = parts[1]
        var base64String = String(payload)
        while base64String.count % 4 != 0 {
            base64String.append("=")
        }

        guard let decodedData = Data(base64Encoded: base64String) else {
            handleTokenExpiration()
            return
        }

        guard let json = try? JSONSerialization.jsonObject(with: decodedData, options: []),
              let dict = json as? [String: Any] else {
            handleTokenExpiration()
            return
        }

        if let username = dict["userid"] as? String {
            authenticatedUsername = username
            UserDefaults.standard.set(username, forKey: "userID")
        }
        if let orgID = dict["orgid"] as? String {
            authenticatedOrgID = orgID
            UserDefaults.standard.set(orgID, forKey: "orgID")
        }
        if let isAdmin = dict["isadmin"] as? Bool {
            auth.isAdmin = isAdmin
        }
        
        if let exp = dict["exp"] as? TimeInterval {
            let expirationDate = Date(timeIntervalSince1970: exp)
            if Date() > expirationDate {
                handleTokenExpiration()
                return
            }
        }
        auth.token = token
    }
}
