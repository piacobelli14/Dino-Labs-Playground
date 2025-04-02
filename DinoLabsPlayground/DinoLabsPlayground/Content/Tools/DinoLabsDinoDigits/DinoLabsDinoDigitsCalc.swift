//
//  DinoLabsDinoDigitsCalc.swift
//
//  Created by Peter Iacobelli on 4/2/25.
//

import SwiftUI
import AppKit

struct DinoLabsDinoDigitsCalc: View {
    let geometry: GeometryProxy
    @Binding var leftPanelWidthRatio: CGFloat
    @State private var isKeyboardView: Bool = false
    @State private var expression: String = ""
    @State private var history: [(expression: String, result: String)] = []
    @State private var terminalState: String = "funcs"
    
    func solveEquation(_ equation: String) -> String {
        let parts = equation.split(separator: "=")
        if parts.count != 2 {
            return equation
        }
        let leftStr = String(parts[0])
        let rightStr = String(parts[1])
        let leftPrepared = prepareExpressionPart(leftStr)
        let rightPrepared = prepareExpressionPart(rightStr)
        guard let leftExpr = createExpressionSafely(leftPrepared), let rightExpr = createExpressionSafely(rightPrepared) else {
            return equation
        }
        let variableCandidates = ["x", "y", "z", "a", "b", "c"]
        var foundVariables = Set<String>()
        for candidate in variableCandidates {
            if equation.contains(candidate) {
                foundVariables.insert(candidate)
            }
        }
        if foundVariables.count != 1 {
            return equation
        }
        guard let variable = foundVariables.first else {
            return equation
        }
        func f(_ val: Double) -> Double {
            let leftVal = leftExpr.expressionValue(with: [variable: val], context: nil) as? NSNumber ?? 0
            let rightVal = rightExpr.expressionValue(with: [variable: val], context: nil) as? NSNumber ?? 0
            return leftVal.doubleValue - rightVal.doubleValue
        }
        var a = -1000.0
        var b = 1000.0
        let fa = f(a)
        let fb = f(b)
        if fa * fb > 0 {
            return equation
        }
        var mid = (a + b) / 2
        for _ in 0..<100 {
            mid = (a + b) / 2
            let fmid = f(mid)
            if abs(fmid) < 1e-6 {
                break
            }
            if f(a) * fmid < 0 {
                b = mid
            } else {
                a = mid
            }
        }
        return String(format: "\(variable) = %.6f", mid)
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView(.vertical, showsIndicators: true) {
                VStack(spacing: 0) {
                    ForEach(history.reversed(), id: \.expression) { item in
                        ToolTextField(placeholder: "", text: .constant("\(item.expression) → \(item.result)"), isSecure: false, textSize: 24)
                            .textFieldStyle(PlainTextFieldStyle())
                            .multilineTextAlignment(.trailing)
                            .foregroundColor(.black)
                            .font(.system(size: 24, weight: .heavy))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 12)
                            .containerHelper(
                                backgroundColor: Color(hex: 0xf5f5f5),
                                borderColor: Color(hex: 0x222222), borderWidth: 1,
                                topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                            )
                            .hoverEffect(opacity: 0.8)
                            .disabled(true)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
            .containerHelper(
                backgroundColor: Color(hex: 0xf5f5f5).opacity(0.9),
                borderColor: Color(hex: 0x222222), borderWidth: 1,
                topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
            )
            .overlay(Rectangle().frame(width: 4.0).foregroundColor(Color.black.opacity(1.0)), alignment: .trailing)
            
            VStack(spacing: 0) {
                HStack {
                    ToolTextField(placeholder: "", text: $expression, isSecure: false, textSize: 30)
                    .textFieldStyle(PlainTextFieldStyle())
                    .multilineTextAlignment(.trailing)
                    .foregroundColor(.black)
                    .font(.system(size: 30, weight: .heavy))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 12)
                    .containerHelper(
                        backgroundColor: Color(hex: 0xf5f5f5).opacity(0.95),
                        borderColor: Color.clear, borderWidth: 1,
                        topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                        shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                    )
                    .hoverEffect(opacity: 0.8)
                }
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
                .containerHelper(backgroundColor: Color(hex: 0xc1c1c1), borderColor: Color(hex: 0x222222), borderWidth: 1, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                .overlay(Rectangle().frame(width: 4.0).foregroundColor(Color.black.opacity(1.0)), alignment: .trailing)
                
                VStack(spacing: 4) {
                    HStack(spacing: 8) {
                        Text("funcs")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(terminalState == "funcs" ? 1.0 : 0.7))
                            .underline(terminalState == "funcs" ? true : false)
                            .onTapGesture {
                                terminalState = "funcs"
                            }
                            .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                        
                        Text("consts")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(terminalState == "consts" ? 1.0 : 0.7))
                            .underline(terminalState == "consts" ? true : false)
                            .onTapGesture {
                                terminalState = "consts"
                            }
                            .hoverEffect(opacity: 0.6, scale: 1.02, cursor: .pointingHand)
                    
                        Spacer()
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
                    .background(Color(hex: 0x919191))
                    
                    
                    HStack {
                        VStack(spacing: 4) {
                            HStack(spacing: 4) {
                                ToolButtonMain { self.expression.append("7") }  .basicKeyStyle("7")
                                ToolButtonMain { self.expression.append("8") }  .basicKeyStyle("8")
                                ToolButtonMain { self.expression.append("9") }  .basicKeyStyle("9")
                                ToolButtonMain { self.expression.append("+") }  .opKeyStyle("+")
                                ToolButtonMain { self.expression.append("(") }  .opKeyStyle("(")
                                ToolButtonMain { self.expression.append(")") }  .opKeyStyle(")")
                                ToolButtonMain { self.expression.append("sqrt(") } .fnKeyStyle("sqrt")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { self.expression.append("4") }  .basicKeyStyle("4")
                                ToolButtonMain { self.expression.append("5") }  .basicKeyStyle("5")
                                ToolButtonMain { self.expression.append("6") }  .basicKeyStyle("6")
                                ToolButtonMain { self.expression.append("-") }  .opKeyStyle("-")
                                ToolButtonMain { self.expression.append("[") }  .opKeyStyle("[")
                                ToolButtonMain { self.expression.append("]") }  .opKeyStyle("]")
                                ToolButtonMain { self.expression.append("pow(") } .fnKeyStyle("pow")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { self.expression.append("1") }  .basicKeyStyle("1")
                                ToolButtonMain { self.expression.append("2") }  .basicKeyStyle("2")
                                ToolButtonMain { self.expression.append("3") }  .basicKeyStyle("3")
                                ToolButtonMain { self.expression.append("/") }  .opKeyStyle("/")
                                ToolButtonMain { self.expression.append("{") }  .opKeyStyle("{")
                                ToolButtonMain { self.expression.append("}") }  .opKeyStyle("}")
                                ToolButtonMain { self.expression.append("log(") } .fnKeyStyle("log")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { self.expression.append("0") }  .basicKeyStyle("0")
                                ToolButtonMain { self.expression.append(".") }  .opKeyStyle(".")
                                ToolButtonMain { self.expression.append("=") }  .opKeyStyle("=")
                                ToolButtonMain { self.expression.append("*") }  .opKeyStyle("*")
                                ToolButtonMain { self.expression.append("|") }  .opKeyStyle("|")
                                ToolButtonMain { self.expression.append("^") }  .opKeyStyle("^")
                                ToolButtonMain { self.expression.append("ln(") } .fnKeyStyle("ln")
                            }
                        }
                        .padding(.trailing, 20)
                        
                        if terminalState == "funcs" {
                            VStack(spacing: 4) {
                                HStack(spacing: 4) {
                                    ToolButtonMain { self.expression.append("sin(") } .fnKeyStyle("sin")
                                    ToolButtonMain { self.expression.append("cos(") } .fnKeyStyle("cos")
                                    ToolButtonMain { self.expression.append("tan(") } .fnKeyStyle("tan")
                                }
                                HStack(spacing: 4) {
                                    ToolButtonMain { self.expression.append("sec(") } .fnKeyStyle("sec")
                                    ToolButtonMain { self.expression.append("csc(") } .fnKeyStyle("csc")
                                    ToolButtonMain { self.expression.append("cot(") } .fnKeyStyle("cot")
                                }
                                HStack(spacing: 4) {
                                    ToolButtonMain { self.expression.append("asin(") } .fnKeyStyle("asin")
                                    ToolButtonMain { self.expression.append("acos(") } .fnKeyStyle("acos")
                                    ToolButtonMain { self.expression.append("atan(") } .fnKeyStyle("atan")
                                }
                                HStack(spacing: 4) {
                                    ToolButtonMain { self.expression.append("asec(") } .fnKeyStyle("asec")
                                    ToolButtonMain { self.expression.append("acsc(") } .fnKeyStyle("acsc")
                                    ToolButtonMain { self.expression.append("acot(") } .fnKeyStyle("acot")
                                }
                            }
                            .padding(.trailing, 20)
                        }
                        
                        if terminalState == "consts" {
                            VStack(spacing: 4) {
                                HStack(spacing: 4) {
                                    ToolButtonMain { self.expression.append("\(Double.pi)") } .fnKeyStyle("π")
                                    ToolButtonMain { self.expression.append("\(2 * Double.pi)") } .fnKeyStyle("τ")
                                    ToolButtonMain { self.expression.append("\(M_E)") } .fnKeyStyle("e")
                                }
                                HStack(spacing: 4) {
                                    ToolButtonMain { self.expression.append("0.0000000000667430") } .fnKeyStyle("G")
                                    ToolButtonMain { self.expression.append("299792458") } .fnKeyStyle("c")
                                    ToolButtonMain { self.expression.append("0.000000000000000000000000000000000662607015") } .fnKeyStyle("h")
                                }
                                HStack(spacing: 4) {
                                    ToolButtonMain { self.expression.append("0.00000000000000000000001380649") } .fnKeyStyle("k")
                                    ToolButtonMain { self.expression.append("0.0000000000088541878128") } .fnKeyStyle("ε0")
                                    ToolButtonMain { self.expression.append("0.00000125663706212") } .fnKeyStyle("μ0")
                                }
                                HStack(spacing: 4) {
                                    ToolButtonMain { self.expression.append("602214076000000000000000") } .fnKeyStyle("NA")
                                    ToolButtonMain { self.expression.append("8.314462618") } .fnKeyStyle("R")
                                    ToolButtonMain { self.expression.append("0.000000000000000000000000000000910938356") } .fnKeyStyle("me")
                                }
                            }
                            .padding(.trailing, 20)
                        }
                        
                        VStack(spacing: 4) {
                            HStack(spacing: 4) {
                                ToolButtonMain { self.expression.append("x") }  .basicKeyStyle("x")
                                ToolButtonMain { self.expression.append("a") }  .basicKeyStyle("a")
                                ToolButtonMain {
                                    if !self.expression.isEmpty { self.expression.removeLast() }
                                } .wideKeyStyle("⌫")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { self.expression.append("y") }  .basicKeyStyle("y")
                                ToolButtonMain { self.expression.append("b") }  .basicKeyStyle("b")
                                ToolButtonMain {
                                    self.expression = ""
                                } .wideKeyStyle("Clear")
                            }
                            HStack(spacing: 4) {
                                ToolButtonMain { self.expression.append("z") }  .basicKeyStyle("z")
                                ToolButtonMain { self.expression.append("c") }  .basicKeyStyle("c")
                                ToolButtonMain {
                                    handleEnter()
                                } .wideKeyStyle("Enter")
                            }
                        }
                    }
                    .padding(.vertical, 12)
                }
                .padding(.horizontal, 30)
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
                .containerHelper(backgroundColor: Color(hex: 0xc6c6c6), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                .overlay(Rectangle().frame(width: 4.0).foregroundColor(Color.black.opacity(1.0)), alignment: .trailing)
            }
            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
        }
        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio), height: (geometry.size.height - 50) * 0.9)
    }
    
    private func handleEnter() {
        guard !expression.isEmpty else { return }
        
        let originalExpression = expression
        var result = ""
        
        if expression.contains("=") {
            result = solveEquation(expression)
        } else {
            let prepared = prepareExpressionPart(expression)
            if let expr = createExpressionSafely(prepared), let calcResult = expr.expressionValue(with: nil, context: nil) as? NSNumber {
                result = calcResult.stringValue
            } else {
                result = "Error"
            }
        }
        
        history.append((expression: originalExpression, result: result))
        
        expression = ""
    }
}
