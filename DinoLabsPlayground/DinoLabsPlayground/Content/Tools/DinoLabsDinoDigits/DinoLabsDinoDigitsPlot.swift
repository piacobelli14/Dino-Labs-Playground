//
//  DinoLabsDinoDigitsPlot.swift
//
//  Created by Peter Iacobelli on 3/30/25.
//

import SwiftUI
import AppKit

extension NSNumber {
    @objc func sinValue() -> NSNumber {
        let result = NSNumber(value: sin(self.doubleValue))
        return result
    }
    @objc func cosValue() -> NSNumber {
        let result = NSNumber(value: cos(self.doubleValue))
        return result
    }
    @objc func tanValue() -> NSNumber {
        let result = NSNumber(value: tan(self.doubleValue))
        return result
    }
    @objc func secValue() -> NSNumber {
        let cosVal = cos(self.doubleValue)
        if abs(cosVal) < 1e-12 {
            return NSNumber(value: Double.nan)
        }
        let result = NSNumber(value: 1.0 / cosVal)
        return result
    }
    @objc func cscValue() -> NSNumber {
        let sinVal = sin(self.doubleValue)
        if abs(sinVal) < 1e-12 {
            return NSNumber(value: Double.nan)
        }
        let result = NSNumber(value: 1.0 / sinVal)
        return result
    }
    @objc func cotValue() -> NSNumber {
        let tanVal = tan(self.doubleValue)
        if abs(tanVal) < 1e-12 {
            return NSNumber(value: Double.nan)
        }
        let result = NSNumber(value: 1.0 / tanVal)
        return result
    }
    @objc func asinValue() -> NSNumber {
        let value = self.doubleValue
        if value < -1 || value > 1 {
            return NSNumber(value: Double.nan)
        }
        let result = NSNumber(value: asin(value))
        return result
    }
    @objc func acosValue() -> NSNumber {
        let value = self.doubleValue
        if value < -1 || value > 1 {
            return NSNumber(value: Double.nan)
        }
        let result = NSNumber(value: acos(value))
        return result
    }
    @objc func atanValue() -> NSNumber {
        let result = NSNumber(value: atan(self.doubleValue))
        return result
    }
    @objc func asecValue() -> NSNumber {
        let value = self.doubleValue
        if abs(value) < 1 {
            return NSNumber(value: Double.nan)
        }
        let result = NSNumber(value: acos(1.0 / value))
        return result
    }
    @objc func acscValue() -> NSNumber {
        let value = self.doubleValue
        if abs(value) < 1 {
            return NSNumber(value: Double.nan)
        }
        let result = NSNumber(value: asin(1.0 / value))
        return result
    }
    @objc func acotValue() -> NSNumber {
        let value = self.doubleValue
        if abs(value) < 1e-12 {
            return NSNumber(value: Double.nan)
        }
        let result = NSNumber(value: atan(1.0 / value))
        return result
    }
    @objc func absValue() -> NSNumber {
        let result = NSNumber(value: abs(self.doubleValue))
        return result
    }
    @objc func powValue(_ exponent: NSNumber) -> NSNumber {
        let result = NSNumber(value: pow(self.doubleValue, exponent.doubleValue))
        return result
    }
}

func splitArguments(_ arguments: String) -> [String] {
    var args: [String] = []
    var currentArg = ""
    var parenCount = 0
    for char in arguments {
        if char == "," && parenCount == 0 {
            args.append(currentArg)
            currentArg = ""
        } else {
            if char == "(" { parenCount += 1 }
            else if char == ")" { parenCount -= 1 }
            currentArg.append(char)
        }
    }
    if !currentArg.isEmpty {
        args.append(currentArg)
    }
    return args.map { $0.trimmingCharacters(in: .whitespaces) }
}

