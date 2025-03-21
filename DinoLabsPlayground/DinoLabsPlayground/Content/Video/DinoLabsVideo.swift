//
//  DinoLabsVideo.swift
//
//  Created by Peter Iacobelli on 3/7/25.
//

import SwiftUI
import AVKit
import AVFoundation

struct VideoView: View {
    let geometry: GeometryProxy
    let fileURL: URL
    @Binding var hasUnsavedChanges: Bool
    @Binding var leftPanelWidthRatio: CGFloat
    @State private var xPos: String = "0.0"
    @State private var yPos: String = "0.0"
    @State private var videoWidth: String = "0.0"
    @State private var videoHeight: String = "0.0"
    @State private var preserveAspectRatio: Bool = true
    @State private var isCropping: Bool = false
    @State private var videoSize: CGSize = .zero
    @State private var originalAspectRatio: CGFloat = 1.0
    @State private var lastDragPosition: CGPoint?
    @State private var videoPosition: CGPoint = .zero
    @State private var initialDragVideoSize: CGSize?
    @State private var initialDragVideoPosition: CGPoint?
    @State private var editorSize: CGSize = .zero
    @State private var initialDragOffset: CGPoint? = nil
    @State private var rotationAngle: Angle = .zero
    @State private var flipHorizontal: Bool = false
    @State private var flipVertical: Bool = false
    @State private var initialLoadedVideoSize: CGSize = .zero
    @State private var initialLoadedVideoPosition: CGPoint = .zero
    @State private var currentVideo: NSImage? = nil
    @State private var cropHistory: [(item: AVPlayerItem, size: CGSize, position: CGPoint, cropRect: CGRect)] = []
    @State private var cropRectPosition: CGPoint = .zero
    @State private var cropRectSize: CGSize = .zero
    @State private var initialCropDragOffset: CGPoint? = nil
    @State private var initialCropRectSize: CGSize? = nil
    @State private var initialCropRectPosition: CGPoint? = nil
    @State private var cropRotationAngle: Angle = .zero
    @State private var initialCropRotationOffset: Angle? = nil
    @State private var opacityValue: CGFloat = 1.0
    @State private var hueValue: Double = 0.0
    @State private var saturationValue: CGFloat = 1.0
    @State private var brightnessValue: CGFloat = 0.0
    @State private var contrastValue: CGFloat = 1.0
    @State private var blurValue: CGFloat = 0.0
    @State private var grayscaleValue: CGFloat = 0.0
    @State private var videoScaleFactor: CGFloat = 1.0
    @State private var isPlaying: Bool = false
    @State private var isLooping: Bool = false
    @State private var isFrameState: Bool = false
    @State private var playbackSpeed: Double = 1.0
    @State private var player: AVPlayer
    @State private var currentCropRect: CGRect = .zero
    @State private var initialCropRect: CGRect = .zero
    @State private var frames: [(NSImage, String, Double)] = []
    @State private var isGeneratingFrames = false
    @State private var selectedFrameIndex: Int? = nil

    init(geometry: GeometryProxy, fileURL: URL, hasUnsavedChanges: Binding<Bool>, leftPanelWidthRatio: Binding<CGFloat>) {
        self.geometry = geometry
        self.fileURL = fileURL
        self._hasUnsavedChanges = hasUnsavedChanges
        self._leftPanelWidthRatio = leftPanelWidthRatio
        self._player = State(initialValue: AVPlayer(url: fileURL))
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 0) {
                        VStack(spacing: 0) {
                            HStack(spacing: 0) {
                                Image(systemName: "video.square.fill")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 15, height: 15)
                                    .font(.system(size: 15, weight: .semibold))
                                    .padding(.leading, 12)
                                    .padding(.trailing, 8)
                                
                                Text("Layout")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(hex: 0xc1c1c1))
                                
                                Spacer()
                                
                                HStack(spacing: 12) {
                                    VideoButtonMain {
                                        videoSize = initialLoadedVideoSize
                                        videoPosition = initialLoadedVideoPosition
                                        rotationAngle = .zero
                                        flipHorizontal = false
                                        flipVertical = false
                                        isCropping = false
                                        cropRectSize = .zero
                                        cropRectPosition = .zero
                                        currentVideo = NSImage(contentsOf: fileURL)
                                        cropHistory = []
                                        opacityValue = 1.0
                                        hueValue = 0.0
                                        saturationValue = 1.0
                                        brightnessValue = 0.0
                                        contrastValue = 1.0
                                        blurValue = 0.0
                                        grayscaleValue = 0.0
                                        currentCropRect = initialCropRect
                                        updateTextFields()
                                        let originalItem = AVPlayerItem(url: fileURL)
                                        player.replaceCurrentItem(with: originalItem)
                                        player.seek(to: .zero)
                                    }
                                    .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                    .frame(width: 20, height: 20)
                                    .overlay(
                                        Image(systemName: "arrow.clockwise")
                                            .font(.system(size: 10, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                            .allowsHitTesting(false)
                                    )
                                    .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                }
                                .padding(.trailing, 12)
                            }
                            .padding(.top, 15)
                            .padding(.bottom, 12)
                            .containerHelper(backgroundColor: Color(hex: 0x121212), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Position")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 8)
                                    
                                    HStack(spacing: 8) {
                                        CodeTextField(placeholder: "", text: $xPos, onReturnKeyPressed: {
                                            let numericString = extractNumeric(from: xPos)
                                            if let newX = Double(numericString) {
                                                videoPosition.x = CGFloat(newX)
                                                updateTextFields()
                                            }
                                        })
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .foregroundColor(.white)
                                        .font(.system(size: 8, weight: .semibold))
                                        .padding(.horizontal, 10)
                                        .frame(height: 25)
                                        .containerHelper(backgroundColor: Color(hex: 0x222222), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: .white.opacity(0.5), shadowRadius: 0.5, shadowX: 0, shadowY: 0)
                                        .hoverEffect(opacity: 0.8)
                                        
                                        CodeTextField(placeholder: "", text: $yPos, onReturnKeyPressed: {
                                            let numericString = extractNumeric(from: yPos)
                                            if let newY = Double(numericString) {
                                                videoPosition.y = CGFloat(newY)
                                                updateTextFields()
                                            }
                                        })
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .foregroundColor(.white)
                                        .font(.system(size: 8, weight: .semibold))
                                        .padding(.horizontal, 10)
                                        .frame(height: 25)
                                        .containerHelper(backgroundColor: Color(hex: 0x222222), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: .white.opacity(0.5), shadowRadius: 0.5, shadowX: 0, shadowY: 0)
                                        .hoverEffect(opacity: 0.8)
                                        
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 16)
                                    
                                    HStack(spacing: 8) {
                                        VideoButtonMain {
                                            if !isCropping {
                                                let scale: CGFloat = 1.1
                                                let newWidth = videoSize.width * scale
                                                let newHeight = videoSize.height * scale
                                                videoSize = CGSize(width: newWidth, height: newHeight)
                                                updateTextFields()
                                                if !preserveAspectRatio {
                                                    originalAspectRatio = videoSize.width / videoSize.height
                                                }
                                            }
                                        }
                                        .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "plus.magnifyingglass")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        .opacity(isCropping ? 0.5 : 1.0)
                                        
                                        VideoButtonMain {
                                            if !isCropping {
                                                let scale: CGFloat = 0.9
                                                let newWidth = max(50, videoSize.width * scale)
                                                let newHeight = max(50, videoSize.height * scale)
                                                videoSize = CGSize(width: newWidth, height: newHeight)
                                                updateTextFields()
                                                if (!preserveAspectRatio) {
                                                    originalAspectRatio = videoSize.width / videoSize.height
                                                }
                                            }
                                        }
                                        .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "minus.magnifyingglass")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        .opacity(isCropping ? 0.5 : 1.0)
                                        
                                        VideoButtonMain {
                                            if !isCropping {
                                                rotationAngle -= .degrees(90)
                                            }
                                        }
                                        .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "rotate.left")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        .opacity(isCropping ? 0.5 : 1.0)
                                        
                                        VideoButtonMain {
                                            if !isCropping {
                                                rotationAngle += .degrees(90)
                                            }
                                        }
                                        .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "rotate.right")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        .opacity(isCropping ? 0.5 : 1.0)
                                        
