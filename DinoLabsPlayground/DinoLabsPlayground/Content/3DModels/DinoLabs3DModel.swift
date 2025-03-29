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
        context.coordinator.scnView = scnView
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
        let gizmoNode = createGizmoNode()
        gizmoNode.name = "gizmoNode"
        finalScene.rootNode.addChildNode(gizmoNode)
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
    func createGizmoNode() -> SCNNode {
        let gizmoNode = SCNNode()
        gizmoNode.name = "gizmoNode"
        let cubeSize: CGFloat = 0.5
        let cubeGeometry = SCNBox(width: cubeSize, height: cubeSize, length: cubeSize, chamferRadius: 0.05)
        cubeGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0x919191)
        let cubeNode = SCNNode(geometry: cubeGeometry)
        gizmoNode.addChildNode(cubeNode)
        let axisLength: CGFloat = 0.8 * (cubeSize / 0.5)
        let axisRadius: CGFloat = 0.02
        let cornerX = -Float(cubeSize / 2)
        let cornerY = -Float(cubeSize / 2)
        let cornerZ = -Float(cubeSize / 2)
        let xAxisGeometry = SCNCylinder(radius: axisRadius, height: axisLength)
        xAxisGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0x097DF0)
        xAxisGeometry.firstMaterial?.transparency = 0.8
        let xAxisNode = SCNNode(geometry: xAxisGeometry)
        xAxisNode.eulerAngles = SCNVector3(0, 0, Float.pi/2)
        xAxisNode.position = SCNVector3(cornerX + Float(axisLength / 2), cornerY, cornerZ)
        gizmoNode.addChildNode(xAxisNode)
        let xStopGeometry = SCNBox(width: 0.05, height: 0.05, length: 0.05, chamferRadius: 0)
        xStopGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0x097DF0)
        let xStopNode = SCNNode(geometry: xStopGeometry)
        xStopNode.position = SCNVector3(cornerX + Float(axisLength), cornerY, cornerZ)
        gizmoNode.addChildNode(xStopNode)
        let yAxisGeometry = SCNCylinder(radius: axisRadius, height: axisLength)
        yAxisGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0xD109F0)
        yAxisGeometry.firstMaterial?.transparency = 0.8
        let yAxisNode = SCNNode(geometry: yAxisGeometry)
        yAxisNode.position = SCNVector3(cornerX, cornerY + Float(axisLength / 2), cornerZ)
        gizmoNode.addChildNode(yAxisNode)
        let yStopGeometry = SCNBox(width: 0.05, height: 0.05, length: 0.05, chamferRadius: 0)
        yStopGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0xD109F0)
        let yStopNode = SCNNode(geometry: yStopGeometry)
        yStopNode.position = SCNVector3(cornerX, cornerY + Float(axisLength), cornerZ)
        gizmoNode.addChildNode(yStopNode)
        let zAxisGeometry = SCNCylinder(radius: axisRadius, height: axisLength)
        zAxisGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0x4F09F0)
        zAxisGeometry.firstMaterial?.transparency = 0.8
        let zAxisNode = SCNNode(geometry: zAxisGeometry)
        zAxisNode.eulerAngles = SCNVector3(Float.pi/2, 0, 0)
        zAxisNode.position = SCNVector3(cornerX, cornerY, cornerZ + Float(axisLength / 2))
        gizmoNode.addChildNode(zAxisNode)
        let zStopGeometry = SCNBox(width: 0.05, height: 0.05, length: 0.05, chamferRadius: 0)
        zStopGeometry.firstMaterial?.diffuse.contents = NSColor(hex: 0x4F09F0)
        let zStopNode = SCNNode(geometry: zStopGeometry)
        zStopNode.position = SCNVector3(cornerX, cornerY, cornerZ + Float(axisLength))
        gizmoNode.addChildNode(zStopNode)
        gizmoNode.renderingOrder = 1000
        return gizmoNode
    }
    class Coordinator: NSObject, SCNSceneRendererDelegate {
        weak var scnView: SCNView?
        var initialModelPosition: SCNVector3?
        
        override init() {
            super.init()
            NotificationCenter.default.addObserver(self, selector: #selector(handleMovementPadCommand(notification:)), name: Notification.Name("MovementPadCommand"), object: nil)
        }
        
        deinit {
            NotificationCenter.default.removeObserver(self)
        }
        
        @objc func handleMovementPadCommand(notification: Notification) {
            guard let userInfo = notification.userInfo,
                  let command = userInfo["command"] as? String,
                  let dx = userInfo["dx"] as? Float,
                  let dy = userInfo["dy"] as? Float,
                  let scaleValue = userInfo["scale"] as? Float,
                  let scnView = self.scnView,
                  let modelNode = scnView.scene?.rootNode.childNode(withName: "modelNode", recursively: false)
            else { return }
            if command == "move" {
                let newX = modelNode.position.x + CGFloat(dx * scaleValue)
                let newY = modelNode.position.y + CGFloat(dy * scaleValue)
                modelNode.position = SCNVector3(newX, newY, modelNode.position.z)
            } else if command == "rotate" {
                let radians = scaleValue * Float.pi / 180.0
                modelNode.eulerAngles.x += CGFloat(dy * radians)
                modelNode.eulerAngles.z += CGFloat(dx * radians)
                modelNode.eulerAngles.y = 0
            }
        }
        
        func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
            guard let scnView = renderer as? SCNView,
                  let cameraNode = scnView.pointOfView,
                  let container = scnView.scene?.rootNode.childNode(withName: "modelNode", recursively: false),
                  let axesNode = container.childNode(withName: "axesNode", recursively: true),
                  let gridNode = container.childNode(withName: "gridNode", recursively: true),
                  let gizmoNode = scnView.scene?.rootNode.childNode(withName: "gizmoNode", recursively: true)
            else { return }
            let dx = cameraNode.position.x - container.position.x
            let dy = cameraNode.position.y - container.position.y
            let dz = cameraNode.position.z - container.position.z
            let distance = sqrt(dx*dx + dy*dy + dz*dz)
            let referenceDistance: Float = 1000
            let scaleFactor = Float(distance) / referenceDistance
            axesNode.scale = SCNVector3(scaleFactor, scaleFactor, scaleFactor)
            gridNode.scale = SCNVector3(scaleFactor, scaleFactor, scaleFactor)
            let modelTransform = container.worldTransform
            let rotationMatrix = SCNMatrix4(
                m11: modelTransform.m11, m12: modelTransform.m12, m13: modelTransform.m13, m14: 0,
                m21: modelTransform.m21, m22: modelTransform.m22, m23: modelTransform.m23, m24: 0,
                m31: modelTransform.m31, m32: modelTransform.m32, m33: modelTransform.m33, m34: 0,
                m41: 0, m42: 0, m43: 0, m44: 1
            )
            gizmoNode.transform = rotationMatrix
            scnView.scene?.rootNode.scale = SCNVector3(1, 1, 1)
            let viewSize = scnView.bounds.size
            let topRightScreenPoint = CGPoint(x: viewSize.width - 50, y: viewSize.height - 50)
            let topRight3DPoint = scnView.unprojectPoint(SCNVector3(Float(topRightScreenPoint.x), Float(topRightScreenPoint.y), 0.1))
            gizmoNode.position = topRight3DPoint
            gizmoNode.scale = SCNVector3(0.01, 0.01, 0.01)
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
    @State private var modelMovementState: String = "move"
    @State private var modelMovementScale: String = "1''"
    
    init(geometry: GeometryProxy, fileURL: URL, leftPanelWidthRatio: Binding<CGFloat>, hasUnsavedChanges: Binding<Bool>, showAlert: Binding<Bool>) {
        self.geometry = geometry
        self.fileURL = fileURL
        self._leftPanelWidthRatio = leftPanelWidthRatio
        self._hasUnsavedChanges = hasUnsavedChanges
        self._showAlert = showAlert
        _converter = StateObject(wrappedValue: ModelConverter(fileURL: fileURL))
    }
    
    private var movementScaleBinding: Binding<String> {
        let unit = modelMovementState == "rotate" ? "°" : "''"
        return Binding(
           get: {
               if modelMovementScale.hasSuffix(unit) {
                   return modelMovementScale
               } else {
                   return modelMovementScale + unit
               }
           },
           set: { newValue in
               let unit = modelMovementState == "rotate" ? "°" : "''"
               var numeric = newValue
               if numeric.hasSuffix(unit) {
                   numeric = String(numeric.dropLast(unit.count))
               }
               let allowedCharacters = "0123456789."
               numeric = String(numeric.filter { allowedCharacters.contains($0) })
               if numeric.isEmpty {
                  numeric = "1"
               }
               modelMovementScale = numeric + unit
           }
        )
    }
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    
                }
                .padding(.horizontal, 10)
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio), height: 80)
                .containerHelper(backgroundColor: Color(hex: 0x171717), borderColor: Color.clear, borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                
                ZStack(alignment: .bottomLeading) {
                    SceneKitView(fileURL: fileURL)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.gray.opacity(0.2))
                    
                    VStack(spacing: 15) {
                        HStack {
                            Text("Move")
                                .font(.system(size: 10, weight: modelMovementState == "move"  ? .heavy : .semibold))
                                .foregroundColor(Color(hex: 0xc0c0c0).opacity(modelMovementState == "move" ? 1.0 : 0.7))
                                .underline(modelMovementState == "move" ? true : false)
                                .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
                                .onTapGesture(perform: {
                                    modelMovementState = "move"
                                })
                            
                            Text("Rotate")
                                .font(.system(size: 10, weight: modelMovementState == "rotate"  ? .heavy : .semibold))
                                .foregroundColor(Color(hex: 0xc0c0c0).opacity(modelMovementState == "rotate" ? 1.0 : 0.7))
                                .underline(modelMovementState == "rotate" ? true : false)
                                .hoverEffect(opacity: 0.6, scale: 1.05, cursor: .pointingHand)
                                .onTapGesture(perform: {
                                    modelMovementState = "rotate"
                                })
                        }
                        HStack(spacing: 5) {
                            VStack(spacing: 5) {
                                Image(systemName: "arrow.up.left.square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: 0xc0c0c0))
                                    .hoverEffect(opacity: 0.6, scale: 1.1, cursor: .pointingHand)
                                    .onTapGesture {
                                        sendCommand(dx: -1, dy: 1)
                                    }
                                Image(systemName: "arrow.left.square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: 0xc0c0c0))
                                    .hoverEffect(opacity: 0.6, scale: 1.1, cursor: .pointingHand)
                                    .onTapGesture {
                                        sendCommand(dx: -1, dy: 0)
                                    }
                                Image(systemName: "arrow.down.left.square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: 0xc0c0c0))
                                    .hoverEffect(opacity: 0.6, scale: 1.1, cursor: .pointingHand)
                                    .onTapGesture {
                                        sendCommand(dx: -1, dy: -1)
                                    }
                            }
                            VStack(spacing: 5) {
                                Image(systemName: "arrow.up.square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: 0xc0c0c0))
                                    .hoverEffect(opacity: 0.6, scale: 1.1, cursor: .pointingHand)
                                    .onTapGesture {
                                        sendCommand(dx: 0, dy: 1)
                                    }
                                Image(systemName: "square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.clear)
                                Image(systemName: "arrow.down.square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: 0xc0c0c0))
                                    .hoverEffect(opacity: 0.6, scale: 1.1, cursor: .pointingHand)
                                    .onTapGesture {
                                        sendCommand(dx: 0, dy: -1)
                                    }
                            }
                            VStack(spacing: 5) {
                                Image(systemName: "arrow.up.right.square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: 0xc0c0c0))
                                    .hoverEffect(opacity: 0.6, scale: 1.1, cursor: .pointingHand)
                                    .onTapGesture {
                                        sendCommand(dx: 1, dy: 1)
                                    }
                                Image(systemName: "arrow.right.square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: 0xc0c0c0))
                                    .hoverEffect(opacity: 0.6, scale: 1.1, cursor: .pointingHand)
                                    .onTapGesture {
                                        sendCommand(dx: 1, dy: 0)
                                    }
                                Image(systemName: "arrow.down.right.square.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: 0xc0c0c0))
                                    .hoverEffect(opacity: 0.6, scale: 1.1, cursor: .pointingHand)
                                    .onTapGesture {
                                        sendCommand(dx: 1, dy: -1)
                                    }
                            }
                        }
                        
                        ThreeDTextField(
                            placeholder: modelMovementState == "rotate" ? "1°" : "1''",
                            text: movementScaleBinding
                        )
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .textFieldStyle(PlainTextFieldStyle())
                        .foregroundColor(.white)
                        .font(.system(size: 8, weight: .semibold))
                        .padding(.horizontal, 10)
                        .frame(width: 70, height: 25)
                        .containerHelper(backgroundColor: Color.clear,
                                         borderColor: Color(hex: 0x616161),
                                         borderWidth: 1,
                                         topLeft: 2, topRight: 2,
                                         bottomLeft: 2, bottomRight: 2,
                                         shadowColor: .clear,
                                         shadowRadius: 0,
                                         shadowX: 0, shadowY: 0)
                        .hoverEffect(opacity: 0.8)
                        .onChange(of: modelMovementState) { newValue in
                            let unit = newValue == "rotate" ? "°" : "''"
                            let numeric = modelMovementScale.filter { "0123456789.".contains($0) }
                            modelMovementScale = numeric.isEmpty ? "1" + unit : numeric + unit
                        }
                    }
                    .frame(width: 100, height: 160)
                    .background(Color(hex: 0x171717).opacity(0.8))
                    .cornerRadius(8)
                    .padding(10)
                }
            }
        }
    }
    
    private func sendCommand(dx: Float, dy: Float) {
        let unit = modelMovementState == "rotate" ? "°" : "''"
        let scaleStr = modelMovementScale.replacingOccurrences(of: unit, with: "")
        let scale = Float(scaleStr) ?? 1.0
        let command = modelMovementState
        NotificationCenter.default.post(name: Notification.Name("MovementPadCommand"), object: nil, userInfo: ["command": command, "dx": dx, "dy": dy, "scale": scale])
    }
}
