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
            if textView.string != text {
                textView.string = text
            }
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
