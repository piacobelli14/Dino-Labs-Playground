import SwiftUI
import AppKit

func parseFormula(_ formula: String) -> (op: String, expression: String)? {
    let trimmed = formula.trimmingCharacters(in: .whitespaces)
    guard trimmed.lowercased().hasPrefix("y") else { return nil }
    let afterY = trimmed.dropFirst().trimmingCharacters(in: .whitespaces)
    let operators = ["<=", ">=", "<", ">", "="]
    for op in operators {
        if afterY.hasPrefix(op) {
            let expression = afterY.dropFirst(op.count).trimmingCharacters(in: .whitespaces)
            return (op, expression)
        }
    }
    return nil
}

func prepareExpressionPart(_ expression: String) -> String {
    let sanitizedExpression = expression.replacingOccurrences(of: " ", with: "")
    let pattern = "([0-9])([a-zA-Z])"
    let regex = try? NSRegularExpression(pattern: pattern)
    let correctedExpression = regex?.stringByReplacingMatches(
        in: sanitizedExpression,
        range: NSRange(sanitizedExpression.startIndex..., in: sanitizedExpression),
        withTemplate: "$1*$2"
    ) ?? sanitizedExpression
    return correctedExpression
}

func extractMissingVariables(from formula: String, variables: [GraphVariable]) -> [String] {
    guard let parsed = parseFormula(formula) else { return [] }
    let correctedExpression = prepareExpressionPart(parsed.expression)
    let pattern = "[a-zA-Z]+"
    guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
    let matches = regex.matches(in: correctedExpression, range: NSRange(correctedExpression.startIndex..., in: correctedExpression))
    let rawNames = matches.compactMap { match -> String? in
        guard let range = Range(match.range, in: correctedExpression) else { return nil }
        return String(correctedExpression[range])
    }
    
    let knownWords: Set<String> = [
        "x", "y", "sin", "cos", "tan", "log", "exp", "ln", "sqrt", "pow", "abs"
    ]
    
    var results = [String]()
    for name in rawNames {
        let lower = name.lowercased()
        if !knownWords.contains(lower) {
            if !variables.contains(where: { $0.name.lowercased() == lower }) {
                if !results.contains(name) {
                    results.append(name)
                }
            }
        }
    }
    return results
}

struct GraphFormula: Identifiable {
    let id = UUID()
    var text: String
    var color: Color
}

struct GraphVariable: Identifiable {
    let id = UUID()
    var name: String
    var value: Double
}

struct GraphView: View {
    var formulas: [GraphFormula]
    var variables: [GraphVariable]
    
