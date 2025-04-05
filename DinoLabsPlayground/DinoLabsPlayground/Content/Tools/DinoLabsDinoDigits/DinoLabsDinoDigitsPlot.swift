//
//  DinoLabsDinoDigitsPlot.swift
//
//  Created by Peter Iacobelli on 3/30/25.
//

import SwiftUI
import AppKit

struct GraphFormula: Identifiable {
    let id = UUID()
    var text: String
    var color: Color
    var isHidden: Bool = false
    var mode: String
}

struct GraphVariable: Identifiable {
    let id = UUID()
    var name: String
    var value: Double
}

struct GraphIntercept: Identifiable {
    let id = UUID()
    let x: Double
    let y: Double
    let formulaColor: Color
}

struct GraphView: View {
    var formulas: [GraphFormula]
    var variables: [GraphVariable]
    @Binding var intercepts: [GraphIntercept]
    @State private var mathMinX: Double = -10
    @State private var mathMaxX: Double = 10
    @State private var mathMinY: Double = -10
    @State private var mathMaxY: Double = 10
    @State private var initialMathMinX: Double = -10
    @State private var initialMathMaxX: Double = 10
    @State private var initialMathMinY: Double = -10
    @State private var initialMathMaxY: Double = 10
    @State private var accumulatedScale: CGFloat = 1.0

    private func formatTickValue(_ value: Double, tickStep: Double) -> String {
        if abs(value) >= 10000 || (abs(value) > 0 && abs(value) < 0.001) {
            return String(format: "%.2e", value)
        }
        let absStep = abs(tickStep)
        switch absStep {
        case 0..<0.001:
            return String(format: "%.5f", value)
        case 0..<0.01:
            return String(format: "%.4f", value)
        case 0..<0.1:
            return String(format: "%.3f", value)
        case 0..<1:
            return String(format: "%.2f", value)
        case 0..<10:
            return String(format: "%.1f", value)
        default:
            return String(format: "%.0f", value)
        }
    }

