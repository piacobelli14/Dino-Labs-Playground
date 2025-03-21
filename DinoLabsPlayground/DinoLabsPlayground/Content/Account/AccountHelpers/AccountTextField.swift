//
//  AccountTextField.swift
//
//  Created by Peter Iacobelli on 2/20/25.
//

import SwiftUI
import AppKit

struct AccountTextField: NSViewRepresentable {
    var placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeNSView(context: Context) -> NSTextField {
        let textField: NSTextField
        
        if isSecure {
            let secureField = ClickableNSSecureTextField()
            secureField.isBordered = false
            secureField.drawsBackground = false
            secureField.backgroundColor = .clear
            secureField.focusRingType = .none
            secureField.isEditable = true
            secureField.isSelectable = true
            secureField.font = .systemFont(ofSize: 9, weight: .bold)
            secureField.textColor = .white
            textField = secureField
        } else {
            let normalField = ClickableNSTextField()
            normalField.isBordered = false
            normalField.drawsBackground = false
            normalField.backgroundColor = .clear
            normalField.focusRingType = .none
            normalField.isEditable = true
            normalField.isSelectable = true
            normalField.font = .systemFont(ofSize: 9, weight: .bold)
            normalField.textColor = .white
            textField = normalField
        }
        
        let placeholderColor = NSColor(srgbRed: 192/255, green: 192/255, blue: 192/255, alpha: 1)
        let placeholderAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: placeholderColor,
            .font: NSFont.systemFont(ofSize: 9, weight: .bold)
        ]
        textField.placeholderAttributedString = NSAttributedString(
            string: placeholder,
            attributes: placeholderAttributes
        )
        
        textField.delegate = context.coordinator
        
        return textField
    }
    
    func updateNSView(_ nsView: NSTextField, context: Context) {
        if nsView.stringValue != text {
            nsView.stringValue = text
        }
        if nsView.window?.firstResponder == nsView,
           let editor = nsView.window?.fieldEditor(true, for: nsView) as? NSTextView {
            editor.insertionPointColor = NSColor.white
        }
    }
    
    class Coordinator: NSObject, NSTextFieldDelegate {
        var parent: AccountTextField
        
        init(_ parent: AccountTextField) {
            self.parent = parent
        }
        
        func controlTextDidChange(_ notification: Notification) {
            if let textField = notification.object as? NSTextField {
                parent.text = textField.stringValue
            }
        }
    }
}