func transformConsecutiveVariables(in expression: String) -> String {
    let allowedFunctions = ["sin", "cos", "tan", "sec", "csc", "cot",
                           "asin", "acos", "atan", "asec", "acsc", "acot",
                           "log", "exp", "ln", "sqrt", "pow", "abs", "function"]
    
    var transformed = expression
    var i = transformed.startIndex
    
    while i < transformed.endIndex {
        guard !transformed[i].isWhitespace else {
            i = transformed.index(after: i)
            continue
        }
        
        if transformed[i] == "(" || transformed[i] == "[" || transformed[i] == "{" {
            let closingChar: Character
            switch transformed[i] {
            case "(": closingChar = ")"
            case "[": closingChar = "]"
            case "{": closingChar = "}"
            default: closingChar = ")"
            }
            
            let start = i
            var j = transformed.index(after: i)
            var isEmpty = true
            var parenCount = 1
            
            while j < transformed.endIndex && parenCount > 0 {
                if transformed[j] == transformed[i] {
                    parenCount += 1
                } else if transformed[j] == closingChar {
                    parenCount -= 1
                } else if !transformed[j].isWhitespace {
                    isEmpty = false
                }
                j = transformed.index(after: j)
            }
            
            if isEmpty {
                transformed.replaceSubrange(start..<j, with: "0")
                i = transformed.index(start, offsetBy: 1)
                continue
            }
        }
        
        if transformed[i] == ")" {
            let nextIndex = transformed.index(after: i)
            if nextIndex < transformed.endIndex {
                let nextChar = transformed[nextIndex]
                if nextChar.isLetter || nextChar == "(" {
                    transformed.insert("*", at: nextIndex)
                    i = transformed.index(after: nextIndex)
                    continue
                }
            }
        }
        
        if transformed[i].isNumber {
            let start = i
            var end = i
            while end < transformed.endIndex && (transformed[end].isNumber || transformed[end] == ".") {
                end = transformed.index(after: end)
            }
            if end < transformed.endIndex && transformed[end] == "(" {
                transformed.insert("*", at: end)
                i = transformed.index(after: end)
                continue
            }
        }
        
        if transformed[i].isLetter {
            let start = i
            var end = i
            while end < transformed.endIndex && transformed[end].isLetter {
                end = transformed.index(after: end)
            }
            
            let potentialFn = String(transformed[start..<end])
            let isFunction = allowedFunctions.contains(potentialFn.lowercased()) &&
                            end < transformed.endIndex &&
                            transformed[end] == "("
            
            if isFunction {
                var parenCount = 1
                i = transformed.index(after: end)
                while i < transformed.endIndex && parenCount > 0 {
                    if transformed[i] == "(" { parenCount += 1 }
                    else if transformed[i] == ")" { parenCount -= 1 }
                    i = transformed.index(after: i)
                }
                continue
            } else {
                if end < transformed.endIndex {
                    let nextChar = transformed[end]
                    let bracketPairs: [Character: Character] = ["[": "]", "{": "}", "(": ")"]
                    
                    if let closingBracket = bracketPairs[nextChar] {
                        var bracketCount = 1
                        var j = transformed.index(after: end)
                        
                        while j < transformed.endIndex && bracketCount > 0 {
                            if transformed[j] == nextChar { bracketCount += 1 }
                            else if transformed[j] == closingBracket { bracketCount -= 1 }
                            j = transformed.index(after: j)
                        }
                        
                        if bracketCount == 0 {
                            let beforeBracket = String(transformed[start..<end])
                            let afterBracketIndex = transformed.index(j, offsetBy: -1)
                            let insideBrackets = String(transformed[transformed.index(after: end)..<afterBracketIndex])
                            let replacement = "\(beforeBracket)*\(insideBrackets)"
                            transformed.replaceSubrange(start..<j, with: replacement)
                            i = transformed.index(start, offsetBy: replacement.count)
                            continue
                        }
                    }
                    
                    if nextChar == "(" {
                        transformed.insert("*", at: end)
                        i = transformed.index(after: end)
                        continue
                    }
                }
                
                if end > transformed.index(after: start) {
                    let vars = String(transformed[start..<end])
                    let replaced = vars.map { String($0) }.joined(separator: "*")
                    transformed.replaceSubrange(start..<end, with: replaced)
                    i = transformed.index(start, offsetBy: replaced.count)
                    continue
                }
            }
        }
        i = transformed.index(after: i)
    }
    return transformed
}

func transformExponents(in expression: String) -> String {
    var expr = expression
    let pattern = "((?:\\([^()]*\\)|[0-9a-zA-Z\\.]+))\\^((?:\\([^()]*\\)|[0-9a-zA-Z\\.]+))"
    if let regex = try? NSRegularExpression(pattern: pattern, options: []) {
        while true {
            let range = NSRange(expr.startIndex..., in: expr)
            if let match = regex.firstMatch(in: expr, options: [], range: range) {
                guard let baseRange = Range(match.range(at: 1), in: expr),
                      let exponentRange = Range(match.range(at: 2), in: expr) else { break }
                let base = String(expr[baseRange])
                let exponent = String(expr[exponentRange])
                let replacement = "FUNCTION(\(base),'powValue:',\(exponent))"
                let matchRange = Range(match.range, in: expr)!
                expr.replaceSubrange(matchRange, with: replacement)
            } else {
                break
            }
        }
    }
    return expr
}

func transformTrigFunctions(in expression: String) -> String {
    let trigMapping: [String: String] = [
        "asin": "asinValue",
        "acos": "acosValue",
        "atan": "atanValue",
        "asec": "asecValue",
        "acsc": "acscValue",
        "acot": "acotValue",
        "sin": "sinValue",
        "cos": "cosValue",
        "tan": "tanValue",
        "sec": "secValue",
        "csc": "cscValue",
        "cot": "cotValue",
        "abs": "absValue",
        "pow": "powValue:"
    ]
    let sortedKeys = trigMapping.keys.sorted { $0.count > $1.count }
    var result = ""
    var i = expression.startIndex
    outerLoop: while i < expression.endIndex {
        var found: (canonicalFn: String, funcName: String)? = nil
        for fn in sortedKeys {
            let pattern = fn + "("
            if expression.distance(from: i, to: expression.endIndex) >= pattern.count {
                let substring = expression[i..<expression.index(i, offsetBy: pattern.count)]
                if substring.lowercased() == pattern {
                    if let funcName = trigMapping[fn] {
                        found = (fn, funcName)
                    }
                    break
                }
            }
        }
        if let (fn, funcMethod) = found {
            let skipCount = fn.count + 1
            let argStart = expression.index(i, offsetBy: skipCount)
            var parenCount = 1
            var j = argStart
            while j < expression.endIndex, parenCount > 0 {
                if expression[j] == "(" { parenCount += 1 }
                else if expression[j] == ")" { parenCount -= 1 }
                j = expression.index(after: j)
            }
            if parenCount > 0 {
                result += expression[i...]
                break outerLoop
            } else {
                let argString = (argStart < expression.index(before: j))
                    ? String(expression[argStart..<expression.index(before: j)])
                    : ""
                if fn.lowercased() == "pow" {
                    let args = splitArguments(argString)
                    if args.count == 2,
                       !args[0].trimmingCharacters(in: .whitespaces).isEmpty,
                       !args[1].trimmingCharacters(in: .whitespaces).isEmpty {
                        let transformedArg1 = transformTrigFunctions(in: args[0])
                        let transformedArg2 = transformTrigFunctions(in: args[1])
                        result += "FUNCTION(" + transformedArg1 + ",'\(funcMethod)'," + transformedArg2 + ")"
                    } else {
                        result += "0"
                    }
                } else {
                    let trimmedArg = argString.trimmingCharacters(in: .whitespacesAndNewlines)
                    if trimmedArg.isEmpty {
                        result += "0"
                    } else {
                        let transformedArg = transformTrigFunctions(in: argString)
                        result += "FUNCTION(" + transformedArg + ",'\(funcMethod)')"
                    }
                }
                i = j
            }
        } else {
            result.append(expression[i])
            i = expression.index(after: i)
        }
    }
    return result
}