    private func findIntercepts() {
        var foundIntercepts: [GraphIntercept] = []
        let sampleCount = 400
        let extendedMargin = (mathMaxX - mathMinX) * 0.1
        let extendedMinX = mathMinX - extendedMargin
        let extendedMaxX = mathMaxX + extendedMargin
        
        func computeFinalValues(_ formula: GraphFormula,
                                _ expression: NSExpression,
                                fromX: Double,
                                toX: Double,
                                count: Int,
                                vars: [GraphVariable]) -> [Double] {
            var functionValues = [Double](repeating: 0.0, count: count + 1)
            let dx = (toX - fromX) / Double(count)
            
            for i in 0...count {
                let xVal = fromX + Double(i) * dx
                var valueDict: [String: Any] = ["x": NSNumber(value: xVal)]
                for variable in vars {
                    valueDict[variable.name] = NSNumber(value: variable.value)
                }
                if let numberVal = try? expression.expressionValue(with: valueDict, context: nil) as? NSNumber {
                    functionValues[i] = numberVal.doubleValue
                } else {
                    functionValues[i] = Double.nan
                }
            }
            
            if formula.mode == "derv" {
                var dervValues = [Double](repeating: 0.0, count: count + 1)
                if count >= 1 {
                    dervValues[0] = (functionValues[1] - functionValues[0]) / dx
                    dervValues[count] = (functionValues[count] - functionValues[count - 1]) / dx
                }
                for i in 1..<count {
                    let rise = functionValues[i + 1] - functionValues[i - 1]
                    dervValues[i] = rise / (2.0 * dx)
                }
                return dervValues
            } else if formula.mode == "integ" {
                var integValues = [Double](repeating: 0.0, count: count + 1)
                for i in 1...count {
                    if functionValues[i - 1].isFinite {
                        integValues[i] = integValues[i - 1] + functionValues[i - 1] * dx
                    } else {
                        integValues[i] = integValues[i - 1]
                    }
                }
                if fromX <= 0 && toX >= 0 {
                    let i0 = (0...count).min(by: { abs(fromX + Double($0)*dx) < abs(fromX + Double($1)*dx) }) ?? 0
                    let offset = integValues[i0]
                    return integValues.map { $0 - offset }
                }
                return integValues
            }
            
            return functionValues
        }
        
        for i in 0..<formulas.count where !formulas[i].isHidden {
            guard let parsed1 = parseFormula(formulas[i].text) else { continue }
            let expr1 = prepareExpressionPart(parsed1.expression)
            guard let nsExpression1 = createExpressionSafely(expr1) else { continue }
            guard isValidExpression(expr1, variables: variables) else { continue }
            guard extractMissingVariables(from: formulas[i].text, variables: variables).isEmpty else { continue }
            
            let finalValues1 = computeFinalValues(formulas[i],
                                                  nsExpression1,
                                                  fromX: extendedMinX,
                                                  toX: extendedMaxX,
                                                  count: sampleCount,
                                                  vars: variables)
            let dx = (extendedMaxX - extendedMinX) / Double(sampleCount)
            for j in 0..<formulas.count where !formulas[j].isHidden && i != j {
                guard let parsed2 = parseFormula(formulas[j].text) else { continue }
                let expr2 = prepareExpressionPart(parsed2.expression)
                guard let nsExpression2 = createExpressionSafely(expr2) else { continue }
                guard isValidExpression(expr2, variables: variables) else { continue }
                guard extractMissingVariables(from: formulas[j].text, variables: variables).isEmpty else { continue }
                
                let finalValues2 = computeFinalValues(formulas[j],
                                                      nsExpression2,
                                                      fromX: extendedMinX,
                                                      toX: extendedMaxX,
                                                      count: sampleCount,
                                                      vars: variables)
                
                var previousY1: Double? = nil
                var previousY2: Double? = nil
                var previousX: Double? = nil
                var xVal = extendedMinX
                
                for k in 0...sampleCount {
                    let y1 = finalValues1[k]
                    let y2 = finalValues2[k]
                    if y1.isFinite && y2.isFinite {
                        if let prevY1 = previousY1, let prevY2 = previousY2, let pX = previousX {
                            if (prevY1 > prevY2 && y1 <= y2) || (prevY1 < prevY2 && y1 >= y2) || (prevY1 == prevY2 && y1 == y2) {
                                let diffY1 = y1 - prevY1
                                let diffY2 = y2 - prevY2
                                if diffY1 != diffY2 {
                                    let t = (prevY2 - prevY1) / (diffY1 - diffY2)
                                    if t.isFinite && t >= 0 && t <= 1 {
                                        let interceptX = pX + t * dx
                                        let interceptY = prevY1 + t * diffY1
                                        if interceptX >= mathMinX - extendedMargin && interceptX <= mathMaxX + extendedMargin {
                                            foundIntercepts.append(GraphIntercept(x: interceptX, y: interceptY, formulaColor: formulas[i].color))
                                            foundIntercepts.append(GraphIntercept(x: interceptX, y: interceptY, formulaColor: formulas[j].color))
                                        }
                                    }
                                }
                            }
                        }
                        previousY1 = y1
                        previousY2 = y2
                        previousX = xVal
                    }
                    xVal += dx
                }
            }
            
            var prevX2: Double? = nil
            var prevY2: Double? = nil
            var xVal2 = extendedMinX
            
            for k in 0...sampleCount {
                let yValue = finalValues1[k]
                if yValue.isFinite {
                    if let pX2 = prevX2, let pY2 = prevY2 {
                        if pY2 == 0, foundIntercepts.last?.x != pX2 {
                            foundIntercepts.append(GraphIntercept(x: pX2, y: 0, formulaColor: formulas[i].color))
                        }
                        if (pY2 > 0 && yValue < 0) || (pY2 < 0 && yValue > 0) || yValue == 0 {
                            let t = pY2 / (pY2 - yValue)
                            let interceptX = pX2 + t * (xVal2 - pX2)
                            foundIntercepts.append(GraphIntercept(x: interceptX, y: 0, formulaColor: formulas[i].color))
                        }
                    }
                    prevX2 = xVal2
                    prevY2 = yValue
                }
                xVal2 += dx
            }
            
            if extendedMinX <= 0 && 0 <= extendedMaxX {
                var valueDict: [String: Any] = ["x": NSNumber(value: 0)]
                for variable in variables {
                    valueDict[variable.name] = NSNumber(value: variable.value)
                }
                
                let zeroIndex = Int(round((0 - extendedMinX)/dx))
                if zeroIndex >= 0 && zeroIndex < finalValues1.count {
                    let yAtZero = finalValues1[zeroIndex]
                    if yAtZero.isFinite {
                        foundIntercepts.append(GraphIntercept(x: 0, y: yAtZero, formulaColor: formulas[i].color))
                    }
                }
            }
        }
        
        var uniqueIntercepts: [GraphIntercept] = []
        for intercept in foundIntercepts {
            if !uniqueIntercepts.contains(where: { abs($0.x - intercept.x) < 1e-6 && abs($0.y - intercept.y) < 1e-6 }) {
                uniqueIntercepts.append(intercept)
            }
        }
        intercepts = uniqueIntercepts
    }

