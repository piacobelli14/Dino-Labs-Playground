//
//  DinoLabsTerminal.swift
//
//  Created by Peter Iacobelli on 2/25/25.
//

import SwiftUI
import Combine
import AppKit

struct TerminalView: View {
    var username: String
    var rootDirectory: String
    var showFullRoot: Bool
    @State private var textBuffer: String = ""
    @State private var oldTextBuffer: String = ""
    @State private var lastPromptLocation: Int = 0
    @State private var process: Process?
    @State private var pty: PTY?
    
    private var prompt: String {
        let displayPath: String
        if showFullRoot {
            displayPath = rootDirectory
        } else {
            displayPath = rootDirectory.split(separator: "/").last.map(String.init) ?? rootDirectory
        }
        return "\(username)@DinoLabsPlayground \(displayPath) % "
    }
    
    var body: some View {
        HStack {
            Spacer()
            TerminalEditor(text: $textBuffer, onTextChange: handleTextChange)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundColor(.white.opacity(0.8))
                .onAppear {
                    self.pty = PTY()
                    if let pty = self.pty {
                        let task = Process()
                        task.launchPath = "/bin/bash"
                        task.arguments = ["-l"]
                        let slaveFileHandle = FileHandle(fileDescriptor: pty.slaveFD, closeOnDealloc: false)
                        task.standardInput = slaveFileHandle
                        task.standardOutput = slaveFileHandle
                        task.standardError = slaveFileHandle
                        do {
                            try task.run()
                            self.process = task
                        } catch {
                            self.textBuffer.append("Error launching shell: \(error)\n")
                        }
                        pty.masterFileHandle?.readabilityHandler = { handle in
                            let data = handle.availableData
                            if !data.isEmpty {
                                let output = String(data: data, encoding: .utf8) ?? ""
                                DispatchQueue.main.async {
                                    self.textBuffer.append(output)
                                    self.oldTextBuffer = self.textBuffer
                                    self.lastPromptLocation = self.textBuffer.count
                                }
                            }
                        }
                    }
                    textBuffer = prompt
                    oldTextBuffer = textBuffer
                    lastPromptLocation = textBuffer.count
                }
                .onChange(of: showFullRoot) { newValue in
                    let newPrompt: String = {
                        if newValue {
                            return "\(username)@DinoLabsPlayground \(rootDirectory) % "
                        } else {
                            return "\(username)@DinoLabsPlayground \((rootDirectory.split(separator: "/").last.map(String.init) ?? rootDirectory)) % "
                        }
                    }()
                    textBuffer = newPrompt
                    oldTextBuffer = newPrompt
                    lastPromptLocation = newPrompt.count
                }
            Spacer()
        }
        .padding(.horizontal, 2)
        .padding(.bottom, 6)
    }
    
    private func handleTextChange() {
        let oldPrefix = oldTextBuffer.prefix(lastPromptLocation)
        let newPrefix = textBuffer.prefix(lastPromptLocation)
        if newPrefix != oldPrefix {
            textBuffer = String(oldPrefix + textBuffer.dropFirst(lastPromptLocation))
        }
        if textBuffer.last == "\n" {
            let commandRange = textBuffer.index(textBuffer.startIndex, offsetBy: lastPromptLocation)
                ..< textBuffer.index(before: textBuffer.endIndex)
            
            let command = String(textBuffer[commandRange]).trimmingCharacters(in: .whitespacesAndNewlines)
            runCommand(command)
        }
        oldTextBuffer = textBuffer
    }
    
    private func runCommand(_ command: String) {
        guard let pty = self.pty else {
            textBuffer.append("PTY not initialized.\n" + prompt)
            oldTextBuffer = textBuffer
            lastPromptLocation = textBuffer.count
            return
        }
        if let data = (command + "\n").data(using: .utf8) {
            pty.write(data)
        }
    }
}

struct TerminalEditor: NSViewRepresentable {
    @Binding var text: String
    var onTextChange: () -> Void
    
    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        if let textView = scrollView.documentView as? NSTextView {
            textView.backgroundColor = .clear
            textView.drawsBackground = false
            textView.isRichText = false
            textView.font = .monospacedSystemFont(ofSize: 10, weight: .semibold)
            textView.textColor = .white
            textView.delegate = context.coordinator
            textView.isAutomaticQuoteSubstitutionEnabled = false
            textView.isAutomaticDashSubstitutionEnabled = false
            textView.isAutomaticTextReplacementEnabled = false
            textView.isAutomaticSpellingCorrectionEnabled = false
        }
        return scrollView
    }
    
    func updateNSView(_ nsView: NSScrollView, context: Context) {
        if let textView = nsView.documentView as? NSTextView {
            let attrString = parseANSI(text)
            textView.textStorage?.setAttributedString(attrString)
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, NSTextViewDelegate {
        var parent: TerminalEditor
        
        init(_ parent: TerminalEditor) {
            self.parent = parent
        }
        
        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            parent.text = textView.string
            parent.onTextChange()
        }
    }
}

