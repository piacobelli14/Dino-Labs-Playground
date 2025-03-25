//
//  DinoLabsTabular.swift
//
//  Created by Peter Iacobelli on 2/25/25.
//

import SwiftUI
import AppKit

class RawCSV: ObservableObject {
    @Published var rows: [[String]] = []
    var fileURL: URL

    init(fileURL: URL, fileContent: Binding<String>) {
        self.fileURL = fileURL
        if fileContent.wrappedValue.isEmpty {
            loadFile()
        }
    }

    func loadFile() {
        DispatchQueue.global(qos: .background).async {
            guard let fileHandle = try? FileHandle(forReadingFrom: self.fileURL) else { return }
            defer { try? fileHandle.close() }
            let delimiter = "\n".data(using: .utf8)!
            var buffer = Data()
            var newRows: [[String]] = []
            let batchSize = 50
            var finished = false
            while !finished {
                autoreleasepool {
                    do {
                        if let chunk = try fileHandle.read(upToCount: 4096), !chunk.isEmpty {
                            buffer.append(chunk)
                            while let range = buffer.range(of: delimiter) {
                                let lineData = buffer.subdata(in: 0..<range.lowerBound)
                                buffer.removeSubrange(0..<range.upperBound)
                                if let line = String(data: lineData, encoding: .utf8), !line.isEmpty {
                                    let row = line.components(separatedBy: ",")
                                    newRows.append(row)
                                    if newRows.count >= batchSize {
                                        let batch = newRows
                                        newRows.removeAll()
                                        DispatchQueue.main.async {
                                            self.rows.append(contentsOf: batch)
                                        }
                                    }
                                }
                            }
                        } else {
                            finished = true
                        }
                    } catch {
                        finished = true
                    }
                }
            }
            if !buffer.isEmpty, let line = String(data: buffer, encoding: .utf8), !line.isEmpty {
                let row = line.components(separatedBy: ",")
                newRows.append(row)
            }
            if !newRows.isEmpty {
                let batch = newRows
                DispatchQueue.main.async {
                    self.rows.append(contentsOf: batch)
                }
            }
        }
    }
}

struct TabularView: View {
    let geometry: GeometryProxy
    let fileURL: URL
    @Binding var fileContent: String
    @Binding var leftPanelWidthRatio: CGFloat
    @Binding var hasUnsavedChanges: Bool
    @StateObject private var dataSource: RawCSV
    @State private var editedCell: (row: Int, column: Int)? = nil
    @State private var selectionStart: (row: Int, col: Int)? = nil
    @State private var selectionEnd: (row: Int, col: Int)? = nil
    @State private var resizing: Bool = false
    @State private var initialBox: (minRow: Int, maxRow: Int, minCol: Int, maxCol: Int)? = nil
    @State private var isDraggingNewHighlight: Bool = false
    @State private var isDraggingColumns: Bool = false
    @State private var isDraggingRows: Bool = false
    @State private var dragStartColumn: Int? = nil
    @State private var dragStartRow: Int? = nil
    @State private var showFileMenu = false
    @State private var showEditMenu = false
    @State private var labelRects: [CGRect] = Array(repeating: .zero, count: 6)
    @State private var copyIcon = "square.on.square"
    @State private var searchState: Bool = false {
        didSet {
            if searchState {
                editedCell = nil
                selectionStart = nil
                selectionEnd = nil
            }
        }
    }
    @State private var replaceState: Bool = false {
        didSet {
            if replaceState {
                editedCell = nil
                selectionStart = nil
                selectionEnd = nil
            }
        }
    }
    @State private var searchCaseSensitive: Bool = true
    @State private var searchQuery: String = ""
    @State private var replaceQuery: String = ""
    @State private var isReplacing: Bool = false
    @State private var currentSearchMatch: Int = 0
    @State private var totalSearchMatches: Int = 0
    @State private var searchMatches: [NSRange] = []
    @State private var keyMonitor: Any? = nil
    @State private var undoStack: [[(row: Int, column: Int, oldValue: String, newValue: String)]] = []
    @State private var redoStack: [[(row: Int, column: Int, oldValue: String, newValue: String)]] = []
    @State private var clipboardData: [[String]] = []
    private let lineNumberWidth: CGFloat = 60
    private let columnWidth: CGFloat = 100
    private let cellHeight: CGFloat = 25
    private let minimumColumns = 15

    init(
        geometry: GeometryProxy,
        fileURL: URL,
        fileContent: Binding<String>,
        leftPanelWidthRatio: Binding<CGFloat>,
        hasUnsavedChanges: Binding<Bool>
    ) {
        self.geometry = geometry
        self.fileURL = fileURL
        self._fileContent = fileContent
        self._leftPanelWidthRatio = leftPanelWidthRatio
        self._hasUnsavedChanges = hasUnsavedChanges
        _dataSource = StateObject(wrappedValue: RawCSV(fileURL: fileURL, fileContent: fileContent))
    }

    private func columnIndexFromX(_ x: CGFloat) -> Int {
        let offsetX = x - lineNumberWidth
        if offsetX < 0 {
            return 0
        }
        let col = Int(floor(offsetX / columnWidth))
        return max(0, min(col, displayedColumnCount - 1))
    }

    private func rowIndexFromY(_ y: CGFloat) -> Int {
        let offsetY = y - cellHeight
        if offsetY < 0 {
            return 0
        }
        let row = Int(floor(offsetY / cellHeight))
        return max(0, min(row, dataSource.rows.count - 1))
    }

    private var actualColumnCount: Int {
        dataSource.rows.map { $0.count }.max() ?? 0
    }

    private var displayedColumnCount: Int {
        max(actualColumnCount, minimumColumns)
    }

    private func columnName(for index: Int) -> String {
        var index = index
        var name = ""
        repeat {
            let letter = Character(UnicodeScalar(65 + (index % 26))!)
            name = String(letter) + name
            index = index / 26 - 1
        } while index >= 0
        return name
    }

    private func isCellHighlighted(row: Int, col: Int) -> Bool {
        if let start = selectionStart, let end = selectionEnd {
            let minRow = min(start.row, end.row)
            let maxRow = max(start.row, end.row)
            let minCol = min(start.col, end.col)
            let maxCol = max(start.col, end.col)
            return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
        }
        return false
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: 0) {
                topBar
                tableArea
            }
            