                                        VideoButtonMain {
                                            if !isCropping {
                                                flipHorizontal.toggle()
                                            }
                                        }
                                        .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x515151), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "arrow.left.arrow.right")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        .opacity(isCropping ? 0.5 : 1.0)
                                        
                                        VideoButtonMain {
                                            if !isCropping {
                                                flipVertical.toggle()
                                            }
                                        }
                                        .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "arrow.up.arrow.down")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        .opacity(isCropping ? 0.5 : 1.0)
                                        
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.leading, 2)
                                    .padding(.bottom, 16)
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                        }
                        .padding(.bottom, 12)
                        .overlay(
                            Rectangle()
                                .frame(height: 0.5)
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                            alignment: .bottom
                        )
                        
                        VStack(spacing: 0) {
                            HStack(spacing: 0) {
                                Image(systemName: "ruler")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 15, height: 15)
                                    .font(.system(size: 15, weight: .semibold))
                                    .padding(.leading, 12)
                                    .padding(.trailing, 8)
                                
                                Text("Dimensions")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(hex: 0xc1c1c1))
                                
                                Spacer()
                            }
                            .padding(.top, 15)
                            .padding(.bottom, 12)
                            .containerHelper(backgroundColor: Color(hex: 0x121212), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Video Size")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 8)
                                    
                                    HStack(spacing: 8) {
                                        CodeTextField(placeholder: "", text: $videoWidth, onReturnKeyPressed: {
                                            let numericString = extractNumeric(from: videoWidth)
                                            if let newWidth = Double(numericString) {
                                                if preserveAspectRatio {
                                                    videoSize.width = CGFloat(newWidth)
                                                    videoSize.height = CGFloat(newWidth) / originalAspectRatio
                                                } else {
                                                    videoSize.width = CGFloat(newWidth)
                                                }
                                                updateTextFields()
                                                if !preserveAspectRatio {
                                                    originalAspectRatio = videoSize.width / videoSize.height
                                                }
                                            }
                                        })
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .foregroundColor(.white)
                                        .font(.system(size: 8, weight: .semibold))
                                        .padding(.horizontal, 10)
                                        .frame(height: 25)
                                        .containerHelper(backgroundColor: Color(hex: 0x222222), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: .white.opacity(0.5), shadowRadius: 0.5, shadowX: 0, shadowY: 0)
                                        .hoverEffect(opacity: 0.8)
                                        
                                        CodeTextField(placeholder: "", text: $videoHeight, onReturnKeyPressed: {
                                            let numericString = extractNumeric(from: videoHeight)
                                            if let newHeight = Double(numericString) {
                                                if preserveAspectRatio {
                                                    videoSize.height = CGFloat(newHeight)
                                                    videoSize.width = CGFloat(newHeight) * originalAspectRatio
                                                } else {
                                                    videoSize.height = CGFloat(newHeight)
                                                }
                                                updateTextFields()
                                                if !preserveAspectRatio {
                                                    originalAspectRatio = videoSize.width / videoSize.height
                                                }
                                            }
                                        })
                                        .lineLimit(1)
                                        .truncationMode(.tail)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .foregroundColor(.white)
                                        .font(.system(size: 8, weight: .semibold))
                                        .padding(.horizontal, 10)
                                        .frame(height: 25)
                                        .containerHelper(backgroundColor: Color(hex: 0x222222), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: .white.opacity(0.5), shadowRadius: 0.5, shadowX: 0, shadowY: 0)
                                        .hoverEffect(opacity: 0.8)
                                        
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 16)
                                    
                                    HStack(spacing: 8) {
                                        VideoButtonMain {
                                            if isCropping {
                                                cropVideo()
                                                isCropping = false
                                            } else {
                                                isCropping = true
                                                if cropRectSize == .zero {
                                                    cropRectPosition = videoPosition
                                                    cropRectSize = videoSize
                                                }
                                            }
                                        }
                                        .containerHelper(backgroundColor: isCropping ? Color(hex: 0xAD6ADD) : Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "crop")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        
                                        VideoButtonMain {
                                            if let previousState = cropHistory.popLast() {
                                                videoSize = previousState.size
                                                videoPosition = previousState.position
                                                currentCropRect = previousState.cropRect
                                                player.replaceCurrentItem(with: previousState.item)
                                            } else {
                                                videoSize = initialLoadedVideoSize
                                                videoPosition = initialLoadedVideoPosition
                                                currentCropRect = initialCropRect
                                                let originalItem = AVPlayerItem(url: fileURL)
                                                player.replaceCurrentItem(with: originalItem)
                                            }
                                            updateTextFields()
                                            isCropping = false
                                            cropRectSize = .zero
                                            cropRectPosition = .zero
                                        }
                                        .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "arrow.uturn.backward.square.fill")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.leading, 2)
                                    .padding(.bottom, 16)
                                    
                                    if isCropping {
                                        HStack(spacing: 8) {
                                            VideoButtonMain {
                                                let presetRatio: CGFloat = 1.0
                                                let currentWidth = videoSize.width
                                                let currentHeight = videoSize.height
                                                var newWidth: CGFloat = currentWidth
                                                var newHeight: CGFloat = currentHeight
                                                if currentWidth / currentHeight > presetRatio {
                                                    newHeight = currentHeight
                                                    newWidth = newHeight * presetRatio
                                                } else {
                                                    newWidth = currentWidth
                                                    newHeight = newWidth / presetRatio
                                                }
                                                cropRectSize = CGSize(width: newWidth, height: newHeight)
                                                cropRectPosition = videoPosition
                                            }
                                            .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                            .frame(width: geometry.size.width * 0.03, height: 20)
                                            .overlay(
                                                Text("1:1")
                                                    .font(.system(size: 10, weight: .semibold))
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                    .allowsHitTesting(false)
                                            )
                                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                            
                                            VideoButtonMain {
                                                let presetRatio: CGFloat = 4.0/3.0
                                                let currentWidth = videoSize.width
                                                let currentHeight = videoSize.height
                                                var newWidth: CGFloat = currentWidth
                                                var newHeight: CGFloat = currentHeight
                                                if currentWidth / currentHeight > presetRatio {
                                                    newHeight = currentHeight
                                                    newWidth = newHeight * presetRatio
                                                } else {
                                                    newWidth = currentWidth
                                                    newHeight = newWidth / presetRatio
                                                }
                                                cropRectSize = CGSize(width: newWidth, height: newHeight)
                                                cropRectPosition = videoPosition
                                            }
                                            .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                            .frame(width: geometry.size.width * 0.03, height: 20)
                                            .overlay(
                                                Text("4:3")
                                                    .font(.system(size: 10, weight: .semibold))
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                    .allowsHitTesting(false)
                                            )
                                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                            
                                            VideoButtonMain {
                                                let presetRatio: CGFloat = 16.0/9.0
                                                let currentWidth = videoSize.width
                                                let currentHeight = videoSize.height
                                                var newWidth: CGFloat = currentWidth
                                                var newHeight: CGFloat = currentHeight
                                                if currentWidth / currentHeight > presetRatio {
                                                    newHeight = currentHeight
                                                    newWidth = newHeight * presetRatio
                                                } else {
                                                    newWidth = currentWidth
                                                    newHeight = newWidth / presetRatio
                                                }
                                                cropRectSize = CGSize(width: newWidth, height: newHeight)
                                                cropRectPosition = videoPosition
                                            }
                                            .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                            .frame(width: geometry.size.width * 0.03, height: 20)
                                            .overlay(
                                                Text("16:9")
                                                    .font(.system(size: 10, weight: .semibold))
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                    .allowsHitTesting(false)
                                            )
                                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                            
                                            Spacer()
                                        }
                                        .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                        .padding(.leading, 2)
                                        .padding(.bottom, 16)
                                    }
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                        }
                        .padding(.bottom, 12)
                        .overlay(
                            Rectangle()
                                .frame(height: 0.5)
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                            alignment: .bottom
                        )
                        
                        VStack(spacing: 0) {
                            HStack(spacing: 0) {
                                Image(systemName: "paintbrush")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 15, height: 15)
                                    .font(.system(size: 15, weight: .semibold))
                                    .padding(.leading, 12)
                                    .padding(.trailing, 8)
                                
                                Text("Styles")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(hex: 0xc1c1c1))
                                
                                Spacer()
                            }
                            .padding(.top, 15)
                            .padding(.bottom, 12)
                            .containerHelper(backgroundColor: Color(hex: 0x121212), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Opacity")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 12)
                                    
                                    HStack(spacing: 0) {
                                        Slider(
                                            value: Binding<Double>(
                                                get: { Double(opacityValue) },
                                                set: { opacityValue = CGFloat($0) }
                                            ),
                                            range: 0.0...1.0,
                                            step: 0.1,
                                            sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                            sliderHeight: 8,
                                            thumbSize: 12,
                                            activeColor: .purple,
                                            inactiveColor: Color(white: 0.3),
                                            thumbColor: .white,
                                            showText: false,
                                            animationDuration: 0.2,
                                            animationDamping: 0.7
                                        )
                                        .padding(.horizontal, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 16)
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Hue")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 12)
                                    
                                    HStack(spacing: 0) {
                                        Slider(
                                            value: Binding<Double>(
                                                get: { hueValue },
                                                set: { hueValue = $0 }
                                            ),
                                            range: -180.0...180.0,
                                            step: 1.0,
                                            sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                            sliderHeight: 8,
                                            thumbSize: 12,
                                            activeColor: .purple,
                                            inactiveColor: Color(white: 0.3),
                                            thumbColor: .white,
                                            showText: false,
                                            animationDuration: 0.2,
                                            animationDamping: 0.7
                                        )
                                        .padding(.horizontal, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 16)
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Saturation")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 12)
                                    
                                    HStack(spacing: 0) {
                                        Slider(
                                            value: Binding<Double>(
                                                get: { Double(saturationValue) },
                                                set: { saturationValue = CGFloat($0) }
                                            ),
                                            range: 0.0...2.0,
                                            step: 0.1,
                                            sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                            sliderHeight: 8,
                                            thumbSize: 12,
                                            activeColor: .purple,
                                            inactiveColor: Color(white: 0.3),
                                            thumbColor: .white,
                                            showText: false,
                                            animationDuration: 0.2,
                                            animationDamping: 0.7
                                        )
                                        .padding(.horizontal, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 16)
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Brightness")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 12)
                                    
                                    HStack(spacing: 0) {
                                        Slider(
                                            value: Binding<Double>(
                                                get: { Double(brightnessValue) },
                                                set: { brightnessValue = CGFloat($0) }
                                            ),
                                            range: -1.0...1.0,
                                            step: 0.1,
                                            sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                            sliderHeight: 8,
                                            thumbSize: 12,
                                            activeColor: .purple,
                                            inactiveColor: Color(white: 0.3),
                                            thumbColor: .white,
                                            showText: false,
                                            animationDuration: 0.2,
                                            animationDamping: 0.7
                                        )
                                        .padding(.horizontal, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 16)
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Contrast")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 12)
                                    
                                    HStack(spacing: 0) {
                                        Slider(
                                            value: Binding<Double>(
                                                get: { Double(contrastValue) },
                                                set: { contrastValue = CGFloat($0) }
                                            ),
                                            range: 0.0...2.0,
                                            step: 0.1,
                                            sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                            sliderHeight: 8,
                                            thumbSize: 12,
                                            activeColor: .purple,
                                            inactiveColor: Color(white: 0.3),
                                            thumbColor: .white,
                                            showText: false,
                                            animationDuration: 0.2,
                                            animationDamping: 0.7
                                        )
                                        .padding(.horizontal, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.85)
                                    .padding(.bottom, 16)
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Blur")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 12)
                                    
                                    HStack(spacing: 0) {
                                        Slider(
                                            value: Binding<Double>(
                                                get: { Double(blurValue) },
                                                set: { blurValue = CGFloat($0) }
                                            ),
                                            range: 0.0...10.0,
                                            step: 0.1,
                                            sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                            sliderHeight: 8,
                                            thumbSize: 12,
                                            activeColor: .purple,
                                            inactiveColor: Color(white: 0.3),
                                            thumbColor: .white,
                                            showText: false,
                                            animationDuration: 0.2,
                                            animationDamping: 0.7
                                        )
                                        .padding(.horizontal, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 16)
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                            
                            HStack {
                                Spacer()
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        Text("Grayscale")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 12)
                                    
                                    HStack(spacing: 0) {
                                        Slider(
                                            value: Binding<Double>(
                                                get: { Double(grayscaleValue) },
                                                set: { grayscaleValue = CGFloat($0) }
                                            ),
                                            range: 0.0...1.0,
                                            step: 0.1,
                                            sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8,
                                            sliderHeight: 8,
                                            thumbSize: 12,
                                            activeColor: .purple,
                                            inactiveColor: Color(white: 0.3),
                                            thumbColor: .white,
                                            showText: false,
                                            animationDuration: 0.2,
                                            animationDamping: 0.7
                                        )
                                        .padding(.horizontal, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 16)
                                }
                                Spacer()
                            }
                            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                            .padding(.top, 12)
                        }
                        .padding(.bottom, 12)
                        .overlay(
                            Rectangle()
                                .frame(height: 0.5)
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                            alignment: .bottom
                        )
                        
                        Spacer()
                    }
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
                    .frame(minHeight: geometry.size.height - 50 - 10, maxHeight: .infinity)
                    .containerHelper(backgroundColor: Color(hex: 0x171717), borderColor: .clear, borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                    .overlay(
                        Rectangle()
                            .frame(width: 3.0)
                            .foregroundColor(Color(hex: 0x121212).opacity(0.4)),
                        alignment: .trailing
                    )
                    .overlay(
                        Rectangle()
                            .frame(width: isFrameState ? geometry.size.width * (1 - leftPanelWidthRatio) * 0.3 : 0)
                            .frame(maxHeight: isFrameState ? .infinity : 0)
                            .foregroundColor(isFrameState ? Color.black.opacity(0.3) : Color.clear)
                            .allowsHitTesting(false)
                    )
                    .disabled(isFrameState)
                }
                
                VStack(spacing: 0) {
                    VStack {
                        GeometryReader { proxy in
                            ZStack {
                                VideoPlayer(player: player, preserveAspectRatio: preserveAspectRatio)
                                    .frame(width: videoSize.width, height: videoSize.height)
                                    .rotationEffect(rotationAngle)
                                    .scaleEffect(x: flipHorizontal ? -1 : 1, y: flipVertical ? -1 : 1)
                                    .opacity(Double(opacityValue))
                                    .hueRotation(Angle(degrees: hueValue))
                                    .saturation(saturationValue)
                                    .brightness(brightnessValue)
                                    .contrast(contrastValue)
                                    .blur(radius: blurValue)
                                    .grayscale(grayscaleValue)
                                    .position(videoPosition)
                                    .gesture(isCropping ? nil : videoDragGesture())
                                
                                if !isCropping {
                                    Group {
                                        RoundedRectangle(cornerRadius: 2)
                                            .frame(width: 8, height: 8)
                                            .foregroundColor(Color(hex: 0x818181))
                                            .position(calculateCornerPosition(.topLeft))
                                            .gesture(dragGesture(for: .topLeft))
                                        
                                        RoundedRectangle(cornerRadius: 2)
                                            .frame(width: 8, height: 8)
                                            .foregroundColor(Color(hex: 0x818181))
                                            .position(calculateCornerPosition(.topRight))
                                            .gesture(dragGesture(for: .topRight))
                                        
                                        RoundedRectangle(cornerRadius: 2)
                                            .frame(width: 8, height: 8)
                                            .foregroundColor(Color(hex: 0x818181))
                                            .position(calculateCornerPosition(.bottomLeft))
                                            .gesture(dragGesture(for: .bottomLeft))
                                        
                                        RoundedRectangle(cornerRadius: 2)
                                            .frame(width: 8, height: 8)
                                            .foregroundColor(Color(hex: 0x818181))
                                            .position(calculateCornerPosition(.bottomRight))
                                            .gesture(dragGesture(for: .bottomRight))
                                    }
                                }
                                
                                if isCropping {
                                    Rectangle()
                                        .fill(Color.black.opacity(0.3))
                                        .frame(width: cropRectSize.width, height: cropRectSize.height)
                                        .border(Color.white.opacity(0.8), width: 2)
                                        .rotationEffect(cropRotationAngle + rotationAngle)
                                        .scaleEffect(x: flipHorizontal ? -1 : 1, y: flipVertical ? -1 : 1)
                                        .position(cropRectPosition)
                                        .gesture(cropDragGesture())
                                    
                                    Group {
                                        RoundedRectangle(cornerRadius: 2)
                                            .frame(width: 8, height: 8)
                                            .foregroundColor(Color.white.opacity(0.8))
                                            .position(rotatedCropCornerPosition(for: .topLeft))
                                            .gesture(cropResizeGesture(for: .topLeft))
                                        
                                        RoundedRectangle(cornerRadius: 2)
                                            .frame(width: 8, height: 8)
                                            .foregroundColor(Color.white.opacity(0.8))
                                            .position(rotatedCropCornerPosition(for: .topRight))
                                            .gesture(cropResizeGesture(for: .topRight))
                                        
                                        RoundedRectangle(cornerRadius: 2)
                                            .frame(width: 8, height: 8)
                                            .foregroundColor(Color.white.opacity(0.8))
                                            .position(rotatedCropCornerPosition(for: .bottomLeft))
                                            .gesture(cropResizeGesture(for: .bottomLeft))
                                        
                                        RoundedRectangle(cornerRadius: 2)
                                            .frame(width: 8, height: 8)
                                            .foregroundColor(Color.white.opacity(0.8))
                                            .position(rotatedCropCornerPosition(for: .bottomRight))
                                            .gesture(cropResizeGesture(for: .bottomRight))
                                    }
                                }
                            }
                            .onAppear {
                                editorSize = proxy.size
                                if videoSize == .zero {
                                    let asset = AVAsset(url: fileURL)
                                    if let track = asset.tracks(withMediaType: .video).first {
                                        let naturalSize = track.naturalSize
                                        originalAspectRatio = naturalSize.width / naturalSize.height
                                        let maxWidth = proxy.size.width * 0.8
                                        let maxHeight = proxy.size.height * 0.8
                                        let scale = min(maxWidth / naturalSize.width, maxHeight / naturalSize.height)
                                        videoScaleFactor = scale
                                        videoSize = CGSize(
                                            width: naturalSize.width * scale,
                                            height: naturalSize.height * scale
                                        )
                                        videoPosition = CGPoint(x: proxy.size.width / 2, y: proxy.size.height / 2)
                                        initialLoadedVideoSize = videoSize
                                        initialLoadedVideoPosition = videoPosition
                                        updateTextFields()
                                        currentCropRect = CGRect(origin: .zero, size: naturalSize)
                                        initialCropRect = currentCropRect
                                    }
                                }
                            }
                        }
                        .clipped()
                    }
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7)
                    .frame(maxHeight: isFrameState ? .infinity - 60 - 100 : .infinity - 60)
                    .containerHelper(backgroundColor: Color(hex: 0x242424), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)

                    if isFrameState {
                        HStack(spacing: 0) {
                            
                            if isGeneratingFrames {
                                ProgressView()
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                            } else {
                                ScrollView([.horizontal], showsIndicators: false) {
                                    ZStack(alignment: .topLeading) {
                                        HStack(spacing: 8) {
                                            ForEach(frames.indices, id: \.self) { i in
                                                VStack {
                                                    Image(nsImage: frames[i].0)
                                                        .resizable()
                                                        .scaledToFit()
                                                        .frame(width: 80, height: 45)
                                                    Text(frames[i].1)
                                                        .font(.system(size: 9))
                                                        .foregroundColor(.white)
                                                }
                                                .padding(8)
                                                .containerHelper(
                                                    backgroundColor: selectedFrameIndex == i ? Color.white.opacity(0.05) : Color.clear,
                                                    borderColor: selectedFrameIndex == i ? Color(hex: 0xAD6ADD) : Color.clear,
                                                    borderWidth: 1,
                                                    topLeft: 4,
                                                    topRight: 4,
                                                    bottomLeft: 4,
                                                    bottomRight: 4,
                                                    shadowColor: Color.clear,
                                                    shadowRadius: 0,
                                                    shadowX: 0,
                                                    shadowY: 0
                                                )
                                                .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
                                                .onTapGesture {
                                                    if selectedFrameIndex == i {
                                                        selectedFrameIndex = nil
                                                        player.seek(to: .zero)
                                                    } else {
                                                        selectedFrameIndex = i
                                                        player.seek(to: CMTime(seconds: frames[i].2, preferredTimescale: 600))
                                                    }
                                                }
                                            }
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                    }
                                }
                            }
                        }
                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7, height: 100)
                        .containerHelper(backgroundColor: Color(hex: 0x313131), borderColor: .clear, borderWidth: 0,
                                         topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                         shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                        .overlay(
                            Rectangle()
                                .frame(height: 3.0)
                                .foregroundColor(Color(hex: 0x121212).opacity(0.4)),
                            alignment: .top
                        )
                    }
                    
                    HStack(spacing: 4) {
                        HStack(spacing: 12) {
                            Menu("\(playbackSpeed, specifier: "%.1f")x") {
                                Button("0.5x") { playbackSpeed = 0.5 }
                                Button("1.0x") { playbackSpeed = 1.0 }
                                Button("1.5x") { playbackSpeed = 1.5 }
                                Button("2.0x") { playbackSpeed = 2.0 }
                                Button("2.5x") { playbackSpeed = 2.5 }
                                Button("3.0x") { playbackSpeed = 3.0 }
                            }
                            .disabled(isFrameState)
                            .font(.system(size: 8, weight: .semibold))
                            .frame(width: 70)
                            .foregroundColor(Color.white.opacity(0.8))
                            
                            VideoButtonMain {
                                if isFrameState {
                                    isFrameState = false
                                } else {
                                    isFrameState = true
                                    player.pause()
                                    isGeneratingFrames = true
                                    DispatchQueue.global(qos: .userInitiated).async {
                                        if let currentAsset = player.currentItem?.asset {
                                            let duration = currentAsset.duration.seconds
                                            let generator = AVAssetImageGenerator(asset: currentAsset)
                                            generator.appliesPreferredTrackTransform = true
                                            generator.requestedTimeToleranceBefore = .zero
                                            generator.requestedTimeToleranceAfter = .zero
                                            
                                            var tempFrames: [(NSImage, String, Double)] = []
                                            
                                            let totalSeconds = Int(floor(duration))
                                            for s in 0...totalSeconds {
                                                let requestTime = CMTime(seconds: Double(s), preferredTimescale: 600)
                                                
                                                do {
                                                    var actual = CMTime.zero
                                                    let cg = try generator.copyCGImage(at: requestTime, actualTime: &actual)
                                                    let mm = s / 60
                                                    let ss = s % 60
                                                    let label = String(format: "%02d:%02d", mm, ss)
                                                    
                                                    let img = NSImage(cgImage: cg, size: NSSize(width: 80, height: 45))
                                                    tempFrames.append((img, label, Double(s)))
                                                } catch {}
                                            }
                                            
                                            DispatchQueue.main.async {
                                                frames = tempFrames
                                                isGeneratingFrames = false
                                            }
                                        } else {
                                            DispatchQueue.main.async {
                                                isGeneratingFrames = false
                                            }
                                        }
                                    }
                                }
                            }
                            .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0,
                                             topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                             shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .frame(width: 15, height: 15)
                            .overlay(
                                Image(systemName: isFrameState ? "xmark.square" : "film.stack")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color.white.opacity(0.9))
                                    .allowsHitTesting(false)
                            )
                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                        }
                        .padding(.horizontal, 12)
                        
                        Spacer()
                        
                        HStack {
                            VideoButtonMain {
                                let currentSeconds = player.currentTime().seconds
                                let newTime = max(currentSeconds - 15, 0)
                                player.seek(to: CMTime(seconds: newTime, preferredTimescale: player.currentTime().timescale))
                            }
                            .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .disabled(isFrameState ? true : false)
                            .frame(width: 15, height: 15)
                            .overlay(
                                Image(systemName: "backward")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundColor(isFrameState ? Color.white.opacity(0.4) : Color.white.opacity(0.8))
                                    .allowsHitTesting(false)
                            )
                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                            
                            VideoButtonMain {
                                if isPlaying {
                                    player.pause()
                                } else {
                                    player.play()
                                    player.rate = Float(playbackSpeed)
                                }
                                isPlaying.toggle()
                            }
                            .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0,
                                             topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                             shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .disabled(isFrameState ? true : false)
                            .frame(width: 15, height: 15)
                            .overlay(
                                Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(isFrameState ? Color.white.opacity(0.4) : Color.white.opacity(0.8))
                                    .allowsHitTesting(false)
                            )
                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                            
                            VideoButtonMain {
                                if isLooping {
                                    isLooping = false
                                } else {
                                    isLooping = true
                                }
                            }
                            .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0,
                                             topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                             shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .disabled(isFrameState ? true : false)
                            .frame(width: 15, height: 15)
                            .overlay(
                                Image(systemName: "repeat")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(isFrameState ? Color.white.opacity(0.4) : (!isLooping ? Color.white.opacity(0.8) : Color(hex: 0xAD6ADD)))
                                    .allowsHitTesting(false)
                            )
                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                            
                            VideoButtonMain {
                                let currentSeconds = player.currentTime().seconds
                                let duration = player.currentItem?.duration.seconds ?? 0
                                let newTime = min(currentSeconds + 15, duration)
                                player.seek(to: CMTime(seconds: newTime, preferredTimescale: player.currentTime().timescale))
                            }
                            .containerHelper(backgroundColor: Color.clear, borderColor: Color.clear, borderWidth: 0,
                                             topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                             shadowColor: Color.clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .disabled(isFrameState ? true : false)
                            .frame(width: 15, height: 15)
                            .overlay(
                                Image(systemName: "forward")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundColor(isFrameState ? Color.white.opacity(0.4) : Color.white.opacity(0.8))
                                    .allowsHitTesting(false)
                            )
                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                        }
                        .padding(.horizontal, 12)
                        
                        Spacer()
                        
                        HStack {
                            Toggle("", isOn: $preserveAspectRatio)
                                .toggleStyle(ToggleSwitch(
                                    toggleWidth: 25,
                                    toggleHeight: 14,
                                    circleSize: 12,
                                    activeColor: .purple.opacity(isFrameState ? 0.4 : 1.0),
                                    inactiveColor: Color(hex: 0x333333).opacity(isFrameState ? 0.4 : 1.0),
                                    thumbColor: .white.opacity(isFrameState ? 0.4 : 1.0),
                                    textColor: .white.opacity(isFrameState ? 0.4 : 0.8),
                                    fontSize: 9,
                                    fontWeight: .bold,
                                    activeText: "Preserve Aspect Ratio",
                                    inactiveText: "Ignore Aspect Ratio",
                                    showText: true,
                                    animationDuration: 0.2,
                                    animationDamping: 0.8
                                ))
                                .padding(.trailing, 20)
                        }
                        .padding(.horizontal, 12)
                        .disabled(isFrameState)
                    }
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7, height: 60)
                    .containerHelper(backgroundColor: Color(hex: 0x171717), borderColor: .clear, borderWidth: 0,
                                     topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                                     shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                    .overlay(
                        Rectangle()
                            .frame(height: 3.0)
                            .foregroundColor(Color(hex: 0x121212).opacity(0.4)),
                        alignment: .top
                    )
                }
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7)
                .frame(maxHeight: .infinity)
            }
            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
            .frame(maxHeight: .infinity)
            .containerHelper(backgroundColor: Color(hex: 0x242424), borderColor: .clear, borderWidth: 0,
                             topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                             shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                alignment: .top
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onChange(of: preserveAspectRatio) { newValue in
            if newValue {
                originalAspectRatio = videoSize.width / videoSize.height
            }
        }
        .onChange(of: isFrameState) { newValue in
            let topLimit = editorSize.height - (newValue ? 100 : 0)
            videoPosition = CGPoint(x: editorSize.width / 2, y: topLimit / 2)
        }
        .onChange(of: playbackSpeed) { newValue in
            if isPlaying {
                player.rate = Float(newValue)
            }
        }
        .onAppear {
            NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: player.currentItem, queue: .main) { _ in
                if isLooping {
                    player.seek(to: .zero)
                    player.play()
                }
            }
        }
    }
    
    private enum Corner {
        case topLeft, topRight, bottomLeft, bottomRight
    }
    
    private func fixedLocalOffset(for corner: Corner, size: CGSize) -> CGPoint {
        switch corner {
        case .topLeft:
            return CGPoint(x: size.width/2, y: size.height/2)
        case .topRight:
            return CGPoint(x: -size.width/2, y: size.height/2)
        case .bottomLeft:
            return CGPoint(x: size.width/2, y: -size.height/2)
        case .bottomRight:
            return CGPoint(x: -size.width/2, y: -size.height/2)
        }
    }
    
    private func calculateCornerPosition(_ corner: Corner) -> CGPoint {
        let offset: CGPoint
        switch corner {
        case .topLeft:
            offset = CGPoint(x: -videoSize.width/2, y: -videoSize.height/2)
        case .topRight:
            offset = CGPoint(x: videoSize.width/2, y: -videoSize.height/2)
        case .bottomLeft:
            offset = CGPoint(x: -videoSize.width/2, y: videoSize.height/2)
        case .bottomRight:
            offset = CGPoint(x: videoSize.width/2, y: videoSize.height/2)
        }
        let rad = CGFloat(rotationAngle.radians)
        let rotatedOffset = CGPoint(
            x: offset.x * cos(rad) - offset.y * sin(rad),
            y: offset.x * sin(rad) + offset.y * cos(rad)
        )
        return CGPoint(x: videoPosition.x + rotatedOffset.x, y: videoPosition.y + rotatedOffset.y)
    }
    
    private func dragGesture(for corner: Corner) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                if initialDragVideoSize == nil || initialDragVideoPosition == nil {
                    initialDragVideoSize = videoSize
                    initialDragVideoPosition = videoPosition
                    if preserveAspectRatio {
                        originalAspectRatio = videoSize.width / videoSize.height
                    }
                }
                let translation = value.translation
                let rad = CGFloat(rotationAngle.radians)
                let localTranslationX = translation.width * cos(rad) + translation.height * sin(rad)
                let localTranslationY = -translation.width * sin(rad) + translation.height * cos(rad)
                let sensitivity: CGFloat = 0.5
                var newWidth: CGFloat = videoSize.width
                var newHeight: CGFloat = videoSize.height
                
                if let initialSize = initialDragVideoSize {
                    switch corner {
                    case .topLeft:
                        newWidth = max(50, initialSize.width - localTranslationX * sensitivity)
                        if preserveAspectRatio {
                            newHeight = newWidth / originalAspectRatio
                        } else {
                            newHeight = max(50, initialSize.height - localTranslationY * sensitivity)
                        }
                    case .topRight:
                        newWidth = max(50, initialSize.width + localTranslationX * sensitivity)
                        if preserveAspectRatio {
                            newHeight = newWidth / originalAspectRatio
                        } else {
                            newHeight = max(50, initialSize.height - localTranslationY * sensitivity)
                        }
                    case .bottomLeft:
                        newWidth = max(50, initialSize.width - localTranslationX * sensitivity)
                        if preserveAspectRatio {
                            newHeight = newWidth / originalAspectRatio
                        } else {
                            newHeight = max(50, initialSize.height + localTranslationY * sensitivity)
                        }
                    case .bottomRight:
                        newWidth = max(50, initialSize.width + localTranslationX * sensitivity)
                        if preserveAspectRatio {
                            newHeight = newWidth / originalAspectRatio
                        } else {
                            newHeight = max(50, initialSize.height + localTranslationY * sensitivity)
                        }
                    }
                }
                
                videoSize = CGSize(width: newWidth, height: newHeight)
                if let initialCenter = initialDragVideoPosition, let initialSize = initialDragVideoSize {
                    let initialFixedLocal = fixedLocalOffset(for: corner, size: initialSize)
                    let initialFixedScreen = CGPoint(
                        x: initialCenter.x + initialFixedLocal.x * cos(rad) - initialFixedLocal.y * sin(rad),
                        y: initialCenter.y + initialFixedLocal.x * sin(rad) + initialFixedLocal.y * cos(rad)
                    )
                    let newFixedLocal = fixedLocalOffset(for: corner, size: CGSize(width: newWidth, height: newHeight))
                    let rotatedNewFixed = CGPoint(
                        x: newFixedLocal.x * cos(rad) - newFixedLocal.y * sin(rad),
                        y: newFixedLocal.x * sin(rad) + newFixedLocal.y * cos(rad)
                    )
                    videoPosition = CGPoint(x: initialFixedScreen.x - rotatedNewFixed.x,
                                            y: initialFixedScreen.y - rotatedNewFixed.y)
                }
                updateTextFields()
            }
            .onEnded { _ in
                if !preserveAspectRatio {
                    originalAspectRatio = videoSize.width / videoSize.height
                }
                initialDragVideoSize = nil
                initialDragVideoPosition = nil
            }
    }
    
    private func videoDragGesture() -> some Gesture {
        DragGesture()
            .onChanged { value in
                if initialDragOffset == nil {
                    initialDragOffset = videoPosition
                }
                let newX = initialDragOffset!.x + value.translation.width
                let newY = initialDragOffset!.y + value.translation.height
                let halfWidth = videoSize.width / 2
                let halfHeight = videoSize.height / 2
                let topLimit = isFrameState ? (editorSize.height - 100) : editorSize.height
                
                let clampedX = min(max(newX, halfWidth), editorSize.width - halfWidth)
                let clampedY = min(max(newY, halfHeight), topLimit - halfHeight)
                videoPosition = CGPoint(x: clampedX, y: clampedY)
                updateTextFields()
            }
            .onEnded { _ in
                initialDragOffset = nil
            }
    }
    
    private func updateTextFields() {
        videoWidth = String(format: "W: %.1fpx", videoSize.width)
        videoHeight = String(format: "H: %.1fpx", videoSize.height)
        xPos = String(format: "X: %.1f", videoPosition.x)
        yPos = String(format: "Y: %.1f", videoPosition.y)
    }
    
    private func extractNumeric(from text: String) -> String {
        let allowedCharacters = "0123456789.-"
        return text.filter { allowedCharacters.contains($0) }
    }
    
    private func rotatedCropCornerPosition(for corner: Corner) -> CGPoint {
        let halfWidth = cropRectSize.width / 2
        let halfHeight = cropRectSize.height / 2
        let vector: CGPoint
        switch corner {
        case .topLeft:
            vector = CGPoint(x: -halfWidth, y: -halfHeight)
        case .topRight:
            vector = CGPoint(x: halfWidth, y: -halfHeight)
        case .bottomLeft:
            vector = CGPoint(x: -halfWidth, y: halfHeight)
        case .bottomRight:
            vector = CGPoint(x: halfWidth, y: halfHeight)
        }
        let rad = CGFloat((cropRotationAngle + rotationAngle).radians)
        let rotatedVector = CGPoint(
            x: vector.x * cos(rad) - vector.y * sin(rad),
            y: vector.x * sin(rad) + vector.y * cos(rad)
        )
        return CGPoint(x: cropRectPosition.x + rotatedVector.x, y: cropRectPosition.y + rotatedVector.y)
    }
    
    private func cropRotationHandlePosition(for corner: Corner) -> CGPoint {
        let base = rotatedCropCornerPosition(for: corner)
        let dx = base.x - cropRectPosition.x
        let dy = base.y - cropRectPosition.y
        let factor: CGFloat = 1.1
        return CGPoint(x: cropRectPosition.x + dx * factor, y: cropRectPosition.y + dy * factor)
    }
    
    private func cropRotationGesture() -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                let center = cropRectPosition
                let currentAngle = atan2(value.location.y - center.y, value.location.x - center.x)
                if initialCropRotationOffset == nil {
                    let startAngle = atan2(value.startLocation.y - center.y, value.startLocation.x - center.x)
                    initialCropRotationOffset = cropRotationAngle - Angle(radians: Double(startAngle))
                }
                cropRotationAngle = Angle(radians: Double(currentAngle)) + (initialCropRotationOffset ?? .zero)
            }
            .onEnded { _ in
                initialCropRotationOffset = nil
            }
    }
    
    private func cropResizeGesture(for corner: Corner) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                if initialCropRectSize == nil || initialCropRectPosition == nil {
                    initialCropRectSize = cropRectSize
                    initialCropRectPosition = cropRectPosition
                }
                let angle = CGFloat((cropRotationAngle + rotationAngle).radians)
                let localTranslation = CGPoint(
                    x: value.translation.width * cos(angle) + value.translation.height * sin(angle),
                    y: -value.translation.width * sin(angle) + value.translation.height * cos(angle)
                )
                let sensitivity: CGFloat = 1.0
                var newWidth = cropRectSize.width
                var newHeight = cropRectSize.height
                if let initialSize = initialCropRectSize {
                    switch corner {
                    case .topLeft:
                        newWidth = max(50, initialSize.width - localTranslation.x * sensitivity)
                        newHeight = max(50, initialSize.height - localTranslation.y * sensitivity)
                    case .topRight:
                        newWidth = max(50, initialSize.width + localTranslation.x * sensitivity)
                        newHeight = max(50, initialSize.height - localTranslation.y * sensitivity)
                    case .bottomLeft:
                        newWidth = max(50, initialSize.width - localTranslation.x * sensitivity)
                        newHeight = max(50, initialSize.height + localTranslation.y * sensitivity)
                    case .bottomRight:
                        newWidth = max(50, initialSize.width + localTranslation.x * sensitivity)
                        newHeight = max(50, initialSize.height + localTranslation.y * sensitivity)
                    }
                }
                let localCenterShift = CGPoint(x: localTranslation.x / 2, y: localTranslation.y / 2)
                let rotatedCenterShift = CGPoint(
                    x: localCenterShift.x * cos(angle) - localCenterShift.y * sin(angle),
                    y: localCenterShift.x * sin(angle) + localCenterShift.y * cos(angle)
                )
                var newCenter = cropRectPosition
                if let initialCenter = initialCropRectPosition {
                    newCenter = CGPoint(x: initialCenter.x + rotatedCenterShift.x,
                                        y: initialCenter.y + rotatedCenterShift.y)
                }
                cropRectSize = CGSize(width: newWidth, height: newHeight)
                cropRectPosition = newCenter
            }
            .onEnded { _ in
                initialCropRectSize = nil
                initialCropRectPosition = nil
            }
    }
    
    private func cropDragGesture() -> some Gesture {
        DragGesture()
            .onChanged { value in
                if initialCropDragOffset == nil {
                    initialCropDragOffset = cropRectPosition
                }
                let newCenter = CGPoint(x: initialCropDragOffset!.x + value.translation.width,
                                        y: initialCropDragOffset!.y + value.translation.height)
                cropRectPosition = newCenter
            }
            .onEnded { _ in
                initialCropDragOffset = nil
            }
    }
    
    private func cropVideo() {
        if let currentItem = player.currentItem {
            cropHistory.append((item: currentItem, size: videoSize, position: videoPosition, cropRect: currentCropRect))
        }
        
        DispatchQueue.global(qos: .userInitiated).async {
            guard let currentAsset = player.currentItem?.asset else { return }
            guard let videoTrack = currentAsset.tracks(withMediaType: .video).first else { return }
            
            let pixelWidth = currentCropRect.width
            let pixelHeight = currentCropRect.height
            
            let viewToVideoScaleX = pixelWidth / videoSize.width
            let viewToVideoScaleY = pixelHeight / videoSize.height
            
            let videoRad = CGFloat(rotationAngle.radians)
            let cropRad = CGFloat((cropRotationAngle + rotationAngle).radians)
            
            let halfWidth = cropRectSize.width / 2
            let halfHeight = cropRectSize.height / 2
            let cropCorners = [
                CGPoint(x: -halfWidth, y: -halfHeight),
                CGPoint(x: halfWidth, y: -halfHeight),
                CGPoint(x: halfWidth, y: halfHeight),
                CGPoint(x: -halfWidth, y: halfHeight)
            ]
            
            var pixelCorners: [CGPoint] = []
            for corner in cropCorners {
                let rotatedCrop = CGPoint(
                    x: corner.x * cos(cropRad) - corner.y * sin(cropRad),
                    y: corner.x * sin(cropRad) + corner.y * cos(cropRad)
                )
                
                let translationX = cropRectPosition.x + rotatedCrop.x - videoPosition.x
                let translationY = cropRectPosition.y + rotatedCrop.y - videoPosition.y
                let flippedTranslationX = (flipHorizontal ? -1 : 1) * translationX
                let flippedTranslationY = (flipVertical ? -1 : 1) * translationY
                let viewPoint = CGPoint(x: flippedTranslationX, y: flippedTranslationY)
                
                let unrotated = CGPoint(
                    x: viewPoint.x * cos(-videoRad) - viewPoint.y * sin(-videoRad),
                    y: viewPoint.x * sin(-videoRad) + viewPoint.y * cos(-videoRad)
                )
                
                let pixelPoint = CGPoint(
                    x: (unrotated.x + videoSize.width/2) * viewToVideoScaleX,
                    y: (unrotated.y + videoSize.height/2) * viewToVideoScaleY
                )
                pixelCorners.append(pixelPoint)
            }
            
            let minX = pixelCorners.map { $0.x }.min() ?? 0
            let maxX = pixelCorners.map { $0.x }.max() ?? pixelWidth
            let minY = pixelCorners.map { $0.y }.min() ?? 0
            let maxY = pixelCorners.map { $0.y }.max() ?? pixelHeight
            
            let newCropPixelRect = CGRect(
                x: max(0, minX),
                y: max(0, minY),
                width: min(pixelWidth - max(0, minX), maxX - minX),
                height: min(pixelHeight - max(0, minY), maxY - minY)
            )
            
            let updatedCropRect = CGRect(
                x: currentCropRect.origin.x + newCropPixelRect.origin.x,
                y: currentCropRect.origin.y + newCropPixelRect.origin.y,
                width: newCropPixelRect.size.width,
                height: newCropPixelRect.size.height
            )
            
            let composition = AVMutableVideoComposition()
            composition.renderSize = updatedCropRect.size
            composition.frameDuration = CMTime(value: 1, timescale: 30)
            
            let instruction = AVMutableVideoCompositionInstruction()
            instruction.timeRange = CMTimeRange(start: .zero, duration: currentAsset.duration)
            
            let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
            let transform = CGAffineTransform(translationX: -updatedCropRect.origin.x, y: -updatedCropRect.origin.y)
            layerInstruction.setTransform(transform, at: .zero)
            
            instruction.layerInstructions = [layerInstruction]
            composition.instructions = [instruction]
            
            DispatchQueue.main.async {
                let playerItem = AVPlayerItem(asset: currentAsset)
                playerItem.videoComposition = composition
                player.replaceCurrentItem(with: playerItem)
                
                videoSize = cropRectSize
                videoPosition = cropRectPosition
                currentCropRect = updatedCropRect
                updateTextFields()
            }
        }
    }
}

struct VideoPlayer: NSViewRepresentable {
    let player: AVPlayer
    let preserveAspectRatio: Bool
    
    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        let playerLayer = AVPlayerLayer(player: player)
        playerLayer.frame = view.bounds
        playerLayer.videoGravity = .resize
        view.layer = playerLayer
        view.wantsLayer = true
        return view
    }
    
    func updateNSView(_ nsView: NSView, context: Context) {
        if let playerLayer = nsView.layer as? AVPlayerLayer {
            playerLayer.player = player
            playerLayer.videoGravity = .resize
            playerLayer.mask = nil
        }
    }
}

private extension NSImage {
    var scale: CGFloat {
        let rep = self.representations.first as? NSBitmapImageRep
        return CGFloat(rep?.pixelsWide ?? Int(self.size.width)) / self.size.width
    }
}

private extension NSImage {
    func cropped(to rect: CGRect) -> NSImage? {
        guard let cgImage = self.cgImage(forProposedRect: nil, context: nil, hints: nil),
              let croppedCGImage = cgImage.cropping(to: rect) else { return nil }
        return NSImage(cgImage: croppedCGImage, size: rect.size)
    }
}
