//
//  DinoLabsImage.swift
//
//  Created by Peter Iacobelli on 3/4/25.
//

import SwiftUI

struct ImageView: View {
    let geometry: GeometryProxy
    let fileURL: URL
    @Binding var hasUnsavedChanges: Bool
    @Binding var leftPanelWidthRatio: CGFloat
    
    @State private var xPos: String = "0.0"
    @State private var yPos: String = "0.0"
    @State private var imageWidth: String = "0.0"
    @State private var imageHeight: String = "0.0"
    @State private var preserveAspectRatio: Bool = true
    @State private var isCropping: Bool = false
    @State private var isCircleCropping: Bool = false
    @State private var imageSize: CGSize = .zero
    @State private var originalAspectRatio: CGFloat = 1.0
    @State private var lastDragPosition: CGPoint?
    @State private var imagePosition: CGPoint = .zero
    @State private var initialDragImageSize: CGSize?
    @State private var initialDragImagePosition: CGPoint?
    @State private var editorSize: CGSize = .zero
    @State private var initialDragOffset: CGPoint? = nil
    @State private var rotationAngle: Angle = .zero
    @State private var flipHorizontal: Bool = false
    @State private var flipVertical: Bool = false
    @State private var initialLoadedImageSize: CGSize = .zero
    @State private var initialLoadedImagePosition: CGPoint = .zero
    @State private var currentImage: NSImage? = nil
    @State private var cropHistory: [(image: NSImage, size: CGSize, position: CGPoint)] = []
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
    @State private var sepiaValue: CGFloat = 0.0
    @State private var imageScaleFactor: CGFloat = 1.0

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 0) {
                        VStack(spacing: 0) {
                            HStack(spacing: 0) {
                                Image(systemName: "photo.fill")
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
                                    ImageButtonMain {
                                        imageSize = initialLoadedImageSize
                                        imagePosition = initialLoadedImagePosition
                                        rotationAngle = .zero
                                        flipHorizontal = false
                                        flipVertical = false
                                        isCropping = false
                                        isCircleCropping = false
                                        cropRectSize = .zero
                                        cropRectPosition = .zero
                                        currentImage = NSImage(contentsOf: fileURL)
                                        cropHistory = []
                                        opacityValue = 1.0
                                        hueValue = 0.0
                                        saturationValue = 1.0
                                        brightnessValue = 0.0
                                        contrastValue = 1.0
                                        blurValue = 0.0
                                        grayscaleValue = 0.0
                                        sepiaValue = 0.0
                                        updateTextFields()
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
                                                imagePosition.x = CGFloat(newX)
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
                                                imagePosition.y = CGFloat(newY)
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
                                        ImageButtonMain {
                                            if !isCropping {
                                                let scale: CGFloat = 1.1
                                                let newWidth = imageSize.width * scale
                                                let newHeight = imageSize.height * scale
                                                imageSize = CGSize(width: newWidth, height: newHeight)
                                                updateTextFields()
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
                                        
                                        ImageButtonMain {
                                            if !isCropping {
                                                let scale: CGFloat = 0.9
                                                let newWidth = max(50, imageSize.width * scale)
                                                let newHeight = max(50, imageSize.height * scale)
                                                imageSize = CGSize(width: newWidth, height: newHeight)
                                                updateTextFields()
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
                                        
                                        ImageButtonMain {
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
                                        
                                        ImageButtonMain {
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
                                        
                                        ImageButtonMain {
                                            if !isCropping {
                                                flipHorizontal.toggle()
                                            }
                                        }
                                        .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                        .frame(width: geometry.size.width * 0.02, height: 20)
                                        .overlay(
                                            Image(systemName: "arrow.left.arrow.right")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                .allowsHitTesting(false)
                                        )
                                        .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        .opacity(isCropping ? 0.5 : 1.0)
                                        
                                        ImageButtonMain {
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
                                        Text("Image Size")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(Color(hex: 0xc1c1c1))
                                            .padding(.leading, 2)
                                        Spacer()
                                    }
                                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.9)
                                    .padding(.bottom, 8)
                                    
                                    HStack(spacing: 8) {
                                        CodeTextField(placeholder: "", text: $imageWidth, onReturnKeyPressed: {
                                            let numericString = extractNumeric(from: imageWidth)
                                            if let newWidth = Double(numericString) {
                                                if preserveAspectRatio {
                                                    imageSize.width = CGFloat(newWidth)
                                                    imageSize.height = CGFloat(newWidth) / originalAspectRatio
                                                } else {
                                                    imageSize.width = CGFloat(newWidth)
                                                }
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
                                        
                                        CodeTextField(placeholder: "", text: $imageHeight, onReturnKeyPressed: {
                                            let numericString = extractNumeric(from: imageHeight)
                                            if let newHeight = Double(numericString) {
                                                if preserveAspectRatio {
                                                    imageSize.height = CGFloat(newHeight)
                                                    imageSize.width = CGFloat(newHeight) * originalAspectRatio
                                                } else {
                                                    imageSize.height = CGFloat(newHeight)
                                                }
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
                                        ImageButtonMain {
                                            if isCropping {
                                                cropImage()
                                                isCropping = false
                                                isCircleCropping = false
                                            } else {
                                                isCropping = true
                                                isCircleCropping = false
                                                cropRectPosition = imagePosition
                                                cropRectSize = imageSize
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
                                        
                                        if isCropping {
                                            ImageButtonMain {
                                                if isCircleCropping {
                                                    isCircleCropping = false
                                                } else {
                                                    isCircleCropping = true
                                                    cropRectSize = imageSize
                                                    cropRectPosition = imagePosition
                                                }
                                            }
                                            .containerHelper(backgroundColor: isCircleCropping ? Color(hex: 0xAD6ADD) : Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                            .frame(width: geometry.size.width * 0.02, height: 20)
                                            .overlay(
                                                Image(systemName: "circle.dotted")
                                                    .font(.system(size: 10, weight: .semibold))
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                    .allowsHitTesting(false)
                                            )
                                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        }
                                        
                                        if isCropping {
                                            ImageButtonMain {
                                                isCropping = false
                                                cropRectSize = .zero
                                                cropRectPosition = .zero
                                            }
                                            .containerHelper(backgroundColor: Color(hex: 0x515151), borderColor: Color(hex: 0x616161), borderWidth: 1, topLeft: 2, topRight: 2, bottomLeft: 2, bottomRight: 2, shadowColor: Color.white.opacity(0.5), shadowRadius: 1, shadowX: 0, shadowY: 0)
                                            .frame(width: geometry.size.width * 0.02, height: 20)
                                            .overlay(
                                                Image(systemName: "xmark.square.fill")
                                                    .font(.system(size: 10, weight: .semibold))
                                                    .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.8))
                                                    .allowsHitTesting(false)
                                            )
                                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                        }
                                        
                                        ImageButtonMain {
                                            if let previousState = cropHistory.popLast() {
                                                currentImage = previousState.image
                                                imageSize = previousState.size
                                                imagePosition = previousState.position
                                            }
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
                                            ImageButtonMain {
                                                let presetRatio: CGFloat = 1.0
                                                let currentWidth = imageSize.width
                                                let currentHeight = imageSize.height
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
                                                cropRectPosition = imagePosition
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
                                            
                                            ImageButtonMain {
                                                let presetRatio: CGFloat = 4.0/3.0
                                                let currentWidth = imageSize.width
                                                let currentHeight = imageSize.height
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
                                                cropRectPosition = imagePosition
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
                                            
                                            ImageButtonMain {
                                                let presetRatio: CGFloat = 16.0/9.0
                                                let currentWidth = imageSize.width
                                                let currentHeight = imageSize.height
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
                                                cropRectPosition = imagePosition
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
                                            range: 0.0...1.0, step: 0.1, sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, sliderHeight: 8, thumbSize: 12, activeColor: .purple, inactiveColor: Color(white: 0.3), thumbColor: .white, showText: false, animationDuration: 0.2, animationDamping: 0.7
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
                                            range: 0.0...1.0, step: 0.1, sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, sliderHeight: 8, thumbSize: 12, activeColor: .purple, inactiveColor: Color(white: 0.3), thumbColor: .white, showText: false, animationDuration: 0.2, animationDamping: 0.7
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
                                            range: 0.0...1.0, step: 0.1, sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, thumbSize: 12, activeColor: .purple, inactiveColor: Color(white: 0.3), thumbColor: .white, showText: false, animationDuration: 0.2, animationDamping: 0.7
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
                                            range: -1.0...1.0, step: 0.1, sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, sliderHeight: 8, thumbSize: 12, activeColor: .purple, inactiveColor: Color(white: 0.3), thumbColor: .white, showText: false, animationDuration: 0.2, animationDamping: 0.7
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
                                            range: 0.0...1.0, step: 0.1, sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, thumbSize: 12, activeColor: .purple, inactiveColor: Color(white: 0.3), thumbColor: .white, showText: false, animationDuration: 0.2, animationDamping: 0.7
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
                                            range: 0.0...10.0, step: 0.1, sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, sliderHeight: 8, thumbSize: 12, activeColor: .purple, inactiveColor: Color(white: 0.3), thumbColor: .white, showText: false, animationDuration: 0.2, animationDamping: 0.7
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
                                            range: 0.0...1.0, step: 0.1, sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, sliderHeight: 8, thumbSize: 12, activeColor: .purple, inactiveColor: Color(white: 0.3), thumbColor: .white, showText: false, animationDuration: 0.2, animationDamping: 0.7
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
                                        Text("Sepia")
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
                                                get: { Double(sepiaValue) },
                                                set: { sepiaValue = CGFloat($0) }
                                            ),
                                            range: 0.0...0.5, step: 0.1, sliderWidth: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3) * 0.8, sliderHeight: 8, thumbSize: 12, activeColor: .purple, inactiveColor: Color(white: 0.3), thumbColor: .white, showText: false, animationDuration: 0.2, animationDamping: 0.7
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
                    .containerHelper(backgroundColor: Color(hex: 0x171717), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                    .overlay(
                        Rectangle()
                            .frame(width: 3.0)
                            .foregroundColor(Color(hex: 0x121212).opacity(0.4)),
                        alignment: .trailing
                    )
                }

                VStack(spacing: 0) {
                    VStack {
                        if let image = currentImage ?? NSImage(contentsOf: fileURL) {
                            GeometryReader { proxy in
                                ZStack {
                                    Image(nsImage: image)
                                        .resizable()
                                        .frame(width: imageSize.width, height: imageSize.height)
                                        .rotationEffect(rotationAngle)
                                        .scaleEffect(x: flipHorizontal ? -1 : 1, y: flipVertical ? -1 : 1)
                                        .opacity(Double(opacityValue))
                                        .hueRotation(Angle(degrees: hueValue))
                                        .saturation(saturationValue)
                                        .brightness(brightnessValue)
                                        .contrast(contrastValue)
                                        .blur(radius: blurValue)
                                        .grayscale(grayscaleValue)
                                        .overlay(
                                            Color(red: 89/255, green: 77/255, blue: 51/255)
                                                .opacity(Double(sepiaValue))
                                        )
                                        .position(imagePosition)
                                        .gesture(isCropping ? nil : imageDragGesture())
                                    
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
                                        if isCircleCropping {
                                            Ellipse()
                                                .fill(Color.black.opacity(0.3))
                                                .frame(width: cropRectSize.width, height: cropRectSize.height)
                                                .overlay(
                                                    Ellipse()
                                                        .stroke(Color.white.opacity(0.8), lineWidth: 2)
                                                )
                                                .rotationEffect(cropRotationAngle + rotationAngle)
                                                .scaleEffect(x: flipHorizontal ? -1 : 1, y: flipVertical ? -1 : 1)
                                                .position(cropRectPosition)
                                                .gesture(cropDragGesture())
                                        } else {
                                            Rectangle()
                                                .fill(Color.black.opacity(0.3))
                                                .frame(width: cropRectSize.width, height: cropRectSize.height)
                                                .border(Color.white.opacity(0.8), width: 2)
                                                .rotationEffect(cropRotationAngle + rotationAngle)
                                                .scaleEffect(x: flipHorizontal ? -1 : 1, y: flipVertical ? -1 : 1)
                                                .position(cropRectPosition)
                                                .gesture(cropDragGesture())
                                        }
                                        
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
                                    if imageSize == .zero {
                                        originalAspectRatio = image.size.width / image.size.height
                                        let maxWidth = proxy.size.width * 0.8
                                        let maxHeight = proxy.size.height * 0.8
                                        let scale = min(maxWidth / image.size.width, maxHeight / image.size.height)
                                        imageScaleFactor = scale
                                        imageSize = CGSize(
                                            width: image.size.width * scale,
                                            height: image.size.height * scale
                                        )
                                        imagePosition = CGPoint(x: proxy.size.width / 2, y: proxy.size.height / 2)
                                        initialLoadedImageSize = imageSize
                                        initialLoadedImagePosition = imagePosition
                                        updateTextFields()
                                        if currentImage == nil {
                                            currentImage = image
                                        }
                                    }
                                }
                            }
                            .clipped()
                        } else {
                            Text("Unable to load image.")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color(hex: 0xc1c1c1))
                                .padding()
                        }
                    }
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7)
                    .frame(maxHeight: .infinity - 60)
                    .containerHelper(backgroundColor: Color(hex: 0x242424), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                    
                    HStack(spacing: 0) {
                        Spacer()
                        Toggle("", isOn: $preserveAspectRatio)
                            .toggleStyle(ToggleSwitch(
                                toggleWidth: 25,
                                toggleHeight: 14,
                                circleSize: 12,
                                activeColor: .purple,
                                inactiveColor: Color(hex: 0x333333),
                                thumbColor: .white,
                                textColor: .white.opacity(0.8),
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
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7, height: 60)
                    .containerHelper(backgroundColor: Color(hex: 0x171717), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
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
            .containerHelper(backgroundColor: Color(hex: 0x242424), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                alignment: .top
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
            offset = CGPoint(x: -imageSize.width/2, y: -imageSize.height/2)
        case .topRight:
            offset = CGPoint(x: imageSize.width/2, y: -imageSize.height/2)
        case .bottomLeft:
            offset = CGPoint(x: -imageSize.width/2, y: imageSize.height/2)
        case .bottomRight:
            offset = CGPoint(x: imageSize.width/2, y: imageSize.height/2)
        }
        let rad = CGFloat(rotationAngle.radians)
        let rotatedOffset = CGPoint(
            x: offset.x * cos(rad) - offset.y * sin(rad),
            y: offset.x * sin(rad) + offset.y * cos(rad)
        )
        return CGPoint(x: imagePosition.x + rotatedOffset.x, y: imagePosition.y + rotatedOffset.y)
    }
    
    private func dragGesture(for corner: Corner) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                if initialDragImageSize == nil || initialDragImagePosition == nil {
                    initialDragImageSize = imageSize
                    initialDragImagePosition = imagePosition
                    if preserveAspectRatio {
                        originalAspectRatio = imageSize.width / imageSize.height
                    }
                }
                let translation = value.translation
                let rad = CGFloat(rotationAngle.radians)
                let localTranslationX = translation.width * cos(rad) + translation.height * sin(rad)
                let localTranslationY = -translation.width * sin(rad) + translation.height * cos(rad)
                let sensitivity: CGFloat = 0.5
                var newWidth: CGFloat = imageSize.width
                var newHeight: CGFloat = imageSize.height
                
                if let initialSize = initialDragImageSize {
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
                
                imageSize = CGSize(width: newWidth, height: newHeight)
                if let initialCenter = initialDragImagePosition, let initialSize = initialDragImageSize {
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
                    imagePosition = CGPoint(x: initialFixedScreen.x - rotatedNewFixed.x,
                                            y: initialFixedScreen.y - rotatedNewFixed.y)
                }
                updateTextFields()
            }
            .onEnded { _ in
                initialDragImageSize = nil
                initialDragImagePosition = nil
            }
    }
    
    private func imageDragGesture() -> some Gesture {
        DragGesture()
            .onChanged { value in
                if initialDragOffset == nil {
                    initialDragOffset = imagePosition
                }
                let newX = initialDragOffset!.x + value.translation.width
                let newY = initialDragOffset!.y + value.translation.height
                let halfWidth = imageSize.width / 2
                let halfHeight = imageSize.height / 2
                let clampedX = min(max(newX, halfWidth), editorSize.width - halfWidth)
                let clampedY = min(max(newY, halfHeight), editorSize.height - halfHeight)
                imagePosition = CGPoint(x: clampedX, y: clampedY)
                updateTextFields()
            }
            .onEnded { _ in
                initialDragOffset = nil
            }
    }
    
    private func updateTextFields() {
        imageWidth = String(format: "W: %.1fpx", imageSize.width)
        imageHeight = String(format: "H: %.1fpx", imageSize.height)
        xPos = String(format: "X: %.1f", imagePosition.x)
        yPos = String(format: "Y: %.1f", imagePosition.y)
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
    
    private func cropImage() {
        let isCircleCrop = isCircleCropping
        DispatchQueue.global(qos: .userInitiated).async {
            guard let image = currentImage ?? NSImage(contentsOf: fileURL),
                  let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
            
            let imageScale = image.scale
            let pixelWidth = CGFloat(cgImage.width)
            let pixelHeight = CGFloat(cgImage.height)
            
            let viewToImageScaleX = pixelWidth / imageSize.width
            let viewToImageScaleY = pixelHeight / imageSize.height
            
            let imageRad = CGFloat(rotationAngle.radians)
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
                
                let translationX = cropRectPosition.x + rotatedCrop.x - imagePosition.x
                let translationY = cropRectPosition.y + rotatedCrop.y - imagePosition.y
                let flippedTranslationX = (flipHorizontal ? -1 : 1) * translationX
                let flippedTranslationY = (flipVertical ? -1 : 1) * translationY
                let viewPoint = CGPoint(x: flippedTranslationX, y: flippedTranslationY)
                
                let unrotated = CGPoint(
                    x: viewPoint.x * cos(-imageRad) - viewPoint.y * sin(-imageRad),
                    y: viewPoint.x * sin(-imageRad) + viewPoint.y * cos(-imageRad)
                )
                
                let pixelPoint = CGPoint(
                    x: (unrotated.x + imageSize.width/2) * viewToImageScaleX,
                    y: (unrotated.y + imageSize.height/2) * viewToImageScaleY
                )
                pixelCorners.append(pixelPoint)
            }
            
            let minX = pixelCorners.map { $0.x }.min() ?? 0
            let maxX = pixelCorners.map { $0.x }.max() ?? 0
            let minY = pixelCorners.map { $0.y }.min() ?? 0
            let maxY = pixelCorners.map { $0.y }.max() ?? 0
            
            let cropRect = CGRect(
                x: max(0, minX),
                y: max(0, minY),
                width: min(pixelWidth - max(0, minX), maxX - minX),
                height: min(pixelHeight - max(0, minY), maxY - minY)
            )
            
            if isCircleCrop {
                guard let rectCroppedCG = cgImage.cropping(to: cropRect),
                      let ctx = CGContext(
                        data: nil,
                        width: Int(cropRect.width),
                        height: Int(cropRect.height),
                        bitsPerComponent: cgImage.bitsPerComponent,
                        bytesPerRow: 0,
                        space: cgImage.colorSpace ?? CGColorSpaceCreateDeviceRGB(),
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
                      ) else { return }
                
                ctx.setFillColor(NSColor.clear.cgColor)
                ctx.fill(CGRect(origin: .zero, size: cropRect.size))
                
                ctx.addEllipse(in: CGRect(origin: .zero, size: cropRect.size))
                ctx.clip()
                ctx.draw(rectCroppedCG, in: CGRect(origin: .zero, size: cropRect.size))
                
                if let newCG = ctx.makeImage() {
                    let newImage = NSImage(cgImage: newCG, size: cropRect.size)
                    DispatchQueue.main.async {
                        cropHistory.append((image: currentImage ?? image, size: imageSize, position: imagePosition))
                        currentImage = newImage
                        imageSize = cropRectSize
                        imagePosition = cropRectPosition
                        cropRectSize = .zero
                        cropRectPosition = .zero
                        updateTextFields()
                    }
                }
            } else {
                if let croppedCG = cgImage.cropping(to: cropRect) {
                    let newImage = NSImage(cgImage: croppedCG, size: cropRect.size)
                    DispatchQueue.main.async {
                        cropHistory.append((image: currentImage ?? image, size: imageSize, position: imagePosition))
                        currentImage = newImage
                        imageSize = cropRectSize
                        imagePosition = cropRectPosition
                        cropRectSize = .zero
                        cropRectPosition = .zero
                        updateTextFields()
                    }
                }
            }
        }
    }
    
    private func generateFinalImage() -> NSImage? {
        guard let baseImage = currentImage ?? NSImage(contentsOf: fileURL),
              let cgBase = baseImage.cgImage(forProposedRect: nil, context: nil, hints: nil)
        else { return nil }
        
        let originalSize = CGSize(width: CGFloat(cgBase.width), height: CGFloat(cgBase.height))
        let scaleX = originalSize.width / imageSize.width
        let scaleY = originalSize.height / imageSize.height
        let ciImage = CIImage(cgImage: cgBase)
        var outputImage = ciImage
        var transform = CGAffineTransform.identity
        transform = transform.scaledBy(x: flipHorizontal ? -1 : 1, y: flipVertical ? -1 : 1)
        transform = transform.rotated(by: CGFloat(rotationAngle.radians))
        transform = transform.scaledBy(x: scaleX, y: scaleY)
        outputImage = outputImage.transformed(by: transform)
        
        if let hueAdjust = CIFilter(name: "CIHueAdjust") {
            hueAdjust.setValue(outputImage, forKey: kCIInputImageKey)
            hueAdjust.setValue(NSNumber(value: hueValue * Double.pi / 180), forKey: "inputAngle")
            if let result = hueAdjust.outputImage {
                outputImage = result
            }
        }
        
        if let colorControls = CIFilter(name: "CIColorControls") {
            colorControls.setValue(outputImage, forKey: kCIInputImageKey)
            colorControls.setValue(saturationValue, forKey: kCIInputSaturationKey)
            colorControls.setValue(brightnessValue, forKey: kCIInputBrightnessKey)
            colorControls.setValue(contrastValue, forKey: kCIInputContrastKey)
            if let result = colorControls.outputImage {
                outputImage = result
            }
        }
        
        if blurValue > 0, let blurFilter = CIFilter(name: "CIGaussianBlur") {
            blurFilter.setValue(outputImage, forKey: kCIInputImageKey)
            blurFilter.setValue(blurValue, forKey: kCIInputRadiusKey)
            if let result = blurFilter.outputImage {
                outputImage = result
            }
        }
        
        if sepiaValue > 0, let sepia = CIFilter(name: "CISepiaTone") {
            sepia.setValue(outputImage, forKey: kCIInputImageKey)
            sepia.setValue(sepiaValue, forKey: kCIInputIntensityKey)
            if let result = sepia.outputImage {
                outputImage = result
            }
        }
        
        if grayscaleValue >= 0.5, let desaturate = CIFilter(name: "CIColorControls") {
            desaturate.setValue(outputImage, forKey: kCIInputImageKey)
            desaturate.setValue(0.0, forKey: kCIInputSaturationKey)
            if let result = desaturate.outputImage {
                outputImage = result
            }
        }
        
        if let opacityFilter = CIFilter(name: "CIColorMatrix") {
            opacityFilter.setValue(outputImage, forKey: kCIInputImageKey)
            opacityFilter.setValue(CIVector(x: 1, y: 0, z: 0, w: 0), forKey: "inputRVector")
            opacityFilter.setValue(CIVector(x: 0, y: 1, z: 0, w: 0), forKey: "inputGVector")
            opacityFilter.setValue(CIVector(x: 0, y: 0, z: 1, w: 0), forKey: "inputBVector")
            opacityFilter.setValue(CIVector(x: 0, y: 0, z: 0, w: opacityValue), forKey: "inputAVector")
            if let result = opacityFilter.outputImage {
                outputImage = result
            }
        }
        
        let context = CIContext(options: nil)
        if let cgOutput = context.createCGImage(outputImage, from: outputImage.extent) {
            return NSImage(cgImage: cgOutput, size: NSSize(width: cgOutput.width, height: cgOutput.height))
        }
        return nil
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

private extension NSImage {
    func pngData() -> Data? {
        guard let tiffData = self.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData) else { return nil }
        return bitmap.representation(using: .png, properties: [:])
    }
    
    func jpegData(compressionQuality: CGFloat) -> Data? {
        guard let tiffData = self.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData) else { return nil }
        return bitmap.representation(using: .jpeg, properties: [.compressionFactor: compressionQuality])
    }
}
