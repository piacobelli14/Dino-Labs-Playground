//
//  Account.swift
//
//  Created by Peter Iacobelli on 2/19/25.
//

import SwiftUI
import Security

struct DinoLabsAccount: View {
    let geometry: GeometryProxy
    @Binding var authenticatedUsername: String
    @Binding var authenticatedOrgID: String
    @Binding var isAccount: Bool
    @Binding var leftPanelWidthRatio: CGFloat
    @Binding var showAlert: Bool
    @Binding var alertTitle: String
    @Binding var alertMessage: String
    @Binding var keyBinds: [String: String]
    @Binding var zoomLevel: Double
    @Binding var colorTheme: String
    @Binding var personalUsageData: [LineChartDataPoint]
    @State private var selectedState: String = "none"
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var userEmail: String = ""
    @State private var userImage: String = ""
    @State private var userPhone: String = ""
    @State private var displayEmail: Bool = false
    @State private var displayPhone: Bool = false
    @State private var organizationName: String = ""
    @State private var organizationEmail: String = ""
    @State private var organizationPhone: String = ""
    @State private var organizationImage: String = ""
    @State private var displayTeamID: Bool = false
    @State private var displayTeamEmail: Bool = false
    @State private var displayTeamPhone: Bool = false
    @State private var displayTeamAdminStatus: Bool = false
    @State private var displayTeamRole: Bool = false
    @State private var role: String = ""
    @State private var isAdmin: String = ""
    @State private var isEditingKeyBinds: String? = nil
    private let defaultKeyBinds: [String: String] = [
        "save": "s",
        "undo": "z",
        "redo": "y",
        "cut": "x",
        "copy": "c",
        "paste": "v",
        "search": "f",
        "selectAll": "a"
    ]
    private let keyBindDisplayNames: [String: String] = [
        "save": "Save File",
        "undo": "Undo Last Action",
        "redo": "Redo Last Action",
        "cut": "Cut",
        "copy": "Copy",
        "paste": "Paste",
        "search": "Search",
        "selectAll": "Select All"
    ]
    
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Spacer()
                        HStack {
                            Spacer()
                            if let url = URL(string: userImage), !userImage.isEmpty {
                                AsyncImage(url: url) { image in
                                    image.resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(.gray)
                                }
                                .frame(width: 110, height: 110)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .shadow(color: .white.opacity(0.5), radius: 2, x: 0, y: 0)
                                .padding(.trailing, 8)
                            } else {
                                RoundedRectangle(cornerRadius: 8)
                                    .frame(width: 110, height: 110)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                    .shadow(color: .white.opacity(0.5), radius: 2, x: 0, y: 0)
                                    .padding(.trailing, 8)
                            }
                        }
                        .frame(width: ((geometry.size.width * (1 - leftPanelWidthRatio) * 0.5) * 0.9) * 0.45)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(firstName) \(lastName)")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                            
                            HStack {
                                Image(systemName: "person.text.rectangle.fill")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 12, height: 12)
                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                    .font(.system(size: 12, weight: .regular))
                                    .padding(.trailing, 2)
                                
                                Text("@\(authenticatedUsername)")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                    .lineLimit(1)
                                    .truncationMode(.tail)
                                
