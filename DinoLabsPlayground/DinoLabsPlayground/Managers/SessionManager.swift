//
//  SessionManager.swift
//
//  Created by Peter Iacobelli on 2/24/25.
//

import SwiftUI
import AppKit
import Combine

struct SessionData: Codable {
    var openTabs: [FileTab]
    var activeTabId: UUID?
    var directoryURL: URL?
    var displayedChildren: [FileItem]
    var directoryBookmark: Data?
}

class SessionStateManager: ObservableObject {
    static let shared = SessionStateManager()
    @Published var openTabs: [FileTab] = []
    @Published var activeTabId: UUID?
    @Published var directoryURL: URL?
    @Published var displayedChildren: [FileItem] = []
    private var subscriptions = Set<AnyCancellable>()
    private init() {
        loadSessionData()
        setupAutoSave()
    }
    private func setupAutoSave() {
        $openTabs
            .debounce(for: .seconds(0.5), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.saveSessionData()
            }
            .store(in: &subscriptions)
        $activeTabId
            .sink { [weak self] _ in
                self?.saveSessionData()
            }
            .store(in: &subscriptions)
        $directoryURL
            .debounce(for: .seconds(0.5), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.saveSessionData()
            }
            .store(in: &subscriptions)
        $displayedChildren
            .debounce(for: .seconds(0.5), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.saveSessionData()
            }
            .store(in: &subscriptions)
    }
    func saveSessionData() {
        var bookmark: Data? = nil
        if let directoryURL = directoryURL {
            bookmark = try? directoryURL.bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil)
        }
        let sessionData = SessionData(
            openTabs: self.openTabs,
            activeTabId: self.activeTabId,
            directoryURL: self.directoryURL,
            displayedChildren: self.displayedChildren,
            directoryBookmark: bookmark
        )
        do {
            let encodedData = try JSONEncoder().encode(sessionData)
            UserDefaults.standard.set(encodedData, forKey: "sessionData")
        } catch {
            return
        }
    }
    func loadSessionData() {
        if let savedData = UserDefaults.standard.data(forKey: "sessionData") {
            do {
                let sessionData = try JSONDecoder().decode(SessionData.self, from: savedData)
                self.openTabs = sessionData.openTabs
                self.activeTabId = sessionData.activeTabId
                if let directoryBookmark = sessionData.directoryBookmark {
                    var stale = false
                    if let resolvedURL = try? URL(resolvingBookmarkData: directoryBookmark, options: [.withSecurityScope], relativeTo: nil, bookmarkDataIsStale: &stale), FileManager.default.fileExists(atPath: resolvedURL.path) {
                        if !stale {
                            resolvedURL.startAccessingSecurityScopedResource()
                            self.directoryURL = resolvedURL
                            self.displayedChildren = sessionData.displayedChildren
                            return
                        }
                    }
                }
                self.directoryURL = nil
                self.displayedChildren = []
            } catch {
                return
            }
        }
    }
    func updateActiveTab(id: UUID?) {
        self.activeTabId = id
        saveSessionData()
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        if let window = NSApplication.shared.windows.first {
            window.setContentSize(NSSize(width: 950, height: 700))
            window.minSize = NSSize(width: 950, height: 700)
            window.maxSize = NSSize(width: 1600, height: 1600)
            window.delegate = self
        }
    }
    func windowWillResize(_ sender: NSWindow, to frameSize: NSSize) -> NSSize {
        var newSize = frameSize
        newSize.width = max(950, min(frameSize.width, 1600))
        newSize.height = max(700, min(frameSize.height, 1600))
        return newSize
    }
    func applicationWillTerminate(_ notification: Notification) {
        SessionStateManager.shared.saveSessionData()
    }
}