            if showFileMenu || showEditMenu {
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture {
                        showFileMenu = false
                        showEditMenu = false
                    }
                    .ignoresSafeArea()
            }
            fileMenuView
            editMenuView
        }
        .coordinateSpace(name: "MenuBar")
        .onReceive(NotificationCenter.default.publisher(for: .performSingleReplacementText)) { notification in
            guard let userInfo = notification.userInfo,
                  let search = userInfo["search"] as? String,
                  let replacement = userInfo["replacement"] as? String,
                  let caseSensitive = userInfo["caseSensitive"] as? Bool else { return }
            doSingleReplacement(search: search, replacement: replacement, caseSensitive: caseSensitive)
        }
        .onReceive(NotificationCenter.default.publisher(for: .performReplaceAllText)) { notification in
            guard let userInfo = notification.userInfo,
                  let search = userInfo["search"] as? String,
                  let replacement = userInfo["replacement"] as? String,
                  let caseSensitive = userInfo["caseSensitive"] as? Bool else { return }
            doReplaceAll(search: search, replacement: replacement, caseSensitive: caseSensitive)
        }
        .onReceive(NotificationCenter.default.publisher(for: .requestUndo)) { _ in
            guard !undoStack.isEmpty else { return }
            let group = undoStack.removeLast()
            redoStack.append(group)
            for change in group.reversed() {
                dataSource.rows[change.row][change.column] = change.oldValue
            }
            hasUnsavedChanges = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .requestRedo)) { _ in
            guard !redoStack.isEmpty else { return }
            let group = redoStack.removeLast()
            undoStack.append(group)
            for change in group {
                dataSource.rows[change.row][change.column] = change.newValue
            }
            hasUnsavedChanges = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .requestCopy)) { _ in
            guard let start = selectionStart, let end = selectionEnd else { return }
            let minRow = min(start.row, end.row)
            let maxRow = max(start.row, end.row)
            let minCol = min(start.col, end.col)
            let maxCol = max(start.col, end.col)
            var tempClipboard: [[String]] = []
            for r in minRow...maxRow {
                var rowSlice: [String] = []
                for c in minCol...maxCol {
                    if r < dataSource.rows.count && c < dataSource.rows[r].count {
                        rowSlice.append(dataSource.rows[r][c])
                    } else {
                        rowSlice.append("")
                    }
                }
                tempClipboard.append(rowSlice)
            }
            clipboardData = tempClipboard
        }
        .onReceive(NotificationCenter.default.publisher(for: .requestPaste)) { _ in
            guard !clipboardData.isEmpty else { return }
            guard let start = selectionStart, let end = selectionEnd else { return }
            let anchorRow = min(start.row, end.row)
            let anchorCol = min(start.col, end.col)
            var pasteGroup: [(row: Int, column: Int, oldValue: String, newValue: String)] = []
            for (rIndex, rowSlice) in clipboardData.enumerated() {
                for (cIndex, value) in rowSlice.enumerated() {
                    let targetRow = anchorRow + rIndex
                    let targetCol = anchorCol + cIndex
                    if targetRow < dataSource.rows.count {
                        while dataSource.rows[targetRow].count <= targetCol {
                            dataSource.rows[targetRow].append("")
                        }
                        let oldValue = dataSource.rows[targetRow][targetCol]
                        if oldValue != value {
                            pasteGroup.append((row: targetRow, column: targetCol, oldValue: oldValue, newValue: value))
                        }
                        dataSource.rows[targetRow][targetCol] = value
                    }
                }
            }
            if !pasteGroup.isEmpty {
                undoStack.append(pasteGroup)
                redoStack.removeAll()
            }
            hasUnsavedChanges = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .requestCut)) { _ in
            guard let start = selectionStart, let end = selectionEnd else { return }
            let minRow = min(start.row, end.row)
            let maxRow = max(start.row, end.row)
            let minCol = min(start.col, end.col)
            let maxCol = max(start.col, end.col)
            var cutGroup: [(row: Int, column: Int, oldValue: String, newValue: String)] = []
            for r in minRow...maxRow {
                if r < dataSource.rows.count {
                    for c in minCol...maxCol {
                        while dataSource.rows[r].count <= c {
                            dataSource.rows[r].append("")
                        }
                        let oldValue = dataSource.rows[r][c]
                        if oldValue != "" {
                            cutGroup.append((row: r, column: c, oldValue: oldValue, newValue: ""))
                        }
                        dataSource.rows[r][c] = ""
                    }
                }
            }
            if !cutGroup.isEmpty {
                undoStack.append(cutGroup)
                redoStack.removeAll()
            }
            hasUnsavedChanges = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .requestSelectAll)) { _ in
            if !searchState && !replaceState {
                selectionStart = (0, 0)
                selectionEnd = (dataSource.rows.count - 1, displayedColumnCount - 1)
                editedCell = nil
            }
        }
        .onAppear {
            keyMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown]) { event in
                if event.modifierFlags.contains(.command),
                   event.charactersIgnoringModifiers == "f" {
                    if !searchState && !replaceState {
                        searchState = true
                    }
                    return nil
                }
                else if event.modifierFlags.contains(.command),
                        event.charactersIgnoringModifiers == "s" {
                    saveFile()
                    return nil
                }
                else if event.modifierFlags.contains(.command),
                        event.charactersIgnoringModifiers == "z" {
                    NotificationCenter.default.post(name: .requestUndo, object: nil)
                    return nil
                }
                else if event.modifierFlags.contains(.command),
                        event.charactersIgnoringModifiers == "y" {
                    NotificationCenter.default.post(name: .requestRedo, object: nil)
                    return nil
                }
                else if event.modifierFlags.contains(.command),
                        event.charactersIgnoringModifiers == "c" {
                    NotificationCenter.default.post(name: .requestCopy, object: nil)
                    return nil
                }
                else if event.modifierFlags.contains(.command),
                        event.charactersIgnoringModifiers == "v" {
                    NotificationCenter.default.post(name: .requestPaste, object: nil)
                    return nil
                }
                else if event.modifierFlags.contains(.command),
                        event.charactersIgnoringModifiers == "x" {
                    NotificationCenter.default.post(name: .requestCut, object: nil)
                    return nil
                }
                else if event.modifierFlags.contains(.command),
                        event.charactersIgnoringModifiers == "a" {
                    if !searchState && !replaceState {
                        selectionStart = (0, 0)
                        selectionEnd = (dataSource.rows.count - 1, displayedColumnCount - 1)
                        editedCell = nil
                    }
                    return nil
                }
                return event
            }
        }
        .onDisappear {
            if let keyMonitor = keyMonitor {
                NSEvent.removeMonitor(keyMonitor)
            }
            keyMonitor = nil
        }
        .onAppear {
            if !fileContent.isEmpty {
                let parsedRows = fileContent.components(separatedBy: "\n").filter { !$0.isEmpty }.map { $0.components(separatedBy: ",") }
                dataSource.rows = parsedRows
            }
        }
        .onDisappear {
            let rowsCopy = dataSource.rows
            var csvString = ""
            for row in rowsCopy {
                let csvRow = row.map { escapeCSV($0) }.joined(separator: ",")
                csvString.append(csvRow + "\n")
            }
            fileContent = csvString
        }
    }
    
    private var topBar: some View {
        HStack(spacing: 0) {
            HStack {
                if !searchState && !replaceState {
                    HStack(spacing: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(fileURL.lastPathComponent)
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(Color.white.opacity(0.7))
                                .shadow(color: .white.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                .padding(.leading, 6)
                                .padding(.bottom, 8)
                            
                            HStack(spacing: 0) {
                                Text("File")
                                    .lineLimit(1)
                                    .truncationMode(.tail)
                                    .padding(.horizontal, 8)
                                    .padding(.top, 3)
                                    .padding(.bottom, 5)
                                    .font(.system(size: 11, weight: showFileMenu ? .semibold : .regular))
                                    .foregroundColor(showFileMenu ? Color.white.opacity(0.8) : Color.white.opacity(0.5))
                                    .containerHelper(
                                        backgroundColor: showFileMenu ? Color.white.opacity(0.1) : Color.clear,
                                        borderColor: Color.clear,
                                        borderWidth: 0,
                                        topLeft: 2, topRight: 2, bottomLeft: 0, bottomRight: 0,
                                        shadowColor: .white.opacity(showFileMenu ? 0.0 : 0.5),
                                        shadowRadius: 0.5,
                                        shadowX: 0, shadowY: 0
                                    )
                                    .hoverEffect(opacity: 0.8, cursor: .pointingHand)
                                    .background(
                                        GeometryReader { g in
                                            Color.clear
                                                .onAppear {
                                                    labelRects[0] = g.frame(in: .named("MenuBar"))
                                                }
                                                .onChange(of: g.size) { _ in
                                                    labelRects[0] = g.frame(in: .named("MenuBar"))
                                                }
                                        }
                                    )
                                    .onTapGesture {
                                        showFileMenu.toggle()
                                        showEditMenu = false
                                    }
                                
                                Text("Edit")
                                    .lineLimit(1)
                                    .truncationMode(.tail)
                                    .padding(.horizontal, 8)
                                    .padding(.top, 3)
                                    .padding(.bottom, 5)
                                    .font(.system(size: 11, weight: showEditMenu ? .semibold : .regular))
                                    .foregroundColor(showEditMenu ? Color.white.opacity(0.8) : Color.white.opacity(0.5))
                                    .containerHelper(
                                        backgroundColor: showEditMenu ? Color.white.opacity(0.1) : Color.clear,
                                        borderColor: Color.clear,
                                        borderWidth: 0,
                                        topLeft: 2, topRight: 2, bottomLeft: 0, bottomRight: 0,
                                        shadowColor: .white.opacity(showEditMenu ? 0.0 : 0.5),
                                        shadowRadius: 0.5,
                                        shadowX: 0, shadowY: 0
                                    )
                                    .hoverEffect(opacity: 0.8, cursor: .pointingHand)
                                    .background(
                                        GeometryReader { g in
                                            Color.clear
                                                .onAppear {
                                                    labelRects[1] = g.frame(in: .named("MenuBar"))
                                                }
                                                .onChange(of: g.size) { _ in
                                                    labelRects[1] = g.frame(in: .named("MenuBar"))
                                                }
                                        }
                                    )
                                    .onTapGesture {
                                        showEditMenu.toggle()
                                        showFileMenu = false
                                    }
                                
                                Spacer()
                            }
                        }
                    }
                    .padding(.vertical, 10)
                }
                else if searchState || replaceState {
                    searchReplaceBar
                }
                
                Spacer()
                
                HStack(spacing: 8) {
                    TextButtonMain {
                        if !searchState {
                            searchState = true
                            replaceState = false
                        } else {
                            searchState = false
                            replaceState = false
                            searchQuery = ""
                            replaceQuery = ""
                            clearSearchResults()
                            NotificationCenter.default.post(
                                name: .updateSearchHighlighting,
                                object: nil,
                                userInfo: ["searchQuery": "", "searchCaseSensitive": searchCaseSensitive]
                            )
                        }
                    }
                    .containerHelper(backgroundColor: searchState ? Color(hex: 0xAD6ADD) : Color(hex: 0x414141),
                                     borderColor: Color(hex: 0x414141),
                                     borderWidth: 1,
                                     topLeft: 2, topRight: 2,
                                     bottomLeft: 2, bottomRight: 2,
                                     shadowColor: Color(hex: 0x222222),
                                     shadowRadius: 0.5,
                                     shadowX: 0, shadowY: 0)
                    .frame(width: 20, height: 20)
                    .overlay(
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                            .allowsHitTesting(false)
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    
                    TextButtonMain {
                        if !replaceState {
                            replaceState = true
                            searchState = false
                        } else {
                            replaceState = false
                            searchState = false
                            searchQuery = ""
                            replaceQuery = ""
                            clearSearchResults()
                            NotificationCenter.default.post(
                                name: .updateSearchHighlighting,
                                object: nil,
                                userInfo: ["searchQuery": "", "searchCaseSensitive": searchCaseSensitive]
                            )
                        }
                    }
                    .containerHelper(backgroundColor: replaceState ? Color(hex: 0xAD6ADD) : Color(hex: 0x414141),
                                     borderColor: Color(hex: 0x414141),
                                     borderWidth: 1,
                                     topLeft: 2, topRight: 2,
                                     bottomLeft: 2, bottomRight: 2,
                                     shadowColor: Color(hex: 0x222222),
                                     shadowRadius: 0.5,
                                     shadowX: 0, shadowY: 0)
                    .frame(width: 20, height: 20)
                    .overlay(
                        Image(systemName: "text.magnifyingglass")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                            .allowsHitTesting(false)
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestUndo, object: nil)
                    }
                    .containerHelper(backgroundColor: Color(hex: 0x414141),
                                     borderColor: Color(hex: 0x414141),
                                     borderWidth: 1,
                                     topLeft: 2, topRight: 2,
                                     bottomLeft: 2, bottomRight: 2,
                                     shadowColor: Color(hex: 0x222222),
                                     shadowRadius: 0.5,
                                     shadowX: 0, shadowY: 0)
                    .frame(width: 20, height: 20)
                    .overlay(
                        Image(systemName: "arrow.uturn.backward")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                            .allowsHitTesting(false)
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestRedo, object: nil)
                    }
                    .containerHelper(backgroundColor: Color(hex: 0x414141),
                                     borderColor: Color(hex: 0x414141),
                                     borderWidth: 1,
                                     topLeft: 2, topRight: 2,
                                     bottomLeft: 2, bottomRight: 2,
                                     shadowColor: Color(hex: 0x222222),
                                     shadowRadius: 0.5,
                                     shadowX: 0, shadowY: 0)
                    .frame(width: 20, height: 20)
                    .overlay(
                        Image(systemName: "arrow.uturn.forward")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                            .allowsHitTesting(false)
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                }
                .padding(.vertical, 10)
            }
            .padding(.horizontal, 20)
            .containerHelper(backgroundColor: Color(hex: 0x171717).opacity(0.9),
                             borderColor: Color.clear,
                             borderWidth: 0,
                             topLeft: 0, topRight: 0,
                             bottomLeft: 0, bottomRight: 0,
                             shadowColor: Color.clear,
                             shadowRadius: 0,
                             shadowX: 0, shadowY: 0)
        }
        .padding(.horizontal, 10)
        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio), height: 80)
        .containerHelper(
            backgroundColor: Color(hex: 0x171717),
            borderColor: Color.clear,
            borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
            shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
        )
    }
    
    private var searchReplaceBar: some View {
        HStack(spacing: 0) {
            HStack(spacing: 0) {
                TextTextField(
                    placeholder: "Search file...",
                    text: $searchQuery,
                    onReturnKeyPressed: {
                        jumpToNextSearchMatch()
                    }
                )
                .lineLimit(1)
                .truncationMode(.tail)
                .textFieldStyle(PlainTextFieldStyle())
                .foregroundColor(.white)
                .font(.system(size: 8, weight: .semibold))
                .padding(.horizontal, 10)
                .frame(width: 100, height: 25)
                .containerHelper(backgroundColor: Color.clear,
                                 borderColor: Color(hex: 0x616161),
                                 borderWidth: 1,
                                 topLeft: 2, topRight: 0,
                                 bottomLeft: 2, bottomRight: 0,
                                 shadowColor: .clear,
                                 shadowRadius: 0,
                                 shadowX: 0, shadowY: 0)
                .hoverEffect(opacity: 0.8)
                .onChange(of: searchQuery) { _ in
                    performSearch()
                }
                
                HStack {
                    TextButtonMain {
                        jumpToNextSearchMatch()
                    }
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .textFieldStyle(PlainTextFieldStyle())
                    .foregroundColor(.white)
                    .overlay(
                        Image(systemName: "arrow.down")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(Color(hex: 0xf5f5f5))
                            .allowsHitTesting(false)
                    )
                    .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
                    
                    TextButtonMain {
                        jumpToPreviousSearchMatch()
                    }
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .textFieldStyle(PlainTextFieldStyle())
                    .foregroundColor(.white)
                    .overlay(
                        Image(systemName: "arrow.up")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(Color(hex: 0xf5f5f5))
                            .allowsHitTesting(false)
                    )
                    .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
                    
                    TextButtonMain {
                        searchCaseSensitive.toggle()
                        performSearch()
                    }
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .textFieldStyle(PlainTextFieldStyle())
                    .foregroundColor(.white)
                    .overlay(
                        Image(systemName: "a.square.fill")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(searchCaseSensitive ? Color(hex: 0x5C2BE2)
                                                               : Color(hex: 0xf5f5f5))
                            .allowsHitTesting(false)
                    )
                    .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
                }
                .padding(.horizontal, 10)
                .frame(width: 60, height: 25)
                .containerHelper(backgroundColor: Color.clear,
                                 borderColor: Color(hex: 0x616161),
                                 borderWidth: 1,
                                 topLeft: 0, topRight: 2,
                                 bottomLeft: 0, bottomRight: 2,
                                 shadowColor: .clear,
                                 shadowRadius: 0,
                                 shadowX: 0, shadowY: 0)
                
                HStack {
                    Text("\(currentSearchMatch) of \(totalSearchMatches)")
                        .foregroundColor(.white)
                        .font(.system(size: 8, weight: .semibold))
                        .frame(width: 60, height: 25)
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .padding(.leading, 8)
                    Spacer()
                }
                .padding(.horizontal, 10)
                .frame(width: 60, height: 25)
                .containerHelper(backgroundColor: Color.clear,
                                 borderColor: Color(hex: 0x616161),
                                 borderWidth: 1,
                                 topLeft: 0, topRight: 2,
                                 bottomLeft: 0, bottomRight: 2,
                                 shadowColor: .clear,
                                 shadowRadius: 0,
                                 shadowX: 0, shadowY: 0)
            }
            .frame(width: 220, height: 25)
            .containerHelper(backgroundColor: Color.clear,
                             borderColor: Color(hex: 0x616161),
                             borderWidth: 1,
                             topLeft: 2, topRight: 2,
                             bottomLeft: 2, bottomRight: 2,
                             shadowColor: Color.white.opacity(0.5),
                             shadowRadius: 8,
                             shadowX: 0, shadowY: 0)
            
            if replaceState {
                HStack(spacing: 0) {
                    TextTextField(placeholder: "Replace with...", text: $replaceQuery)
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .textFieldStyle(PlainTextFieldStyle())
                        .foregroundColor(.white)
                        .font(.system(size: 8, weight: .semibold))
                        .padding(.horizontal, 10)
                        .frame(width: 100, height: 25)
                        .containerHelper(backgroundColor: Color.clear,
                                         borderColor: Color(hex: 0x616161),
                                         borderWidth: 1,
                                         topLeft: 2, topRight: 0,
                                         bottomLeft: 2, bottomRight: 0,
                                         shadowColor: .clear,
                                         shadowRadius: 0,
                                         shadowX: 0, shadowY: 0)
                        .hoverEffect(opacity: 0.8)
                    HStack {
                        TextButtonMain {
                            NotificationCenter.default.post(
                                name: .performSingleReplacementText,
                                object: nil,
                                userInfo: [
                                    "search": searchQuery,
                                    "replacement": replaceQuery,
                                    "caseSensitive": searchCaseSensitive
                                ]
                            )
                        }
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .textFieldStyle(PlainTextFieldStyle())
                        .foregroundColor(.white)
                        .overlay(
                            Image(systemName: "square.fill")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundColor(Color(hex: 0xf5f5f5))
                                .allowsHitTesting(false)
                        )
                        .hoverEffect(opacity: 0.6,
                                     scale: 1.05,
                                     cursor: .pointingHand)
                        
                        TextButtonMain {
                            NotificationCenter.default.post(
                                name: .performReplaceAllText,
                                object: nil,
                                userInfo: [
                                    "search": searchQuery,
                                    "replacement": replaceQuery,
                                    "caseSensitive": searchCaseSensitive
                                ]
                            )
                        }
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .textFieldStyle(PlainTextFieldStyle())
                        .foregroundColor(.white)
                        .overlay(
                            Image(systemName: "square.grid.3x1.below.line.grid.1x2")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundColor(Color(hex: 0xf5f5f5))
                                .allowsHitTesting(false)
                        )
                        .hoverEffect(opacity: 0.6,
                                     scale: 1.05,
                                     cursor: .pointingHand)
                    }
                    .padding(.horizontal, 10)
                    .frame(width: 60, height: 25)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color(hex: 0x616161),
                                     borderWidth: 1,
                                     topLeft: 0, topRight: 2,
                                     bottomLeft: 0, bottomRight: 2,
                                     shadowColor: .clear,
                                     shadowRadius: 0,
                                     shadowX: 0, shadowY: 0)
                }
                .frame(width: 160, height: 25)
                .containerHelper(backgroundColor: Color.clear,
                                 borderColor: Color(hex: 0x616161),
                                 borderWidth: 1,
                                 topLeft: 2, topRight: 2,
                                 bottomLeft: 2, bottomRight: 2,
                                 shadowColor: Color.white.opacity(0.5),
                                 shadowRadius: 8,
                                 shadowX: 0, shadowY: 0)
                .padding(.leading, 10)
            }
        }
        .padding(.vertical, 10)
    }
    
    private var tableArea: some View {
        HStack(spacing: 0) {
            ScrollView([.horizontal, .vertical]) {
                LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                    Section(header: headerView) {
                        ForEach(dataSource.rows.indices, id: \.self) { rowIndex in
                            rowView(rowIndex: rowIndex)
                        }
                    }
                }
                .simultaneousGesture(
                    DragGesture(minimumDistance: 1)
                        .onChanged { value in
                            guard !searchState && !replaceState else { return }
                            if resizing { return }
                            editedCell = nil

                            let localX = value.location.x
                            let localY = value.location.y

                            if localY <= cellHeight && localX >= lineNumberWidth {
                                let cIndex = columnIndexFromX(localX)
                                if !isDraggingColumns {
                                    isDraggingColumns = true
                                    dragStartColumn = cIndex
                                    selectionStart = (0, cIndex)
                                    selectionEnd = (dataSource.rows.count - 1, cIndex)
                                } else if let startCol = dragStartColumn {
                                    let minCol = min(startCol, cIndex)
                                    let maxCol = max(startCol, cIndex)
                                    selectionStart = (0, minCol)
                                    selectionEnd = (dataSource.rows.count - 1, maxCol)
                                }
                                return
                            }

                            if localX <= lineNumberWidth && localY >= cellHeight {
                                let rIndex = rowIndexFromY(localY)
                                if !isDraggingRows {
                                    isDraggingRows = true
                                    dragStartRow = rIndex
                                    selectionStart = (rIndex, 0)
                                    selectionEnd = (rIndex, displayedColumnCount - 1)
                                } else if let startRow = dragStartRow {
                                    let minRow = min(startRow, rIndex)
                                    let maxRow = max(startRow, rIndex)
                                    selectionStart = (minRow, 0)
                                    selectionEnd = (maxRow, displayedColumnCount - 1)
                                }
                                return
                            }

                            if !isDraggingNewHighlight {
                                isDraggingNewHighlight = true
                                selectionStart = nil
                                selectionEnd = nil
                            }

                            let rIndex = rowIndexFromY(localY)
                            let cIndex = columnIndexFromX(localX)

                            if selectionStart == nil {
                                selectionStart = (row: rIndex, col: cIndex)
                            }
                            selectionEnd = (row: rIndex, col: cIndex)
                        }
                        .onEnded { _ in
                            guard !searchState && !replaceState else { return }
                            isDraggingNewHighlight = false
                            isDraggingColumns = false
                            isDraggingRows = false
                            dragStartColumn = nil
                            dragStartRow = nil
                        }
                )
            }
            .coordinateSpace(name: "TableScroll")
        }
        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
        .containerHelper(
            backgroundColor: Color(hex: 0x202020),
            borderColor: Color.clear,
            borderWidth: 0,
            topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
            shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
        )
    }
    
    private var fileMenuView: some View {
        Group {
            if showFileMenu {
                VStack(spacing: 0) {
                    TextButtonMain {
                        saveFile()
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color.clear,
                                     borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear,
                                     shadowRadius: 0, shadowX: 0, shadowY: 0)
                    .overlay(
                        HStack {
                            Image(systemName: "arrow.down.doc.fill")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 10, height: 10)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.leading, 8)
                                .padding(.trailing, 4)
                                .allowsHitTesting(false)
                            Text("Save File")
                                .foregroundColor(.white.opacity(0.8))
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .allowsHitTesting(false)
                            Spacer()
                        }
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                        alignment: .bottom
                    )
                    
                    TextButtonMain {
                        downloadFile()
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color.clear,
                                     borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear,
                                     shadowRadius: 0,
                                     shadowX: 0, shadowY: 0)
                    .overlay(
                        HStack {
                            Image(systemName: "square.and.arrow.down.on.square.fill")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 10, height: 10)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.leading, 8)
                                .padding(.trailing, 4)
                                .allowsHitTesting(false)
                            Text("Download File")
                                .foregroundColor(.white.opacity(0.8))
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .allowsHitTesting(false)
                            Spacer()
                        }
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                        alignment: .bottom
                    )
                    
                    Spacer()
                }
                .frame(width: 160, height: 200)
                .containerHelper(
                    backgroundColor: Color(hex: 0x181818),
                    borderColor: Color(hex: 0x262626),
                    borderWidth: 1, topLeft: 2, topRight: 2,
                    bottomLeft: 6, bottomRight: 6,
                    shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0
                )
                .position(
                    x: labelRects[0].minX + 80,
                    y: labelRects[0].maxY + 100
                )
            }
        }
    }
    
    private var editMenuView: some View {
        Group {
            if showEditMenu {
                VStack(spacing: 0) {
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestUndo, object: nil)
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color.clear,
                                     borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear,
                                     shadowRadius: 0,
                                     shadowX: 0, shadowY: 0)
                    .overlay(
                        HStack {
                            Image(systemName: "arrow.uturn.backward")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 10, height: 10)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.leading, 8)
                                .padding(.trailing, 4)
                                .allowsHitTesting(false)
                            Text("Undo")
                                .foregroundColor(.white.opacity(0.8))
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .allowsHitTesting(false)
                            Spacer()
                        }
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                        alignment: .bottom
                    )
                    
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestRedo, object: nil)
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color.clear,
                                     borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear,
                                     shadowRadius: 0,
                                     shadowX: 0, shadowY: 0)
                    .overlay(
                        HStack {
                            Image(systemName: "arrow.uturn.forward")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 10, height: 10)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.leading, 8)
                                .padding(.trailing, 4)
                                .allowsHitTesting(false)
                            Text("Redo")
                                .foregroundColor(.white.opacity(0.8))
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .allowsHitTesting(false)
                            Spacer()
                        }
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                        alignment: .bottom
                    )
                    
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestCut, object: nil)
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color.clear,
                                     borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear,
                                     shadowRadius: 0,
                                     shadowX: 0, shadowY: 0)
                    .overlay(
                        HStack {
                            Image(systemName: "scissors")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 10, height: 10)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.leading, 8)
                                .padding(.trailing, 4)
                                .allowsHitTesting(false)
                            Text("Cut")
                                .foregroundColor(.white.opacity(0.8))
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .allowsHitTesting(false)
                            Spacer()
                        }
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                        alignment: .bottom
                    )
                    
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestCopy, object: nil)
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color.clear,
                                     borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear,
                                     shadowRadius: 0,
                                     shadowX: 0, shadowY: 0)
                    .overlay(
                        HStack {
                            Image(systemName: "square.on.square")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 10, height: 10)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.leading, 8)
                                .padding(.trailing, 4)
                                .allowsHitTesting(false)
                            Text("Copy")
                                .foregroundColor(.white.opacity(0.8))
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .allowsHitTesting(false)
                            Spacer()
                        }
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                        alignment: .bottom
                    )
                    
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestPaste, object: nil)
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color.clear,
                                     borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear,
                                     shadowRadius: 0,
                                     shadowX: 0, shadowY: 0)
                    .overlay(
                        HStack {
                            Image(systemName: "doc.on.clipboard.fill")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 10, height: 10)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.leading, 8)
                                .padding(.trailing, 4)
                                .allowsHitTesting(false)
                            Text("Paste")
                                .foregroundColor(.white.opacity(0.8))
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .allowsHitTesting(false)
                            Spacer()
                        }
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                        alignment: .bottom
                    )
                    
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestSelectAll, object: nil)
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear,
                                     borderColor: Color.clear,
                                     borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear,
                                     shadowRadius: 0,
                                     shadowX: 0, shadowY: 0)
                    .overlay(
                        HStack {
                            Image(systemName: "cursorarrow.motionlines")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 10, height: 10)
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.leading, 8)
                                .padding(.trailing, 4)
                                .allowsHitTesting(false)
                            Text("Select All")
                                .foregroundColor(.white.opacity(0.8))
                                .font(.system(size: 9, weight: .semibold))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .allowsHitTesting(false)
                            Spacer()
                        }
                    )
                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                    .overlay(
                        Rectangle()
                            .frame(height: 0.5)
                            .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                        alignment: .bottom
                    )
                    
                    Spacer()
                }
                .frame(width: 160, height: 200)
                .containerHelper(
                    backgroundColor: Color(hex: 0x181818),
                    borderColor: Color(hex: 0x262626),
                    borderWidth: 1,
                    topLeft: 2, topRight: 2,
                    bottomLeft: 6, bottomRight: 6,
                    shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0
                )
                .position(
                    x: labelRects[1].minX + 80,
                    y: labelRects[1].maxY + 100
                )
            }
        }
    }
    
    private var headerView: some View {
        ZStack(alignment: .leading) {
            HStack(spacing: 0) {
                Color.clear
                    .frame(width: lineNumberWidth, height: cellHeight)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        guard !searchState && !replaceState else { return }
                        if let start = selectionStart, let end = selectionEnd,
                           start.row == 0, start.col == 0,
                           end.row == dataSource.rows.count - 1, end.col == displayedColumnCount - 1 {
                            selectionStart = nil
                            selectionEnd = nil
                        } else {
                            selectionStart = (0, 0)
                            selectionEnd = (dataSource.rows.count - 1, displayedColumnCount - 1)
                        }
                        editedCell = nil
                    }
                
                ForEach(0..<displayedColumnCount, id: \.self) { col in
                    Text(columnName(for: col))
                        .padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4))
                        .frame(width: columnWidth, height: cellHeight)
                        .overlay(Rectangle().stroke(Color.gray, lineWidth: 0.5))
                        .background(Color(hex: 0x333333))
                        .foregroundColor(Color(hex: 0xf5f5f5))
                        .font(.system(size: 12, weight: .semibold))
                        .contentShape(Rectangle())
                        .onTapGesture {
                            guard !searchState && !replaceState else { return }
                            editedCell = nil
                            let shiftPressed = NSEvent.modifierFlags.contains(.shift)
                            if shiftPressed {
                                if let start = selectionStart {
                                    let minCol = min(start.col, col)
                                    let maxCol = max(start.col, col)
                                    selectionStart = (0, minCol)
                                    selectionEnd = (dataSource.rows.count - 1, maxCol)
                                } else {
                                    selectionStart = (0, col)
                                    selectionEnd = (dataSource.rows.count - 1, col)
                                }
                            } else {
                                selectionStart = (0, col)
                                selectionEnd = (dataSource.rows.count - 1, col)
                            }
                        }
                }
            }
            GeometryReader { geo in
                Text("")
                    .frame(width: lineNumberWidth, height: cellHeight)
                    .background(
                        ZStack {
                            Color(hex: 0x262626)
                            Rectangle()
                                .overlay(Rectangle().stroke(Color.gray, lineWidth: 0.5))
                                .foregroundColor(.clear)
                        }
                    )
                    .foregroundColor(.white)
                    .font(.headline)
                    .offset(x: -min(geo.frame(in: .named("TableScroll")).minX, 0))
                    .zIndex(1)
            }
            .frame(width: lineNumberWidth, height: cellHeight)
        }
        .frame(height: cellHeight)
    }

    private func rowView(rowIndex: Int) -> some View {
        ZStack(alignment: .leading) {
            HStack(spacing: 0) {
                Color.clear
                    .frame(width: lineNumberWidth, height: cellHeight)
                
                let rowData = dataSource.rows[rowIndex]
                ForEach(0..<displayedColumnCount, id: \.self) { col in
                    let cellText = rowData.indices.contains(col) ? rowData[col] : ""
                    
                    if (searchState || replaceState) {
                        if let matchIndex = searchMatchIndex(row: rowIndex, col: col) {
                            Text(cellText)
                                .font(.system(size: 11, weight: .regular))
                                .padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4))
                                .frame(width: columnWidth, height: cellHeight)
                                .background(Color(hex: 0xFFA500).opacity(0.1))
                                .overlay(
                                    matchIndex == currentSearchMatch
                                    ? Rectangle().stroke(Color(hex: 0xFFA500), lineWidth: 2.5)
                                    : nil
                                )
                                .overlay(Rectangle().stroke(Color.gray, lineWidth: 0.5))
                        } else {
                            Text(cellText)
                                .font(.system(size: 11, weight: .regular))
                                .padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4))
                                .frame(width: columnWidth, height: cellHeight)
                                .overlay(Rectangle().stroke(Color.gray, lineWidth: 0.5))
                        }
                    }
                    else {
                        if editedCell?.row == rowIndex && editedCell?.column == col {
                            TextField("", text: Binding(
                                get: { cellText },
                                set: { newValue in
                                    while dataSource.rows[rowIndex].count <= col {
                                        dataSource.rows[rowIndex].append("")
                                    }
                                    let oldValue = dataSource.rows[rowIndex][col]
                                    if newValue != oldValue {
                                        undoStack.append([(row: rowIndex, column: col, oldValue: oldValue, newValue: newValue)])
                                        redoStack.removeAll()
                                    }
                                    dataSource.rows[rowIndex][col] = newValue
                                    hasUnsavedChanges = true
                                }
                            ))
                            .textFieldStyle(PlainTextFieldStyle())
                            .font(.system(size: 12, weight: .regular))
                            .padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4))
                            .frame(width: columnWidth, height: cellHeight)
                            .background(Color.blue.opacity(0.1))
                            .overlay(Rectangle().stroke(Color.blue, lineWidth: 2.5))
                            .onSubmit {
                                editedCell = nil
                            }
                            .onAppear {
                                if cellText.isEmpty {
                                    while dataSource.rows[rowIndex].count <= col {
                                        dataSource.rows[rowIndex].append("")
                                    }
                                }
                            }
                        }
                        else if let matchIndex = searchMatchIndex(row: rowIndex, col: col) {
                            Text(cellText)
                                .font(.system(size: 11, weight: .regular))
                                .padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4))
                                .frame(width: columnWidth, height: cellHeight)
                                .background(Color(hex: 0xFFA500).opacity(0.1))
                                .overlay(
                                    matchIndex == currentSearchMatch
                                    ? Rectangle().stroke(Color(hex: 0xFFA500), lineWidth: 2.5)
                                    : nil
                                )
                                .overlay(Rectangle().stroke(Color.gray, lineWidth: 0.5))
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    let shiftPressed = NSEvent.modifierFlags.contains(.shift)
                                    if shiftPressed {
                                        if let _ = selectionStart {
                                            selectionEnd = (rowIndex, col)
                                        } else {
                                            selectionStart = (rowIndex, col)
                                            selectionEnd = (rowIndex, col)
                                        }
                                    } else {
                                        if let start = selectionStart, let end = selectionEnd {
                                            let minRow = min(start.row, end.row)
                                            let maxRow = max(start.row, end.row)
                                            let minCol = min(start.col, end.col)
                                            let maxCol = max(start.col, end.col)
                                            if !(rowIndex >= minRow && rowIndex <= maxRow && col >= minCol && col <= maxCol) {
                                                selectionStart = nil
                                                selectionEnd = nil
                                            }
                                        }
                                        editedCell = (rowIndex, col)
                                        selectionStart = (rowIndex, col)
                                        selectionEnd = (rowIndex, col)
                                    }
                                }
                        }
                        else if isCellHighlighted(row: rowIndex, col: col) {
                            let start = selectionStart!
                            let end = selectionEnd!
                            let minRow = min(start.row, end.row)
                            let maxRow = max(start.row, end.row)
                            let minCol = min(start.col, end.col)
                            let maxCol = max(start.col, end.col)

                            Text(cellText)
                                .font(.system(size: 11, weight: .regular))
                                .padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4))
                                .frame(width: columnWidth, height: cellHeight)
                                .background(Color(hex: 0x008000).opacity(0.1))
                                .contentShape(Rectangle())
                                .overlay(alignment: .top) {
                                    if rowIndex == minRow {
                                        Rectangle()
                                            .foregroundColor(Color(hex: 0x008000))
                                            .frame(height: 2.5)
                                    }
                                }
                                .overlay(alignment: .bottom) {
                                    if rowIndex == maxRow {
                                        Rectangle()
                                            .foregroundColor(Color(hex: 0x008000))
                                            .frame(height: 2.5)
                                    }
                                }
                                .overlay(alignment: .leading) {
                                    if col == minCol {
                                        Rectangle()
                                            .foregroundColor(Color(hex: 0x008000))
                                            .frame(width: 2.5)
                                    }
                                }
                                .overlay(alignment: .trailing) {
                                    if col == maxCol {
                                        Rectangle()
                                            .foregroundColor(Color(hex: 0x008000))
                                            .frame(width: 2.5)
                                    }
                                }
                                .overlay(Rectangle().stroke(Color.gray, lineWidth: 0.5))
                                .onTapGesture {
                                    let shiftPressed = NSEvent.modifierFlags.contains(.shift)
                                    if shiftPressed {
                                        selectionEnd = (rowIndex, col)
                                    } else {
                                        if let start = selectionStart, let end = selectionEnd {
                                            let minRow = min(start.row, end.row)
                                            let maxRow = max(start.row, end.row)
                                            let minCol = min(start.col, end.col)
                                            let maxCol = max(start.col, end.col)
                                            if !(rowIndex >= minRow && rowIndex <= maxRow && col >= minCol && col <= maxCol) {
                                                selectionStart = nil
                                                selectionEnd = nil
                                            }
                                        }
                                        editedCell = (rowIndex, col)
                                        selectionStart = (rowIndex, col)
                                        selectionEnd = (rowIndex, col)
                                    }
                                }
                        }
                        else {
                            Text(cellText)
                                .font(.system(size: 11, weight: .regular))
                                .padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4))
                                .frame(width: columnWidth, height: cellHeight)
                                .background(Color.clear)
                                .overlay(Rectangle().stroke(Color.gray, lineWidth: 0.5))
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    let shiftPressed = NSEvent.modifierFlags.contains(.shift)
                                    if shiftPressed {
                                        if let _ = selectionStart {
                                            selectionEnd = (rowIndex, col)
                                        } else {
                                            selectionStart = (rowIndex, col)
                                            selectionEnd = (rowIndex, col)
                                        }
                                    } else {
                                        if let start = selectionStart, let end = selectionEnd {
                                            let minRow = min(start.row, end.row)
                                            let maxRow = max(start.row, end.row)
                                            let minCol = min(start.col, end.col)
                                            let maxCol = max(start.col, end.col)
                                            if !(rowIndex >= minRow && rowIndex <= maxRow && col >= minCol && col <= maxCol) {
                                                selectionStart = nil
                                                selectionEnd = nil
                                            }
                                        }
                                        editedCell = (rowIndex, col)
                                        selectionStart = (rowIndex, col)
                                        selectionEnd = (rowIndex, col)
                                    }
                                }
                        }
                    }
                }
            }
            GeometryReader { geo in
                Text("\(rowIndex + 1)")
                    .frame(width: lineNumberWidth, height: cellHeight)
                    .background(
                        ZStack {
                            Color(hex: 0x333333)
                            Rectangle()
                                .overlay(Rectangle().stroke(Color.gray, lineWidth: 0.5))
                                .foregroundColor(.clear)
                        }
                    )
                    .foregroundColor(Color(hex: 0xf5f5f5))
                    .font(.system(size: 12, weight: .semibold))
                    .offset(x: -min(geo.frame(in: .named("TableScroll")).minX, 0))
                    .zIndex(1)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        guard !searchState && !replaceState else { return }
                        editedCell = nil
                        let shiftPressed = NSEvent.modifierFlags.contains(.shift)
                        if shiftPressed {
                            if let start = selectionStart {
                                let minRow = min(start.row, rowIndex)
                                let maxRow = max(start.row, rowIndex)
                                selectionStart = (minRow, 0)
                                selectionEnd = (maxRow, displayedColumnCount - 1)
                            } else {
                                selectionStart = (rowIndex, 0)
                                selectionEnd = (rowIndex, displayedColumnCount - 1)
                            }
                        } else {
                            selectionStart = (rowIndex, 0)
                            selectionEnd = (rowIndex, displayedColumnCount - 1)
                        }
                    }
            }
            .frame(width: lineNumberWidth, height: cellHeight)
        }
        .frame(height: cellHeight)
    }
}

