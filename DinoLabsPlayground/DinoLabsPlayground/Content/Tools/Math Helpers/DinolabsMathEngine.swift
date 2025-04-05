//
//  DinolabsMathEngine.swift
//
//  Created by Peter Iacobelli on 4/4/25.
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
        return NSNumber(value: asin(value))
    }
    @objc func acosValue() -> NSNumber {
        let value = self.doubleValue
        if value < -1 || value > 1 {
            return NSNumber(value: Double.nan)
        }
        return NSNumber(value: acos(value))
    }
    @objc func atanValue() -> NSNumber {
        return NSNumber(value: atan(self.doubleValue))
    }
    @objc func asecValue() -> NSNumber {
        let value = self.doubleValue
        if abs(value) < 1 {
            return NSNumber(value: Double.nan)
        }
        return NSNumber(value: Double.pi / 2 - asin(1.0 / value))
    }
    @objc func acscValue() -> NSNumber {
        let value = self.doubleValue
        if abs(value) < 1 {
            return NSNumber(value: Double.nan)
        }
        return NSNumber(value: Double.pi / 2 - acos(1.0 / value))
    }
    @objc func acotValue() -> NSNumber {
        let value = self.doubleValue
        if abs(value) < 1e-12 {
            return NSNumber(value: Double.nan)
        }
        return NSNumber(value: Double.pi / 2 - atan(value))
    }
    @objc func absValue() -> NSNumber {
        let result = NSNumber(value: abs(self.doubleValue))
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
                if nextChar.isLetter || nextChar.isNumber || nextChar == "(" {
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
            if end < transformed.endIndex {
                let nextChar = transformed[end]
                if nextChar.isLetter || nextChar == "(" {
                    transformed.insert("*", at: end)
                    i = transformed.index(after: end)
                    continue
                }
            }
            i = end
            continue
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
                    if nextChar.isLetter || nextChar.isNumber || nextChar == "(" {
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
    var result = ""
    var i = expression.startIndex
    var lastIndex = expression.startIndex
    
    while i < expression.endIndex {
        if expression[i] == "^" {
            if i == expression.startIndex || "+-*/^([{".contains(expression[expression.index(before: i)]) {
                result.append(contentsOf: expression[lastIndex..<i])
                result.append("0")
                i = expression.index(after: i)
                lastIndex = i
                continue
            }
            
            var j = expression.index(before: i)
            var baseStart = j
            
            if expression[j] == ")" {
                var parenCount = 1
                while j > expression.startIndex {
                    j = expression.index(before: j)
                    if expression[j] == ")" { parenCount += 1 }
                    else if expression[j] == "(" { parenCount -= 1; if parenCount == 0 { break } }
                }
                baseStart = j
            } else {
                while j > expression.startIndex {
                    let prevIndex = expression.index(before: j)
                    let char = expression[prevIndex]
                    if char.isLetter || char.isNumber || char == "." { j = prevIndex }
                    else { break }
                }
                baseStart = j
            }
            
            if baseStart >= i {
                result.append(contentsOf: expression[lastIndex..<i])
                result.append("0")
                i = expression.index(after: i)
                lastIndex = i
                continue
            }
            
            let base = String(expression[baseStart..<i])
            var expStart = expression.index(after: i)
            if expStart >= expression.endIndex {
                result.append(contentsOf: expression[lastIndex..<i])
                result.append("0")
                i = expStart
                lastIndex = i
                continue
            }
            
            var expEnd = expStart
            if expression[expStart] == "(" {
                var parenCount = 1
                expEnd = expression.index(after: expStart)
                while expEnd < expression.endIndex && parenCount > 0 {
                    if expression[expEnd] == "(" { parenCount += 1 }
                    else if expression[expEnd] == ")" { parenCount -= 1 }
                    expEnd = expression.index(after: expEnd)
                }
                let expContent = String(expression[expression.index(after: expStart)..<expression.index(before: expEnd)])
                if expContent.trimmingCharacters(in: .whitespaces).isEmpty {
                    result.append(contentsOf: expression[lastIndex..<baseStart])
                    result.append("0")
                    i = expEnd
                    lastIndex = i
                    continue
                }
            } else {
                while expEnd < expression.endIndex {
                    let char = expression[expEnd]
                    if char.isLetter || char.isNumber || char == "." { expEnd = expression.index(after: expEnd) }
                    else { break }
                }
            }
            
            if expEnd == expStart {
                result.append(contentsOf: expression[lastIndex..<i])
                result.append("0")
                i = expEnd
                lastIndex = i
                continue
            }
            
            let exponentStr = String(expression[expStart..<expEnd])
            
            result.append(contentsOf: expression[lastIndex..<baseStart])
            
            if let exponent = Double(exponentStr), exponent.isFinite, floor(exponent) == exponent, exponent >= 0 {
                let intExponent = Int(exponent)
                if intExponent == 0 {
                    result.append("1")
                } else {
                    result.append("(")
                    for k in 0..<(intExponent - 1) {
                        result.append(base)
                        result.append("*")
                    }
                    result.append(base)
                    result.append(")")
                }
            } else {
                result.append("pow(")
                result.append(base)
                result.append(",")
                result.append(exponentStr)
                result.append(")")
            }
            
            i = expEnd
            lastIndex = i
        } else {
            i = expression.index(after: i)
        }
    }
    
    result.append(contentsOf: expression[lastIndex..<expression.endIndex])
    return result
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
        "cot": "cotValue"
    ]
    
    var result = expression
    var i = result.startIndex
    
    while i < result.endIndex {
        if result[i...].hasPrefix("abs(") {
            let start = i
            let argStart = result.index(i, offsetBy: 4)
            var parenCount = 1
            var j = argStart
            
            while j < result.endIndex && parenCount > 0 {
                if result[j] == "(" { parenCount += 1 }
                else if result[j] == ")" { parenCount -= 1 }
                j = result.index(after: j)
            }
            
            if parenCount == 0 {
                let argString = String(result[argStart..<result.index(before: j)])
                let trimmedArg = argString.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmedArg.isEmpty {
                    result.replaceSubrange(start..<j, with: "0")
                    i = result.index(start, offsetBy: 1)
                } else {
                    let transformedArg = transformTrigFunctions(in: argString)
                    result.replaceSubrange(start..<j, with: "abs(\(transformedArg))")
                    i = result.index(start, offsetBy: 4 + transformedArg.count + 1)
                }
            } else {
                result.replaceSubrange(start..<result.endIndex, with: "0")
                break
            }
        } else {
            i = result.index(after: i)
        }
    }
    
    let sortedKeys = trigMapping.keys.sorted { $0.count > $1.count }
    i = result.startIndex
    
    outerLoop: while i < result.endIndex {
        var found: (canonicalFn: String, funcName: String)? = nil
        for fn in sortedKeys {
            let pattern = fn + "("
            if result.distance(from: i, to: result.endIndex) >= pattern.count {
                let substring = result[i..<result.index(i, offsetBy: pattern.count)]
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
            let argStart = result.index(i, offsetBy: skipCount)
            var parenCount = 1
            var j = argStart
            
            while j < result.endIndex && parenCount > 0 {
                if result[j] == "(" { parenCount += 1 }
                else if result[j] == ")" { parenCount -= 1 }
                j = result.index(after: j)
            }
            
            if parenCount > 0 {
                result.replaceSubrange(i..<result.endIndex, with: "0")
                i = result.index(i, offsetBy: 1)
                continue outerLoop
            } else {
                let argString = (argStart < result.index(before: j))
                    ? String(result[argStart..<result.index(before: j)])
                    : ""
                let trimmedArg = argString.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmedArg.isEmpty {
                    result.replaceSubrange(i..<j, with: "0")
                    i = result.index(i, offsetBy: 1)
                } else {
                    let transformedArg = transformTrigFunctions(in: argString)
                    result.replaceSubrange(i..<j, with: "FUNCTION(\(transformedArg),'\(funcMethod)')")
                    i = result.index(i, offsetBy: "FUNCTION(\(transformedArg),'\(funcMethod)')".count)
                }
            }
        } else if result[i...].lowercased().starts(with: "sqrt(") {
            let skipCount = 5
            let argStart = result.index(i, offsetBy: skipCount)
            var parenCount = 1
            var j = argStart
            
            while j < result.endIndex && parenCount > 0 {
                if result[j] == "(" { parenCount += 1 }
                else if result[j] == ")" { parenCount -= 1 }
                j = result.index(after: j)
            }
            
            if parenCount > 0 {
                result.replaceSubrange(i..<result.endIndex, with: "0")
                i = result.index(i, offsetBy: 1)
                continue outerLoop
            } else {
                let argString = (argStart < result.index(before: j))
                    ? String(result[argStart..<result.index(before: j)])
                    : ""
                let trimmedArg = argString.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmedArg.isEmpty {
                    result.replaceSubrange(i..<j, with: "0")
                    i = result.index(i, offsetBy: 1)
                } else {
                    let transformedArg = transformTrigFunctions(in: argString)
                    result.replaceSubrange(i..<j, with: "sqrt(\(transformedArg))")
                    i = result.index(i, offsetBy: "sqrt(\(transformedArg))".count)
                }
            }
        } else if result[i...].lowercased().starts(with: "pow(") {
            let skipCount = 4
            let argStart = result.index(i, offsetBy: skipCount)
            var parenCount = 1
            var j = argStart
            
            while j < result.endIndex && parenCount > 0 {
                if result[j] == "(" { parenCount += 1 }
                else if result[j] == ")" { parenCount -= 1 }
                j = result.index(after: j)
            }
            
            if parenCount > 0 {
                result.replaceSubrange(i..<result.endIndex, with: "0")
                i = result.index(i, offsetBy: 1)
                continue outerLoop
            } else {
                let argString = (argStart < result.index(before: j))
                    ? String(result[argStart..<result.index(before: j)])
                    : ""
                let trimmedArg = argString.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmedArg.isEmpty {
                    result.replaceSubrange(i..<j, with: "0")
                    i = result.index(i, offsetBy: 1)
                } else {
                    let args = splitArguments(trimmedArg)
                    if args.count != 2 {
                        result.replaceSubrange(i..<j, with: "0")
                        i = result.index(i, offsetBy: 1)
                    } else {
                        let baseExpr = transformTrigFunctions(in: args[0])
                        let exponentExpr = transformTrigFunctions(in: args[1])
                        if baseExpr.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                           exponentExpr.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            result.replaceSubrange(i..<j, with: "0")
                            i = result.index(i, offsetBy: 1)
                        } else if let base = Double(baseExpr), let exponent = Double(exponentExpr) {
                            let powResult = pow(base, exponent)
                            result.replaceSubrange(i..<j, with: "\(powResult)")
                            i = result.index(i, offsetBy: "\(powResult)".count)
                        } else {
                            result.replaceSubrange(i..<j, with: "pow(\(baseExpr),\(exponentExpr))")
                            i = result.index(i, offsetBy: "pow(\(baseExpr),\(exponentExpr))".count)
                        }
                    }
                }
            }
        } else {
            i = result.index(after: i)
        }
    }
    
    return result
}

func prepareExpressionPart(_ expression: String) -> String {
    guard !expression.isEmpty else { return "0" }
    let decimalPattern = "\\d+\\.\\d+\\."
    if let regex = try? NSRegularExpression(pattern: decimalPattern),
       regex.firstMatch(in: expression, range: NSRange(expression.startIndex..., in: expression)) != nil {
        return "0"
    }
    
    var expr = expression.replacingOccurrences(of: " ", with: "")
    if expr.hasPrefix("^") {
        expr = "0" + expr
    }
    if let regex = try? NSRegularExpression(pattern: "([+\\-*/(])\\^", options: []) {
        expr = regex.stringByReplacingMatches(in: expr, range: NSRange(expr.startIndex..., in: expr), withTemplate: "$10^")
    }
    if expr.last == "." {
        expr += "0"
    }
    if expr.first == "-" {
        expr = "0" + expr
    }
    let operators = ["+", "-", "*", "/", "^", "(", "[", "{", ","]
    for op in operators {
        expr = expr.replacingOccurrences(of: "\(op)-", with: "\(op)0-")
    }
    
    let incompleteExponentPatterns = [
        "[\\{\\[\\(]\\s*\\^\\s*[0-9]*[\\}\\)\\]]?",
        "[\\{\\[\\(][0-9]*\\s*\\^\\s*[\\}\\)\\]]"
    ]
    for pattern in incompleteExponentPatterns {
        if let regex = try? NSRegularExpression(pattern: pattern),
           regex.firstMatch(in: expr, range: NSRange(expr.startIndex..., in: expr)) != nil {
            return "0"
        }
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
    
    let barCount = expr.filter { $0 == "|" }.count
    if barCount > 0 {
        if barCount % 2 == 0 {
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
            expr = newExpr
        } else {
            return "0"
        }
    }
    
    let openParens = expr.filter { $0 == "(" }.count
    let closeParens = expr.filter { $0 == ")" }.count
    if openParens != closeParens {
        return "0"
    }
    
    expr = transformConsecutiveVariables(in: expr)
    expr = transformExponents(in: expr)
    expr = transformTrigFunctions(in: expr)
    
    if expr.isEmpty {
        return "0"
    }
    
    if let regex2 = try? NSRegularExpression(pattern: "([a-zA-Z])(?=FUNCTION\\()") {
        expr = regex2.stringByReplacingMatches(in: expr, range: NSRange(expr.startIndex..., in: expr), withTemplate: "$1*")
    }
    if let regex = try? NSRegularExpression(pattern: "([0-9])([a-zA-Z])") {
        expr = regex.stringByReplacingMatches(in: expr, range: NSRange(expr.startIndex..., in: expr), withTemplate: "$1*$2")
    }
    if let regex = try? NSRegularExpression(pattern: "\\)([0-9a-zA-Z])") {
        expr = regex.stringByReplacingMatches(in: expr, range: NSRange(expr.startIndex..., in: expr), withTemplate: ")*$1")
    }
    
    return expr
}

func parseFormula(_ formula: String) -> (op: String, expression: String)? {
    let trimmed = formula.trimmingCharacters(in: .whitespaces)
    let possibleStarts = ["y'", "∫y", "y"]
    var foundStart: String? = nil
    for candidate in possibleStarts {
        if trimmed.lowercased().hasPrefix(candidate.lowercased()) {
            foundStart = candidate
            break
        }
    }
    guard let startPrefix = foundStart else {
        return nil
    }
    let afterPrefix = trimmed.dropFirst(startPrefix.count).replacingOccurrences(of: " ", with: "")
    let operators = ["<=", ">=", "<", ">", "="]
    for op in operators {
        if afterPrefix.hasPrefix(op) {
            let expressionStart = afterPrefix.index(afterPrefix.startIndex, offsetBy: op.count)
            let expression = String(afterPrefix[expressionStart...])
            
            let allowedCharacters = CharacterSet(charactersIn: "0123456789.+-*/^(),|[]{}xabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
            let expressionSet = CharacterSet(charactersIn: expression)
            if !expressionSet.isSubset(of: allowedCharacters) {
                return nil
            }
            if expression.contains("=") || expression.lowercased().contains("y") {
                return nil
            }
            if expression.isEmpty { return nil }
            return (op, expression)
        }
    }
    return nil
}

func isValidExpression(_ expression: String, variables: [GraphVariable]) -> Bool {
    let trimmed = expression.trimmingCharacters(in: .whitespaces)
    if trimmed.isEmpty {
        return false
    }
    
    let decimalPattern = "\\d+\\.\\d+\\."
    if let regex = try? NSRegularExpression(pattern: decimalPattern),
       regex.firstMatch(in: trimmed, range: NSRange(trimmed.startIndex..., in: trimmed)) != nil {
        return false
    }
    
    if trimmed.contains("=") || trimmed.lowercased().contains("y") {
        return false
    }
    
    if expression.hasPrefix("^") || expression.contains("^") {
        let pattern = "(?:[^0-9a-zA-Z\\)]|^)\\^(?=[0-9a-zA-Z\\(])"
        if let regex = try? NSRegularExpression(pattern: pattern),
           regex.firstMatch(in: expression, range: NSRange(expression.startIndex..., in: expression)) != nil {
            return false
        }
    }
    
    let nativeFunctions = ["sqrt", "log", "exp", "ln", "pow", "abs"]
    
    let transformedFunctions = [
        "sin", "cos", "tan", "sec", "csc", "cot",
        "asin", "acos", "atan", "asec", "acsc", "acot"
    ]
    
    var allowedChars = "0123456789.+-*/()^,|x'"
    for variable in variables {
        allowedChars += variable.name
    }
    
    var validationString = trimmed
    for fn in nativeFunctions {
        let pattern = "\(fn)\\([^)]*\\)"
        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) {
            validationString = regex.stringByReplacingMatches(
                in: validationString,
                range: NSRange(validationString.startIndex..., in: validationString),
                withTemplate: "1"
            )
        }
    }
    
    for fn in transformedFunctions {
        let pattern = "FUNCTION\\([^)]*,'\(fn)Value'\\)"
        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) {
            validationString = regex.stringByReplacingMatches(
                in: validationString,
                range: NSRange(validationString.startIndex..., in: validationString),
                withTemplate: "1"
            )
        }
    }
    
    let absPattern1 = "abs\\([^)]*\\)"
    let absPattern2 = "\\|[^|]*\\|"
    for pattern in [absPattern1, absPattern2] {
        if let regex = try? NSRegularExpression(pattern: pattern) {
            validationString = regex.stringByReplacingMatches(
                in: validationString,
                range: NSRange(validationString.startIndex..., in: validationString),
                withTemplate: "1"
            )
        }
    }
    
    let remainingSet = CharacterSet(charactersIn: validationString)
    let allowedSet = CharacterSet(charactersIn: allowedChars)
    if !remainingSet.isSubset(of: allowedSet) {
        return false
    }
    
    let emptyGroupPatterns = ["\\(\\s*\\)", "\\[\\s*\\]", "\\{\\s*\\}"]
    for pattern in emptyGroupPatterns {
        if let regex = try? NSRegularExpression(pattern: pattern),
           regex.firstMatch(in: expression, range: NSRange(expression.startIndex..., in: expression)) != nil {
            return false
        }
    }
    
    let barCount = expression.filter { $0 == "|" }.count
    if barCount % 2 != 0 {
        return false
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
        let knownWords: Set<String> = ["x", "y", "sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan", "asec", "acsc", "acot", "function", "sinvalue", "cosvalue", "tanvalue", "secvalue", "cscvalue", "cotvalue", "asinvalue", "acosvalue", "atanvalue", "asecvalue", "acscvalue", "acotvalue", "absvalue", "powvalue", "log", "exp", "ln", "sqrt", "pow", "abs"]
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
