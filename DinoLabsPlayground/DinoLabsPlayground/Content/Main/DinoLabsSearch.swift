
//
//  DinoLabsSearch.swift
//
//  Created by Peter Iacobelli on 2/19/25.
//

import AppKit
import SwiftUI

struct SearchResult: Identifiable, Equatable {
    let id = UUID()
    let fileURL: URL
    let line: String
    let lineNumber: Int
}

struct FileSearchResult: Identifiable, Equatable  {
    let id: URL
    let fileURL: URL
    var results: [SearchResult]
    var isExpanded: Bool = true
}

struct HighlightSegment: Identifiable, Equatable {
    let id = UUID()
    let content: String
    let isMatch: Bool
}

class ClippedSearchResultTextView: NSView {
    var attributedText: NSAttributedString = NSAttributedString(string: "") {
        didSet { needsDisplay = true }
    }
    var searchQuery: String = "" {
        didSet { needsDisplay = true }
    }
    
    let leftPadding: CGFloat = 12
    let rightPadding: CGFloat = 12
    let topPadding: CGFloat = 6
    let bottomPadding: CGFloat = 6
    
    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        let availableWidth = bounds.width - leftPadding - rightPadding
        let availableHeight = bounds.height - topPadding - bottomPadding
        let finalString = ellipsizeIfNeeded(
            fullText: attributedText,
            searchQuery: searchQuery,
            availableWidth: availableWidth
        )
        let finalSize = finalString.boundingRect(with: NSSize(width: .greatestFiniteMagnitude, height: availableHeight), options: [.usesLineFragmentOrigin]).size
        let yOffset = (bounds.height - finalSize.height) / 2
        finalString.draw(at: NSPoint(x: leftPadding, y: yOffset))
    }
    
    private func ellipsizeIfNeeded(
        fullText: NSAttributedString,
        searchQuery: String,
        availableWidth: CGFloat
    ) -> NSAttributedString {
        let fullWidth = measureWidth(of: fullText)
        guard fullWidth > availableWidth, !searchQuery.isEmpty else {
            return trailingEllipsizeIfNeeded(fullText, maxWidth: availableWidth)
        }
        
        let nsString = fullText.string as NSString
        let matchRange = nsString.range(of: searchQuery, options: .caseInsensitive)
        if matchRange.location == NSNotFound {
            return trailingEllipsizeIfNeeded(fullText, maxWidth: availableWidth)
        }
        
        let marginCharacters = 3
        let matchStart = max(0, matchRange.location - marginCharacters)
        let subRange = NSRange(location: matchStart, length: fullText.length - matchStart)
        let subAtt = fullText.attributedSubstring(from: subRange)
        let leadingEllipsis = (matchStart > 0 ? "…" : "")
        let leadingEllipsisAtt = NSAttributedString(
            string: leadingEllipsis,
            attributes: textAttributesFrom(fullText, fallbackFontSize: 9)
        )
        
        let combined = NSMutableAttributedString()
        if leadingEllipsisAtt.length > 0 {
            combined.append(leadingEllipsisAtt)
        }
        combined.append(subAtt)
        
        return trailingEllipsizeIfNeeded(combined, maxWidth: availableWidth)
    }
    
    private func trailingEllipsizeIfNeeded(_ text: NSAttributedString, maxWidth: CGFloat) -> NSAttributedString {
        let width = measureWidth(of: text)
        if width <= maxWidth {
            return text
        }

        let ellipsisAtt = NSAttributedString(
            string: "…",
            attributes: textAttributesFrom(text, fallbackFontSize: 9)
        )
        let truncated = NSMutableAttributedString(attributedString: text)
      
        while truncated.length > 0 {
            truncated.deleteCharacters(in: NSRange(location: truncated.length - 1, length: 1))
            let test = NSMutableAttributedString(attributedString: truncated)
            test.append(ellipsisAtt)
            if measureWidth(of: test) <= maxWidth {
                return test
            }
        }
        
        return ellipsisAtt
    }
    
    private func measureWidth(of attString: NSAttributedString) -> CGFloat {
        let size = attString.boundingRect(
            with: NSSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin]
        ).size
        return size.width
    }
    
    private func textAttributesFrom(_ attString: NSAttributedString, fallbackFontSize: CGFloat) -> [NSAttributedString.Key: Any] {
        if attString.length > 0 {
            let attrs = attString.attributes(at: 0, effectiveRange: nil)
            return attrs
        }
        
        return [
            .font: NSFont.systemFont(ofSize: fallbackFontSize, weight: .semibold),
            .foregroundColor: NSColor.white
        ]
    }
}
class HoverEffectView: NSView {
    var hoverScale: CGFloat = 1.02

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
    }
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        wantsLayer = true
    }
    
    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach { removeTrackingArea($0) }
        let trackingArea = NSTrackingArea(rect: bounds,
                                          options: [.activeInActiveApp, .mouseEnteredAndExited, .inVisibleRect],
                                          owner: self,
                                          userInfo: nil)
        addTrackingArea(trackingArea)
    }
    
    override func layout() {
        super.layout()
        updateTrackingAreas()
    }
    
    override func mouseEntered(with event: NSEvent) {
        layer?.removeAllAnimations()
        CATransaction.begin()
        CATransaction.setAnimationDuration(0.05)
        CATransaction.setAnimationTimingFunction(CAMediaTimingFunction(name: .easeInEaseOut))
        layer?.setAffineTransform(CGAffineTransform(scaleX: hoverScale, y: hoverScale))
        CATransaction.commit()
    }
    
    override func mouseExited(with event: NSEvent) {
        layer?.removeAllAnimations()
        CATransaction.begin()
        CATransaction.setAnimationDuration(0.05)
        CATransaction.setAnimationTimingFunction(CAMediaTimingFunction(name: .easeInEaseOut))
        layer?.setAffineTransform(.identity)
        CATransaction.commit()
    }
    
    override func resetCursorRects() {
        super.resetCursorRects()
        addCursorRect(bounds, cursor: NSCursor.pointingHand)
    }
    
    func resetHoverState() {
        layer?.removeAllAnimations()
        layer?.setAffineTransform(.identity)
    }
}