extension TabularView {
    private func searchMatchIndex(row: Int, col: Int) -> Int? {
        for (i, range) in searchMatches.enumerated() {
            if range.location == row && (range.length - 1) == col {
                return i
            }
        }
        return nil
    }

    private func performSearch() {
        searchMatches.removeAll()
        totalSearchMatches = 0
        currentSearchMatch = 0
        guard !searchQuery.isEmpty else { return }
        
        for (rIndex, row) in dataSource.rows.enumerated() {
            for (cIndex, cellValue) in row.enumerated() {
                let cellCheck = searchCaseSensitive ? cellValue : cellValue.lowercased()
                let find = searchCaseSensitive ? searchQuery : searchQuery.lowercased()
                
                if cellCheck.contains(find) {
                    totalSearchMatches += 1
                    searchMatches.append(NSRange(location: rIndex, length: cIndex + 1))
                }
            }
        }
    }
    
    private func jumpToNextSearchMatch() {
        guard !searchMatches.isEmpty else { return }
        currentSearchMatch = (currentSearchMatch + 1) % searchMatches.count
        let range = searchMatches[currentSearchMatch]
        let rowIndex = range.location
        let colIndex = range.length - 1
        
        selectionStart = (rowIndex, colIndex)
        selectionEnd = (rowIndex, colIndex)
    }
    
