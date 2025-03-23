//
//  DinoLabsText.swift
//
//  Created by Peter Iacobelli on 3/3/25.
//

import SwiftUI
import AppKit
import ObjectiveC.runtime

struct TextView: View {
    let geometry: GeometryProxy
    let fileURL: URL
    @Binding var leftPanelWidthRatio: CGFloat
    @Binding var hasUnsavedChanges: Bool
    @Binding var showAlert: Bool
    @State private var fileContent: String = ""
    @State private var initialContent: String = ""
    @State private var showFileMenu = false
    @State private var showEditMenu = false
    @State private var labelRects: [CGRect] = Array(repeating: .zero, count: 6)
    @State private var copyIcon = "square.on.square"
    @State private var searchState: Bool = false
    @State private var replaceState: Bool = false
    @State private var searchCaseSensitive: Bool = true
    @State private var searchQuery: String = ""
    @State private var replaceQuery: String = ""
    @State private var isReplacing: Bool = false
    @State private var currentSearchMatch: Int = 0
    @State private var totalSearchMatches: Int = 0
    @State private var searchMatches: [NSRange] = []
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: 0) {
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
                                                shadowColor: .white.opacity(showFileMenu ? 0.0 : 0.5), shadowRadius: 0.5, shadowX: 0, shadowY: 0
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
                                                shadowColor: .white.opacity(showEditMenu ? 0.0 : 0.5), shadowRadius: 0.5, shadowX: 0, shadowY: 0
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
                        } else if searchState || replaceState {
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
                                    NotificationCenter.default.post(name: .updateSearchHighlighting, object: nil, userInfo: ["searchQuery": "", "searchCaseSensitive": searchCaseSensitive])
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
                                    if searchState {
                                        currentSearchMatch = currentSearchMatch
                                        totalSearchMatches = totalSearchMatches
                                    }
                                } else {
                                    replaceState = false
                                    searchState = false
                                    searchQuery = ""
                                    replaceQuery = ""
                                    clearSearchResults()
                                    NotificationCenter.default.post(name: .updateSearchHighlighting, object: nil, userInfo: ["searchQuery": "", "searchCaseSensitive": searchCaseSensitive])
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
                
                HStack(spacing: 0) {
                    Spacer()
                    TextViewWrapper(
                        text: $fileContent,
                        isEditable: !(showAlert || showFileMenu || showEditMenu || searchState || replaceState),
                        onTextChange: { newValue in
                            if newValue != initialContent {
                                hasUnsavedChanges = true
                            }
                        }
                    )
                    .containerHelper(
                        backgroundColor: Color(hex: 0x202020),
                        borderColor: Color.clear,
                        borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                        shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                    )
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) - 40)
                    Spacer()
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 20)
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
                .containerHelper(
                    backgroundColor: Color(hex: 0x202020),
                    borderColor: Color.clear,
                    borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                    shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                )
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
            
            if showFileMenu {
                VStack(spacing: 0) {
                    TextButtonMain {
                       saveFile()
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                .containerHelper(
                    backgroundColor: Color(hex: 0x181818),
                    borderColor: Color(hex: 0x262626),
                    borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 6, bottomRight: 6,
                    shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0
                )
                .position(
                    x: labelRects[0].minX + 80,
                    y: labelRects[0].maxY + 100
                )
            }
            
            if showEditMenu {
                VStack(spacing: 0) {
                    TextButtonMain {
                        NotificationCenter.default.post(name: .requestUndo, object: nil)
                    }
                    .frame(height: 12)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                    .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                    .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                    .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                    .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                    .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
                    borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 6, bottomRight: 6,
                    shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0
                )
                .position(
                    x: labelRects[1].minX + 80,
                    y: labelRects[1].maxY + 100
                )
            }
        }
        .coordinateSpace(name: "MenuBar")
        .onAppear {
            loadFile()
        }
        .onReceive(NotificationCenter.default.publisher(for: .reSearchAfterReplacement)) { _ in
            if (searchState || replaceState), !searchQuery.isEmpty {
                performSearch()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .requestSearch)) { _ in
            if !searchState && !replaceState {
                searchState = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .requestSave)) { _ in
            saveFile()
        }
        .onChange(of: fileContent) { _ in
            if !searchQuery.isEmpty {
                performSearch()
            }
        }
    }
    
    private func loadFile() {
        do {
            let content = try String(contentsOf: fileURL, encoding: .utf8)
            fileContent = content
            initialContent = content
            hasUnsavedChanges = false
        } catch {
            return
        }
    }
    
    private func saveFile() {
        do {
            try fileContent.write(to: fileURL, atomically: true, encoding: .utf8)
            hasUnsavedChanges = false
            initialContent = fileContent
        } catch {
            return
        }
    }
    
    private func downloadFile() {
        let panel = NSSavePanel()
        panel.title = "Save a Copy"
        panel.nameFieldStringValue = fileURL.lastPathComponent
        if panel.runModal() == .OK, let newURL = panel.url {
            do {
                try fileContent.write(to: newURL, atomically: true, encoding: .utf8)
            } catch {
                print("Error saving file: \(error)")
            }
        }
    }
    
    private func clearSearchResults() {
        searchMatches.removeAll()
        currentSearchMatch = 0
        totalSearchMatches = 0
    }
    
    private func performSearch() {
        guard !searchQuery.isEmpty else {
            clearSearchResults()
            NotificationCenter.default.post(name: .updateSearchHighlighting,
                                            object: nil,
                                            userInfo: ["searchQuery": "", "searchCaseSensitive": searchCaseSensitive])
            return
        }
        
        let nsText = fileContent as NSString
        var options: NSString.CompareOptions = []
        if !searchCaseSensitive {
            options.insert(.caseInsensitive)
        }
        
        searchMatches.removeAll()
        
        var searchRange = NSRange(location: 0, length: nsText.length)
        while true {
            let foundRange = nsText.range(of: searchQuery, options: options, range: searchRange)
            if foundRange.location != NSNotFound {
                searchMatches.append(foundRange)
                let newLocation = foundRange.location + foundRange.length
                if newLocation < nsText.length {
                    searchRange = NSRange(location: newLocation, length: nsText.length - newLocation)
                } else {
                    break
                }
            } else {
                break
            }
        }
        
        totalSearchMatches = searchMatches.count
        if totalSearchMatches > 0 {
            currentSearchMatch = 1
            postSearchUpdate()
        } else {
            currentSearchMatch = 0
        }
        
        NotificationCenter.default.post(name: .updateSearchHighlighting,
                                        object: nil,
                                        userInfo: ["searchQuery": searchQuery, "searchCaseSensitive": searchCaseSensitive])
    }
    
    private func postSearchUpdate() {
        guard currentSearchMatch > 0, currentSearchMatch <= searchMatches.count else { return }
        let matchRange = searchMatches[currentSearchMatch - 1]
        NotificationCenter.default.post(name: .scrollToRange, object: nil, userInfo: ["range": matchRange])
    }
    
    private func jumpToNextSearchMatch() {
        guard totalSearchMatches > 0 else { return }
        let newIndex = (currentSearchMatch + 1) > totalSearchMatches ? 1 : (currentSearchMatch + 1)
        currentSearchMatch = newIndex
        postSearchUpdate()
    }
    
    private func jumpToPreviousSearchMatch() {
        guard totalSearchMatches > 0 else { return }
        let newIndex = (currentSearchMatch - 1) < 1 ? totalSearchMatches : (currentSearchMatch - 1)
        currentSearchMatch = newIndex
        postSearchUpdate()
    }
}

