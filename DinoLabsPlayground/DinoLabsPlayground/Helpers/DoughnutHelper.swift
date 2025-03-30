//
//  DoughnutHelper.swift
//
//  Created by Peter Iacobelli on 2/12/25.
//

import SwiftUI
import Combine

struct DoughnutData: Identifiable {
    let id = UUID()
    let value: Double
    let name: String
}

struct DonutSegment: Shape {
    let startAngle: Double
    let endAngle: Double
    private let outerRadiusFraction: CGFloat = 0.85
    private let innerRadiusFraction: CGFloat = 0.5
    private let gapDegrees: CGFloat = 5

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let sDeg = min(startAngle, endAngle)
        let eDeg = max(startAngle, endAngle)
        let angleDiff = eDeg - sDeg
        let effectiveGapDegrees: CGFloat = (abs(angleDiff - 360) < 0.01) ? 0 : gapDegrees
        let halfGap = effectiveGapDegrees / 2
        let effStart = sDeg + halfGap
        let effEnd   = eDeg - halfGap
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let minDim = min(rect.width, rect.height)
        let outerR = minDim * 0.5 * outerRadiusFraction
        let innerR = minDim * 0.5 * innerRadiusFraction
        let thickness = outerR - innerR
        let cornerR   = thickness * 0.10
        
        func angleToPoint(_ deg: Double, _ radius: CGFloat) -> CGPoint {
            let rad = CGFloat(deg * .pi / 180)
            return CGPoint(
                x: center.x + radius * cos(rad),
                y: center.y + radius * sin(rad)
            )
        }
        
        let outOffsetDeg = (cornerR / outerR) * (180 / .pi)
        let inOffsetDeg  = (cornerR / innerR) * (180 / .pi)
        let outStart = effStart + outOffsetDeg
        let outEnd   = effEnd   - outOffsetDeg
        let inStart  = effStart + inOffsetDeg
        let inEnd    = effEnd   - inOffsetDeg
        
        path.move(to: angleToPoint(outStart, outerR))
        path.addArc(center: center,
                    radius: outerR,
                    startAngle: .degrees(outStart),
                    endAngle: .degrees(outEnd),
                    clockwise: false)
        
        path.addArc(tangent1End: angleToPoint(effEnd, outerR),
                    tangent2End: angleToPoint(effEnd, innerR),
                    radius: cornerR)
        path.addArc(tangent1End: angleToPoint(effEnd, innerR),
                    tangent2End: angleToPoint(inEnd, innerR),
                    radius: cornerR)
        path.addArc(center: center,
                    radius: innerR,
                    startAngle: .degrees(inEnd),
                    endAngle: .degrees(inStart),
                    clockwise: true)
        path.addArc(tangent1End: angleToPoint(effStart, innerR),
                    tangent2End: angleToPoint(effStart, outerR),
                    radius: cornerR)
        path.addArc(tangent1End: angleToPoint(effStart, outerR),
                    tangent2End: angleToPoint(outStart, outerR),
                    radius: cornerR)
        
        path.closeSubpath()
        return path
    }
}

struct AnimatedPieChart: View {
    @Binding var data: [DoughnutData]
    @State private var activeIndex = 0
    @State private var visible = true
    @State private var currentValue: Double = 0.0
    @State private var hoveredIndex: Int? = nil
    @State private var mouseLocation: CGPoint = .zero
    @State private var mouseAngle: Double = 0.0

    private let displayDuration: TimeInterval = 2.0
    private let fadeDuration: TimeInterval = 0.5

    private let colors: [Color] = [
        Color(hex: 0x2ecc71),
        Color(hex: 0x148444),
        Color(hex: 0x0F6340),
        Color(hex: 0x208BB9),
        Color(hex: 0x2042B9),
        Color(hex: 0x3520B9),
        Color(hex: 0x6320B9),
        Color(hex: 0x9120B9),
        Color.blue,
        Color.green
    ]
    
    @State private var timer = Timer.publish(every: 2.0, on: .main, in: .common).autoconnect()

    private func normalized(_ angle: Double) -> Double {
        var a = angle.truncatingRemainder(dividingBy: 360)
        if a < 0 { a += 360 }
        return a
    }
    
