//
//  NotificationManager.swift
//
//  Created by Peter Iacobelli on 3/25/25.
//

import SwiftUI

extension Notification.Name {
    static let scrollToRange = Notification.Name("scrollToRange")
    static let updateSearchHighlighting = Notification.Name("updateSearchHighlighting")
    static let performSingleReplacementText = Notification.Name("performSingleReplacementText")
    static let performReplaceAllText = Notification.Name("performReplaceAllText")
    static let reSearchAfterReplacement = Notification.Name("reSearchAfterReplacement")
    static let requestSearch = Notification.Name("requestSearch")
    static let requestUndo = Notification.Name("requestUndo")
    static let requestRedo = Notification.Name("requestRedo")
    static let requestSave = Notification.Name("requestSave")
    static let requestCut = Notification.Name("requestCut")
    static let requestCopy = Notification.Name("requestCopy")
    static let requestPaste = Notification.Name("requestPaste")
    static let requestSelectAll = Notification.Name("requestSelectAll")
}
