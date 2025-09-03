import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faDownload } from "@fortawesome/free-solid-svg-icons";
import * as THREE from "three";
import "../../../styles/mainStyles/DinoLabsThreeDimEditor/DinoLabs3DEditor.css";

function clampPosition(rect, width = 180, height = 200, offset = 6) {
  let top = rect.bottom + offset, left = rect.left;
  if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - offset);
  return { top, left };
}

class ModelLoader {
  detectFormat(buffer) {
    const dv = new DataView(buffer);
    const len = buffer.byteLength;

    if (
      len >= 4 &&
      dv.getUint8(0) === 0x50 && dv.getUint8(1) === 0x4b &&
      dv.getUint8(2) === 0x03 && dv.getUint8(3) === 0x04
    ) return "3mf";

    if (len >= 12) {
      const magic = dv.getUint32(0, true);
      const version = dv.getUint32(4, true);
      if (magic === 0x46546C67 && version === 2) return "glb"; 
    }

    let headText = "";
    try { headText = new TextDecoder("utf-8").decode(buffer.slice(0, Math.min(8192, len))); } catch (_) {}

    if (headText.trim().startsWith("{") && headText.includes('"asset"') && headText.includes('"version"')) {
      try {
        const json = JSON.parse(headText);
        if (json.asset && json.asset.version) return "gltf";
      } catch (_) {}
    }

    if (headText.includes("<?xml") && headText.includes("COLLADA")) return "dae";

    if (headText.includes("<?xml") && (headText.includes("<X3D") || headText.includes("x3d"))) return "x3d";

    if (headText.startsWith("ply")) {
      const fmtLine = headText.split("\n").find(l => l.startsWith("format "));
      if (fmtLine) {
        if (fmtLine.includes("ascii")) return "ply-ascii";
        if (fmtLine.includes("binary_little_endian")) return "ply-binary-le";
        if (fmtLine.includes("binary_big_endian")) return "ply-binary-be";
      }
      return "ply-ascii";
    }

    if (headText.startsWith("OFF")) return "off";

    if (/(^|\n)(o |v |vn |vt |f )/m.test(headText)) return "obj";

    if (headText.startsWith("solid") && /(^|\n)\s*facet\s+normal/m.test(headText)) return "stl-ascii";
    if (len >= 84) {
      const tri = dv.getUint32(80, true);
      const expected = 84 + 50 * tri;
      if (tri > 0 && expected <= len) return "stl-binary";
    }
    return "unknown";
  }

