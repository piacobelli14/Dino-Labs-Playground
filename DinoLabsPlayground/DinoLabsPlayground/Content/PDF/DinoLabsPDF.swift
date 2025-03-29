//
//  DinoLabsPDF.swift
//
//  Created by Peter Iacobelli on 3/29/25.
//

import SwiftUI
import AppKit
import PDFKit

struct PDFKitRepresentedView: NSViewRepresentable {
    let fileURL: URL
    @Binding var pdfView: PDFKit.PDFView?

    func makeNSView(context: Context) -> PDFKit.PDFView {
        let pdfView = PDFKit.PDFView()
        pdfView.autoScales = true
        if let document = PDFKit.PDFDocument(url: fileURL) {
            pdfView.document = document
        }
        DispatchQueue.main.async {
            self.pdfView = pdfView
        }
        return pdfView
    }

    func updateNSView(_ nsView: PDFKit.PDFView, context: Context) {
        if let document = PDFKit.PDFDocument(url: fileURL) {
            nsView.document = document
        }
    }
}

struct PDFView: View {
    let geometry: GeometryProxy
    let fileURL: URL
    @Binding var fileContent: String
    @Binding var leftPanelWidthRatio: CGFloat
    @Binding var hasUnsavedChanges: Bool
    @State private var showFileMenu = false
    @State private var labelRects: [CGRect] = Array(repeating: .zero, count: 6)
    @State private var searchState: Bool = false
    @State private var searchCaseSensitive: Bool = true
    @State private var searchQuery: String = ""
    @State private var currentSearchMatch: Int = 0
    @State private var totalSearchMatches: Int = 0
    @State private var searchMatches: [(PDFPage, NSRange)] = []
    @State private var searchHighlightAnnotations: [PDFAnnotation] = []
    @State private var pdfKitView: PDFKit.PDFView? = nil

    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    HStack {
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
                                        .containerHelper(backgroundColor: showFileMenu ? Color.white.opacity(0.1) : Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 2, topRight: 2, bottomLeft: 0, bottomRight: 0, shadowColor: .white.opacity(showFileMenu ? 0.0 : 0.5), shadowRadius: 0.5, shadowX: 0, shadowY: 0)
                                        .hoverEffect(opacity: 0.8, cursor: .pointingHand)
                                        .background(GeometryReader { g in
                                            Color.clear
                                                .onAppear {
                                                    labelRects[0] = g.frame(in: .named("MenuBar"))
                                                }
                                                .onChange(of: g.size) { _ in
                                                    labelRects[0] = g.frame(in: .named("MenuBar"))
                                                }
                                        })
                                        .onTapGesture {
                                            showFileMenu.toggle()
                                        }
                                    Spacer()
                                }
                            }
                        }
                        .padding(.vertical, 10)
                        HStack(spacing: 0) {
                            HStack(spacing: 0) {
                                PDFTextField(placeholder: "Search file...", text: $searchQuery, onReturnKeyPressed: {
                                    jumpToNextSearchMatch()
                                })
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .textFieldStyle(PlainTextFieldStyle())
                                .foregroundColor(.white)
                                .font(.system(size: 8, weight: .semibold))
                                .padding(.horizontal, 10)
                                .frame(width: 100, height: 25)
                                .containerHelper(backgroundColor: Color.clear, borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 0, bottomLeft: 2, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                                .hoverEffect(opacity: 0.8)
                                .onChange(of: searchQuery) { _ in
                                    performSearch()
                                }
                                HStack {
                                    PDFButtonMain {
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
                                    PDFButtonMain {
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
                                    PDFButtonMain {
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
                                            .foregroundColor(searchCaseSensitive ? Color(hex: 0x5C2BE2) : Color(hex: 0xf5f5f5))
                                            .allowsHitTesting(false)
                                    )
                                    .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
                                }
                                .padding(.horizontal, 10)
                                .frame(width: 60, height: 25)
                                .containerHelper(backgroundColor: Color.clear, borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 0, topRight: 2, bottomLeft: 0, bottomRight: 2, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                                .containerHelper(backgroundColor: Color.clear, borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 0, topRight: 2, bottomLeft: 0, bottomRight: 2, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            }
                            .frame(width: 220, height: 25)
                            .containerHelper(backgroundColor: Color.clear, borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 8, shadowX: 0, shadowY: 0)
                        }
                        .padding(.vertical, 10)
                    }
                    .padding(.horizontal, 20)
                    .containerHelper(backgroundColor: Color(hex: 0x171717).opacity(0.9), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                }
                .padding(.horizontal, 10)
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio), height: 80)
                .containerHelper(backgroundColor: Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                HStack(spacing: 0) {
                    PDFKitRepresentedView(fileURL: fileURL, pdfView: $pdfKitView)
                }
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
                .containerHelper(backgroundColor: Color(hex: 0x202020), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
            }
            if showFileMenu {
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture {
                        showFileMenu = false
                    }
                    .ignoresSafeArea()
            }
            if showFileMenu {
                VStack(spacing: 0) {
                    PDFButtonMain {
                        downloadFile()
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                .containerHelper(backgroundColor: Color(hex: 0x181818), borderColor: Color(hex: 0x262626), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 6, bottomRight: 6, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                .position(x: labelRects[0].minX + 80, y: labelRects[0].maxY + 100)
            }
        }
        .coordinateSpace(name: "MenuBar")
    }

    private func clearSearchResults() {
        if let pdfView = pdfKitView, let document = pdfView.document {
            for pageIndex in 0..<document.pageCount {
                if let page = document.page(at: pageIndex) {
                    for annotation in searchHighlightAnnotations {
                        page.removeAnnotation(annotation)
                    }
                }
            }
        }
        searchHighlightAnnotations.removeAll()
        searchMatches.removeAll()
        currentSearchMatch = 0
        totalSearchMatches = 0
    }

    private func performSearch() {
        guard !searchQuery.isEmpty, let pdfView = pdfKitView, let document = pdfView.document else {
            clearSearchResults()
            return
        }
        clearSearchResults()
        let options: NSString.CompareOptions = searchCaseSensitive ? [] : [.caseInsensitive]
        for pageIndex in 0..<document.pageCount {
            guard let page = document.page(at: pageIndex), let pageString = page.string else { continue }
            let nsString = pageString as NSString
            var searchRange = NSRange(location: 0, length: nsString.length)
            while true {
                let foundRange = nsString.range(of: searchQuery, options: options, range: searchRange)
                if foundRange.location != NSNotFound {
                    searchMatches.append((page, foundRange))
                    if let selection = page.selection(for: foundRange) {
                        let lineSelections = selection.selectionsByLine() ?? [selection]
                        for lineSelection in lineSelections {
                            let bounds = lineSelection.bounds(for: page)
                            let annotation = PDFAnnotation(bounds: bounds, forType: .highlight, withProperties: nil)
                            annotation.color = NSColor.yellow.withAlphaComponent(0.5)
                            page.addAnnotation(annotation)
                            searchHighlightAnnotations.append(annotation)
                        }
                    }
                    let newLocation = foundRange.location + foundRange.length
                    if newLocation < nsString.length {
                        searchRange = NSRange(location: newLocation, length: nsString.length - newLocation)
                    } else {
                        break
                    }
                } else {
                    break
                }
            }
        }
        totalSearchMatches = searchMatches.count
        currentSearchMatch = totalSearchMatches > 0 ? 1 : 0
    }

    private func jumpToNextSearchMatch() {
        guard !searchMatches.isEmpty, let pdfView = pdfKitView else { return }
        currentSearchMatch = currentSearchMatch % totalSearchMatches + 1
        let (page, range) = searchMatches[currentSearchMatch - 1]
        if let selection = page.selection(for: range) {
            pdfView.setCurrentSelection(selection, animate: true)
            pdfView.scrollSelectionToVisible(selection)
        }
    }

    private func jumpToPreviousSearchMatch() {
        guard !searchMatches.isEmpty, let pdfView = pdfKitView else { return }
        currentSearchMatch = (currentSearchMatch - 2 + totalSearchMatches) % totalSearchMatches + 1
        let (page, range) = searchMatches[currentSearchMatch - 1]
        if let selection = page.selection(for: range) {
            pdfView.setCurrentSelection(selection, animate: true)
            pdfView.scrollSelectionToVisible(selection)
        }
    }

    private func downloadFile() {
        let panel = NSSavePanel()
        panel.title = "Save PDF File"
        panel.nameFieldStringValue = fileURL.lastPathComponent
        panel.allowedFileTypes = ["pdf"]
        if panel.runModal() == .OK, let destinationURL = panel.url {
            do {
                try FileManager.default.copyItem(at: fileURL, to: destinationURL)
            } catch {}
        }
    }
}