struct TextViewWrapper: NSViewRepresentable {
    @Binding var text: String
    var isEditable: Bool
    var onTextChange: (String) -> Void
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        let textView = scrollView.documentView as! NSTextView
        textView.isSelectable = true
        
        object_setClass(textView, TextViewModel.self)
        
        textView.delegate = context.coordinator
        textView.isEditable = isEditable
        textView.font = NSFont.monospacedSystemFont(ofSize: 12, weight: .semibold)
        textView.backgroundColor = NSColor(hex: 0x202020)
        textView.textColor = NSColor.white
        textView.insertionPointColor = NSColor.white
        textView.allowsUndo = true
        textView.undoManager?.levelsOfUndo = 0
        
        context.coordinator.textView = textView
        
        NotificationCenter.default.addObserver(
            forName: .scrollToRange,
            object: nil,
            queue: .main
        ) { note in
            if let userInfo = note.userInfo, let range = userInfo["range"] as? NSRange {
                context.coordinator.scrollAndSelect(range: range)
            }
        }
        
        NotificationCenter.default.addObserver(
            forName: .updateSearchHighlighting,
            object: nil,
            queue: .main
        ) { note in
            if let userInfo = note.userInfo,
               let query = userInfo["searchQuery"] as? String,
               let caseSensitive = userInfo["searchCaseSensitive"] as? Bool {
                context.coordinator.updateSearchHighlighting(searchQuery: query, caseSensitive: caseSensitive)
            }
        }
        