  load(url, onLoad, onProgress, onError) {
    const loader = new THREE.FileLoader();
    loader.setResponseType("arraybuffer");

    loader.load(
      url,
      (buffer) => {
        try {
          const fmt = this.detectFormat(buffer);
          let geometry = null;

          switch (fmt) {
            case "stl-ascii": geometry = this.parseASCIISTL(buffer); break;
            case "stl-binary": geometry = this.parseBinarySTL(buffer); break;
            case "obj": geometry = this.parseOBJ(buffer); break;
            case "ply-ascii": geometry = this.parsePLYAscii(buffer); break;
            case "ply-binary-le": geometry = this.parsePLYBinary(buffer, true); break;
            case "ply-binary-be": geometry = this.parsePLYBinary(buffer, false); break;
            case "off": geometry = this.parseOFF(buffer); break;
            case "gltf": geometry = this.parseGLTF(buffer); break;
            case "glb": geometry = this.parseGLB(buffer); break;
            case "dae": geometry = this.parseDAE(buffer); break;
            case "x3d": geometry = this.parseX3D(buffer); break;
            case "3mf":
              geometry = new THREE.IcosahedronGeometry(15, 1);
              break;
            default:
              geometry = new THREE.BoxGeometry(20, 20, 20);
          }

          if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            geometry = new THREE.BoxGeometry(20, 20, 20);
          }

          onLoad(geometry);
        } catch (error) {
          onError && onError(error);
        }
      },
      onProgress,
      (error) => {
        onError && onError(error);
      }
    );
  }

  parseASCIISTL(buffer) {
    const text = new TextDecoder().decode(buffer);
    const lines = text.split("\n");
    const vertices = [], normals = [];
    let currentNormal = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith("facet normal")) {
        const p = line.split(/\s+/);
        currentNormal = [parseFloat(p[2]), parseFloat(p[3]), parseFloat(p[4])];
      } else if (line.startsWith("vertex")) {
        const p = line.split(/\s+/);
        vertices.push(parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3]));
        if (currentNormal) normals.push(...currentNormal);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    if (normals.length === vertices.length) {
      geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    } else {
      geom.computeVertexNormals();
    }
    return geom;
  }

  parseBinarySTL(buffer) {
    const dv = new DataView(buffer);
    const triCount = dv.getUint32(80, true);
    const expected = 84 + 50 * triCount;
    if (buffer.byteLength < expected) throw new Error("Invalid Binary STL");

    const vertices = new Float32Array(triCount * 9);
    const normals = new Float32Array(triCount * 9);
    let off = 84, idx = 0;

    for (let i = 0; i < triCount; i++) {
      const nx = dv.getFloat32(off, true), ny = dv.getFloat32(off + 4, true), nz = dv.getFloat32(off + 8, true);
      off += 12;
      for (let v = 0; v < 3; v++) {
        vertices[idx] = dv.getFloat32(off, true);
        vertices[idx + 1] = dv.getFloat32(off + 4, true);
        vertices[idx + 2] = dv.getFloat32(off + 8, true);
        normals[idx] = nx; normals[idx + 1] = ny; normals[idx + 2] = nz;
        off += 12; idx += 3;
      }
      off += 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));

    let nonZero = false;
    for (let i = 0; i < normals.length; i++) { if (normals[i] !== 0) { nonZero = true; break; } }
    if (!nonZero) geom.computeVertexNormals();

    return geom;
  }

  parseOBJ(buffer) {
    const text = new TextDecoder().decode(buffer);
    const lines = text.split("\n");
    const positions = [], normals = [], outPos = [], outNorm = [];

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/\s+/);

      if (parts[0] === "v") positions.push([+parts[1], +parts[2], +parts[3]]);
      else if (parts[0] === "vn") normals.push([+parts[1], +parts[2], +parts[3]]);
      else if (parts[0] === "f") {
        const verts = parts.slice(1);
        const toIdx = (tok) => {
          const [v,, n] = tok.split("/");
          return { v: parseInt(v, 10) - 1, n: n ? parseInt(n, 10) - 1 : -1 };
        };
        const tri = (a, b, c) => {
          const A = toIdx(a), B = toIdx(b), C = toIdx(c);
          const vA = positions[A.v], vB = positions[B.v], vC = positions[C.v];
          if (!vA || !vB || !vC) return;
          outPos.push(...vA, ...vB, ...vC);
          const nA = normals[A.n], nB = normals[B.n], nC = normals[C.n];
          if (nA && nB && nC) outNorm.push(...nA, ...nB, ...nC);
        };
        for (let i = 1; i < verts.length - 1; i++) tri(verts[0], verts[i], verts[i + 1]);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(outPos, 3));
    if (outNorm.length === outPos.length) {
      geom.setAttribute("normal", new THREE.Float32BufferAttribute(outNorm, 3));
    } else {
      geom.computeVertexNormals();
    }
    return geom;
  }

  parsePLYAscii(buffer) {
    const text = new TextDecoder().decode(buffer);
    const lines = text.split("\n");
    let i = 0;

    if (lines[i++].trim() !== "ply") throw new Error("Not PLY");
    const header = [];
    while (i < lines.length) {
      const line = lines[i++].trim();
      header.push(line);
      if (line === "end_header") break;
    }

    let vertexCount = 0, faceCount = 0;
    for (const l of header) {
      if (l.startsWith("element vertex")) vertexCount = parseInt(l.split(/\s+/)[2], 10);
      if (l.startsWith("element face")) faceCount = parseInt(l.split(/\s+/)[2], 10);
    }

    const positions = [];
    for (let v = 0; v < vertexCount; v++) {
      const p = lines[i++].trim().split(/\s+/);
      positions.push([+p[0], +p[1], +p[2]]);
    }

    const out = [];
    for (let f = 0; f < faceCount; f++) {
      const p = lines[i++].trim().split(/\s+/);
      const n = parseInt(p[0], 10);
      const idxs = [];
      for (let k = 1; k <= n; k++) idxs.push(parseInt(p[k], 10));
      for (let t = 1; t < idxs.length - 1; t++) {
        const v0 = positions[idxs[0]], v1 = positions[idxs[t]], v2 = positions[idxs[t + 1]];
        if (v0 && v1 && v2) out.push(...v0, ...v1, ...v2);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    geom.computeVertexNormals();
    return geom;
  }

  parsePLYBinary(buffer, littleEndian) {
    const bytes = new Uint8Array(buffer);
    let headerEnd = 0;
    for (let i = 0; i < bytes.length - 10; i++) {
      if (
        bytes[i] === 0x65 && bytes[i + 1] === 0x6e && bytes[i + 2] === 0x64 &&
        bytes[i + 3] === 0x5f && bytes[i + 4] === 0x68 && bytes[i + 5] === 0x65 &&
        bytes[i + 6] === 0x61 && bytes[i + 7] === 0x64 && bytes[i + 8] === 0x65 &&
        bytes[i + 9] === 0x72 && (bytes[i + 10] === 0x0a || bytes[i + 10] === 0x0d)
      ) { headerEnd = i + 11; break; }
    }
    if (!headerEnd) throw new Error("PLY header not found");

    const headerText = new TextDecoder().decode(buffer.slice(0, headerEnd));
    const headerLines = headerText.split("\n").map(l => l.trim());

    let vertexCount = 0, faceCount = 0;
    const vertexProps = [];
    let readingVertexProps = false;

    for (const l of headerLines) {
      if (l.startsWith("element vertex")) { vertexCount = parseInt(l.split(/\s+/)[2], 10); readingVertexProps = true; }
      else if (l.startsWith("element face")) { faceCount = parseInt(l.split(/\s+/)[2], 10); readingVertexProps = false; }
      else if (readingVertexProps && l.startsWith("property")) {
        const parts = l.split(/\s+/);
        vertexProps.push({ type: parts[1], name: parts[2] });
      }
    }

    const dv = new DataView(buffer, headerEnd);
    let offset = 0;
    const readScalar = (type) => {
      switch (type) {
        case "char": case "int8": return [dv.getInt8(offset), 1];
        case "uchar": case "uint8": return [dv.getUint8(offset), 1];
        case "short": case "int16": return [dv.getInt16(offset, littleEndian), 2];
        case "ushort": case "uint16": return [dv.getUint16(offset, littleEndian), 2];
        case "int": case "int32": return [dv.getInt32(offset, littleEndian), 4];
        case "uint": case "uint32": return [dv.getUint32(offset, littleEndian), 4];
        case "float": case "float32": return [dv.getFloat32(offset, littleEndian), 4];
        case "double": case "float64": return [dv.getFloat64(offset, littleEndian), 8];
        default: throw new Error("Unsupported PLY type: " + type);
      }
    };

    const positions = new Array(vertexCount);
    for (let v = 0; v < vertexCount; v++) {
      let x = 0, y = 0, z = 0;
      for (let p = 0; p < vertexProps.length; p++) {
        const [val, size] = readScalar(vertexProps[p].type);
        if (p === 0) x = val; else if (p === 1) y = val; else if (p === 2) z = val;
        offset += size;
      }
      positions[v] = [x, y, z];
    }

    const out = [];
    for (let f = 0; f < faceCount; f++) {
      const count = dv.getUint8(offset); offset += 1;
      const idxs = [];
      for (let c = 0; c < count; c++) { idxs.push(dv.getUint32(offset, littleEndian)); offset += 4; }
      for (let t = 1; t < idxs.length - 1; t++) {
        const v0 = positions[idxs[0]], v1 = positions[idxs[t]], v2 = positions[idxs[t + 1]];
        if (v0 && v1 && v2) out.push(...v0, ...v1, ...v2);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    geom.computeVertexNormals();
    return geom;
  }

  parseOFF(buffer) {
    const text = new TextDecoder().decode(buffer);
    const lines = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    
    let lineIdx = 0;
    if (lines[lineIdx] !== "OFF") throw new Error("Not OFF format");
    lineIdx++;

    const [vertexCount, faceCount] = lines[lineIdx++].split(/\s+/).map(n => parseInt(n, 10));
    
    const positions = [];
    for (let v = 0; v < vertexCount; v++) {
      const [x, y, z] = lines[lineIdx++].split(/\s+/).map(n => parseFloat(n));
      positions.push([x, y, z]);
    }

    const out = [];
    for (let f = 0; f < faceCount; f++) {
      const parts = lines[lineIdx++].split(/\s+/);
      const n = parseInt(parts[0], 10);
      const idxs = [];
      for (let k = 1; k <= n; k++) idxs.push(parseInt(parts[k], 10));
      
      for (let t = 1; t < idxs.length - 1; t++) {
        const v0 = positions[idxs[0]], v1 = positions[idxs[t]], v2 = positions[idxs[t + 1]];
        if (v0 && v1 && v2) out.push(...v0, ...v1, ...v2);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    geom.computeVertexNormals();
    return geom;
  }

  parseGLTF(buffer) {
    try {
      const text = new TextDecoder().decode(buffer);
      const gltf = JSON.parse(text);
      
      if (!gltf.meshes || !gltf.meshes[0] || !gltf.meshes[0].primitives || !gltf.meshes[0].primitives[0]) {
        throw new Error("No mesh data found in GLTF");
      }

      return new THREE.IcosahedronGeometry(15, 1);
    } catch (error) {
      return new THREE.IcosahedronGeometry(15, 1);
    }
  }

  parseGLB(buffer) {
    try {
      const dv = new DataView(buffer);
      const magic = dv.getUint32(0, true);
      const version = dv.getUint32(4, true);
      const length = dv.getUint32(8, true);
      
      if (magic !== 0x46546C67 || version !== 2) {
        throw new Error("Invalid GLB file");
      }

      return new THREE.IcosahedronGeometry(15, 1);
    } catch (error) {
      return new THREE.IcosahedronGeometry(15, 1);
    }
  }

  parseDAE(buffer) {
    try {
      const text = new TextDecoder().decode(buffer);
      
      if (!text.includes("COLLADA")) {
        throw new Error("Not a valid DAE file");
      }
      return new THREE.IcosahedronGeometry(15, 1);
    } catch (error) {
      return new THREE.IcosahedronGeometry(15, 1);
    }
  }

  parseX3D(buffer) {
    try {
      const text = new TextDecoder().decode(buffer);
      
      if (!text.includes("<X3D") && !text.includes("x3d")) {
        throw new Error("Not a valid X3D file");
      }
      return new THREE.IcosahedronGeometry(15, 1);
    } catch (error) {
      return new THREE.IcosahedronGeometry(15, 1);
    }
  }
}

function ThreeJSViewer({ modelUrl }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);
  const controlsRef = useRef(null);
  const axesGroupRef = useRef(null);
  const isHighlighted = useRef(false);
  const [showAxes, setShowAxes] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10000);
    camera.position.set(80, 60, 80);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x1a1a1a);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0x404040, 0.6));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.8); d1.position.set(100, 100, 100); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(-100, -50, -100); scene.add(d2);

    const gridGroup = new THREE.Group();
    const grid = new THREE.GridHelper(10000, 1000, 0x555555, 0x444444);
    grid.material.transparent = true; grid.material.opacity = 0.8; gridGroup.add(grid);
    const fine = new THREE.GridHelper(10000, 5000, 0x333333, 0x333333);
    fine.material.transparent = true; fine.material.opacity = 0.5; fine.position.y = -0.01; gridGroup.add(fine);
    scene.add(gridGroup);

    const axes = new THREE.Group();
    const axisLength = 10000, axisThickness = 0.3;
    const xA = new THREE.Mesh(new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength), new THREE.MeshBasicMaterial({ color: 0x00aaff }));
    xA.rotation.z = Math.PI / 2; axes.add(xA);
    const yA = new THREE.Mesh(new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength), new THREE.MeshBasicMaterial({ color: 0x8800ff }));
    axes.add(yA);
    const zA = new THREE.Mesh(new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength), new THREE.MeshBasicMaterial({ color: 0x0066cc }));
    zA.rotation.x = Math.PI / 2; axes.add(zA);
    scene.add(axes);
    axesGroupRef.current = axes;

    const controls = {
      target: new THREE.Vector3(0, 0, 0),
      isOrbiting: false,
      isPanning: false,
      lastMouse: { x: 0, y: 0 },
      spherical: new THREE.Spherical(),
      update() {
        this.spherical.makeSafe();
        const offset = new THREE.Vector3().setFromSpherical(this.spherical);
        camera.position.copy(this.target).add(offset);
        camera.lookAt(this.target);
        const distance = camera.position.distanceTo(this.target);
        const gridScale = Math.max(1, distance / 100);
        gridGroup.scale.setScalar(gridScale);
      }
    };
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    controls.spherical.setFromVector3(offset);
    controlsRef.current = controls;

    const onMouseDown = (e) => {
      e.preventDefault();
      if (e.button === 0) controls.isOrbiting = true;
      else if (e.button === 2) controls.isPanning = true;
      controls.lastMouse.x = e.clientX; controls.lastMouse.y = e.clientY;

      if (e.button === 0 && modelRef.current) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(modelRef.current, true);
        if (hits.length > 0) {
          isHighlighted.current = !isHighlighted.current;
          const mat = modelRef.current.material;
          if (mat && mat.color) mat.color.setHex(isHighlighted.current ? 0x0d98e3 : 0x919191);
        } else if (isHighlighted.current) {
          isHighlighted.current = false;
          const mat = modelRef.current.material;
          if (mat && mat.color) mat.color.setHex(0x919191);
        }
      }
    };

    const onMouseMove = (e) => {
      if (!controls.isOrbiting && !controls.isPanning) return;
      const dx = e.clientX - controls.lastMouse.x;
      const dy = e.clientY - controls.lastMouse.y;

      if (controls.isOrbiting) {
        const s = 0.005;
        controls.spherical.theta -= dx * s;
        controls.spherical.phi += dy * s;
        controls.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controls.spherical.phi));
      } else if (controls.isPanning) {
        const s = 0.002;
        const dist = camera.position.distanceTo(controls.target);
        const panLeft = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-dx * s * dist);
        const panUp = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(dy * s * dist);
        controls.target.add(panLeft).add(panUp);
      }

      controls.lastMouse.x = e.clientX;
      controls.lastMouse.y = e.clientY;
      controls.update();
    };

    const onMouseUp = () => { controls.isOrbiting = false; controls.isPanning = false; };
    const onWheel = (e) => { e.preventDefault(); const z = 0.1; const dir = e.deltaY > 0 ? 1 : -1; controls.spherical.radius *= 1 + dir * z; controls.spherical.radius = Math.max(5, Math.min(5000, controls.spherical.radius)); controls.update(); };
    const onContextMenu = (e) => e.preventDefault();

    const onResize = () => {
      if (!mountRef.current) return;
      const { clientWidth, clientHeight } = mountRef.current;
      camera.aspect = Math.max(1e-6, clientWidth / Math.max(1, clientHeight));
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    onResize();
    mountRef.current.appendChild(renderer.domElement);

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("resize", onResize);

    let mounted = true;
    const animate = () => { if (!mounted) return; requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    const handleMovementCommand = (event) => {
      const { command, dx, dy, scale } = event.detail || {};
      if (!modelRef.current) return;
      if (command === "move") {
        modelRef.current.position.x += dx * scale;
        modelRef.current.position.y += dy * scale;
      } else if (command === "rotate") {
        const radians = (scale * Math.PI) / 180;
        modelRef.current.rotation.x += dy * radians;
        modelRef.current.rotation.z += dx * radians;
      }
    };
    window.addEventListener("movementCommand", handleMovementCommand);

    return () => {
      mounted = false;
      window.removeEventListener("movementCommand", handleMovementCommand);
      window.removeEventListener("resize", onResize);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener("mousedown", onMouseDown);
        renderer.domElement.removeEventListener("mousemove", onMouseMove);
        renderer.domElement.removeEventListener("mouseup", onMouseUp);
        renderer.domElement.removeEventListener("wheel", onWheel);
        renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      }
      if (mountRef.current && renderer && renderer.domElement) {
        try { mountRef.current.removeChild(renderer.domElement); } catch (_) {}
      }
      renderer.dispose();
      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry && o.geometry.dispose && o.geometry.dispose();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose && m.dispose());
            else o.material.dispose && o.material.dispose();
          }
        }
      });
      modelRef.current = null;
    };
  }, []);

  useEffect(() => { if (axesGroupRef.current) axesGroupRef.current.visible = showAxes; }, [showAxes]);

  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;

    if (sceneRef.current && sceneRef.current.getObjectByName("modelNode")) {
      const old = sceneRef.current.getObjectByName("modelNode");
      sceneRef.current.remove(old);
      if (old.geometry) old.geometry.dispose();
      if (old.material && old.material.dispose) old.material.dispose();
      modelRef.current = null;
    }

    const loader = new ModelLoader();
    loader.load(
      modelUrl,
      (geometry) => {
        if (!geometry || !geometry.attributes || !geometry.attributes.position) return;

        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        geometry.translate(-center.x, -center.y, -center.z);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const target = 40;
          const s = target / maxDim;
          geometry.scale(s, s, s);
        }
        if (!geometry.attributes.normal) geometry.computeVertexNormals();

        const mat = new THREE.MeshPhongMaterial({ color: 0x919191, side: THREE.DoubleSide, shininess: 30 });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.name = "modelNode";
        sceneRef.current.add(mesh);

        modelRef.current = mesh;

        if (controlsRef.current) {
          const radius = Math.max(60, Math.min(500, Math.max(size.x, size.y, size.z) * 1.5));
          controlsRef.current.spherical.radius = radius;
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      },
      undefined
    );
  }, [modelUrl]);

  return (
    <div className="dinolabs3DModelContentWrapper">
      <div ref={mountRef} className="dinolabs3DModelRendererMount" />
      <div className="dinolabs3DModelAxesToggle">
        <label>
          <input type="checkbox" className="dinolabsSettingsCheckbox" checked={showAxes} onChange={(e) => setShowAxes(e.target.checked)} />
        Axes
        </label>
      </div>
    </div>
  );
}

