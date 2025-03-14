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
    
    @State private var isLooping: Bool = false
    @State private var isPlaying: Bool = false
    @State private var audioPlayer: AVAudioPlayer? = nil
    @State private var playbackSpeed: Float = 1.0
    @State private var playbackPosition: CGFloat = 0.0
    
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
                                    .containerHelper(
                                        backgroundColor: Color(hex: 0x515151),
                                        borderColor: Color(hex: 0x616161),
                                        borderWidth: 1,
                                        topLeft: 2,
                                        topRight: 2,
                                        bottomLeft: 2,
                                        bottomRight: 2,
                                        shadowColor: Color.white.opacity(0.5),
                                        shadowRadius: 1,
                                        shadowX: 0,
                                        shadowY: 0
                                    )
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
                            .containerHelper(
                                backgroundColor: Color(hex: 0x121212),
                                borderColor: .clear,
                                borderWidth: 0,
                                topLeft: 0,
                                topRight: 0,
                                bottomLeft: 0,
                                bottomRight: 0,
                                shadowColor: .clear,
                                shadowRadius: 0,
                                shadowX: 0,
                                shadowY: 0
                            )
                        
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
                    .containerHelper(
                        backgroundColor: Color(hex: 0x171717),
                        borderColor: .clear,
                        borderWidth: 0,
                        topLeft: 0,
                        topRight: 0,
                        bottomLeft: 0,
                        bottomRight: 0,
                        shadowColor: .clear,
                        shadowRadius: 0,
                        shadowX: 0,
                        shadowY: 0
                    )
                    .overlay(
                        Rectangle()
                            .frame(width: 3.0)
                            .foregroundColor(Color(hex: 0x121212).opacity(0.4)),
                        alignment: .trailing
                    )
                }
                GeometryReader { geometry in
                    VStack(spacing: 0) {
                        VStack(spacing: 0) {
                            HStack {
                                Waveform(fileURL: fileURL)
                            }
                            .frame(width: geometry.size.width, height: geometry.size.height * 0.25)
                            .containerHelper(
                                backgroundColor: Color(hex: 0x00FFD7).opacity(0.1),
                                borderColor: .clear,
                                borderWidth: 0,
                                topLeft: 0,
                                topRight: 0,
                                bottomLeft: 0,
                                bottomRight: 0,
                                shadowColor: .clear,
                                shadowRadius: 0,
                                shadowX: 0,
                                shadowY: 0
                            )
                            .overlay(
                                Rectangle()
                                    .frame(height: 1.0)
                                    .foregroundColor(Color(hex: 0x414141).opacity(0.8)),
                                alignment: .bottom
                            )
                            .overlay(
                                AudioTrackBar(playbackPosition: $playbackPosition, onDrag: { newPos in
                                    if let player = audioPlayer {
                                        player.currentTime = TimeInterval(newPos) * player.duration
                                    }
                                })
                            )
                            
                            HStack {
                                Oscilloscope(fileURL: fileURL, playbackPosition: $playbackPosition)
                            }
                            .frame(width: geometry.size.width, height: geometry.size.height * 0.2)
                            .containerHelper(
                                backgroundColor: Color(hex: 0x212121),
                                borderColor: .clear,
                                borderWidth: 0,
                                topLeft: 0,
                                topRight: 0,
                                bottomLeft: 0,
                                bottomRight: 0,
                                shadowColor: .clear,
                                shadowRadius: 0,
                                shadowX: 0,
                                shadowY: 0
                            )
                            .overlay(
                                Rectangle()
                                    .frame(height: 1.0)
                                    .foregroundColor(Color(hex: 0x414141).opacity(0.8)),
                                alignment: .bottom
                            )
                            
                            HStack {
                                HStack {
                                    FrequencyBars(fileURL: fileURL, playbackPosition: $playbackPosition)
                                }
                                .frame(width: geometry.size.width * 0.9, height: geometry.size.height * 0.2)
                                
                                HStack {
                                    VolumeBar(fileURL: fileURL, playbackPosition: $playbackPosition)
                                }
                                .frame(width: geometry.size.width * 0.1, height: geometry.size.height * 0.2)
                                .overlay(
                                    Rectangle()
                                        .frame(width: 1.0)
                                        .foregroundColor(Color(hex: 0x414141).opacity(0.8)),
                                    alignment: .leading
                                )
                                
                            }
                            .frame(width: geometry.size.width, height: geometry.size.height * 0.2)
                            .containerHelper(
                                backgroundColor: Color(hex: 0x212121),
                                borderColor: .clear,
                                borderWidth: 0,
                                topLeft: 0,
                                topRight: 0,
                                bottomLeft: 0,
                                bottomRight: 0,
                                shadowColor: .clear,
                                shadowRadius: 0,
                                shadowX: 0,
                                shadowY: 0
                            )
                            .overlay(
                                Rectangle()
                                    .frame(height: 1.0)
                                    .foregroundColor(Color(hex: 0x414141).opacity(0.8)),
                                alignment: .bottom
                            )
                            
                            Spacer()
                        }
                        .frame(width: geometry.size.width)
                        .frame(minHeight: geometry.size.height - 60, maxHeight: geometry.size.height - 60)
                        .containerHelper(
                            backgroundColor: Color(hex: 0x242424),
                            borderColor: .clear,
                            borderWidth: 0,
                            topLeft: 0,
                            topRight: 0,
                            bottomLeft: 0,
                            bottomRight: 0,
                            shadowColor: .clear,
                            shadowRadius: 0,
                            shadowX: 0,
                            shadowY: 0
                        )
                        
                        
                        HStack(spacing: 0) {
                            HStack {
                                AudioButtonMain {
                                    if let player = audioPlayer {
                                        player.currentTime = max(player.currentTime - 15, 0)
                                    }
                                }
                                .containerHelper(
                                    backgroundColor: Color.clear,
                                    borderColor: Color.clear,
                                    borderWidth: 0,
                                    topLeft: 0,
                                    topRight: 0,
                                    bottomLeft: 0,
                                    bottomRight: 0,
                                    shadowColor: Color.clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .frame(width: 15, height: 15)
                                .overlay(
                                    Image(systemName: "backward")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundColor(Color.white.opacity(0.8))
                                        .allowsHitTesting(false)
                                )
                                .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                
                                AudioButtonMain {
                                    if let player = audioPlayer {
                                        if player.isPlaying {
                                            player.pause()
                                            isPlaying = false
                                        } else {
                                            player.play()
                                            isPlaying = true
                                        }
                                    }
                                }
                                .containerHelper(
                                    backgroundColor: Color.clear,
                                    borderColor: Color.clear,
                                    borderWidth: 0,
                                    topLeft: 0,
                                    topRight: 0,
                                    bottomLeft: 0,
                                    bottomRight: 0,
                                    shadowColor: Color.clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .frame(width: 15, height: 15)
                                .overlay(
                                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(Color.white.opacity(0.8))
                                        .allowsHitTesting(false)
                                )
                                .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                
                                AudioButtonMain {
                                    isLooping.toggle()
                                    if let player = audioPlayer {
                                        player.numberOfLoops = isLooping ? -1 : 0
                                    }
                                }
                                .containerHelper(
                                    backgroundColor: Color.clear,
                                    borderColor: Color.clear,
                                    borderWidth: 0,
                                    topLeft: 0,
                                    topRight: 0,
                                    bottomLeft: 0,
                                    bottomRight: 0,
                                    shadowColor: Color.clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .frame(width: 15, height: 15)
                                .overlay(
                                    Image(systemName: "repeat")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(!isLooping ? Color.white.opacity(0.8) : Color(hex: 0xAD6ADD))
                                        .allowsHitTesting(false)
                                )
                                .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                                
                                AudioButtonMain {
                                    if let player = audioPlayer {
                                        let newTime = player.currentTime + 15
                                        player.currentTime = min(newTime, player.duration)
                                    }
                                }
                                .containerHelper(
                                    backgroundColor: Color.clear,
                                    borderColor: Color.clear,
                                    borderWidth: 0,
                                    topLeft: 0,
                                    topRight: 0,
                                    bottomLeft: 0,
                                    bottomRight: 0,
                                    shadowColor: Color.clear,
                                    shadowRadius: 0,
                                    shadowX: 0,
                                    shadowY: 0
                                )
                                .frame(width: 15, height: 15)
                                .overlay(
                                    Image(systemName: "forward")
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundColor(Color.white.opacity(0.8))
                                        .allowsHitTesting(false)
                                )
                                .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                            }
                            .padding(.horizontal, 12)
                            
                            Spacer()
                            
                            HStack {
                                Menu("\(playbackSpeed, specifier: "%.1fx")") {
                                    Button("0.5x") { playbackSpeed = 0.5; audioPlayer?.rate = 0.5 }
                                    Button("1.0x") { playbackSpeed = 1.0; audioPlayer?.rate = 1.0 }
                                    Button("1.5x") { playbackSpeed = 1.5; audioPlayer?.rate = 1.5 }
                                    Button("2.0x") { playbackSpeed = 2.0; audioPlayer?.rate = 2.0 }
                                    Button("2.5x") { playbackSpeed = 2.5; audioPlayer?.rate = 2.5 }
                                    Button("3.0x") { playbackSpeed = 3.0; audioPlayer?.rate = 3.0 }
                                }
                                .font(.system(size: 8, weight: .semibold))
                                .frame(width: 70)
                                .foregroundColor(Color.white.opacity(0.8))
                            }
                            .padding(.horizontal, 12)
                        }
                        .frame(width: geometry.size.width, height: 60)
                        .containerHelper(
                            backgroundColor: Color(hex: 0x171717),
                            borderColor: .clear,
                            borderWidth: 0,
                            topLeft: 0,
                            topRight: 0,
                            bottomLeft: 0,
                            bottomRight: 0,
                            shadowColor: .clear,
                            shadowRadius: 0,
                            shadowX: 0,
                            shadowY: 0
                        )
                        .overlay(
                            Rectangle()
                                .frame(height: 3.0)
                                .foregroundColor(Color(hex: 0x121212).opacity(0.4)),
                            alignment: .top
                        )
                        
                    }
                    .frame(width: geometry.size.width)
                    .frame(height: geometry.size.height)
                }
            }
            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio))
            .frame(maxHeight: .infinity)
            .containerHelper(
                backgroundColor: Color(hex: 0x242424),
                borderColor: .clear,
                borderWidth: 0,
                topLeft: 0,
                topRight: 0,
                bottomLeft: 0,
                bottomRight: 0,
                shadowColor: .clear,
                shadowRadius: 0,
                shadowX: 0,
                shadowY: 0
            )
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                alignment: .top
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            setupAudioPlayer()
        }
        .onReceive(Timer.publish(every: 0.05, on: .main, in: .common).autoconnect()) { _ in
            if let player = audioPlayer, player.isPlaying, player.duration > 0 {
                playbackPosition = CGFloat(player.currentTime / player.duration)
            }
        }
    }
    
    private func setupAudioPlayer() {
        do {
            audioPlayer = try AVAudioPlayer(contentsOf: fileURL)
            audioPlayer?.enableRate = true
            audioPlayer?.prepareToPlay()
            audioPlayer?.rate = playbackSpeed
        } catch {}
    }
}