    var body: some View {
        GeometryReader { geo in
            Canvas { context, size in
                context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(.white))
                let scaleX = size.width / 20.0
                let scaleY = size.height / 20.0
                let lineColor = Color.gray.opacity(0.5)
                var gridPath = Path()
                for i in -10...10 {
                    let xPos = CGFloat(i + 10) * scaleX
                    gridPath.move(to: CGPoint(x: xPos, y: 0))
                    gridPath.addLine(to: CGPoint(x: xPos, y: size.height))
                    let yPos = size.height - (CGFloat(i + 10) * scaleY)
                    gridPath.move(to: CGPoint(x: 0, y: yPos))
                    gridPath.addLine(to: CGPoint(x: size.width, y: yPos))
                }
                context.stroke(gridPath, with: .color(lineColor), lineWidth: 1)
                let midX = size.width / 2
                let midY = size.height / 2
                let axisLineWidth: CGFloat = 2.0
                var axisPath = Path()
                axisPath.move(to: CGPoint(x: 0, y: midY))
                axisPath.addLine(to: CGPoint(x: size.width, y: midY))
                axisPath.move(to: CGPoint(x: midX, y: 0))
                axisPath.addLine(to: CGPoint(x: midX, y: size.height))
                context.stroke(axisPath, with: .color(.black), lineWidth: axisLineWidth)
                let tickSize: CGFloat = 4
                let labelOffset: CGFloat = 15
                func drawLabel(_ text: String, at point: CGPoint, anchor: UnitPoint) {
                    let backgroundRect = CGRect(x: point.x - 10, y: point.y - 7, width: 20, height: 14)
                    context.fill(Path(backgroundRect), with: .color(.white))
                    let labelText = Text(text).font(.caption).foregroundColor(.black)
                    context.draw(labelText, at: point, anchor: anchor)
                }
                for i in -10...10 {
                    let px = (CGFloat(i) + 10) * scaleX
                    let py = midY
                    var tickPath = Path()
                    tickPath.move(to: CGPoint(x: px, y: py - tickSize))
                    tickPath.addLine(to: CGPoint(x: px, y: py + tickSize))
                    context.stroke(tickPath, with: .color(.black), lineWidth: 2)
                    let labelPoint = CGPoint(x: px, y: py + labelOffset)
                    drawLabel("\(i)", at: labelPoint, anchor: .center)
                }
                for j in -10...10 {
                    let px = midX
                    let py = size.height - (CGFloat(j) + 10) * scaleY
                    var tickPath = Path()
                    tickPath.move(to: CGPoint(x: px - tickSize, y: py))
                    tickPath.addLine(to: CGPoint(x: px + tickSize, y: py))
                    context.stroke(tickPath, with: .color(.black), lineWidth: 2)
                    let labelPoint = CGPoint(x: px - labelOffset, y: py)
                    drawLabel("\(j)", at: labelPoint, anchor: .center)
                }
                for formula in formulas {
                    guard let parsed = parseFormula(formula.text) else { continue }
                    let op = parsed.op
                    let expressionPart = parsed.expression
                    let correctedExpression = prepareExpressionPart(expressionPart)
                    if correctedExpression.isEmpty { continue }
                    if let last = correctedExpression.last, "+-*/".contains(last) { continue }
                    if !extractMissingVariables(from: formula.text, variables: variables).isEmpty { continue }
                    let nsExpression = NSExpression(format: correctedExpression)
                    let mathMinX = -10.0
                    let mathMaxX = 10.0
                    let samples = 200
                    let dx = (mathMaxX - mathMinX) / Double(samples)
                    var points: [CGPoint] = []
                    for i in 0...samples {
                        let xVal = mathMinX + Double(i) * dx
                        var valueDict: [String: Any] = ["x": xVal]
                        for variable in variables {
                            valueDict[variable.name] = variable.value
                        }
                        if let result = nsExpression.expressionValue(with: valueDict, context: nil) as? NSNumber {
                            let yVal = result.doubleValue
                            let plotX = (xVal + 10) * scaleX
                            let plotY = size.height - ((yVal + 10) * scaleY)
                            points.append(CGPoint(x: plotX, y: plotY))
                        }
                    }
                    switch op {
                    case "=":
                        var path = Path()
                        if let first = points.first {
                            path.move(to: first)
                            for pt in points.dropFirst() {
                                path.addLine(to: pt)
                            }
                        }
                        context.stroke(path, with: .color(formula.color), lineWidth: 2)
                    case "<", "<=":
                        var regionPath = Path()
                        regionPath.move(to: CGPoint(x: 0, y: size.height))
                        for pt in points {
                            regionPath.addLine(to: pt)
                        }
                        regionPath.addLine(to: CGPoint(x: size.width, y: size.height))
                        regionPath.closeSubpath()
                        context.fill(regionPath, with: .color(formula.color.opacity(0.3)))
                        var boundary = Path()
                        if let first = points.first {
                            boundary.move(to: first)
                            for pt in points.dropFirst() {
                                boundary.addLine(to: pt)
                            }
                        }
                        context.stroke(boundary, with: .color(formula.color), lineWidth: 2)
                    case ">", ">=":
                        var regionPath = Path()
                        regionPath.move(to: CGPoint(x: 0, y: 0))
                        for pt in points {
                            regionPath.addLine(to: pt)
                        }
                        regionPath.addLine(to: CGPoint(x: size.width, y: 0))
                        regionPath.closeSubpath()
                        context.fill(regionPath, with: .color(formula.color.opacity(0.3)))
                        var boundary = Path()
                        if let first = points.first {
                            boundary.move(to: first)
                            for pt in points.dropFirst() {
                                boundary.addLine(to: pt)
                            }
                        }
                        context.stroke(boundary, with: .color(formula.color), lineWidth: 2)
                    default:
                        break
                    }
                }
            }
        }
    }
}