    private func jumpToPreviousSearchMatch() {
        guard !searchMatches.isEmpty else { return }
        currentSearchMatch = (currentSearchMatch - 1 + searchMatches.count) % searchMatches.count
        let range = searchMatches[currentSearchMatch]
        let rowIndex = range.location
        let colIndex = range.length - 1
        
        selectionStart = (rowIndex, colIndex)
        selectionEnd = (rowIndex, colIndex)
    }
    
    private func clearSearchResults() {
        searchMatches.removeAll()
        currentSearchMatch = 0
        totalSearchMatches = 0
    }
    
    private func doSingleReplacement(search: String, replacement: String, caseSensitive: Bool) {
        guard !search.isEmpty, !searchMatches.isEmpty else { return }
        let range = searchMatches[currentSearchMatch]
        let rowIndex = range.location
        let colIndex = range.length - 1
        guard rowIndex < dataSource.rows.count,
              colIndex < dataSource.rows[rowIndex].count else { return }
        
        let originalValue = dataSource.rows[rowIndex][colIndex]
        if caseSensitive {
            dataSource.rows[rowIndex][colIndex] = originalValue.replacingOccurrences(of: search, with: replacement)
        } else {
            dataSource.rows[rowIndex][colIndex] = replaceIgnoringCase(in: originalValue, search: search, with: replacement)
        }
        
        hasUnsavedChanges = true
        performSearch()
        if !searchMatches.isEmpty {
            if currentSearchMatch >= searchMatches.count {
                currentSearchMatch = searchMatches.count - 1
            }
            let newRange = searchMatches[currentSearchMatch]
            let newRowIndex = newRange.location
            let newColIndex = newRange.length - 1
            selectionStart = (newRowIndex, newColIndex)
            selectionEnd = (newRowIndex, newColIndex)
        }
    }
    
