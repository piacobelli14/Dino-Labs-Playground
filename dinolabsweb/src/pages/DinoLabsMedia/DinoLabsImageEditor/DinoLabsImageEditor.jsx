import React, { useState, useEffect, useRef } from "react";
import "../../../styles/mainStyles/DinoLabsImageEditor/DinoLabsImageEditor.css";
import "../../../styles/helperStyles/Slider.css";
import "../../../styles/helperStyles/Checkbox.css";
import DinoLabsColorPicker from "../../../helpers/ColorPicker.jsx";
import { showDialog } from "../../../helpers/Alert.jsx";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faArrowsLeftRightToLine, faArrowsRotate, faArrowsUpToLine, faBorderTopLeft, faCircle, faCropSimple, faDownload, faLeftRight, faMagnifyingGlassMinus, faMagnifyingGlassPlus, faMinus, faBrush, faPenRuler, faPlus, faRightLeft, faRotate, faRotateLeft, faRotateRight, faRuler, faRulerCombined, faSave, faSquareCaretLeft, faSwatchbook, faTabletScreenButton, faUpDown, faEye, faEyeSlash, faLock, faLockOpen, faArrowUp, faArrowDown, faImage, faTrash, faFileImport, faLayerGroup, faFont, faAlignLeft, faAlignCenter, faAlignRight, faBold, faItalic, faUnderline, faSquare, faPlay, faDrawPolygon, faVectorSquare, faShapes, faArrowRightLong, faBezierCurve, faXmark, faBook } from "@fortawesome/free-solid-svg-icons";

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function SliderControl({ label, value, onChange, min, max, buttonStep }) {
    return (
        <div className="dinolabsImageEditorCellFlexStack">
            <label className="dinolabsImageEditorCellFlexTitle">{label}</label>
            <div className="dinolabsImageEditorCellFlex">
                <button onClick={() => onChange(Math.max(value - buttonStep, min))} className="dinolabsImageEditorToolButton">
                    <FontAwesomeIcon icon={faMinus} />
                </button>

                <div className="dinolabsImageEditorSliderWrapper">
                    <input
                        className="dinolabsSettingsSlider"
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onInput={(e) => onChange(Number(e.target.value))}
                        onChange={(e) => onChange(Number(e.target.value))}
                    />
                </div>
                <button onClick={() => onChange(Math.min(value + buttonStep, max))} className="dinolabsImageEditorToolButton">
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            </div>
        </div>
    );
}