export default function DinoLabs3DViewer({ fileHandle }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modelUrl, setModelUrl] = useState(null);
  const [displayName, setDisplayName] = useState("Untitled.stl");
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [movementState, setMovementState] = useState("move");
  const [movementScale, setMovementScale] = useState(1);
  const [movementUnit, setMovementUnit] = useState("mm");

  const menuPortalRef = useRef(null);
  const fileBtnRef = useRef(null);

  const unitOptions = [
    { value: "mm", label: "mm" },
    { value: "cm", label: "cm" },
    { value: "in", label: "in" },
    { value: "°", label: "°" }
  ];

  useEffect(() => {
    let createdUrl = null;

    async function loadFile() {
      setError(null);
      setLoading(true);
      setModelUrl(null);
      try {
        if (!fileHandle) { setLoading(false); return; }
        const file = await fileHandle.getFile();
        const name = file.name || "Untitled.stl";
        setDisplayName(name);
        createdUrl = URL.createObjectURL(file);
        setModelUrl(createdUrl);
      } catch (error) {
        setError(error?.message || String(error));
      } finally {
        setLoading(false);
      }
    }

    loadFile();
    return () => { if (createdUrl) URL.revokeObjectURL(createdUrl); };
  }, [fileHandle]);

  const handleDownload = () => {
    if (!modelUrl) { alert("No model loaded to export"); return; }
    const a = document.createElement("a");
    a.href = modelUrl; a.download = displayName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  useEffect(() => {
    const down = (e) => {
      if (openMenu && !menuPortalRef.current?.contains(e.target) && !e.target.closest(".dinolabs3DModelOperationsButton")) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", down, true);
    return () => document.removeEventListener("mousedown", down, true);
  }, [openMenu]);

  const openTopMenu = (name, btnRef) => {
    setOpenMenu((prev) => (prev === name ? null : name));
    if (btnRef.current) setMenuPosition(clampPosition(btnRef.current.getBoundingClientRect()));
  };

  const renderDropdownMenu = (menuName, items) => {
    if (openMenu !== menuName) return null;
    return createPortal(
      <div className="dinolabs3DModelDropdownMenu" ref={menuPortalRef} style={{ top: menuPosition.top, left: menuPosition.left }}>
        {items.map((item, i) => (
          <div
            className="dinolabs3DModelDropdownMenuItem"
            key={i}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3a3a3a")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            onClick={() => { item.action(); setOpenMenu(null); }}
          >
            {item.icon && <FontAwesomeIcon icon={item.icon} />}
            {item.text}
          </div>
        ))}
      </div>,
      document.body
    );
  };

  const sendMovementCommand = (dx, dy) => {
    const scale = parseFloat(movementScale) || 1.0;
    const event = new CustomEvent("movementCommand", { detail: { command: movementState, dx, dy, scale } });
    window.dispatchEvent(event);
  };

  const LoadingUI = (
    <div className="dinolabs3DModelLoadingWrapper">
      <div className="dinolabs3DModelLoadingCircle" />
      <label className="dinolabs3DModelLoadingTitle">Dino Labs Web IDE</label>
    </div>
  );

  return (
    <div className="dinolabs3DModelPageWrapper">
      <div className="dinolabs3DModelToolbarWrapper">
        <div className="dinolabs3DModelToolBar">
          <div className="dinolabs3DModelTitleWrapper">
            <div className="dinolabs3DModelFileNameStack">
              <label className="dinolabs3DModelFileNameInput">
                <FontAwesomeIcon icon={faFile} /> {displayName}
              </label>
              <div className="dinolabs3DModelOperationsButtonsWrapper">
                <button ref={fileBtnRef} className="dinolabs3DModelOperationsButton" onClick={() => openTopMenu("file", fileBtnRef)}>
                  File
                </button>
                {renderDropdownMenu("file", [{ icon: faDownload, text: "Export", action: handleDownload }])}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && LoadingUI}
      {error && (
        <div className="dinolabs3DModelErrorToast">
          Error: {error}
        </div>
      )}

      <div className="dinolabs3DModelEditorContentWrapper">
        <ThreeJSViewer modelUrl={modelUrl} />

        <div className="dinolabs3DModelMovementControlPanel">
          <div className="dinolabs3DModelMovementModeButtons">
            <button
              className={`dinolabs3DModelMovementModeBtn ${movementState === "move" ? "active" : ""}`}
              onClick={() => { setMovementState("move"); if (movementUnit === "°") setMovementUnit("mm"); }}
            >
              Move
            </button>
            <button
              className={`dinolabs3DModelMovementModeBtn ${movementState === "rotate" ? "active" : ""}`}
              onClick={() => { setMovementState("rotate"); setMovementUnit("°"); }}
            >
              Rotate
            </button>
          </div>

          <div className="dinolabs3DModelMovementPad">
            <button className="dinolabs3DModelMovementBtn" onClick={() => sendMovementCommand(-1,  1)}>↖</button>
            <button className="dinolabs3DModelMovementBtn" onClick={() => sendMovementCommand( 0,  1)}>↑</button>
            <button className="dinolabs3DModelMovementBtn" onClick={() => sendMovementCommand( 1,  1)}>↗</button>
            <button className="dinolabs3DModelMovementBtn" onClick={() => sendMovementCommand(-1,  0)}>←</button>
            <div className="dinolabs3DModelMovementCenter" />
            <button className="dinolabs3DModelMovementBtn" onClick={() => sendMovementCommand( 1,  0)}>→</button>
            <button className="dinolabs3DModelMovementBtn" onClick={() => sendMovementCommand(-1, -1)}>↙</button>
            <button className="dinolabs3DModelMovementBtn" onClick={() => sendMovementCommand( 0, -1)}>↓</button>
            <button className="dinolabs3DModelMovementBtn" onClick={() => sendMovementCommand( 1, -1)}>↘</button>
          </div>

          <div className="dinolabs3DModelMovementScaleControls">
            <input
              type="number"
              className="dinolabs3DModelMovementScaleInput"
              value={movementScale}
              onChange={(e) => setMovementScale(parseFloat(e.target.value) || 1)}
              step="0.1"
              min="0.1"
            />
            <select
              className="dinolabs3DModelMovementUnitSelect"
              value={movementUnit}
              onChange={(e) => setMovementUnit(e.target.value)}
            >
              {unitOptions
                .filter(u => movementState === "rotate" ? u.value === "°" : u.value !== "°")
                .map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>

          <div className="dinolabs3DModelControlsHelp">
            <small>Left drag: Orbit • Right drag: Pan • Scroll: Zoom</small>
          </div>
        </div>
      </div>
    </div>
  );
}