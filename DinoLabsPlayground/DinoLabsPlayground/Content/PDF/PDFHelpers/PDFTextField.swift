//
//  PDFTextField.swift
//
//  Created by Peter Iacobelli on 3/29/25.
//

import SwiftUI
import AppKit

struct PDFTextField: NSViewRepresentable {
    var placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var onReturnKeyPressed: (() -> Void)? = nil
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeNSView(context: Context) -> NSTextField {
        let textField: NSTextField
        
        if isSecure {
            let secureField = NSSecureTextField()
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
            let normalField = PDFNSTextField()
            normalField.isBordered = false
            normalField.drawsBackground = false
            normalField.backgroundColor = .clear
            normalField.focusRingType = .none
            normalField.isEditable = true
            normalField.isSelectable = true
            normalField.font = .systemFont(ofSize: 9, weight: .bold)
            normalField.textColor = .white
            normalField.onReturnKeyPressed = {
                context.coordinator.parent.onReturnKeyPressed?()
            }
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
        var parent: PDFTextField
        
        init(_ parent: PDFTextField) {
            self.parent = parent
        }
        
        func controlTextDidChange(_ notification: Notification) {
            if let textField = notification.object as? NSTextField {
                parent.text = textField.stringValue
            }
        }
        
        func control(_ control: NSControl, textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
            if commandSelector == #selector(NSResponder.insertNewline(_:)) {
                parent.onReturnKeyPressed?()
                return true
            }
            return false
        }
    }
}

class PDFNSTextField: NSTextField {
    var onReturnKeyPressed: (() -> Void)? = nil
    
    override func keyDown(with event: NSEvent) {
        if event.keyCode == 36 {
            onReturnKeyPressed?()
        } else {
            super.keyDown(with: event)
        }
    }
    
    override func becomeFirstResponder() -> Bool {
        let success = super.becomeFirstResponder()
        if success,
           let fieldEditor = self.window?.fieldEditor(true, for: self) as? NSTextView {
            fieldEditor.insertionPointColor = NSColor.white
            fieldEditor.delegate = self
        }
        return success
    }
}

extension PDFNSTextField: NSTextViewDelegate {
    func textView(_ textView: NSTextView, shouldChangeTextIn affectedCharRange: NSRange, replacementString: String?) -> Bool {
        if let replacement = replacementString, replacement == ". " {
            textView.replaceCharacters(in: affectedCharRange, with: "  ")
            return false
        }
        return true
    }
}