func runShellCommand(_ command: String) -> String {
    let task = Process()
    let pipe = Pipe()
    task.standardOutput = pipe
    task.standardError = pipe
    task.launchPath = "/bin/bash"
    task.arguments = ["-c", command]
    
    do {
        try task.run()
    } catch {
        return "Error launching process: \(error)\n"
    }
    
    task.waitUntilExit()
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    return String(data: data, encoding: .utf8) ?? ""
}

class PTY {
    private var master: Int32 = -1
    private var slave: Int32 = -1
    private var fileHandle: FileHandle?
    
    init() {
        openpty(&master, &slave, nil, nil, nil)
        fileHandle = FileHandle(fileDescriptor: master, closeOnDealloc: true)
    }
    
    func readData() -> Data {
        return fileHandle?.availableData ?? Data()
    }
    
    func write(_ data: Data) {
        fileHandle?.write(data)
    }
    
    var masterFileHandle: FileHandle? {
        return fileHandle
    }
    
    var slaveFD: Int32 {
        return slave
    }
    
    deinit {
        close(master)
        close(slave)
    }
}

func colorFrom256Color(_ index: Int) -> NSColor {
    if index < 0 || index > 255 {
        return NSColor.white
    }
    if index < 16 {
        switch index {
        case 0: return NSColor.black
        case 1: return NSColor.red
        case 2: return NSColor.green
        case 3: return NSColor.yellow
        case 4: return NSColor.blue
        case 5: return NSColor.magenta
        case 6: return NSColor.cyan
        case 7: return NSColor.white
        case 8: return NSColor.darkGray
        case 9: return NSColor.systemRed
        case 10: return NSColor.systemGreen
        case 11: return NSColor.systemYellow
        case 12: return NSColor.systemBlue
        case 13: return NSColor.systemPink
        case 14: return NSColor.systemTeal
        case 15: return NSColor.white
        default: return NSColor.white
        }
    } else if index < 232 {
        let idx = index - 16
        let r = CGFloat((idx / 36) % 6) / 5.0
        let g = CGFloat((idx / 6) % 6) / 5.0
        let b = CGFloat(idx % 6) / 5.0
        return NSColor(calibratedRed: r, green: g, blue: b, alpha: 1.0)
    } else {
        let gray = CGFloat(index - 232) / 23.0
        return NSColor(white: gray, alpha: 1.0)
    }
}