func generateHighlightedAttributedString(text: String, highlight: String, isCaseSensitive: Bool) -> NSAttributedString {
    let nsText = text as NSString
    let fullRange = NSRange(location: 0, length: nsText.length)
    let attributedString = NSMutableAttributedString(string: text)
    let defaultAttributes: [NSAttributedString.Key: Any] = [
        .foregroundColor: NSColor.white,
        .font: NSFont.systemFont(ofSize: 9, weight: .semibold)
    ]
    attributedString.addAttributes(defaultAttributes, range: fullRange)
    guard !highlight.isEmpty else { return attributedString }
    let options: NSString.CompareOptions = isCaseSensitive ? [] : [.caseInsensitive]
    var searchRange = fullRange
    while true {
        let foundRange = nsText.range(of: highlight, options: options, range: searchRange)
        if foundRange.location != NSNotFound {
            let matchAttributes: [NSAttributedString.Key: Any] = [
                .foregroundColor: NSColor.black,
                .backgroundColor: NSColor.yellow
            ]
            attributedString.addAttributes(matchAttributes, range: foundRange)
            let newLocation = foundRange.location + foundRange.length
            searchRange = NSRange(location: newLocation, length: nsText.length - newLocation)
        } else {
            break
        }
    }
    return attributedString
}

class SearchResultItem: NSCollectionViewItem {
    let clippedTextView = ClippedSearchResultTextView()
    var fileURL: URL?
    var lineNumber: Int?
    var onOpenFile: ((URL, Int?) -> Void)?
    
