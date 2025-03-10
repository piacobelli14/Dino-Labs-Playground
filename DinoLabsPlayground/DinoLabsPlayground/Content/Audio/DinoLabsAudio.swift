//
//  DinoLabsAudio.swift
//
//  Created by Peter Iacobelli on 3/10/25.
//

import SwiftUI
import AVFoundation

struct AudioView: View {
    let geometry: GeometryProxy
    let fileURL: URL
    @Binding var hasUnsavedChanges: Bool
    @Binding var leftPanelWidthRatio: CGFloat
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 0) {
                        VStack(spacing: 0) {
                            HStack(spacing: 0) {
                                Image(systemName: "airpodsmax")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 15, height: 15)
                                    .font(.system(size: 15, weight: .semibold))
                                    .padding(.leading, 12)
                                    .padding(.trailing, 8)
                                
                                Text("Audio")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(hex: 0xc1c1c1))
                                
                                Spacer()
                                
                                HStack(spacing: 12) {
                                    AudioButtonMain {
                                        
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
                        HStack {
                            WaveformView(fileURL: fileURL)
                        }
                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7, height: 140)
                        .containerHelper(backgroundColor: Color(hex: 0x00FFD7).opacity(0.1), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                        .overlay(
                            Rectangle()
                                .frame(height: 1.0)
                                .foregroundColor(Color(hex: 0x414141).opacity(0.8)),
                            alignment: .bottom
                        )
                        
                        Spacer()
                        
                    }
                    .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7)
                    .frame(maxHeight: .infinity - 60)
                    .containerHelper(backgroundColor: Color(hex: 0x242424), borderColor: .clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                    
                    
                    HStack(spacing: 0) {
                        Spacer()
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
}

struct WaveformView: View {
    let fileURL: URL
    @State private var samples: [Float] = []
    private let verticalScale: CGFloat = 1.0
    
    var body: some View {
        GeometryReader { geometry in
            if samples.isEmpty {
                HStack {
                    Spacer()
                    VStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    Spacer()
                }
            } else {
                Path { path in
                    let topPadding: CGFloat = 10
                    let bottomPadding: CGFloat = 10
                    let midY = geometry.size.height / 2
                    let availableHeight = geometry.size.height - (topPadding + bottomPadding)
                    let halfHeight = availableHeight / 2
                    let width = geometry.size.width
                    let sampleCount = samples.count
                    let step = max(1, CGFloat(sampleCount) / width)
                    
                    var topPoints: [CGPoint] = []
                    for x in stride(from: 0, to: CGFloat(sampleCount), by: step) {
                        let index = Int(x)
                        if index < sampleCount {
                            let xPos = (CGFloat(index) / CGFloat(max(sampleCount - 1, 1))) * width
                            let yOffset = CGFloat(samples[index]) * halfHeight * verticalScale
                            let yPos = midY - yOffset
                            topPoints.append(CGPoint(x: xPos, y: yPos))
                        }
                    }
                    
                    path.move(to: CGPoint(x: 0, y: midY))
                    for point in topPoints {
                        path.addLine(to: point)
                    }
                    path.addLine(to: CGPoint(x: width, y: midY))
                    for point in topPoints.reversed() {
                        let mirrorPoint = CGPoint(x: point.x, y: 2 * midY - point.y)
                        path.addLine(to: mirrorPoint)
                    }
                    path.closeSubpath()
                }
                .fill(Color(hex: 0x00FFD7))
            }
        }
    }
    
    func loadSamples() {
        let asset = AVURLAsset(url: fileURL)
        guard let assetTrack = asset.tracks(withMediaType: .audio).first else {
            return
        }
        
        let assetReader: AVAssetReader
        do {
            assetReader = try AVAssetReader(asset: asset)
        } catch {
            return
        }
        
        let outputSettings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: true,
            AVLinearPCMBitDepthKey: 32
        ]
        
        let trackOutput = AVAssetReaderTrackOutput(track: assetTrack, outputSettings: outputSettings)
        assetReader.add(trackOutput)
        assetReader.startReading()
        
        var sampleData = [Float]()
        
        while let sampleBuffer = trackOutput.copyNextSampleBuffer() {
            if let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) {
                let length = CMBlockBufferGetDataLength(blockBuffer)
                var data = Data(count: length)
                data.withUnsafeMutableBytes { (bytes: UnsafeMutableRawBufferPointer) in
                    if let baseAddress = bytes.baseAddress {
                        CMBlockBufferCopyDataBytes(blockBuffer, atOffset: 0, dataLength: length, destination: baseAddress)
                    }
                }
                let sampleCount = length / MemoryLayout<Float>.size
                data.withUnsafeBytes { (samplesPointer: UnsafeRawBufferPointer) in
                    let samplesBuffer = samplesPointer.bindMemory(to: Float.self)
                    for i in 0..<sampleCount {
                        sampleData.append(samplesBuffer[i])
                    }
                }
            }
            CMSampleBufferInvalidate(sampleBuffer)
        }
        
        DispatchQueue.main.async {
            self.samples = sampleData
        }
    }
}
