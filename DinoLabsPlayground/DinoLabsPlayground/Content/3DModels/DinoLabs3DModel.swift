//
//  DinoLabs3DModel.swift
//
//  Created by Peter Iacobelli on 3/25/25.
//

import SwiftUI
import AppKit
import ModelIO
import SceneKit

enum FileType: String, CaseIterable {
    case shapr, obj, stl, iges, step, dxf
}

class ModelConverter: ObservableObject {
    @Published var asset: MDLAsset?
    let fileURL: URL
    init(fileURL: URL) {
        self.fileURL = fileURL
        loadModel(from: fileURL)
    }
    func loadModel(from url: URL) {
        let vertexDescriptor = MDLVertexDescriptor()
        self.asset = MDLAsset(url: url, vertexDescriptor: vertexDescriptor, bufferAllocator: nil)
    }
    func exportModel(to destinationURL: URL) throws {
        guard let asset = asset else {
            throw NSError(domain: "ModelConverter", code: 1, userInfo: [NSLocalizedDescriptionKey: "No asset loaded"])
        }
        try asset.export(to: destinationURL)
    }
}

class ModelSCNView: SCNView {
    private var isHighlighted: Bool = false

    override func scrollWheel(with event: NSEvent) {
        if event.modifierFlags.contains(.shift) {
            if let cameraNode = self.pointOfView {
                let panFactor: Float = 0.3
                let panDeltaX = Float(event.scrollingDeltaX) * panFactor
                let panDeltaY = Float(event.scrollingDeltaY) * panFactor
                cameraNode.position.x += CGFloat(panDeltaX)
                cameraNode.position.y += CGFloat(panDeltaY)
            }
        } else {
            guard let modelNode = self.scene?.rootNode.childNode(withName: "modelNode", recursively: true) else { return }
            let rotationFactor: Float = 0.003
            let deltaX = Float(event.scrollingDeltaX) * rotationFactor
            let deltaY = Float(event.scrollingDeltaY) * rotationFactor
            var currentAngles = modelNode.eulerAngles
            currentAngles.x += CGFloat(deltaY)
            currentAngles.z += CGFloat(deltaX)
            currentAngles.y = 0
            modelNode.eulerAngles = currentAngles
        }
    }
    
    override func mouseDown(with event: NSEvent) {
        let point = self.convert(event.locationInWindow, from: nil)
        let hitResults = self.hitTest(point, options: nil)
        var validModelHit = false
        if let hit = hitResults.first {
            var currentNode = hit.node
            while true {
                if currentNode.name == "gridNode" || currentNode.name == "axesNode" {
                    validModelHit = false
                    break
                }
                if currentNode.name == "modelNode" {
                    validModelHit = true
                    break
                }
                if let parent = currentNode.parent {
                    currentNode = parent
                } else {
                    break
                }
            }
        }
        if validModelHit {
            if isHighlighted {
                if let modelNode = self.scene?.rootNode.childNode(withName: "modelNode", recursively: true) {
                    applyColor(to: modelNode, color: NSColor(hex: 0x919191))
                }
                isHighlighted = false
            } else {
                if let modelNode = self.scene?.rootNode.childNode(withName: "modelNode", recursively: true) {
                    applyColor(to: modelNode, color: NSColor(hex: 0x0D98E3))
                }
                isHighlighted = true
            }
        } else {
            if isHighlighted {
                if let modelNode = self.scene?.rootNode.childNode(withName: "modelNode", recursively: true) {
                    applyColor(to: modelNode, color: NSColor(hex: 0x919191))
                }
                isHighlighted = false
            }
        }
        super.mouseDown(with: event)
    }
}

