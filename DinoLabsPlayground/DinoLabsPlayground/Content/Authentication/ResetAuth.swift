//
//  ResetAuth.swift
//
//  Created by Peter Iacobelli on 2/13/25.
//

import SwiftUI
import AVKit
#if os(macOS)

struct ResetAuth: View {
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
    
    @State private var isEmail: Bool = true
    @State private var isCode: Bool = false
    @State private var isReset: Bool = false
    @State private var newPassword: String = ""
    @State private var confirmPassword: String = ""
    @State private var newPasswordVisible: Bool = false
    @State private var confirmPasswordVisible: Bool = false
    @State private var errorMessage: String? = nil
    @State private var resetEmail: String = ""
    @State private var resetCode: String = ""
    @State private var checkedResetCode: String = ""
    
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
                        
                        VStack {
                            Spacer()
                            
                            HStack {
                                Spacer()
                                VStack {
                                    Spacer()
                                    
                                    if isEmail {
                                        Image("DinoLabsLogo-Letters")
                                            .resizable()
                                            .aspectRatio(contentMode: .fit)
                                            .frame(width: 150, height: 150)
                                            .padding(.top, 4)
                                        
                                        VStack {
                                            AuthenticationTextField(placeholder: "Enter Your Email", text: $resetEmail)
                                                .textFieldStyle(PlainTextFieldStyle())
                                                .foregroundColor(.black)
                                                .font(.system(size: 8))
                                                .hoverEffect(opacity: 0.5)
                                                .clickEffect(opacity: 1.0)
                                                .padding(.vertical, 14)
                                                .padding(.horizontal, 14)
                                                .frame(width: geometry.size.width * 0.32)
                                                .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.5), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                                .padding(.bottom, 4)
                                                .onSubmit {
                                                    handleEmail()
                                                }
                                            
                                            AuthenticationButtonMain {
                                                handleEmail()
                                            }
                                            .frame(width: geometry.size.width * 0.32, height: 40)
                                            .overlay(
                                                HStack {
                                                    Spacer()
                                                    Text("Continue")
                                                        .font(.system(size: 12, weight: .bold))
                                                        .foregroundColor(.white)
                                                    Spacer()
                                                }
                                                    .allowsHitTesting(false)
                                            )
                                            .containerHelper(backgroundColor: Color(hex: 0x4E3270), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.5), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                            .padding(.bottom, 2)
                                            .hoverEffect(opacity: 0.5)
                                            .clickEffect(opacity: 0.1)
                                        }
                                        .padding(.top, geometry.size.height * 0.01)
                                    }
                                    
                                    if isCode {
                                        Image("DinoLabsLogo-Letters")
                                            .resizable()
                                            .aspectRatio(contentMode: .fit)
                                            .frame(width: 150, height: 150)
                                            .padding(.top, 4)
                                        
                                        VStack {
                                            AuthenticationTextField(placeholder: "Enter Your Six Digit Code", text: $resetCode)
                                                .textFieldStyle(PlainTextFieldStyle())
                                                .foregroundColor(.black)
                                                .font(.system(size: 8))
                                                .hoverEffect(opacity: 0.5)
                                                .clickEffect(opacity: 1.0)
                                                .padding(.vertical, 14)
                                                .padding(.horizontal, 14)
                                                .frame(width: geometry.size.width * 0.32)
                                                .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.4), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                                .padding(.bottom, 4)
                                                .onSubmit {
                                                    checkResetCode()
                                                }
                                        }
                                        .padding(.top, geometry.size.height * 0.01)
                                    }
                                    
                                    if isReset {
                                        Image("DinoLabsLogo-Letters")
                                            .resizable()
                                            .aspectRatio(contentMode: .fit)
                                            .frame(width: 150, height: 150)
                                            .padding(.top, 4)
                                        
                                        VStack {
                                            ZStack(alignment: .trailing) {
                                                AuthenticationTextField(placeholder: "New Password", text: $newPassword, isSecure: !newPasswordVisible)
                                                    .id(newPasswordVisible ? "visible" : "secure")
                                                    .textFieldStyle(PlainTextFieldStyle())
                                                    .foregroundColor(.black)
                                                    .font(.system(size: 8))
                                                    .hoverEffect(opacity: 0.5)
                                                    .clickEffect(opacity: 1.0)
                                                    .padding(.vertical, 14)
                                                    .padding(.horizontal, 14)
                                                    .frame(width: geometry.size.width * 0.32)
                                                    .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.4), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                                    .padding(.bottom, 4)
                                                    .onSubmit {
                                                        handlePassword()
                                                    }
                                                
                                                AuthenticationButtonMain {
                                                    newPasswordVisible.toggle()
                                                }
                                                .frame(width: 20, height: 20)
                                                .overlay(
                                                    Image(systemName: newPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                                        .font(.system(size: 14, weight: .semibold))
                                                        .foregroundColor(Color(hex: 0x222222))
                                                        .shadow(color: Color.gray.opacity(0.5), radius: 1, x: 0, y: 0)
                                                        .allowsHitTesting(false)
                                                )
                                                .padding(.trailing, 8)
                                            }
                                            
                                            ZStack(alignment: .trailing) {
                                                AuthenticationTextField(placeholder: "Confirm Password", text: $confirmPassword, isSecure: !confirmPasswordVisible)
                                                    .id(confirmPasswordVisible ? "visible" : "secure")
                                                    .textFieldStyle(PlainTextFieldStyle())
                                                    .foregroundColor(.black)
                                                    .font(.system(size: 8))
                                                    .hoverEffect(opacity: 0.5)
                                                    .clickEffect(opacity: 1.0)
                                                    .padding(.vertical, 14)
                                                    .padding(.horizontal, 14)
                                                    .frame(width: geometry.size.width * 0.32)
                                                    .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.4), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                                    .padding(.bottom, 4)
                                                    .onSubmit {
                                                        handlePassword()
                                                    }
                                                
                                                AuthenticationButtonMain {
                                                    confirmPasswordVisible.toggle()
                                                }
                                                .frame(width: 20, height: 20)
                                                .overlay(
                                                    Image(systemName: confirmPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                                        .font(.system(size: 14, weight: .semibold))
                                                        .foregroundColor(Color(hex: 0x222222))
                                                        .shadow(color: Color.gray.opacity(0.5), radius: 1, x: 0, y: 0)
                                                        .allowsHitTesting(false)
                                                )
                                                .padding(.trailing, 8)
                                            }
                                            
                                            AuthenticationButtonMain {
                                                handlePassword()
                                            }
                                            .frame(width: geometry.size.width * 0.32, height: 40)
                                            .overlay(
                                                HStack {
                                                    Spacer()
                                                    Text("Set New Password")
                                                        .font(.system(size: 12, weight: .bold))
                                                        .foregroundColor(.white)
                                                    Spacer()
                                                }
                                                .allowsHitTesting(false)
                                            )
                                            .containerHelper(backgroundColor: Color(hex: 0x4E3270), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.4), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                            .padding(.bottom, 2)
                                            .hoverEffect(opacity: 0.5)
                                            .clickEffect(opacity: 0.1)
                                        }
                                        .padding(.top, geometry.size.height * 0.01)
                                    }
                                    
                                    VStack {
                                        if let error = errorMessage, !error.isEmpty {
                                            Spacer()
                                            Text(error)
                                                .foregroundColor(Color(hex: 0xE54B4B))
                                                .font(.system(size: 12, weight: .bold))
                                            Spacer()
                                        }
                                    }
                                    .frame(height: 12)
                                    .padding(.vertical, 4)
                                    
                                    Spacer()
                                }
                                .frame(width: geometry.size.width * 0.5, height: geometry.size.height * 0.6)
                                .containerHelper(backgroundColor: Color(hex: 0x171717).opacity(0.9), borderColor: Color.clear, borderWidth: 0, topLeft: 10, topRight: 10, bottomLeft: 10, bottomRight: 10, shadowColor: .black.opacity(0.6), shadowRadius: 15, shadowX: 0, shadowY: 0)
                                Spacer()
                            }
                            Spacer()
                        }
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .onChange(of: resetCode) { newValue in
                            let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                            if trimmed == checkedResetCode && !trimmed.isEmpty {
                                isCode = false
                                isReset = true
                            }
                        }
                    }
                }
                
                NavigationBar(geometry: geometry, currentView: $currentView)
                
                Spacer()
            }
        }
    }
    
    private func checkResetCode() {
        let trimmed = resetCode.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed == checkedResetCode && !trimmed.isEmpty {
            isCode = false
            isReset = true
        }
    }
    
    private func handleEmail() {
        resetCode = "xxx"
        guard let url = URL(string: "https://www.dinolaboratories.com/dinolabs/dinolabs-web-api/reset-password") else {
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let requestBody: [String: String] = ["email": resetEmail]
        request.httpBody = try? JSONSerialization.data(withJSONObject: requestBody)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if error != nil {
                    errorMessage = "An error occurred while trying to reset the password. Please try again later."
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    errorMessage = "An error occurred while trying to reset the password. Please try again later."
                    return
                }
                
                if httpResponse.statusCode == 200 {
                    if let data = data,
                       let jsonResponse = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                       let dataDict = jsonResponse["data"] as? [String: Any],
                       let code = dataDict["resetCode"] as? String {
                        checkedResetCode = code
                        isEmail = false
                        isCode = true
                        errorMessage = nil
                    }
                } else if httpResponse.statusCode == 401 {
                    errorMessage = "That email is not in our system."
                }
            }
        }.resume()
    }
    
    private func handlePassword() {
        errorMessage = nil
        
        let isLengthValid = newPassword.count >= 8
        let hasUpperCase = newPassword.range(of: "[A-Z]", options: .regularExpression) != nil
        let hasLowerCase = newPassword.range(of: "[a-z]", options: .regularExpression) != nil
        let hasNumber = newPassword.range(of: "[0-9]", options: .regularExpression) != nil
        let hasSpecialChar = newPassword.range(of: "[!@#$%^&*(),.?\":{}|<>\\-]", options: .regularExpression) != nil
        
        if !isLengthValid {
            errorMessage = "Password must be at least 8 characters long."
            return
        } else if !hasUpperCase {
            errorMessage = "Password must contain at least 1 uppercase letter."
            return
        } else if !hasLowerCase {
            errorMessage = "Password must contain at least 1 lowercase letter."
            return
        } else if !hasNumber {
            errorMessage = "Password must contain at least 1 number."
            return
        } else if !hasSpecialChar {
            errorMessage = "Password must contain at least 1 special character."
            return
        } else if newPassword != confirmPassword {
            errorMessage = "Passwords do not match."
            return
        } else {
            guard let url = URL(string: "https://www.dinolaboratories.com/dinolabs/dinolabs-web-api/change-password") else {
                return
            }
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            let body: [String: String] = ["newPassword": newPassword, "email": resetEmail]
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
            
            URLSession.shared.dataTask(with: request) { data, response, error in
                DispatchQueue.main.async {
                    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                        currentView = .LoginAuth
                    }
                }
            }.resume()
        }
    }
}

#else
#endif
