//
//  LoginAuth.swift
//
//  Created by Peter Iacobelli on 2/12/25.
//

struct LoginResponse: Codable {
    let userid: String
    let orgid: String
    let token: String
}

import SwiftUI
import AVKit

#if os(macOS)

struct LoginAuth: View {
    @Binding var currentView: AppView
    @Binding var authenticatedUsername: String
    @Binding var authenticatedOrgID: String
    
    let gradient = LinearGradient(
        gradient: Gradient(colors: [Color(hex: 0x222832), Color(hex: 0x33435F)]),
        startPoint: .leading,
        endPoint: .trailing
    )
    
    let player: AVPlayer = {
        guard let url = Bundle.main.url(forResource: "SolarSystemBackground", withExtension: "mp4") else {
            fatalError("SolarSystemBackground.mp4 not found in bundle.")
        }
        return AVPlayer(url: url)
    }()

    @State private var errorMessage: String? = nil
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var isPasswordVisible: Bool = false
    @State private var isEmail: Bool = false
    @State private var isLoginSuccessful: Bool = false
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                VStack(spacing: 0) {
                    Spacer().frame(height: 50)
                    ZStack {
                        BackgroundVideoPlayer(player: player)
                            .ignoresSafeArea()
                            .onAppear {
                                player.play()
                                NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime,
                                                                       object: player.currentItem,
                                                                       queue: .main) { _ in
                                    player.seek(to: .zero)
                                    player.play()
                                }
                            }
                        
                        HStack(alignment: .center) {
                            Spacer()
                            VStack {
                                Spacer()
                                
                                Image("DinoLabsLogo-Letters")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 150, height: 150)
                                    .padding(.top, 4)
                                
                                VStack {
                                    AuthenticationTextField(placeholder: "Email Address or Username", text: $email)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .foregroundColor(.black)
                                        .font(.system(size: 8))
                                        .clickEffect(opacity: 1.0)
                                        .padding(.vertical, 18)
                                        .padding(.horizontal, 14)
                                        .frame(width: geometry.size.width * 0.32)
                                        .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                        .padding(.bottom, 4)
                                        .onSubmit {
                                            continueWithEmail()
                                        }
                                        .submitLabel(.next)
                                    
                                    if isEmail {
                                        VStack {
                                            ZStack(alignment: .trailing) {
                                                AuthenticationTextField(
                                                    placeholder: "Password",
                                                    text: $password,
                                                    isSecure: !isPasswordVisible
                                                )
                                                .id(isPasswordVisible ? "visible" : "secure")
                                                .textFieldStyle(PlainTextFieldStyle())
                                                .foregroundColor(.black)
                                                .font(.system(size: 8))
                                                .clickEffect(opacity: 1.0)
                                                .padding(.vertical, 18)
                                                .padding(.horizontal, 14)
                                                .frame(width: geometry.size.width * 0.32)
                                                .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                                .padding(.bottom, 4)
                                                .onSubmit {
                                                    authenticateUser()
                                                }
                                                
                                                AuthenticationButtonMain {
                                                    isPasswordVisible.toggle()
                                                }
                                                .frame(width: 20, height: 20)
                                                .overlay(
                                                    Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                                        .font(.system(size: 14, weight: .semibold))
                                                        .foregroundColor(Color(hex: 0x222222))
                                                        .shadow(color: Color.gray.opacity(0.5), radius: 1, x: 0, y: 0)
                                                        .allowsHitTesting(false)
                                                )
                                                .padding(.trailing, 8)
                                            }
                                            
                                            AuthenticationButtonMain {
                                                authenticateUser()
                                            }
                                            .frame(width: geometry.size.width * 0.32, height: 40)
                                            .overlay(
                                                Text("Sign In")
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(.white)
                                                    .allowsHitTesting(false)
                                            )
                                            .containerHelper(backgroundColor: Color(hex: 0x4E3270), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                            .padding(.bottom, 2)
                                            .hoverEffect(opacity: 0.5)
                                            .clickEffect(opacity: 0.1)
                                        }
                                        
                                        VStack {
                                            if let error = errorMessage {
                                                Spacer()
                                                Text(error)
                                                    .foregroundColor(Color(hex: 0xE54B4B))
                                                    .font(.system(size: 12, weight: .bold))
                                                Spacer()
                                            }
                                        }
                                        .frame(height: 12)
                                        .padding(.vertical, 4)
                                        
                                        AuthenticationButtonMain {
                                            isEmail = false
                                            errorMessage = nil
                                        }
                                        .frame(width: geometry.size.width * 0.32, height: 40)
                                        .overlay(
                                            HStack {
                                                Spacer()
                                                Text("Return to Main")
                                                    .font(.system(size: 12, weight: .semibold))
                                                    .foregroundColor(.white)
                                                Spacer()
                                            }
                                                .padding(.vertical, 14)
                                                .padding(.horizontal, 14)
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.05)
                                        .clickEffect(opacity: 0.1)
                                        
                                    } else {
                                        AuthenticationButtonMain {
                                            continueWithEmail()
                                        }
                                        .frame(width: geometry.size.width * 0.32, height: 40)
                                        .overlay(
                                            HStack {
                                                Spacer()
                                                Image(systemName: "envelope.fill")
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fit)
                                                    .frame(height: geometry.size.height * 0.018)
                                                    .padding(.trailing, 4)
                                                Text("Continue with Email")
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(.white)
                                                Spacer()
                                            }
                                                .allowsHitTesting(false)
                                        )
                                        .containerHelper(backgroundColor: Color(hex: 0x4E3270), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                        .padding(.bottom, 2)
                                        .hoverEffect(opacity: 0.5)
                                        .clickEffect(opacity: 0.1)
                                        
                                        AuthenticationButtonMain {
                                            currentView = .RegisterAuth
                                        }
                                        .frame(width: geometry.size.width * 0.32, height: 40)
                                        .overlay(
                                            HStack {
                                                Spacer()
                                                Image(systemName: "person.badge.plus")
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fit)
                                                    .frame(height: geometry.size.height * 0.018)
                                                    .padding(.trailing, 4)
                                                Text("Create an Account")
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(.white)
                                                Spacer()
                                            }
                                                .allowsHitTesting(false)
                                        )
                                        .containerHelper(backgroundColor: Color(hex: 0x232729), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                        .padding(.bottom, 2)
                                        .hoverEffect(opacity: 0.5)
                                        .clickEffect(opacity: 0.1)
                                        
                                        VStack {
                                            if let error = errorMessage {
                                                Spacer()
                                                Text(error)
                                                    .foregroundColor(Color(hex: 0xE54B4B))
                                                    .font(.system(size: 12, weight: .bold))
                                                Spacer()
                                            }
                                        }
                                        .frame(height: 12)
                                        .padding(.vertical, 4)
                                        
                                        AuthenticationButtonMain {
                                            self.currentView = .ResetAuth
                                        }
                                        .frame(width: geometry.size.width * 0.32, height: 40)
                                        .overlay(
                                            HStack(spacing: 0) {
                                                Spacer()
                                                Text("Forgot password? ")
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(.white)
                                                Text("Click here to reset.")
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(Color(hex: 0xD8C1F5))
                                                Spacer()
                                            }
                                                .padding(.top, 4)
                                                .padding(.bottom, 14)
                                                .padding(.horizontal, 14)
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.05)
                                        .clickEffect(opacity: 0.1)
                                    }
                                }
                                .padding(.top, geometry.size.height * 0.01)
                                Spacer()
                            }
                            .frame(width: geometry.size.width * 0.5, height: geometry.size.height * 0.7)
                            .containerHelper(backgroundColor: Color(hex: 0x171717).opacity(0.9), borderColor: Color.clear, borderWidth: 0, topLeft: 10, topRight: 10, bottomLeft: 10, bottomRight: 10, shadowColor: .black.opacity(0.6), shadowRadius: 15, shadowX: 0, shadowY: 0)
                            Spacer()
                        }
                        Spacer()
                    }
                    .frame(width: geometry.size.width, height: geometry.size.height - 50,  alignment: .center)
                    
                }
                
                NavigationBar(geometry: geometry, currentView: $currentView)
                
                Spacer()
            }
        }
    }
    
    private func continueWithEmail() {
        isEmail = true
    }
    
    private func authenticateUser() {
        let requestBody: [String: Any] = [
            "username": email,
            "password": password
        ]
        
        guard let url = URL(string: "http://localhost:3001/user-authentication") else {
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: requestBody)

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let _ = error {
                DispatchQueue.main.async {
                    self.errorMessage = "An error occurred. Please try again."
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                DispatchQueue.main.async {
                    self.errorMessage = "An error occurred. Please try again."
                }
                return
            }

            switch httpResponse.statusCode {
            case 200:
                if let data = data {
                    DispatchQueue.global(qos: .userInitiated).async {
                        if let loginResponse = try? JSONDecoder().decode(LoginResponse.self, from: data) {
                            saveTokenToKeychain(token: loginResponse.token)
                            
                            if let decodedToken = decodeJWT(token: loginResponse.token) {
                                DispatchQueue.main.async {
                                    self.authenticatedUsername = decodedToken.userid
                                    self.authenticatedOrgID = decodedToken.orgid
                                    self.currentView = .DinoLabsPlayground
                                }
                            } else {
                                DispatchQueue.main.async {
                                    self.errorMessage = "Failed to decode token."
                                }
                            }
                        } else {
                            DispatchQueue.main.async {
                                self.errorMessage = "Failed to parse response."
                            }
                        }
                    }
                }
            case 429:
                DispatchQueue.main.async {
                    self.errorMessage = "Too many login attempts. Please try again in 10 minutes."
                }
            default:
                if let data = data {
                    DispatchQueue.main.async {
                        if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                            self.errorMessage = errorResponse.message
                        } else {
                            self.errorMessage = "An error occurred. Please try again."
                        }
                    }
                } else {
                    DispatchQueue.main.async {
                        self.errorMessage = "An error occurred. Please try again."
                    }
                }
            }
        }.resume()
    }
    
    private func decodeJWT(token: String) -> (userid: String, orgid: String)? {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else {
            return nil
        }

        let payload = parts[1]
        var base64String = String(payload)
        while base64String.count % 4 != 0 {
            base64String.append("=")
        }

        guard let decodedData = Data(base64Encoded: base64String) else {
            return nil
        }

        guard let json = try? JSONSerialization.jsonObject(with: decodedData, options: []),
              let dict = json as? [String: Any],
              let userid = dict["userid"] as? String,
              let orgid = dict["orgid"] as? String else {
            return nil
        }

        return (userid, orgid)
    }
}

#else
#endif
