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

    init(fileURL: URL) {
        self.fileURL = fileURL
        loadFile()
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

    private let lineNumberWidth: CGFloat = 60
    private let columnWidth: CGFloat = 100
    private let cellHeight: CGFloat = 25
    private let minimumColumns = 15

    init(
        geometry: GeometryProxy,
        fileURL: URL,
        leftPanelWidthRatio: Binding<CGFloat>,
        hasUnsavedChanges: Binding<Bool>
    ) {
        self.geometry = geometry
        self.fileURL = fileURL
        self._leftPanelWidthRatio = leftPanelWidthRatio
        self._hasUnsavedChanges = hasUnsavedChanges
        _dataSource = StateObject(wrappedValue: RawCSV(fileURL: fileURL))
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
    
    private var headerView: some View {
        ZStack(alignment: .leading) {
            HStack(spacing: 0) {
                Color.clear
                    .frame(width: lineNumberWidth, height: cellHeight)
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
                                .stroke(Color.gray, lineWidth: 1)
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
                    if editedCell?.row == rowIndex && editedCell?.column == col {
                        TextField("", text: Binding(
                            get: { cellText },
                            set: { newValue in
                                while dataSource.rows[rowIndex].count <= col {
                                    dataSource.rows[rowIndex].append("")
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
                    } else {
                        if isCellHighlighted(row: rowIndex, col: col),
                           let start = selectionStart,
                           let end = selectionEnd {
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

                        } else {
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