func prepareExpressionPart(_ expression: String) -> String {
    guard !expression.isEmpty else { return "0" }
    var expr = expression.replacingOccurrences(of: " ", with: "")
    
    if expr.first == "-" {
        expr = "0" + expr
    }
    
    let operators = ["+", "-", "*", "/", "^", "(", "[", "{", ","]
    for op in operators {
        expr = expr.replacingOccurrences(of: "\(op)-", with: "\(op)0-")
    }
    
    let incompletePatterns = [
        "\\^\\s*[\\{\\(\\[]?\\s*$",
        "[\\+\\-\\*/\\^]\\s*$",
        "[a-zA-Z]\\s*\\(\\s*$",
        "\\(\\s*$",
        "[\\{\\(\\[]\\s*$"
    ]
    for pattern in incompletePatterns {
        if let regex = try? NSRegularExpression(pattern: pattern),
           regex.firstMatch(in: expr, range: NSRange(expr.startIndex..., in: expr)) != nil {
            return "0"
        }
    }
    
    expr = expr.replacingOccurrences(of: "[", with: "(")
    expr = expr.replacingOccurrences(of: "]", with: ")")
    expr = expr.replacingOccurrences(of: "{", with: "(")
    expr = expr.replacingOccurrences(of: "}", with: ")")
    
    var newExpr = ""
    var inAbs = false
    for char in expr {
        if char == "|" {
            if !inAbs {
                newExpr += "abs("
                inAbs = true
            } else {
                newExpr += ")"
                inAbs = false
            }
        } else {
            newExpr.append(char)
        }
    }
    if inAbs {
        newExpr += ")"
    }
    
    let openParens = newExpr.filter { $0 == "(" }.count
    let closeParens = newExpr.filter { $0 == ")" }.count
    if openParens != closeParens {
        return "0"
    }
    
    expr = transformTrigFunctions(in: newExpr)
    expr = transformExponents(in: expr)
    
    if expr.isEmpty {
        return "0"
    }
    
    if let regex2 = try? NSRegularExpression(pattern: "([a-zA-Z])(?=FUNCTION\\()") {
        expr = regex2.stringByReplacingMatches(in: expr, range: NSRange(expr.startIndex..., in: expr), withTemplate: "$1*")
    }
    
    if let regex = try? NSRegularExpression(pattern: "([0-9])([a-zA-Z])") {
        expr = regex.stringByReplacingMatches(in: expr, range: NSRange(expr.startIndex..., in: expr), withTemplate: "$1*$2")
    }
    
    expr = transformConsecutiveVariables(in: expr)
    return expr
}

