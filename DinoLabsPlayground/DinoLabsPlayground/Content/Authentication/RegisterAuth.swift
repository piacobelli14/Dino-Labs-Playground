//
//  RegisterAuth.swift
//
//  Created by Peter Iacobelli on 2/13/25.
//

import SwiftUI
import AVKit
#if os(macOS)

struct RegisterAuth: View {
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
    @State private var isPersonal: Bool = true
    @State private var isPassword: Bool = false
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var email: String = ""
    @State private var username: String = ""
    @State private var phone: String = ""
    @State private var profileImage: NSImage? = nil
    @State private var newPassword: String = ""
    @State private var confirmPassword: String = ""
    @State private var newPasswordVisible: Bool = false
    @State private var confirmPasswordVisible: Bool = false
    
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
                        
 
                        HStack(alignment: .top) {
                            Spacer()
                            VStack {
                                if isPersonal {
                                    Image("DinoLabsLogo-Letters")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 100, height: 100)
                                        .padding(.top, 16)
                                    
                                    VStack {
                                        HStack {
                                            AuthenticationTextField(placeholder: "First Name", text: $firstName)
                                                .textFieldStyle(PlainTextFieldStyle())
                                                .foregroundColor(.black)
                                                .font(.system(size: 8))
                                                .padding(.vertical, 18)
                                                .padding(.horizontal, 14)
                                                .frame(width: geometry.size.width * 0.32 / 2 - 4)
                                                .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                            
                                            Spacer()
                                            
                                            AuthenticationTextField(placeholder: "Last Name", text: $lastName)
                                                .textFieldStyle(PlainTextFieldStyle())
                                                .foregroundColor(.black)
                                                .font(.system(size: 8))
                                                .padding(.vertical, 18)
                                                .padding(.horizontal, 14)
                                                .frame(width: geometry.size.width * 0.32 / 2 - 4)
                                                .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                        }
                                        .padding(.bottom, 4)
                                        .frame(width: geometry.size.width * 0.32)
                                        
                                        AuthenticationTextField(placeholder: "Email", text: $email)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .foregroundColor(.black)
                                            .font(.system(size: 8))
                                            .padding(.vertical, 18)
                                            .padding(.horizontal, 14)
                                            .frame(width: geometry.size.width * 0.32)
                                            .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                            .padding(.bottom, 4)
                                        
                                        AuthenticationTextField(placeholder: "Phone", text: $phone)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .foregroundColor(.black)
                                            .font(.system(size: 8))
                                            .padding(.vertical, 18)
                                            .padding(.horizontal, 14)
                                            .frame(width: geometry.size.width * 0.32)
                                            .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                            .padding(.bottom, 4)
                                            .onChange(of: phone) { newValue in
                                                self.phone = formatPhoneNumber(newValue)
                                            }
                                        
                                        AuthenticationTextField(placeholder: "Username", text: $username)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .foregroundColor(.black)
                                            .font(.system(size: 8))
                                            .padding(.vertical, 18)
                                            .padding(.horizontal, 14)
                                            .frame(width: geometry.size.width * 0.32)
                                            .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                            .padding(.bottom, 4)
                                        
                                        AuthenticationButtonMain {
                                            handleImageChange()
                                        }
                                        .frame(width: geometry.size.width * 0.32, height: 45)
                                        .overlay(
                                            HStack {
                                                Spacer()
                                                Text(profileImage != nil ? "Change Your Photo" : "Choose a Photo")
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(profileImage != nil ? .white : Color(hex: 0x222222))
                                                Spacer()
                                            }
                                                .allowsHitTesting(false)
                                        )
                                        .containerHelper(backgroundColor: profileImage != nil ? Color(hex: 0x2D3436) : Color.white.opacity(0.6), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                        .padding(.vertical, 4)
                                        .hoverEffect(opacity: 0.5)
                                        .clickEffect(opacity: 0.1)
                                        
                                        
                                        AuthenticationButtonMain(action: {
                                            handleRegister()
                                        })
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
                                        .containerHelper(backgroundColor: Color(hex: 0x4E3270), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                                        .padding(.bottom, 2)
                                        .hoverEffect(opacity: 0.5)
                                        .clickEffect(opacity: 0.1)
                                    }
                                    .padding(.top, geometry.size.height * 0.01)
                                } else if isPassword {
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
                                                .padding(.vertical, 18)
                                                .padding(.horizontal, 14)
                                                .frame(width: geometry.size.width * 0.32)
                                                .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
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
                                                .padding(.vertical, 18)
                                                .padding(.horizontal, 14)
                                                .frame(width: geometry.size.width * 0.32)
                                                .containerHelper(backgroundColor: Color.white, borderColor: Color.black, borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
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
                                        .containerHelper(backgroundColor: Color(hex: 0x4E3270), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.6), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
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
                            .frame(width: geometry.size.width * 0.5, height: geometry.size.height * 0.82)
                            .containerHelper(backgroundColor: Color(hex: 0x171717).opacity(0.9), borderColor: Color.clear, borderWidth: 0, topLeft: 10, topRight: 10, bottomLeft: 10, bottomRight: 10, shadowColor: .black.opacity(0.6), shadowRadius: 15, shadowX: 0, shadowY: 0)
                            Spacer()
                        }
                        .frame(width: geometry.size.width, height: geometry.size.height - 50, alignment: .center)
                            
                        
                    }
                }
                
                NavigationBar(geometry: geometry, currentView: $currentView)
                
                Spacer()
            }
        }
    }
    
    private func formatPhoneNumber(_ value: String) -> String {
        let numericValue = value.filter { "0123456789".contains($0) }
        if numericValue.count >= 10 {
            let areaCode = numericValue.prefix(3)
            let middle = numericValue.dropFirst(3).prefix(3)
            let last = numericValue.dropFirst(6).prefix(4)
            return "(\(areaCode)) \(middle)-\(last)"
        }
        return value
    }
    
    private func handleRegister() {
        guard !firstName.isEmpty, !lastName.isEmpty, !email.isEmpty, !username.isEmpty, !phone.isEmpty else {
            errorMessage = "Please fill in all fields."
            return
        }
        
        let emailRegex = "\\S+@\\S+\\.\\S+"
        let emailTest = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        if !emailTest.evaluate(with: email) {
            errorMessage = "Please enter a valid email address."
            return
        }
        
        let phoneRegex = "^\\(\\d{3}\\) \\d{3}-\\d{4}$"
        let phoneTest = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
        if !phoneTest.evaluate(with: phone) {
            errorMessage = "Please enter a valid phone number in the format (XXX) XXX-XXXX."
            return
        }
        
        let requestBody: [String: Any] = [
            "email": email,
            "username": username
        ]
        
        guard let url = URL(string: "http://localhost:3001/validate-new-user-info") else {
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: requestBody, options: [])
        } catch {
            errorMessage = "Failed to serialize JSON."
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if error != nil {
                    self.errorMessage = "An error occurred. Please try again."
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    self.errorMessage = "An error occurred. Please try again."
                    return
                }
                
                if httpResponse.statusCode == 200 {
                    self.errorMessage = ""
                    self.isPersonal.toggle()
                    self.isPassword.toggle()
                } else {
                    self.errorMessage = "There is already an account associated with that email or username."
                }
            }
        }.resume()
    }
    
    private func handlePassword() {
        let hasUpperCase = newPassword.rangeOfCharacter(from: .uppercaseLetters) != nil
        let hasLowerCase = newPassword.rangeOfCharacter(from: .lowercaseLetters) != nil
        let hasNumber = newPassword.rangeOfCharacter(from: .decimalDigits) != nil
        let specialCharacterSet = CharacterSet(charactersIn: "!@#$%^&*(),.?\":{}|<>-")
        let hasSpecialChar = newPassword.rangeOfCharacter(from: specialCharacterSet) != nil
        let isLengthValid = newPassword.count >= 8
        
        if !isLengthValid {
            errorMessage = "Password must be at least 8 characters long."
            return
        }
        if !hasUpperCase {
            errorMessage = "Password must contain at least 1 uppercase letter."
            return
        }
        if !hasLowerCase {
            errorMessage = "Password must contain at least 1 lowercase letter."
            return
        }
        if !hasNumber {
            errorMessage = "Password must contain at least 1 number."
            return
        }
        if !hasSpecialChar {
            errorMessage = "Password must contain at least 1 special character."
            return
        }
        if newPassword != confirmPassword {
            errorMessage = "Passwords do not match."
            return
        }
        
        var imageBase64: String = ""
        if let image = profileImage {
            if let tiffData = image.tiffRepresentation,
               let bitmap = NSBitmapImageRep(data: tiffData),
               let pngData = bitmap.representation(using: .png, properties: [:]) {
                imageBase64 = pngData.base64EncodedString()
            }
        }
        
        let userData: [String: Any] = [
            "firstName": firstName,
            "lastName": lastName,
            "username": username,
            "email": email,
            "password": newPassword,
            "phone": phone,
            "image": imageBase64
        ]
        
        guard let url = URL(string: "http://localhost:3001/create-user") else {
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: userData, options: [])
        } catch {
            errorMessage = "Failed to serialize JSON."
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if error != nil {
                    self.errorMessage = "An error occurred while registering. Please try again later."
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    self.errorMessage = "An error occurred while registering. Please try again later."
                    return
                }
                
                if httpResponse.statusCode == 200 {
                    self.currentView = .LoginAuth
                } else {
                    if let data = data,
                       let errorResponse = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                       let message = errorResponse["message"] as? String {
                        self.errorMessage = message
                    } else {
                        self.errorMessage = "Registration failed; please try again later."
                    }
                }
            }
        }.resume()
    }
    
    private func handleImageChange() {
        let panel = NSOpenPanel()
        panel.allowedFileTypes = ["png", "jpg", "jpeg"]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        if panel.runModal() == .OK {
            if let url = panel.url, let image = NSImage(contentsOf: url) {
                self.profileImage = image
            }
        }
    }
}

#else
#endif