struct SceneKitView: NSViewRepresentable {
    let fileURL: URL
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    func makeNSView(context: Context) -> SCNView {
        let scnView = ModelSCNView()
        scnView.delegate = context.coordinator
        scnView.isPlaying = true
        scnView.allowsCameraControl = true
        scnView.autoenablesDefaultLighting = true
        scnView.backgroundColor = NSColor(hex: 0x242424)
        let scene = loadScene()
        scnView.scene = scene
        if let cameraNode = scene.rootNode.childNode(withName: "cameraNode", recursively: true) {
            scnView.pointOfView = cameraNode
        }
        return scnView
    }
    func updateNSView(_ scnView: SCNView, context: Context) {
        scnView.scene = loadScene()
        if let cameraNode = scnView.scene?.rootNode.childNode(withName: "cameraNode", recursively: true) {
            scnView.pointOfView = cameraNode
        }
    }
    func loadScene() -> SCNScene {
        let finalScene = SCNScene()
        if let sceneSource = SCNSceneSource(url: fileURL, options: nil),
           let scene = sceneSource.scene(options: nil) {
            let container = SCNNode()
            container.name = "modelNode"
            for child in scene.rootNode.childNodes {
                container.addChildNode(child)
            }
            let (minBound, maxBound) = container.boundingBox
            let center = SCNVector3((minBound.x + maxBound.x) / 2,
                                    (minBound.y + maxBound.y) / 2,
                                    (minBound.z + maxBound.z) / 2)
            container.pivot = SCNMatrix4MakeTranslation(center.x, center.y, center.z)
            applyColor(to: container, color: NSColor(hex: 0x919191))
            let modelWidth = maxBound.x - minBound.x
            let modelHeight = maxBound.y - minBound.y
            let modelDepth = maxBound.z - minBound.z
            let maxDimension = max(modelWidth, max(modelHeight, modelDepth))
            let axisLength = CGFloat(maxDimension) * 1000
            let gridNode = createGridNode(axisLength: axisLength)
            container.addChildNode(gridNode)
            let axesNode = createAxesNode(axisLength: axisLength)
            axesNode.renderingOrder = 2
            container.addChildNode(axesNode)
            finalScene.rootNode.addChildNode(container)
        }
        finalScene.rootNode.addChildNode(createCameraNode())
        return finalScene
    }
    func createCameraNode() -> SCNNode {
        let camera = SCNCamera()
        camera.fieldOfView = 60
        camera.zNear = 0.1
        camera.zFar = 10000
        let cameraNode = SCNNode()
        cameraNode.name = "cameraNode"
        cameraNode.camera = camera
        cameraNode.position = SCNVector3(50, -150, 80)
        let targetNode = SCNNode()
        let constraint = SCNLookAtConstraint(target: targetNode)
        constraint.worldUp = SCNVector3(0, 0, 1)
        constraint.isGimbalLockEnabled = true
        cameraNode.constraints = [constraint]
        return cameraNode
    }
    class Coordinator: NSObject, SCNSceneRendererDelegate {
        var initialModelPosition: SCNVector3?
        func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
            guard let scnView = renderer as? SCNView,
                  let cameraNode = scnView.pointOfView,
                  let container = scnView.scene?.rootNode.childNode(withName: "modelNode", recursively: false),
                  let axesNode = container.childNode(withName: "axesNode", recursively: true),
                  let gridNode = container.childNode(withName: "gridNode", recursively: true)
            else { return }
            let dx = cameraNode.position.x - container.position.x
            let dy = cameraNode.position.y - container.position.y
            let dz = cameraNode.position.z - container.position.z
            let distance = sqrt(dx*dx + dy*dy + dz*dz)
            let referenceDistance: Float = 1000
            let scaleFactor = Float(distance) / referenceDistance
            axesNode.scale = SCNVector3(scaleFactor, scaleFactor, scaleFactor)
            gridNode.scale = SCNVector3(scaleFactor, scaleFactor, scaleFactor)
        }
        @objc func handlePanGesture(_ gesture: NSPanGestureRecognizer) {
            guard let scnView = gesture.view as? SCNView,
                  let modelNode = scnView.scene?.rootNode.childNode(withName: "modelNode", recursively: true)
            else { return }
            let translation = gesture.translation(in: scnView)
            let factor: Float = 0.01
            if gesture.state == .began {
                initialModelPosition = modelNode.position
            } else if gesture.state == .changed, let initialPosition = initialModelPosition {
                let deltaX: Float = Float(translation.x) * factor
                let deltaZ: Float = Float(-translation.y) * factor
                let newX = Float(initialPosition.x) + deltaX
                let newZ = Float(initialPosition.z) + deltaZ
                let newY = Float(modelNode.position.y)
                modelNode.position = SCNVector3(newX, newY, newZ)
            }
        }
    }
}