func parseANSI(_ string: String) -> NSAttributedString {
    let attributed = NSMutableAttributedString()
    let regexPattern = "\u{001B}\\[[0-9;]*m"
    guard let regex = try? NSRegularExpression(pattern: regexPattern, options: []) else {
         return NSAttributedString(string: string)
    }
    var currentAttributes: [NSAttributedString.Key: Any] = [
       .font: NSFont.monospacedSystemFont(ofSize: 10, weight: .semibold),
       .foregroundColor: NSColor.white,
       .backgroundColor: NSColor.clear
    ]
    var lastIndex = string.startIndex
    let nsString = string as NSString
    let matches = regex.matches(in: string, options: [], range: NSRange(location: 0, length: nsString.length))
    for match in matches {
         guard let range = Range(match.range, in: string) else { continue }
         let precedingText = String(string[lastIndex..<range.lowerBound])
         let attrPrecedingText = NSAttributedString(string: precedingText, attributes: currentAttributes)
         attributed.append(attrPrecedingText)
         let codeString = String(string[range])
         let trimmed = codeString.dropFirst(2).dropLast()
         let codeValues = trimmed.split(separator: ";").compactMap { Int($0) }
         var i = 0
         while i < codeValues.count {
             let code = codeValues[i]
             switch code {
             case 0:
                 currentAttributes[.font] = NSFont.monospacedSystemFont(ofSize: 10, weight: .semibold)
                 currentAttributes[.foregroundColor] = NSColor.white
                 currentAttributes[.backgroundColor] = NSColor.clear
                 currentAttributes[.underlineStyle] = nil
                 currentAttributes[.strikethroughStyle] = nil
             case 1:
                 if let font = currentAttributes[.font] as? NSFont {
                     currentAttributes[.font] = NSFontManager.shared.convert(font, toHaveTrait: .boldFontMask)
                 }
             case 2:
                 currentAttributes[.foregroundColor] = (currentAttributes[.foregroundColor] as? NSColor)?.withAlphaComponent(0.6)
             case 3:
                 if let font = currentAttributes[.font] as? NSFont {
                     currentAttributes[.font] = NSFontManager.shared.convert(font, toHaveTrait: .italicFontMask)
                 }
             case 4:
                 currentAttributes[.underlineStyle] = NSUnderlineStyle.single.rawValue
             case 5, 6:
                 break
             case 7:
                 let fg = currentAttributes[.foregroundColor] as? NSColor ?? NSColor.white
                 let bg = currentAttributes[.backgroundColor] as? NSColor ?? NSColor.clear
                 currentAttributes[.foregroundColor] = bg
                 currentAttributes[.backgroundColor] = fg
             case 8:
                 currentAttributes[.foregroundColor] = NSColor.clear
             case 9:
                 currentAttributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
             case 21:
                 if let font = currentAttributes[.font] as? NSFont {
                     currentAttributes[.font] = NSFontManager.shared.convert(font, toNotHaveTrait: .boldFontMask)
                 }
             case 22:
                 if let font = currentAttributes[.font] as? NSFont {
                     currentAttributes[.font] = NSFont.monospacedSystemFont(ofSize: 10, weight: .semibold)
                 }
                 currentAttributes[.foregroundColor] = (currentAttributes[.foregroundColor] as? NSColor)?.withAlphaComponent(1.0)
             case 23:
                 if let font = currentAttributes[.font] as? NSFont {
                     currentAttributes[.font] = NSFontManager.shared.convert(font, toNotHaveTrait: .italicFontMask)
                 }
             case 24:
                 currentAttributes[.underlineStyle] = nil
             case 25:
                 break
             case 27:
                 break
             case 28:
                 break
             case 29:
                 currentAttributes[.strikethroughStyle] = nil
             case 30...37:
                 let colors: [NSColor] = [.black, .red, .green, .yellow, .blue, .magenta, .cyan, .white]
                 currentAttributes[.foregroundColor] = colors[code - 30]
             case 38:
                 if i + 1 < codeValues.count {
                     let mode = codeValues[i + 1]
                     if mode == 5, i + 2 < codeValues.count {
                         let colorIndex = codeValues[i + 2]
                         currentAttributes[.foregroundColor] = colorFrom256Color(colorIndex)
                         i += 2
                     } else if mode == 2, i + 4 < codeValues.count {
                         let r = CGFloat(codeValues[i + 2]) / 255.0
                         let g = CGFloat(codeValues[i + 3]) / 255.0
                         let b = CGFloat(codeValues[i + 4]) / 255.0
                         currentAttributes[.foregroundColor] = NSColor(calibratedRed: r, green: g, blue: b, alpha: 1.0)
                         i += 4
                     }
                 }
             case 39:
                 currentAttributes[.foregroundColor] = NSColor.white
             case 40...47:
                 let colors: [NSColor] = [.black, .red, .green, .yellow, .blue, .magenta, .cyan, .white]
                 currentAttributes[.backgroundColor] = colors[code - 40]
             case 48:
                 if i + 1 < codeValues.count {
                     let mode = codeValues[i + 1]
                     if mode == 5, i + 2 < codeValues.count {
                         let colorIndex = codeValues[i + 2]
                         currentAttributes[.backgroundColor] = colorFrom256Color(colorIndex)
                         i += 2
                     } else if mode == 2, i + 4 < codeValues.count {
                         let r = CGFloat(codeValues[i + 2]) / 255.0
                         let g = CGFloat(codeValues[i + 3]) / 255.0
                         let b = CGFloat(codeValues[i + 4]) / 255.0
                         currentAttributes[.backgroundColor] = NSColor(calibratedRed: r, green: g, blue: b, alpha: 1.0)
                         i += 4
                     }
                 }
             case 49:
                 currentAttributes[.backgroundColor] = NSColor.clear
             case 90...97:
                 let brightColors: [NSColor] = [.darkGray, .systemRed, .systemGreen, .systemYellow, .systemBlue, .systemPink, .systemTeal, .white]
                 currentAttributes[.foregroundColor] = brightColors[code - 90]
             case 100...107:
                 let brightColors: [NSColor] = [.darkGray, .systemRed, .systemGreen, .systemYellow, .systemBlue, .systemPink, .systemTeal, .white]
                 currentAttributes[.backgroundColor] = brightColors[code - 100]
             default:
                 break
             }
             i += 1
         }
         lastIndex = range.upperBound
    }
    let remainingText = String(string[lastIndex..<string.endIndex])
    let attrRemainingText = NSAttributedString(string: remainingText, attributes: currentAttributes)
    attributed.append(attrRemainingText)
    
    return attributed
}
