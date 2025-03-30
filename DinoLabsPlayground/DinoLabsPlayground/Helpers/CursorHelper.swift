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