    private func doReplaceAll(search: String, replacement: String, caseSensitive: Bool) {
        guard !search.isEmpty else { return }
        for rIndex in dataSource.rows.indices {
            for cIndex in dataSource.rows[rIndex].indices {
                let originalValue = dataSource.rows[rIndex][cIndex]
                if caseSensitive {
                    dataSource.rows[rIndex][cIndex] = originalValue.replacingOccurrences(of: search, with: replacement)
                } else {
                    dataSource.rows[rIndex][cIndex] = replaceIgnoringCase(in: originalValue, search: search, with: replacement)
                }
            }
        }
        hasUnsavedChanges = true
        clearSearchResults()
        selectionStart = nil
        selectionEnd = nil
    }
    
    private func replaceIgnoringCase(in original: String, search: String, with replacement: String) -> String {
        var result = original
        let lowerSearch = search.lowercased()
        var searchRange = result.startIndex..<result.endIndex
        
        while let range = result.range(of: lowerSearch, options: .caseInsensitive, range: searchRange) {
            result.replaceSubrange(range, with: replacement)
            if let afterRange = result.index(range.lowerBound, offsetBy: replacement.count, limitedBy: result.endIndex) {
                searchRange = afterRange..<result.endIndex
            } else {
                break
            }
        }
        return result
    }
    
    private func saveFile() {
        var csvString = ""
        for row in dataSource.rows {
            let csvRow = row.map { escapeCSV($0) }.joined(separator: ",")
            csvString.append(csvRow + "\n")
        }
        do {
            try csvString.write(to: fileURL, atomically: true, encoding: .utf8)
            hasUnsavedChanges = false
        } catch {}
    }
    
    private func downloadFile() {
        let savePanel = NSSavePanel()
        savePanel.allowedFileTypes = ["csv"]
        savePanel.nameFieldStringValue = fileURL.lastPathComponent
        savePanel.begin { response in
            if response == .OK, let url = savePanel.url {
                var csvString = ""
                for row in dataSource.rows {
                    let csvRow = row.map { escapeCSV($0) }.joined(separator: ",")
                    csvString.append(csvRow + "\n")
                }
                do {
                    try csvString.write(to: url, atomically: true, encoding: .utf8)
                } catch {}
            }
        }
    }

    private func escapeCSV(_ field: String) -> String {
        if field.contains(",") || field.contains("\"") || field.contains("\n") {
            let escapedField = field.replacingOccurrences(of: "\"", with: "\"\"")
            return "\"\(escapedField)\""
        }
        return field
    }
}