func parseFormula(_ formula: String) -> (op: String, expression: String)? {
    let trimmed = formula.trimmingCharacters(in: .whitespaces)
    guard trimmed.lowercased().hasPrefix("y") else { return nil }
    
    let afterY = trimmed.dropFirst().trimmingCharacters(in: .whitespaces)
    let operators = ["<=", ">=", "<", ">", "="]
    
    for op in operators {
        if afterY.hasPrefix(op) {
            var expression = afterY.dropFirst(op.count).trimmingCharacters(in: .whitespaces)
            
            let allowedCharacters = CharacterSet(charactersIn: "0123456789.+-*/^(),xabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
            let expressionSet = CharacterSet(charactersIn: expression)
            if !expressionSet.isSubset(of: allowedCharacters) {
                return nil
            }
            
            if expression.contains("=") || expression.lowercased().contains("y") {
                return nil
            }
            
            if expression.first == "+" {
                expression.removeFirst()
                expression = expression.trimmingCharacters(in: .whitespaces)
            }
            
            if expression.isEmpty { return nil }
            return (op, String(expression))
        }
    }
    return nil
}

func isValidExpression(_ expression: String, variables: [GraphVariable]) -> Bool {
    let trimmed = expression.trimmingCharacters(in: .whitespaces)
    if trimmed.isEmpty {
        return false
    }
    
    if trimmed.contains("=") || trimmed.lowercased().contains("y") {
        return false
    }
    
    let strictlyAllowedCharacters = CharacterSet(charactersIn: "0123456789.+-*/()^,x")
    let allowedFunctions = [
        "function", "sin", "cos", "tan", "sec", "csc", "cot",
        "asin", "acos", "atan", "asec", "acsc", "acot",
        "log", "exp", "ln", "sqrt", "pow", "abs"
    ]
    
    var remainingExpression = trimmed.lowercased()
    for fn in allowedFunctions {
        remainingExpression = remainingExpression.replacingOccurrences(of: fn, with: "")
    }
    let remainingSet = CharacterSet(charactersIn: remainingExpression)
    if !remainingSet.isSubset(of: strictlyAllowedCharacters) {
        return false
    }
    
    let emptyGroupPatterns = ["\\(\\s*\\)", "\\[\\s*\\]", "\\{\\s*\\}"]
    for pattern in emptyGroupPatterns {
        if let regex = try? NSRegularExpression(pattern: pattern),
           regex.firstMatch(in: expression, range: NSRange(expression.startIndex..., in: expression)) != nil {
            return false
        }
    }
    
    let openParens = expression.filter { $0 == "(" }.count
    let closeParens = expression.filter { $0 == ")" }.count
    if openParens != closeParens {
        return false
    }
    
    let invalidOperatorPatterns = [
        "\\+\\+", "--", "\\*\\*", "//", "\\^\\^",
        "[\\+\\-\\*/\\^]\\s*[\\+\\-\\*/\\^]",
        "\\.\\s*\\d*\\s*\\.",
        "^[\\+\\-\\*/\\^]",
        "[\\+\\-\\*/\\^]$"
    ]
    
    for pattern in invalidOperatorPatterns {
        if let regex = try? NSRegularExpression(pattern: pattern),
           regex.firstMatch(in: expression, range: NSRange(expression.startIndex..., in: expression)) != nil {
            return false
        }
    }
    
    let incompleteFunctionPatterns = [
        "\\b(sin|cos|tan|sec|csc|cot|asin|acos|atan|asec|acsc|acot|log|ln|exp|sqrt|abs|pow)\\s*\\([^\\)]*$",
        "\\b(sin|cos|tan|sec|csc|cot|asin|acos|atan|asec|acsc|acot|log|ln|exp|sqrt|abs|pow)\\s*$"
    ]
    
    for pattern in incompleteFunctionPatterns {
        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
           regex.firstMatch(in: expression, range: NSRange(expression.startIndex..., in: expression)) != nil {
            return false
        }
    }
    
    if let invalidExpRegex = try? NSRegularExpression(pattern: "\\^\\s*[\\+\\-\\*/\\^]"),
       invalidExpRegex.firstMatch(in: expression, range: NSRange(expression.startIndex..., in: expression)) != nil {
        return false
    }
    
    if ["+", "-", "*", "/", "^"].contains(trimmed) {
        return false
    }
    
    return true
}

func extractMissingVariables(from formula: String, variables: [GraphVariable]) -> [String] {
    guard let parsed = parseFormula(formula) else { return [] }
    let correctedExpression = prepareExpressionPart(parsed.expression)
    if let regex = try? NSRegularExpression(pattern: "([a-zA-Z]+(?:_[0-9]+)?)") {
        let matches = regex.matches(in: correctedExpression, range: NSRange(correctedExpression.startIndex..., in: correctedExpression))
        var results = [String]()
        let knownWords: Set<String> = ["x", "y", "sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan", "asec", "acsc", "acot", "function", "sinvalue", "cosvalue", "tanvalue", "secvalue", "cscvalue", "cotvalue", "asinvalue", "acosvalue", "atanvalue", "asecvalue", "acscvalue", "acotvalue", "absvalue", "powvalue:", "powvalue", "log", "exp", "ln", "sqrt", "pow", "abs"]
        for match in matches {
            guard let range = Range(match.range, in: correctedExpression) else { continue }
            let token = String(correctedExpression[range])
            let lower = token.lowercased()
            if knownWords.contains(lower) { continue }
            if token.contains("_") {
                if !variables.contains(where: { $0.name.lowercased() == lower }) && !results.contains(where: { $0.lowercased() == lower }) {
                    results.append(token)
                }
            } else {
                if token.count > 1 {
                    for char in token {
                        let varName = String(char)
                        let lowerVarName = varName.lowercased()
                        if knownWords.contains(lowerVarName) { continue }
                        if !variables.contains(where: { $0.name.lowercased() == lowerVarName }) && !results.contains(where: { $0.lowercased() == lowerVarName }) {
                            results.append(varName)
                        }
                    }
                } else {
                    if !variables.contains(where: { $0.name.lowercased() == lower }) && !results.contains(where: { $0.lowercased() == lower }) {
                        results.append(token)
                    }
                }
            }
        }
        return results
    }
    return []
}

func createExpressionSafely(_ expression: String) -> NSExpression? {
    guard !expression.isEmpty else { return nil }
    
    do {
        let expr = try NSExpression(format: expression)
        return expr
    } catch {
        return nil
    }
}

struct GraphFormula: Identifiable {
    let id = UUID()
    var text: String
    var color: Color
    var isHidden: Bool = false
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
    
    private func formatTickValue(_ value: Double, tickStep: Double) -> String {
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
        
        for i in 0..<formulas.count where !formulas[i].isHidden {
            guard let parsed1 = parseFormula(formulas[i].text) else {
                continue
            }
            guard let nsExpression1 = createExpressionSafely(prepareExpressionPart(parsed1.expression)) else {
                continue
            }
            guard isValidExpression(prepareExpressionPart(parsed1.expression), variables: variables) else {
                continue
            }
            guard extractMissingVariables(from: formulas[i].text, variables: variables).isEmpty else {
                continue
            }
            
            for j in 0..<formulas.count where !formulas[j].isHidden && i != j {
                guard let parsed2 = parseFormula(formulas[j].text) else {
                    continue
                }
                guard let nsExpression2 = createExpressionSafely(prepareExpressionPart(parsed2.expression)) else {
                    continue
                }
                guard isValidExpression(prepareExpressionPart(parsed2.expression), variables: variables) else {
                    continue
                }
                guard extractMissingVariables(from: formulas[j].text, variables: variables).isEmpty else {
                    continue
                }
                
                var previousY1: Double? = nil
                var previousY2: Double? = nil
                var previousX: Double? = nil
                var interceptFound = false
                
                let dx = (extendedMaxX - extendedMinX) / Double(sampleCount)
                var x = extendedMinX
                
                for step in 0...sampleCount {
                    var valueDict: [String: Any] = ["x": NSNumber(value: x)]
                    for variable in variables {
                        valueDict[variable.name] = NSNumber(value: variable.value)
                    }
                    
                    let y1: Double = {
                        if let numberVal = try? nsExpression1.expressionValue(with: valueDict, context: nil) as? NSNumber {
                            return numberVal.doubleValue
                        }
                        return Double.nan
                    }()
                    
                    let y2: Double = {
                        if let numberVal = try? nsExpression2.expressionValue(with: valueDict, context: nil) as? NSNumber {
                            return numberVal.doubleValue
                        }
                        return Double.nan
                    }()
                    
                    if y1.isFinite && y2.isFinite {
                        if let prevY1 = previousY1, let prevY2 = previousY2, let prevX = previousX {
                            if (prevY1 > prevY2 && y1 <= y2) || (prevY1 < prevY2 && y1 >= y2) || (prevY1 == prevY2 && y1 == y2) {
                                let diffY1 = y1 - prevY1
                                let diffY2 = y2 - prevY2
                                if diffY1 != diffY2 {
                                    let t = (prevY2 - prevY1) / (diffY1 - diffY2)
                                    if t.isFinite && t >= 0 && t <= 1 {
                                        let interceptX = prevX + t * dx
                                        let interceptY = prevY1 + t * diffY1
                                        
                                        if interceptX >= mathMinX - extendedMargin && interceptX <= mathMaxX + extendedMargin {
                                            foundIntercepts.append(GraphIntercept(
                                                x: interceptX,
                                                y: interceptY,
                                                formulaColor: formulas[i].color
                                            ))
                                            foundIntercepts.append(GraphIntercept(
                                                x: interceptX,
                                                y: interceptY,
                                                formulaColor: formulas[j].color
                                            ))
                                            interceptFound = true
                                        }
                                    }
                                }
                            }
                        }
                        previousY1 = y1
                        previousY2 = y2
                        previousX = x
                    }
                    x += dx
                }
            }
            
            var previousX: Double? = nil
            var previousY: Double? = nil
            var xInterceptFound = false
            
            let dx = (extendedMaxX - extendedMinX) / Double(sampleCount)
            var x = extendedMinX
            
            for step in 0...sampleCount {
                var valueDict: [String: Any] = ["x": NSNumber(value: x)]
                for variable in variables {
                    valueDict[variable.name] = NSNumber(value: variable.value)
                }
                let yValue: Double = {
                    if let numberVal = try? nsExpression1.expressionValue(with: valueDict, context: nil) as? NSNumber {
                        return numberVal.doubleValue
                    }
                    return Double.nan
                }()
                
                if yValue.isFinite {
                    if let prevX = previousX, let prevY = previousY {
                        if prevY == 0 {
                            if foundIntercepts.last?.x != prevX {
                                foundIntercepts.append(GraphIntercept(x: prevX, y: 0, formulaColor: formulas[i].color))
                                xInterceptFound = true
                            }
                        }
                        if (prevY > 0 && yValue < 0) || (prevY < 0 && yValue > 0) || yValue == 0 {
                            let t = prevY / (prevY - yValue)
                            let interceptX = prevX + t * (x - prevX)
                            foundIntercepts.append(GraphIntercept(x: interceptX, y: 0, formulaColor: formulas[i].color))
                            xInterceptFound = true
                        }
                    }
                    previousX = x
                    previousY = yValue
                }
                x += dx
            }
            
            if extendedMinX <= 0 && 0 <= extendedMaxX {
                var valueDict: [String: Any] = ["x": NSNumber(value: 0)]
                for variable in variables {
                    valueDict[variable.name] = NSNumber(value: variable.value)
                }
                if let numberVal = try? nsExpression1.expressionValue(with: valueDict, context: nil) as? NSNumber,
                   numberVal.doubleValue.isFinite {
                    foundIntercepts.append(GraphIntercept(x: 0, y: numberVal.doubleValue, formulaColor: formulas[i].color))
                }
            }
        }
        
        var uniqueIntercepts: [GraphIntercept] = []
        for intercept in foundIntercepts {
            if !uniqueIntercepts.contains(where: {
                abs($0.x - intercept.x) < 1e-6 && abs($0.y - intercept.y) < 1e-6
            }) {
                uniqueIntercepts.append(intercept)
            }
        }
        
        intercepts = uniqueIntercepts
        
        if !uniqueIntercepts.isEmpty {
            let allX = uniqueIntercepts.map { $0.x }
            let allY = uniqueIntercepts.map { $0.y }
            
            guard let minX = allX.min(), let maxX = allX.max(),
                  let minY = allY.min(), let maxY = allY.max() else {
                return
            }
            
            let xRange = maxX - minX
            let yRange = maxY - minY
            
            mathMinX = minX - xRange * 0.2
            mathMaxX = maxX + xRange * 0.2
            mathMinY = minY - yRange * 0.2
            mathMaxY = maxY + yRange * 0.2
            
            if mathMaxX - mathMinX < 1 {
                let centerX = (mathMinX + mathMaxX) / 2
                mathMinX = centerX - 0.5
                mathMaxX = centerX + 0.5
            }
            
            if mathMaxY - mathMinY < 1 {
                let centerY = (mathMinY + mathMaxY) / 2
                mathMinY = centerY - 0.5
                mathMaxY = centerY + 0.5
            }
        }
        
        initialMathMinX = mathMinX
        initialMathMaxX = mathMaxX
        initialMathMinY = mathMinY
        initialMathMaxY = mathMaxY
    }
    
    var body: some View {
        GeometryReader { geo in
            ZStack {
                Canvas { context, size in
                    context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(.white))
                    var overallDataMinX = Double.infinity
                    var overallDataMaxX = -Double.infinity
                    var overallDataMinY = Double.infinity
                    var overallDataMaxY = -Double.infinity
                    
                    for formula in formulas where !formula.isHidden {
                        guard let parsed = parseFormula(formula.text),
                            let nsExpression = createExpressionSafely(prepareExpressionPart(parsed.expression)),
                            isValidExpression(prepareExpressionPart(parsed.expression), variables: variables),
                            extractMissingVariables(from: formula.text, variables: variables).isEmpty else {
                            continue
                        }
                        let samples = 200
                        let dx = (mathMaxX - mathMinX) / Double(samples)
                        for i in 0...samples {
                            let xVal = mathMinX + Double(i) * dx
                            var valueDict: [String: Any] = ["x": NSNumber(value: xVal)]
                            for variable in variables {
                                valueDict[variable.name] = NSNumber(value: variable.value)
                            }
                            if let numberVal = try? nsExpression.expressionValue(with: valueDict, context: nil) as? NSNumber,
                               numberVal.doubleValue.isFinite {
                                overallDataMinX = min(overallDataMinX, xVal)
                                overallDataMaxX = max(overallDataMaxX, xVal)
                                overallDataMinY = min(overallDataMinY, numberVal.doubleValue)
                                overallDataMaxY = max(overallDataMaxY, numberVal.doubleValue)
                            }
                        }
                    }
                    
                    var gridMinX = overallDataMinX.isFinite ? min(overallDataMinX, mathMinX) : mathMinX
                    var gridMaxX = overallDataMaxX.isFinite ? max(overallDataMaxX, mathMaxX) : mathMaxX
                    var gridMinY = overallDataMinY.isFinite ? min(overallDataMinY, mathMinY) : mathMinY
                    var gridMaxY = overallDataMaxY.isFinite ? max(overallDataMaxY, mathMaxY) : mathMaxY
                    
                    for intercept in intercepts {
                        gridMinX = min(gridMinX, intercept.x)
                        gridMaxX = max(gridMaxX, intercept.x)
                        gridMinY = min(gridMinY, intercept.y)
                        gridMaxY = max(gridMaxY, intercept.y)
                    }
                    
                    if gridMinX == gridMaxX {
                        gridMinX -= 5
                        gridMaxX += 5
                    }
                    if gridMinY == gridMaxY {
                        gridMinY -= 5
                        gridMaxY += 5
                    }
                    
                    let rangeX = gridMaxX - gridMinX
                    let rangeY = gridMaxY - gridMinY
                    
                    gridMinX -= rangeX * 0.1
                    gridMaxX += rangeX * 0.1
                    gridMinY -= rangeY * 0.1
                    gridMaxY += rangeY * 0.1
                    
                    let viewAspect = size.width / size.height
                    let dataAspect = (gridMaxX - gridMinX) / (gridMaxY - gridMinY)
                    
                    if dataAspect > viewAspect {
                        let desiredHeight = (gridMaxX - gridMinX) / viewAspect
                        let centerY = (gridMinY + gridMaxY) / 2
                        gridMinY = centerY - desiredHeight / 2
                        gridMaxY = centerY + desiredHeight / 2
                    } else {
                        let desiredWidth = (gridMaxY - gridMinY) * viewAspect
                        let centerX = (gridMinX + gridMaxX) / 2
                        gridMinX = centerX - desiredWidth / 2
                        gridMaxX = centerX + desiredWidth / 2
                    }
                    
                    func transform(_ x: Double, _ y: Double, in size: CGSize) -> CGPoint {
                        let clampedX = min(max(x, gridMinX), gridMaxX)
                        let clampedY = min(max(y, gridMinY), gridMaxY)
                        let px = CGFloat((clampedX - gridMinX) / (gridMaxX - gridMinX)) * size.width
                        let py = size.height - CGFloat((clampedY - gridMinY) / (gridMaxY - gridMinY)) * size.height
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
                        var xTick2 = ceil(gridMinX / tickStepX) * tickStepX
                        while xTick2 <= gridMaxX {
                            let xPos = transform(xTick2, 0, in: size).x
                            var tickPath = Path()
                            tickPath.move(to: CGPoint(x: xPos, y: axisY - 4))
                            tickPath.addLine(to: CGPoint(x: xPos, y: axisY + 4))
                            context.stroke(tickPath, with: .color(.black), lineWidth: 2)
                            drawLabel(formatTickValue(xTick2, tickStep: tickStepX), at: CGPoint(x: xPos, y: axisY + 15), anchor: .center)
                            xTick2 += tickStepX
                        }
                    }
                    
                    if gridMinX <= 0 && gridMaxX >= 0 {
                        let axisX = transform(0, gridMinY, in: size).x
                        var yTick2 = ceil(gridMinY / tickStepY) * tickStepY
                        while yTick2 <= gridMaxY {
                            let yPos = transform(0, yTick2, in: size).y
                            var tickPath = Path()
                            tickPath.move(to: CGPoint(x: axisX - 4, y: yPos))
                            tickPath.addLine(to: CGPoint(x: axisX + 4, y: yPos))
                            context.stroke(tickPath, with: .color(.black), lineWidth: 2)
                            let tickLabel = formatTickValue(yTick2, tickStep: tickStepY)
                            let offset = CGFloat(max(0, tickLabel.count - 3)) * 6.0
                            drawLabel(tickLabel, at: CGPoint(x: axisX - 15 - offset, y: yPos), anchor: .center)
                            yTick2 += tickStepY
                        }
                    }
                    
                    for formula in formulas where !formula.isHidden {
                        guard let parsed = parseFormula(formula.text),
                              let nsExpression = createExpressionSafely(prepareExpressionPart(parsed.expression)),
                              isValidExpression(prepareExpressionPart(parsed.expression), variables: variables),
                              extractMissingVariables(from: formula.text, variables: variables).isEmpty else { continue }
                        
                        let samples = 200
                        let dx = (gridMaxX - gridMinX) / Double(samples)
                        var points: [CGPoint] = []
                        
                        for i in 0...samples {
                            let xVal = gridMinX + Double(i) * dx
                            var valueDict: [String: Any] = ["x": xVal]
                            for variable in variables {
                                valueDict[variable.name] = variable.value
                            }
                            if let numberVal = try? nsExpression.expressionValue(with: valueDict, context: nil) as? NSNumber,
                               numberVal.doubleValue.isFinite {
                                points.append(transform(xVal, numberVal.doubleValue, in: size))
                            }
                        }
                        
                        switch parsed.op {
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
                            for pt in points { regionPath.addLine(to: pt) }
                            regionPath.addLine(to: CGPoint(x: size.width, y: size.height))
                            regionPath.closeSubpath()
                            context.fill(regionPath, with: .color(formula.color.opacity(0.3)))
                            var boundary = Path()
                            if let first = points.first {
                                boundary.move(to: first)
                                for pt in points.dropFirst() { boundary.addLine(to: pt) }
                            }
                            context.stroke(boundary, with: .color(formula.color), lineWidth: 2)
                        case ">", ">=":
                            var regionPath = Path()
                            regionPath.move(to: CGPoint(x: 0, y: 0))
                            for pt in points { regionPath.addLine(to: pt) }
                            regionPath.addLine(to: CGPoint(x: size.width, y: 0))
                            regionPath.closeSubpath()
                            context.fill(regionPath, with: .color(formula.color.opacity(0.3)))
                            var boundary = Path()
                            if let first = points.first {
                                boundary.move(to: first)
                                for pt in points.dropFirst() { boundary.addLine(to: pt) }
                            }
                            context.stroke(boundary, with: .color(formula.color), lineWidth: 2)
                        default:
                            break
                        }
                    }
                    
                    for intercept in intercepts {
                        let interceptPoint = transform(intercept.x, intercept.y, in: size)
                        var markerPath = Path(ellipseIn: CGRect(x: interceptPoint.x - 4, y: interceptPoint.y - 4, width: 8, height: 8))
                        context.fill(markerPath, with: .color(intercept.formulaColor))
                        let coordText = String(format: "(%.2f, %.2f)", intercept.x, intercept.y)
                        let font = NSFont.systemFont(ofSize: 14, weight: .heavy)
                        let attributes: [NSAttributedString.Key: Any] = [.font: font]
                        let textSize = (coordText as NSString).size(withAttributes: attributes)
                        let padding: CGFloat = 3
                        let textPosition = CGPoint(x: interceptPoint.x, y: interceptPoint.y - 10)
                        let backgroundRect = CGRect(
                            x: textPosition.x - textSize.width/2 - padding,
                            y: textPosition.y - textSize.height/2 - padding,
                            width: textSize.width + 2*padding,
                            height: textSize.height + 2*padding)
                        
                        let cornerRadius: CGFloat = 4
                        let roundedRectPath = Path(roundedRect: backgroundRect, cornerRadius: cornerRadius)
                        
                        context.fill(roundedRectPath, with: .color(Color(hex: 0xe6e6e6).opacity(0.9)))
                        context.stroke(roundedRectPath, with: .color(Color(hex: 0x222222)), lineWidth: 1.0)
                        context.draw(Text(coordText).font(.caption2).foregroundColor(.black), at: textPosition, anchor: .center)
                    }
                }
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            let dx = Double(value.translation.width) * (initialMathMaxX - initialMathMinX) / Double(geo.size.width)
                            let dy = Double(value.translation.height) * (initialMathMaxY - initialMathMinY) / Double(geo.size.height)
                            mathMinX = initialMathMinX - dx
                            mathMaxX = initialMathMaxX - dx
                            mathMinY = initialMathMinY + dy
                            mathMaxY = initialMathMaxY + dy
                        }
                        .onEnded { _ in
                            initialMathMinX = mathMinX
                            initialMathMaxX = mathMaxX
                            initialMathMinY = mathMinY
                            initialMathMaxY = mathMaxY
                        }
                )
                .simultaneousGesture(
                    MagnificationGesture()
                        .onChanged { value in
                            let centerX = (initialMathMinX + initialMathMaxX) / 2
                            let centerY = (initialMathMinY + initialMathMaxY) / 2
                            let newRangeX = (initialMathMaxX - initialMathMinX) / Double(value)
                            let newRangeY = (initialMathMaxY - initialMathMinY) / Double(value)
                            let maxRange = 10000.0
                            let minRange = 0.1
                            let clampedRangeX = min(max(newRangeX, minRange), maxRange)
                            let clampedRangeY = min(max(newRangeY, minRange), maxRange)
                            
                            mathMinX = centerX - clampedRangeX / 2
                            mathMaxX = centerX + clampedRangeX / 2
                            mathMinY = centerY - clampedRangeY / 2
                            mathMaxY = centerY + clampedRangeY / 2
                        }
                        .onEnded { _ in
                            initialMathMinX = mathMinX
                            initialMathMaxX = mathMaxX
                            initialMathMinY = mathMinY
                            initialMathMaxY = mathMaxY
                        }
                )
            }
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
                .containerHelper(
                    backgroundColor: Color(hex: 0xe6e6e6),
                    borderColor: Color(hex: 0x222222), borderWidth: 0.5,
                    topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4,
                    shadowColor: Color.black, shadowRadius: 2, shadowX: 0, shadowY: 0
                )
                .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                .onTapGesture {
                    findIntercepts()
                }
                .padding(8),
                alignment: .bottomTrailing
            )
        }
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
                            formulas.append(GraphFormula(text: "y = ", color: randomColor()))
                        }
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
                                                ToolTextField(placeholder: "Enter new formula...", text: $formula.text)
                                                    .onChange(of: formula.text) { newValue in
                                                        let prefix = "y = "
                                                        if !newValue.hasPrefix(prefix) {
                                                            DispatchQueue.main.async {
                                                                if newValue.count < prefix.count {
                                                                    formula.text = prefix
                                                                } else {
                                                                    let startIndex = newValue.startIndex
                                                                    let remainder = newValue[newValue.index(startIndex, offsetBy: prefix.count)...]
                                                                    formula.text = prefix + remainder
                                                                }
                                                            }
                                                        }
                                                        
                                                        intercepts=[]
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
                                                if !missingVars.isEmpty {
                                                    ScrollView(.horizontal, showsIndicators: false) {
                                                        HStack {
                                                            Text("add slider:")
                                                                .font(.system(size: 9, weight: .semibold, design: .default).italic())
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
                                                                            .font(.system(size: 9, weight: .semibold, design: .default).italic())
                                                                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(1.0))
                                                                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
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
                                                                        .font(.system(size: 9, weight: .semibold, design: .default).italic())
                                                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(1.0))
                                                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
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
                                                intercepts=[]
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
                                    borderColor: Color(hex: 0xc1c1c1), borderWidth:3,
                                    topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2,
                                    shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                                )
                            }
                            ForEach($variables) { $variable in
                                HStack {
                                    VStack {
                                        HStack {
                                            Text("\(variable.name):")
                                                .font(.system(size: 12, weight: .semibold, design: .default).italic())
                                                .foregroundColor(Color(hex: 0x222222).opacity(0.8))
                                            Text("\(variable.value, specifier: "%.1f")")
                                                .font(.system(size: 12, weight: .heavy))
                                                .foregroundColor(Color(hex: 0x222222).opacity(1.0))
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
                                    borderColor: Color(hex: 0xc1c1c1), borderWidth:3,
                                    topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2,
                                    shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0
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
                                            intercepts=[]
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
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 30)
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
                .containerHelper(
                    backgroundColor: Color(hex: 0xc6c6c6),
                    borderColor: Color.clear, borderWidth: 0,
                    topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                    shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                )
                .overlay(
                    Rectangle()
                        .frame(width: 4.0)
                        .foregroundColor(Color.black.opacity(1.0)),
                    alignment: .trailing
                )
            }
        }
        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio),
               height: (geometry.size.height - 50) * 0.9)
        
    }
}

