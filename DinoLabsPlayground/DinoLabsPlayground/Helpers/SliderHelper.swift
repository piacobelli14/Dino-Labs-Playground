//
//  SliderHelper.swift
//
//  Created on 2/21/25.
//

import SwiftUI

struct Slider: View {
    @Binding var value: Double
    var range: ClosedRange<Double>
    var step: Double
    var sliderWidth: CGFloat
    var sliderHeight: CGFloat
    var thumbSize: CGFloat
    var activeColor: Color
    var inactiveColor: Color
    var thumbColor: Color
    var textColor: Color
    var fontSize: CGFloat
    var fontWeight: Font.Weight
    var textFormatter: (Double) -> String
    var showText: Bool
    var animationDuration: Double
    var animationDamping: Double
    var onEditingChanged: (Bool) -> Void
    @State private var isEditing: Bool = false
    
    init(
        value: Binding<Double>,
        range: ClosedRange<Double>,
        step: Double = 0.1,
        sliderWidth: CGFloat = 300,
        sliderHeight: CGFloat = 8,
        thumbSize: CGFloat = 20,
        activeColor: Color = .purple,
        inactiveColor: Color = Color(white: 0.3),
        thumbColor: Color = .white,
        textColor: Color = .white,
        fontSize: CGFloat = 14,
        fontWeight: Font.Weight = .medium,
        textFormatter: @escaping (Double) -> String = { "\(Int($0 * 100))%" },
        showText: Bool = true,
        animationDuration: Double = 0.2,
        animationDamping: Double = 0.7,
        onEditingChanged: @escaping (Bool) -> Void = { _ in }
    ) {
        self._value = value
        self.range = range
        self.step = step
        self.sliderWidth = sliderWidth
        self.sliderHeight = sliderHeight
        self.thumbSize = thumbSize
        self.activeColor = activeColor
        self.inactiveColor = inactiveColor
        self.thumbColor = thumbColor
        self.textColor = textColor
        self.fontSize = fontSize
        self.fontWeight = fontWeight
        self.textFormatter = textFormatter
        self.showText = showText
        self.animationDuration = animationDuration
        self.animationDamping = animationDamping
        self.onEditingChanged = onEditingChanged
    }
    
    var body: some View {
        HStack {
            HStack {
                GeometryReader { geometry in
                    let trackWidth = sliderWidth
                    let ratio = CGFloat((value - range.lowerBound) / (range.upperBound - range.lowerBound))
                    let xPos = showText ? ratio * sliderWidth * 0.6 : ratio * sliderWidth
                    
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(inactiveColor)
                            .frame(width: showText ? sliderWidth * 0.6 : sliderWidth, height: sliderHeight)
                        
                        Capsule()
                            .fill(activeColor)
                            .frame(width: xPos, height: sliderHeight)
                        
                        RoundedRectangle(cornerRadius: 6)
                            .fill(thumbColor)
                            .frame(width: thumbSize, height: thumbSize)
                            .offset(x: max(0, min(xPos - thumbSize / 2, trackWidth - thumbSize)))
                            .gesture(
                                DragGesture()
                                    .onChanged { gesture in
                                        if !isEditing {
                                            isEditing = true
                                            onEditingChanged(true)
                                        }
                                        let newX = gesture.location.x
                                        var newValue = Double(newX / trackWidth) * (range.upperBound - range.lowerBound) + range.lowerBound
                                        newValue = (newValue / step).rounded() * step
                                        newValue = min(max(newValue, range.lowerBound), range.upperBound)
                                        withAnimation(.spring(response: animationDuration, dampingFraction: animationDamping)) {
                                            self.value = newValue
                                        }
                                    }
                                    .onEnded { _ in
                                        isEditing = false
                                        onEditingChanged(false)
                                    }
                            )
                            .onHover { hovering in
                                if hovering {
                                    NSCursor.pointingHand.push()
                                } else {
                                    NSCursor.pop()
                                }
                            }
                    }
                    .frame(width: showText ? sliderWidth * 0.6 : sliderWidth, height: thumbSize)
                }
                .frame(width: showText ? sliderWidth * 0.6 : sliderWidth, height: thumbSize)
            }
            .frame(width: showText ? sliderWidth * 0.6 : sliderWidth)
            
            
            if showText {
                Spacer()
                Text(textFormatter(value))
                    .foregroundColor(textColor)
                    .font(.system(size: fontSize, weight: fontWeight))
                    .animation(.none, value: value)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(width: sliderWidth * 0.3, alignment: .leading)
            }
        }
        .frame(maxWidth: sliderWidth)
    }
}