    private func zoomGraph(isZoomIn: Bool) {
        let centerX = (mathMinX + mathMaxX) / 2
        let centerY = (mathMinY + mathMaxY) / 2
        let currentRangeX = mathMaxX - mathMinX
        let currentRangeY = mathMaxY - mathMinY
        let zoomFactor = isZoomIn ? 0.9 : 1.1
        let newRangeX = currentRangeX * zoomFactor
        let newRangeY = currentRangeY * zoomFactor
        mathMinX = centerX - newRangeX / 2
        mathMaxX = centerX + newRangeX / 2
        mathMinY = centerY - newRangeY / 2
        mathMaxY = centerY + newRangeY / 2
        initialMathMinX = mathMinX
        initialMathMaxX = mathMaxX
        initialMathMinY = mathMinY
        initialMathMaxY = mathMaxY
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Canvas { context, size in
                    let gridMinX = mathMinX
                    let gridMaxX = mathMaxX
                    let gridMinY = mathMinY
                    let gridMaxY = mathMaxY
                    context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(.white))
                    
                    func transform(_ x: Double, _ y: Double, in size: CGSize) -> CGPoint {
                        let px = CGFloat((x - gridMinX) / (gridMaxX - gridMinX)) * size.width
                        let py = size.height - CGFloat((y - gridMinY) / (gridMaxY - gridMinY)) * size.height
                        return CGPoint(x: px, y: py)
                    }
                    
                    func niceTickStep(range: Double) -> Double {
                        let roughStep = range / 10.0
                        let exponent = floor(log10(roughStep))
                        let fraction = roughStep / pow(10, exponent)
                        let niceFraction: Double = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10
                        return niceFraction * pow(10, exponent)
                    }
                    
                    let tickStepX = niceTickStep(range: gridMaxX - gridMinX)
                    let tickStepY = niceTickStep(range: gridMaxY - gridMinY)
                    var gridPath = Path()
                    let lineColor = Color.gray.opacity(0.5)
                    var xTick = ceil(gridMinX / tickStepX) * tickStepX
                    while xTick <= gridMaxX {
                        let start = transform(xTick, gridMinY, in: size)
                        let end = transform(xTick, gridMaxY, in: size)
                        gridPath.move(to: start)
                        gridPath.addLine(to: end)
                        xTick += tickStepX
                    }
                    var yTick = ceil(gridMinY / tickStepY) * tickStepY
                    while yTick <= gridMaxY {
                        let start = transform(gridMinX, yTick, in: size)
                        let end = transform(gridMaxX, yTick, in: size)
                        gridPath.move(to: start)
                        gridPath.addLine(to: end)
                        yTick += tickStepY
                    }
                    context.stroke(gridPath, with: .color(lineColor), lineWidth: 1)
                    var axisPath = Path()
                    if gridMinY <= 0 && gridMaxY >= 0 {
                        let start = transform(gridMinX, 0, in: size)
                        let end = transform(gridMaxX, 0, in: size)
                        axisPath.move(to: start)
                        axisPath.addLine(to: end)
                    }
                    if gridMinX <= 0 && gridMaxX >= 0 {
                        let start = transform(0, gridMinY, in: size)
                        let end = transform(0, gridMaxY, in: size)
                        axisPath.move(to: start)
                        axisPath.addLine(to: end)
                    }
                    context.stroke(axisPath, with: .color(.black), lineWidth: 2)
                    
                    func drawLabel(_ text: String, at point: CGPoint, anchor: UnitPoint) {
                        let backgroundRect = CGRect(x: point.x - 12, y: point.y - 9, width: 24, height: 18)
                        context.fill(Path(backgroundRect), with: .color(.white))
                        context.draw(Text(text).font(.caption).foregroundColor(.black), at: point, anchor: anchor)
                    }
                    
                    if gridMinY <= 0 && gridMaxY >= 0 {
                        let axisY = transform(0, 0, in: size).y
                        let desiredSpacingX: CGFloat = 60
                        let deviceSpacingX = CGFloat(tickStepX / (gridMaxX - gridMinX)) * size.width
                        let labelStepX = tickStepX * ceil(desiredSpacingX / deviceSpacingX)
                        var xTick2 = ceil(gridMinX / labelStepX) * labelStepX
                        while xTick2 <= gridMaxX {
                            let xPos = transform(xTick2, 0, in: size).x
                            var tickPath = Path()
                            tickPath.move(to: CGPoint(x: xPos, y: axisY - 4))
                            tickPath.addLine(to: CGPoint(x: xPos, y: axisY + 4))
                            context.stroke(tickPath, with: .color(.black), lineWidth: 2)
                            drawLabel(formatTickValue(xTick2, tickStep: labelStepX), at: CGPoint(x: xPos, y: axisY + 15), anchor: .center)
                            xTick2 += labelStepX
                        }
                    }
                    
                    if gridMinX <= 0 && gridMaxX >= 0 {
                        let axisX = transform(0, gridMinY, in: size).x
                        let desiredSpacingY: CGFloat = 40
                        let deviceSpacingY = CGFloat(tickStepY / (gridMaxY - gridMinY)) * size.height
                        let labelStepY = tickStepY * ceil(desiredSpacingY / deviceSpacingY)
                        var yTick2 = ceil(gridMinY / labelStepY) * labelStepY
                        while yTick2 <= gridMaxY {
                            let yPos = transform(0, yTick2, in: size).y
                            var tickPath = Path()
                            tickPath.move(to: CGPoint(x: axisX - 4, y: yPos))
                            tickPath.addLine(to: CGPoint(x: axisX + 4, y: yPos))
                            context.stroke(tickPath, with: .color(.black), lineWidth: 2)
                            let tickLabel = formatTickValue(yTick2, tickStep: labelStepY)
                            let offset = CGFloat(max(0, tickLabel.count - 3)) * 6.0
                            drawLabel(tickLabel, at: CGPoint(x: axisX - 15 - offset, y: yPos), anchor: .center)
                            yTick2 += labelStepY
                        }
                    }
                    
                    for formula in formulas where !formula.isHidden {
                        guard let parsed = parseFormula(formula.text) else { continue }
                        let preparedExpr = prepareExpressionPart(parsed.expression)
                        guard let nsExpression = createExpressionSafely(preparedExpr) else { continue }
                        guard isValidExpression(preparedExpr, variables: variables) else { continue }
                        guard extractMissingVariables(from: formula.text, variables: variables).isEmpty else { continue }
                        
                        let samples = 1000
                        let dx = (gridMaxX - gridMinX) / Double(samples)
                        
                        var functionValues = [Double](repeating: 0.0, count: samples+1)
                        var xVals = [Double](repeating: 0.0, count: samples+1)
                        
                        for i in 0...samples {
                            let xVal = gridMinX + Double(i) * dx
                            xVals[i] = xVal
                            var valueDict: [String: Any] = ["x": NSNumber(value: xVal)]
                            for variable in variables { valueDict[variable.name] = NSNumber(value: variable.value) }
                            if let numberVal = try? nsExpression.expressionValue(with: valueDict, context: nil) as? NSNumber {
                                functionValues[i] = numberVal.doubleValue
                            } else {
                                functionValues[i] = Double.nan
                            }
                        }
                        
                        let isDerv = (formula.mode == "derv")
                        let isInteg = (formula.mode == "integ")
                        
                        var finalValues = functionValues
                        
                        if isDerv {
                            var dervValues = [Double](repeating: 0.0, count: samples+1)
                            if samples >= 1 {
                                dervValues[0] = (functionValues[1] - functionValues[0]) / dx
                                dervValues[samples] = (functionValues[samples] - functionValues[samples - 1]) / dx
                            }
                            for i in 1..<samples {
                                let rise = functionValues[i+1] - functionValues[i-1]
                                dervValues[i] = rise / (2.0 * dx)
                            }
                            finalValues = dervValues
                        }
                        else if isInteg {
                            var integValues = [Double](repeating: 0.0, count: samples+1)
                            for i in 1...samples {
                                if functionValues[i-1].isFinite {
                                    integValues[i] = integValues[i-1] + functionValues[i-1] * dx
                                } else {
                                    integValues[i] = integValues[i-1]
                                }
                            }
                            if gridMinX <= 0 && gridMaxX >= 0 {
                                let i0 = xVals.enumerated().min(by: { abs($0.element) < abs($1.element) })?.offset ?? 0
                                let offset = integValues[i0]
                                integValues = integValues.map { $0 - offset }
                            }
                            finalValues = integValues
                        }
                        
                        let opToUse = (isDerv || isInteg) ? "=" : parsed.op
                        
                        switch opToUse {
                        case "=":
                            var points: [CGPoint] = []
                            for i in 0..<finalValues.count {
                                let yVal = finalValues[i]
                                if yVal.isFinite {
                                    points.append(transform(xVals[i], yVal, in: size))
                                } else {
                                    points.append(.zero)
                                }
                            }
                            var path = Path()
                            var i = 0
                            while i < points.count {
                                if points[i] == .zero && !finalValues[i].isFinite {
                                    i += 1
                                    continue
                                }
                                path.move(to: points[i])
                                i += 1
                                while i < points.count {
                                    if points[i] == .zero && !finalValues[i].isFinite {
                                        break
                                    }
                                    if abs(xVals[i] - xVals[i-1]) <= dx * 1.5 {
                                        path.addLine(to: points[i])
                                    } else {
                                        break
                                    }
                                    i += 1
                                }
                            }
                            context.stroke(path, with: .color(formula.color), lineWidth: 2)
                            
                        case "<", "<=":
                            var regionPath = Path()
                            regionPath.move(to: CGPoint(x: 0, y: size.height))
                            var i = 0
                            var pts: [CGPoint] = []
                            for i in 0..<functionValues.count {
                                let yVal = functionValues[i]
                                if yVal.isFinite {
                                    pts.append(transform(xVals[i], yVal, in: size))
                                }
                            }
                            var i2 = 0
                            while i2 < pts.count {
                                regionPath.addLine(to: pts[i2])
                                i2 += 1
                                while i2 < pts.count && abs(xVals[i2] - xVals[i2-1]) <= dx * 1.5 {
                                    regionPath.addLine(to: pts[i2])
                                    i2 += 1
                                }
                                if i2 == pts.count {
                                    regionPath.addLine(to: CGPoint(x: size.width, y: size.height))
                                } else {
                                    regionPath.addLine(to: transform(xVals[i2-1], gridMinY, in: size))
                                    regionPath.addLine(to: transform(xVals[i2], gridMinY, in: size))
                                    regionPath.addLine(to: pts[i2])
                                }
                            }
                            regionPath.closeSubpath()
                            context.fill(regionPath, with: .color(formula.color.opacity(0.3)))
                            var boundary = Path()
                            i2 = 0
                            while i2 < pts.count {
                                boundary.move(to: pts[i2])
                                i2 += 1
                                while i2 < pts.count && abs(xVals[i2] - xVals[i2-1]) <= dx * 1.5 {
                                    boundary.addLine(to: pts[i2])
                                    i2 += 1
                                }
                            }
                            context.stroke(boundary, with: .color(formula.color), lineWidth: 2)
                            
                        case ">", ">=":
                            var regionPath = Path()
                            regionPath.move(to: CGPoint(x: 0, y: 0))
                            var i = 0
                            var pts: [CGPoint] = []
                            for i in 0..<functionValues.count {
                                let yVal = functionValues[i]
                                if yVal.isFinite {
                                    pts.append(transform(xVals[i], yVal, in: size))
                                }
                            }
                            var i3 = 0
                            while i3 < pts.count {
                                regionPath.addLine(to: pts[i3])
                                i3 += 1
                                while i3 < pts.count && abs(xVals[i3] - xVals[i3-1]) <= dx * 1.5 {
                                    regionPath.addLine(to: pts[i3])
                                    i3 += 1
                                }
                                if i3 == pts.count {
                                    regionPath.addLine(to: CGPoint(x: size.width, y: 0))
                                } else {
                                    regionPath.addLine(to: transform(xVals[i3-1], gridMaxY, in: size))
                                    regionPath.addLine(to: transform(xVals[i3], gridMaxY, in: size))
                                    regionPath.addLine(to: pts[i3])
                                }
                            }
                            regionPath.closeSubpath()
                            context.fill(regionPath, with: .color(formula.color.opacity(0.3)))
                            var boundary = Path()
                            i3 = 0
                            while i3 < pts.count {
                                boundary.move(to: pts[i3])
                                i3 += 1
                                while i3 < pts.count && abs(xVals[i3] - xVals[i3-1]) <= dx * 1.5 {
                                    boundary.addLine(to: pts[i3])
                                    i3 += 1
                                }
                            }
                            context.stroke(boundary, with: .color(formula.color), lineWidth: 2)
                            
                        default:
                            break
                        }
                    }
                    
                    for intercept in intercepts {
                        let interceptPoint = transform(intercept.x, intercept.y, in: size)
                        let markerPath = Path(ellipseIn: CGRect(x: interceptPoint.x - 4, y: interceptPoint.y - 4, width: 8, height: 8))
                        context.fill(markerPath, with: .color(intercept.formulaColor))
                        let coordText = String(format: "(%.2f, %.2f)", intercept.x, intercept.y)
                        let font = NSFont.systemFont(ofSize: 14, weight: .heavy)
                        let attributes: [NSAttributedString.Key: Any] = [.font: font]
                        let textSize = (coordText as NSString).size(withAttributes: attributes)
                        let padding: CGFloat = 3
                        let textPosition = CGPoint(x: interceptPoint.x, y: interceptPoint.y - 10)
                        let backgroundRect = CGRect(x: textPosition.x - textSize.width/2 - padding, y: textPosition.y - textSize.height/2 - padding, width: textSize.width + 2*padding, height: textSize.height + 2*padding)
                        let cornerRadius: CGFloat = 4
                        let roundedRectPath = Path(roundedRect: backgroundRect, cornerRadius: cornerRadius)
                        context.fill(roundedRectPath, with: .color(Color(hex: 0xe6e6e6).opacity(0.9)))
                        context.stroke(roundedRectPath, with: .color(Color(hex: 0x222222)), lineWidth: 1.0)
                        context.draw(Text(coordText).font(.caption2).foregroundColor(.black), at: textPosition, anchor: .center)
                    }
                }
                .gesture(
                    MagnificationGesture()
                        .onChanged { value in
                            accumulatedScale *= value.magnitude
                            let threshold: CGFloat = 3.0
                            if accumulatedScale >= threshold {
                                zoomGraph(isZoomIn: true)
                                accumulatedScale = 1.0
                            } else if accumulatedScale <= (1.0 / threshold) {
                                zoomGraph(isZoomIn: false)
                                accumulatedScale = 1.0
                            }
                        }
                        .onEnded { _ in
                            accumulatedScale = 1.0
                        }
                )
                .overlay(
                    VStack(spacing: 10) {
                        HStack {
                            Image(systemName: "plus.magnifyingglass")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(Color(hex: 0x222222))
                        }
                        .frame(height: 30)
                        .padding(.horizontal, 8)
                        .containerHelper(backgroundColor: Color(hex: 0xe6e6e6), borderColor: Color(hex: 0x222222), borderWidth: 0.5, topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4, shadowColor: Color.black, shadowRadius: 2, shadowX: 0, shadowY: 0)
                        .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                        .onTapGesture {
                            zoomGraph(isZoomIn: true)
                        }
                        HStack {
                            Image(systemName: "minus.magnifyingglass")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(Color(hex: 0x222222))
                        }
                        .frame(height: 30)
                        .padding(.horizontal, 8)
                        .containerHelper(backgroundColor: Color(hex: 0xe6e6e6), borderColor: Color(hex: 0x222222), borderWidth: 0.5, topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4, shadowColor: Color.black, shadowRadius: 2, shadowX: 0, shadowY: 0)
                        .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                        .onTapGesture {
                            zoomGraph(isZoomIn: false)
                        }
                    }
                    .padding(8),
                    alignment: .topTrailing
                )
                .overlay(
                    HStack {
                        Image(systemName: "point.3.connected.trianglepath.dotted")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(hex: 0x222222))
                            .padding(.trailing, 6)
                        Text("Find Intercepts")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(hex: 0x222222))
                    }
                    .frame(height: 30)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color(hex: 0xe6e6e6), borderColor: Color(hex: 0x222222), borderWidth: 0.5, topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4, shadowColor: Color.black, shadowRadius: 2, shadowX: 0, shadowY: 0)
                    .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                    .onTapGesture { findIntercepts() }
                    .padding(8),
                    alignment: .bottomTrailing
                )
            }
        }
    }
}