struct AudioTrackBar: View {
    @Binding var playbackPosition: CGFloat
    var onDrag: (CGFloat) -> Void
    
    var body: some View {
        GeometryReader { geometry in
            let barX = playbackPosition * geometry.size.width
            Rectangle()
                .fill(Color(hex: 0x00FFD7))
                .frame(width: 2)
                .hoverEffect(cursor: .openHand)
                .position(x: barX, y: geometry.size.height / 2)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            var newPos = value.location.x / geometry.size.width
                            newPos = min(max(newPos, 0), 1)
                            playbackPosition = newPos
                            onDrag(newPos)
                        }
                )
        }
    }
}

struct Waveform: View {
    let fileURL: URL
    @State private var samples: [Float] = []
    private let verticalScale: CGFloat = 1.0
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
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
                    .fill(Color(hex: 0x00FFD7).opacity(0.9))
                }
            }
        }
        .onAppear {
            loadSamples()
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

struct Oscilloscope: View {
    let fileURL: URL
    @Binding var playbackPosition: CGFloat
    @State private var samples: [Float] = []
    private let verticalScale: CGFloat = 1.0
    private let windowSampleCount: Int = 1024
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Path { path in
                    let rect = geometry.frame(in: .local)
                    let midY = rect.midY
                    let thresholds: [CGFloat] = [0.25, 0.5, 0.75]
                    for t in thresholds {
                        let offset = (rect.height / 2) * t
                        path.move(to: CGPoint(x: rect.minX, y: midY - offset))
                        path.addLine(to: CGPoint(x: rect.maxX, y: midY - offset))
                        path.move(to: CGPoint(x: rect.minX, y: midY + offset))
                        path.addLine(to: CGPoint(x: rect.maxX, y: midY + offset))
                    }
                }
                .stroke(
                    Color.white.opacity(0.4),
                    style: StrokeStyle(lineWidth: 0.5, dash: [5, 5])
                )
                
                if !samples.isEmpty {
                    Path { path in
                        let rectWidth = geometry.size.width
                        let midY = geometry.size.height / 2
                        let totalSamples = samples.count
                        let currentIndex = Int(CGFloat(totalSamples) * playbackPosition)
                        let halfWindow = windowSampleCount / 2
                        let startIndex = max(0, currentIndex - halfWindow)
                        let endIndex = min(totalSamples - 1, currentIndex + halfWindow)
                        let windowSamples = Array(samples[startIndex...endIndex])
                        
                        let pixelCount = Int(rectWidth)
                        guard pixelCount > 0 else { return }
                        
                        let smoothingFactor: CGFloat = 0.7
                        var smoothedY: CGFloat = 0
                        
                        for x in 0 ..< pixelCount {
                            let ratio = CGFloat(x) / CGFloat(pixelCount - 1)
                            let sampleIndex = Int(ratio * CGFloat(windowSamples.count - 1))
                            let sample = windowSamples[sampleIndex]
                            
                            let rawY = midY - CGFloat(sample) * (midY * verticalScale)
                            
                            if x == 0 {
                                smoothedY = rawY
                                path.move(to: CGPoint(x: CGFloat(x), y: smoothedY))
                            } else {
                                smoothedY = smoothingFactor * smoothedY + (1 - smoothingFactor) * rawY
                                path.addLine(to: CGPoint(x: CGFloat(x), y: smoothedY))
                            }
                        }
                    }
                    .stroke(Color(hex: 0x00FFD7).opacity(0.8), lineWidth: 2)
                }
            }
        }
        .onAppear {
            loadSamples()
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
                        CMBlockBufferCopyDataBytes(
                            blockBuffer,
                            atOffset: 0,
                            dataLength: length,
                            destination: baseAddress
                        )
                    }
                }
                
                let sampleCount = length / MemoryLayout<Float>.size
                data.withUnsafeBytes { (samplesPointer: UnsafeRawBufferPointer) in
                    let floatBuffer = samplesPointer.bindMemory(to: Float.self)
                    for i in 0 ..< sampleCount {
                        sampleData.append(floatBuffer[i])
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

struct FrequencyBars: View {
    let fileURL: URL
    @Binding var playbackPosition: CGFloat
    
    private let binCount: Int = 64
    private let windowSampleCount: Int = 1024
    @State private var smoothedMagnitudes: [CGFloat] = []
    @State private var samples: [Float] = []
    private let smoothingFactor: CGFloat = 0.25
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
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
                    Canvas { context, size in
                        let topPadding: CGFloat = 10
                        let availableHeight = size.height - topPadding
                        
                        let maxVal = smoothedMagnitudes.max() ?? 1
                        let binWidth = size.width / CGFloat(binCount)
                        
                        for (i, mag) in smoothedMagnitudes.enumerated() {
                            let normalized = mag / maxVal
                            let barHeight = normalized * availableHeight
                            
                            let xPos = CGFloat(i) * binWidth + binWidth / 2
                            let yBot = size.height
                            let yTop = size.height - barHeight
                            
                            let gradient = Gradient(colors: [
                                Color(hex: 0x0080FF).opacity(1.0),
                                Color(hex: 0x00FFD7).opacity(1.0)
                            ])
                            
                            var linePath = Path()
                            linePath.move(to: CGPoint(x: xPos, y: yBot))
                            linePath.addLine(to: CGPoint(x: xPos, y: max(yTop, topPadding)))
                            
                            context.stroke(
                                linePath,
                                with: .linearGradient(
                                    gradient,
                                    startPoint: CGPoint(x: 0, y: size.height * 0.5),
                                    endPoint: CGPoint(x: size.width, y: size.height * 0.5)
                                ),
                                style: StrokeStyle(lineWidth: binWidth * 0.7, lineCap: .round)
                            )
                        }
                    }
                }
            }
        }
        .onChange(of: playbackPosition) { _ in
            updateMagnitudes()
        }
        .onAppear {
            loadSamples()
            smoothedMagnitudes = Array(repeating: 0, count: binCount)
        }
    }
    
    private func updateMagnitudes() {
        guard !samples.isEmpty else { return }
        
        let totalCount = samples.count
        let currentIndex = Int(CGFloat(totalCount) * playbackPosition)
        let halfWindow = windowSampleCount / 2
        let startIndex = max(0, currentIndex - halfWindow)
        let endIndex = min(totalCount - 1, currentIndex + halfWindow)
        let windowSamples = Array(samples[startIndex...endIndex])
        
        let chunkSize = max(1, windowSamples.count / binCount)
        var rawMagnitudes = [CGFloat](repeating: 0, count: binCount)
        
        for bin in 0 ..< binCount {
            let binStart = bin * chunkSize
            let binEnd = min(binStart + chunkSize, windowSamples.count)
            if binStart >= binEnd {
                rawMagnitudes[bin] = 0
                continue
            }
            var sum: Float = 0
            for i in binStart ..< binEnd {
                sum += fabsf(windowSamples[i])
            }
            let avg = sum / Float(binEnd - binStart)
            rawMagnitudes[bin] = CGFloat(avg)
        }
        
        if smoothedMagnitudes.count == binCount {
            for i in 0..<binCount {
                smoothedMagnitudes[i] =
                    (1 - smoothingFactor) * smoothedMagnitudes[i] +
                    smoothingFactor * rawMagnitudes[i]
            }
        }
    }
    
    private func loadSamples() {
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
                        CMBlockBufferCopyDataBytes(
                            blockBuffer,
                            atOffset: 0,
                            dataLength: length,
                            destination: baseAddress
                        )
                    }
                }
                
                let sampleCount = length / MemoryLayout<Float>.size
                data.withUnsafeBytes { (samplesPointer: UnsafeRawBufferPointer) in
                    let floatBuffer = samplesPointer.bindMemory(to: Float.self)
                    for i in 0 ..< sampleCount {
                        sampleData.append(floatBuffer[i])
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

struct VolumeBar: View {
    let fileURL: URL
    @Binding var playbackPosition: CGFloat
    
    @State private var samples: [Float] = []
    private let windowSampleCount: Int = 1024
    private let totalBars = 20
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Canvas { context, size in
                    let totalCount = samples.count
                    let currentIndex = Int(CGFloat(totalCount) * playbackPosition)
                    let halfWindow = windowSampleCount / 2
                    let startIndex = max(0, currentIndex - halfWindow)
                    let endIndex = min(totalCount - 1, currentIndex + halfWindow)
                    let windowSamples = Array(samples[startIndex...endIndex])
                    
                    let rms = computeRMS(windowSamples)
                    let normalized = min(rms * 4.0, 1.0)
                    
                    let activeBars = Int(CGFloat(totalBars) * CGFloat(normalized))
                    let barHeight = size.height / CGFloat(totalBars)
                    
                    for i in 0..<totalBars {
                        let yPos = size.height - barHeight * CGFloat(i+1)
                        let rectBar = CGRect(
                            x: 0,
                            y: yPos,
                            width: size.width,
                            height: barHeight - 1
                        )
                        if i < activeBars {
                            let ratio = Double(i) / Double(totalBars - 1)
                            let hue = 160.0 + ratio * 20.0
                            let barColor = Color(
                                hue: hue / 360.0,
                                saturation: 1.0,
                                brightness: 1.0
                            )
                            context.fill(Path(rectBar), with: .color(barColor))
                        } else {
                            context.fill(Path(rectBar), with: .color(Color(hex: 0x444444)))
                        }
                    }
                }
            }
        }
        .onAppear {
            loadSamples()
        }
    }
    
    private func computeRMS(_ array: [Float]) -> Float {
        guard !array.isEmpty else { return 0 }
        var sum: Float = 0
        for val in array {
            sum += val * val
        }
        let mean = sum / Float(array.count)
        return sqrt(mean)
    }
    
    private func loadSamples() {
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
                        CMBlockBufferCopyDataBytes(
                            blockBuffer,
                            atOffset: 0,
                            dataLength: length,
                            destination: baseAddress
                        )
                    }
                }
                
                let sampleCount = length / MemoryLayout<Float>.size
                data.withUnsafeBytes { (samplesPointer: UnsafeRawBufferPointer) in
                    let floatBuffer = samplesPointer.bindMemory(to: Float.self)
                    for i in 0 ..< sampleCount {
                        sampleData.append(floatBuffer[i])
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

