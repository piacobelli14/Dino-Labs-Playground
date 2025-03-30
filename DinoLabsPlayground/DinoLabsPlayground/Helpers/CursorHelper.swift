//
//  CursorHelper.swift
//
//  Created by Peter Iacobelli on 2/15/25.
//

import SwiftUI

class CursorView: NSView {
    var cursor: NSCursor?
    
    override func resetCursorRects() {
        if let cursor = cursor {
            addCursorRect(bounds, cursor: cursor)
        }
    }
}

struct MouseTrackingView: NSViewRepresentable {
    var onMouseMove: (CGPoint) -> Void
    
    func makeNSView(context: Context) -> NSView {
        let view = TrackingNSView()
        view.onMouseMove = onMouseMove
        return view
    }
    
    func updateNSView(_ nsView: NSView, context: Context) { }
    
    class TrackingNSView: NSView {
        var onMouseMove: ((CGPoint) -> Void)?
        override func updateTrackingAreas() {
            super.updateTrackingAreas()
            trackingAreas.forEach { removeTrackingArea($0) }
            let options: NSTrackingArea.Options = [.mouseMoved, .activeInKeyWindow, .inVisibleRect]
            let trackingArea = NSTrackingArea(rect: bounds,
                                              options: options,
                                              owner: self,
                                              userInfo: nil)
            addTrackingArea(trackingArea)
        }
        override func mouseMoved(with event: NSEvent) {
            let location = convert(event.locationInWindow, from: nil)
            onMouseMove?(location)
        }
    }
}

struct CursorOnHover: ViewModifier {
    let hovered: Bool
    func body(content: Content) -> some View {
        content.onHover { hovering in
            if hovering && hovered {
                NSCursor.pointingHand.push()
            } else {
                NSCursor.pop()
            }
        }
    }
}

extension View {
    func cursorOnHover(hovered: Bool) -> some View {
        self.modifier(CursorOnHover(hovered: hovered))
    }
}