    private func angleForSlice(_ i: Int, total: Double, isStart: Bool) -> Double {
        let sum = isStart
            ? data[..<i].reduce(0) { $0 + $1.value }
            : data[...i].reduce(0) { $0 + $1.value }
        return (sum / total) * 360.0 - 90.0
    }
    
    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(data.indices, id: \.self) { i in
                    let total = data.reduce(0) { $0 + $1.value }
                    let startDeg = angleForSlice(i, total: total, isStart: true)
                    let endDeg = angleForSlice(i, total: total, isStart: false)
                    let isActiveOrHovered = (i == activeIndex || i == hoveredIndex)
                    
                    DonutSegment(startAngle: startDeg, endAngle: endDeg)
                        .fill(colors[i % colors.count])
                        .scaleEffect(isActiveOrHovered ? 1.05 : 1.0)
                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isActiveOrHovered)
                        .shadow(color: Color(hex: 0x414141).opacity(0.9), radius: 5)
                        .opacity(isActiveOrHovered ? 1.0 : 0.9)
                }
                
                Text(visible ? "\(Int(currentValue))" : "")
                    .font(.system(size: min(geo.size.width, geo.size.height) * 0.12, weight: .heavy))
                    .foregroundColor(.white)
                    .opacity(visible ? 0.7 : 0)
                    .shadow(color: .white.opacity(0.9), radius: 1)
                    .animation(.easeInOut(duration: fadeDuration), value: visible)
                
                if let index = hoveredIndex {
                    let center = CGPoint(x: geo.size.width/2, y: geo.size.height/2)
                    let outerR = min(geo.size.width, geo.size.height) * 0.5 * 0.85
                    let tooltipOffset: CGFloat = 40
                    let tooltipRadius = outerR + tooltipOffset
                    let rad = mouseAngle * Double.pi / 180
                    let cursorOffset: CGFloat = 40
                    let offsetX = (cos(rad) >= 0 ? cursorOffset : -cursorOffset)
                    let offsetY = (sin(rad) >= 0 ? cursorOffset : -cursorOffset)
                    
                    let proposedPosition = CGPoint(
                        x: center.x + CGFloat(cos(rad)) * tooltipRadius + offsetX,
                        y: center.y + CGFloat(sin(rad)) * tooltipRadius + offsetY
                    )
                    
                    DoughnutTooltipWrapper(
                        content: DoughnutTooltipView(name: data[index].name, value: data[index].value, color: colors[index % colors.count]),
                        containerSize: geo.size,
                        proposedPosition: proposedPosition
                    )
                    .transition(.opacity)
                }
            }
            .background(
                MouseTrackingView { location in
                mouseLocation = location
                
                let center = CGPoint(x: geo.size.width/2, y: geo.size.height/2)
                let dx = location.x - center.x
                let dy = location.y - center.y
                let distance = sqrt(dx * dx + dy * dy)
                let minDim = min(geo.size.width, geo.size.height)
                let outerR = minDim * 0.5 * 0.85
                let innerR = minDim * 0.5 * 0.5
                
                if distance < innerR || distance > outerR {
                    hoveredIndex = nil
                    return
                }
                
                var pointerAngle = atan2(dy, dx) * 180.00 / -Double.pi
                pointerAngle = normalized(pointerAngle)
                mouseAngle = pointerAngle
                
                let total = data.reduce(0) { $0 + $1.value }
                var foundIndex: Int? = nil
                for i in data.indices {
                    let segStart = normalized(angleForSlice(i, total: total, isStart: true))
                    let segEnd = normalized(angleForSlice(i, total: total, isStart: false))
                    if segStart <= segEnd {
                        if pointerAngle >= segStart && pointerAngle < segEnd {
                            foundIndex = i
                            break
                        }
                    } else {
                        if pointerAngle >= segStart || pointerAngle < segEnd {
                            foundIndex = i
                            break
                        }
                    }
                }
                hoveredIndex = foundIndex
            })
            .cursorOnHover(hovered: hoveredIndex != nil)
            .onAppear {
                if !data.isEmpty && data.count < 2 {
                    currentValue = data[0].value
                }
            }
            .onReceive(timer) { _ in
                guard !data.isEmpty else { return }
                if data.count < 2 {
                    currentValue = data[0].value
                    return
                }
                withAnimation { visible = false }
                DispatchQueue.main.asyncAfter(deadline: .now() + fadeDuration) {
                    activeIndex = (activeIndex + 1) % data.count
                    currentValue = data[activeIndex].value
                    withAnimation { visible = true }
                }
            }
        }
    }
}

struct DoughnutPlot: View {
    let cellType: String
    @Binding var data: [DoughnutData]
    let organizationName: String
    let fontSizeMultiplier: CGFloat
    
    var body: some View {
        AnimatedPieChart(data: $data)
            .padding()
    }
}

struct DoughnutTooltipView: View {
    let name: String
    let value: Double
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(name)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white.opacity(0.8))
                .fixedSize(horizontal: true, vertical: false)
            Rectangle()
                .frame(height: 1)
                .foregroundColor(Color.gray.opacity(0.2))
                .padding(.vertical, 6)
            
            HStack(spacing: 0) {
                Text("Count: ")
                    .foregroundColor(color)
                    .font(.system(size: 12, weight: .semibold))
                Text("\(Int(value))")
                    .foregroundColor(.white)
                    .font(.system(size: 12, weight: .heavy))
                    .padding(.leading, 2)
            }
            .fixedSize(horizontal: true, vertical: false)
        }
        .fixedSize(horizontal: true, vertical: false)
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(Color(hex: 0x1E1E1E))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
        .padding(8)
    }
}

struct DoughnutTooltipWrapper<Content: View>: View {
    let content: Content
    let containerSize: CGSize
    let proposedPosition: CGPoint

    @State private var tooltipSize: CGSize = .zero

    var body: some View {
        content
            .background(
                GeometryReader { proxy in
                    Color.clear
                        .onAppear {
                            tooltipSize = proxy.size
                        }
                        .onChange(of: proxy.size) { newSize in
                            tooltipSize = newSize
                        }
                }
            )
            .position(adjustedPosition)
    }

    private var adjustedPosition: CGPoint {
        var pos = proposedPosition
        let halfWidth = tooltipSize.width / 2
        let halfHeight = tooltipSize.height / 2

        if pos.x - halfWidth < 0 {
            pos.x = halfWidth
        }
        if pos.x + halfWidth > containerSize.width {
            pos.x = containerSize.width - halfWidth
        }
        if pos.y - halfHeight < 0 {
            pos.y = halfHeight
        }
        if pos.y + halfHeight > containerSize.height {
            pos.y = containerSize.height - halfHeight
        }
        return pos
    }
}