func applyColor(to node: SCNNode, color: NSColor) {
    if node.name == "gridNode" || node.name == "axesNode" {
        return
    }
    if let geometry = node.geometry {
        for material in geometry.materials {
            material.diffuse.contents = color
        }
    }
    for child in node.childNodes {
        applyColor(to: child, color: color)
    }
}

func createAxesNode(axisLength: CGFloat) -> SCNNode {
    let axesNode = SCNNode()
    axesNode.name = "axesNode"
    let axisRadius: CGFloat = 1.0
    let offset: Float = 0.1
    let xAxisGeometry = SCNCylinder(radius: axisRadius, height: axisLength)
    xAxisGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0x097DF0)
    let xAxisNode = SCNNode(geometry: xAxisGeometry)
    xAxisNode.renderingOrder = 2
    xAxisNode.eulerAngles = SCNVector3(0, 0, Float.pi/2)
    xAxisNode.position = SCNVector3(Float(axisLength / 2) + offset, 0, 0)
    axesNode.addChildNode(xAxisNode)
    let yAxisGeometry = SCNCylinder(radius: axisRadius, height: axisLength)
    yAxisGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0xD109F0)
    let yAxisNode = SCNNode(geometry: yAxisGeometry)
    yAxisNode.renderingOrder = 2
    yAxisNode.position = SCNVector3(0, Float(axisLength / 2) + offset, 0)
    axesNode.addChildNode(yAxisNode)
    let zAxisGeometry = SCNCylinder(radius: axisRadius, height: axisLength)
    zAxisGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0x4F09F0)
    let zAxisNode = SCNNode(geometry: zAxisGeometry)
    zAxisNode.renderingOrder = 2
    zAxisNode.eulerAngles = SCNVector3(Float.pi/2, 0, 0)
    zAxisNode.position = SCNVector3(0, 0, Float(axisLength / 2) + offset)
    axesNode.addChildNode(zAxisNode)
    return axesNode
}