                                Spacer()
                            }
                            .padding(.top, 6)
                            .padding(.bottom, 4)
                            
                            HStack {
                                Image(systemName: "envelope.fill")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 12, height: 12)
                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                    .font(.system(size: 12, weight: .regular))
                                    .padding(.trailing, 2)
                                
                                Text(displayEmail ? userEmail : String(repeating: "•", count: userEmail.count))
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                    .lineLimit(1)
                                    .truncationMode(.tail)
                                
                                Spacer()
                            }
                            .padding(.bottom, 4)
                            
                            HStack {
                                Image(systemName: "iphone")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 12, height: 12)
                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                    .font(.system(size: 12, weight: .regular))
                                    .padding(.trailing, 2)
                                
                                Text(displayPhone ? userPhone : String(repeating: "•", count: userPhone.count))
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                    .lineLimit(1)
                                    .truncationMode(.tail)
                                
                                Spacer()
                            }
                            .padding(.bottom, 4)
                            
                            HStack {
                                Image(systemName: "building.2.fill")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 12, height: 12)
                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                    .font(.system(size: 12, weight: .regular))
                                    .padding(.trailing, 2)
                                
                                Text("\(organizationName) (ID: \(displayTeamID ? authenticatedOrgID : String(repeating: "•", count: authenticatedOrgID.count)))")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                    .lineLimit(1)
                                    .truncationMode(.tail)
                                
                                Spacer()
                            }
                            .padding(.bottom, 4)
                        }
                        .frame(width: ((geometry.size.width * (1 - leftPanelWidthRatio) * 0.5) * 0.9) * 0.65)
                        
                        Spacer()
                    }
                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.5) * 0.9)
                }
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.55,
                       height: ((geometry.size.height - 50) * 0.9) * 0.4)
                .containerHelper(
                    backgroundColor: Color(hex: 0x111111),
                    borderColor: .clear,
                    borderWidth: 0,
                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                    shadowColor: .clear,
                    shadowRadius: 0,
                    shadowX: 0,
                    shadowY: 0
                )
                .overlay(
                    Rectangle()
                        .frame(width: 0.5)
                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                    alignment: .trailing
                )
                
                VStack(alignment: .leading, spacing: 0) {
                    if !authenticatedOrgID.isEmpty && authenticatedOrgID != authenticatedUsername {
                        HStack(alignment: .top, spacing: 0) {
                            Spacer()
                            HStack {
                                Spacer()
                                if let orgUrl = URL(string: organizationImage), !organizationImage.isEmpty {
                                    AsyncImage(url: orgUrl) { image in
                                        image.resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(.gray)
                                    }
                                    .frame(width: 80, height: 80)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                    .shadow(color: .white.opacity(0.5), radius: 2, x: 0, y: 0)
                                    .padding(.trailing, 20)
                                } else {
                                    RoundedRectangle(cornerRadius: 8)
                                        .frame(width: 80, height: 80)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                        .shadow(color: .white.opacity(0.5), radius: 2, x: 0, y: 0)
                                        .padding(.trailing, 20)
                                }
                            }
                            .frame(width: ((geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.9) * 0.4)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Image(systemName: "building.2.fill")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 12, height: 12)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .font(.system(size: 12, weight: .regular))
                                        .padding(.trailing, 2)
                                    
                                    Text(organizationName.trimmingCharacters(in: .whitespaces))
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                    
                                    Spacer()
                                }
                                .padding(.bottom, 4)
                                
                                HStack {
                                    Image(systemName: "person.text.rectangle.fill")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 12, height: 12)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .font(.system(size: 12, weight: .regular))
                                        .padding(.trailing, 2)
                                    
                                    Text("ID: \(displayTeamID ? authenticatedOrgID : String(repeating: "•", count: authenticatedOrgID.count))")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                    
                                    Spacer()
                                }
                                .padding(.bottom, 4)
                                
                                HStack {
                                    Image(systemName: "envelope.fill")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 12, height: 12)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .font(.system(size: 12, weight: .regular))
                                        .padding(.trailing, 2)
                                    
                                    Text(displayTeamEmail ? organizationEmail : String(repeating: "•", count: organizationEmail.count))
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                    
                                    Spacer()
                                }
                                .padding(.bottom, 4)
                                
                                HStack {
                                    Image(systemName: "iphone")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 12, height: 12)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .font(.system(size: 12, weight: .regular))
                                        .padding(.trailing, 2)
                                    
                                    Text(displayTeamPhone ? organizationPhone : String(repeating: "•", count: organizationPhone.count))
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                    
                                    Spacer()
                                }
                                .padding(.bottom, 4)
                            }
                            .frame(width: ((geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.9) * 0.6)
                            
                            Spacer()
                        }
                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.9)
                        
                        HStack {
                            Spacer()
                            VStack(alignment: .leading, spacing: 0) {
                                HStack {
                                    Text("Admin at \(organizationName):")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                    
                                    Text("\(displayTeamAdminStatus ? (isAdmin == "admin" ? "True" : "False") : "N/A")")
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                    Spacer()
                                }
                                .padding(.bottom, 6)
                                
                                HStack {
                                    Text("Role at \(organizationName):")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                    
                                    Text("\(displayTeamRole ? role : String(repeating: "•", count: role.count))")
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                    Spacer()
                                }
                                .padding(.bottom, 6)
                            }
                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.75)
                            Spacer()
                        }
                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.9)
                        .padding(.top, 20)
                         
                    }
                }
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45,
                       height: ((geometry.size.height - 50) * 0.9) * 0.4)
                .containerHelper(
                    backgroundColor: Color(hex: 0x111111),
                    borderColor: .clear,
                    borderWidth: 0,
                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                    shadowColor: .clear,
                    shadowRadius: 0,
                    shadowX: 0,
                    shadowY: 0
                )
                .overlay(
                    Rectangle()
                        .frame(width: 0.5)
                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                    alignment: .leading
                )
            }
            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio),
                   height: ((geometry.size.height - 50) * 0.9) * 0.4)
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                alignment: .bottom
            )
            
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    ScrollView {
                        VStack(spacing: 0) {
                            AccountButtonMain {
                                selectedState = (selectedState == "personalInfo" ? "none" : "personalInfo")
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.55, height: 40)
                            .containerHelper(backgroundColor: selectedState == "personalInfo" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .overlay(
                                HStack {
                                    Image(systemName: "person.and.background.dotted")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5))
                                        .padding(.trailing, 4)
                                        .allowsHitTesting(false)
                                    Text("Update My Personal Information")
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                        .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                        .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .allowsHitTesting(false)
                                    Spacer()
                                    Image(systemName: "arrow.right.square")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .padding(.trailing, 6)
                                        .allowsHitTesting(false)
                                }
                                    .padding(.horizontal, 12)
                            )
                            .hoverEffect(backgroundColor: Color(hex: 0x212121).opacity(0.6),opacity: 0.5, cursor: .pointingHand)
                            .overlay(
                                Rectangle()
                                    .frame(height: 0.5)
                                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                alignment: .bottom
                            )
                            
                            AccountButtonMain {
                                selectedState = (selectedState == "teamInfo" ? "none" : "teamInfo")
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.55, height: 40)
                            .containerHelper(backgroundColor: selectedState == "teamInfo" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .overlay(
                                HStack {
                                    Image(systemName: "person.3.fill")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5))
                                        .padding(.trailing, 4)
                                        .allowsHitTesting(false)
                                    Text("Update My Team Information")
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                        .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                        .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .allowsHitTesting(false)
                                    Spacer()
                                    Image(systemName: "arrow.right.square")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .padding(.trailing, 6)
                                        .allowsHitTesting(false)
                                }
                                    .padding(.horizontal, 12)
                            )
                            .hoverEffect(backgroundColor: Color(hex: 0x212121).opacity(0.6),opacity: 0.5, cursor: .pointingHand)
                            .overlay(
                                Rectangle()
                                    .frame(height: 0.5)
                                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                alignment: .bottom
                            )
                            
                            AccountButtonMain {
                                selectedState = (selectedState == "settingsManagement" ? "none" : "settingsManagement")
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.55, height: 40)
                            .containerHelper(backgroundColor: selectedState == "settingsManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .overlay(
                                HStack {
                                    Image(systemName: "gearshape.2")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5))
                                        .padding(.trailing, 4)
                                        .allowsHitTesting(false)
                                    Text("Edit My Dino Labs Playground Settings")
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                        .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                        .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .allowsHitTesting(false)
                                    Spacer()
                                    Image(systemName: "arrow.right.square")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .padding(.trailing, 6)
                                        .allowsHitTesting(false)
                                }
                                    .padding(.horizontal, 12)
                            )
                            .hoverEffect(backgroundColor: Color(hex: 0x212121).opacity(0.6),opacity: 0.5, cursor: .pointingHand)
                            .overlay(
                                Rectangle()
                                    .frame(height: 0.5)
                                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                alignment: .bottom
                            )
                            
                            AccountButtonMain {
                                selectedState = (selectedState == "shortcutManagement" ? "none" : "shortcutManagement")
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.55, height: 40)
                            .containerHelper(backgroundColor: selectedState == "shortcutManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .overlay(
                                HStack {
                                    Image(systemName: "keyboard.macwindow")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5))
                                        .padding(.trailing, 4)
                                        .allowsHitTesting(false)
                                    Text("Configure My Keyboard Shortcuts")
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                        .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                        .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .allowsHitTesting(false)
                                    Spacer()
                                    Image(systemName: "arrow.right.square")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .padding(.trailing, 6)
                                        .allowsHitTesting(false)
                                }
                                    .padding(.horizontal, 12)
                            )
                            .hoverEffect(backgroundColor: Color(hex: 0x212121).opacity(0.6),opacity: 0.5, cursor: .pointingHand)
                            .overlay(
                                Rectangle()
                                    .frame(height: 0.5)
                                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                alignment: .bottom
                            )
                            
                            AccountButtonMain {
                                selectedState = (selectedState == "themeManagement" ? "none" : "themeManagement")
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.55, height: 40)
                            .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .overlay(
                                HStack {
                                    Image(systemName: "paintpalette")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5))
                                        .padding(.trailing, 4)
                                        .allowsHitTesting(false)
                                    Text("Change My Editor Theme")
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                        .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                        .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .allowsHitTesting(false)
                                    Spacer()
                                    Image(systemName: "arrow.right.square")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 14, height: 14)
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .padding(.trailing, 6)
                                        .allowsHitTesting(false)
                                }
                                    .padding(.horizontal, 12)
                            )
                            .hoverEffect(backgroundColor: Color(hex: 0x212121).opacity(0.6),opacity: 0.5, cursor: .pointingHand)
                            .overlay(
                                Rectangle()
                                    .frame(height: 0.5)
                                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                alignment: .bottom
                            )
                        }
                    }
                    .zIndex(1)
                    
                    Spacer()
                    
                    HStack {
                        Spacer()
                        Text("Changes to settings should save automatically. If you don't see your change reflected immediately, try refreshing the app or signing in again.")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                            .lineLimit(3)
                            .truncationMode(.tail)
                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.55) * 0.9, height: 60)
                            .padding(.vertical, 8)
                        Spacer()
                    }
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.55, height: 80)
                    .zIndex(2)
                    .containerHelper(
                        backgroundColor: Color(hex: 0x121212),
                        borderColor: .clear,
                        borderWidth: 0,
                        topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                        shadowColor: .clear,
                        shadowRadius: 0,
                        shadowX: 0,
                        shadowY: 0
                    )
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                        alignment: .top
                    )
                }
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.55,
                       height: ((geometry.size.height - 50) * 0.9) * 0.6)
                .containerHelper(
                    backgroundColor: Color(hex: 0x111111),
                    borderColor: .clear,
                    borderWidth: 0,
                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                    shadowColor: .clear,
                    shadowRadius: 0,
                    shadowX: 0,
                    shadowY: 0
                )
                .overlay(
                    Rectangle()
                        .frame(width: 0.5)
                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                    alignment: .trailing
                )
                
                Group {
                    if selectedState == "none" || selectedState == "permissions" {
                        VStack {
                            HStack {
                                Spacer()
                                VStack(alignment: .center, spacing: 0) {
                                    Text("Personal Usage")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(Color.white.opacity(0.8))
                                        .shadow(color: Color.white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .padding(.bottom, 4)
                                    Text("Edits Saved In Last 30 Days")
                                        .font(.system(size: 9, weight: .regular))
                                        .foregroundColor(Color.white.opacity(0.5))
                                }
                                Spacer()
                            }
                            .padding(.top, 20)
                            
                            LineChartView(series1Name: "Edits Saved",
                                          series1Data: $personalUsageData,
                                          series2Name: nil,
                                          series2Data: .constant(nil),
                                          showGrid: true)
                        }
                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45,
                               height: ((geometry.size.height - 50) * 0.9) * 0.6)
                        .containerHelper(
                            backgroundColor: Color(hex: 0x111111),
                            borderColor: .clear,
                            borderWidth: 0,
                            topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                            shadowColor: .clear,
                            shadowRadius: 0,
                            shadowX: 0,
                            shadowY: 0
                        )
                        .overlay(
                            Rectangle()
                                .frame(width: 0.5)
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                            alignment: .leading
                        )
                    } else {
                        VStack {
                            if selectedState == "personalInfo" {
                                ScrollView {
                                    VStack(spacing: 0) {
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Display my email address.")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                Spacer()
                                                
                                                Toggle("", isOn: $displayEmail)
                                                    .toggleStyle(ToggleSwitch(
                                                       toggleWidth: 25,
                                                       toggleHeight: 16,
                                                       circleSize: 15,
                                                       activeColor: .purple,
                                                       inactiveColor: Color(hex: 0x333333),
                                                       thumbColor: .white,
                                                       textColor: .white,
                                                       fontSize: 11,
                                                       fontWeight: .bold,
                                                       activeText: "Yes",
                                                       inactiveText: "No",
                                                       showText: true,
                                                       animationDuration: 0.3,
                                                       animationDamping: 0.8
                                                    ))
                                                    .onChange(of: displayEmail) { newVal in
                                                        updateShowColumnValue(userID: authenticatedUsername,
                                                                              organizationID: authenticatedOrgID,
                                                                              showColumn: "showpersonalemail",
                                                                              showColumnValue: newVal)
                                                    }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                        
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Display my phone number.")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: $displayPhone)
                                                    .toggleStyle(ToggleSwitch(
                                                       toggleWidth: 25,
                                                       toggleHeight: 16,
                                                       circleSize: 15,
                                                       activeColor: .purple,
                                                       inactiveColor: Color(hex: 0x333333),
                                                       thumbColor: .white,
                                                       textColor: .white,
                                                       fontSize: 11,
                                                       fontWeight: .bold,
                                                       activeText: "Yes",
                                                       inactiveText: "No",
                                                       showText: true,
                                                       animationDuration: 0.3,
                                                       animationDamping: 0.8
                                                    ))
                                                    .onChange(of: displayPhone) { newVal in
                                                        updateShowColumnValue(userID: authenticatedUsername,
                                                                              organizationID: authenticatedOrgID,
                                                                              showColumn: "showpersonalphone",
                                                                              showColumnValue: newVal)
                                                    }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                    }
                                }
                                .zIndex(1)
                                
                                Spacer()
                                
                                HStack {
                                    Spacer()
                                    Text("To edit your actual account information, picture or contact info, please login to the main Dino Labs web platform and change it from the account management dashboard.")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(3)
                                        .truncationMode(.tail)
                                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9, height: 60)
                                        .padding(.vertical, 8)
                                    Spacer()
                                }
                                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 80)
                                .zIndex(2)
                                .containerHelper(
                                    backgroundColor: Color(hex: 0x121212),
                                    borderColor: .clear,
                                    borderWidth: 0,
                                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                    shadowColor: .clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .overlay(
                                    Rectangle()
                                        .frame(height: 0.5)
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                    alignment: .top
                                )
                            } else if selectedState == "teamInfo" {
                                ScrollView {
                                    VStack(spacing: 0) {
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Display my team's ID number.")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: $displayTeamID)
                                                    .toggleStyle(ToggleSwitch(
                                                       toggleWidth: 25,
                                                       toggleHeight: 16,
                                                       circleSize: 15,
                                                       activeColor: .purple,
                                                       inactiveColor: Color(hex: 0x333333),
                                                       thumbColor: .white,
                                                       textColor: .white,
                                                       fontSize: 11,
                                                       fontWeight: .bold,
                                                       activeText: "Yes",
                                                       inactiveText: "No",
                                                       showText: true,
                                                       animationDuration: 0.3,
                                                       animationDamping: 0.8
                                                    ))
                                                    .onChange(of: displayTeamID) { newVal in
                                                        updateShowColumnValue(userID: authenticatedUsername,
                                                                              organizationID: authenticatedOrgID,
                                                                              showColumn: "showteamid",
                                                                              showColumnValue: newVal)
                                                    }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                        
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Display my team's email.")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: $displayTeamEmail)
                                                    .toggleStyle(ToggleSwitch(
                                                       toggleWidth: 25,
                                                       toggleHeight: 16,
                                                       circleSize: 15,
                                                       activeColor: .purple,
                                                       inactiveColor: Color(hex: 0x333333),
                                                       thumbColor: .white,
                                                       textColor: .white,
                                                       fontSize: 11,
                                                       fontWeight: .bold,
                                                       activeText: "Yes",
                                                       inactiveText: "No",
                                                       showText: true,
                                                       animationDuration: 0.3,
                                                       animationDamping: 0.8
                                                    ))
                                                    .onChange(of: displayTeamEmail) { newVal in
                                                        updateShowColumnValue(userID: authenticatedUsername,
                                                                              organizationID: authenticatedOrgID,
                                                                              showColumn: "showteamemail",
                                                                              showColumnValue: newVal)
                                                    }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                        
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Display my team's phone number.")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: $displayTeamPhone)
                                                    .toggleStyle(ToggleSwitch(
                                                       toggleWidth: 25,
                                                       toggleHeight: 16,
                                                       circleSize: 15,
                                                       activeColor: .purple,
                                                       inactiveColor: Color(hex: 0x333333),
                                                       thumbColor: .white,
                                                       textColor: .white,
                                                       fontSize: 11,
                                                       fontWeight: .bold,
                                                       activeText: "Yes",
                                                       inactiveText: "No",
                                                       showText: true,
                                                       animationDuration: 0.3,
                                                       animationDamping: 0.8
                                                    ))
                                                    .onChange(of: displayTeamPhone) { newVal in
                                                        updateShowColumnValue(userID: authenticatedUsername,
                                                                              organizationID: authenticatedOrgID,
                                                                              showColumn: "showteamphone",
                                                                              showColumnValue: newVal)
                                                    }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                        
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Display my admin status at \(organizationName).")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: $displayTeamAdminStatus)
                                                    .toggleStyle(ToggleSwitch(
                                                       toggleWidth: 25,
                                                       toggleHeight: 16,
                                                       circleSize: 15,
                                                       activeColor: .purple,
                                                       inactiveColor: Color(hex: 0x333333),
                                                       thumbColor: .white,
                                                       textColor: .white,
                                                       fontSize: 11,
                                                       fontWeight: .bold,
                                                       activeText: "Yes",
                                                       inactiveText: "No",
                                                       showText: true,
                                                       animationDuration: 0.3,
                                                       animationDamping: 0.8
                                                    ))
                                                    .onChange(of: displayTeamAdminStatus) { newVal in
                                                        updateShowColumnValue(userID: authenticatedUsername,
                                                                              organizationID: authenticatedOrgID,
                                                                              showColumn: "showteamadminstatus",
                                                                              showColumnValue: newVal)
                                                    }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                        
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Display my role at \(organizationName).")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: $displayTeamRole)
                                                    .toggleStyle(ToggleSwitch(
                                                       toggleWidth: 25,
                                                       toggleHeight: 16,
                                                       circleSize: 15,
                                                       activeColor: .purple,
                                                       inactiveColor: Color(hex: 0x333333),
                                                       thumbColor: .white,
                                                       textColor: .white,
                                                       fontSize: 11,
                                                       fontWeight: .bold,
                                                       activeText: "Yes",
                                                       inactiveText: "No",
                                                       showText: true,
                                                       animationDuration: 0.3,
                                                       animationDamping: 0.8
                                                    ))
                                                    .onChange(of: displayTeamRole) { newVal in
                                                        updateShowColumnValue(userID: authenticatedUsername,
                                                                              organizationID: authenticatedOrgID,
                                                                              showColumn: "showteamrole",
                                                                              showColumnValue: newVal)
                                                    }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                    }
                                }
                                .zIndex(1)
                                
                                Spacer()
                                
                                HStack {
                                    Spacer()
                                    Text("To edit your team affiliation information or affiliation status, please login to the main Dino Labs web platform and change it from the account management dashboard.")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(3)
                                        .truncationMode(.tail)
                                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9, height: 60)
                                        .padding(.vertical, 8)
                                    Spacer()
                                }
                                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 80)
                                .zIndex(2)
                                .containerHelper(
                                    backgroundColor: Color(hex: 0x121212),
                                    borderColor: .clear,
                                    borderWidth: 0,
                                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                    shadowColor: .clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .overlay(
                                    Rectangle()
                                        .frame(height: 0.5)
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                    alignment: .top
                                )
                            } else if selectedState == "settingsManagement" {
                                ScrollView {
                                    VStack(spacing: 0) {
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Set Default Zoom Level")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                Spacer()
                                                
                                                Slider(
                                                    value: $zoomLevel,
                                                    range: 0.5...3,
                                                    step: 0.1,
                                                    sliderWidth: 140,
                                                    sliderHeight: 8,
                                                    thumbSize: 12,
                                                    activeColor: .purple,
                                                    inactiveColor: Color(white: 0.3),
                                                    thumbColor: .white,
                                                    textColor: .white,
                                                    fontSize: 11,
                                                    fontWeight: .bold,
                                                    textFormatter: { "\(Int($0 * 100))%" },
                                                    showText: true,
                                                    animationDuration: 0.2,
                                                    animationDamping: 0.7,
                                                    onEditingChanged: { editing in
                                                        if !editing {
                                                            saveUserPreferences(
                                                                userID: authenticatedUsername,
                                                                organizationID: authenticatedOrgID,
                                                                zoomLevel: zoomLevel,
                                                                colorTheme: colorTheme
                                                            )
                                                        }
                                                    }
                                                )
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                    }
                                }
                                .zIndex(1)
                                
                                Spacer()
                                
                                HStack {
                                    Spacer()
                                    Text("Your preference changes should be saved automatically. If you don't see your changes saved automatically, try refreshing the app or signing in again.")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(3)
                                        .truncationMode(.tail)
                                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9, height: 60)
                                        .padding(.vertical, 8)
                                    Spacer()
                                }
                                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 80)
                                .zIndex(2)
                                .containerHelper(
                                    backgroundColor: Color(hex: 0x121212),
                                    borderColor: .clear,
                                    borderWidth: 0,
                                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                    shadowColor: .clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .overlay(
                                    Rectangle()
                                        .frame(height: 0.5)
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                    alignment: .top
                                )
                            } else if selectedState == "shortcutManagement" {
                                ScrollView {
                                    VStack(spacing: 0) {
                                        ForEach(Array(keyBinds.keys), id: \.self) { action in
                                            HStack {
                                                Spacer()
                                                HStack {
                                                    Text(getKeyBindDisplayName(for: action))
                                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                        .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                        .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                        .lineLimit(1)
                                                        .truncationMode(.tail)
                                                        .allowsHitTesting(false)
                                                    
                                                    Spacer()
                                                    
                                                    if isEditingKeyBinds == action {
                                                        Menu {
                                                            ForEach(Array("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"), id: \.self) { letter in
                                                                Button(String(letter)) {
                                                                    handleKeyBindChange(action: action, newKey: String(letter))
                                                                    isEditingKeyBinds = nil
                                                                }
                                                                .font(.system(size: 12, weight: .semibold))
                                                                .frame(width: 60)
                                                            }
                                                        } label: {
                                                            Text("")
                                                                .font(.system(size: 12, weight: .semibold))
                                                                .frame(width: 60)
                                                        }
                                                        .frame(width: 60, height: 18)
                                                        .containerHelper(backgroundColor: Color(hex: 0x2222222), borderColor: Color.clear, borderWidth: 0, topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4, shadowColor: .white.opacity(0.4), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                                        .hoverEffect(opacity: 0.6, cursor: .pointingHand)
                                                    } else {
                                                        AccountButtonMain {
                                                            isEditingKeyBinds = action
                                                        }
                                                        .frame(width: 60, height: 18)
                                                        .containerHelper(backgroundColor: Color(hex: 0x2222222), borderColor: Color.clear, borderWidth: 0, topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4, shadowColor: .white.opacity(0.4), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                                        .overlay(
                                                            HStack {
                                                                HStack {
                                                                    Text(keyBinds[action] ?? "")
                                                                        .font(.system(size: 12, weight: .semibold))
                                                                        .frame(width: 60)
                                                                }
                                                            }
                                                        )
                                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                                        
                                                    }
                                                }
                                                .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                                Spacer()
                                            }
                                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                            .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                            .overlay(
                                                Rectangle()
                                                    .frame(height: 0.5)
                                                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                                alignment: .bottom
                                            )
                                        }
                                    }
                                }
                                .zIndex(1)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    if isEditingKeyBinds != nil {
                                        isEditingKeyBinds = nil
                                    }
                                }
                                
                                Spacer()
                                
                                HStack {
                                    Spacer()
                                    Text("Your keyboard shortcuts should update automatically. If you don't see your changes reflected immediately, please refresh the app or try signing in again.")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(3)
                                        .truncationMode(.tail)
                                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9, height: 60)
                                        .padding(.vertical, 8)
                                    Spacer()
                                }
                                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 80)
                                .zIndex(2)
                                .containerHelper(
                                    backgroundColor: Color(hex: 0x121212),
                                    borderColor: .clear,
                                    borderWidth: 0,
                                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                    shadowColor: .clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .overlay(
                                    Rectangle()
                                        .frame(height: 0.5)
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                    alignment: .top
                                )
                            } else if selectedState == "themeManagement" {
                                ScrollView {
                                    VStack(spacing: 0) {
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Default Theme")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                HStack(spacing: 4) {
                                                    Circle().fill(Color(hex: 0xC586C0)).frame(width: 10, height: 10)
                                                    Circle().fill(Color(hex: 0xCE9178)).frame(width: 10, height: 10)
                                                    Circle().fill(Color(hex: 0xB5CEA8)).frame(width: 10, height: 10)
                                                }
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: Binding<Bool>(
                                                    get: { colorTheme == "default" },
                                                    set: { newValue in
                                                        colorTheme = newValue ? "default" : "dark"
                                                        saveUserPreferences(userID: authenticatedUsername,
                                                                          organizationID: authenticatedOrgID,
                                                                          zoomLevel: zoomLevel,
                                                                          colorTheme: colorTheme)
                                                    }
                                                ))
                                                .toggleStyle(ToggleSwitch(
                                                    toggleWidth: 25,
                                                    toggleHeight: 16,
                                                    circleSize: 15,
                                                    activeColor: .purple,
                                                    inactiveColor: Color(hex: 0x333333),
                                                    thumbColor: .white,
                                                    textColor: .white,
                                                    fontSize: 11,
                                                    fontWeight: .bold,
                                                    activeText: "Default",
                                                    inactiveText: "Custom",
                                                    showText: false,
                                                    animationDuration: 0.3,
                                                    animationDamping: 0.8
                                                ))
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                        
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Dark Theme")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                HStack(spacing: 4) {
                                                    Circle().fill(Color(red: 0.59, green: 0.44, blue: 0.63)).frame(width: 10, height: 10)
                                                    Circle().fill(Color(red: 0.64, green: 0.35, blue: 0.34)).frame(width: 10, height: 10)
                                                    Circle().fill(Color(red: 0.55, green: 0.61, blue: 0.47)).frame(width: 10, height: 10)
                                                }
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: Binding<Bool>(
                                                    get: { colorTheme == "dark" },
                                                    set: { newValue in
                                                        colorTheme = newValue ? "dark" : "default"
                                                        saveUserPreferences(userID: authenticatedUsername,
                                                                          organizationID: authenticatedOrgID,
                                                                          zoomLevel: zoomLevel,
                                                                          colorTheme: colorTheme)
                                                    }
                                                ))
                                                .toggleStyle(ToggleSwitch(
                                                    toggleWidth: 25,
                                                    toggleHeight: 16,
                                                    circleSize: 15,
                                                    activeColor: .purple,
                                                    inactiveColor: Color(hex: 0x333333),
                                                    thumbColor: .white,
                                                    textColor: .white,
                                                    fontSize: 11,
                                                    fontWeight: .bold,
                                                    activeText: "Default",
                                                    inactiveText: "Custom",
                                                    showText: false,
                                                    animationDuration: 0.3,
                                                    animationDamping: 0.8
                                                ))
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                        
                                        HStack {
                                            Spacer()
                                            HStack {
                                                Text("Light Theme")
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.9))
                                                    .font(.system(size: 11, weight: .semibold, design: .default).italic())
                                                    .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                                    .lineLimit(1)
                                                    .truncationMode(.tail)
                                                    .allowsHitTesting(false)
                                                
                                                HStack(spacing: 4) {
                                                    Circle().fill(Color.blue).frame(width: 10, height: 10)
                                                    Circle().fill(Color.orange).frame(width: 10, height: 10)
                                                    Circle().fill(Color.green).frame(width: 10, height: 10)
                                                }
                                                
                                                Spacer()
                                                
                                                Toggle("", isOn: Binding<Bool>(
                                                    get: { colorTheme == "light" },
                                                    set: { newValue in
                                                        colorTheme = newValue ? "light" : "default"
                                                        saveUserPreferences(userID: authenticatedUsername,
                                                                          organizationID: authenticatedOrgID,
                                                                          zoomLevel: zoomLevel,
                                                                          colorTheme: colorTheme)
                                                    }
                                                ))
                                                .toggleStyle(ToggleSwitch(
                                                    toggleWidth: 25,
                                                    toggleHeight: 16,
                                                    circleSize: 15,
                                                    activeColor: .purple,
                                                    inactiveColor: Color(hex: 0x333333),
                                                    thumbColor: .white,
                                                    textColor: .white,
                                                    fontSize: 11,
                                                    fontWeight: .bold,
                                                    activeText: "Default",
                                                    inactiveText: "Custom",
                                                    showText: false,
                                                    animationDuration: 0.3,
                                                    animationDamping: 0.8
                                                ))
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9)
                                            Spacer()
                                        }
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 40)
                                        .containerHelper(backgroundColor: selectedState == "themeManagement" ? Color(hex: 0x111111) : Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                            alignment: .bottom
                                        )
                                    }
                                }
                                .zIndex(1)
                                
                                HStack {
                                    Spacer()
                                    Text("Your theme changes should save automatically. If you don't see your changes saved automatically, try refreshing the app or signing in again.")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.7))
                                        .lineLimit(3)
                                        .truncationMode(.tail)
                                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.45) * 0.9, height: 60)
                                        .padding(.vertical, 8)
                                    Spacer()
                                }
                                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45, height: 80)
                                .zIndex(2)
                                .containerHelper(
                                    backgroundColor: Color(hex: 0x121212),
                                    borderColor: .clear,
                                    borderWidth: 0,
                                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                    shadowColor: .clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .overlay(
                                    Rectangle()
                                        .frame(height: 0.5)
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                                    alignment: .top
                                )
                            }
                        }
                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.45,
                               height: ((geometry.size.height - 50) * 0.9) * 0.6)
                        .containerHelper(
                            backgroundColor: Color(hex: 0x111111),
                            borderColor: .clear,
                            borderWidth: 0,
                            topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                            shadowColor: .clear,
                            shadowRadius: 0,
                            shadowX: 0,
                            shadowY: 0
                        )
                        .overlay(
                            Rectangle()
                                .frame(width: 0.5)
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                            alignment: .leading
                        )
                    }
                }
            }
            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio),
                   height: ((geometry.size.height - 50) * 0.9) * 0.6)
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                alignment: .top
            )
        }
        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio),
               height: (geometry.size.height - 50) * 0.9)
        .containerHelper(
            backgroundColor: Color(hex: 0x242424),
            borderColor: .clear,
            borderWidth: 0,
            topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
            shadowColor: .clear,
            shadowRadius: 0,
            shadowX: 0,
            shadowY: 0
        )
        .overlay(
            Rectangle()
                .frame(height: 0.5)
                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
            alignment: .bottom
        )
        .onAppear {
            if let token = loadTokenFromKeychain(), !token.isEmpty {
                fetchUserInfo(userID: authenticatedUsername, organizationID: authenticatedOrgID)
                if authenticatedOrgID.isEmpty || authenticatedOrgID == authenticatedUsername {
                    selectedState = "permissions"
                } else {
                    selectedState = "none"
                }
            }
        }
    }
    
    func fetchUserInfo(userID: String, organizationID: String) {
        guard let token = loadTokenFromKeychain() else {
            return
        }
        let url = URL(string: "http://localhost:3001/user-info")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "userID": userID,
            "organizationID": organizationID
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                return
            }
            guard let data = data,
                  let httpResp = response as? HTTPURLResponse,
                  httpResp.statusCode == 200 else {
                return
            }
            if let jsonArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
               let dataDict = jsonArray.first {
                updateUserState(from: dataDict)
            } else if let dataDict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                updateUserState(from: dataDict)
            }
        }.resume()
    }
    
    func updateUserState(from dataDict: [String: Any]) {
        DispatchQueue.main.async {
            self.userEmail = dataDict["email"] as? String ?? ""
            self.firstName = dataDict["firstname"] as? String ?? ""
            self.lastName = dataDict["lastname"] as? String ?? ""
            self.userImage = dataDict["image"] as? String ?? ""
            self.userPhone = dataDict["phone"] as? String ?? ""
            self.role = dataDict["role"] as? String ?? ""
            self.isAdmin = dataDict["isadmin"] as? String ?? ""
            
            self.displayEmail = dataDict["showpersonalemail"] as? Bool ?? false
            self.displayPhone = dataDict["showpersonalphone"] as? Bool ?? false
            
            self.organizationName = dataDict["organizationname"] as? String ?? ""
            self.organizationEmail = dataDict["organizationemail"] as? String ?? ""
            self.organizationPhone = dataDict["organizationphone"] as? String ?? ""
            self.organizationImage = dataDict["organizationimage"] as? String ?? ""
            
            self.displayTeamID = dataDict["showteamid"] as? Bool ?? false
            self.displayTeamEmail = dataDict["showteamemail"] as? Bool ?? false
            self.displayTeamPhone = dataDict["showteamphone"] as? Bool ?? false
            self.displayTeamAdminStatus = dataDict["showteamadminstatus"] as? Bool ?? false
            self.displayTeamRole = dataDict["showteamrole"] as? Bool ?? false
            
            if let userKeyBinds = dataDict["userkeybinds"] as? [String: String] {
                self.keyBinds = defaultKeyBinds.merging(userKeyBinds) { _, new in new }
            } else {
                self.keyBinds = defaultKeyBinds
            }
            
            self.zoomLevel = dataDict["userzoomlevel"] as? Double ?? 1.0
            self.colorTheme = dataDict["usercolortheme"] as? String ?? "default"
        }
    }
    
    func updateShowColumnValue(userID: String, organizationID: String, showColumn: String, showColumnValue: Bool) {
        guard let token = loadTokenFromKeychain() else { return }
        let url = URL(string: "http://localhost:3001/update-user-show-values")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "userID": userID,
            "organizationID": organizationID,
            "showColumn": showColumn,
            "showColumnValue": showColumnValue
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { _, _, _ in}.resume()
    }
    
    func getKeyBindDisplayName(for action: String) -> String {
        keyBindDisplayNames[action] ?? action
    }
    
    func handleKeyBindChange(action: String, newKey: String) {
        guard newKey.count == 1 else { return }
        let lowerNewKey = newKey.lowercased()
        for (existingAction, key) in keyBinds {
            if key == lowerNewKey && existingAction != action {
                alertTitle = "System Alert"
                alertMessage = "Key \"\(newKey)\" is already assigned to \"\(existingAction)\". Please choose a different key."
                showAlert = true
                return
            }
        }
        keyBinds[action] = lowerNewKey
        saveUserKeyBinds(userID: authenticatedUsername, organizationID: authenticatedOrgID, updatedKeyBinds: keyBinds)
    }
    
    func saveUserKeyBinds(userID: String, organizationID: String, updatedKeyBinds: [String: String]) {
        guard let token = loadTokenFromKeychain() else { return }
        let url = URL(string: "http://localhost:3001/update-user-keybinds")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "userID": userID,
            "organizationID": organizationID,
            "keyBinds": updatedKeyBinds
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { _, response, _ in
            guard let httpResp = response as? HTTPURLResponse,
                  httpResp.statusCode == 200 else {
                DispatchQueue.main.async {
                    alertTitle = "System Alert"
                    alertMessage = "Failed to save key bindings. Please try again."
                    showAlert = true
                }
                return
            }
        }.resume()
    }
    
    func saveUserPreferences(userID: String, organizationID: String, zoomLevel: Double, colorTheme: String) {
        guard let token = loadTokenFromKeychain() else { return }
        let url = URL(string: "http://localhost:3001/update-user-preferences")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "userID": userID,
            "organizationID": organizationID,
            "zoomLevel": zoomLevel,
            "colorTheme": colorTheme
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { _, response, _ in
            guard let httpResp = response as? HTTPURLResponse,
                  httpResp.statusCode == 200 else {
                DispatchQueue.main.async {
                    alertTitle = "System Alert"
                    alertMessage = "Failed to save preferences. Please try again."
                    showAlert = true
                }
                return
            }
        }.resume()
    }
}
