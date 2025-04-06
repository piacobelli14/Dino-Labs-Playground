//
//  DinoLabsAlert.swift
//
//  Created by Peter Iacobelli on 2/12/25.
//

import SwiftUI
import AppKit

struct DinoLabsAlertOption: Identifiable {
    let id = UUID()
    let value: String
    let label: String
}

struct DinoLabsAlertInput: Identifiable {
    let id: String
    let type: String
    let defaultValue: Any?
    let attributes: [String: Any]?
    let options: [DinoLabsAlertOption]?
    
    init(name: String,
         type: String,
         defaultValue: Any? = nil,
         attributes: [String: Any]? = nil,
         options: [DinoLabsAlertOption]? = nil) {
        self.id = name
        self.type = type
        self.defaultValue = defaultValue
        self.attributes = attributes
        self.options = options
    }
}

struct DinoLabsAlert: View {
    let geometry: GeometryProxy
    let visible: Bool
    let title: String
    let message: String
    let inputs: [DinoLabsAlertInput]
    let showCancel: Bool
    let onConfirm: (([String: Any]?) -> Void)?
    let onCancel: (() -> Void)?
    
    @State private var values: [String: Any] = [:]
    
    init(geometry: GeometryProxy,
         visible: Bool,
         title: String,
         message: String,
         inputs: [DinoLabsAlertInput],
         showCancel: Bool,
         onConfirm: (([String: Any]?) -> Void)?,
         onCancel: (() -> Void)?) {
        
        self.geometry = geometry
        self.visible = visible
        self.title = title
        self.message = message
        self.inputs = inputs
        self.showCancel = showCancel
        self.onConfirm = onConfirm
        self.onCancel = onCancel
        _values = State(initialValue: DinoLabsAlert.initialValues(for: inputs))
    }
    
    static func initialValues(for inputs: [DinoLabsAlertInput]) -> [String: Any] {
        var dict: [String: Any] = [:]
        for input in inputs {
            if input.type == "checkbox" {
                dict[input.id] = input.defaultValue as? Bool ?? false
            } else {
                dict[input.id] = (input.defaultValue as? String) ?? ""
            }
        }
        return dict
    }
    
    var body: some View {
        if !visible {
            return AnyView(EmptyView())
        }
        
        return AnyView(
            ZStack {
                Color.black.opacity(0.7)
                    .edgesIgnoringSafeArea(.all)
                    .frame(width: geometry.size.width, height: geometry.size.height)
                
                VStack {
                    VStack {
                        Image("DinoLabsLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 80, height: 80)
                        
                        if !title.isEmpty {
                            Text(title)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(Color(hex: 0xf5f5f5))
                                .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                .padding(.bottom, geometry.size.height * 0.005)
                                .multilineTextAlignment(.center)
                                .fixedSize(horizontal: false, vertical: true)
                                .frame(width: geometry.size.width * 0.32)
                                .frame(maxWidth: 100)
                        }
                        
                        Text(message)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                            .shadow(color: .gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                            .multilineTextAlignment(.center)
                            .frame(width: geometry.size.width * 0.32)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 20)
                    
                    ForEach(inputs) { input in
                        switch input.type {
                        case "select":
                            AlertMenuField(
                                items: input.options?.map { $0.value } ?? [],
                                selection: Binding(
                                    get: { values[input.id] as? String ?? "" },
                                    set: { newValue in values[input.id] = newValue }
                                )
                            )
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .foregroundColor(.white)
                            .font(.system(size: 8))
                            .hoverEffect(opacity: 0.5)
                            .clickEffect(opacity: 1.0)
                            .padding(.vertical, 10)
                            .padding(.horizontal, 10)
                            .frame(minWidth: 250, maxWidth: 350, maxHeight: 35)
                            .containerHelper(backgroundColor: Color(hex: 0x222222), borderColor: Color(hex: 0x616161), borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.4), shadowRadius: 2, shadowX: 0, shadowY: 0)
                            .padding(.bottom, 4)
                            
                        case "checkbox":
                            HStack {
                                Spacer()
                                AlertCheckField(
                                    label: input.id,
                                    isChecked: Binding(
                                        get: { values[input.id] as? Bool ?? false },
                                        set: { newValue in values[input.id] = newValue }
                                    )
                                )
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                .shadow(color: .gray.opacity(0.4), radius: 0.5, x: 0, y: 0)
                                .fixedSize()
                                .frame(maxWidth: 350, maxHeight: 35)
                                Spacer()
                            }
                            .frame(width: geometry.size.width * 0.4)
                            .frame(minWidth: 250, maxWidth: 350, maxHeight: 35)
                            .padding(.bottom, 4)
                            
                        default:
                            AlertTextField(
                                placeholder: input.id,
                                text: Binding(
                                    get: { values[input.id] as? String ?? "" },
                                    set: { newValue in values[input.id] = newValue }
                                )
                            )
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .textFieldStyle(PlainTextFieldStyle())
                            .foregroundColor(.white)
                            .font(.system(size: 8))
                            .hoverEffect(opacity: 0.5)
                            .clickEffect(opacity: 1.0)
                            .padding(.vertical, 10)
                            .padding(.horizontal, 10)
                            .frame(minWidth: 250, maxWidth: 350, maxHeight: 35)
                            .containerHelper(backgroundColor: Color(hex: 0x222222), borderColor: Color(hex: 0x616161), borderWidth: 2, topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8, shadowColor: .white.opacity(0.4), shadowRadius: 2, shadowX: 0, shadowY: 0)
                            .padding(.bottom, 4)
                        }
                    }
                    
                    HStack {
                        AlertButtonMain {
                            if inputs.count > 0 {
                                onConfirm?(values)
                            } else {
                                onConfirm?(nil)
                            }
                        }
                        .frame(height: 30)
                        .frame(minWidth: 100, maxWidth: 150)
                        .overlay(
                            Text("OK")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .allowsHitTesting(false)
                        )
                        .containerHelper(backgroundColor: Color(hex: 0xAD6ADD), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.4), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                        .hoverEffect(opacity: 0.5, cursor: .pointingHand)
                        .clickEffect(opacity: 0.1)
                        .onHover { isHovered in
                            if isHovered {
                                NSCursor.pointingHand.set()
                            } else {
                                NSCursor.arrow.set()
                            }
                        }
                        
                        if showCancel {
                            AlertButtonMain {
                                onCancel?()
                            }
                            .frame(height: 30)
                            .frame(minWidth: 100, maxWidth: 150)
                            .overlay(
                                Text("Cancel")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(Color(hex: 0x191919))
                                    .allowsHitTesting(false)
                            )
                            .containerHelper(backgroundColor: Color(hex: 0xD8D8D8), borderColor: Color.clear, borderWidth: 0, topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6, shadowColor: .white.opacity(0.4), shadowRadius: 1.5, shadowX: 0, shadowY: 0)
                            .hoverEffect(opacity: 0.5, cursor: .pointingHand)
                            .clickEffect(opacity: 0.1)
                        }
                    }
                    .frame(minWidth: 250, maxWidth: 350, maxHeight: 35)
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                }
                .padding(.vertical, geometry.size.height * 0.05)
                .padding(.horizontal, geometry.size.width * 0.1)
                .frame(minWidth: 300, maxWidth: 350)
                .containerHelper(backgroundColor: Color(hex: 0x222222), borderColor: Color.clear, borderWidth: 0, topLeft: 10, topRight: 10, bottomLeft: 10, bottomRight: 10, shadowColor: .black.opacity(0.8), shadowRadius: 7.5, shadowX: 0, shadowY: 0)
            }
        )
    }
}