    override func loadView() {
        self.view = HoverEffectView(frame: .zero)
        if let layer = self.view.layer {
            layer.backgroundColor = NSColor(calibratedRed: 20/255.0,
                                            green: 20/255.0,
                                            blue: 20/255.0,
                                            alpha: 1.0).cgColor
        }
        
        clippedTextView.translatesAutoresizingMaskIntoConstraints = false
        clippedTextView.wantsLayer = false
        view.addSubview(clippedTextView)
        NSLayoutConstraint.activate([
            clippedTextView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            clippedTextView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            clippedTextView.topAnchor.constraint(equalTo: view.topAnchor),
            clippedTextView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        let click = NSClickGestureRecognizer(target: self, action: #selector(cellClicked))
        view.addGestureRecognizer(click)
    }
    
    @objc func cellClicked() {
        if let url = fileURL {
            onOpenFile?(url, lineNumber)
        }
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        (view as? HoverEffectView)?.resetHoverState()
    }
    
    func configure(match: SearchResult, query: String, isCaseSensitive: Bool, fileURL: URL, onOpenFile: @escaping (URL, Int?) -> Void) {
        self.fileURL = fileURL
        self.lineNumber = match.lineNumber
        self.onOpenFile = onOpenFile
        let trimmed = match.line.trimmingCharacters(in: .whitespacesAndNewlines)
        let attributed = generateHighlightedAttributedString(text: trimmed, highlight: query, isCaseSensitive: isCaseSensitive)
        clippedTextView.attributedText = attributed
        clippedTextView.searchQuery = query
    }
}

class SearchResultHeaderView: HoverEffectView {
    let chevronImageView = NSImageView()
    let fileNameField = NSTextField(labelWithString: "")
    let matchCountField = NSTextField(labelWithString: "")
    var toggleAction: (() -> Void)?
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupHeader()
    }
    required init?(coder decoder: NSCoder) {
        super.init(coder: decoder)
        setupHeader()
    }
    
    private func setupHeader() {
        if let layer = self.layer {
            layer.backgroundColor = NSColor(calibratedRed: 23/255.0,
                                            green: 23/255.0,
                                            blue: 23/255.0,
                                            alpha: 1.0).cgColor
        }
        chevronImageView.translatesAutoresizingMaskIntoConstraints = false
        fileNameField.translatesAutoresizingMaskIntoConstraints = false
        matchCountField.translatesAutoresizingMaskIntoConstraints = false
        
        fileNameField.font = NSFont.systemFont(ofSize: 9, weight: .semibold)
        fileNameField.textColor = NSColor.white
        fileNameField.lineBreakMode = .byTruncatingTail
        
        matchCountField.font = NSFont.systemFont(ofSize: 8, weight: .semibold)
        matchCountField.textColor = NSColor.white.withAlphaComponent(0.8)
        matchCountField.lineBreakMode = .byTruncatingTail
        
        addSubview(chevronImageView)
        addSubview(fileNameField)
        addSubview(matchCountField)
        
        NSLayoutConstraint.activate([
            chevronImageView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            chevronImageView.centerYAnchor.constraint(equalTo: centerYAnchor),
            chevronImageView.widthAnchor.constraint(equalToConstant: 6),
            chevronImageView.heightAnchor.constraint(equalToConstant: 6),
            
            fileNameField.leadingAnchor.constraint(equalTo: chevronImageView.trailingAnchor, constant: 6),
            fileNameField.centerYAnchor.constraint(equalTo: centerYAnchor),
            fileNameField.trailingAnchor.constraint(lessThanOrEqualTo: matchCountField.leadingAnchor, constant: -4),
            
            matchCountField.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            matchCountField.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
        
        let click = NSClickGestureRecognizer(target: self, action: #selector(headerClicked))
        addGestureRecognizer(click)
    }
    
    @objc private func headerClicked() {
        toggleAction?()
    }
    
    func configure(fileResult: FileSearchResult) {
        let symbolName = fileResult.isExpanded ? "chevron.down" : "chevron.right"
        if let image = NSImage(systemSymbolName: symbolName, accessibilityDescription: nil) {
            image.isTemplate = true
            chevronImageView.image = image
            chevronImageView.contentTintColor = NSColor.white
        }
        fileNameField.stringValue = fileResult.fileURL.lastPathComponent
        let countText = "(\(fileResult.results.count) match" + (fileResult.results.count == 1 ? "" : "es") + ")"
        matchCountField.stringValue = countText
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        resetHoverState()
    }
}

struct AdvancedVirtualizedSearchResultsView: NSViewRepresentable {
    @Binding var searchResults: [FileSearchResult]
    let searchQuery: String
    let isCaseSensitive: Bool
    let onOpenFile: (URL, Int?) -> Void
    
    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSScrollView(frame: .zero)
        scrollView.drawsBackground = true
        scrollView.backgroundColor = NSColor(calibratedRed: 20/255.0,
                                             green: 20/255.0,
                                             blue: 20/255.0,
                                             alpha: 1.0)
        
        let collectionView = NSCollectionView(frame: .zero)
        collectionView.backgroundColors = [NSColor(calibratedRed: 20/255.0,
                                                   green: 20/255.0,
                                                   blue: 20/255.0,
                                                   alpha: 1.0)]
        
        let layout = NSCollectionViewFlowLayout()
        layout.minimumLineSpacing = 0
        layout.minimumInteritemSpacing = 0
        layout.headerReferenceSize = NSSize(width: 0, height: 32)
        collectionView.collectionViewLayout = layout
        
        collectionView.register(SearchResultItem.self, forItemWithIdentifier: NSUserInterfaceItemIdentifier("SearchResultItem"))
        collectionView.register(SearchResultHeaderView.self, forSupplementaryViewOfKind: NSCollectionView.elementKindSectionHeader, withIdentifier: NSUserInterfaceItemIdentifier("SearchResultHeaderView"))
        
        collectionView.dataSource = context.coordinator
        collectionView.delegate = context.coordinator
        collectionView.autoresizingMask = [.width, .height]
        
        scrollView.documentView = collectionView
        scrollView.hasVerticalScroller = true
        
        return scrollView
    }
    
    func updateNSView(_ nsView: NSScrollView, context: Context) {
        if let collectionView = nsView.documentView as? NSCollectionView {
            context.coordinator.searchResults = searchResults
            collectionView.reloadData()
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, NSCollectionViewDataSource, NSCollectionViewDelegateFlowLayout {
        var parent: AdvancedVirtualizedSearchResultsView
        var searchResults: [FileSearchResult] = []
        init(_ parent: AdvancedVirtualizedSearchResultsView) {
            self.parent = parent
        }
        
        func numberOfSections(in collectionView: NSCollectionView) -> Int {
            return searchResults.count
        }
        
        func collectionView(_ collectionView: NSCollectionView, numberOfItemsInSection section: Int) -> Int {
            let fileResult = searchResults[section]
            return fileResult.isExpanded ? fileResult.results.count : 0
        }
        
        func collectionView(_ collectionView: NSCollectionView, itemForRepresentedObjectAt indexPath: IndexPath) -> NSCollectionViewItem {
            let item = collectionView.makeItem(withIdentifier: NSUserInterfaceItemIdentifier("SearchResultItem"), for: indexPath) as! SearchResultItem
            let fileResult = searchResults[indexPath.section]
            let match = fileResult.results[indexPath.item]
            item.configure(match: match, query: parent.searchQuery, isCaseSensitive: parent.isCaseSensitive, fileURL: fileResult.fileURL, onOpenFile: parent.onOpenFile)
            return item
        }
        
        func collectionView(_ collectionView: NSCollectionView, viewForSupplementaryElementOfKind kind: String, at indexPath: IndexPath) -> NSView {
            if kind == NSCollectionView.elementKindSectionHeader {
                let headerView = collectionView.makeSupplementaryView(ofKind: kind, withIdentifier: NSUserInterfaceItemIdentifier("SearchResultHeaderView"), for: indexPath) as! SearchResultHeaderView
                var fileResult = searchResults[indexPath.section]
                headerView.configure(fileResult: fileResult)
                headerView.toggleAction = {
                    fileResult.isExpanded.toggle()
                    self.searchResults[indexPath.section] = fileResult
                    self.parent.searchResults = self.searchResults
                    collectionView.reloadSections(IndexSet(integer: indexPath.section))
                }
                return headerView
            }
            return NSView()
        }
        
        func collectionView(_ collectionView: NSCollectionView, layout collectionViewLayout: NSCollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> NSSize {
            return NSSize(width: collectionView.bounds.width, height: 24)
        }
        
        func collectionView(_ collectionView: NSCollectionView, layout collectionViewLayout: NSCollectionViewLayout, referenceSizeForHeaderInSection section: Int) -> NSSize {
            return NSSize(width: collectionView.bounds.width, height: 32)
        }
        
        func collectionView(_ collectionView: NSCollectionView, didSelectItemsAt indexPaths: Set<IndexPath>) {
            if let indexPath = indexPaths.first {
                let fileResult = searchResults[indexPath.section]
                let match = fileResult.results[indexPath.item]
                parent.onOpenFile(fileResult.fileURL, match.lineNumber)
            }
        }
        
        func collectionView(_ collectionView: NSCollectionView, didEndDisplaying item: NSCollectionViewItem, forItemAt indexPath: IndexPath) {
            (item.view as? HoverEffectView)?.resetHoverState()
        }
        
        func collectionView(_ collectionView: NSCollectionView, didEndDisplayingSupplementaryView view: NSView, forElementOfKind elementKind: String, at indexPath: IndexPath) {
            (view as? HoverEffectView)?.resetHoverState()
        }
    }
}