func createGridNode(axisLength: CGFloat) -> SCNNode {
    let gridNode = SCNNode()
    gridNode.name = "gridNode"
    let divisions: Int = 400
    let subDivisions: Int = 10
    let gridSpacing = axisLength / CGFloat(divisions)
    let subGridSpacing = gridSpacing / CGFloat(subDivisions)
    let halfExtent = axisLength / 2.0
    let majorNode = SCNNode()
    let majorRadius: CGFloat = 2.0
    for i in 0...divisions {
        let x = -halfExtent + CGFloat(i) * gridSpacing
        let verticalLine = SCNTube(innerRadius: 0, outerRadius: majorRadius, height: axisLength)
        verticalLine.firstMaterial?.diffuse.contents = NSColor(hex: 0x313131)
        verticalLine.firstMaterial?.lightingModel = .constant
        verticalLine.firstMaterial?.writesToDepthBuffer = false
        let verticalNode = SCNNode(geometry: verticalLine)
        verticalNode.position = SCNVector3(x, 0, 0)
        majorNode.addChildNode(verticalNode)
    }
    for i in 0...divisions {
        let y = -halfExtent + CGFloat(i) * gridSpacing
        let horizontalLine = SCNTube(innerRadius: 0, outerRadius: majorRadius, height: axisLength)
        horizontalLine.firstMaterial?.diffuse.contents = NSColor(hex: 0x313131)
        horizontalLine.firstMaterial?.lightingModel = .constant
        horizontalLine.firstMaterial?.writesToDepthBuffer = false
        let horizontalNode = SCNNode(geometry: horizontalLine)
        horizontalNode.position = SCNVector3(0, y, 0)
        horizontalNode.eulerAngles = SCNVector3(0, 0, Float.pi/2)
        majorNode.addChildNode(horizontalNode)
    }
    majorNode.renderingOrder = 1
    gridNode.addChildNode(majorNode)
    
    var minorVertices: [SCNVector3] = []
    for i in 0..<divisions {
        for j in 1..<subDivisions {
            let x = -halfExtent + CGFloat(i) * gridSpacing + CGFloat(j) * subGridSpacing
            minorVertices.append(SCNVector3(Float(x), Float(-halfExtent), 0))
            minorVertices.append(SCNVector3(Float(x), Float(halfExtent), 0))
        }
    }
    for i in 0..<divisions {
        for j in 1..<subDivisions {
            let y = -halfExtent + CGFloat(i) * gridSpacing + CGFloat(j) * subGridSpacing
            minorVertices.append(SCNVector3(Float(-halfExtent), Float(y), 0))
            minorVertices.append(SCNVector3(Float(halfExtent), Float(y), 0))
        }
    }
    
    var minorIndices: [Int32] = []
    let minorLinesCount = divisions * (subDivisions - 1) * 2
    for i in 0..<minorLinesCount {
        minorIndices.append(Int32(i * 2))
        minorIndices.append(Int32(i * 2 + 1))
    }
    
    let minorVertexSource = SCNGeometrySource(vertices: minorVertices)
    let minorIndexData = Data(bytes: minorIndices, count: minorIndices.count * MemoryLayout<Int32>.size)
    let minorElement = SCNGeometryElement(data: minorIndexData, primitiveType: .line, primitiveCount: minorLinesCount, bytesPerIndex: MemoryLayout<Int32>.size)
    let minorGeometry = SCNGeometry(sources: [minorVertexSource], elements: [minorElement])
    
    let minorMaterial = SCNMaterial()
    minorMaterial.diffuse.contents = NSColor(hex: 0x313131)
    minorMaterial.lightingModel = .constant
    minorMaterial.isDoubleSided = true
    minorMaterial.writesToDepthBuffer = false
    minorGeometry.materials = [minorMaterial]
    let minorNode = SCNNode(geometry: minorGeometry)
    minorNode.renderingOrder = 0
    gridNode.addChildNode(minorNode)
    
    return gridNode
}

struct ThreeDModelView: View {
    let geometry: GeometryProxy
    let fileURL: URL
    @Binding var leftPanelWidthRatio: CGFloat
    @Binding var hasUnsavedChanges: Bool
    @Binding var showAlert: Bool
    @StateObject private var converter: ModelConverter
    @State private var selectedFileType: FileType = .obj
    @State private var exportStatusMessage: String = ""
    init(geometry: GeometryProxy, fileURL: URL, leftPanelWidthRatio: Binding<CGFloat>, hasUnsavedChanges: Binding<Bool>, showAlert: Binding<Bool>) {
        self.geometry = geometry
        self.fileURL = fileURL
        self._leftPanelWidthRatio = leftPanelWidthRatio
        self._hasUnsavedChanges = hasUnsavedChanges
        self._showAlert = showAlert
        _converter = StateObject(wrappedValue: ModelConverter(fileURL: fileURL))
    }
    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                }
                .padding(.horizontal, 10)
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio), height: 80)
                .containerHelper(backgroundColor: Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                SceneKitView(fileURL: fileURL)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.gray.opacity(0.2))
            }
        }
    }
}