extension View {
    func basicKeyStyle(_ text: String) -> some View {
        self
            .frame(width: 18, height: 18)
            .padding(6)
            .containerHelper(
                backgroundColor: Color(hex: 0x414141),
                borderColor: Color(hex: 0x222222), borderWidth: 1,
                topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6,
                shadowColor: Color.black, shadowRadius: 1, shadowX: 0, shadowY: 0
            )
            .overlay(
                Text(text)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(hex: 0xf5f5f5))
                    .allowsHitTesting(false)
            )
            .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
    }
    func opKeyStyle(_ text: String) -> some View {
        self
            .frame(width: 18, height: 18)
            .padding(6)
            .containerHelper(
                backgroundColor: Color(hex: 0x919191),
                borderColor: Color(hex: 0xc9c9c9), borderWidth: 1,
                topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6,
                shadowColor: Color.black, shadowRadius: 1, shadowX: 0, shadowY: 0
            )
            .overlay(
                Text(text)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .allowsHitTesting(false)
            )
            .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
    }
    func fnKeyStyle(_ label: String) -> some View {
        self
            .frame(width: 28, height: 18)
            .padding(6)
            .containerHelper(
                backgroundColor: Color(hex: 0x414141),
                borderColor: Color(hex: 0x222222), borderWidth: 1,
                topLeft: 6, topRight: 6, bottomLeft: 6, bottomRight: 6,
                shadowColor: Color.black, shadowRadius: 1, shadowX: 0, shadowY: 0
            )
            .overlay(
                Text(label)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color(hex: 0xf5f5f5))
                    .allowsHitTesting(false)
            )
            .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
    }
}