        NotificationCenter.default.addObserver(
            forName: .performSingleReplacementText,
            object: nil,
            queue: .main
        ) { note in
            guard let userInfo = note.userInfo,
                  let search = userInfo["search"] as? String,
                  let replacement = userInfo["replacement"] as? String,
                  let caseSensitive = userInfo["caseSensitive"] as? Bool else { return }
            
            let originalEditable = textView.isEditable
            textView.isEditable = true
            
            let selRange = textView.selectedRange()
            if selRange.length > 0 {
                let selectedText = (textView.string as NSString).substring(with: selRange)
                let compareOpts: NSString.CompareOptions = caseSensitive ? [] : [.caseInsensitive]
                if selectedText.compare(search, options: compareOpts) == .orderedSame {
                    if textView.shouldChangeText(in: selRange, replacementString: replacement) {
                        textView.replaceCharacters(in: selRange, with: replacement)
                        textView.didChangeText()
                    }
                }
            }
            
            textView.isEditable = originalEditable
            
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .reSearchAfterReplacement, object: nil)
            }
        }
        NotificationCenter.default.addObserver(
            forName: .performReplaceAllText,
            object: nil,
            queue: .main
        ) { note in
            guard let userInfo = note.userInfo,
                  let search = userInfo["search"] as? String,
                  let replacement = userInfo["replacement"] as? String,
                  let caseSensitive = userInfo["caseSensitive"] as? Bool else { return }
            
            let nsText = textView.string as NSString
            let options: NSString.CompareOptions = caseSensitive ? [] : [.caseInsensitive]
            var searchRange = NSRange(location: 0, length: nsText.length)
            
            let originalEditable = textView.isEditable
            textView.isEditable = true
            
            while true {
                let foundRange = nsText.range(of: search, options: options, range: searchRange)
                if foundRange.location == NSNotFound {
                    break
                }
                if textView.shouldChangeText(in: foundRange, replacementString: replacement) {
                    textView.replaceCharacters(in: foundRange, with: replacement)
                    textView.didChangeText()
                }
                let newLocation = foundRange.location + (replacement as NSString).length
                if newLocation < nsText.length {
                    searchRange = NSRange(location: newLocation, length: nsText.length - newLocation)
                } else {
                    break
                }
            }
            
            textView.isEditable = originalEditable
            
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .updateSearchHighlighting, object: nil, userInfo: ["searchQuery": "", "searchCaseSensitive": caseSensitive])
            }
        }
        
        NotificationCenter.default.addObserver(
            forName: .requestUndo,
            object: nil,
            queue: .main
        ) { [weak textView] _ in
            textView?.undoManager?.undo()
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .updateSearchHighlighting, object: nil, userInfo: ["searchQuery": "", "searchCaseSensitive": true])
            }
        }
        
        NotificationCenter.default.addObserver(
            forName: .requestRedo,
            object: nil,
            queue: .main
        ) { [weak textView] _ in
            textView?.undoManager?.redo()
        }
        
        NotificationCenter.default.addObserver(
            forName: .requestCut,
            object: nil,
            queue: .main
        ) { [weak textView] _ in
            textView?.cut(nil)
        }
        
        NotificationCenter.default.addObserver(
            forName: .requestCopy,
            object: nil,
            queue: .main
        ) { [weak textView] _ in
            textView?.copy(nil)
        }
        
        NotificationCenter.default.addObserver(
            forName: .requestPaste,
            object: nil,
            queue: .main
        ) { [weak textView] _ in
            textView?.paste(nil)
        }
        
        NotificationCenter.default.addObserver(
            forName: .requestSelectAll,
            object: nil,
            queue: .main
        ) { [weak textView] _ in
            textView?.selectAll(nil)
        }

        return scrollView
    }
    
    func updateNSView(_ nsView: NSScrollView, context: Context) {
        let textView = nsView.documentView as! NSTextView
        if textView.string != text {
            textView.string = text
        }
        textView.isEditable = isEditable
    }
    
    class Coordinator: NSObject, NSTextViewDelegate {
        var parent: TextViewWrapper
        weak var textView: NSTextView?
        
        init(_ parent: TextViewWrapper) {
            self.parent = parent
        }
        
        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            parent.text = textView.string
            parent.onTextChange(textView.string)
        }
        
        func scrollAndSelect(range: NSRange) {
            guard let tv = textView else { return }
            let length = (tv.string as NSString).length
            guard range.location != NSNotFound, range.location < length else { return }
            tv.scrollRangeToVisible(range)
            tv.setSelectedRange(range)
        }
        
        func updateSearchHighlighting(searchQuery: String, caseSensitive: Bool) {
            guard let tv = textView else { return }
            let fullText = tv.string as NSString
            let attributed = NSMutableAttributedString(
                string: tv.string,
                attributes: [
                    .font: NSFont.monospacedSystemFont(ofSize: 12, weight: .semibold),
                    .foregroundColor: NSColor.white
                ]
            )
            
            if !searchQuery.isEmpty {
                let options: NSString.CompareOptions = caseSensitive ? [] : [.caseInsensitive]
                let highlightFont = NSFont.monospacedSystemFont(ofSize: 12 * 1.05, weight: .semibold)
                let highlightColor = NSColor(hex: 0xAD6ADD)
                let shadow = NSShadow()
                shadow.shadowOffset = NSSize(width: 1, height: -1)
                shadow.shadowBlurRadius = 2
                shadow.shadowColor = NSColor.black.withAlphaComponent(0.7)
                
                var foundMatch = false
                var searchRange = NSRange(location: 0, length: fullText.length)
                while true {
                    let matchRange = fullText.range(of: searchQuery, options: options, range: searchRange)
                    if matchRange.location != NSNotFound {
                        foundMatch = true
                        attributed.addAttribute(.font, value: highlightFont, range: matchRange)
                        attributed.addAttribute(.foregroundColor, value: highlightColor, range: matchRange)
                        attributed.addAttribute(.shadow, value: shadow, range: matchRange)
                        let newLocation = matchRange.location + matchRange.length
                        if newLocation < fullText.length {
                            searchRange = NSRange(location: newLocation, length: fullText.length - newLocation)
                        } else {
                            break
                        }
                    } else {
                        break
                    }
                }
                
                if foundMatch {
                    attributed.enumerateAttribute(.foregroundColor, in: NSRange(location: 0, length: attributed.length), options: []) { value, range, _ in
                        if let color = value as? NSColor, color != highlightColor {
                            let dimmed = color.withAlphaComponent(0.3)
                            attributed.addAttribute(.foregroundColor, value: dimmed, range: range)
                        }
                    }
                } else {
                    attributed.enumerateAttribute(.foregroundColor, in: NSRange(location: 0, length: attributed.length), options: []) { value, range, _ in
                        if let color = value as? NSColor {
                            let restore = color.withAlphaComponent(1.0)
                            attributed.addAttribute(.foregroundColor, value: restore, range: range)
                        }
                    }
                }
            }
            else {
                attributed.enumerateAttribute(.foregroundColor, in: NSRange(location: 0, length: attributed.length), options: []) { value, range, _ in
                    if let color = value as? NSColor {
                        let restore = color.withAlphaComponent(1.0)
                        attributed.addAttribute(.foregroundColor, value: restore, range: range)
                    }
                }
            }
            
            let oldSelection = tv.selectedRange()
            tv.textStorage?.setAttributedString(attributed)
            tv.setSelectedRange(oldSelection)
        }
    }
}