function DrawControl({ mode, actionMode, setActionMode, color, setColor, brushSize, setBrushSize, isColorOpen, setIsColorOpen, isCropping, addToHistory }) {
    const title = mode === "Drawing" ? "Draw on Image" : "Highlight on Image";
    const buttonText = mode === "Drawing" ? "Draw" : "Highlight";

    return (
        <div className="dinolabsImageEditorCellFlexStack">
            <label className="dinolabsImageEditorCellFlexTitle">{title}</label>
            <div className="dinolabsImageEditorCellFlex">

                <div className="dinolabsImageEditorCellFlexSubStack">
                    <div className="dinolabsImageEditorCellFlexSubRow">
                        <button onClick={() => { setActionMode(prev => prev === mode ? "Idle" : mode); addToHistory(`${mode} mode ${prev === mode ? 'disabled' : 'enabled'}.`); }} style={{ backgroundColor: actionMode === mode ? "#5C2BE2" : "", opacity: isCropping ? "0.6" : "1.0" }} disabled={isCropping} className="dinolabsImageEditorToolButtonBig" >
                            {buttonText}
                        </button>
                        <Tippy content={<DinoLabsColorPicker color={color} onChange={(newColor) => { setColor(newColor); addToHistory(`${mode} color changed.`); }} />} visible={isColorOpen} onClickOutside={() => setIsColorOpen(false)} interactive={true} placement="right" className="color-picker-tippy" >
                            <label className="dinolabsImageEditorColorPicker" onClick={() => setIsColorOpen((prev) => !prev)} style={{ backgroundColor: color }} />
                        </Tippy>
                    </div>

                    <div className="dinolabsImageEditorBrushSizeFlex">
                        {[{ size: 1, label: "XS" }, { size: 2, label: "S" }, { size: 4, label: "M" }, { size: 6, label: "L" }, { size: 8, label: "XL" }].map(opt => (
                            <button key={opt.size} onClick={() => { setBrushSize(opt.size); addToHistory(`${mode} brush size changed to ${opt.label}.`); }} style={{ backgroundColor: brushSize === opt.size ? "#5C2BE2" : "" }} className="dinolabsImageEditorToolButtonMini" >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DinoLabsImageEditor({ fileHandle }) {
    const [url, setUrl] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [svgContent, setSvgContent] = useState(null);
    const [baseZoom, setBaseZoom] = useState(1);
    const [baseRotation, setBaseRotation] = useState(0);
    const [baseFlipX, setBaseFlipX] = useState(1);
    const [baseFlipY, setBaseFlipY] = useState(1);
    const [baseHue, setBaseHue] = useState(0);
    const [baseSaturation, setBaseSaturation] = useState(100);
    const [baseBrightness, setBaseBrightness] = useState(100);
    const [baseContrast, setBaseContrast] = useState(100);
    const [baseOpacity, setBaseOpacity] = useState(100);
    const [baseBlur, setBaseBlur] = useState(0);
    const [baseSpread, setBaseSpread] = useState(0);
    const [baseGrayscale, setBaseGrayscale] = useState(0);
    const [baseSepia, setBaseSepia] = useState(0);

    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const draggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const [imageWidth, setImageWidth] = useState(450);
    const [imageHeight, setImageHeight] = useState(450);
    const [nativeWidth, setNativeWidth] = useState(450);
    const [nativeHeight, setNativeHeight] = useState(450);
    const [resizingCorner, setResizingCorner] = useState(null);
    const resizingRef = useRef(false);
    const lastResizePosRef = useRef({ x: 0, y: 0 });
    const initialSizeRef = useRef({ width: 450, height: 450 });
    const initialPosRef = useRef({ x: 0, y: 0 });
    const [isCropping, setIsCropping] = useState(false);
    const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [cropRotation, setCropRotation] = useState(0);
    const cropResizingRef = useRef(false);
    const cropResizingCorner = useRef(null);
    const cropLastResizePosRef = useRef({ x: 0, y: 0 });
    const cropInitialRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
    const [actionMode, setActionMode] = useState("Idle");
    const [drawColor, setDrawColor] = useState("#5C2BE2");
    const [highlightColor, setHighlightColor] = useState("#00ff624d");
    const [paths, setPaths] = useState([]);
    const [undonePaths, setUndonePaths] = useState([]);
    const [tempPath, setTempPath] = useState(null);
    const isDrawingRef = useRef(false);
    const drawingLayerDraggingRef = useRef(false);
    const currentPathPoints = useRef([]);
    const [borderRadius, setBorderRadius] = useState(0);
    const [borderTopLeftRadius, setBorderTopLeftRadius] = useState(0);
    const [borderTopRightRadius, setBorderTopRightRadius] = useState(0);
    const [borderBottomLeftRadius, setBorderBottomLeftRadius] = useState(0);
    const [borderBottomRightRadius, setBorderBottomRightRadius] = useState(0);
    const [syncCorners, setSyncCorners] = useState(false);
    const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
    const aspectRatioRef = useRef(1);
    const [drawBrushSize, setDrawBrushSize] = useState(4);
    const [highlightBrushSize, setHighlightBrushSize] = useState(4);
    const [cropHistory, setCropHistory] = useState([]);
    const [isDrawColorOpen, setIsDrawColorOpen] = useState(false);
    const [isHighlightColorOpen, setIsHighlightColorOpen] = useState(false);
    const [isTextColorOpen, setIsTextColorOpen] = useState(false);
    const [isTextBackgroundColorOpen, setIsTextBackgroundColorOpen] = useState(false);
    const [isTextBorderColorOpen, setIsTextBorderColorOpen] = useState(false);
    const [isTextShadowColorOpen, setIsTextShadowColorOpen] = useState(false);
    const [isGeometryStrokeColorOpen, setIsGeometryStrokeColorOpen] = useState(false);
    const [isGeometryFillColorOpen, setIsGeometryFillColorOpen] = useState(false);
    const [isCropDisabled, setIsCropDisabled] = useState(false);
    const [circleCrop, setCircleCrop] = useState(false);
    const containerRef = useRef(null);
    const [baseVisible, setBaseVisible] = useState(true);
    const [baseLocked, setBaseLocked] = useState(false);
    const [history, setHistory] = useState([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
    const cropRotatingRef = useRef(false);
    const cropInitialRotation = useRef(0);
    const cropRotationStartAngle = useRef(0);
    const cropRotationCenter = useRef({ x: 0, y: 0 });
    const cropDraggingRef = useRef(false);
    const lastCropDragPosRef = useRef({ x: 0, y: 0 });
    const fileInputRef = useRef(null);
    const historyUpdateTimeoutRef = useRef(null);
    const preventHistoryUpdate = useRef(false);
    const [drawingLayers, setDrawingLayers] = useState([]);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [imageLayers, setImageLayers] = useState([]);
    const [selectedLayers, setSelectedLayers] = useState(['base']);
    const [resizingImageLayer, setResizingImageLayer] = useState(null);
    const imageLayerResizingRef = useRef(false);
    const imageLayerDraggingRef = useRef(false);
    const lastImageLayerPosRef = useRef({ x: 0, y: 0 });
    const initialImageLayerSizeRef = useRef({ width: 0, height: 0 });
    const initialImageLayerPosRef = useRef({ x: 0, y: 0 });
    const [textLayers, setTextLayers] = useState([]);
    const [editingTextId, setEditingTextId] = useState(null);
    const [textSettings, setTextSettings] = useState({
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: '#000000',
        backgroundColor: 'transparent',
        padding: 8,
        borderColor: '#000000',
        borderStyle: 'solid',
        borderWidth: 0,
        borderRadius: 0,
        shadowColor: '#000000',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0
    });
    const [resizingTextLayer, setResizingTextLayer] = useState(null);
    const textLayerResizingRef = useRef(false);
    const textLayerDraggingRef = useRef(false);
    const lastTextLayerPosRef = useRef({ x: 0, y: 0 });
    const initialTextLayerSizeRef = useRef({ width: 0, height: 0 });
    const initialTextLayerPosRef = useRef({ x: 0, y: 0 });
    const [resizingDrawingLayer, setResizingDrawingLayer] = useState(null);
    const drawingLayerResizingRef = useRef(false);
    const lastDrawingLayerPosRef = useRef({ x: 0, y: 0 });
    const initialDrawingLayerZoomRef = useRef(1);
    const [geometryLayers, setGeometryLayers] = useState([]);
    const [editingGeometryId, setEditingGeometryId] = useState(null);
    const [selectedGeometryShape, setSelectedGeometryShape] = useState('rectangle');
    const [geometrySettings, setGeometrySettings] = useState({
        strokeColor: '#5C2BE2',
        fillColor: 'transparent',
        strokeWidth: 3,
        strokeStyle: 'solid',
        borderRadius: 0,
        arrowHead: true,
        dashArray: ''
    });
    const [resizingGeometryLayer, setResizingGeometryLayer] = useState(null);
    const geometryLayerResizingRef = useRef(false);
    const geometryLayerDraggingRef = useRef(false);
    const lastGeometryLayerPosRef = useRef({ x: 0, y: 0 });
    const initialGeometryLayerSizeRef = useRef({ width: 0, height: 0 });
    const initialGeometryLayerPosRef = useRef({ x: 0, y: 0 });
    const isCreatingGeometry = useRef(false);
    const geometryStartPoint = useRef({ x: 0, y: 0 });
    const [tempGeometry, setTempGeometry] = useState(null);
    const [creatingPolygonPoints, setCreatingPolygonPoints] = useState([]);
    const [isCreatingPolygon, setIsCreatingPolygon] = useState(false);

    const getCurrentLayerValues = () => {
        if (selectedLayers.length === 0) return {};

        if (selectedLayers.includes('base') && selectedLayers.length === 1) {
            return {
                zoom: baseZoom,
                rotation: baseRotation,
                flipX: baseFlipX,
                flipY: baseFlipY,
                hue: baseHue,
                saturation: baseSaturation,
                brightness: baseBrightness,
                contrast: baseContrast,
                opacity: baseOpacity,
                blur: baseBlur,
                spread: baseSpread,
                grayscale: baseGrayscale,
                sepia: baseSepia
            };
        }

        if (selectedLayers.length === 1 && !selectedLayers.includes('base')) {
            const imageLayer = imageLayers.find(l => l.id === selectedLayers[0]);
            if (imageLayer) {
                return {
                    zoom: imageLayer.zoom || 1,
                    rotation: imageLayer.rotation || 0,
                    flipX: imageLayer.flipX || 1,
                    flipY: imageLayer.flipY || 1,
                    hue: imageLayer.hue || 0,
                    saturation: imageLayer.saturation || 100,
                    brightness: imageLayer.brightness || 100,
                    contrast: imageLayer.contrast || 100,
                    opacity: imageLayer.opacity || 100,
                    blur: imageLayer.blur || 0,
                    spread: imageLayer.spread || 0,
                    grayscale: imageLayer.grayscale || 0,
                    sepia: imageLayer.sepia || 0
                };
            }

            const textLayer = textLayers.find(l => l.id === selectedLayers[0]);
            if (textLayer) {
                return {
                    zoom: textLayer.zoom || 1,
                    rotation: textLayer.rotation || 0,
                    flipX: textLayer.flipX || 1,
                    flipY: textLayer.flipY || 1,
                    hue: textLayer.hue || 0,
                    saturation: textLayer.saturation || 100,
                    brightness: textLayer.brightness || 100,
                    contrast: textLayer.contrast || 100,
                    opacity: textLayer.opacity || 100,
                    blur: textLayer.blur || 0,
                    spread: textLayer.spread || 0,
                    grayscale: textLayer.grayscale || 0,
                    sepia: textLayer.sepia || 0
                };
            }

            const geometryLayer = geometryLayers.find(l => l.id === selectedLayers[0]);
            if (geometryLayer) {
                return {
                    zoom: geometryLayer.zoom || 1,
                    rotation: geometryLayer.rotation || 0,
                    flipX: geometryLayer.flipX || 1,
                    flipY: geometryLayer.flipY || 1,
                    hue: geometryLayer.hue || 0,
                    saturation: geometryLayer.saturation || 100,
                    brightness: geometryLayer.brightness || 100,
                    contrast: geometryLayer.contrast || 100,
                    opacity: geometryLayer.opacity || 100,
                    blur: geometryLayer.blur || 0,
                    spread: geometryLayer.spread || 0,
                    grayscale: geometryLayer.grayscale || 0,
                    sepia: geometryLayer.sepia || 0
                };
            }

            const drawingLayer = drawingLayers.find(l => l.id === selectedLayers[0]);
            if (drawingLayer) {
                return {
                    zoom: drawingLayer.zoom || 1,
                    rotation: drawingLayer.rotation || 0,
                    flipX: drawingLayer.flipX || 1,
                    flipY: drawingLayer.flipY || 1,
                    hue: drawingLayer.hue || 0,
                    saturation: drawingLayer.saturation || 100,
                    brightness: drawingLayer.brightness || 100,
                    contrast: drawingLayer.contrast || 100,
                    opacity: drawingLayer.opacity || 100,
                    blur: drawingLayer.blur || 0,
                    spread: drawingLayer.spread || 0,
                    grayscale: drawingLayer.grayscale || 0,
                    sepia: drawingLayer.sepia || 0
                };
            }
        }

        return {
            zoom: 1,
            rotation: 0,
            flipX: 1,
            flipY: 1,
            hue: 0,
            saturation: 100,
            brightness: 100,
            contrast: 100,
            opacity: 100,
            blur: 0,
            spread: 0,
            grayscale: 0,
            sepia: 0
        };
    };

    const currentValues = getCurrentLayerValues();

    const calculateInitialSize = (w, h) => {
        const containerWidth = containerRef.current?.clientWidth || 800;
        const containerHeight = containerRef.current?.clientHeight || 600;
        const maxPossibleWidth = containerWidth * 0.7;
        const maxPossibleHeight = containerHeight * 0.7;
        let initWidth = w;
        let initHeight = h;
        const widthRatio = initWidth / maxPossibleWidth;
        const heightRatio = initHeight / maxPossibleHeight;
        if (widthRatio > 1 || heightRatio > 1) {
            const ratio = Math.max(widthRatio, heightRatio);
            initWidth /= ratio;
            initHeight /= ratio;
        }
        setImageWidth(initWidth);
        setImageHeight(initHeight);
    };

    useEffect(() => {
        let objectUrl;
        const loadMedia = async () => {
            try {
                const file = typeof fileHandle.getFile === "function" ? await fileHandle.getFile() : fileHandle;
                objectUrl = URL.createObjectURL(file);
                setUrl(objectUrl);
                const extension = file.name.split(".").pop().toLowerCase();
                if (extension === "svg") {
                    setMediaType("svg");
                    const response = await fetch(objectUrl);
                    const svgText = await response.text();
                    setSvgContent(svgText);
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(svgText, "image/svg+xml");
                    const svgElement = doc.documentElement;
                    let svgWidth = parseFloat(svgElement.getAttribute("width"));
                    let svgHeight = parseFloat(svgElement.getAttribute("height"));
                    if (!svgWidth || !svgHeight) {
                        const viewBox = svgElement.getAttribute("viewBox");
                        if (viewBox) {
                            const vbValues = viewBox.split(" ");
                            svgWidth = parseFloat(vbValues[2]);
                            svgHeight = parseFloat(vbValues[3]);
                        }
                    }
                    setNativeWidth(svgWidth);
                    setNativeHeight(svgHeight);
                    calculateInitialSize(svgWidth, svgHeight);
                } else if (["png", "jpg", "jpeg", "gif", "bmp"].includes(extension)) {
                    setMediaType("image");
                    const img = new Image();
                    img.onload = () => {
                        setNativeWidth(img.naturalWidth);
                        setNativeHeight(img.naturalHeight);
                        calculateInitialSize(img.naturalWidth, img.naturalHeight);
                    };
                    img.src = objectUrl;
                }
            } catch (error) {
                return;
            }
        };
        loadMedia();

        setTimeout(() => {
            addToHistory("Image loaded.");
        }, 1000);

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileHandle]);

    useEffect(() => {
        const normalizedRotation = baseRotation % 360;
        const isAtOriginalPosition = normalizedRotation === 0;
        if (isAtOriginalPosition && baseFlipX === 1 && baseFlipY === 1) {
            setIsCropDisabled(false);
        } else {
            setIsCropDisabled(true);
        }
    }, [baseRotation, baseFlipX, baseFlipY]);

    const getSvgPoint = (e) => {
        const svg = e.currentTarget;
        const point = svg.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const ctm = svg.getScreenCTM().inverse();
        return point.matrixTransform(ctm);
    };

    const resetImage = () => {
        setBaseZoom(1);
        setBaseRotation(0);
        setBaseFlipX(1);
        setBaseFlipY(1);
        setBaseHue(0);
        setBaseSaturation(100);
        setBaseBrightness(100);
        setBaseContrast(100);
        setBaseOpacity(100);
        setBaseBlur(0);
        setBaseSpread(0);
        setBaseGrayscale(0);
        setBaseSepia(0);
        setPanX(0);
        setPanY(0);
        setBorderRadius(0);
        setBorderTopLeftRadius(0);
        setBorderTopRightRadius(0);
        setBorderBottomLeftRadius(0);
        setBorderBottomRightRadius(0);
        setPaths([]);
        setUndonePaths([]);
        setDrawingLayers([]);
        setImageLayers([]);
        setTextLayers([]);
        setGeometryLayers([]);
        setEditingTextId(null);
        setEditingGeometryId(null);
        setSelectedLayers(['base']);
        setCreatingPolygonPoints([]);
        setIsCreatingPolygon(false);
        setTempGeometry(null);
        calculateInitialSize(nativeWidth, nativeHeight);
        setIsCropDisabled(false);
        addToHistory("Image reset to original state.");
    };

    const getPathBounds = (pathData) => {
        try {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.style.visibility = "hidden";
            svg.style.position = "absolute";
            document.body.appendChild(svg);
            
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            svg.appendChild(path);
            
            const bbox = path.getBBox();
            document.body.removeChild(svg);
            
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height
            };
        } catch (error) {
            return { x: 0, y: 0, width: 100, height: 100 };
        }
    };

    const generateThumbnail = () => {
        return new Promise((resolve) => {
            const thumbSize = 100;
            const rad = baseRotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const halfW = nativeWidth / 2;
            const halfH = nativeHeight / 2;
            const corners = [
                { x: -halfW, y: -halfH },
                { x: halfW, y: -halfH },
                { x: halfW, y: halfH },
                { x: -halfW, y: halfH }
            ];
            const transformedCorners = corners.map(c => {
                let x = c.x * cos - c.y * sin;
                let y = c.x * sin + c.y * cos;
                x *= baseZoom * baseFlipX;
                y *= baseZoom * baseFlipY;
                return { x, y };
            });
            const xs = transformedCorners.map(c => c.x);
            const ys = transformedCorners.map(c => c.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            const boundWidth = maxX - minX;
            const boundHeight = maxY - minY;
            const scaleFactor = thumbSize / Math.max(boundWidth, boundHeight);
            const canvas = document.createElement("canvas");
            canvas.width = boundWidth * scaleFactor;
            canvas.height = boundHeight * scaleFactor;
            const ctx = canvas.getContext("2d");
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scaleFactor, scaleFactor);
            ctx.rotate(rad);
            ctx.scale(baseZoom * baseFlipX, baseZoom * baseFlipY);

            let filterString = `hue-rotate(${baseHue}deg) saturate(${baseSaturation}%) brightness(${baseBrightness}%) contrast(${baseContrast}%) blur(${baseBlur}px) grayscale(${baseGrayscale}%) sepia(${baseSepia}%)`;
            if (baseSpread) filterString += ` drop-shadow(0 0 ${baseSpread}px rgba(0,0,0,0.5))`;
            ctx.filter = filterString;
            ctx.globalAlpha = baseOpacity / 100;

            const roundedRect = new Path2D();
            const scaleRatio = nativeWidth / imageWidth;
            if (circleCrop) {
                const radius = Math.min(nativeWidth, nativeHeight) / 2;
                roundedRect.arc(0, 0, radius, 0, 2 * Math.PI);
            } else if (syncCorners) {
                let radius = borderRadius * scaleRatio;
                radius = Math.min(radius, nativeWidth / 2, nativeHeight / 2);
                drawRoundedRect(ctx, -nativeWidth / 2, -nativeHeight / 2, nativeWidth, nativeHeight, radius);
            } else {
                const tl = Math.min(borderTopLeftRadius * scaleRatio, nativeWidth / 2, nativeHeight / 2);
                const tr = Math.min(borderTopRightRadius * scaleRatio, nativeWidth / 2, nativeHeight / 2);
                const br = Math.min(borderBottomRightRadius * scaleRatio, nativeWidth / 2, nativeHeight / 2);
                const bl = Math.min(borderBottomLeftRadius * scaleRatio, nativeWidth / 2, nativeHeight / 2);
                roundedRect.moveTo(-nativeWidth / 2 + tl, -nativeHeight / 2);
                roundedRect.lineTo(nativeWidth / 2 - tr, -nativeHeight / 2);
                roundedRect.quadraticCurveTo(nativeWidth / 2, -nativeHeight / 2, nativeWidth / 2, -nativeHeight / 2 + tr);
                roundedRect.lineTo(nativeWidth / 2, nativeHeight / 2 - br);
                roundedRect.quadraticCurveTo(nativeWidth / 2, nativeHeight / 2, nativeWidth / 2 - br, nativeHeight / 2);
                roundedRect.lineTo(-nativeWidth / 2 + bl, nativeHeight / 2);
                roundedRect.quadraticCurveTo(-nativeWidth / 2, nativeHeight / 2, -nativeWidth / 2, nativeHeight / 2 - bl);
                roundedRect.lineTo(-nativeWidth / 2, -nativeHeight / 2 + tl);
                roundedRect.quadraticCurveTo(-nativeWidth / 2, -nativeHeight / 2, -nativeWidth / 2 + tl, -nativeHeight / 2);
            }
            ctx.clip(roundedRect);

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                if (baseVisible) {
                    ctx.drawImage(img, -nativeWidth / 2, -nativeHeight / 2, nativeWidth, nativeHeight);
                }

                imageLayers.filter(layer => layer.visible).forEach(layer => {
                    const layerImg = new Image();
                    layerImg.crossOrigin = "anonymous";
                    layerImg.onload = () => {
                        ctx.save();
                        ctx.globalAlpha = (layer.opacity || 100) / 100;
                        ctx.translate(layer.x - nativeWidth / 2, layer.y - nativeHeight / 2);
                        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
                        ctx.drawImage(layerImg, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
                        ctx.restore();
                    };
                    layerImg.src = layer.url;
                });

                paths.filter(p => p.visible).forEach(elem => {
                    ctx.save();
                    ctx.translate(-nativeWidth / 2, -nativeHeight / 2);
                    ctx.strokeStyle = elem.color;
                    ctx.lineWidth = elem.width;
                    ctx.lineCap = "round";
                    try {
                        const p = new Path2D(elem.d);
                        ctx.stroke(p);
                    } catch (error) {
                        return;
                    }
                    ctx.restore();
                });
                if (tempPath) {
                    ctx.save();
                    ctx.translate(-nativeWidth / 2, -nativeHeight / 2);
                    ctx.strokeStyle = tempPath.color;
                    ctx.lineWidth = tempPath.width;
                    ctx.lineCap = "round";
                    try {
                        const p = new Path2D(tempPath.d);
                        ctx.stroke(p);
                    } catch (error) {
                        return;
                    }
                    ctx.restore();
                }
                resolve(canvas.toDataURL("image/png"));
            };
            img.src = url;
        });
    };

    const addToHistory = async (description = "Edit") => {
        if (preventHistoryUpdate.current) return;

        if (historyUpdateTimeoutRef.current) {
            clearTimeout(historyUpdateTimeoutRef.current);
        }

        historyUpdateTimeoutRef.current = setTimeout(async () => {
            const thumbnail = await generateThumbnail();
            const currentState = {
                url, mediaType, svgContent, baseZoom, baseRotation, baseFlipX, baseFlipY,
                baseHue, baseSaturation, baseBrightness, baseContrast, baseOpacity, baseBlur, baseSpread, baseGrayscale, baseSepia,
                panX, panY, imageWidth, imageHeight, nativeWidth, nativeHeight, borderRadius, borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius, syncCorners, maintainAspectRatio, paths, undonePaths, drawBrushSize, highlightBrushSize, cropHistory, isCropDisabled, circleCrop, baseVisible, baseLocked, drawColor, highlightColor, isDrawColorOpen, isHighlightColorOpen, isTextColorOpen, isTextBackgroundColorOpen, isTextBorderColorOpen, isTextShadowColorOpen, isGeometryStrokeColorOpen, isGeometryFillColorOpen, actionMode, imageLayers, selectedLayers, textLayers, editingTextId, textSettings, geometryLayers, editingGeometryId, selectedGeometryShape, geometrySettings, creatingPolygonPoints, isCreatingPolygon
            };

            setHistory(prev => {
                const newHistory = [...prev];
                if (currentHistoryIndex < prev.length - 1) {
                    newHistory.splice(currentHistoryIndex + 1);
                }
                newHistory.push({ state: currentState, thumbnail, description });
                return newHistory;
            });

            setCurrentHistoryIndex(prev => {
                return currentHistoryIndex < history.length - 1 ? currentHistoryIndex + 1 : prev + 1;
            });
        }, 300);
    };

    const restoreHistory = (index) => {
        preventHistoryUpdate.current = true;

        const { state } = history[index];
        setUrl(state.url);
        setMediaType(state.mediaType);
        setSvgContent(state.svgContent);
        setBaseZoom(state.baseZoom || state.zoom || 1);
        setBaseRotation(state.baseRotation || state.rotation || 0);
        setBaseFlipX(state.baseFlipX || state.flipX || 1);
        setBaseFlipY(state.baseFlipY || state.flipY || 1);
        setBaseHue(state.baseHue || state.hue || 0);
        setBaseSaturation(state.baseSaturation || state.saturation || 100);
        setBaseBrightness(state.baseBrightness || state.brightness || 100);
        setBaseContrast(state.baseContrast || state.contrast || 100);
        setBaseOpacity(state.baseOpacity || state.opacity || 100);
        setBaseBlur(state.baseBlur || state.blur || 0);
        setBaseSpread(state.baseSpread || state.spread || 0);
        setBaseGrayscale(state.baseGrayscale || state.grayscale || 0);
        setBaseSepia(state.baseSepia || state.sepia || 0);
        setPanX(state.panX);
        setPanY(state.panY);
        setImageWidth(state.imageWidth);
        setImageHeight(state.imageHeight);
        setNativeWidth(state.nativeWidth);
        setNativeHeight(state.nativeHeight);
        setBorderRadius(state.borderRadius);
        setBorderTopLeftRadius(state.borderTopLeftRadius);
        setBorderTopRightRadius(state.borderTopRightRadius);
        setBorderBottomLeftRadius(state.borderBottomLeftRadius);
        setBorderBottomRightRadius(state.borderBottomRightRadius);
        setSyncCorners(state.syncCorners);
        setMaintainAspectRatio(state.maintainAspectRatio);
        setPaths(state.paths);
        setUndonePaths(state.undonePaths);
        setDrawBrushSize(state.drawBrushSize);
        setHighlightBrushSize(state.highlightBrushSize);
        setCropHistory(state.cropHistory);
        setIsCropDisabled(state.isCropDisabled);
        setCircleCrop(state.circleCrop);
        setBaseVisible(state.baseVisible);
        setBaseLocked(state.baseLocked);
        setDrawColor(state.drawColor);
        setHighlightColor(state.highlightColor);
        setIsDrawColorOpen(state.isDrawColorOpen);
        setIsHighlightColorOpen(state.isHighlightColorOpen);
        setIsTextColorOpen(state.isTextColorOpen || false);
        setIsTextBackgroundColorOpen(state.isTextBackgroundColorOpen || false);
        setIsTextBorderColorOpen(state.isTextBorderColorOpen || false);
        setIsTextShadowColorOpen(state.isTextShadowColorOpen || false);
        setIsGeometryStrokeColorOpen(state.isGeometryStrokeColorOpen || false);
        setIsGeometryFillColorOpen(state.isGeometryFillColorOpen || false);
        setActionMode(state.actionMode);
        setImageLayers(state.imageLayers || []);
        setSelectedLayers(state.selectedLayers || ['base']);
        setTextLayers(state.textLayers?.map(layer => ({
            ...layer,
            zoom: layer.zoom || 1,
            flipX: layer.flipX || 1,
            flipY: layer.flipY || 1,
            hue: layer.hue || 0,
            saturation: layer.saturation || 100,
            brightness: layer.brightness || 100,
            contrast: layer.contrast || 100,
            blur: layer.blur || 0,
            spread: layer.spread || 0,
            grayscale: layer.grayscale || 0,
            sepia: layer.sepia || 0
        })) || []);
        setEditingTextId(state.editingTextId || null);
        setTextSettings(state.textSettings || {
            fontSize: 24,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'left',
            color: '#000000',
            backgroundColor: 'transparent',
            padding: 8,
            borderColor: '#000000',
            borderStyle: 'solid',
            borderWidth: 0,
            borderRadius: 0,
            shadowColor: '#000000',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0
        });
        setGeometryLayers(state.geometryLayers?.map(layer => ({
            ...layer,
            zoom: layer.zoom || 1,
            flipX: layer.flipX || 1,
            flipY: layer.flipY || 1,
            hue: layer.hue || 0,
            saturation: layer.saturation || 100,
            brightness: layer.brightness || 100,
            contrast: layer.contrast || 100,
            blur: layer.blur || 0,
            spread: layer.spread || 0,
            grayscale: layer.grayscale || 0,
            sepia: layer.sepia || 0
        })) || []);
        setEditingGeometryId(state.editingGeometryId || null);
        setSelectedGeometryShape(state.selectedGeometryShape || 'rectangle');
        setGeometrySettings(state.geometrySettings || {
            strokeColor: '#5C2BE2',
            fillColor: 'transparent',
            strokeWidth: 3,
            strokeStyle: 'solid',
            borderRadius: 0,
            arrowHead: true,
            dashArray: ''
        });
        setCreatingPolygonPoints(state.creatingPolygonPoints || []);
        setIsCreatingPolygon(state.isCreatingPolygon || false);
        setCurrentHistoryIndex(index);

        setTimeout(() => {
            preventHistoryUpdate.current = false;
        }, 100);
    };

    const importImageLayer = async () => {
        fileInputRef.current?.click();
    };

    const handleImageImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const imageUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            const newLayer = {
                id: Date.now(),
                name: `Layer ${imageLayers.length + 1}`,
                url: imageUrl,
                x: nativeWidth / 2,
                y: nativeHeight / 2,
                width: Math.min(img.naturalWidth, nativeWidth / 2),
                height: Math.min(img.naturalHeight, nativeHeight / 2),
                rotation: 0,
                zoom: 1,
                flipX: 1,
                flipY: 1,
                opacity: 100,
                hue: 0,
                saturation: 100,
                brightness: 100,
                contrast: 100,
                blur: 0,
                spread: 0,
                grayscale: 0,
                sepia: 0,
                visible: true,
                locked: false
            };

            setImageLayers(prev => [...prev, newLayer]);
            setSelectedLayers([newLayer.id]);
            addToHistory("Image layer imported.");
        };

        img.src = imageUrl;
        e.target.value = '';
    };

    const deleteLayer = (layerId, layerType) => {
        if (layerType === 'image') {
            setImageLayers(prev => prev.filter(layer => layer.id !== layerId));
            setSelectedLayers(prev => prev.filter(id => id !== layerId));
            if (selectedLayers.includes(layerId) && selectedLayers.length === 1) {
                setSelectedLayers(['base']);
            }
        } else if (layerType === 'text') {
            setTextLayers(prev => prev.filter(layer => layer.id !== layerId));
            setSelectedLayers(prev => prev.filter(id => id !== layerId));
            if (selectedLayers.includes(layerId) && selectedLayers.length === 1) {
                setSelectedLayers(['base']);
            }
            if (editingTextId === layerId) {
                setEditingTextId(null);
            }
        } else if (layerType === 'geometry') {
            setGeometryLayers(prev => prev.filter(layer => layer.id !== layerId));
            setSelectedLayers(prev => prev.filter(id => id !== layerId));
            if (selectedLayers.includes(layerId) && selectedLayers.length === 1) {
                setSelectedLayers(['base']);
            }
            if (editingGeometryId === layerId) {
                setEditingGeometryId(null);
            }
        } else if (layerType === 'drawing') {
            setDrawingLayers(prev => prev.filter(layer => layer.id !== layerId));
            setSelectedLayers(prev => prev.filter(id => id !== layerId));
            if (selectedLayers.includes(layerId) && selectedLayers.length === 1) {
                setSelectedLayers(['base']);
            }
        }
        addToHistory("Layer deleted.");
    };

    const addTextLayer = (x, y) => {
        const newTextLayer = {
            id: Date.now(),
            name: `Text ${textLayers.length + 1}`,
            text: 'Sample Text',
            x: x,
            y: y,
            width: 200,
            height: 50,
            fontSize: textSettings.fontSize,
            fontFamily: textSettings.fontFamily,
            fontWeight: textSettings.fontWeight,
            fontStyle: textSettings.fontStyle,
            textDecoration: textSettings.textDecoration,
            textAlign: textSettings.textAlign,
            color: textSettings.color,
            backgroundColor: textSettings.backgroundColor,
            padding: textSettings.padding,
            borderColor: textSettings.borderColor,
            borderStyle: textSettings.borderStyle,
            borderWidth: textSettings.borderWidth,
            borderRadius: textSettings.borderRadius,
            shadowColor: textSettings.shadowColor,
            shadowBlur: textSettings.shadowBlur,
            shadowOffsetX: textSettings.shadowOffsetX,
            shadowOffsetY: textSettings.shadowOffsetY,
            rotation: 0,
            zoom: 1,
            flipX: 1,
            flipY: 1,
            opacity: 100,
            hue: 0,
            saturation: 100,
            brightness: 100,
            contrast: 100,
            blur: 0,
            spread: 0,
            grayscale: 0,
            sepia: 0,
            visible: true,
            locked: false
        };

        setTextLayers(prev => [...prev, newTextLayer]);
        setSelectedLayers([newTextLayer.id]);
        setEditingTextId(newTextLayer.id);
        addToHistory("Text layer added.");
    };

    const updateTextLayer = (layerId, updates) => {
        setTextLayers(prev => prev.map(layer => {
            if (layer.id === layerId) {
                const updatedLayer = { ...layer, ...updates };
                return updatedLayer;
            }
            return layer;
        }));
    };

    const addGeometryLayer = (x1, y1, x2, y2, points) => {
        let newGeometryLayer;

        if (selectedGeometryShape === 'polygon' || selectedGeometryShape === 'polyline') {
            if (!points || points.length < 2) return;

            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            const width = Math.max(maxX - minX, 10);
            const height = Math.max(maxY - minY, 10);

            newGeometryLayer = {
                id: Date.now(),
                name: `${selectedGeometryShape.charAt(0).toUpperCase() + selectedGeometryShape.slice(1)} ${geometryLayers.length + 1}`,
                shape: selectedGeometryShape,
                x: minX,
                y: minY,
                width: width,
                height: height,
                points: points,
                strokeColor: geometrySettings.strokeColor,
                fillColor: geometrySettings.fillColor,
                strokeWidth: geometrySettings.strokeWidth,
                strokeStyle: geometrySettings.strokeStyle,
                borderRadius: geometrySettings.borderRadius,
                arrowHead: geometrySettings.arrowHead,
                dashArray: geometrySettings.dashArray,
                rotation: 0,
                zoom: 1,
                flipX: 1,
                flipY: 1,
                opacity: 100,
                hue: 0,
                saturation: 100,
                brightness: 100,
                contrast: 100,
                blur: 0,
                spread: 0,
                grayscale: 0,
                sepia: 0,
                visible: true,
                locked: false
            };
        } else {
            const minX = Math.min(x1, x2);
            const minY = Math.min(y1, y2);
            const width = Math.abs(x2 - x1);
            const height = Math.abs(y2 - y1);

            newGeometryLayer = {
                id: Date.now(),
                name: `${selectedGeometryShape.charAt(0).toUpperCase() + selectedGeometryShape.slice(1)} ${geometryLayers.length + 1}`,
                shape: selectedGeometryShape,
                x: minX,
                y: minY,
                width: Math.max(width, 10),
                height: Math.max(height, 10),
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2,
                strokeColor: geometrySettings.strokeColor,
                fillColor: geometrySettings.fillColor,
                strokeWidth: geometrySettings.strokeWidth,
                strokeStyle: geometrySettings.strokeStyle,
                borderRadius: geometrySettings.borderRadius,
                arrowHead: geometrySettings.arrowHead,
                dashArray: geometrySettings.dashArray,
                rotation: 0,
                zoom: 1,
                flipX: 1,
                flipY: 1,
                opacity: 100,
                hue: 0,
                saturation: 100,
                brightness: 100,
                contrast: 100,
                blur: 0,
                spread: 0,
                grayscale: 0,
                sepia: 0,
                visible: true,
                locked: false
            };
        }

        setGeometryLayers(prev => [...prev, newGeometryLayer]);
        setSelectedLayers([newGeometryLayer.id]);
        addToHistory("Geometry layer added.");
    };

    const updateGeometryLayer = (layerId, updates) => {
        setGeometryLayers(prev => prev.map(layer => {
            if (layer.id === layerId) {
                const updatedLayer = { ...layer, ...updates };
                return updatedLayer;
            }
            return layer;
        }));
    };

    const handleTextLayerClick = (layerId, e) => {
        if (actionMode === "Text") {
            e.stopPropagation();
            setEditingTextId(layerId);
            setSelectedLayers([layerId]);
            addToHistory("Text editing started.");
        } else if (actionMode === "Idle") {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                setSelectedLayers(prev =>
                    prev.includes(layerId)
                        ? prev.filter(id => id !== layerId)
                        : [...prev, layerId]
                );
            } else {
                setSelectedLayers([layerId]);
            }
            addToHistory("Layer selected.");
        }
    };

    const handleGeometryLayerClick = (layerId, e) => {
        if (actionMode === "Geometry") {
            e.stopPropagation();
            setEditingGeometryId(layerId);
            setSelectedLayers([layerId]);
            addToHistory("Geometry editing started.");
        } else if (actionMode === "Idle") {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                setSelectedLayers(prev =>
                    prev.includes(layerId)
                        ? prev.filter(id => id !== layerId)
                        : [...prev, layerId]
                );
            } else {
                setSelectedLayers([layerId]);
            }
            addToHistory("Layer selected.");
        }
    };

    const handleTextLayerMouseDown = (layerId, e) => {
        if (actionMode !== "Idle") return;
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            setSelectedLayers(prev =>
                prev.includes(layerId)
                    ? prev.filter(id => id !== layerId)
                    : [...prev, layerId]
            );
        } else if (!selectedLayers.includes(layerId)) {
            setSelectedLayers([layerId]);
        }

        textLayerDraggingRef.current = true;
        lastTextLayerPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleDrawingLayerMouseDown = (layerId, e) => {
        if (actionMode !== "Idle") return;
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            setSelectedLayers(prev =>
                prev.includes(layerId)
                    ? prev.filter(id => id !== layerId)
                    : [...prev, layerId]
            );
        } else if (!selectedLayers.includes(layerId)) {
            setSelectedLayers([layerId]);
        }

        drawingLayerDraggingRef.current = true;
        lastDrawingLayerPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleGeometryLayerMouseDown = (layerId, e) => {
        if (actionMode !== "Idle") return;
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            setSelectedLayers(prev =>
                prev.includes(layerId)
                    ? prev.filter(id => id !== layerId)
                    : [...prev, layerId]
            );
        } else if (!selectedLayers.includes(layerId)) {
            setSelectedLayers([layerId]);
        }

        geometryLayerDraggingRef.current = true;
        lastGeometryLayerPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleTextLayerResizeMouseDown = (layerId, corner, e) => {
        if (actionMode !== "Idle") return;
        e.stopPropagation();
        e.preventDefault();

        if (!selectedLayers.includes(layerId)) {
            setSelectedLayers([layerId]);
        }

        setResizingTextLayer({ layerId, corner });
        textLayerResizingRef.current = true;
        lastTextLayerPosRef.current = { x: e.clientX, y: e.clientY };

        const layer = textLayers.find(l => l.id === layerId);
        if (layer) {
            initialTextLayerSizeRef.current = { width: layer.width, height: layer.height };
            initialTextLayerPosRef.current = { x: layer.x, y: layer.y };
        }
    };

    const handleDrawingLayerResizeMouseDown = (layerId, corner, e) => {
        if (actionMode !== "Idle") return;
        e.stopPropagation();
        e.preventDefault();

        if (!selectedLayers.includes(layerId)) {
            setSelectedLayers([layerId]);
        }

        const layer = drawingLayers.find(l => l.id === layerId);
        if (layer) {
            setResizingDrawingLayer({ layerId, corner });
            drawingLayerResizingRef.current = true;
            lastDrawingLayerPosRef.current = { x: e.clientX, y: e.clientY };
            initialDrawingLayerZoomRef.current = layer.zoom || 1;
        }
    };

    const handleGeometryLayerResizeMouseDown = (layerId, corner, e) => {
        if (actionMode !== "Idle") return;
        e.stopPropagation();
        e.preventDefault();

        if (!selectedLayers.includes(layerId)) {
            setSelectedLayers([layerId]);
        }

        setResizingGeometryLayer({ layerId, corner });
        geometryLayerResizingRef.current = true;
        lastGeometryLayerPosRef.current = { x: e.clientX, y: e.clientY };

        const layer = geometryLayers.find(l => l.id === layerId);
        if (layer) {
            initialGeometryLayerSizeRef.current = { width: layer.width, height: layer.height };
            initialGeometryLayerPosRef.current = { x: layer.x, y: layer.y };
        }
    };

    const handleTextLayerGlobalMouseMove = (e) => {
        if (textLayerDraggingRef.current && selectedLayers.some(id => textLayers.find(l => l.id === id))) {
            const dx = e.clientX - lastTextLayerPosRef.current.x;
            const dy = e.clientY - lastTextLayerPosRef.current.y;

            setTextLayers(prev => prev.map(layer =>
                selectedLayers.includes(layer.id)
                    ? { ...layer, x: layer.x + dx, y: layer.y + dy }
                    : layer
            ));

            lastTextLayerPosRef.current = { x: e.clientX, y: e.clientY };
        }

        if (textLayerResizingRef.current && resizingTextLayer) {
            const dx = e.clientX - lastTextLayerPosRef.current.x;
            const dy = e.clientY - lastTextLayerPosRef.current.y;

            setTextLayers(prev => prev.map(layer => {
                if (layer.id === resizingTextLayer.layerId) {
                    let newWidth = initialTextLayerSizeRef.current.width;
                    let newHeight = initialTextLayerSizeRef.current.height;
                    let newX = initialTextLayerPosRef.current.x;
                    let newY = initialTextLayerPosRef.current.y;

                    if (resizingTextLayer.corner === "bottom-right") {
                        newWidth += dx;
                        newHeight += dy;
                    } else if (resizingTextLayer.corner === "bottom-left") {
                        newWidth -= dx;
                        newHeight += dy;
                        newX += dx / 2;
                    } else if (resizingTextLayer.corner === "top-right") {
                        newWidth += dx;
                        newHeight -= dy;
                        newY += dy / 2;
                    } else if (resizingTextLayer.corner === "top-left") {
                        newWidth -= dx;
                        newHeight -= dy;
                        newX += dx / 2;
                        newY += dy / 2;
                    }

                    return {
                        ...layer,
                        width: Math.max(newWidth, 50),
                        height: Math.max(newHeight, 20),
                        x: newX,
                        y: newY
                    };
                }
                return layer;
            }));
        }
    };

    const handleDrawingLayerGlobalMouseMove = (e) => {
        if (drawingLayerDraggingRef.current && selectedLayers.some(id => drawingLayers.find(l => l.id === id))) {
            const dx = e.clientX - lastDrawingLayerPosRef.current.x;
            const dy = e.clientY - lastDrawingLayerPosRef.current.y;
            const nativeDx = (dx / imageWidth) * nativeWidth;
            const nativeDy = (dy / imageHeight) * nativeHeight;

            setDrawingLayers(prev => prev.map(layer =>
                selectedLayers.includes(layer.id)
                    ? { ...layer, x: (layer.x || 0) + nativeDx, y: (layer.y || 0) + nativeDy }
                    : layer
            ));

            lastDrawingLayerPosRef.current = { x: e.clientX, y: e.clientY };
        }

        if (drawingLayerResizingRef.current && resizingDrawingLayer) {
            const dx = e.clientX - lastDrawingLayerPosRef.current.x;
            const dy = e.clientY - lastDrawingLayerPosRef.current.y;

            let zoomDelta = 0;
            
            if (resizingDrawingLayer.corner === "bottom-right") {
                zoomDelta = (dx + dy) * 0.002;
            } else if (resizingDrawingLayer.corner === "bottom-left") {
                zoomDelta = (-dx + dy) * 0.002;
            } else if (resizingDrawingLayer.corner === "top-right") {
                zoomDelta = (dx - dy) * 0.002;
            } else if (resizingDrawingLayer.corner === "top-left") {
                zoomDelta = (-dx - dy) * 0.002;
            }

            const newZoom = Math.max(initialDrawingLayerZoomRef.current + zoomDelta, 0.1);

            setDrawingLayers(prev => prev.map(layer => {
                if (layer.id === resizingDrawingLayer.layerId) {
                    return { ...layer, zoom: newZoom };
                }
                return layer;
            }));
        }
    };

    const handleGeometryLayerGlobalMouseMove = (e) => {
        if (geometryLayerDraggingRef.current && selectedLayers.some(id => geometryLayers.find(l => l.id === id))) {
            const dx = e.clientX - lastGeometryLayerPosRef.current.x;
            const dy = e.clientY - lastGeometryLayerPosRef.current.y;
            const nativeDx = (dx / imageWidth) * nativeWidth;
            const nativeDy = (dy / imageHeight) * nativeHeight;

            setGeometryLayers(prev => prev.map(layer => {
                if (selectedLayers.includes(layer.id)) {
                    if (layer.shape === 'line' || layer.shape === 'arrow') {
                        const newX1 = layer.x1 + nativeDx;
                        const newY1 = layer.y1 + nativeDy;
                        const newX2 = layer.x2 + nativeDx;
                        const newY2 = layer.y2 + nativeDy;
                        return {
                            ...layer,
                            x1: newX1,
                            y1: newY1,
                            x2: newX2,
                            y2: newY2,
                            x: Math.min(newX1, newX2),
                            y: Math.min(newY1, newY2),
                            width: Math.max(Math.abs(newX2 - newX1), layer.strokeWidth),
                            height: Math.max(Math.abs(newY2 - newY1), layer.strokeWidth)
                        };
                    } else if (layer.shape === 'polygon' || layer.shape === 'polyline') {
                        const newPoints = layer.points.map(point => ({
                            x: point.x + nativeDx,
                            y: point.y + nativeDy
                        }));
                        const xs = newPoints.map(p => p.x);
                        const ys = newPoints.map(p => p.y);
                        const minX = Math.min(...xs);
                        const minY = Math.min(...ys);
                        const maxX = Math.max(...xs);
                        const maxY = Math.max(...ys);
                        return {
                            ...layer,
                            points: newPoints,
                            x: minX,
                            y: minY,
                            width: Math.max(maxX - minX, 10),
                            height: Math.max(maxY - minY, 10)
                        };
                    } else {
                        return { ...layer, x: layer.x + nativeDx, y: layer.y + nativeDy };
                    }
                }
                return layer;
            }));

            lastGeometryLayerPosRef.current = { x: e.clientX, y: e.clientY };
        }

        if (geometryLayerResizingRef.current && resizingGeometryLayer) {
            const dx = e.clientX - lastGeometryLayerPosRef.current.x;
            const dy = e.clientY - lastGeometryLayerPosRef.current.y;

            const nativeDx = (dx / imageWidth) * nativeWidth;
            const nativeDy = (dy / imageHeight) * nativeHeight;

            setGeometryLayers(prev => prev.map(layer => {
                if (layer.id === resizingGeometryLayer.layerId) {
                    if (layer.shape === 'line' || layer.shape === 'arrow') {
                        let newX1 = layer.x1;
                        let newY1 = layer.y1;
                        let newX2 = layer.x2;
                        let newY2 = layer.y2;

                        if (resizingGeometryLayer.corner === "bottom-right") {
                            newX2 = layer.x2 + nativeDx;
                            newY2 = layer.y2 + nativeDy;
                        } else if (resizingGeometryLayer.corner === "bottom-left") {
                            newX1 = layer.x1 + nativeDx;
                            newY2 = layer.y2 + nativeDy;
                        } else if (resizingGeometryLayer.corner === "top-right") {
                            newX2 = layer.x2 + nativeDx;
                            newY1 = layer.y1 + nativeDy;
                        } else if (resizingGeometryLayer.corner === "top-left") {
                            newX1 = layer.x1 + nativeDx;
                            newY1 = layer.y1 + nativeDy;
                        }

                        const newMinX = Math.min(newX1, newX2);
                        const newMinY = Math.min(newY1, newY2);
                        const newWidth = Math.max(Math.abs(newX2 - newX1), layer.strokeWidth);
                        const newHeight = Math.max(Math.abs(newY2 - newY1), layer.strokeWidth);

                        return {
                            ...layer,
                            x1: newX1,
                            y1: newY1,
                            x2: newX2,
                            y2: newY2,
                            x: newMinX,
                            y: newMinY,
                            width: newWidth,
                            height: newHeight
                        };
                    } else if (layer.shape === 'polygon' || layer.shape === 'polyline') {
                        const scaleX = (initialGeometryLayerSizeRef.current.width + nativeDx) / initialGeometryLayerSizeRef.current.width;
                        const scaleY = (initialGeometryLayerSizeRef.current.height + nativeDy) / initialGeometryLayerSizeRef.current.height;

                        const centerX = initialGeometryLayerPosRef.current.x + initialGeometryLayerSizeRef.current.width / 2;
                        const centerY = initialGeometryLayerPosRef.current.y + initialGeometryLayerSizeRef.current.height / 2;

                        const newPoints = layer.points.map(point => ({
                            x: centerX + (point.x - centerX) * scaleX,
                            y: centerY + (point.y - centerY) * scaleY
                        }));

                        const xs = newPoints.map(p => p.x);
                        const ys = newPoints.map(p => p.y);
                        const minX = Math.min(...xs);
                        const minY = Math.min(...ys);
                        const maxX = Math.max(...xs);
                        const maxY = Math.max(...ys);

                        return {
                            ...layer,
                            points: newPoints,
                            x: minX,
                            y: minY,
                            width: Math.max(maxX - minX, 10),
                            height: Math.max(maxY - minY, 10)
                        };
                    } else {
                        let newWidth = initialGeometryLayerSizeRef.current.width;
                        let newHeight = initialGeometryLayerSizeRef.current.height;
                        let newX = initialGeometryLayerPosRef.current.x;
                        let newY = initialGeometryLayerPosRef.current.y;

                        if (resizingGeometryLayer.corner === "bottom-right") {
                            newWidth += nativeDx;
                            newHeight += nativeDy;
                        } else if (resizingGeometryLayer.corner === "bottom-left") {
                            newWidth -= nativeDx;
                            newHeight += nativeDy;
                            newX += nativeDx / 2;
                        } else if (resizingGeometryLayer.corner === "top-right") {
                            newWidth += nativeDx;
                            newHeight -= nativeDy;
                            newY += nativeDy / 2;
                        } else if (resizingGeometryLayer.corner === "top-left") {
                            newWidth -= nativeDx;
                            newHeight -= nativeDy;
                            newX += nativeDx / 2;
                            newY += nativeDy / 2;
                        }

                        const finalWidth = Math.max(newWidth, 10);
                        const finalHeight = Math.max(newHeight, 10);

                        return {
                            ...layer,
                            width: finalWidth,
                            height: finalHeight,
                            x: newX,
                            y: newY,
                            x2: newX + finalWidth,
                            y2: newY + finalHeight
                        };
                    }
                }
                return layer;
            }));
        }
    };

    const handleTextLayerGlobalMouseUp = () => {
        if (textLayerDraggingRef.current || textLayerResizingRef.current) {
            addToHistory("Text layer transformed.");
        }
        textLayerDraggingRef.current = false;
        textLayerResizingRef.current = false;
        setResizingTextLayer(null);
    };

    const handleDrawingLayerGlobalMouseUp = () => {
        if (drawingLayerDraggingRef.current || drawingLayerResizingRef.current) {
            addToHistory("Drawing layer transformed.");
        }
        drawingLayerDraggingRef.current = false;
        drawingLayerResizingRef.current = false;
        setResizingDrawingLayer(null);
    };

    const handleGeometryLayerGlobalMouseUp = () => {
        if (geometryLayerDraggingRef.current || geometryLayerResizingRef.current) {
            addToHistory("Geometry layer transformed.");
        }
        geometryLayerDraggingRef.current = false;
        geometryLayerResizingRef.current = false;
        setResizingGeometryLayer(null);
    };

    const moveDrawingLayer = (id, delta) => {
        setDrawingLayers(prev => {
            const index = prev.findIndex(layer => layer.id === id);
            if (index === -1) return prev;
            const layer = prev[index];
            if (layer.locked) return prev;
            const newIndex = index + delta;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const newPrev = [...prev];
            const temp = newPrev[newIndex];
            newPrev[newIndex] = newPrev[index];
            newPrev[index] = temp;
            return newPrev;
        });
        addToHistory("Drawing layer order changed.");
    };

    const moveTextLayer = (id, delta) => {
        setTextLayers(prev => {
            const index = prev.findIndex(layer => layer.id === id);
            if (index === -1) return prev;
            const layer = prev[index];
            if (layer.locked) return prev;
            const newIndex = index + delta;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const newPrev = [...prev];
            const temp = newPrev[newIndex];
            newPrev[newIndex] = newPrev[index];
            newPrev[index] = temp;
            return newPrev;
        });
        addToHistory("Text layer order changed.");
    };

    const moveGeometryLayer = (id, delta) => {
        setGeometryLayers(prev => {
            const index = prev.findIndex(layer => layer.id === id);
            if (index === -1) return prev;
            const layer = prev[index];
            if (layer.locked) return prev;
            const newIndex = index + delta;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const newPrev = [...prev];
            const temp = newPrev[newIndex];
            newPrev[newIndex] = newPrev[index];
            newPrev[index] = temp;
            return newPrev;
        });
        addToHistory("Geometry layer order changed.");
    };

    const handleBaseImageClick = (e) => {
        if (actionMode === "Idle") {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                setSelectedLayers(prev =>
                    prev.includes('base')
                        ? prev.filter(id => id !== 'base')
                        : [...prev, 'base']
                );
            } else {
                setSelectedLayers(['base']);
            }
            addToHistory("Layer selected.");
        }
    };

    const handleImageLayerClick = (layerId, e) => {
        if (actionMode === "Idle") {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                setSelectedLayers(prev =>
                    prev.includes(layerId)
                        ? prev.filter(id => id !== layerId)
                        : [...prev, layerId]
                );
            } else {
                setSelectedLayers([layerId]);
            }
            addToHistory("Layer selected.");
        }
    };

    const handleLayerSelect = (layerId, layerType, e) => {
        if (e && (e.ctrlKey || e.metaKey)) {
            if (layerType === 'base') {
                setSelectedLayers(prev =>
                    prev.includes('base')
                        ? prev.filter(id => id !== 'base')
                        : [...prev, 'base']
                );
            } else if (layerType === 'image' || layerType === 'text' || layerType === 'geometry' || layerType === 'drawing') {
                setSelectedLayers(prev =>
                    prev.includes(layerId)
                        ? prev.filter(id => id !== layerId)
                        : [...prev, layerId]
                );
            }
        } else {
            if (layerType === 'base') {
                setSelectedLayers(['base']);
            } else if (layerType === 'image' || layerType === 'text' || layerType === 'geometry' || layerType === 'drawing') {
                setSelectedLayers([layerId]);
            }
        }
        addToHistory("Layer selected.");
    };

    const applyToSelectedLayers = (transformation) => {
        selectedLayers.forEach(layerId => {
            if (layerId === 'base') {
                transformation('base');
            } else {
                const isImageLayer = imageLayers.find(l => l.id === layerId);
                const isTextLayer = textLayers.find(l => l.id === layerId);
                const isGeometryLayer = geometryLayers.find(l => l.id === layerId);
                const isDrawingLayer = drawingLayers.find(l => l.id === layerId);

                if (isImageLayer) {
                    transformation(layerId, 'image');
                } else if (isTextLayer) {
                    transformation(layerId, 'text');
                } else if (isGeometryLayer) {
                    transformation(layerId, 'geometry');
                } else if (isDrawingLayer) {
                    transformation(layerId, 'drawing');
                }
            }
        });
        addToHistory("Transform applied.");
    };

    const updateZoom = (delta) => {
        applyToSelectedLayers((layerId, layerType) => {
            if (layerId === 'base') {
                setBaseZoom(prev => Math.max(prev + delta, 0.1));
            } else if (layerType === 'image') {
                setImageLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, zoom: Math.max((layer.zoom || 1) + delta, 0.1) }
                        : layer
                ));
            } else if (layerType === 'text') {
                setTextLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, zoom: Math.max((layer.zoom || 1) + delta, 0.1) }
                        : layer
                ));
            } else if (layerType === 'geometry') {
                setGeometryLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, zoom: Math.max((layer.zoom || 1) + delta, 0.1) }
                        : layer
                ));
            } else if (layerType === 'drawing') {
                setDrawingLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, zoom: Math.max((layer.zoom || 1) + delta, 0.1) }
                        : layer
                ));
            }
        });
    };

    const updateRotation = (delta) => {
        applyToSelectedLayers((layerId, layerType) => {
            if (layerId === 'base') {
                setBaseRotation(prev => prev + delta);
                setIsCropping(false);
            } else if (layerType === 'image') {
                setImageLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, rotation: (layer.rotation || 0) + delta }
                        : layer
                ));
            } else if (layerType === 'text') {
                setTextLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, rotation: (layer.rotation || 0) + delta }
                        : layer
                ));
            } else if (layerType === 'geometry') {
                setGeometryLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, rotation: (layer.rotation || 0) + delta }
                        : layer
                ));
            } else if (layerType === 'drawing') {
                setDrawingLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, rotation: (layer.rotation || 0) + delta }
                        : layer
                ));
            }
        });
    };

    const updateFlip = (axis) => {
        applyToSelectedLayers((layerId, layerType) => {
            if (layerId === 'base') {
                if (axis === 'x') {
                    setBaseFlipX(prev => -prev);
                } else {
                    setBaseFlipY(prev => -prev);
                }
                setIsCropping(false);
            } else if (layerType === 'image') {
                setImageLayers(prev => prev.map(layer => {
                    if (layer.id === layerId) {
                        if (axis === 'x') {
                            return {
                                ...layer,
                                flipX: (layer.flipX || 1) * -1,
                                x: nativeWidth - layer.x
                            };
                        } else {
                            return {
                                ...layer,
                                flipY: (layer.flipY || 1) * -1,
                                y: nativeHeight - layer.y
                            };
                        }
                    }
                    return layer;
                }));
            } else if (layerType === 'text') {
                setTextLayers(prev => prev.map(layer => {
                    if (layer.id === layerId) {
                        if (axis === 'x') {
                            return {
                                ...layer,
                                flipX: (layer.flipX || 1) * -1,
                                x: nativeWidth - layer.x
                            };
                        } else {
                            return {
                                ...layer,
                                flipY: (layer.flipY || 1) * -1,
                                y: nativeHeight - layer.y
                            };
                        }
                    }
                    return layer;
                }));
            } else if (layerType === 'geometry') {
                setGeometryLayers(prev => prev.map(layer => {
                    if (layer.id === layerId) {
                        if (axis === 'x') {
                            return {
                                ...layer,
                                flipX: (layer.flipX || 1) * -1,
                                x: nativeWidth - layer.x,
                                x1: nativeWidth - layer.x1,
                                x2: nativeWidth - layer.x2
                            };
                        } else {
                            return {
                                ...layer,
                                flipY: (layer.flipY || 1) * -1,
                                y: nativeHeight - layer.y,
                                y1: nativeHeight - layer.y1,
                                y2: nativeHeight - layer.y2
                            };
                        }
                    }
                    return layer;
                }));
            } else if (layerType === 'drawing') {
                setDrawingLayers(prev => prev.map(layer => {
                    if (layer.id === layerId) {
                        if (axis === 'x') {
                            return {
                                ...layer,
                                flipX: (layer.flipX || 1) * -1
                            };
                        } else {
                            return {
                                ...layer,
                                flipY: (layer.flipY || 1) * -1
                            };
                        }
                    }
                    return layer;
                }));
            }
        });
    };

    const updateFilter = (property, value) => {
        if (selectedLayers.some(id => textLayers.find(l => l.id === id))) {
            setTextLayers(prev => {
                const updated = prev.map(layer => {
                    if (selectedLayers.includes(layer.id)) {
                        return { ...layer, [property]: value };
                    }
                    return layer;
                });
                return updated;
            });
        }

        if (selectedLayers.some(id => geometryLayers.find(l => l.id === id))) {
            setGeometryLayers(prev => {
                const updated = prev.map(layer => {
                    if (selectedLayers.includes(layer.id)) {
                        return { ...layer, [property]: value };
                    }
                    return layer;
                });
                return updated;
            });
        }

        if (selectedLayers.some(id => drawingLayers.find(l => l.id === id))) {
            setDrawingLayers(prev => {
                const updated = prev.map(layer => {
                    if (selectedLayers.includes(layer.id)) {
                        return { ...layer, [property]: value };
                    }
                    return layer;
                });
                return updated;
            });
        }

        if (selectedLayers.includes('base')) {
            switch (property) {
                case 'hue': setBaseHue(value); break;
                case 'saturation': setBaseSaturation(value); break;
                case 'brightness': setBaseBrightness(value); break;
                case 'contrast': setBaseContrast(value); break;
                case 'opacity': setBaseOpacity(value); break;
                case 'blur': setBaseBlur(value); break;
                case 'spread': setBaseSpread(value); break;
                case 'grayscale': setBaseGrayscale(value); break;
                case 'sepia': setBaseSepia(value); break;
            }
        }

        if (selectedLayers.some(id => imageLayers.find(l => l.id === id))) {
            setImageLayers(prev => prev.map(layer =>
                selectedLayers.includes(layer.id) ? { ...layer, [property]: value } : layer
            ));
        }

        addToHistory("Filter applied.");
    };

    const handleImageLayerMouseDown = (layerId, e) => {
        if (actionMode !== "Idle") return;
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            setSelectedLayers(prev =>
                prev.includes(layerId)
                    ? prev.filter(id => id !== layerId)
                    : [...prev, layerId]
            );
        } else if (!selectedLayers.includes(layerId)) {
            setSelectedLayers([layerId]);
        }

        imageLayerDraggingRef.current = true;
        lastImageLayerPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleImageLayerResizeMouseDown = (layerId, corner, e) => {
        if (actionMode !== "Idle") return;
        e.stopPropagation();
        e.preventDefault();

        if (!selectedLayers.includes(layerId)) {
            setSelectedLayers([layerId]);
        }

        setResizingImageLayer({ layerId, corner });
        imageLayerResizingRef.current = true;
        lastImageLayerPosRef.current = { x: e.clientX, y: e.clientY };

        const layer = imageLayers.find(l => l.id === layerId);
        if (layer) {
            initialImageLayerSizeRef.current = { width: layer.width, height: layer.height };
            initialImageLayerPosRef.current = { x: layer.x, y: layer.y };
        }
    };

    const handleImageLayerGlobalMouseMove = (e) => {
        if (imageLayerDraggingRef.current && selectedLayers.some(id => id !== 'base')) {
            const dx = e.clientX - lastImageLayerPosRef.current.x;
            const dy = e.clientY - lastImageLayerPosRef.current.y;

            setImageLayers(prev => prev.map(layer =>
                selectedLayers.includes(layer.id)
                    ? { ...layer, x: layer.x + dx, y: layer.y + dy }
                    : layer
            ));

            lastImageLayerPosRef.current = { x: e.clientX, y: e.clientY };
        }

        if (imageLayerResizingRef.current && resizingImageLayer) {
            const dx = e.clientX - lastImageLayerPosRef.current.x;
            const dy = e.clientY - lastImageLayerPosRef.current.y;

            setImageLayers(prev => prev.map(layer => {
                if (layer.id === resizingImageLayer.layerId) {
                    let newWidth = initialImageLayerSizeRef.current.width;
                    let newHeight = initialImageLayerSizeRef.current.height;
                    let newX = initialImageLayerPosRef.current.x;
                    let newY = initialImageLayerPosRef.current.y;

                    if (resizingImageLayer.corner === "bottom-right") {
                        newWidth += dx;
                        newHeight += dy;
                    } else if (resizingImageLayer.corner === "bottom-left") {
                        newWidth -= dx;
                        newHeight += dy;
                        newX += dx / 2;
                    } else if (resizingImageLayer.corner === "top-right") {
                        newWidth += dx;
                        newHeight -= dy;
                        newY += dy / 2;
                    } else if (resizingImageLayer.corner === "top-left") {
                        newWidth -= dx;
                        newHeight -= dy;
                        newX += dx / 2;
                        newY += dy / 2;
                    }

                    return {
                        ...layer,
                        width: Math.max(newWidth, 10),
                        height: Math.max(newHeight, 10),
                        x: newX,
                        y: newY
                    };
                }
                return layer;
            }));
        }
    };

    const handleImageLayerGlobalMouseUp = () => {
        if (imageLayerDraggingRef.current || imageLayerResizingRef.current) {
            addToHistory("Layer transformed.");
        }
        imageLayerDraggingRef.current = false;
        imageLayerResizingRef.current = false;
        setResizingImageLayer(null);
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleImageLayerGlobalMouseMove);
        window.addEventListener("mouseup", handleImageLayerGlobalMouseUp);
        window.addEventListener("mousemove", handleTextLayerGlobalMouseMove);
        window.addEventListener("mouseup", handleTextLayerGlobalMouseUp);
        window.addEventListener("mousemove", handleGeometryLayerGlobalMouseMove);
        window.addEventListener("mouseup", handleGeometryLayerGlobalMouseUp);
        window.addEventListener("mousemove", handleDrawingLayerGlobalMouseMove);
        window.addEventListener("mouseup", handleDrawingLayerGlobalMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleImageLayerGlobalMouseMove);
            window.removeEventListener("mouseup", handleImageLayerGlobalMouseUp);
            window.removeEventListener("mousemove", handleTextLayerGlobalMouseMove);
            window.removeEventListener("mouseup", handleTextLayerGlobalMouseUp);
            window.removeEventListener("mousemove", handleGeometryLayerGlobalMouseMove);
            window.removeEventListener("mouseup", handleGeometryLayerGlobalMouseUp);
            window.removeEventListener("mousemove", handleDrawingLayerGlobalMouseMove);
            window.removeEventListener("mouseup", handleDrawingLayerGlobalMouseUp);
        };
    }, [selectedLayers, resizingImageLayer, resizingTextLayer, resizingGeometryLayer, resizingDrawingLayer]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [actionMode, selectedGeometryShape, isCreatingPolygon, creatingPolygonPoints]);

    const downloadImage = async () => {
        const layerOptions = [
            { label: "All", value: "all" },
            { label: "Base", value: "base" },
            ...imageLayers.map(layer => ({ label: layer.name, value: `image-${layer.id}` })),
            ...textLayers.map(layer => ({ label: layer.name, value: `text-${layer.id}` })),
            ...geometryLayers.map(layer => ({ label: layer.name, value: `geometry-${layer.id}` })),
            ...paths.map(p => ({ label: p.name, value: `path-${p.id}` }))
        ];
        const alertResultLayer = await showDialog({
            title: "Select Layer to Export",
            message: "Choose the layer or all.",
            inputs: [
                {
                    name: "layer",
                    type: "select",
                    label: "Layer",
                    defaultValue: "all",
                    options: layerOptions
                }
            ],
            showCancel: true
        });
        if (!alertResultLayer) return;
        const selectedExportLayer = alertResultLayer.layer;

        let fileTypeOptions = [
            { label: ".png", value: "png" },
            { label: ".jpg", value: "jpg" },
            { label: ".jpeg", value: "jpeg" },
            { label: ".webp", value: "webp" }
        ];
        const isPathLayer = selectedExportLayer.startsWith("path-");
        if ((selectedExportLayer === "all" || selectedExportLayer === "base") && mediaType === "svg" || isPathLayer) {
            fileTypeOptions.push({ label: ".svg", value: "svg" });
        }
        if (isPathLayer) {
            fileTypeOptions = fileTypeOptions.filter(opt => opt.value !== "jpg" && opt.value !== "jpeg");
        }

        const alertResult = await showDialog({
            title: "Select Image Type and Scale",
            message: "Select the image type and scale.",
            inputs: [
                {
                    name: "fileType",
                    type: "select",
                    label: "Image Type",
                    defaultValue: "png",
                    options: fileTypeOptions
                },
                {
                    name: "scale",
                    type: "select",
                    label: "Scale",
                    defaultValue: "1x",
                    options: [
                        { label: "1x", value: "1x" },
                        { label: "2x", value: "2x" },
                        { label: "3x", value: "3x" }
                    ]
                }
            ],
            showCancel: true
        });
        if (!alertResult) return;

        const fileType = alertResult.fileType || "png";
        const scale = alertResult.scale || "1x";
        const scaleFactor = scale === "2x" ? 2 : scale === "3x" ? 3 : 1;
        let mimeType = fileType === "webp" ? "image/webp" : (fileType === "jpg" || fileType === "jpeg") ? "image/jpeg" : "image/png";
        const link = document.createElement("a");
        const fileNameBase = fileHandle.name ? fileHandle.name.replace(/\.\w+$/, "") : "edited_image";

        const rad = baseRotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const halfW = nativeWidth / 2;
        const halfH = nativeHeight / 2;
        const corners = [
            { x: -halfW, y: -halfH },
            { x: halfW, y: -halfH },
            { x: halfW, y: halfH },
            { x: -halfW, y: halfH }
        ];
        const transformedCorners = corners.map(c => {
            let x = c.x * cos - c.y * sin;
            let y = c.x * sin + c.y * cos;
            x *= baseZoom * baseFlipX;
            y *= baseZoom * baseFlipY;
            return { x, y };
        });
        const xs = transformedCorners.map(c => c.x);
        const ys = transformedCorners.map(c => c.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        const boundWidth = maxX - minX;
        const boundHeight = maxY - minY;

        const canvas = document.createElement("canvas");
        canvas.width = boundWidth * scaleFactor;
        canvas.height = boundHeight * scaleFactor;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scaleFactor, scaleFactor);
        ctx.rotate(rad);
        ctx.scale(baseZoom * baseFlipX, baseZoom * baseFlipY);

        const roundedRect = new Path2D();
        const scaleRatio = nativeWidth / imageWidth;
        if (circleCrop) {
            const radius = Math.min(nativeWidth, nativeHeight) / 2;
            roundedRect.arc(0, 0, radius, 0, 2 * Math.PI);
        } else if (syncCorners) {
            let radius = borderRadius * scaleRatio;
            radius = Math.min(radius, nativeWidth / 2, nativeHeight / 2);
            drawRoundedRect(ctx, -nativeWidth / 2, -nativeHeight / 2, nativeWidth, nativeHeight, radius);
        } else {
            const tl = Math.min(borderTopLeftRadius * scaleRatio, nativeWidth / 2, nativeHeight / 2);
            const tr = Math.min(borderTopRightRadius * scaleRatio, nativeWidth / 2, nativeHeight / 2);
            const br = Math.min(borderBottomRightRadius * scaleRatio, nativeWidth / 2, nativeHeight / 2);
            const bl = Math.min(borderBottomLeftRadius * scaleRatio, nativeWidth / 2, nativeHeight / 2);
            roundedRect.moveTo(-nativeWidth / 2 + tl, -nativeHeight / 2);
            roundedRect.lineTo(nativeWidth / 2 - tr, -nativeHeight / 2);
            roundedRect.quadraticCurveTo(nativeWidth / 2, -nativeHeight / 2, nativeWidth / 2, -nativeHeight / 2 + tr);
            roundedRect.lineTo(nativeWidth / 2, nativeHeight / 2 - br);
            roundedRect.quadraticCurveTo(nativeWidth / 2, nativeHeight / 2, nativeWidth / 2 - br, nativeHeight / 2);
            roundedRect.lineTo(-nativeWidth / 2 + bl, nativeHeight / 2);
            roundedRect.quadraticCurveTo(-nativeWidth / 2, nativeHeight / 2, -nativeWidth / 2, nativeHeight / 2 - bl);
            roundedRect.lineTo(-nativeWidth / 2, -nativeHeight / 2 + tl);
            roundedRect.quadraticCurveTo(-nativeWidth / 2, -nativeHeight / 2, -nativeWidth / 2 + tl, -nativeHeight / 2);
        }
        ctx.clip(roundedRect);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            if (baseVisible) {
                ctx.save();
                let filterString = `hue-rotate(${baseHue}deg) saturate(${baseSaturation}%) brightness(${baseBrightness}%) contrast(${baseContrast}%) blur(${baseBlur}px) grayscale(${baseGrayscale}%) sepia(${baseSepia}%)`;
                if (baseSpread) filterString += ` drop-shadow(0 0 ${baseSpread}px rgba(0,0,0,0.5))`;
                ctx.filter = filterString;
                ctx.globalAlpha = baseOpacity / 100;
                ctx.drawImage(img, -nativeWidth / 2, -nativeHeight / 2, nativeWidth, nativeHeight);
                ctx.restore();
            }

            let loadedLayers = 0;
            const visibleImageLayers = imageLayers.filter(layer => layer.visible);

            if (visibleImageLayers.length === 0) {
                drawAllLayersAndFinish();
            } else {
                visibleImageLayers.forEach(layer => {
                    const layerImg = new Image();
                    layerImg.crossOrigin = "anonymous";
                    layerImg.onload = () => {
                        ctx.save();
                        ctx.filter = `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%)`;
                        ctx.globalAlpha = (layer.opacity || 100) / 100;
                        ctx.translate(layer.x - nativeWidth / 2, layer.y - nativeHeight / 2);
                        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
                        ctx.drawImage(layerImg, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
                        ctx.restore();

                        loadedLayers++;
                        if (loadedLayers === visibleImageLayers.length) {
                            drawAllLayersAndFinish();
                        }
                    };
                    layerImg.src = layer.url;
                });
            }

            function drawAllLayersAndFinish() {
                textLayers.filter(layer => layer.visible).forEach(layer => {
                    ctx.save();
                    ctx.translate(-nativeWidth / 2, -nativeHeight / 2);
                    ctx.filter = `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%)`;
                    ctx.globalAlpha = (layer.opacity || 100) / 100;

                    ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} ${layer.fontSize}px ${layer.fontFamily || 'Arial'}`;
                    ctx.fillStyle = layer.color || '#000000';
                    ctx.textAlign = layer.textAlign || 'left';
                    ctx.textBaseline = 'top';

                    if (layer.backgroundColor && layer.backgroundColor !== 'transparent') {
                        ctx.fillStyle = layer.backgroundColor;
                        ctx.fillRect(layer.x - layer.padding, layer.y - layer.padding,
                            layer.width + layer.padding * 2, layer.height + layer.padding * 2);
                        ctx.fillStyle = layer.color || '#000000';
                    }

                    const lines = layer.text.split('\n');
                    lines.forEach((line, index) => {
                        ctx.fillText(line, layer.x, layer.y + (index * layer.fontSize * 1.2));
                    });

                    ctx.restore();
                });

                geometryLayers.filter(layer => layer.visible).forEach(layer => {
                    ctx.save();
                    ctx.translate(-nativeWidth / 2, -nativeHeight / 2);
                    ctx.filter = `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%)`;
                    ctx.globalAlpha = (layer.opacity || 100) / 100;

                    const { shape, x, y, width, height, x1, y1, x2, y2, strokeColor, fillColor, strokeWidth, strokeStyle, borderRadius, points } = layer;

                    ctx.strokeStyle = strokeColor;
                    ctx.fillStyle = fillColor === 'transparent' ? 'transparent' : fillColor;
                    ctx.lineWidth = strokeWidth;

                    if (strokeStyle === 'dashed') {
                        ctx.setLineDash([5, 5]);
                    } else if (strokeStyle === 'dotted') {
                        ctx.setLineDash([2, 2]);
                    } else {
                        ctx.setLineDash([]);
                    }

                    ctx.beginPath();

                    if (shape === 'rectangle') {
                        if (borderRadius > 0) {
                            const radius = Math.min(borderRadius, width / 2, height / 2);
                            ctx.moveTo(x + radius, y);
                            ctx.lineTo(x + width - radius, y);
                            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                            ctx.lineTo(x + width, y + height - radius);
                            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                            ctx.lineTo(x + radius, y + height);
                            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                            ctx.lineTo(x, y + radius);
                            ctx.quadraticCurveTo(x, y, x + radius, y);
                            ctx.closePath();
                        } else {
                            ctx.rect(x, y, width, height);
                        }
                    } else if (shape === 'circle') {
                        const radius = Math.min(width, height) / 2;
                        ctx.arc(x + width / 2, y + height / 2, radius, 0, 2 * Math.PI);
                    } else if (shape === 'ellipse') {
                        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
                    } else if (shape === 'line') {
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                    } else if (shape === 'arrow') {
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        const angle = Math.atan2(y2 - y1, x2 - x1);
                        const arrowLength = strokeWidth * 3;
                        ctx.moveTo(x2, y2);
                        ctx.lineTo(x2 - arrowLength * Math.cos(angle - Math.PI / 6), y2 - arrowLength * Math.sin(angle - Math.PI / 6));
                        ctx.moveTo(x2, y2);
                        ctx.lineTo(x2 - arrowLength * Math.cos(angle + Math.PI / 6), y2 - arrowLength * Math.sin(angle + Math.PI / 6));
                    } else if (shape === 'polygon') {
                        if (points && points.length > 0) {
                            ctx.moveTo(points[0].x, points[0].y);
                            for (let i = 1; i < points.length; i++) {
                                ctx.lineTo(points[i].x, points[i].y);
                            }
                            ctx.closePath();
                        }
                    } else if (shape === 'polyline') {
                        if (points && points.length > 0) {
                            ctx.moveTo(points[0].x, points[0].y);
                            for (let i = 1; i < points.length; i++) {
                                ctx.lineTo(points[i].x, points[i].y);
                            }
                        }
                    }

                    if (fillColor !== 'transparent' && shape !== 'line' && shape !== 'arrow' && shape !== 'polyline') {
                        ctx.fill();
                    }
                    ctx.stroke();
                    ctx.restore();
                });

                paths.filter(p => p.visible).forEach(elem => {
                    ctx.save();
                    ctx.translate(-nativeWidth / 2, -nativeHeight / 2);
                    ctx.filter = 'none';
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = elem.color;
                    ctx.lineWidth = elem.width;
                    ctx.lineCap = "round";
                    try {
                        const p = new Path2D(elem.d);
                        ctx.stroke(p);
                    } catch (error) {
                        return;
                    }
                    ctx.restore();
                });

                if (tempPath) {
                    ctx.save();
                    ctx.translate(-nativeWidth / 2, -nativeHeight / 2);
                    ctx.filter = 'none';
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = tempPath.color;
                    ctx.lineWidth = tempPath.width;
                    ctx.lineCap = "round";
                    try {
                        const p = new Path2D(tempPath.d);
                        ctx.stroke(p);
                    } catch (error) {
                        return;
                    }
                    ctx.restore();
                }

                const dataUrl = canvas.toDataURL(mimeType);
                link.href = dataUrl;
                link.download = `${fileNameBase}.${fileType}`;
                link.click();
            }
        };
        img.src = url;
    };

    const handleDragStart = (e) => {
        if (actionMode !== "Idle") return;
        if (isCropping) return;
        if (!selectedLayers.includes('base')) return;
        draggingRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleDragEnd = () => {
        if (draggingRef.current) {
            addToHistory("Image moved.");
        }
        draggingRef.current = false;
    };

    const handleDragMove = (e) => {
        if (!draggingRef.current) return;
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        setPanX(prev => prev + dx);
        setPanY(prev => prev + dy);
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleResizeMouseDown = (corner, e) => {
        if (actionMode !== "Idle") return;
        if (isCropping) return;
        if (!selectedLayers.includes('base')) return;
        e.stopPropagation();
        e.preventDefault();
        setResizingCorner(corner);
        resizingRef.current = true;
        lastResizePosRef.current = { x: e.clientX, y: e.clientY };
        initialSizeRef.current = { width: imageWidth, height: imageHeight };
        initialPosRef.current = { x: panX, y: panY };
        if (maintainAspectRatio) {
            aspectRatioRef.current = imageWidth / imageHeight;
        }
    };

    const handleGlobalMouseMove = (e) => {
        if (!resizingRef.current) return;
        const dx = e.clientX - lastResizePosRef.current.x;
        const dy = e.clientY - lastResizePosRef.current.y;
        const rad = baseRotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localDx = cos * dx + sin * dy;
        const localDy = -sin * dx + cos * dy;
        let newWidth = initialSizeRef.current.width;
        let newHeight = initialSizeRef.current.height;
        let newPanX = initialPosRef.current.x;
        let newPanY = initialPosRef.current.y;
        if (maintainAspectRatio) {
            const ratio = aspectRatioRef.current;
            if (resizingCorner === "bottom-right") {
                newWidth = initialSizeRef.current.width + localDx;
                newHeight = newWidth / ratio;
            } else if (resizingCorner === "bottom-left") {
                newWidth = initialSizeRef.current.width - localDx;
                newHeight = newWidth / ratio;
            } else if (resizingCorner === "top-right") {
                newWidth = initialSizeRef.current.width + localDx;
                newHeight = newWidth / ratio;
            } else if (resizingCorner === "top-left") {
                newWidth = initialSizeRef.current.width - localDx;
                newHeight = newWidth / ratio;
            }
        } else {
            if (resizingCorner === "bottom-right") {
                newWidth = initialSizeRef.current.width + localDx;
                newHeight = initialSizeRef.current.height + localDy;
            } else if (resizingCorner === "bottom-left") {
                newWidth = initialSizeRef.current.width - localDx;
                newHeight = initialSizeRef.current.height + localDy;
            } else if (resizingCorner === "top-right") {
                newWidth = initialSizeRef.current.width + localDx;
                newHeight = initialSizeRef.current.height - localDy;
            } else if (resizingCorner === "top-left") {
                newWidth = initialSizeRef.current.width - localDx;
                newHeight = initialSizeRef.current.height - localDy;
            }
        }
        newWidth = Math.max(newWidth, 50);
        newHeight = Math.max(newHeight, 50);
        setImageWidth(newWidth);
        setImageHeight(newHeight);
        setPanX(newPanX);
        setPanY(newPanY);
    };

    const handleGlobalMouseUp = () => {
        if (resizingRef.current) {
            addToHistory("Image resized.");
        }
        resizingRef.current = false;
        setResizingCorner(null);
    };

    useEffect(() => {
        const onMouseMove = (e) => handleGlobalMouseMove(e);
        const onMouseUp = () => handleGlobalMouseUp();
        if (resizingRef.current) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [resizingCorner]);

    const restoreAspectRatioWidth = () => {
        if (selectedLayers.includes('base')) {
            const newHeight = imageWidth * (nativeHeight / nativeWidth);
            setImageHeight(newHeight);
        }
        selectedLayers.forEach(layerId => {
            if (layerId !== 'base') {
                setImageLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, height: layer.width * (layer.height / layer.width) }
                        : layer
                ));
            }
        });
        addToHistory("Aspect ratio restored.");
    };

    const restoreAspectRatioHeight = () => {
        if (selectedLayers.includes('base')) {
            const newWidth = imageHeight * (nativeWidth / nativeHeight);
            setImageWidth(newWidth);
        }
        selectedLayers.forEach(layerId => {
            if (layerId !== 'base') {
                setImageLayers(prev => prev.map(layer =>
                    layer.id === layerId
                        ? { ...layer, width: layer.height * (layer.width / layer.height) }
                        : layer
                ));
            }
        });
        addToHistory("Aspect ratio restored.");
    };

    const handleCropResizeMouseDown = (corner, e) => {
        e.stopPropagation();
        e.preventDefault();
        cropResizingRef.current = true;
        cropResizingCorner.current = corner;
        cropLastResizePosRef.current = { x: e.clientX, y: e.clientY };
        cropInitialRectRef.current = { ...cropRect };
    };

    const handleCropGlobalMouseMove = (e) => {
        if (!cropResizingRef.current) return;
        const dx = e.clientX - cropLastResizePosRef.current.x;
        const dy = e.clientY - cropLastResizePosRef.current.y;
        let { x, y, width, height } = cropInitialRectRef.current;
        if (circleCrop) {
            if (cropResizingCorner.current === "bottom-right") {
                width += dx;
                height += dy;
            } else if (cropResizingCorner.current === "bottom-left") {
                x += dx;
                width -= dx;
                height += dy;
            } else if (cropResizingCorner.current === "top-right") {
                y += dy;
                width += dx;
                height -= dy;
            } else if (cropResizingCorner.current === "top-left") {
                x += dx;
                y += dy;
                width -= dx;
                height -= dy;
            }
        } else {
            if (cropResizingCorner.current === "bottom-right") {
                width += dx;
                height += dy;
            } else if (cropResizingCorner.current === "bottom-left") {
                x += dx;
                width -= dx;
                height += dy;
            } else if (cropResizingCorner.current === "top-right") {
                y += dy;
                width += dx;
                height -= dy;
            } else if (cropResizingCorner.current === "top-left") {
                x += dx;
                y += dy;
                width -= dx;
                height -= dy;
            }
        }
        setCropRect({ x, y, width: Math.max(width, 10), height: Math.max(height, 10), });
    };

    useEffect(() => {
        const onMouseMove = (e) => handleCropGlobalMouseMove(e);
        const onMouseUp = () => {
            cropResizingRef.current = false;
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    const handleCropMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        cropDraggingRef.current = true;
        lastCropDragPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleCropMouseMove = (e) => {
        if (!cropDraggingRef.current) return;
        const dx = e.clientX - lastCropDragPosRef.current.x;
        const dy = e.clientY - lastCropDragPosRef.current.y;
        lastCropDragPosRef.current = { x: e.clientX, y: e.clientY };
        setCropRect(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    };

    const handleCropMouseUp = () => {
        cropDraggingRef.current = false;
    };

    useEffect(() => {
        const onMouseMove = (e) => handleCropMouseMove(e);
        const onMouseUp = (e) => handleCropMouseUp(e);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    const handleCropRotationMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        cropRotatingRef.current = true;
        const rect = e.currentTarget.parentElement.getBoundingClientRect();
        cropRotationCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const dx = e.clientX - cropRotationCenter.current.x;
        const dy = e.clientY - cropRotationCenter.current.y;
        cropRotationStartAngle.current = Math.atan2(dy, dx) * (180 / Math.PI);
        cropInitialRotation.current = cropRotation;
    };

    const handleCropGlobalMouseMoveRotation = (e) => {
        if (!cropRotatingRef.current) return;
        const dx = e.clientX - cropRotationCenter.current.x;
        const dy = e.clientY - cropRotationCenter.current.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const deltaAngle = angle - cropRotationStartAngle.current;
        setCropRotation(cropInitialRotation.current + deltaAngle);
    };

    const handleCropGlobalMouseUpRotation = () => {
        cropRotatingRef.current = false;
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleCropGlobalMouseMoveRotation);
        window.addEventListener("mouseup", handleCropGlobalMouseUpRotation);
        return () => {
            window.removeEventListener("mousemove", handleCropGlobalMouseMoveRotation);
            window.removeEventListener("mouseup", handleCropGlobalMouseUpRotation);
        };
    }, []);

    const handleSvgMouseDown = (e) => {
        const { x, y } = getSvgPoint(e);
        if (actionMode === "Drawing" || actionMode === "Highlighting") {
            isDrawingRef.current = true;
            currentPathPoints.current = [{ x, y }];
            setUndonePaths([]);
        } else if (actionMode === "Geometry") {
            if (selectedGeometryShape === 'polygon' || selectedGeometryShape === 'polyline') {
                if (!isCreatingPolygon) {
                    setIsCreatingPolygon(true);
                    setCreatingPolygonPoints([{ x, y }]);
                } else {
                    const newPoints = [...creatingPolygonPoints, { x, y }];
                    setCreatingPolygonPoints(newPoints);
                }
            } else {
                isCreatingGeometry.current = true;
                geometryStartPoint.current = { x, y };
                setTempGeometry(null);
            }
        }
    };

    const handleSvgMouseMove = (e) => {
        if (isDrawingRef.current && (actionMode === "Drawing" || actionMode === "Highlighting")) {
            const { x, y } = getSvgPoint(e);
            currentPathPoints.current.push({ x, y });
            const pts = currentPathPoints.current;
            if (pts.length > 1) {
                let d = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 1; i < pts.length - 1; i++) {
                    let x_mid = (pts[i].x + pts[i + 1].x) / 2;
                    let y_mid = (pts[i].y + pts[i + 1].y) / 2;
                    d += ` Q ${pts[i].x} ${pts[i].y} ${x_mid} ${y_mid}`;
                }
                d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
                setTempPath({
                    d,
                    color: actionMode === "Drawing" ? drawColor : highlightColor,
                    width: (actionMode === "Drawing" ? drawBrushSize : highlightBrushSize) * 3
                });
            }
        } else if (isCreatingGeometry.current && actionMode === "Geometry" && selectedGeometryShape !== 'polygon' && selectedGeometryShape !== 'polyline') {
            const { x, y } = getSvgPoint(e);
            const startX = geometryStartPoint.current.x;
            const startY = geometryStartPoint.current.y;

            setTempGeometry({
                shape: selectedGeometryShape,
                x: Math.min(startX, x),
                y: Math.min(startY, y),
                width: Math.abs(x - startX),
                height: Math.abs(y - startY),
                x1: startX,
                y1: startY,
                x2: x,
                y2: y,
                strokeColor: geometrySettings.strokeColor,
                fillColor: geometrySettings.fillColor,
                strokeWidth: geometrySettings.strokeWidth,
                strokeStyle: geometrySettings.strokeStyle,
                borderRadius: geometrySettings.borderRadius,
                arrowHead: geometrySettings.arrowHead
            });
        } else if (actionMode === "Geometry" && (selectedGeometryShape === 'polygon' || selectedGeometryShape === 'polyline') && isCreatingPolygon && creatingPolygonPoints.length > 0) {
            const { x, y } = getSvgPoint(e);
            const previewPoints = [...creatingPolygonPoints, { x, y }];
            const minX = Math.min(...previewPoints.map(p => p.x));
            const minY = Math.min(...previewPoints.map(p => p.y));
            const maxX = Math.max(...previewPoints.map(p => p.x));
            const maxY = Math.max(...previewPoints.map(p => p.y));

            setTempGeometry({
                shape: selectedGeometryShape,
                points: previewPoints,
                x: minX,
                y: minY,
                width: Math.max(maxX - minX, 10),
                height: Math.max(maxY - minY, 10),
                strokeColor: geometrySettings.strokeColor,
                fillColor: geometrySettings.fillColor,
                strokeWidth: geometrySettings.strokeWidth,
                strokeStyle: geometrySettings.strokeStyle
            });
        }
    };

    const handleSvgMouseUp = (e) => {
        if (isDrawingRef.current && (actionMode === "Drawing" || actionMode === "Highlighting")) {
            isDrawingRef.current = false;
            const pts = currentPathPoints.current;
            if (pts.length > 1) {
                let d = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 1; i < pts.length - 1; i++) {
                    let x_mid = (pts[i].x + pts[i + 1].x) / 2;
                    let y_mid = (pts[i].y + pts[i + 1].y) / 2;
                    d += ` Q ${pts[i].x} ${pts[i].y} ${x_mid} ${y_mid}`;
                }
                d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;

                const newDrawingLayer = {
                    id: Date.now(),
                    name: `${actionMode === "Drawing" ? "Drawing" : "Highlight"} ${drawingLayers.length + 1}`,
                    type: actionMode.toLowerCase(),
                    d,
                    color: actionMode === "Drawing" ? drawColor : highlightColor,
                    strokeWidth: (actionMode === "Drawing" ? drawBrushSize : highlightBrushSize) * 3,
                    x: 0,
                    y: 0, 
                    rotation: 0,
                    zoom: 1,
                    flipX: 1,
                    flipY: 1,
                    opacity: 100,
                    hue: 0,
                    saturation: 100,
                    brightness: 100,
                    contrast: 100,
                    blur: 0,
                    spread: 0,
                    grayscale: 0,
                    sepia: 0,
                    visible: true,
                    locked: false
                };

                setDrawingLayers(prev => [...prev, newDrawingLayer]);
                setSelectedLayers([newDrawingLayer.id]);
            }
            setTempPath(null);
            currentPathPoints.current = [];
            addToHistory(`${actionMode === "Drawing" ? "Drawing" : "Highlighting"} stroke added.`);
        } else if (isCreatingGeometry.current && actionMode === "Geometry" && selectedGeometryShape !== 'polygon' && selectedGeometryShape !== 'polyline') {
            isCreatingGeometry.current = false;
            const { x, y } = getSvgPoint(e);
            const startX = geometryStartPoint.current.x;
            const startY = geometryStartPoint.current.y;

            if (Math.abs(x - startX) > 5 || Math.abs(y - startY) > 5) {
                addGeometryLayer(startX, startY, x, y);
            }
            setTempGeometry(null);
        }
    };

    const finishPolygonCreation = () => {
        if (!isCreatingPolygon || creatingPolygonPoints.length < 2) {
            return;
        }

        addGeometryLayer(0, 0, 0, 0, creatingPolygonPoints);
        setIsCreatingPolygon(false);
        setCreatingPolygonPoints([]);
        setTempGeometry(null);
    };

    const handleSvgRightClick = (e) => {
        e.preventDefault();
        if (actionMode === "Geometry" && (selectedGeometryShape === 'polygon' || selectedGeometryShape === 'polyline') && isCreatingPolygon) {
            finishPolygonCreation();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && actionMode === "Geometry" && (selectedGeometryShape === 'polygon' || selectedGeometryShape === 'polyline') && isCreatingPolygon) {
            finishPolygonCreation();
        }
    };

    const undoStroke = () => {
        setDrawingLayers(prev => {
            if (prev.length === 0) return prev;
            const newLayers = [...prev];
            const undoneLayer = newLayers.pop();
            setUndonePaths(ups => [...ups, undoneLayer]);
            addToHistory("Drawing layer undone.");
            return newLayers;
        });
    };

    const redoStroke = () => {
        setUndonePaths(prev => {
            if (prev.length === 0) return prev;
            const newUndone = [...prev];
            const layerToRedo = newUndone.pop();
            setDrawingLayers(layers => [...layers, layerToRedo]);
            addToHistory("Drawing layer redone.");
            return newUndone;
        });
    };

    const undoCrop = () => {
        if (cropHistory.length > 0) {
            const previous = cropHistory[cropHistory.length - 1];
            setCropHistory(prev => prev.slice(0, prev.length - 1));
            setUrl(previous.url);
            setPanX(previous.panX);
            setPanY(previous.panY);
            setImageWidth(previous.imageWidth);
            setImageHeight(previous.imageHeight);
            setNativeWidth(previous.nativeWidth);
            setNativeHeight(previous.nativeHeight);
            setPaths(previous.paths);
            setUndonePaths(previous.undonePaths);
            setBaseVisible(previous.baseVisible);
            setBaseLocked(previous.baseLocked);
            setImageLayers(previous.imageLayers || []);
            setTextLayers(previous.textLayers || []);
            setGeometryLayers(previous.geometryLayers || []);
            setBaseHue(previous.hue || 0);
            setBaseSaturation(previous.saturation || 100);
            setBaseBrightness(previous.brightness || 100);
            setBaseContrast(previous.contrast || 100);
            setBaseOpacity(previous.opacity || 100);
            setBaseBlur(previous.blur || 0);
            setBaseSpread(previous.spread || 0);
            setBaseGrayscale(previous.grayscale || 0);
            setBaseSepia(previous.sepia || 0);
            setIsCropping(false);
            addToHistory("Crop undone.");
        }
    };

    const moveImageLayer = (id, delta) => {
        setImageLayers(prev => {
            const index = prev.findIndex(layer => layer.id === id);
            if (index === -1) return prev;
            const layer = prev[index];
            if (layer.locked) return prev;
            const newIndex = index + delta;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const newPrev = [...prev];
            const temp = newPrev[newIndex];
            newPrev[newIndex] = newPrev[index];
            newPrev[index] = temp;
            return newPrev;
        });
        addToHistory("Layer order changed.");
    };

    const getBaseImageStyle = () => {
        return {
            width: "100%",
            height: "100%",
            filter: `hue-rotate(${baseHue}deg) saturate(${baseSaturation}%) brightness(${baseBrightness}%) contrast(${baseContrast}%) blur(${baseBlur}px) grayscale(${baseGrayscale}%) sepia(${baseSepia}%) ${baseSpread ? `drop-shadow(0 0 ${baseSpread}px rgba(0,0,0,0.5))` : ""}`,
            userSelect: "none",
            borderRadius: "inherit",
            opacity: baseOpacity / 100,
            transform: `scale(${baseFlipX}, ${baseFlipY})`,
            visibility: baseVisible ? "visible" : "hidden",
            cursor: actionMode === "Idle" ? "pointer" : "default"
        };
    };

    const getImageLayerStyle = (layer) => {
        return {
            position: "absolute",
            left: `${(layer.x / nativeWidth) * 100}%`,
            top: `${(layer.y / nativeHeight) * 100}%`,
            width: `${(layer.width / nativeWidth) * 100}%`,
            height: `${(layer.height / nativeHeight) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scale(${(layer.zoom || 1) * (layer.flipX || 1)}, ${(layer.zoom || 1) * (layer.flipY || 1)})`,
            opacity: (layer.opacity || 100) / 100,
            cursor: actionMode === "Idle" ? (selectedLayers.includes(layer.id) ? "move" : "pointer") : "default",
            border: selectedLayers.includes(layer.id) && actionMode === "Idle" ? "2px dashed #5C2BE2" : "none",
            pointerEvents: layer.locked ? "none" : "auto",
            filter: `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%) ${(layer.spread || 0) ? `drop-shadow(0 0 ${layer.spread}px rgba(0,0,0,0.5))` : ""}`
        };
    };

    const getGeometryLayerStyle = (layer) => {
        const padding = Math.max(layer.strokeWidth || 3, 4);

        if (layer.shape === 'line' || layer.shape === 'arrow') {
            const minX = Math.min(layer.x1, layer.x2);
            const minY = Math.min(layer.y1, layer.y2);
            const maxX = Math.max(layer.x1, layer.x2);
            const maxY = Math.max(layer.y1, layer.y2);
            const width = maxX - minX || layer.strokeWidth;
            const height = maxY - minY || layer.strokeWidth;

            return {
                position: "absolute",
                left: `${((minX - padding) / nativeWidth) * 100}%`,
                top: `${((minY - padding) / nativeHeight) * 100}%`,
                width: `${((width + padding * 2) / nativeWidth) * 100}%`,
                height: `${((height + padding * 2) / nativeHeight) * 100}%`,
                transform: `rotate(${layer.rotation || 0}deg) scale(${(layer.zoom || 1) * (layer.flipX || 1)}, ${(layer.zoom || 1) * (layer.flipY || 1)})`,
                opacity: (layer.opacity || 100) / 100,
                cursor: actionMode === "Idle" ? (selectedLayers.includes(layer.id) ? "move" : "pointer") : "default",
                outline: selectedLayers.includes(layer.id) && actionMode === "Idle" ? "2px dashed #5C2BE2" : "none",
                outlineOffset: "0px",
                pointerEvents: layer.locked ? "none" : "auto",
                filter: `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%) ${(layer.spread || 0) ? `drop-shadow(0 0 ${layer.spread}px rgba(0,0,0,0.5))` : ""}`
            };
        }

        return {
            position: "absolute",
            left: `${((layer.x - padding) / nativeWidth) * 100}%`,
            top: `${((layer.y - padding) / nativeHeight) * 100}%`,
            width: `${((layer.width + padding * 2) / nativeWidth) * 100}%`,
            height: `${((layer.height + padding * 2) / nativeHeight) * 100}%`,
            transform: `rotate(${layer.rotation || 0}deg) scale(${(layer.zoom || 1) * (layer.flipX || 1)}, ${(layer.zoom || 1) * (layer.flipY || 1)})`,
            opacity: (layer.opacity || 100) / 100,
            cursor: actionMode === "Idle" ? (selectedLayers.includes(layer.id) ? "move" : "pointer") : "default",
            outline: selectedLayers.includes(layer.id) && actionMode === "Idle" ? "2px dashed #5C2BE2" : "none",
            outlineOffset: "0px",
            pointerEvents: layer.locked ? "none" : "auto",
            filter: `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%) ${(layer.spread || 0) ? `drop-shadow(0 0 ${layer.spread}px rgba(0,0,0,0.5))` : ""}`
        };
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'copy';
            setIsDraggingOver(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            setIsDraggingOver(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            return;
        }

        for (const file of imageFiles) {
            const imageUrl = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                const newLayer = {
                    id: Date.now() + Math.random(),
                    name: `Layer ${imageLayers.length + 1}`,
                    url: imageUrl,
                    x: nativeWidth / 2,
                    y: nativeHeight / 2,
                    width: Math.min(img.naturalWidth, nativeWidth / 2),
                    height: Math.min(img.naturalHeight, nativeHeight / 2),
                    rotation: 0,
                    zoom: 1,
                    flipX: 1,
                    flipY: 1,
                    opacity: 100,
                    hue: 0,
                    saturation: 100,
                    brightness: 100,
                    contrast: 100,
                    blur: 0,
                    spread: 0,
                    grayscale: 0,
                    sepia: 0,
                    visible: true,
                    locked: false
                };

                setImageLayers(prev => [...prev, newLayer]);
                setSelectedLayers([newLayer.id]);
                addToHistory("Image layer imported via drag and drop.");
            };

            img.src = imageUrl;
        }
    };

    const renderGeometryShape = (layer) => {
        const { shape, width, height, strokeColor, fillColor, strokeWidth, strokeStyle, borderRadius, x1, y1, x2, y2, points } = layer;
        const dashArray = strokeStyle === 'dashed' ? '5,5' : strokeStyle === 'dotted' ? '2,2' : '';
        const padding = Math.max(strokeWidth || 3, 4);

        const svgStyle = {
            position: 'absolute',
            top: `-${padding}px`,
            left: `-${padding}px`,
            width: `calc(100% + ${padding * 2}px)`,
            height: `calc(100% + ${padding * 2}px)`,
            overflow: 'visible'
        };

        if (shape === 'line' || shape === 'arrow') {
            const minX = Math.min(x1, x2);
            const minY = Math.min(y1, y2);
            const maxX = Math.max(x1, x2);
            const maxY = Math.max(y1, y2);
            const containerWidth = Math.max(maxX - minX, strokeWidth) + padding * 2;
            const containerHeight = Math.max(maxY - minY, strokeWidth) + padding * 2;
            const relX1 = x1 - minX + padding;
            const relY1 = y1 - minY + padding;
            const relX2 = x2 - minX + padding;
            const relY2 = y2 - minY + padding;

            if (shape === 'line') {
                return (
                    <svg viewBox={`0 0 ${containerWidth} ${containerHeight}`} style={svgStyle}>
                        <line
                            x1={relX1}
                            y1={relY1}
                            x2={relX2}
                            y2={relY2}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                );
            } else if (shape === 'arrow') {
                const arrowSize = strokeWidth * 2;
                return (
                    <svg viewBox={`0 0 ${containerWidth} ${containerHeight}`} style={svgStyle}>
                        <defs>
                            <marker
                                id={`arrowhead-${layer.id}`}
                                markerWidth={arrowSize}
                                markerHeight={arrowSize}
                                refX={arrowSize - 1}
                                refY={arrowSize / 2}
                                orient="auto"
                            >
                                <polygon
                                    points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`}
                                    fill={strokeColor}
                                />
                            </marker>
                        </defs>
                        <line
                            x1={relX1}
                            y1={relY1}
                            x2={relX2}
                            y2={relY2}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            markerEnd={`url(#arrowhead-${layer.id})`}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                );
            }
        }

        if (shape === 'polygon' || shape === 'polyline') {
            if (!points || points.length === 0) return null;

            const viewBoxWidth = layer.width + padding * 2;
            const viewBoxHeight = layer.height + padding * 2;
            const relativePoints = points.map(point => ({
                x: point.x - layer.x + padding,
                y: point.y - layer.y + padding
            }));

            const pointsStr = relativePoints.map(p => `${p.x},${p.y}`).join(' ');

            if (shape === 'polygon') {
                return (
                    <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} style={svgStyle}>
                        <polygon
                            points={pointsStr}
                            stroke={strokeColor}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                );
            } else if (shape === 'polyline') {
                return (
                    <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} style={svgStyle}>
                        <polyline
                            points={pointsStr}
                            stroke={strokeColor}
                            fill="none"
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                );
            }
        }

        const viewBoxWidth = width + padding * 2;
        const viewBoxHeight = height + padding * 2;

        if (shape === 'rectangle') {
            if (borderRadius > 0) {
                const radius = Math.min(borderRadius, width / 2, height / 2);
                return (
                    <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} style={svgStyle}>
                        <rect
                            x={padding}
                            y={padding}
                            width={width}
                            height={height}
                            rx={radius}
                            ry={radius}
                            stroke={strokeColor}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                );
            } else {
                return (
                    <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} style={svgStyle}>
                        <rect
                            x={padding}
                            y={padding}
                            width={width}
                            height={height}
                            stroke={strokeColor}
                            fill={fillColor === 'transparent' ? 'none' : fillColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                );
            }
        } else if (shape === 'circle') {
            const radius = Math.min(width, height) / 2;
            return (
                <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} style={svgStyle}>
                    <circle
                        cx={width / 2 + padding}
                        cy={height / 2 + padding}
                        r={radius}
                        stroke={strokeColor}
                        fill={fillColor === 'transparent' ? 'none' : fillColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashArray}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            );
        } else if (shape === 'ellipse') {
            return (
                <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} style={svgStyle}>
                    <ellipse
                        cx={width / 2 + padding}
                        cy={height / 2 + padding}
                        rx={width / 2}
                        ry={height / 2}
                        stroke={strokeColor}
                        fill={fillColor === 'transparent' ? 'none' : fillColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashArray}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            );
        }

        return null;
    };

    return (
        <div className="dinolabsImageEditorWrapper">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageImport}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <div className="dinolabsImageEditorToolbar">
                <div className="dinolabsImageEditorCellWrapper">
                    <div className="dinolabsImageEditorHeaderFlex">
                        <label className="dinolabsImageEditorCellTitle">
                            <FontAwesomeIcon icon={faTabletScreenButton} /> Layout
                        </label>
                        <div className="dinolabsImageEditorCellFlexSupplement">
                            <Tippy content="Reset Image" theme="tooltip-light">
                                <button onClick={resetImage} className="dinolabsImageEditorToolButtonHeader">
                                    <FontAwesomeIcon icon={faArrowsRotate} />
                                </button>
                            </Tippy>
                            <Tippy content="Download Image" theme="tooltip-light">
                                <button onClick={downloadImage} className="dinolabsImageEditorToolButtonHeader">
                                    <FontAwesomeIcon icon={faDownload} />
                                </button>
                            </Tippy>
                            <Tippy content="Import Image Layer" theme="tooltip-light">
                                <button onClick={importImageLayer} className="dinolabsImageEditorToolButtonHeader">
                                    <FontAwesomeIcon icon={faFileImport} />
                                </button>
                            </Tippy>
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle"> Position </label>
                        <div className="dinolabsImageEditorCellFlex">
                            <input className="dinolabsImageEditorPositionInput" type="text" value={`X: ${panX}`} onChange={(e) => { const newValue = e.target.value.replace(/[^0-9.-]/g, ""); setPanX(Number(newValue)); addToHistory("Position changed."); }} />
                            <input className="dinolabsImageEditorPositionInput" type="text" value={`Y: ${panY}`} onChange={(e) => { const newValue = e.target.value.replace(/[^0-9.-]/g, ""); setPanY(Number(newValue)); addToHistory("Position changed."); }} />
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <div className="dinolabsImageEditorCellFlex">
                            <Tippy content="Zoom In Selected" theme="tooltip-light">
                                <button onClick={() => updateZoom(0.1)} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                                </button>
                            </Tippy>
                            <Tippy content="Zoom Out Selected" theme="tooltip-light">
                                <button onClick={() => updateZoom(-0.1)} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
                                </button>
                            </Tippy>
                            <Tippy content="Rotate Left Selected" theme="tooltip-light">
                                <button onClick={() => updateRotation(-90)} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={faRotateLeft} />
                                </button>
                            </Tippy>
                            <Tippy content="Rotate Right Selected" theme="tooltip-light">
                                <button onClick={() => updateRotation(90)} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={faRotateRight} />
                                </button>
                            </Tippy>
                            <Tippy content="Flip Horizontally Selected" theme="tooltip-light">
                                <button onClick={() => updateFlip('x')} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={faLeftRight} />
                                </button>
                            </Tippy>
                            <Tippy content="Flip Vertically Selected" theme="tooltip-light">
                                <button onClick={() => updateFlip('y')} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={faUpDown} />
                                </button>
                            </Tippy>
                        </div>
                    </div>
                </div>
                <div className="dinolabsImageEditorCellWrapper">
                    <div className="dinolabsImageEditorHeaderFlex">
                        <label className="dinolabsImageEditorCellTitle">
                            <FontAwesomeIcon icon={faRulerCombined} /> Dimensions
                        </label>
                        <label className="dinolabsConfrmationCheck">
                            <input type="checkbox" className="dinolabsSettingsCheckbox" checked={maintainAspectRatio} onChange={(e) => { setMaintainAspectRatio(e.target.checked); addToHistory("Aspect ratio setting changed."); }} />
                            <span> Preserve Aspect Ratio </span>
                        </label>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle"> Image Size </label>
                        <div className="dinolabsImageEditorCellFlex">
                            <input className="dinolabsImageEditorPositionInput" type="text" value={`W: ${Math.round(imageWidth)}px`} onChange={(e) => { const newValue = e.target.value.replace(/[^0-9.-]/g, ""); setImageWidth(Number(newValue)); addToHistory("Image size changed."); }} />
                            <input className="dinolabsImageEditorPositionInput" type="text" value={`H: ${Math.round(imageHeight)}px`} onChange={(e) => { const newValue = e.target.value.replace(/[^0-9.-]/g, ""); setImageHeight(Number(newValue)); addToHistory("Image size changed."); }} />
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <div className="dinolabsImageEditorCellFlex">
                            <Tippy content="Restore Width Based Aspect Ratio" theme="tooltip-light">
                                <button onClick={restoreAspectRatioWidth} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={faArrowsLeftRightToLine} />
                                </button>
                            </Tippy>
                            <Tippy content="Restore Height Based Aspect Ratio" theme="tooltip-light">
                                <button onClick={restoreAspectRatioHeight} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={faArrowsUpToLine} />
                                </button>
                            </Tippy>
                            <Tippy content="Crop Image" theme="tooltip-light">
                                <button
                                    onClick={async () => {
                                        if (actionMode === "Drawing" || actionMode === "Highlighting") return;
                                        if (isCropDisabled) return;
                                        if (isCropping) {
                                            const img = new Image();
                                            img.onload = () => {
                                                const offscreenCanvas = document.createElement("canvas");
                                                offscreenCanvas.width = nativeWidth;
                                                offscreenCanvas.height = nativeHeight;
                                                const offscreenCtx = offscreenCanvas.getContext("2d");

                                                if (baseVisible) {
                                                    offscreenCtx.filter = `hue-rotate(${baseHue}deg) saturate(${baseSaturation}%) brightness(${baseBrightness}%) contrast(${baseContrast}%) blur(${baseBlur}px) grayscale(${baseGrayscale}%) sepia(${baseSepia}%)`;
                                                    offscreenCtx.globalAlpha = baseOpacity / 100;
                                                    offscreenCtx.drawImage(img, 0, 0, nativeWidth, nativeHeight);
                                                    offscreenCtx.filter = 'none';
                                                    offscreenCtx.globalAlpha = 1;
                                                }

                                                let loadedLayers = 0;
                                                const visibleImageLayers = imageLayers.filter(layer => layer.visible);

                                                const drawPathsAndFinish = () => {
                                                    paths.filter(p => p.visible).forEach(pathData => {
                                                        offscreenCtx.strokeStyle = pathData.color;
                                                        offscreenCtx.lineWidth = pathData.width;
                                                        offscreenCtx.lineCap = "round";
                                                        try {
                                                            const p = new Path2D(pathData.d);
                                                            offscreenCtx.stroke(p);
                                                        } catch (error) {
                                                            return;
                                                        }
                                                    });

                                                    if (tempPath) {
                                                        offscreenCtx.strokeStyle = tempPath.color;
                                                        offscreenCtx.lineWidth = tempPath.width;
                                                        offscreenCtx.lineCap = "round";
                                                        try {
                                                            const p = new Path2D(tempPath.d);
                                                            offscreenCtx.stroke(p);
                                                        } catch (error) {
                                                            return;
                                                        }
                                                    }

                                                    const scaleX = nativeWidth / imageWidth;
                                                    const scaleY = nativeHeight / imageHeight;
                                                    const rad = cropRotation * Math.PI / 180;
                                                    const cx = cropRect.x + cropRect.width / 2;
                                                    const cy = cropRect.y + cropRect.height / 2;
                                                    const corners = [
                                                        { x: cropRect.x, y: cropRect.y },
                                                        { x: cropRect.x + cropRect.width, y: cropRect.y },
                                                        { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height },
                                                        { x: cropRect.x, y: cropRect.y + cropRect.height }
                                                    ];
                                                    const rotatedCorners = corners.map(pt => {
                                                        const dx = pt.x - cx;
                                                        const dy = pt.y - cy;
                                                        return {
                                                            x: (cx + (dx * Math.cos(rad) - dy * Math.sin(rad))) * scaleX,
                                                            y: (cy + (dx * Math.sin(rad) + dy * Math.cos(rad))) * scaleY
                                                        };
                                                    });
                                                    const xs = rotatedCorners.map(pt => pt.x);
                                                    const ys = rotatedCorners.map(pt => pt.y);
                                                    const minX = Math.min(...xs);
                                                    const maxX = Math.max(...xs);
                                                    const minY = Math.min(...ys);
                                                    const maxY = Math.max(...ys);
                                                    const cropWidth = maxX - minX;
                                                    const cropHeight = maxY - minY;
                                                    const canvasCrop = document.createElement("canvas");
                                                    canvasCrop.width = cropWidth;
                                                    canvasCrop.height = cropHeight;
                                                    const ctxCrop = canvasCrop.getContext("2d");
                                                    ctxCrop.save();
                                                    ctxCrop.beginPath();
                                                    if (circleCrop) {
                                                        ctxCrop.ellipse(cropWidth / 2, cropHeight / 2, cropWidth / 2, cropHeight / 2, 0, 0, 2 * Math.PI);
                                                    } else {
                                                        ctxCrop.moveTo(rotatedCorners[0].x - minX, rotatedCorners[0].y - minY);
                                                        for (let i = 1; i < rotatedCorners.length; i++) {
                                                            ctxCrop.lineTo(rotatedCorners[i].x - minX, rotatedCorners[i].y - minY);
                                                        }
                                                        ctxCrop.closePath();
                                                    }
                                                    ctxCrop.clip();
                                                    ctxCrop.drawImage(offscreenCanvas, -minX, -minY, nativeWidth, nativeHeight);
                                                    ctxCrop.restore();
                                                    const newDataUrl = canvasCrop.toDataURL();

                                                    setCropHistory(prev => [...prev, {
                                                        url, panX, panY, imageWidth, imageHeight, nativeWidth, nativeHeight,
                                                        paths, undonePaths, baseVisible, baseLocked, imageLayers, textLayers, geometryLayers,
                                                        hue: baseHue, saturation: baseSaturation, brightness: baseBrightness,
                                                        contrast: baseContrast, opacity: baseOpacity, blur: baseBlur,
                                                        spread: baseSpread, grayscale: baseGrayscale, sepia: baseSepia
                                                    }]);
                                                    setUrl(newDataUrl);
                                                    setPanX(0);
                                                    setPanY(0);
                                                    setImageWidth(cropRect.width);
                                                    setImageHeight(cropRect.height);
                                                    setNativeWidth(cropWidth);
                                                    setNativeHeight(cropHeight);
                                                    setIsCropping(false);
                                                    setPaths([]);
                                                    setUndonePaths([]);
                                                    setImageLayers([]);
                                                    setTextLayers([]);
                                                    setGeometryLayers([]);
                                                    setEditingTextId(null);
                                                    setEditingGeometryId(null);
                                                    setSelectedLayers(['base']);
                                                    setIsDrawColorOpen(false);
                                                    setIsHighlightColorOpen(false);
                                                    setActionMode("Idle");
                                                    setCreatingPolygonPoints([]);
                                                    setIsCreatingPolygon(false);
                                                    addToHistory("Image cropped.");
                                                };

                                                if (visibleImageLayers.length === 0) {
                                                    drawPathsAndFinish();
                                                } else {
                                                    visibleImageLayers.forEach(layer => {
                                                        const layerImg = new Image();
                                                        layerImg.crossOrigin = "anonymous";
                                                        layerImg.onload = () => {
                                                            offscreenCtx.save();
                                                            offscreenCtx.filter = `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%)`;
                                                            offscreenCtx.globalAlpha = (layer.opacity || 100) / 100;
                                                            offscreenCtx.translate(layer.x, layer.y);
                                                            offscreenCtx.rotate((layer.rotation || 0) * Math.PI / 180);
                                                            offscreenCtx.drawImage(layerImg, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
                                                            offscreenCtx.restore();

                                                            loadedLayers++;
                                                            if (loadedLayers === visibleImageLayers.length) {
                                                                drawPathsAndFinish();
                                                            }
                                                        };
                                                        layerImg.src = layer.url;
                                                    });
                                                }
                                            };
                                            img.src = url;
                                        } else {
                                            setCropRect({ x: 0, y: 0, width: imageWidth, height: imageHeight });
                                            setIsCropping(true);
                                            setCircleCrop(false);
                                            setIsDrawColorOpen(false);
                                            setIsHighlightColorOpen(false);
                                            setActionMode("Cropping");
                                            setCreatingPolygonPoints([]);
                                            setIsCreatingPolygon(false);
                                            addToHistory("Crop mode enabled.");
                                        }
                                    }}
                                    disabled={(isCropDisabled || actionMode === "Drawing" || actionMode === "Highlighting")}
                                    style={{ opacity: (isCropDisabled || actionMode === "Drawing" || actionMode === "Highlighting") ? "0.6" : "1.0", backgroundColor: isCropping ? "#5C2BE2" : "" }}
                                    className="dinolabsImageEditorToolButton"
                                >
                                    <FontAwesomeIcon icon={faCropSimple} />
                                </button>
                            </Tippy>
                            {isCropping && (
                                <Tippy content="Circle Crop" theme="tooltip-light">
                                    <button onClick={() => { setCircleCrop(prev => !prev); addToHistory("Circle crop toggled."); }} style={{ backgroundColor: circleCrop ? "#5C2BE2" : "" }} className="dinolabsImageEditorToolButton" >
                                        <FontAwesomeIcon icon={faCircle} />
                                    </button>
                                </Tippy>
                            )}
                            <Tippy content="Undo Crop" theme="tooltip-light">
                                <button onClick={undoCrop} className="dinolabsImageEditorToolButton" disabled={isCropDisabled} style={{ opacity: isCropDisabled ? "0.6" : "1.0" }} >
                                    <FontAwesomeIcon icon={faSquareCaretLeft} />
                                </button>
                            </Tippy>
                        </div>
                    </div>
                    {isCropping && (
                        <div className="dinolabsImageEditorCellFlexStack">
                            <label className="dinolabsImageEditorCellFlexTitle"> Crop Presets </label>
                            <div className="dinolabsImageEditorCellFlex">
                                <button className="dinolabsImageEditorToolButtonText" onClick={() => { setCropRect(prev => ({ ...prev, height: prev.width })); addToHistory("Crop preset applied."); }}>1:1</button>
                                <button className="dinolabsImageEditorToolButtonText" onClick={() => { setCropRect(prev => ({ ...prev, height: prev.width * (3 / 4) })); addToHistory("Crop preset applied."); }}>4:3</button>
                                <button className="dinolabsImageEditorToolButtonText" onClick={() => { setCropRect(prev => ({ ...prev, height: prev.width * (9 / 16) })); addToHistory("Crop preset applied."); }}>16:9</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="dinolabsImageEditorCellWrapper">
                    <div className="dinolabsImageEditorHeaderFlex">
                        <label className="dinolabsImageEditorCellTitle">
                            <FontAwesomeIcon icon={faSwatchbook} /> Styles (Selected Layers)
                        </label>
                    </div>
                    <SliderControl label="Opacity" value={currentValues.opacity} onChange={(value) => { updateFilter('opacity', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={0} max={100} buttonStep={10} />
                    <SliderControl label="Hue" value={currentValues.hue} onChange={(value) => { updateFilter('hue', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={-180} max={180} buttonStep={10} />
                    <SliderControl label="Saturation" value={currentValues.saturation} onChange={(value) => { updateFilter('saturation', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={0} max={200} buttonStep={10} />
                    <SliderControl label="Brightness" value={currentValues.brightness} onChange={(value) => { updateFilter('brightness', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={0} max={200} buttonStep={10} />
                    <SliderControl label="Contrast" value={currentValues.contrast} onChange={(value) => { updateFilter('contrast', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={0} max={200} buttonStep={10} />
                    <SliderControl label="Blur" value={currentValues.blur} onChange={(value) => { updateFilter('blur', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={0} max={100} buttonStep={1} />
                    <SliderControl label="Shadow" value={currentValues.spread} onChange={(value) => { updateFilter('spread', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={0} max={100} buttonStep={1} />
                    <SliderControl label="Grayscale" value={currentValues.grayscale} onChange={(value) => { updateFilter('grayscale', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={0} max={100} buttonStep={10} />
                    <SliderControl label="Sepia" value={currentValues.sepia} onChange={(value) => { updateFilter('sepia', value); setTimeout(() => addToHistory("Filter applied."), 10); }} min={0} max={100} buttonStep={10} />
                </div>
                <div className="dinolabsImageEditorCellWrapper">
                    <div className="dinolabsImageEditorHeaderFlex">
                        <label className="dinolabsImageEditorCellTitle">
                            <FontAwesomeIcon icon={faBrush} /> Drawing
                        </label>
                        <div className="dinolabsImageEditorCellFlexSupplement">
                            <Tippy content="Undo Drawing/Highlighting" theme="tooltip-light">
                                <button onClick={undoStroke} className="dinolabsImageEditorToolButtonHeader">
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                </button>
                            </Tippy>
                            <Tippy content="Redo Drawing/Highlighting" theme="tooltip-light">
                                <button onClick={redoStroke} className="dinolabsImageEditorToolButtonHeader">
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </button>
                            </Tippy>
                        </div>
                    </div>
                    <DrawControl mode="Drawing" actionMode={actionMode} setActionMode={setActionMode} color={drawColor} setColor={setDrawColor} brushSize={drawBrushSize} setBrushSize={setDrawBrushSize} isColorOpen={isDrawColorOpen} setIsColorOpen={setIsDrawColorOpen} isCropping={isCropping} addToHistory={addToHistory} />
                    <DrawControl mode="Highlighting" actionMode={actionMode} setActionMode={setActionMode} color={highlightColor} setColor={setHighlightColor} brushSize={highlightBrushSize} setBrushSize={setHighlightBrushSize} isColorOpen={isHighlightColorOpen} setIsColorOpen={setIsHighlightColorOpen} isCropping={isCropping} addToHistory={addToHistory} />
                </div>
                <div className="dinolabsImageEditorCellWrapper">
                    <div className="dinolabsImageEditorHeaderFlex">
                        <label className="dinolabsImageEditorCellTitle">
                            <FontAwesomeIcon icon={faFont} /> Text Tool
                        </label>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <div className="dinolabsImageEditorCellFlex">
                            <button
                                onClick={() => {
                                    setActionMode(prev => prev === "Text" ? "Idle" : "Text");
                                    addToHistory(`Text mode ${actionMode === "Text" ? 'disabled' : 'enabled'}.`);
                                }}
                                style={{
                                    backgroundColor: actionMode === "Text" ? "#5C2BE2" : "",
                                    opacity: isCropping ? "0.6" : "1.0"
                                }}
                                disabled={isCropping}
                                className="dinolabsImageEditorToolButtonBig"
                            >
                                Add Text
                            </button>
                        </div>
                    </div>
                    {editingTextId && (
                        <div className="dinolabsImageEditorCellFlexStack">
                            <label className="dinolabsImageEditorCellFlexTitle">Editing Text</label>
                            <textarea
                                value={textLayers.find(t => t.id === editingTextId)?.text || ''}
                                onChange={(e) => {
                                    updateTextLayer(editingTextId, { text: e.target.value });
                                }}
                                onBlur={(e) => {
                                    const isStayingInTextControls = e.relatedTarget && (
                                        e.relatedTarget.closest('.dinolabsImageEditorToolBar') ||
                                        e.relatedTarget.closest('.tippy-box') ||
                                        e.relatedTarget.closest('.color-picker-tippy')
                                    );

                                    if (!isStayingInTextControls) {
                                        addToHistory("Text content changed.");
                                    }
                                }}
                                className="dinolabsImageEditorTextArea"
                                style={{
                                }}
                                placeholder="Enter your text..."
                            />
                        </div>
                    )}
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Font Settings</label>
                        <div className="dinolabsImageEditorCellFlex">
                            <select
                                value={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.fontFamily || textSettings.fontFamily) : textSettings.fontFamily}
                                onChange={(e) => {
                                    const newFontFamily = e.target.value;
                                    setTextSettings(prev => ({ ...prev, fontFamily: newFontFamily }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { fontFamily: newFontFamily });
                                        addToHistory("Font family changed.");
                                    }
                                }}
                                className="dinolabsImageEditorPositionInput"
                            >
                                <option value="Arial">Arial</option>
                                <option value="Helvetica">Helvetica</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Verdana">Verdana</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Impact">Impact</option>
                                <option value="Comic Sans MS">Comic Sans MS</option>
                            </select>
                            <input
                                type="number"
                                value={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.fontSize || textSettings.fontSize) : textSettings.fontSize}
                                onChange={(e) => {
                                    const size = Math.max(8, Math.min(200, Number(e.target.value)));
                                    setTextSettings(prev => ({ ...prev, fontSize: size }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { fontSize: size });
                                        addToHistory("Font size changed.");
                                    }
                                }}
                                min="8"
                                max="200"
                                className="dinolabsImageEditorPositionInput"
                            />
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Font Style</label>
                        <div className="dinolabsImageEditorCellFlex">
                            <Tippy content={<DinoLabsColorPicker color={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.color || textSettings.color) : textSettings.color} onChange={(newColor) => {
                                setTextSettings(prev => ({ ...prev, color: newColor }));
                                if (editingTextId) {
                                    updateTextLayer(editingTextId, { color: newColor });
                                    addToHistory("Text color changed.");
                                }
                            }} />} visible={isTextColorOpen} onClickOutside={() => setIsTextColorOpen(false)} interactive={true} placement="right" className="color-picker-tippy" >
                                <label className="dinolabsImageEditorColorPicker" onClick={() => setIsTextColorOpen((prev) => !prev)} style={{ backgroundColor: editingTextId ? (textLayers.find(t => t.id === editingTextId)?.color || textSettings.color) : textSettings.color, width: '40px', height: '30px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc' }} />
                            </Tippy>
                            <Tippy content={<DinoLabsColorPicker color={(editingTextId ? (textLayers.find(t => t.id === editingTextId)?.backgroundColor || textSettings.backgroundColor) : textSettings.backgroundColor) === 'transparent' ? '#ffffff' : (editingTextId ? (textLayers.find(t => t.id === editingTextId)?.backgroundColor || textSettings.backgroundColor) : textSettings.backgroundColor)} onChange={(newColor) => {
                                setTextSettings(prev => ({ ...prev, backgroundColor: newColor }));
                                if (editingTextId) {
                                    updateTextLayer(editingTextId, { backgroundColor: newColor });
                                    addToHistory("Text background changed.");
                                }
                            }} />} visible={isTextBackgroundColorOpen} onClickOutside={() => setIsTextBackgroundColorOpen(false)} interactive={true} placement="right" className="color-picker-tippy" >
                                <label className="dinolabsImageEditorColorPicker" onClick={() => setIsTextBackgroundColorOpen((prev) => !prev)} style={{ backgroundColor: (editingTextId ? (textLayers.find(t => t.id === editingTextId)?.backgroundColor || textSettings.backgroundColor) : textSettings.backgroundColor) === 'transparent' ? '#ffffff' : (editingTextId ? (textLayers.find(t => t.id === editingTextId)?.backgroundColor || textSettings.backgroundColor) : textSettings.backgroundColor), width: '40px', height: '30px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc' }} />
                            </Tippy>
                            <button
                                onClick={() => {
                                    const currentBg = editingTextId ? (textLayers.find(t => t.id === editingTextId)?.backgroundColor || textSettings.backgroundColor) : textSettings.backgroundColor;
                                    const newBg = currentBg === 'transparent' ? '#ffffff' : 'transparent';
                                    setTextSettings(prev => ({ ...prev, backgroundColor: newBg }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { backgroundColor: newBg });
                                        addToHistory("Text background toggled.");
                                    }
                                }}

                                className="dinolabsImageEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Border Style</label>
                        <div className="dinolabsImageEditorCellFlex">
                            <Tippy content={<DinoLabsColorPicker color={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.borderColor || textSettings.borderColor) : textSettings.borderColor} onChange={(newColor) => {
                                setTextSettings(prev => ({ ...prev, borderColor: newColor }));
                                if (editingTextId) {
                                    updateTextLayer(editingTextId, { borderColor: newColor });
                                    addToHistory("Border color changed.");
                                }
                            }} />} visible={isTextBorderColorOpen} onClickOutside={() => setIsTextBorderColorOpen(false)} interactive={true} placement="right" className="color-picker-tippy" >
                                <label className="dinolabsImageEditorColorPicker" onClick={() => setIsTextBorderColorOpen((prev) => !prev)} style={{ backgroundColor: editingTextId ? (textLayers.find(t => t.id === editingTextId)?.borderColor || textSettings.borderColor) : textSettings.borderColor, width: '40px', height: '30px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc' }} />
                            </Tippy>

                            <input
                                type="number"
                                value={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.borderWidth || 0) : textSettings.borderWidth}
                                onChange={(e) => {
                                    const width = Math.max(0, Math.min(20, Number(e.target.value)));
                                    setTextSettings(prev => ({ ...prev, borderWidth: width }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { borderWidth: width });
                                        addToHistory("Border width changed.");
                                    }
                                }}
                                className="dinolabsImageEditorPositionInput"
                                style={{ margin: 0 }}
                            />
                            <select
                                value={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.borderStyle || textSettings.borderStyle) : textSettings.borderStyle}
                                onChange={(e) => {
                                    const style = e.target.value;
                                    setTextSettings(prev => ({ ...prev, borderStyle: style }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { borderStyle: style });
                                        addToHistory("Border style changed.");
                                    }
                                }}
                                className="dinolabsImageEditorPositionInput"
                                style={{ margin: 0 }}
                            >
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                                <option value="double">Double</option>
                            </select>
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Border Radius</label>
                        <div className="dinolabsImageEditorCellFlex">
                            <input
                                type="number"
                                value={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.borderRadius || 0) : textSettings.borderRadius}
                                onChange={(e) => {
                                    const radius = Math.max(0, Math.min(50, Number(e.target.value)));
                                    setTextSettings(prev => ({ ...prev, borderRadius: radius }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { borderRadius: radius });
                                        addToHistory("Border radius changed.");
                                    }
                                }}
                                min="0"
                                max="50"
                                className="dinolabsImageEditorPositionInput"
                                style={{ margin: 0 }}
                            />

                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Box Shadow</label>
                        <div className="dinolabsImageEditorCellFlex">
                            <Tippy content={<DinoLabsColorPicker color={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.shadowColor || textSettings.shadowColor) : textSettings.shadowColor} onChange={(newColor) => {
                                setTextSettings(prev => ({ ...prev, shadowColor: newColor }));
                                if (editingTextId) {
                                    updateTextLayer(editingTextId, { shadowColor: newColor });
                                    addToHistory("Shadow color changed.");
                                }
                            }} />} visible={isTextShadowColorOpen} onClickOutside={() => setIsTextShadowColorOpen(false)} interactive={true} placement="right" className="color-picker-tippy" >
                                <label className="dinolabsImageEditorColorPicker" onClick={() => setIsTextShadowColorOpen((prev) => !prev)} style={{ backgroundColor: editingTextId ? (textLayers.find(t => t.id === editingTextId)?.shadowColor || textSettings.shadowColor) : textSettings.shadowColor, width: '40px', height: '30px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc' }} />
                            </Tippy>
                            <input
                                type="number"
                                value={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.shadowBlur || 0) : textSettings.shadowBlur}
                                onChange={(e) => {
                                    const blur = Math.max(0, Math.min(50, Number(e.target.value)));
                                    setTextSettings(prev => ({ ...prev, shadowBlur: blur }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { shadowBlur: blur });
                                        addToHistory("Shadow blur changed.");
                                    }
                                }}
                                min="0"
                                max="50"
                                className="dinolabsImageEditorPositionInput"
                                style={{ margin: 0 }}
                            />
                            <input
                                type="number"
                                value={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.shadowOffsetX || 0) : textSettings.shadowOffsetX}
                                onChange={(e) => {
                                    const offsetX = Math.max(-20, Math.min(20, Number(e.target.value)));
                                    setTextSettings(prev => ({ ...prev, shadowOffsetX: offsetX }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { shadowOffsetX: offsetX });
                                        addToHistory("Shadow offset changed.");
                                    }
                                }}
                                min="-20"
                                max="20"
                                className="dinolabsImageEditorPositionInput"
                                style={{ margin: 0 }}
                            />
                            <input
                                type="number"
                                value={editingTextId ? (textLayers.find(t => t.id === editingTextId)?.shadowOffsetY || 0) : textSettings.shadowOffsetY}
                                onChange={(e) => {
                                    const offsetY = Math.max(-20, Math.min(20, Number(e.target.value)));
                                    setTextSettings(prev => ({ ...prev, shadowOffsetY: offsetY }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { shadowOffsetY: offsetY });
                                        addToHistory("Shadow offset changed.");
                                    }
                                }}
                                min="-20"
                                max="20"
                                className="dinolabsImageEditorPositionInput"
                                style={{ margin: 0 }}
                            />
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Style</label>
                        <div className="dinolabsImageEditorCellFlex">
                            <button
                                onClick={() => {
                                    const currentWeight = editingTextId ? (textLayers.find(t => t.id === editingTextId)?.fontWeight || textSettings.fontWeight) : textSettings.fontWeight;
                                    const newWeight = currentWeight === 'bold' ? 'normal' : 'bold';
                                    setTextSettings(prev => ({ ...prev, fontWeight: newWeight }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { fontWeight: newWeight });
                                        addToHistory("Font weight changed.");
                                    }
                                }}
                                style={{ backgroundColor: (editingTextId ? (textLayers.find(t => t.id === editingTextId)?.fontWeight || textSettings.fontWeight) : textSettings.fontWeight) === 'bold' ? "#5C2BE2" : "" }}
                                className="dinolabsImageEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faBold} />
                            </button>
                            <button
                                onClick={() => {
                                    const currentStyle = editingTextId ? (textLayers.find(t => t.id === editingTextId)?.fontStyle || textSettings.fontStyle) : textSettings.fontStyle;
                                    const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
                                    setTextSettings(prev => ({ ...prev, fontStyle: newStyle }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { fontStyle: newStyle });
                                        addToHistory("Font style changed.");
                                    }
                                }}
                                style={{ backgroundColor: (editingTextId ? (textLayers.find(t => t.id === editingTextId)?.fontStyle || textSettings.fontStyle) : textSettings.fontStyle) === 'italic' ? "#5C2BE2" : "" }}
                                className="dinolabsImageEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faItalic} />
                            </button>
                            <button
                                onClick={() => {
                                    const currentDecoration = editingTextId ? (textLayers.find(t => t.id === editingTextId)?.textDecoration || textSettings.textDecoration) : textSettings.textDecoration;
                                    const newDecoration = currentDecoration === 'underline' ? 'none' : 'underline';
                                    setTextSettings(prev => ({ ...prev, textDecoration: newDecoration }));
                                    if (editingTextId) {
                                        updateTextLayer(editingTextId, { textDecoration: newDecoration });
                                        addToHistory("Text decoration changed.");
                                    }
                                }}
                                style={{ backgroundColor: (editingTextId ? (textLayers.find(t => t.id === editingTextId)?.textDecoration || textSettings.textDecoration) : textSettings.textDecoration) === 'underline' ? "#5C2BE2" : "" }}
                                className="dinolabsImageEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faUnderline} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Alignment</label>
                        <div className="dinolabsImageEditorCellFlex">
                            {['left', 'center', 'right'].map(align => (
                                <button
                                    key={align}
                                    onClick={() => {
                                        setTextSettings(prev => ({ ...prev, textAlign: align }));
                                        if (editingTextId) {
                                            updateTextLayer(editingTextId, { textAlign: align });
                                            addToHistory("Text alignment changed.");
                                        }
                                    }}
                                    style={{ backgroundColor: (editingTextId ? (textLayers.find(t => t.id === editingTextId)?.textAlign || textSettings.textAlign) : textSettings.textAlign) === align ? "#5C2BE2" : "" }}
                                    className="dinolabsImageEditorToolButton"
                                >
                                    <FontAwesomeIcon icon={align === 'left' ? faAlignLeft : align === 'center' ? faAlignCenter : faAlignRight} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="dinolabsImageEditorCellWrapper">
                    <div className="dinolabsImageEditorHeaderFlex">
                        <label className="dinolabsImageEditorCellTitle">
                            <FontAwesomeIcon icon={faShapes} /> Geometry Tool
                        </label>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <div className="dinolabsImageEditorCellFlex">
                            <button
                                onClick={() => {
                                    setActionMode(prev => prev === "Geometry" ? "Idle" : "Geometry");
                                    setIsCreatingPolygon(false);
                                    setCreatingPolygonPoints([]);
                                    addToHistory(`Geometry mode ${actionMode === "Geometry" ? 'disabled' : 'enabled'}.`);
                                }}
                                style={{
                                    backgroundColor: actionMode === "Geometry" ? "#5C2BE2" : "",
                                    opacity: isCropping ? "0.6" : "1.0"
                                }}
                                disabled={isCropping}
                                className="dinolabsImageEditorToolButtonBig"
                            >
                                Add Shape
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Shape Type</label>
                        <div className="dinolabsImageEditorCellFlex">
                            {[
                                { type: 'rectangle', icon: faSquare },
                                { type: 'circle', icon: faCircle },
                                { type: 'ellipse', icon: faVectorSquare },
                                { type: 'line', icon: faMinus },
                                { type: 'arrow', icon: faArrowRightLong },
                                { type: 'polygon', icon: faDrawPolygon },
                                { type: 'polyline', icon: faBezierCurve }
                            ].map(shape => (
                                <button
                                    key={shape.type}
                                    onClick={() => {
                                        setSelectedGeometryShape(shape.type);
                                        setIsCreatingPolygon(false);
                                        setCreatingPolygonPoints([]);
                                        if (actionMode !== "Geometry") {
                                            setActionMode("Geometry");
                                        }
                                        if (isCropping) {
                                            setIsCropping(false);
                                        }
                                        addToHistory(`Geometry shape changed to ${shape.type}.`);
                                    }}
                                    style={{
                                        backgroundColor: selectedGeometryShape === shape.type ? "#5C2BE2" : "",
                                        opacity: isCropping ? "0.6" : "1.0"
                                    }}
                                    disabled={isCropping}
                                    className="dinolabsImageEditorToolButton"
                                >
                                    <FontAwesomeIcon icon={shape.icon} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Font Settings</label>
                        <div className="dinolabsImageEditorCellFlex">
                            <input
                                type="number"
                                value={(() => {
                                    const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                    if (selectedGeometry) {
                                        const layer = geometryLayers.find(l => l.id === selectedGeometry);
                                        return layer ? layer.strokeWidth : geometrySettings.strokeWidth;
                                    }
                                    return editingGeometryId ? (geometryLayers.find(g => g.id === editingGeometryId)?.strokeWidth || geometrySettings.strokeWidth) : geometrySettings.strokeWidth;
                                })()}
                                onChange={(e) => {
                                    const width = Math.max(1, Math.min(20, Number(e.target.value)));
                                    setGeometrySettings(prev => ({ ...prev, strokeWidth: width }));
                                    const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                    if (selectedGeometry) {
                                        updateGeometryLayer(selectedGeometry, { strokeWidth: width });
                                        addToHistory("Stroke width changed.");
                                    } else if (editingGeometryId) {
                                        updateGeometryLayer(editingGeometryId, { strokeWidth: width });
                                        addToHistory("Stroke width changed.");
                                    }
                                }}
                                min="1"
                                max="20"
                                className="dinolabsImageEditorPositionInput"
                            />
                            <select
                                value={(() => {
                                    const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                    if (selectedGeometry) {
                                        const layer = geometryLayers.find(l => l.id === selectedGeometry);
                                        return layer ? layer.strokeStyle : geometrySettings.strokeStyle;
                                    }
                                    return editingGeometryId ? (geometryLayers.find(g => g.id === editingGeometryId)?.strokeStyle || geometrySettings.strokeStyle) : geometrySettings.strokeStyle;
                                })()}
                                onChange={(e) => {
                                    const style = e.target.value;
                                    setGeometrySettings(prev => ({ ...prev, strokeStyle: style }));
                                    const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                    if (selectedGeometry) {
                                        updateGeometryLayer(selectedGeometry, { strokeStyle: style });
                                        addToHistory("Stroke style changed.");
                                    } else if (editingGeometryId) {
                                        updateGeometryLayer(editingGeometryId, { strokeStyle: style });
                                        addToHistory("Stroke style changed.");
                                    }
                                }}
                                className="dinolabsImageEditorPositionInput"
                            >
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                            </select>
                        </div>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle">Colors</label>
                        <div className="dinolabsImageEditorCellFlex">
                            <Tippy content={<DinoLabsColorPicker color={(() => {
                                const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                if (selectedGeometry) {
                                    const layer = geometryLayers.find(l => l.id === selectedGeometry);
                                    return layer ? layer.strokeColor : geometrySettings.strokeColor;
                                }
                                return editingGeometryId ? (geometryLayers.find(g => g.id === editingGeometryId)?.strokeColor || geometrySettings.strokeColor) : geometrySettings.strokeColor;
                            })()} onChange={(newColor) => {
                                setGeometrySettings(prev => ({ ...prev, strokeColor: newColor }));
                                const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                if (selectedGeometry) {
                                    updateGeometryLayer(selectedGeometry, { strokeColor: newColor });
                                    addToHistory("Stroke color changed.");
                                } else if (editingGeometryId) {
                                    updateGeometryLayer(editingGeometryId, { strokeColor: newColor });
                                    addToHistory("Stroke color changed.");
                                }
                            }} />} visible={isGeometryStrokeColorOpen} onClickOutside={() => setIsGeometryStrokeColorOpen(false)} interactive={true} placement="right" className="color-picker-tippy" >
                                <label className="dinolabsImageEditorColorPicker" onClick={() => setIsGeometryStrokeColorOpen((prev) => !prev)} style={{
                                    backgroundColor: (() => {
                                        const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                        if (selectedGeometry) {
                                            const layer = geometryLayers.find(l => l.id === selectedGeometry);
                                            return layer ? layer.strokeColor : geometrySettings.strokeColor;
                                        }
                                        return editingGeometryId ? (geometryLayers.find(g => g.id === editingGeometryId)?.strokeColor || geometrySettings.strokeColor) : geometrySettings.strokeColor;
                                    })(), width: '40px', height: '30px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc'
                                }} />
                            </Tippy>
                            <Tippy content={<DinoLabsColorPicker color={(() => {
                                const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                if (selectedGeometry) {
                                    const layer = geometryLayers.find(l => l.id === selectedGeometry);
                                    const fillColor = layer ? layer.fillColor : geometrySettings.fillColor;
                                    return fillColor === 'transparent' ? '#ffffff' : fillColor;
                                }
                                const fillColor = editingGeometryId ? (geometryLayers.find(g => g.id === editingGeometryId)?.fillColor || geometrySettings.fillColor) : geometrySettings.fillColor;
                                return fillColor === 'transparent' ? '#ffffff' : fillColor;
                            })()} onChange={(newColor) => {
                                setGeometrySettings(prev => ({ ...prev, fillColor: newColor }));
                                const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                if (selectedGeometry) {
                                    updateGeometryLayer(selectedGeometry, { fillColor: newColor });
                                    addToHistory("Fill color changed.");
                                } else if (editingGeometryId) {
                                    updateGeometryLayer(editingGeometryId, { fillColor: newColor });
                                    addToHistory("Fill color changed.");
                                }
                            }} />} visible={isGeometryFillColorOpen} onClickOutside={() => setIsGeometryFillColorOpen(false)} interactive={true} placement="right" className="color-picker-tippy" >
                                <label className="dinolabsImageEditorColorPicker" onClick={() => setIsGeometryFillColorOpen((prev) => !prev)} style={{
                                    backgroundColor: (() => {
                                        const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                        if (selectedGeometry) {
                                            const layer = geometryLayers.find(l => l.id === selectedGeometry);
                                            const fillColor = layer ? layer.fillColor : geometrySettings.fillColor;
                                            return fillColor === 'transparent' ? '#ffffff' : fillColor;
                                        }
                                        const fillColor = editingGeometryId ? (geometryLayers.find(g => g.id === editingGeometryId)?.fillColor || geometrySettings.fillColor) : geometrySettings.fillColor;
                                        return fillColor === 'transparent' ? '#ffffff' : fillColor;
                                    })(), width: '40px', height: '30px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc'
                                }} />
                            </Tippy>
                        </div>
                    </div>
                    {(selectedGeometryShape === 'rectangle' || (() => {
                        const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                        if (selectedGeometry) {
                            const layer = geometryLayers.find(l => l.id === selectedGeometry);
                            return layer && layer.shape === 'rectangle';
                        }
                        return false;
                    })()) && (
                            <div className="dinolabsImageEditorCellFlexStack">
                                <label className="dinolabsImageEditorCellFlexTitle">Corner Radius</label>
                                <div className="dinolabsImageEditorCellFlex">
                                    <input
                                        type="number"
                                        value={(() => {
                                            const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                            if (selectedGeometry) {
                                                const layer = geometryLayers.find(l => l.id === selectedGeometry);
                                                return layer ? (layer.borderRadius || 0) : geometrySettings.borderRadius;
                                            }
                                            return editingGeometryId ? (geometryLayers.find(g => g.id === editingGeometryId)?.borderRadius || 0) : geometrySettings.borderRadius;
                                        })()}
                                        onChange={(e) => {
                                            const radius = Math.max(0, Math.min(50, Number(e.target.value)));
                                            setGeometrySettings(prev => ({ ...prev, borderRadius: radius }));
                                            const selectedGeometry = selectedLayers.find(id => geometryLayers.find(l => l.id === id));
                                            if (selectedGeometry) {
                                                updateGeometryLayer(selectedGeometry, { borderRadius: radius });
                                                addToHistory("Border radius changed.");
                                            } else if (editingGeometryId) {
                                                updateGeometryLayer(editingGeometryId, { borderRadius: radius });
                                                addToHistory("Border radius changed.");
                                            }
                                        }}
                                        min="0"
                                        max="50"
                                        className="dinolabsImageEditorPositionInput"
                                    />
                                    <label>px</label>
                                </div>
                            </div>
                        )}
                    {editingGeometryId && (
                        <div className="dinolabsImageEditorCellFlexStack">
                            <label className="dinolabsImageEditorCellFlexTitle">Editing Shape</label>
                            <div className="dinolabsImageEditorCellFlex" style={{ marginTop: '8px' }}>
                                <button
                                    onClick={() => {
                                        setEditingGeometryId(null);
                                        setActionMode("Idle");
                                        addToHistory("Geometry editing finished.");
                                    }}
                                    className="dinolabsImageEditorToolButtonBig"
                                    style={{ backgroundColor: "#4CAF50", color: "white" }}
                                >
                                    Done Editing
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="dinolabsImageEditorCellWrapper">
                    <div className="dinolabsImageEditorHeaderFlex">
                        <label className="dinolabsImageEditorCellTitle">
                            <FontAwesomeIcon icon={faBorderTopLeft} /> Corner Rounding
                        </label>
                        <label className="dinolabsConfrmationCheck">
                            <input type="checkbox" className="dinolabsSettingsCheckbox" checked={syncCorners} onChange={(e) => { setSyncCorners(e.target.checked); if (e.target.checked) { const radius = borderRadius || borderTopLeftRadius || 0; const limited = Math.min(radius, 100); setBorderRadius(limited); setBorderTopLeftRadius(limited); setBorderTopRightRadius(limited); setBorderBottomLeftRadius(limited); setBorderBottomRightRadius(limited); } addToHistory("Corner rounding changed."); }} />
                            <span> Sync Corners </span>
                        </label>
                    </div>
                    <div className="dinolabsImageEditorCellFlexStack">
                        <label className="dinolabsImageEditorCellFlexTitle"> Corner Radii </label>
                        <div className="dinolabsImageEditorCellFlex">
                            {syncCorners ? (
                                <input className="dinolabsImageEditorPositionInput" type="text" value={`Corner: ${borderRadius}px`} onChange={(e) => { const newVal = e.target.value.replace(/[^0-9]/g, ""); let val = Number(newVal); val = Math.min(val, 100); setBorderRadius(val); setBorderTopLeftRadius(val); setBorderTopRightRadius(val); setBorderBottomLeftRadius(val); setBorderBottomRightRadius(val); addToHistory("Corner rounding changed."); }} />
                            ) : (
                                <div className="dinolabsCornerInputGridWrapper">
                                    <div className="dinolabsCornerInputFlex">
                                        <input className="dinolabsImageEditorPositionInput" type="text" value={`TL: ${borderTopLeftRadius}px`} onChange={(e) => { const newVal = e.target.value.replace(/[^0-9]/g, ""); let val = Number(newVal); val = Math.min(val, 100); setBorderTopLeftRadius(val); addToHistory("Corner rounding changed."); }} />
                                        <input className="dinolabsImageEditorPositionInput" type="text" value={`TR: ${borderTopRightRadius}px`} onChange={(e) => { const newVal = e.target.value.replace(/[^0-9]/g, ""); let val = Number(newVal); val = Math.min(val, 100); setBorderTopRightRadius(val); addToHistory("Corner rounding changed."); }} />
                                    </div>
                                    <div className="dinolabsCornerInputFlex">
                                        <input className="dinolabsImageEditorPositionInput" type="text" value={`BL: ${borderBottomLeftRadius}px`} onChange={(e) => { const newVal = e.target.value.replace(/[^0-9]/g, ""); let val = Number(newVal); val = Math.min(val, 100); setBorderBottomLeftRadius(val); addToHistory("Corner rounding changed."); }} />
                                        <input className="dinolabsImageEditorPositionInput" type="text" value={`BR: ${borderBottomRightRadius}px`} onChange={(e) => { const newVal = e.target.value.replace(/[^0-9]/g, ""); let val = Number(newVal); val = Math.min(val, 100); setBorderBottomRightRadius(val); addToHistory("Corner rounding changed."); }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="dinolabsImageEditorCellWrapper">
                    <div className="dinolabsImageEditorHeaderFlex" style={{ marginBottom: 0 }}>
                        <label className="dinolabsImageEditorCellTitle">
                            <FontAwesomeIcon icon={faLayerGroup} /> Layers
                        </label>
                    </div>
                    <ul className="dinolabsTextEditorLayerList" style={{ listStyleType: 'none' }}>
                        <li
                            style={{ backgroundColor: selectedLayers.includes('base') ? "rgba(0,0,0,0.2)" : "" }}
                            onClick={(e) => handleLayerSelect('base', 'base', e)}
                        >
                            <small>Base</small>
                            <div className="dinolabsTextEditorLayerListFlex">
                                <button onClick={(e) => { e.stopPropagation(); setBaseVisible(!baseVisible); addToHistory("Layer visibility changed."); }} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={baseVisible ? faEye : faEyeSlash} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setBaseLocked(!baseLocked); addToHistory("Layer lock changed."); }} className="dinolabsImageEditorToolButton">
                                    <FontAwesomeIcon icon={baseLocked ? faLock : faLockOpen} />
                                </button>
                            </div>
                        </li>
                        {drawingLayers.map(layer => (
                            <li
                                key={`drawing-${layer.id}`}
                                className="dinolabsLayerItem"
                                style={{ backgroundColor: selectedLayers.includes(layer.id) ? "rgba(0,0,0,0.2)" : "" }}
                                onClick={(e) => handleLayerSelect(layer.id, 'drawing', e)}
                            >
                                <input
                                    className="dinolabsImageEditorPositionInput"
                                    style={{ maxWidth: "100%" }}
                                    value={layer.name}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setDrawingLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: e.target.value } : l));
                                        addToHistory("Layer name changed.");
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="dinolabsTextEditorLayerListFlex">
                                    <button onClick={(e) => { e.stopPropagation(); setDrawingLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); addToHistory("Layer visibility changed."); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={layer.visible ? faEye : faEyeSlash} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setDrawingLayers(prev => prev.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)); addToHistory("Layer lock changed."); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={layer.locked ? faLock : faLockOpen} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveDrawingLayer(layer.id, -1); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faArrowUp} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveDrawingLayer(layer.id, 1); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faArrowDown} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id, 'drawing'); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </li>
                        ))}
                        {imageLayers.map(layer => (
                            <li
                                key={`image-${layer.id}`}
                                style={{ backgroundColor: selectedLayers.includes(layer.id) ? "rgba(0,0,0,0.2)" : "" }}
                                onClick={(e) => handleLayerSelect(layer.id, 'image', e)}
                            >
                                <input
                                    className="dinolabsImageEditorPositionInput"
                                    style={{ maxWidth: "100%" }}
                                    value={layer.name}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setImageLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: e.target.value } : l));
                                        addToHistory("Layer name changed.");
                                    }}
                                    onClick={(e) => e.stopPropagation()}


                                />
                                <div className="dinolabsTextEditorLayerListFlex">
                                    <button onClick={(e) => { e.stopPropagation(); setImageLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); addToHistory("Layer visibility changed."); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={layer.visible ? faEye : faEyeSlash} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setImageLayers(prev => prev.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)); addToHistory("Layer lock changed."); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={layer.locked ? faLock : faLockOpen} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveImageLayer(layer.id, -1); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faArrowUp} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveImageLayer(layer.id, 1); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faArrowDown} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id, 'image'); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </li>
                        ))}
                        {textLayers.map(layer => (
                            <li
                                key={`text-${layer.id}`}
                                className="dinolabsLayerItem"
                                style={{ backgroundColor: selectedLayers.includes(layer.id) ? "rgba(0,0,0,0.2)" : "" }}
                                onClick={(e) => handleLayerSelect(layer.id, 'text', e)}
                            >
                                <input
                                    className="dinolabsImageEditorPositionInput"
                                    style={{ maxWidth: "100%" }}
                                    value={layer.name}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: e.target.value } : l));
                                        addToHistory("Layer name changed");
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="dinolabsTextEditorLayerListFlex">
                                    <button onClick={(e) => { e.stopPropagation(); setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); addToHistory("Layer visibility changed."); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={layer.visible ? faEye : faEyeSlash} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)); addToHistory("Layer lock changed."); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={layer.locked ? faLock : faLockOpen} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveTextLayer(layer.id, -1); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faArrowUp} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveTextLayer(layer.id, 1); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faArrowDown} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id, 'text'); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </li>
                        ))}
                        {geometryLayers.map(layer => (
                            <li
                                key={`geometry-${layer.id}`}
                                className="dinolabsLayerItem"
                                style={{ backgroundColor: selectedLayers.includes(layer.id) ? "rgba(0,0,0,0.2)" : "" }}
                                onClick={(e) => handleLayerSelect(layer.id, 'geometry', e)}
                            >
                                <input
                                    className="dinolabsImageEditorPositionInput"
                                    style={{ maxWidth: "100%" }}
                                    value={layer.name}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setGeometryLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: e.target.value } : l));
                                        addToHistory("Layer name changed.");
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="dinolabsTextEditorLayerListFlex">
                                    <button onClick={(e) => { e.stopPropagation(); setGeometryLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); addToHistory("Layer visibility changed."); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={layer.visible ? faEye : faEyeSlash} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setGeometryLayers(prev => prev.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)); addToHistory("Layer lock changed."); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={layer.locked ? faLock : faLockOpen} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveGeometryLayer(layer.id, -1); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faArrowUp} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveGeometryLayer(layer.id, 1); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faArrowDown} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id, 'geometry'); }} className="dinolabsImageEditorToolButton">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="dinolabsImageEditorContainerWrapper">
                <div
                    className="dinolabsImageEditorContainer"
                    style={{
                        cursor: actionMode === "Text" ? "crosshair" : actionMode === "Geometry" ? "crosshair" : "grab",
                        height: "90%",
                        border: isDraggingOver ? "2px dashed #5C2BE2" : "none",
                        backgroundColor: isDraggingOver ? "rgba(92, 43, 226, 0.05)" : "",
                        transition: "all 0.2s ease"
                    }}
                    ref={containerRef}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={(e) => {
                        if (actionMode === "Idle") {
                            setSelectedLayers(['base']);
                            addToHistory("Layer selected.");
                        } else if (actionMode === "Text") {
                            const rect = containerRef.current.getBoundingClientRect();
                            const x = e.clientX - rect.left - containerRef.current.clientWidth / 2 - panX + imageWidth / 2;
                            const y = e.clientY - rect.top - containerRef.current.clientHeight / 2 - panY + imageHeight / 2;
                            if (x >= 0 && x <= imageWidth && y >= 0 && y <= imageHeight) {
                                const nativeX = (x / imageWidth) * nativeWidth;
                                const nativeY = (y / imageHeight) * nativeHeight;
                                addTextLayer(nativeX, nativeY);
                            }
                        }
                    }}
                >
                    <div className="dinolabsImageResizer" style={{ top: `calc(50% + ${panY}px)`, left: `calc(50% + ${panX}px)`, width: `${imageWidth}px`, height: `${imageHeight}px`, transform: `translate(-50%, -50%) scale(${baseZoom}, ${baseZoom}) rotate(${baseRotation}deg)`, borderRadius: syncCorners ? `${borderRadius}px` : `${borderTopLeftRadius}px ${borderTopRightRadius}px ${borderBottomRightRadius}px ${borderBottomLeftRadius}px`, border: selectedLayers.includes('base') && actionMode === "Idle" ? "2px dashed #5C2BE2" : "none" }} >
                        <img src={url} alt="Media content" draggable={false} onDragStart={(e) => e.preventDefault()} onClick={handleBaseImageClick} className="dinolabsImageEditorContent" style={getBaseImageStyle()} />

                        {imageLayers.filter(layer => layer.visible).map(layer => (
                            <div
                                key={`image-layer-${layer.id}`}
                                style={getImageLayerStyle(layer)}
                                onMouseDown={(e) => handleImageLayerMouseDown(layer.id, e)}
                                onClick={(e) => handleImageLayerClick(layer.id, e)}
                            >
                                <img
                                    src={layer.url}
                                    alt={layer.name}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain",
                                        userSelect: "none",
                                        pointerEvents: "none"
                                    }}
                                    draggable={false}
                                />

                                {selectedLayers.includes(layer.id) && actionMode === "Idle" && !layer.locked && (
                                    <>
                                        <div className="dinolabsImageEditorResizeHandle top-left" onMouseDown={(e) => handleImageLayerResizeMouseDown(layer.id, "top-left", e)} style={{ top: `-6px`, left: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle top-right" onMouseDown={(e) => handleImageLayerResizeMouseDown(layer.id, "top-right", e)} style={{ top: `-6px`, right: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle bottom-left" onMouseDown={(e) => handleImageLayerResizeMouseDown(layer.id, "bottom-left", e)} style={{ bottom: `-6px`, left: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle bottom-right" onMouseDown={(e) => handleImageLayerResizeMouseDown(layer.id, "bottom-right", e)} style={{ bottom: `-6px`, right: `-6px` }} />
                                    </>
                                )}
                            </div>
                        ))}

                        {textLayers.filter(layer => layer.visible).map(layer => (
                            <div
                                key={`text-layer-${layer.id}`}
                                style={{
                                    position: "absolute",
                                    left: `${(layer.x / nativeWidth) * 100}%`,
                                    top: `${(layer.y / nativeHeight) * 100}%`,
                                    width: `${(layer.width / nativeWidth) * 100}%`,
                                    height: `${(layer.height / nativeHeight) * 100}%`,
                                    transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                                    opacity: (layer.opacity || 100) / 100,
                                    filter: `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%) ${(layer.spread || 0) ? `drop-shadow(0 0 ${layer.spread}px rgba(0,0,0,0.5))` : ""}`,
                                    cursor: actionMode === "Idle" ? (selectedLayers.includes(layer.id) ? "move" : "pointer") : actionMode === "Text" ? "text" : "default",
                                    outline: selectedLayers.includes(layer.id) && actionMode === "Idle" ? "2px dashed #5C2BE2" : "none",
                                    outlineOffset: selectedLayers.includes(layer.id) && actionMode === "Idle" ? "2px" : "0px",
                                    pointerEvents: layer.locked ? "none" : "auto",
                                    fontSize: `${(layer.fontSize / nativeHeight) * imageHeight}px`,
                                    fontFamily: layer.fontFamily || 'Arial',
                                    fontWeight: layer.fontWeight || 'normal',
                                    fontStyle: layer.fontStyle || 'normal',
                                    textDecoration: layer.textDecoration || 'none',
                                    textAlign: layer.textAlign || 'left',
                                    color: layer.color || '#000000',
                                    backgroundColor: layer.backgroundColor === 'transparent' ? 'transparent' : layer.backgroundColor,
                                    padding: `${(layer.padding / nativeHeight) * imageHeight}px`,
                                    border: layer.borderWidth ? `${(layer.borderWidth / nativeHeight) * imageHeight}px ${layer.borderStyle} ${layer.borderColor}` : 'none',
                                    borderRadius: layer.borderRadius ? `${(layer.borderRadius / nativeHeight) * imageHeight}px` : '0px',
                                    boxShadow: layer.shadowBlur ? `${(layer.shadowOffsetX / nativeWidth) * imageWidth}px ${(layer.shadowOffsetY / nativeHeight) * imageHeight}px ${(layer.shadowBlur / nativeHeight) * imageHeight}px ${layer.shadowColor}` : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: layer.textAlign === 'center' ? 'center' : layer.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                    wordWrap: 'break-word',
                                    overflow: 'visiible'
                                }}
                                onMouseDown={(e) => handleTextLayerMouseDown(layer.id, e)}
                                onClick={(e) => handleTextLayerClick(layer.id, e)}
                                onDoubleClick={(e) => {
                                    if (actionMode === "Idle") {
                                        e.stopPropagation();
                                        setEditingTextId(layer.id);
                                        setActionMode("Text");
                                        addToHistory("Text editing started.");
                                    }
                                }}
                            >
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                                    {editingTextId === layer.id ? (
                                        <textarea
                                            value={layer.text}
                                            onChange={(e) => {
                                                updateTextLayer(layer.id, { text: e.target.value });
                                            }}
                                            onBlur={(e) => {
                                                const isToolbarElement = e.relatedTarget && (
                                                    e.relatedTarget.closest('.dinolabsImageEditorToolbar') ||
                                                    e.relatedTarget.closest('.dinolabsImageEditorCellWrapper') ||
                                                    e.relatedTarget.closest('.tippy-box') ||
                                                    e.relatedTarget.closest('.color-picker-tippy')
                                                );

                                                if (!isToolbarElement) {
                                                    setEditingTextId(null);
                                                    setActionMode("Idle");
                                                    addToHistory("Text editing finished.");
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                e.stopPropagation();
                                                if (e.key === 'Escape') {
                                                    setEditingTextId(null);
                                                    setActionMode("Idle");
                                                    addToHistory("Text editing cancelled.");
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                border: 'none',
                                                outline: 'none',
                                                background: 'transparent',
                                                fontSize: 'inherit',
                                                fontFamily: layer.fontFamily || 'Arial',
                                                fontWeight: 'inherit',
                                                fontStyle: 'inherit',
                                                textDecoration: 'inherit',
                                                textAlign: 'inherit',
                                                color: 'inherit',
                                                resize: 'none',
                                                overflow: 'hidden'
                                            }}
                                            autoFocus
                                        />
                                    ) : (
                                        <span style={{ whiteSpace: 'pre-wrap', width: '100%' }}>
                                            {layer.text}
                                        </span>
                                    )}
                                </div>

                                {selectedLayers.includes(layer.id) && actionMode === "Idle" && !layer.locked && (
                                    <>
                                        <div className="dinolabsImageEditorResizeHandle top-left" onMouseDown={(e) => handleTextLayerResizeMouseDown(layer.id, "top-left", e)} style={{ top: `-6px`, left: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle top-right" onMouseDown={(e) => handleTextLayerResizeMouseDown(layer.id, "top-right", e)} style={{ top: `-6px`, right: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle bottom-left" onMouseDown={(e) => handleTextLayerResizeMouseDown(layer.id, "bottom-left", e)} style={{ bottom: `-6px`, left: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle bottom-right" onMouseDown={(e) => handleTextLayerResizeMouseDown(layer.id, "bottom-right", e)} style={{ bottom: `-6px`, right: `-6px` }} />
                                    </>
                                )}
                            </div>
                        ))}

                        {geometryLayers.filter(layer => layer.visible).map(layer => (
                            <div
                                key={`geometry-layer-${layer.id}`}
                                style={getGeometryLayerStyle(layer)}
                                onMouseDown={(e) => handleGeometryLayerMouseDown(layer.id, e)}
                                onClick={(e) => handleGeometryLayerClick(layer.id, e)}
                                onDoubleClick={(e) => {
                                    if (actionMode === "Idle") {
                                        e.stopPropagation();
                                        setEditingGeometryId(layer.id);
                                        setActionMode("Geometry");
                                        addToHistory("Geometry editing started.");
                                    }
                                }}
                            >
                                {renderGeometryShape(layer)}

                                {selectedLayers.includes(layer.id) && actionMode === "Idle" && !layer.locked && (
                                    <>
                                        <div className="dinolabsImageEditorResizeHandle top-left" onMouseDown={(e) => handleGeometryLayerResizeMouseDown(layer.id, "top-left", e)} style={{ top: `-6px`, left: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle top-right" onMouseDown={(e) => handleGeometryLayerResizeMouseDown(layer.id, "top-right", e)} style={{ top: `-6px`, right: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle bottom-left" onMouseDown={(e) => handleGeometryLayerResizeMouseDown(layer.id, "bottom-left", e)} style={{ bottom: `-6px`, left: `-6px` }} />
                                        <div className="dinolabsImageEditorResizeHandle bottom-right" onMouseDown={(e) => handleGeometryLayerResizeMouseDown(layer.id, "bottom-right", e)} style={{ bottom: `-6px`, right: `-6px` }} />
                                    </>
                                )}
                            </div>
                        ))}

                        {drawingLayers.filter(layer => layer.visible).map((layer) => {
                            const bounds = getPathBounds(layer.d);
                            const padding = Math.max(layer.strokeWidth || 3, 10);
                            
                            return (
                                <div
                                    key={`drawing-layer-container-${layer.id}`}
                                    style={{
                                        position: "absolute",
                                        left: `${((bounds.x - padding + (layer.x || 0)) / nativeWidth) * 100}%`,
                                        top: `${((bounds.y - padding + (layer.y || 0)) / nativeHeight) * 100}%`,
                                        width: `${((bounds.width + padding * 2) / nativeWidth) * 100}%`,
                                        height: `${((bounds.height + padding * 2) / nativeHeight) * 100}%`,
                                        transform: `rotate(${layer.rotation || 0}deg) scale(${(layer.zoom || 1) * (layer.flipX || 1)}, ${(layer.zoom || 1) * (layer.flipY || 1)})`,
                                        opacity: (layer.opacity || 100) / 100,
                                        filter: `hue-rotate(${layer.hue || 0}deg) saturate(${layer.saturation || 100}%) brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) blur(${layer.blur || 0}px) grayscale(${layer.grayscale || 0}%) sepia(${layer.sepia || 0}%) ${(layer.spread || 0) ? `drop-shadow(0 0 ${layer.spread}px rgba(0,0,0,0.5))` : ""}`,
                                        outline: selectedLayers.includes(layer.id) && actionMode === "Idle" ? "2px dashed #5C2BE2" : "none",
                                        outlineOffset: "0px",
                                        pointerEvents: layer.locked ? "none" : "auto",
                                        cursor: actionMode === "Idle" ? (selectedLayers.includes(layer.id) ? "move" : "pointer") : "default"
                                    }}
                                    onMouseDown={(e) => handleDrawingLayerMouseDown(layer.id, e)}
                                    onClick={(e) => {
                                        if (actionMode === "Idle") {
                                            e.stopPropagation();
                                            if (e.ctrlKey || e.metaKey) {
                                                setSelectedLayers(prev =>
                                                    prev.includes(layer.id)
                                                        ? prev.filter(id => id !== layer.id)
                                                        : [...prev, layer.id]
                                                );
                                            } else {
                                                setSelectedLayers([layer.id]);
                                            }
                                            addToHistory("Layer selected.");
                                        }
                                    }}
                                >
                                    <svg 
                                        viewBox={`${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "100%",
                                            overflow: "visible"
                                        }}
                                    >
                                        <path 
                                            d={layer.d} 
                                            stroke={layer.color} 
                                            strokeWidth={layer.strokeWidth} 
                                            fill="none" 
                                            strokeLinecap="round" 
                                            vectorEffect="non-scaling-stroke" 
                                        />
                                    </svg>

                                    {selectedLayers.includes(layer.id) && actionMode === "Idle" && !layer.locked && (
                                        <>
                                            <div className="dinolabsImageEditorResizeHandle top-left" onMouseDown={(e) => handleDrawingLayerResizeMouseDown(layer.id, "top-left", e)} style={{ top: `-6px`, left: `-6px` }} />
                                            <div className="dinolabsImageEditorResizeHandle top-right" onMouseDown={(e) => handleDrawingLayerResizeMouseDown(layer.id, "top-right", e)} style={{ top: `-6px`, right: `-6px` }} />
                                            <div className="dinolabsImageEditorResizeHandle bottom-left" onMouseDown={(e) => handleDrawingLayerResizeMouseDown(layer.id, "bottom-left", e)} style={{ bottom: `-6px`, left: `-6px` }} />
                                            <div className="dinolabsImageEditorResizeHandle bottom-right" onMouseDown={(e) => handleDrawingLayerResizeMouseDown(layer.id, "bottom-right", e)} style={{ bottom: `-6px`, right: `-6px` }} />
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {(actionMode === "Drawing" || actionMode === "Highlighting" || actionMode === "Geometry") && (
                            <svg viewBox={`0 0 ${nativeWidth} ${nativeHeight}`} style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                pointerEvents: "auto"
                            }} onMouseDown={handleSvgMouseDown} onMouseMove={handleSvgMouseMove} onMouseUp={handleSvgMouseUp} onContextMenu={handleSvgRightClick} >
                                {tempPath && (
                                    <path d={tempPath.d} stroke={tempPath.color} strokeWidth={tempPath.width} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                )}
                                {tempGeometry && (
                                    <>
                                        {tempGeometry.shape === 'rectangle' && (
                                            <rect
                                                x={tempGeometry.x}
                                                y={tempGeometry.y}
                                                width={tempGeometry.width}
                                                height={tempGeometry.height}
                                                rx={tempGeometry.borderRadius}
                                                ry={tempGeometry.borderRadius}
                                                stroke={tempGeometry.strokeColor}
                                                fill={tempGeometry.fillColor === 'transparent' ? 'none' : tempGeometry.fillColor}
                                                strokeWidth={tempGeometry.strokeWidth}
                                                strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        )}
                                        {tempGeometry.shape === 'circle' && (
                                            <circle
                                                cx={tempGeometry.x + tempGeometry.width / 2}
                                                cy={tempGeometry.y + tempGeometry.height / 2}
                                                r={Math.min(tempGeometry.width, tempGeometry.height) / 2}
                                                stroke={tempGeometry.strokeColor}
                                                fill={tempGeometry.fillColor === 'transparent' ? 'none' : tempGeometry.fillColor}
                                                strokeWidth={tempGeometry.strokeWidth}
                                                strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        )}
                                        {tempGeometry.shape === 'ellipse' && (
                                            <ellipse
                                                cx={tempGeometry.x + tempGeometry.width / 2}
                                                cy={tempGeometry.y + tempGeometry.height / 2}
                                                rx={tempGeometry.width / 2}
                                                ry={tempGeometry.height / 2}
                                                stroke={tempGeometry.strokeColor}
                                                fill={tempGeometry.fillColor === 'transparent' ? 'none' : tempGeometry.fillColor}
                                                strokeWidth={tempGeometry.strokeWidth}
                                                strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        )}
                                        {tempGeometry.shape === 'line' && (
                                            <line
                                                x1={tempGeometry.x1}
                                                y1={tempGeometry.y1}
                                                x2={tempGeometry.x2}
                                                y2={tempGeometry.y2}
                                                stroke={tempGeometry.strokeColor}
                                                strokeWidth={tempGeometry.strokeWidth}
                                                strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        )}
                                        {tempGeometry.shape === 'arrow' && (
                                            <>
                                                <defs>
                                                    <marker
                                                        id="temp-arrowhead"
                                                        markerWidth={tempGeometry.strokeWidth * 2}
                                                        markerHeight={tempGeometry.strokeWidth * 2}
                                                        refX={tempGeometry.strokeWidth * 2 - 1}
                                                        refY={tempGeometry.strokeWidth}
                                                        orient="auto"
                                                    >
                                                        <polygon
                                                            points={`0 0, ${tempGeometry.strokeWidth * 2} ${tempGeometry.strokeWidth}, 0 ${tempGeometry.strokeWidth * 2}`}
                                                            fill={tempGeometry.strokeColor}
                                                        />
                                                    </marker>
                                                </defs>
                                                <line
                                                    x1={tempGeometry.x1}
                                                    y1={tempGeometry.y1}
                                                    x2={tempGeometry.x2}
                                                    y2={tempGeometry.y2}
                                                    stroke={tempGeometry.strokeColor}
                                                    strokeWidth={tempGeometry.strokeWidth}
                                                    strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                                    markerEnd="url(#temp-arrowhead)"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            </>
                                        )}
                                        {tempGeometry.shape === 'polygon' && tempGeometry.points && (
                                            <polygon
                                                points={tempGeometry.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                stroke={tempGeometry.strokeColor}
                                                fill={tempGeometry.fillColor === 'transparent' ? 'none' : tempGeometry.fillColor}
                                                strokeWidth={tempGeometry.strokeWidth}
                                                strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        )}
                                        {tempGeometry.shape === 'polyline' && tempGeometry.points && (
                                            <polyline
                                                points={tempGeometry.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                stroke={tempGeometry.strokeColor}
                                                fill="none"
                                                strokeWidth={tempGeometry.strokeWidth}
                                                strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        )}
                                    </>
                                )}
                            </svg>
                        )}
                        {tempPath && (
                            <path d={tempPath.d} stroke={tempPath.color} strokeWidth={tempPath.width} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        )}
                        {tempGeometry && (
                            <>
                                {tempGeometry.shape === 'rectangle' && (
                                    <rect
                                        x={tempGeometry.x}
                                        y={tempGeometry.y}
                                        width={tempGeometry.width}
                                        height={tempGeometry.height}
                                        rx={tempGeometry.borderRadius}
                                        ry={tempGeometry.borderRadius}
                                        stroke={tempGeometry.strokeColor}
                                        fill={tempGeometry.fillColor === 'transparent' ? 'none' : tempGeometry.fillColor}
                                        strokeWidth={tempGeometry.strokeWidth}
                                        strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {tempGeometry.shape === 'circle' && (
                                    <circle
                                        cx={tempGeometry.x + tempGeometry.width / 2}
                                        cy={tempGeometry.y + tempGeometry.height / 2}
                                        r={Math.min(tempGeometry.width, tempGeometry.height) / 2}
                                        stroke={tempGeometry.strokeColor}
                                        fill={tempGeometry.fillColor === 'transparent' ? 'none' : tempGeometry.fillColor}
                                        strokeWidth={tempGeometry.strokeWidth}
                                        strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {tempGeometry.shape === 'ellipse' && (
                                    <ellipse
                                        cx={tempGeometry.x + tempGeometry.width / 2}
                                        cy={tempGeometry.y + tempGeometry.height / 2}
                                        rx={tempGeometry.width / 2}
                                        ry={tempGeometry.height / 2}
                                        stroke={tempGeometry.strokeColor}
                                        fill={tempGeometry.fillColor === 'transparent' ? 'none' : tempGeometry.fillColor}
                                        strokeWidth={tempGeometry.strokeWidth}
                                        strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {tempGeometry.shape === 'line' && (
                                    <line
                                        x1={tempGeometry.x1}
                                        y1={tempGeometry.y1}
                                        x2={tempGeometry.x2}
                                        y2={tempGeometry.y2}
                                        stroke={tempGeometry.strokeColor}
                                        strokeWidth={tempGeometry.strokeWidth}
                                        strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {tempGeometry.shape === 'arrow' && (
                                    <>
                                        <defs>
                                            <marker
                                                id="temp-arrowhead"
                                                markerWidth={tempGeometry.strokeWidth * 2}
                                                markerHeight={tempGeometry.strokeWidth * 2}
                                                refX={tempGeometry.strokeWidth * 2 - 1}
                                                refY={tempGeometry.strokeWidth}
                                                orient="auto"
                                            >
                                                <polygon
                                                    points={`0 0, ${tempGeometry.strokeWidth * 2} ${tempGeometry.strokeWidth}, 0 ${tempGeometry.strokeWidth * 2}`}
                                                    fill={tempGeometry.strokeColor}
                                                />
                                            </marker>
                                        </defs>
                                        <line
                                            x1={tempGeometry.x1}
                                            y1={tempGeometry.y1}
                                            x2={tempGeometry.x2}
                                            y2={tempGeometry.y2}
                                            stroke={tempGeometry.strokeColor}
                                            strokeWidth={tempGeometry.strokeWidth}
                                            strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                            markerEnd="url(#temp-arrowhead)"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    </>
                                )}
                                {tempGeometry.shape === 'polygon' && tempGeometry.points && (
                                    <polygon
                                        points={tempGeometry.points.map(p => `${p.x},${p.y}`).join(' ')}
                                        stroke={tempGeometry.strokeColor}
                                        fill={tempGeometry.fillColor === 'transparent' ? 'none' : tempGeometry.fillColor}
                                        strokeWidth={tempGeometry.strokeWidth}
                                        strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {tempGeometry.shape === 'polyline' && tempGeometry.points && (
                                    <polyline
                                        points={tempGeometry.points.map(p => `${p.x},${p.y}`).join(' ')}
                                        stroke={tempGeometry.strokeColor}
                                        fill="none"
                                        strokeWidth={tempGeometry.strokeWidth}
                                        strokeDasharray={tempGeometry.strokeStyle === 'dashed' ? '5,5' : tempGeometry.strokeStyle === 'dotted' ? '2,2' : ''}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                            </>
                        )}

                        {!isCropping && actionMode === "Idle" && selectedLayers.includes('base') && (
                            <>
                                <div className="dinolabsImageEditorResizeHandle top-left" onMouseDown={(e) => handleResizeMouseDown("top-left", e)} style={{ top: `-6px`, left: `-6px` }} />
                                <div className="dinolabsImageEditorResizeHandle top-right" onMouseDown={(e) => handleResizeMouseDown("top-right", e)} style={{ top: `-6px`, right: `-6px` }} />
                                <div className="dinolabsImageEditorResizeHandle bottom-left" onMouseDown={(e) => handleResizeMouseDown("bottom-left", e)} style={{ bottom: `-6px`, left: `-6px` }} />
                                <div className="dinolabsImageEditorResizeHandle bottom-right" onMouseDown={(e) => handleResizeMouseDown("bottom-right", e)} style={{ bottom: `-6px`, right: `-6px` }} />
                            </>
                        )}

                        {isCropping && (
                            <div className="dinolabsImageEditorCropRectangle" style={{ position: "absolute", border: "0.4vh dashed rgba(31, 174, 245, 1)", backgroundColor: "rgba(0,0,0,0.6)", left: cropRect.x, top: cropRect.y, width: cropRect.width, height: cropRect.height, transform: `rotate(${cropRotation}deg)`, borderRadius: circleCrop ? "50%" : "0", zIndex: 10 }} onMouseDown={handleCropMouseDown} >
                                <div className="dinolabsImageEditorResizeHandle top-left" style={{ pointerEvents: "auto", top: `-8px`, left: `-8px` }} onMouseDown={(e) => handleCropResizeMouseDown("top-left", e)} />
                                <div className="dinolabsImageEditorResizeHandle top-right" style={{ pointerEvents: "auto", top: `-8px`, right: `-8px` }} onMouseDown={(e) => handleCropResizeMouseDown("top-right", e)} />
                                <div className="dinolabsImageEditorResizeHandle bottom-left" style={{ pointerEvents: "auto", bottom: `-8px`, left: `-8px` }} onMouseDown={(e) => handleCropResizeMouseDown("bottom-left", e)} />
                                <div className="dinolabsImageEditorResizeHandle bottom-right" style={{ pointerEvents: "auto", bottom: `-8px`, right: `-8px` }} onMouseDown={(e) => handleCropResizeMouseDown("bottom-right", e)} />
                                <div className="dinolabsImageEditorRotationHandle top-left" style={{ pointerEvents: "auto", position: "absolute", top: "-30px", left: "-30px" }} onMouseDown={handleCropRotationMouseDown} />
                                <div className="dinolabsImageEditorRotationHandle top-right" style={{ pointerEvents: "auto", position: "absolute", top: "-30px", right: "-30px" }} onMouseDown={handleCropRotationMouseDown} />
                                <div className="dinolabsImageEditorRotationHandle bottom-left" style={{ pointerEvents: "auto", position: "absolute", bottom: "-30px", left: "-30px" }} onMouseDown={handleCropRotationMouseDown} />
                                <div className="dinolabsImageEditorRotationHandle bottom-right" style={{ pointerEvents: "auto", position: "absolute", bottom: "-30px", right: "-30px" }} onMouseDown={handleCropRotationMouseDown} />
                            </div>
                        )}
                    </div>
                </div>
                <div className="dinolabsVideoInputBottomBar">

                </div>
            </div>
        </div>
    );
}

export default DinoLabsImageEditor;