private func prefixForMode(_ mode: String) -> String {
    switch mode {
    case "derv":
        return "y' = "
    case "integ":
        return "∫y = "
    default:
        return "y = "
    }
}

struct DinoLabsDinoDigitsPlot: View {
    let geometry: GeometryProxy
    @Binding var leftPanelWidthRatio: CGFloat
    private func randomColor() -> Color {
        let red = Double.random(in: 0...1)
        let green = Double.random(in: 0...1)
        let blue = Double.random(in: 0...1)
        return Color(red: red, green: green, blue: blue)
    }
    @State private var formulas: [GraphFormula] = []
    @State private var variables: [GraphVariable] = []
    @State private var intercepts: [GraphIntercept] = []
    @State private var isKeyboardView: Bool = false
    @State private var isFunctionMode: String = "fx"
    private func insertText(_ text: String) {
        if !formulas.isEmpty {
            formulas[formulas.count - 1].text += text
        }
    }
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        ToolButtonMain {
                            formulas.append(
                                GraphFormula(
                                    text: prefixForMode(isFunctionMode),
                                    color: randomColor(),
                                    isHidden: false,
                                    mode: isFunctionMode
                                )
                            )
                        }
                        .frame(width: 18, height: 18)
                        .overlay(
                            Image(systemName: "plus.square.fill")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                .allowsHitTesting(false)
                        )
                        Spacer()
                        HStack(spacing: 12) {
                            Text("f(x)")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(isFunctionMode == "fx" ? 1.0 : 0.6))
                                .underline(isFunctionMode == "fx" ? true : false)
                                .onTapGesture(perform: {
                                    isFunctionMode = "fx"
                                })
                                .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                            Text("d/dx")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(isFunctionMode == "derv" ? 1.0 : 0.6))
                                .underline(isFunctionMode == "derv" ? true : false)
                                .onTapGesture(perform: {
                                    isFunctionMode = "derv"
                                })
                                .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                            Text("∫f")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(isFunctionMode == "integ" ? 1.0 : 0.6))
                                .underline(isFunctionMode == "integ" ? true : false)
                                .onTapGesture(perform: {
                                    isFunctionMode = "integ"
                                })
                                .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                        }
                        .padding(.horizontal, 12)
                        
                    }
                    .padding(.horizontal, 10)
                    .frame(height: 40)
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                    .containerHelper(backgroundColor: Color(hex: 0x414141), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                    ScrollView {
                        VStack(spacing: 0) {
                            ForEach($formulas) { $formula in
                                let missingVars = extractMissingVariables(from: formula.text, variables: variables)
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: 0) {
                                        HStack(spacing: 0) {
                                            Spacer()
                                            ZStack {
                                                RoundedRectangle(cornerRadius: 6)
                                                    .fill(formula.color)
                                                    .hoverEffect(opacity: 0.6, cursor: .pointingHand)
                                                if formula.isHidden {
                                                    Path { path in
                                                        let rectWidth = (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.1
                                                        let rectHeight: CGFloat = 20
                                                        path.move(to: CGPoint(x: 0, y: 0))
                                                        path.addLine(to: CGPoint(x: rectWidth, y: rectHeight))
                                                    }
                                                    .stroke(Color(hex: 0xc1c1c1), style: StrokeStyle(lineWidth: 2, lineCap: .round))
                                                }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.1, height: 20)
                                            .onTapGesture {
                                                formula.isHidden.toggle()
                                            }
                                            Spacer()
                                        }
                                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.2,
                                               height: !missingVars.isEmpty ? 80 : 50)
                                        .containerHelper(
                                            backgroundColor: Color(hex: 0xc1c1c1),
                                            borderColor: Color.clear, borderWidth: 0,
                                            topLeft: 4, topRight: 0, bottomLeft: 4, bottomRight: 0,
                                            shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                                        )
                                        HStack(spacing: 0) {
                                            VStack(spacing: 0) {
                                                HStack(spacing: 0) {
                                                    ScrollView(.horizontal, showsIndicators: false) {
                                                        ToolTextField(placeholder: "Enter new formula...", text: $formula.text, isSecure: false, textSize: 11)
                                                            .onChange(of: formula.text) { newValue in
                                                                let prefix = prefixForMode(formula.mode)
                                                                let requiredPrefixCount = prefix.count
                                                                
                                                                if !newValue.hasPrefix(prefix) {
                                                                    DispatchQueue.main.async {
                                                                        formula.text = prefix
                                                                    }
                                                                    return
                                                                }
                                                                
                                                                if newValue.count < requiredPrefixCount {
                                                                    DispatchQueue.main.async {
                                                                        formula.text = prefix
                                                                    }
                                                                    return
                                                                }
                                                                
                                                                if newValue.prefix(requiredPrefixCount * 2) == prefix + prefix {
                                                                    DispatchQueue.main.async {
                                                                        formula.text = prefix + String(newValue.dropFirst(requiredPrefixCount))
                                                                    }
                                                                    return
                                                                }
                                                                
                                                                intercepts = []
                                                            }
                                                            .lineLimit(1)
                                                            .truncationMode(.tail)
                                                            .textFieldStyle(PlainTextFieldStyle())
                                                            .foregroundColor(.black)
                                                            .font(.system(size: 12, weight: .heavy))
                                                            .padding(.horizontal, 10)
                                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, height: 32)
                                                            .containerHelper(
                                                                backgroundColor: Color(hex: 0xf5f5f5),
                                                                borderColor: Color.clear, borderWidth: 1,
                                                                topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4,
                                                                shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                                                            )
                                                            .hoverEffect(opacity: 0.8)
                                                    }
                                                }
                                                .containerHelper(
                                                    backgroundColor: Color(hex: 0xf5f5f5),
                                                    borderColor: Color.clear, borderWidth: 1,
                                                    topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4,
                                                    shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                                                )
                                                .hoverEffect(opacity: 0.8)
                                                if !missingVars.isEmpty {
                                                    ScrollView(.horizontal, showsIndicators: false) {
                                                        HStack {
                                                            Text("add slider:")
                                                                .font(.system(size: 9, weight: .semibold).italic())
                                                                .foregroundColor(Color(hex: 0x222222))
                                                            HStack(alignment: .center) {
                                                                ForEach(missingVars, id: \.self) { varName in
                                                                    ToolButtonMain {
                                                                        if !variables.contains(where: { $0.name.lowercased() == varName.lowercased() }) {
                                                                            variables.append(GraphVariable(name: varName, value: 0.0))
                                                                        }
                                                                    }
                                                                    .containerHelper(backgroundColor: Color(hex: 0x8B4AFC), borderColor: Color.clear, borderWidth: 0, topLeft: 5, topRight: 5, bottomLeft: 5, bottomRight: 5, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                                                    .frame(width: 20, height: 20)
                                                                    .overlay(
                                                                        Text("\(varName)")
                                                                            .font(.system(size: 9, weight: .semibold).italic())
                                                                            .foregroundColor(Color(hex: 0xf5f5f5))
                                                                    )
                                                                }
                                                                ToolButtonMain {
                                                                    for mv in missingVars {
                                                                        if !variables.contains(where: { $0.name.lowercased() == mv.lowercased() }) {
                                                                            variables.append(GraphVariable(name: mv, value: 0.0))
                                                                        }
                                                                    }
                                                                }
                                                                .containerHelper(backgroundColor: Color(hex: 0x9F74EA), borderColor: Color.clear, borderWidth: 0, topLeft: 5, topRight: 5, bottomLeft: 5, bottomRight: 5, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                                                .frame(width: 20, height: 20)
                                                                .overlay(
                                                                    Text("all")
                                                                        .font(.system(size: 9, weight: .semibold).italic())
                                                                        .foregroundColor(Color(hex: 0xf5f5f5))
                                                                )
                                                            }
                                                            .frame(height: 32)
                                                        }
                                                    }
                                                    .padding(.horizontal, 8)
                                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, height: 32)
                                                }
                                            }
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                                   height: !missingVars.isEmpty ? 80 : 50)
                                        }
                                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                               height: !missingVars.isEmpty ? 80 : 50)
                                        Spacer()
                                    }
                                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3,
                                           height: !missingVars.isEmpty ? 80 : 50)
                                    .overlay(
                                        Image(systemName: "xmark")
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundColor(.gray)
                                            .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                                            .onTapGesture {
                                                if let index = formulas.firstIndex(where: { $0.id == formula.id }) {
                                                    formulas.remove(at: index)
                                                }
                                                intercepts = []
                                            }
                                            .frame(width: 16, height: 16)
                                            .padding(4),
                                        alignment: .topTrailing
                                    )
                                }
                                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3,
                                       height: !missingVars.isEmpty ? 80 : 50)
                                .containerHelper(
                                    backgroundColor: Color(hex: 0xf5f5f5),
                                    borderColor: Color(hex: 0xc1c1c1), borderWidth: 3,
                                    topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2,
                                    shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                                )
                            }
                            
                            ForEach($variables) { $variable in
                                HStack {
                                    VStack {
                                        HStack {
                                            Text("\(variable.name):")
                                                .font(.system(size: 12, weight: .semibold).italic())
                                                .foregroundColor(Color(hex: 0x222222).opacity(0.8))
                                            Text("\(variable.value, specifier: "%.1f")")
                                                .font(.system(size: 12, weight: .heavy))
                                                .foregroundColor(Color(hex: 0x222222))
                                            Spacer()
                                        }
                                        .padding(.horizontal, 20)
                                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                                        Slider(
                                            value: $variable.value,
                                            range: -10...10,
                                            step: 0.1,
                                            sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                            sliderHeight: 8,
                                            thumbSize: 12,
                                            activeColor: .purple,
                                            inactiveColor: Color(white: 0.3),
                                            thumbColor: Color(hex: 0x222222),
                                            showText: false,
                                            animationDuration: 0.2,
                                            animationDamping: 0.7
                                        )
                                        .onChange(of: variable.value) { _ in
                                            intercepts = []
                                        }
                                    }
                                }
                                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3, height: 70)
                                .containerHelper(
                                    backgroundColor: Color(hex: 0xe6e6e6),
                                    borderColor: Color(hex: 0xc1c1c1), borderWidth: 3,
                                    topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2,
                                    shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                                )
                                .overlay(
                                    Image(systemName: "xmark")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.gray)
                                        .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                                        .onTapGesture {
                                            if let index = variables.firstIndex(where: { $0.id == variable.id }) {
                                                variables.remove(at: index)
                                            }
                                            intercepts = []
                                        }
                                        .frame(width: 16, height: 16)
                                        .padding(4),
                                    alignment: .topTrailing
                                )
                            }
                        }
                        Spacer()
                    }
                }
                .background(Color(hex: 0xf5f5f5))
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                .frame(maxHeight: .infinity)
                .overlay(
                    HStack {
                        Image(systemName: "keyboard.badge.eye")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(Color(hex: 0x222222))
                            .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                    }
                    .frame(width: 40, height: 30)
                    .containerHelper(
                        backgroundColor: Color(hex: 0xe6e6e6),
                        borderColor: Color(hex: 0x222222), borderWidth: 0.5,
                        topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4,
                        shadowColor: Color.black, shadowRadius: 2, shadowX: 0, shadowY: 0
                    )
                    .onTapGesture {
                        isKeyboardView.toggle()
                    }
                    .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                    .padding(8),
                    alignment: .bottomLeading
                )
                .overlay(
                    Rectangle()
                        .frame(width: 2.0)
                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                    alignment: .trailing
                )
                
                GraphView(formulas: formulas, variables: variables, intercepts: $intercepts)
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7)
                    .overlay(
                        Rectangle()
                            .frame(width: 4.0)
                            .foregroundColor(Color.black.opacity(1.0)),
                        alignment: .trailing
                    )
            }
            
            if isKeyboardView {
                VStack(spacing: 8) {
                    HStack {
                        VStack(spacing: 4) {
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("7") }  .basicKeyStyle("7")
                                ToolButtonMain { insertText("8") }  .basicKeyStyle("8")
                                ToolButtonMain { insertText("9") }  .basicKeyStyle("9")
                                ToolButtonMain { insertText("+") }  .opKeyStyle("+")
                                ToolButtonMain { insertText("(") }  .opKeyStyle("(")
                                ToolButtonMain { insertText(")") }  .opKeyStyle(")")
                                ToolButtonMain { insertText("sqrt(") } .fnKeyStyle("sqrt")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("4") }  .basicKeyStyle("4")
                                ToolButtonMain { insertText("5") }  .basicKeyStyle("5")
                                ToolButtonMain { insertText("6") }  .basicKeyStyle("6")
                                ToolButtonMain { insertText("-") }  .opKeyStyle("-")
                                ToolButtonMain { insertText("[") }  .opKeyStyle("[")
                                ToolButtonMain { insertText("]") }  .opKeyStyle("]")
                                ToolButtonMain { insertText("pow(") } .fnKeyStyle("pow")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("1") }  .basicKeyStyle("1")
                                ToolButtonMain { insertText("2") }  .basicKeyStyle("2")
                                ToolButtonMain { insertText("3") }  .basicKeyStyle("3")
                                ToolButtonMain { insertText("/") }  .opKeyStyle("/")
                                ToolButtonMain { insertText("{") }  .opKeyStyle("{")
                                ToolButtonMain { insertText("}") }  .opKeyStyle("}")
                                ToolButtonMain { insertText("log(") } .fnKeyStyle("log")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("0") }  .basicKeyStyle("0")
                                ToolButtonMain { insertText(".") }  .opKeyStyle(".")
                                ToolButtonMain { insertText("=") }  .opKeyStyle("=")
                                ToolButtonMain { insertText("*") }  .opKeyStyle("*")
                                ToolButtonMain { insertText("|") }  .opKeyStyle("|")
                                ToolButtonMain { insertText("^") }  .opKeyStyle("^")
                                ToolButtonMain { insertText("ln(") } .fnKeyStyle("ln")
                            }
                        }
                        .padding(.trailing, 20)
                        VStack(spacing: 4) {
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("sin(") } .fnKeyStyle("sin")
                                ToolButtonMain { insertText("cos(") } .fnKeyStyle("cos")
                                ToolButtonMain { insertText("tan(") } .fnKeyStyle("tan")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("sec(") } .fnKeyStyle("sec")
                                ToolButtonMain { insertText("csc(") } .fnKeyStyle("csc")
                                ToolButtonMain { insertText("cot(") } .fnKeyStyle("cot")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("asin(") } .fnKeyStyle("asin")
                                ToolButtonMain { insertText("acos(") } .fnKeyStyle("acos")
                                ToolButtonMain { insertText("atan(") } .fnKeyStyle("atan")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("asec(") } .fnKeyStyle("asec")
                                ToolButtonMain { insertText("acsc(") } .fnKeyStyle("acsc")
                                ToolButtonMain { insertText("acot(") } .fnKeyStyle("acot")
                            }
                        }
                        .padding(.trailing, 20)
                        VStack(spacing: 4) {
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("\(Double.pi)") } .fnKeyStyle("π")
                                ToolButtonMain { insertText("\(2 * Double.pi)") } .fnKeyStyle("τ")
                                ToolButtonMain { insertText("\(M_E)") } .fnKeyStyle("e")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("0.0000000000667430") } .fnKeyStyle("G")
                                ToolButtonMain { insertText("299792458") } .fnKeyStyle("c")
                                ToolButtonMain { insertText("0.000000000000000000000000000000000662607015") } .fnKeyStyle("h")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("0.00000000000000000000001380649") } .fnKeyStyle("k")
                                ToolButtonMain { insertText("0.0000000000088541878128") } .fnKeyStyle("ε0")
                                ToolButtonMain { insertText("0.00000125663706212") } .fnKeyStyle("μ0")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { insertText("602214076000000000000000") } .fnKeyStyle("NA")
                                ToolButtonMain { insertText("8.314462618") } .fnKeyStyle("R")
                                ToolButtonMain { insertText("0.000000000000000000000000000000910938356") } .fnKeyStyle("me")
                            }
                        }
                    }
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 30)
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
                .containerHelper(backgroundColor: Color(hex: 0xc6c6c6), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                .overlay(Rectangle().frame(width: 4.0).foregroundColor(Color.black.opacity(1.0)), alignment: .trailing)
            }
        }
        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio), height: (geometry.size.height - 50) * 0.9)
    }
}
