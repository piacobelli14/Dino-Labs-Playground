import SwiftUI

struct HoverEffectModifier: ViewModifier {
    let hoverBackground: Color?
    let hoverForeground: Color?
    let hoverOpacity: Double?
    let scaleFactor: CGFloat?
    let cursor: NSCursor?
    
    @State private var isHovered: Bool = false
    
    func body(content: Content) -> some View {
        content
            .background(isHovered ? (hoverBackground ?? Color.clear) : Color.clear)
            .overlay(
                GeometryReader { proxy in
                    if let cursor = cursor {
                        CursorAreaRepresentable(cursor: cursor)
                            .frame(width: proxy.size.width, height: proxy.size.height)
                    }
                }
            )
            .onHover { hovering in
                withAnimation(.easeInOut(duration: 0.2)) {
                    isHovered = hovering
                }
            }
            .foregroundColor(isHovered ? (hoverForeground ?? Color.primary) : Color.primary)
            .opacity(isHovered ? (hoverOpacity ?? 1.0) : 1.0)
            .scaleEffect(isHovered ? (scaleFactor ?? 1.0) : 1.0)
    }
}

extension View {
    func hoverEffect(
        backgroundColor: Color? = nil,
        foregroundColor: Color? = nil,
        opacity: Double? = nil,
        scale: CGFloat? = nil,
        cursor: NSCursor? = nil
    ) -> some View {
        self.modifier(
            HoverEffectModifier(
                hoverBackground: backgroundColor,
                hoverForeground: foregroundColor,
                hoverOpacity: opacity,
                scaleFactor: scale,
                cursor: cursor
            )
        )
    }
}

struct CursorAreaRepresentable: NSViewRepresentable {
    let cursor: NSCursor
    
    func makeNSView(context: Context) -> NSView {
        let view = TrackingView(cursor: cursor)
        return view
    }
    
    func updateNSView(_ nsView: NSView, context: Context) {
    }
    
    class TrackingView: NSView {
        let cursor: NSCursor
        
        init(cursor: NSCursor) {
            self.cursor = cursor
            super.init(frame: .zero)
        }
        
        required init?(coder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }
        
        override func updateTrackingAreas() {
            super.updateTrackingAreas()
            trackingAreas.forEach { removeTrackingArea($0) }
            let options: NSTrackingArea.Options = [.mouseEnteredAndExited, .activeInActiveApp, .inVisibleRect]
            let trackingArea = NSTrackingArea(rect: bounds, options: options, owner: self, userInfo: nil)
            addTrackingArea(trackingArea)
        }
        
        override func mouseEntered(with event: NSEvent) {
            cursor.push()
        }
        
        override func mouseExited(with event: NSEvent) {
            NSCursor.pop()
        }
        
        override func hitTest(_ point: NSPoint) -> NSView? {
            return nil
        }
    }
}