class TextViewModel: NSTextView {
    override func performKeyEquivalent(with event: NSEvent) -> Bool {
        if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "f" {
            NotificationCenter.default.post(name: .requestSearch, object: nil)
            return true
        } else if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "a" {
            self.selectAll(nil)
            return true
        } else if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "x" {
            self.cut(nil)
            return true
        } else if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "c" {
            self.copy(nil)
            return true
        } else if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "v" {
            self.paste(nil)
            return true
        } else if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "z" {
            undoManager?.undo()
            NotificationCenter.default.post(name: .updateSearchHighlighting, object: nil, userInfo: ["searchQuery": "", "searchCaseSensitive": true])
            return true
        } else if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "y" {
            undoManager?.redo()
            return true
        } else if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "s" {
            NotificationCenter.default.post(name: .requestSave, object: nil)
            return true
        }
        return super.performKeyEquivalent(with: event)
    }
    
    override func menu(for event: NSEvent) -> NSMenu? {
        let menu = NSMenu()
        
        let copyItem = NSMenuItem(title: "Copy", action: #selector(copy(_:)), keyEquivalent: "")
        copyItem.target = self
        menu.addItem(copyItem)
        
        let pasteItem = NSMenuItem(title: "Paste", action: #selector(paste(_:)), keyEquivalent: "")
        pasteItem.target = self
        menu.addItem(pasteItem)
        
        let cutItem = NSMenuItem(title: "Cut", action: #selector(cut(_:)), keyEquivalent: "")
        cutItem.target = self
        menu.addItem(cutItem)
        
        let undoItem = NSMenuItem(title: "Undo", action: #selector(requestUndoContext(_:)), keyEquivalent: "")
        undoItem.target = self
        menu.addItem(undoItem)
        
        let redoItem = NSMenuItem(title: "Redo", action: #selector(requestRedoContext(_:)), keyEquivalent: "")
        redoItem.target = self
        menu.addItem(redoItem)
        
        return menu
    }
    
    @objc func requestUndoContext(_ sender: Any?) {
        NotificationCenter.default.post(name: .requestUndo, object: nil)
    }
    
    @objc func requestRedoContext(_ sender: Any?) {
        NotificationCenter.default.post(name: .requestRedo, object: nil)
    }
    
    override func resetCursorRects() {
        super.resetCursorRects()
        let rect = self.visibleRect
        if !self.isEditable {
            self.addCursorRect(rect, cursor: NSCursor.pointingHand)
        } else {
            self.addCursorRect(rect, cursor: NSCursor.iBeam)
        }
    }
    
    override func mouseEntered(with event: NSEvent) {
        if !self.isEditable {
            NSCursor.pointingHand.set()
        } else {
            NSCursor.iBeam.set()
        }
    }
    
    override func mouseMoved(with event: NSEvent) {
        if !self.isEditable {
            NSCursor.pointingHand.set()
        } else {
            NSCursor.iBeam.set()
        }
    }
    
    override func cursorUpdate(with event: NSEvent) {
        if !self.isEditable {
            NSCursor.pointingHand.set()
        } else {
            NSCursor.iBeam.set()
        }
    }
}
 
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