struct DinoLabsDinoDigits: View {
    let geometry: GeometryProxy
    @Binding var leftPanelWidthRatio: CGFloat
    @State private var formulas: [GraphFormula] = [
    ]
    @State private var variables: [GraphVariable] = [
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        ToolButtonMain {
                            formulas.append(GraphFormula(text: "", color: .red))
                        }
                        .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                        .frame(width: 18, height: 18)
                        .overlay(
                            Image(systemName: "plus.square.fill")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                .allowsHitTesting(false)
                        )
                        Spacer()
                    }
                    .padding(.horizontal, 10)
                    .frame(height: 40)
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.4)
                    .containerHelper(backgroundColor: Color(hex: 0x414141), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                    
                    ScrollView {
                        ForEach($formulas) { $formula in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    HStack {
                                        RoundedRectangle(cornerRadius: 6)
                                            .fill(formula.color)
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.08, height: 20)
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.1, height: 32)
                                    .containerHelper(
                                        backgroundColor: Color.clear,
                                        borderColor: Color.clear, borderWidth: 1,
                                        topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4,
                                        shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                                    )
                                    
                                    HStack {
                                        ToolTextField(placeholder: "Enter new formula...", text: $formula.text)
                                            .lineLimit(1)
                                            .truncationMode(.tail)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .foregroundColor(.black)
                                            .font(.system(size: 12, weight: .heavy))
                                            .padding(.horizontal, 10)
                                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.7, height: 32)
                                            .containerHelper(
                                                backgroundColor: Color(hex: 0xf5f5f5),
                                                borderColor: Color.clear, borderWidth: 1,
                                                topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4,
                                                shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                                            )
                                            .hoverEffect(opacity: 0.8)
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.4) * 0.7, height: 32)
                                    
                                    Spacer()
                                }
                                let missingVars = extractMissingVariables(from: formula.text, variables: variables)
                                if !missingVars.isEmpty {
                                    HStack {
                                        Text("add slider:")
                                            .foregroundColor(.white)
                                        ForEach(missingVars, id: \.self) { varName in
                                            Button(varName) {
                                                if !variables.contains(where: { $0.name.lowercased() == varName.lowercased() }) {
                                                    variables.append(GraphVariable(name: varName, value: 0.0))
                                                }
                                            }
                                            .foregroundColor(.blue)
                                        }
                                        Button("all") {
                                            let missingCopy = missingVars
                                            for mv in missingCopy {
                                                if !variables.contains(where: { $0.name.lowercased() == mv.lowercased() }) {
                                                    variables.append(GraphVariable(name: mv, value: 0.0))
                                                }
                                            }
                                        }
                                        .foregroundColor(.blue)
                                    }
                                }
                            }
                            .padding(.horizontal, 6)
                            .padding(.vertical, 12)
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.4)
                            .containerHelper(
                                backgroundColor: Color(hex: 0x717171),
                                borderColor: Color.clear, borderWidth: 2,
                                topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2,
                                shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                            )
                        }
                        
                        ForEach($variables) { $variable in
                            HStack {
                                TextField("Variable Name", text: $variable.name)
                                    .frame(width: 50)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                Text("\(variable.value, specifier: "%.1f")")
                                    .foregroundColor(.white)
                                Slider(value: $variable.value, range: -10...10, step: 0.1)
                            }
                        }
                    }
                    
                    Spacer()
                }
                .background(Color(white: 0.15))
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.4)
                
                GraphView(formulas: formulas, variables: variables)
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.6)
            }
        }
        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio),
               height: (geometry.size.height - 50) * 0.9)
        .containerHelper(backgroundColor: Color(hex: 0x242424),
                         borderColor: .clear, borderWidth: 0,
                         topLeft: 0, topRight: 0,
                         bottomLeft: 0, bottomRight: 0,
                         shadowColor: .clear, shadowRadius: 0,
                         shadowX: 0, shadowY: 0)
    }
}
