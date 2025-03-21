//
//  VideoButtonMain.swift
//
//  Created by Peter Iacobelli on 3/7/25.
//

import SwiftUI
import AppKit

struct VideoButtonMain: NSViewRepresentable {
    let action: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(action: action)
    }

    func makeNSView(context: Context) -> NSButton {
        let button = NSButton(title: "", target: context.coordinator, action: #selector(Coordinator.buttonAction))
        button.isBordered = false
        button.frame = CGRect(x: 0, y: 0, width: 100, height: 30)
        return button
    }

    func updateNSView(_ nsView: NSButton, context: Context) {
    }

    class Coordinator: NSObject {
        let action: () -> Void
        init(action: @escaping () -> Void) {
            self.action = action
        }
        @objc func buttonAction() {
            action()
        }
    }
}
