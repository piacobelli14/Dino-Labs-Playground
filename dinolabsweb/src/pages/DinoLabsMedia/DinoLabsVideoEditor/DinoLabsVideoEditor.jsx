import React, { useState, useEffect, useRef } from "react";
import "../../../styles/mainStyles/DinoLabsVideoEditor/DinoLabsVideoEditor.css";
import "../../../styles/helperStyles/Slider.css";
import "../../../styles/helperStyles/Checkbox.css";
import DinoLabsColorPicker from "../../../helpers/ColorPicker.jsx";
import { showDialog } from "../../../helpers/Alert.jsx";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft, faArrowRight, faArrowsLeftRightToLine, faArrowsRotate, faArrowsUpToLine, faBackward,
  faBorderTopLeft, faBrush, faCircle, faCropSimple, faDownload, faFilm, faForward, faLeftRight,
  faMagnifyingGlassMinus, faMagnifyingGlassPlus, faMinus, faPause, faPlay, faPlus, faRepeat,
  faRotateLeft, faRotateRight, faRulerCombined, faSave, faScissors, faSquare, faSquareCaretLeft,
  faSwatchbook, faTabletScreenButton, faTape, faUpDown, faCut, faObjectGroup, faExpand, faCompress,
  faStepBackward, faStepForward, faVolumeUp, faVolumeOff, faFont, faLayerGroup, faMagic, faClone,
  faTrash, faEye, faEyeSlash, faLock, faUnlock, faGripVertical, faSearchPlus, faSearchMinus,
  faAlignLeft, faAlignCenter, faAlignRight, faBold, faItalic, faUnderline, faMusic, faWaveSquare,
  faVolumeXmark, faUndo, faRedo, faSquarePlus
} from "@fortawesome/free-solid-svg-icons";
const DinoLabsVideoEditorToolbar = ({
  showFrameBar, framesPanelMode, resetVideo, downloadVideo, panX, panY, setPanX, setPanY, maintainAspectRatio, setMaintainAspectRatio,
  videoWidth, videoHeight, setVideoWidth, setVideoHeight, restoreAspectRatioWidth, restoreAspectRatioHeight, actionMode, setActionMode,
  isCropDisabled, isCropping, mediaType, finalizeCrop, setCropRect, setIsCropping, setCircleCrop, circleCrop, undoCrop,
  setOpacity, opacity, setHue, hue, setSaturation, saturation, setBrightness, brightness, setContrast, contrast, setBlur, blur,
  setSpread, spread, setGrayscale, grayscale, setSepia, sepia, syncCorners, setSyncCorners, borderRadius, setBorderRadius,
  borderTopLeftRadius, setBorderTopLeftRadius, borderTopRightRadius, setBorderTopRightRadius, borderBottomLeftRadius,
  setBorderBottomLeftRadius, borderBottomRightRadius, setBorderBottomRightRadius, handleZoomIn, handleZoomOut,
  handleRotateLeft, handleRotateRight, handleFlipHorizontal, handleFlipVertical, showTextEditor, setShowTextEditor,
  textOverlays, onAddTextOverlay, onUpdateTextOverlay, onDeleteTextOverlay, selectedTextOverlay, setSelectedTextOverlay
}) => {
  const cropClick = async () => {
    if (isCropDisabled) return;
    if (isCropping) {
      if (mediaType === "video") await finalizeCrop();
    } else {
      setCropRect({ x: 0, y: 0, width: videoWidth, height: videoHeight });
      setIsCropping(true);
      setCircleCrop(false);
      setActionMode("Cropping");
    }
  };
  const layoutButtons = [
    { tip: "Zoom In", onClick: handleZoomIn, icon: faMagnifyingGlassPlus },
    { tip: "Zoom Out", onClick: handleZoomOut, icon: faMagnifyingGlassMinus },
    { tip: "Rotate Left", onClick: handleRotateLeft, icon: faRotateLeft },
    { tip: "Rotate Right", onClick: handleRotateRight, icon: faRotateRight },
    { tip: "Flip Horizontally", onClick: handleFlipHorizontal, icon: faLeftRight },
    { tip: "Flip Vertically", onClick: handleFlipVertical, icon: faUpDown },
  ];
  const dimButtons = [
    { tip: "Restore Width Based Aspect Ratio", onClick: restoreAspectRatioWidth, icon: faArrowsLeftRightToLine },
    { tip: "Restore Height Based Aspect Ratio", onClick: restoreAspectRatioHeight, icon: faArrowsUpToLine },
    { tip: "Crop Video", onClick: cropClick, icon: faCropSimple, disabled: isCropDisabled, style: { opacity: isCropDisabled ? "0.6" : "1.0", backgroundColor: isCropping ? "#5C2BE2" : "" } },
    ...(isCropping ? [{ tip: "Circle Crop", onClick: () => setCircleCrop(prev => !prev), icon: faCircle, style: { backgroundColor: circleCrop ? "#5C2BE2" : "" } }] : []),
    { tip: "Undo Crop", onClick: undoCrop, icon: faSquareCaretLeft, disabled: isCropDisabled, style: { opacity: isCropDisabled ? "0.6" : "1.0" } },
  ];
  const presets = [
    { text: "1:1", ratio: 1 },
    { text: "4:3", ratio: 3 / 4 },
    { text: "16:9", ratio: 9 / 16 },
  ];
  const styleControls = [
    { label: "Opacity", value: opacity, onChange: setOpacity, min: 0, max: 100, inc: 10 },
    { label: "Hue", value: hue, onChange: setHue, min: 0, max: 360, inc: 10 },
    { label: "Saturation", value: saturation, onChange: setSaturation, min: 0, max: 360, inc: 10 },
    { label: "Brightness", value: brightness, onChange: setBrightness, min: 0, max: 360, inc: 10 },
    { label: "Contrast", value: contrast, onChange: setContrast, min: 0, max: 360, inc: 10 },
    { label: "Blur", value: blur, onChange: setBlur, min: 0, max: 100, inc: 1 },
    { label: "Shadow", value: spread, onChange: setSpread, min: 0, max: 100, inc: 1 },
    { label: "Grayscale", value: grayscale, onChange: setGrayscale, min: 0, max: 100, inc: 10 },
    { label: "Sepia", value: sepia, onChange: setSepia, min: 0, max: 100, inc: 10 },
  ];
  return (
    <div className="dinolabsVideoEditorToolbar" style={{ pointerEvents: (showFrameBar && framesPanelMode !== "timeline") ? "none" : "auto", opacity: (showFrameBar && framesPanelMode !== "timeline") ? 0.4 : 1.0 }}>
      <div className="dinolabsVideoEditorCellWrapper">
        <div className="dinolabsVideoEditorHeaderFlex">
          <label className="dinolabsVideoEditorCellTitle"><FontAwesomeIcon icon={faTabletScreenButton} /> Layout</label>
          <div className="dinolabsVideoEditorCellFlexSupplement">
            <Tippy content="Reset Video" theme="tooltip-light"><button onClick={resetVideo} className="dinolabsVideoEditorToolButtonHeader"><FontAwesomeIcon icon={faArrowsRotate} /></button></Tippy>
            <Tippy content="Download Video" theme="tooltip-light"><button onClick={downloadVideo} className="dinolabsVideoEditorToolButtonHeader"><FontAwesomeIcon icon={faDownload} /></button></Tippy>
          </div>
        </div>
        <div className="dinolabsVideoEditorCellFlexStack">
          <label className="dinolabsVideoEditorCellFlexTitle">Position</label>
          <div className="dinolabsVideoEditorCellFlex">
            <input className="dinolabsVideoEditorPositionInput" type="text" value={`X: ${panX}`} onChange={(e) => setPanX(Number(e.target.value.replace(/[^0-9.-]/g, "")))} />
            <input className="dinolabsVideoEditorPositionInput" type="text" value={`Y: ${panY}`} onChange={(e) => setPanY(Number(e.target.value.replace(/[^0-9.-]/g, "")))} />
          </div>
        </div>
        <div className="dinolabsVideoEditorCellFlexStack">
          <div className="dinolabsVideoEditorCellFlex">
            {layoutButtons.map((b, i) => (
              <Tippy key={i} content={b.tip} theme="tooltip-light">
                <button onClick={b.onClick} className="dinolabsVideoEditorToolButton"><FontAwesomeIcon icon={b.icon} /></button>
              </Tippy>
            ))}
          </div>
        </div>
      </div>
      <div className="dinolabsVideoEditorCellWrapper">
        <div className="dinolabsVideoEditorHeaderFlex">
          <label className="dinolabsVideoEditorCellTitle"><FontAwesomeIcon icon={faRulerCombined} /> Dimensions</label>
          <label className="dinolabsConfrmationCheck">
            <input type="checkbox" className="dinolabsSettingsCheckbox" checked={maintainAspectRatio} onChange={(e) => setMaintainAspectRatio(e.target.checked)} />
            <span>Preserve Aspect Ratio</span>
          </label>
        </div>
        <div className="dinolabsVideoEditorCellFlexStack">
          <label className="dinolabsVideoEditorCellFlexTitle">Video Size</label>
          <div className="dinolabsVideoEditorCellFlex">
            <input className="dinolabsVideoEditorPositionInput" type="text" value={`W: ${Math.round(videoWidth)}px`} onChange={(e) => setVideoWidth(Number(e.target.value.replace(/[^0-9.-]/g, "")))} />
            <input className="dinolabsVideoEditorPositionInput" type="text" value={`H: ${Math.round(videoHeight)}px`} onChange={(e) => setVideoHeight(Number(e.target.value.replace(/[^0-9.-]/g, "")))} />
          </div>
        </div>
        <div className="dinolabsVideoEditorCellFlexStack">
          <div className="dinolabsVideoEditorCellFlex">
            {dimButtons.map((b, i) => (
              <Tippy key={i} content={b.tip} theme="tooltip-light">
                <button onClick={b.onClick} disabled={b.disabled} style={b.style} className="dinolabsVideoEditorToolButton"><FontAwesomeIcon icon={b.icon} /></button>
              </Tippy>
            ))}
          </div>
        </div>
        {isCropping && (
          <div className="dinolabsVideoEditorCellFlexStack">
            <label className="dinolabsVideoEditorCellFlexTitle">Crop Presets</label>
            <div className="dinolabsVideoEditorCellFlex">
              {presets.map((p, i) => (
                <button key={i} className="dinolabsVideoEditorToolButtonText" onClick={() => setCropRect(prev => ({ ...prev, height: prev.width * p.ratio }))}>
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="dinolabsVideoEditorCellWrapper">
        <div className="dinolabsVideoEditorHeaderFlex">
          <label className="dinolabsVideoEditorCellTitle"><FontAwesomeIcon icon={faSwatchbook} /> Styles</label>
        </div>
        {styleControls.map((s) => (
          <SliderControl key={s.label} label={s.label} value={s.value} onChange={s.onChange} min={s.min} max={s.max} step={s.inc} />
        ))}
      </div>
      <div className="dinolabsVideoEditorCellWrapper">
        <div className="dinolabsVideoEditorHeaderFlex">
          <label className="dinolabsVideoEditorCellTitle"><FontAwesomeIcon icon={faBorderTopLeft} /> Corner Rounding</label>
          <label className="dinolabsConfrmationCheck">
            <input type="checkbox" className="dinolabsSettingsCheckbox" checked={syncCorners} onChange={(e) => setSyncCorners(e.target.checked)} />
            <span>Sync Corners</span>
          </label>
        </div>
        <div className="dinolabsVideoEditorCellFlexStack">
          <label className="dinolabsVideoEditorCellFlexTitle">Corner Radii</label>
          <div className="dinolabsVideoEditorCellFlex">
            {syncCorners ? (
              <input className="dinolabsVideoEditorPositionInput" type="text" value={`Corner: ${borderRadius}px`} onChange={(e) => {
                const val = Math.min(Number(e.target.value.replace(/[^0-9]/g, "")), 100);
                setBorderRadius(val); setBorderTopLeftRadius(val); setBorderTopRightRadius(val); setBorderBottomLeftRadius(val); setBorderBottomRightRadius(val);
              }} />
            ) : (
              <div className="dinolabsCornerInputGridWrapper">
                <div className="dinolabsCornerInputFlex">
                  <input className="dinolabsVideoEditorPositionInput" type="text" value={`TL: ${borderTopLeftRadius}px`} onChange={(e) => setBorderTopLeftRadius(Math.min(Number(e.target.value.replace(/[^0-9]/g, "")), 100))} />
                  <input className="dinolabsVideoEditorPositionInput" type="text" value={`TR: ${borderTopRightRadius}px`} onChange={(e) => setBorderTopRightRadius(Math.min(Number(e.target.value.replace(/[^0-9]/g, "")), 100))} />
                </div>
                <div className="dinolabsCornerInputFlex">
                  <input className="dinolabsVideoEditorPositionInput" type="text" value={`BL: ${borderBottomLeftRadius}px`} onChange={(e) => setBorderBottomLeftRadius(Math.min(Number(e.target.value.replace(/[^0-9]/g, "")), 100))} />
                  <input className="dinolabsVideoEditorPositionInput" type="text" value={`BR: ${borderBottomRightRadius}px`} onChange={(e) => setBorderBottomRightRadius(Math.min(Number(e.target.value.replace(/[^0-9]/g, "")), 100))} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
const SliderControl = ({ label, value, onChange, min, max, step = 10, disabled }) => (
  <div className="dinolabsVideoEditorCellFlexStack">
    <label className="dinolabsVideoEditorCellFlexTitle">{label}</label>
    <div className="dinolabsVideoEditorCellFlex">
      <button style={{ opacity: disabled ? "0.6" : "1.0" }} disabled={disabled} onClick={() => onChange(Math.max(value - step, min))} className="dinolabsVideoEditorToolButton">
        <FontAwesomeIcon icon={faMinus} />
      </button>
      <div className="dinolabsVideoEditorSliderWrapper">
        <input className="dinolabsSettingsSlider" type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} />
      </div>
      <button style={{ opacity: disabled ? "0.6" : "1.0" }} disabled={disabled} onClick={() => onChange(Math.min(value + step, max))} className="dinolabsVideoEditorToolButton">
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  </div>
);
const TimelineClip = ({ clip, index, isSelected, onSelect, onSplit, onDelete, onTrim, timelineScale, timelineOffset, trackHeight }) => {
  const clipWidth = (clip.duration * timelineScale);
  const clipLeft = ((clip.startTime - timelineOffset) * timelineScale);
  return (
    <div
      className={`dinolabsVideoEditorTimelineVideoTrackTimelineClip ${isSelected ? "selected" : ""} ${clip.type}`}
      style={{
        left: clipLeft,
        width: clipWidth,
        backgroundColor: clip.type === "video" ? "rgba(10, 95, 31, 0.6)" : clip.type === "audio" ? "rgba(33, 150, 243, 0.8)" : "rgba(255, 152, 0, 0.8)",
        border: isSelected ? "2px solid #5C2BE2" : "1px solid rgba(255,255,255,0.3)",
      }}
      onClick={() => onSelect(index)}
      onDoubleClick={() => onSplit(index)}
    >
      <span>
        {clip.name || `${clip.type} ${index + 1}`}
      </span>
      {clipWidth > 80 && (
        <div className="dinolabsVideoEditorTimelineVideoTrackTimelineClipSection">
          <button className="dinolabsVideoEditorTimelineVideoTrackTimelineClipSectionDelete" onClick={(e) => { e.stopPropagation(); onDelete(index); }}>
            <FontAwesomeIcon icon={faTrash} size="xs" color="white" />
          </button>
        </div>
      )}
      <div className="trim-handle left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: "rgba(92, 43, 226, 0.8)", cursor: "ew-resize", opacity: isSelected ? 1 : 0 }} />
      <div className="trim-handle right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "4px", backgroundColor: "rgba(92, 43, 226, 0.8)", cursor: "ew-resize", opacity: isSelected ? 1 : 0 }} />
    </div>
  );
};
const Timeline = ({ clips, selectedClips, onClipSelect, onClipSplit, onClipDelete, onClipMove, currentTime, duration, onTimelineSeek, timelineZoom, onTimelineZoom }) => {
  const timelineRef = useRef(null);
  const [timelineOffset, setTimelineOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const trackHeight = 60;
  const timelineScale = timelineZoom;
  
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / timelineScale) + timelineOffset;
    onTimelineSeek(Math.max(0, Math.min(time, duration)));
  };
  
  const videoTracks = clips.filter(c => c.type === "video" || c.type === "text");
  const audioTracks = clips.filter(c => c.type === "audio");
  
  return (
    <div className="dinolabsVideoInputBottomBarTimelineSupplement" style={{}}>
      <div className="dinolabsVideoEditorTimelineHeader">
        <div className="dinolabsVideoEditorTimelineHeaderSupplementLeading">
        </div>
        <div className="dinolabsVideoEditorTimelineHeaderSupplementTrailing">
          <span>
          {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, "0")} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="dinolabsVideoEditorTimeline" ref={timelineRef} onClick={handleTimelineClick} style={{ overflowX: "auto", width: "100%" }}>
        <div className="dinolabsVideoEditorTimelineRuler" style={{ minWidth: duration * timelineScale }}>
          {Array.from({ length: Math.ceil(duration / 5) + 1 }, (_, i) => i * 5).map(time => (
            <div className="dinolabsVideoEditorTimelineRulerItem" key={time} style={{ left: (time - timelineOffset) * timelineScale, position: "absolute" }}>
              {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, "0")}
            </div>
          ))}
        </div>
        <div className="dinolabsVideoEditorTimelinePlayhead" style={{ left: (currentTime - timelineOffset) * timelineScale, position: "absolute", zIndex: 10 }} />
        <div className="dinolabsVideoEditorTimelineTrackContainer" style={{ minWidth: duration * timelineScale }}>
          <div className="dinolabsVideoEditorTimelineVideoTracks">
            <div className="dinolabsVideoEditorTimelineVideoTrackLabel">Video</div>
            <div className="dinolabsVideoEditorTimelineVideoTrackContent" style={{ height: trackHeight, position: "relative", minWidth: duration * timelineScale }}>
              {videoTracks.map((clip, index) => (
                <TimelineClip
                  key={`video-${index}`}
                  clip={clip}
                  index={index}
                  isSelected={selectedClips.includes(index)}
                  onSelect={onClipSelect}
                  onSplit={onClipSplit}
                  onDelete={onClipDelete}
                  onTrim={() => { }}
                  timelineScale={timelineScale}
                  timelineOffset={timelineOffset}
                  trackHeight={trackHeight}
                />
              ))}
            </div>
          </div>
          <div className="dinolabsVideoEditorTimelineVideoTracks">
            <div className="dinolabsVideoEditorTimelineVideoTrackLabel" >Audio</div>
            <div className="dinolabsVideoEditorTimelineVideoTrackContent" style={{ height: trackHeight, position: "relative", minWidth: duration * timelineScale }}>
              {audioTracks.map((clip, index) => (
                <TimelineClip
                  key={`audio-${index}`}
                  clip={clip}
                  index={index}
                  isSelected={selectedClips.includes(index)}
                  onSelect={onClipSelect}
                  onSplit={onClipSplit}
                  onDelete={onClipDelete}
                  onTrim={() => { }}
                  timelineScale={timelineScale}
                  timelineOffset={timelineOffset}
                  trackHeight={trackHeight}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return (h > 0 ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function DinoLabsVideoEditor({ fileHandle }) {
  function fitToContainer(frameBarOpen, realW = nativeWidth, realH = nativeHeight) {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    let containerHeight = containerRef.current.clientHeight;
    if (frameBarOpen) containerHeight *= 0.7;
    const maxPossibleWidth = containerWidth * 0.7;
    const maxPossibleHeight = containerHeight * 0.7;
    let initWidth = realW;
    let initHeight = realH;
    const widthRatio = initWidth / maxPossibleWidth;
    const heightRatio = initHeight / maxPossibleHeight;
    if (widthRatio > 1 || heightRatio > 1) {
      const ratio = Math.max(widthRatio, heightRatio);
      initWidth /= ratio;
      initHeight /= ratio;
    }
    setVideoWidth(initWidth);
    setVideoHeight(initHeight);
    setPanX(0);
    setPanY(0);
  }
  const [url, setUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const videoRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(1);
  const [flipY, setFlipY] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [videoWidth, setVideoWidth] = useState(300);
  const [videoHeight, setVideoHeight] = useState(300);
  const [nativeWidth, setNativeWidth] = useState(300);
  const [nativeHeight, setNativeHeight] = useState(300);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const aspectRatioRef = useRef(1);
  const [resizingCorner, setResizingCorner] = useState(null);
  const resizingRef = useRef(false);
  const lastResizePosRef = useRef({ x: 0, y: 0 });
  const initialSizeRef = useRef({ width: 300, height: 300 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const initialMousePosRef = useRef(null);
  const [hueGlobal, setHueGlobal] = useState(0);
  const [saturationGlobal, setSaturationGlobal] = useState(100);
  const [brightnessGlobal, setBrightnessGlobal] = useState(100);
  const [contrastGlobal, setContrastGlobal] = useState(100);
  const [opacityGlobal, setOpacityGlobal] = useState(100);
  const [blurGlobal, setBlurGlobal] = useState(0);
  const [spreadGlobal, setSpreadGlobal] = useState(0);
  const [grayscaleGlobal, setGrayscaleGlobal] = useState(0);
  const [sepiaGlobal, setSepiaGlobal] = useState(0);
  const [borderRadiusGlobal, setBorderRadiusGlobal] = useState(0);
  const [borderTopLeftRadiusGlobal, setBorderTopLeftRadiusGlobal] = useState(0);
  const [borderTopRightRadiusGlobal, setBorderTopRightRadiusGlobal] = useState(0);
  const [borderBottomLeftRadiusGlobal, setBorderBottomLeftRadiusGlobal] = useState(0);
  const [borderBottomRightRadiusGlobal, setBorderBottomRightRadiusGlobal] = useState(0);
  const [syncCornersGlobal, setSyncCornersGlobal] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [cropRotation, setCropRotation] = useState(0);
  const [circleCrop, setCircleCrop] = useState(false);
  const [isCropDisabled, setIsCropDisabled] = useState(false);
  const [cropHistory, setCropHistory] = useState([]);
  const cropResizingRef = useRef(false);
  const cropResizingCorner = useRef(null);
  const cropLastResizePosRef = useRef({ x: 0, y: 0 });
  const cropInitialRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const cropRotatingRef = useRef(false);
  const cropInitialRotation = useRef(0);
  const cropRotationStartAngle = useRef(0);
  const cropRotationCenter = useRef({ x: 0, y: 0 });
  const [actionMode, setActionMode] = useState("Idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  const containerRef = useRef(null);
  const [frames, setFrames] = useState([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [originalFileSize, setOriginalFileSize] = useState(null);
  const [originalDuration, setOriginalDuration] = useState(null);
  const [framesPanelMode, setFramesPanelMode] = useState("none");
  const showFrameBar = framesPanelMode !== "none" && framesPanelMode !== "timeline";
  const framesContainerRef = useRef(null);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [isRebuildingVideoFromFrames, setIsRebuildingVideoFromFrames] = useState(false);
  const [frameInterval, setFrameInterval] = useState(1);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [originalExtractedFrames, setOriginalExtractedFrames] = useState([]);
  const [timelineClips, setTimelineClips] = useState([]);
  const [selectedClips, setSelectedClips] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [timelineZoom, setTimelineZoom] = useState(50);
  const [showTimeline, setShowTimeline] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [textOverlays, setTextOverlays] = useState([]);
  const [selectedTextOverlay, setSelectedTextOverlay] = useState(-1);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textEditorState, setTextEditorState] = useState({
    text: "",
    font: "Arial",
    size: 32,
    color: "#ffffff",
    alignment: "center",
    bold: false,
    italic: false,
    underline: false,
    x: 50,
    y: 50
  });
  const [isTextColorOpen, setIsTextColorOpen] = useState(false);
  const [exportQuality, setExportQuality] = useState("high");
  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportResolution, setExportResolution] = useState("original");
  const [audioTracks, setAudioTracks] = useState([]);
  const [masterVolume, setMasterVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [transitions, setTransitions] = useState([]);
  const [selectedTransition, setSelectedTransition] = useState("none");
  const [speedRamps, setSpeedRamps] = useState([]);
  const [globalSpeed, setGlobalSpeed] = useState(1.0);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  const handleZoomIn = () => setZoom(prev => prev + 0.1);
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1));
  const handleRotateLeft = () => setRotation(prev => prev - 90);
  const handleRotateRight = () => setRotation(prev => prev + 90);
  const handleFlipHorizontal = () => setFlipX(prev => -prev);
  const handleFlipVertical = () => setFlipY(prev => -prev);
  const handleTimelineSeek = (time) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };
  const handleClipSelect = (index) => {
    setSelectedClips([index]);
  };
  const handleClipSplit = (index) => {
    const clip = timelineClips[index];
    if (!clip) return;
    const splitTime = currentTime - clip.startTime;
    if (splitTime <= 0 || splitTime >= clip.duration) return;
    const newClips = [...timelineClips];
    const firstPart = { ...clip, duration: splitTime };
    const secondPart = { ...clip, startTime: clip.startTime + splitTime, duration: clip.duration - splitTime };
    newClips.splice(index, 1, firstPart, secondPart);
    setTimelineClips(newClips);
  };
  const handleClipDelete = (index) => {
    const newClips = timelineClips.filter((_, i) => i !== index);
    setTimelineClips(newClips);
    setSelectedClips([]);
  };
  const handleClipMove = (fromIndex, toIndex) => {
    const newClips = [...timelineClips];
    const [movedClip] = newClips.splice(fromIndex, 1);
    newClips.splice(toIndex, 0, movedClip);
    setTimelineClips(newClips);
  };
  const handleAddTextOverlay = () => {
    const newOverlay = {
      id: Date.now(),
      text: "New Text",
      font: "Arial",
      size: 32,
      color: "#ffffff",
      alignment: "center",
      bold: false,
      italic: false,
      underline: false,
      x: 50,
      y: 50,
      startTime: currentTime,
      duration: 5,
      opacity: 100
    };
    setTextOverlays(prev => [...prev, newOverlay]);
    setSelectedTextOverlay(textOverlays.length);
    setTextEditorState(newOverlay);
    saveState();
  };
  const handleUpdateTextOverlay = (index, updates) => {
    const newOverlays = [...textOverlays];
    newOverlays[index] = { ...newOverlays[index], ...updates };
    setTextOverlays(newOverlays);
    saveState();
  };
  const handleDeleteTextOverlay = (index) => {
    setTextOverlays(prev => prev.filter((_, i) => i !== index));
    if (selectedTextOverlay === index) {
      setSelectedTextOverlay(-1);
      setShowTextEditor(false);
    }
    saveState();
  };
  const saveState = () => {
    const state = {
      timelineClips: [...timelineClips],
      textOverlays: [...textOverlays],
      frames: [...frames],
      currentTime,
      videoWidth,
      videoHeight,
      panX,
      panY,
      zoom,
      rotation,
      flipX,
      flipY
    };
    setUndoStack(prev => [...prev.slice(-19), state]);
    setRedoStack([]);
  };
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const currentState = {
      timelineClips: [...timelineClips],
      textOverlays: [...textOverlays],
      frames: [...frames],
      currentTime,
      videoWidth,
      videoHeight,
      panX,
      panY,
      zoom,
      rotation,
      flipX,
      flipY
    };
    setRedoStack(prev => [...prev, currentState]);
    const prevState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setTimelineClips(prevState.timelineClips);
    setTextOverlays(prevState.textOverlays);
    setFrames(prevState.frames);
    setCurrentTime(prevState.currentTime);
    setVideoWidth(prevState.videoWidth);
    setVideoHeight(prevState.videoHeight);
    setPanX(prevState.panX);
    setPanY(prevState.panY);
    setZoom(prevState.zoom);
    setRotation(prevState.rotation);
    setFlipX(prevState.flipX);
    setFlipY(prevState.flipY);
  };
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    const currentState = {
      timelineClips: [...timelineClips],
      textOverlays: [...textOverlays],
      frames: [...frames],
      currentTime,
      videoWidth,
      videoHeight,
      panX,
      panY,
      zoom,
      rotation,
      flipX,
      flipY
    };
    setUndoStack(prev => [...prev, currentState]);
    setTimelineClips(nextState.timelineClips);
    setTextOverlays(nextState.textOverlays);
    setFrames(nextState.frames);
    setCurrentTime(nextState.currentTime);
    setVideoWidth(nextState.videoWidth);
    setVideoHeight(nextState.videoHeight);
    setPanX(nextState.panX);
    setPanY(nextState.panY);
    setZoom(nextState.zoom);
    setRotation(nextState.rotation);
    setFlipX(nextState.flipX);
    setFlipY(nextState.flipY);
  };

  useEffect(() => {
    if (url && originalDuration && !showTimeline) {
      const mainClip = {
        id: "main-video",
        type: "video",
        name: "Main Video",
        url: url,
        startTime: 0,
        duration: originalDuration,
        volume: 100,
        speed: 1.0,
        effects: []
      };
      setTimelineClips([mainClip]);
    }
  }, [url, originalDuration]);
  useEffect(() => {
    let objectUrl;
    const loadMedia = async () => {
      try {
        const file = typeof fileHandle.getFile === "function" ? await fileHandle.getFile() : fileHandle;
        objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        setOriginalFileSize(file.size);
        const extension = file.name.split(".").pop().toLowerCase();
        if (["mp4", "mkv", "avi", "mov", "webm"].includes(extension)) {
          setMediaType("video");
          const tempVideo = document.createElement("video");
          tempVideo.onloadedmetadata = () => {
            setNativeWidth(tempVideo.videoWidth);
            setNativeHeight(tempVideo.videoHeight);
            fitToContainer(false, tempVideo.videoWidth, tempVideo.videoHeight);
            setOriginalDuration(tempVideo.duration);
          };
          tempVideo.src = objectUrl;
        }
      } catch (error) { }
    };
    loadMedia();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [fileHandle]);
  useEffect(() => {
    const normalizedRotation = rotation % 360;
    setIsCropDisabled(!(normalizedRotation === 0 && flipX === 1 && flipY === 1));
  }, [rotation, flipX, flipY]);
  useEffect(() => {
    fitToContainer(showFrameBar || showTimeline);
  }, [showFrameBar, showTimeline]);
  const resetVideo = () => {
    setZoom(1); setRotation(0); setFlipX(1); setFlipY(1); setPanX(0); setPanY(0);
    setHueGlobal(0); setSaturationGlobal(100); setBrightnessGlobal(100); setContrastGlobal(100); setOpacityGlobal(100);
    setBlurGlobal(0); setSpreadGlobal(0); setGrayscaleGlobal(0); setSepiaGlobal(0);
    setBorderRadiusGlobal(0); setBorderTopLeftRadiusGlobal(0); setBorderTopRightRadiusGlobal(0);
    setBorderBottomLeftRadiusGlobal(0); setBorderBottomRightRadiusGlobal(0); setSyncCornersGlobal(false);
    setActionMode("Idle"); setIsCropping(false);
    setCropRect({ x: 0, y: 0, width: 100, height: 100 }); setCropRotation(0); setCircleCrop(false); setIsCropDisabled(false);
    fitToContainer(showFrameBar || showTimeline, nativeWidth, nativeHeight);
    setFrames([]); setOriginalExtractedFrames([]);
    setTextOverlays([]); setSelectedTextOverlay(-1); setShowTextEditor(false);
    setTimelineClips([]); setSelectedClips([]); setCurrentTime(0);
    saveState();
  };
  async function performCanvasVideoCrop() {
    setIsProcessingCrop(true);
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = nativeWidth;
    offscreenCanvas.height = nativeHeight;
    const offscreenCtx = offscreenCanvas.getContext("2d");
    let filterString = `hue-rotate(${hueGlobal}deg) saturate(${saturationGlobal}%) brightness(${brightnessGlobal}%) contrast(${contrastGlobal}%) blur(${blurGlobal}px) grayscale(${grayscaleGlobal}%) sepia(${sepiaGlobal}%)`;
    if (spreadGlobal) filterString += ` drop-shadow(0 0 ${spreadGlobal}px rgba(0,0,0,0.5))`;
    offscreenCtx.filter = filterString;
    offscreenCtx.globalAlpha = opacityGlobal / 100;
    const tempVideo = document.createElement("video");
    tempVideo.src = url;
    tempVideo.crossOrigin = "anonymous";
    tempVideo.style.position = "fixed"; tempVideo.style.left = "-9999px"; tempVideo.style.top = "-9999px";
    document.body.appendChild(tempVideo);
    await new Promise(res => { tempVideo.onloadeddata = res; });
    tempVideo.currentTime = 0;
    await new Promise(res => { tempVideo.onseeked = res; });
    offscreenCtx.drawImage(tempVideo, 0, 0, nativeWidth, nativeHeight);
    tempVideo.play();
    const audioStream = tempVideo.captureStream();
    const audioTracks = audioStream.getAudioTracks();
    const fps = 30;
    const mainCanvasStream = offscreenCanvas.captureStream(fps);
    const videoTracks = mainCanvasStream.getVideoTracks();
    const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);
    const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: "video/mp4" });
    const chunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    const donePromise = new Promise(r => mediaRecorder.onstop = r);
    mediaRecorder.start();
    const intermediateCanvas = document.createElement("canvas");
    intermediateCanvas.width = nativeWidth;
    intermediateCanvas.height = nativeHeight;
    const icCtx = intermediateCanvas.getContext("2d");
    const finalCanvas = document.createElement("canvas");
    const rad = cropRotation * Math.PI / 180;
    const cx = cropRect.x + cropRect.width / 2;
    const cy = cropRect.y + cropRect.height / 2;
    const corners = [
      { x: cropRect.x, y: cropRect.y },
      { x: cropRect.x + cropRect.width, y: cropRect.y },
      { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height },
      { x: cropRect.x, y: cropRect.y + cropRect.height }
    ];
    const rotatedCorners = (cropRotation % 360 !== 0) ? corners.map(pt => {
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      return { x: cx + (dx * Math.cos(rad) - dy * Math.sin(rad)), y: cy + (dx * Math.sin(rad) + dy * Math.cos(rad)) };
    }) : corners;
    const xs = rotatedCorners.map(pt => pt.x);
    const ys = rotatedCorners.map(pt => pt.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const realCropW = maxX - minX;
    const realCropH = maxY - minY;
    finalCanvas.width = realCropW;
    finalCanvas.height = realCropH;
    const fcCtx = finalCanvas.getContext("2d");
    const finalCanvasStream = finalCanvas.captureStream(fps);
    const finalMediaRecorder = new MediaRecorder(finalCanvasStream, { mimeType: "video/mp4" });
    const finalChunks = [];
    finalMediaRecorder.ondataavailable = e => { if (e.data.size > 0) finalChunks.push(e.data); };
    const finalDonePromise = new Promise(r => finalMediaRecorder.onstop = r);
    finalMediaRecorder.start();
    let lastDrawTime = 0;
    const frameIntervalMS = 1000 / fps;
    const drawFrame = (timestamp) => {
      if (!lastDrawTime) lastDrawTime = timestamp;
      if (timestamp - lastDrawTime < frameIntervalMS) {
        if (tempVideo.currentTime < tempVideo.duration - 0.1) requestAnimationFrame(drawFrame);
        return;
      }
      icCtx.clearRect(0, 0, nativeWidth, nativeHeight);
      icCtx.filter = filterString;
      icCtx.globalAlpha = opacityGlobal / 100;
      icCtx.drawImage(tempVideo, 0, 0, nativeWidth, nativeHeight);
      fcCtx.clearRect(0, 0, realCropW, realCropH);
      fcCtx.beginPath();
      if (circleCrop) {
        const rx = realCropW / 2;
        const ry = realCropH / 2;
        fcCtx.ellipse(realCropW / 2, realCropH / 2, rx, ry, 0, 0, 2 * Math.PI);
      } else {
        fcCtx.moveTo(rotatedCorners[0].x - minX, rotatedCorners[0].y - minY);
        fcCtx.lineTo(rotatedCorners[1].x - minX, rotatedCorners[1].y - minY);
        fcCtx.lineTo(rotatedCorners[2].x - minX, rotatedCorners[2].y - minY);
        fcCtx.lineTo(rotatedCorners[3].x - minX, rotatedCorners[3].y - minY);
        fcCtx.closePath();
      }
      fcCtx.clip();
      fcCtx.drawImage(intermediateCanvas, -minX, -minY);
      lastDrawTime = timestamp;
      if (tempVideo.currentTime < tempVideo.duration - 0.1) requestAnimationFrame(drawFrame);
      else { finalMediaRecorder.stop(); mediaRecorder.stop(); }
    };
    requestAnimationFrame(drawFrame);
    await finalDonePromise;
    await donePromise;
    const finalBlob = new Blob(finalChunks, { type: "video/mp4" });
    const newUrl = URL.createObjectURL(finalBlob);
    document.body.removeChild(tempVideo);
    setCropHistory(prev => [...prev, { url, panX, panY, videoWidth, videoHeight, nativeWidth, nativeHeight }]);
    setUrl(newUrl);
    setNativeWidth(realCropW);
    setNativeHeight(realCropH);
    fitToContainer(showFrameBar || showTimeline, realCropW, realCropH);
    setIsCropping(false);
    setIsProcessingCrop(false);
    setActionMode("Idle");
    saveState();
  }
  const finalizeCrop = async () => {
    if (mediaType !== "video") return;
    setCropHistory(prev => [...prev, { url, panX, panY, videoWidth, videoHeight, nativeWidth, nativeHeight }]);
    await performCanvasVideoCrop();
  };
  async function downloadVideo() {
    const alertResult = await showDialog({
      title: "Export Settings",
      message: "Configure your export settings.",
      inputs: [
        {
          name: "format", type: "select", label: "Format", defaultValue: exportFormat, options: [
            { label: ".mp4", value: "mp4" },
            { label: ".mov", value: "mov" },
            { label: ".webm", value: "webm" },
            { label: ".avi", value: "avi" }
          ]
        },
        {
          name: "quality", type: "select", label: "Quality", defaultValue: exportQuality, options: [
            { label: "Low (480p)", value: "low" },
            { label: "Medium (720p)", value: "medium" },
            { label: "High (1080p)", value: "high" },
            { label: "Ultra (4K)", value: "ultra" }
          ]
        },
        {
          name: "resolution", type: "select", label: "Resolution", defaultValue: exportResolution, options: [
            { label: "Original", value: "original" },
            { label: "720p", value: "720p" },
            { label: "1080p", value: "1080p" },
            { label: "4K", value: "4k" }
          ]
        }
      ],
      showCancel: true
    });
    if (!alertResult) return;
    setExportFormat(alertResult.format || "mp4");
    setExportQuality(alertResult.quality || "high");
    setExportResolution(alertResult.resolution || "original");
    setIsDownloadingVideo(true);
    if (showTimeline && timelineClips.length > 0) {
      const compositeUrl = await renderTimelineToVideo();
      if (compositeUrl) {
        setUrl(compositeUrl);
        if (videoRef.current) {
          videoRef.current.src = compositeUrl;
          videoRef.current.load();
        }
      }
    }
    if (frames.length > 0 && framesPanelMode !== "none") {
      const stitchedUrl = await reStitchAllFrames();
      if (stitchedUrl) {
        setUrl(stitchedUrl);
        if (videoRef.current) {
          videoRef.current.src = stitchedUrl;
          videoRef.current.load();
        }
      }
    }
    if (!url) return;
    const fileName = (fileHandle?.name || "export").replace(/\.\w+$/, `.${alertResult.format || "mp4"}`);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsDownloadingVideo(false);
  }
  async function renderTimelineToVideo() {
    if (timelineClips.length === 0) return null;
    setIsRebuildingVideoFromFrames(true);
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    const fps = 30;
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: "video/mp4" });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    return new Promise(resolve => {
      recorder.onstop = () => {
        const newBlob = new Blob(chunks, { type: "video/mp4" });
        const newUrl = URL.createObjectURL(newBlob);
        setIsRebuildingVideoFromFrames(false);
        resolve(newUrl);
      };
      recorder.start();
      const maxDuration = Math.max(...timelineClips.map(clip => clip.startTime + clip.duration));
      let currentFrame = 0;
      const totalFrames = Math.ceil(maxDuration * fps);
      const renderFrame = () => {
        const frameTime = currentFrame / fps;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        timelineClips.forEach(clip => {
          if (frameTime >= clip.startTime && frameTime < clip.startTime + clip.duration) {
            const relativeTime = frameTime - clip.startTime;
            ctx.fillStyle = clip.type === "video" ? "blue" : "green";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        });
        textOverlays.forEach(overlay => {
          if (frameTime >= overlay.startTime && frameTime < overlay.startTime + overlay.duration) {
            ctx.fillStyle = overlay.color;
            ctx.font = `${overlay.bold ? "bold " : ""}${overlay.italic ? "italic " : ""}${overlay.size}px ${overlay.font}`;
            ctx.textAlign = overlay.alignment;
            ctx.fillText(overlay.text, (overlay.x / 100) * canvas.width, (overlay.y / 100) * canvas.height);
          }
        });
        currentFrame++;
        if (currentFrame < totalFrames) {
          setTimeout(renderFrame, 1000 / fps);
        } else {
          recorder.stop();
        }
      };
      renderFrame();
    });
  }
  const handleDragStart = (e) => {
    if (isCropping || actionMode !== "Idle") return;
    draggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleDragEnd = () => { draggingRef.current = false; };
  const handleDragMove = (e) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    setPanX(prev => prev + dx);
    setPanY(prev => prev + dy);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleResizeMouseDown = (corner, e) => {
    if (isCropping || actionMode !== "Idle") return;
    e.stopPropagation();
    e.preventDefault();
    setResizingCorner(corner);
    resizingRef.current = true;
    initialMousePosRef.current = { x: e.clientX, y: e.clientY };
    lastResizePosRef.current = { x: e.clientX, y: e.clientY };
    initialSizeRef.current = { width: videoWidth, height: videoHeight };
    initialPosRef.current = { x: panX, y: panY };
    if (maintainAspectRatio) aspectRatioRef.current = videoWidth / videoHeight;
  };
  const handleGlobalMouseMove = (e) => {
    if (!resizingRef.current) return;
    const rad = rotation * Math.PI / 180;
    const totalDx = e.clientX - initialMousePosRef.current.x;
    const totalDy = e.clientY - initialMousePosRef.current.y;
    const localTotalDx = Math.cos(rad) * totalDx + Math.sin(rad) * totalDy;
    const localTotalDy = -Math.sin(rad) * totalDx + Math.cos(rad) * totalDy;
    let newWidth, newHeight;
    if (maintainAspectRatio) {
      let handleUnit = { x: 0, y: 0 };
      if (resizingCorner === "bottom-right") handleUnit = { x: 1 / Math.sqrt(2), y: 1 / Math.sqrt(2) };
      else if (resizingCorner === "bottom-left") handleUnit = { x: -1 / Math.sqrt(2), y: 1 / Math.sqrt(2) };
      else if (resizingCorner === "top-right") handleUnit = { x: 1 / Math.sqrt(2), y: -1 / Math.sqrt(2) };
      else if (resizingCorner === "top-left") handleUnit = { x: -1 / Math.sqrt(2), y: -1 / Math.sqrt(2) };
      const effectiveDelta = localTotalDx * handleUnit.x + localTotalDy * handleUnit.y;
      const scale = (initialSizeRef.current.width / 2 + effectiveDelta) / (initialSizeRef.current.width / 2);
      newWidth = initialSizeRef.current.width * scale;
      newHeight = initialSizeRef.current.height * scale;
    } else {
      let horizontalDelta = 0, verticalDelta = 0;
      if (resizingCorner === "bottom-right") { horizontalDelta = localTotalDx; verticalDelta = localTotalDy; }
      else if (resizingCorner === "bottom-left") { horizontalDelta = -localTotalDx; verticalDelta = localTotalDy; }
      else if (resizingCorner === "top-right") { horizontalDelta = localTotalDx; verticalDelta = -localTotalDy; }
      else if (resizingCorner === "top-left") { horizontalDelta = -localTotalDx; verticalDelta = -localTotalDy; }
      newWidth = initialSizeRef.current.width + 2 * horizontalDelta;
      newHeight = initialSizeRef.current.height + 2 * verticalDelta;
    }
    newWidth = Math.max(newWidth, 50);
    newHeight = Math.max(newHeight, 50);
    setVideoWidth(newWidth);
    setVideoHeight(newHeight);
    setPanX(initialPosRef.current.x);
    setPanY(initialPosRef.current.y);
  };
  const handleGlobalMouseUp = () => {
    if (resizingRef.current) saveState();
    resizingRef.current = false;
    setResizingCorner(null);
  };
  useEffect(() => {
    if (resizingRef.current) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [resizingCorner]);
  const restoreAspectRatioWidth = () => setVideoHeight(videoWidth * (nativeHeight / nativeWidth));
  const restoreAspectRatioHeight = () => setVideoWidth(videoHeight * (nativeWidth / nativeHeight));
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
    const corner = cropResizingCorner.current;
    const circleCrop = false; 
    if (circleCrop || !circleCrop) {
      if (corner === "bottom-right") { width += dx; height += dy; }
      else if (corner === "bottom-left") { x += dx; width -= dx; height += dy; }
      else if (corner === "top-right") { y += dy; width += dx; height -= dy; }
      else if (corner === "top-left") { x += dx; y += dy; width -= dx; height -= dy; }
    }
    width = Math.max(width, 10);
    height = Math.max(height, 10);
    setCropRect({ x, y, width, height });
  };
  useEffect(() => {
    const onMouseMove = (e) => handleCropGlobalMouseMove(e);
    const onMouseUp = () => { cropResizingRef.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);
  const cropDraggingRefLocal = useRef(false);
  const lastCropDragPosRef = useRef({ x: 0, y: 0 });
  const handleCropMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    cropDraggingRefLocal.current = true;
    lastCropDragPosRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleCropMouseMove = (e) => {
    if (!cropDraggingRefLocal.current) return;
    const dx = e.clientX - lastCropDragPosRef.current.x;
    const dy = e.clientY - lastCropDragPosRef.current.y;
    lastCropDragPosRef.current = { x: e.clientX, y: e.clientY };
    setCropRect(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };
  const handleCropMouseUp = () => { cropDraggingRefLocal.current = false; };
  useEffect(() => {
    window.addEventListener("mousemove", handleCropMouseMove);
    window.addEventListener("mouseup", handleCropMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleCropMouseMove);
      window.removeEventListener("mouseup", handleCropMouseUp);
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
    setCropRotation(cropInitialRotation.current + (angle - cropRotationStartAngle.current));
  };
  const handleCropGlobalMouseUpRotation = () => { cropRotatingRef.current = false; };
  useEffect(() => {
    window.addEventListener("mousemove", handleCropGlobalMouseMoveRotation);
    window.addEventListener("mouseup", handleCropGlobalMouseUpRotation);
    return () => {
      window.removeEventListener("mousemove", handleCropGlobalMouseMoveRotation);
      window.removeEventListener("mouseup", handleCropGlobalMouseUpRotation);
    };
  }, []);
  const undoCrop = () => {
    if (cropHistory.length > 0) {
      const prev = cropHistory.pop();
      setCropHistory([...cropHistory]);
      setUrl(prev.url); setPanX(prev.panX); setPanY(prev.panY); setVideoWidth(prev.videoWidth); setVideoHeight(prev.videoHeight);
      setNativeWidth(prev.nativeWidth); setNativeHeight(prev.nativeHeight); setIsCropping(false);
      saveState();
    }
  };
  async function reStitchAllFrames() {
    if (frames.length === 0) return null;
    setIsRebuildingVideoFromFrames(true);
    const fps = 25;
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: "video/mp4", videoBitsPerSecond: 2500000 });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    return new Promise(resolve => {
      recorder.onstop = () => {
        const newBlob = new Blob(chunks, { type: "video/mp4" });
        const newUrl = URL.createObjectURL(newBlob);
        setIsRebuildingVideoFromFrames(false);
        resolve(newUrl);
      };
      recorder.start();
      let i = 0;
      const startTime = performance.now();
      const totalMs = originalDuration * 1000;
      const drawOneFrame = () => {
        if (i >= frames.length) {
          const elapsed = performance.now() - startTime;
          setTimeout(() => recorder.stop(), Math.max(0, totalMs - elapsed + 10));
          return;
        }
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          i++;
          const elapsed = performance.now() - startTime;
          const target = (i / frames.length) * totalMs;
          setTimeout(drawOneFrame, Math.max(0, target - elapsed));
        };
        img.src = frames[i].dataUrl;
      };
      drawOneFrame();
    });
  }
  const handleSvgMouseDown = (e) => {
    if (actionMode !== "AddText") return;
    if (actionMode === "AddText") {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const newOverlay = {
        id: Date.now(),
        text: "New Text",
        font: "Arial",
        size: 32,
        color: "#ffffff",
        alignment: "center",
        bold: false,
        italic: false,
        underline: false,
        x: x,
        y: y,
        startTime: currentTime,
        duration: 5,
        opacity: 100
      };
      setTextOverlays(prev => [...prev, newOverlay]);
      setSelectedTextOverlay(textOverlays.length);
      setTextEditorState(newOverlay);
      setShowTextEditor(true);
      setActionMode("Idle");
      saveState();
      return;
    }
  };
  const handleRewind15 = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 15);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  const handlePlayVideo = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };
  const handleToggleLoop = () => {
    if (!videoRef.current) return;
    const newVal = !videoRef.current.loop;
    videoRef.current.loop = newVal;
    setIsLooping(newVal);
  };
  const handleSkip15 = () => {
    if (videoRef.current && videoRef.current.duration) {
      const newTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 15);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !videoRef.current.muted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };
  const handleVolumeChange = (volume) => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume / 100;
    setMasterVolume(volume);
  };
  async function extractFramesFromVideo(videoElem) {
    const framesArray = [];
    if (!videoElem.duration) return [];
    const oldPausedState = videoElem.paused;
    const oldTime = videoElem.currentTime;
    videoElem.pause();
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d");
    const totalFramesToExtract = Math.min(100, Math.ceil(videoElem.duration / frameInterval));
    for (let i = 0; i < totalFramesToExtract; i++) {
      const targetTime = i * frameInterval;
      if (targetTime >= videoElem.duration) break;
      videoElem.currentTime = targetTime;
      await new Promise(resolve => setTimeout(resolve, 20));
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        framesArray.push({ time: targetTime, dataUrl });
      } catch (error) {}
    }
    videoElem.currentTime = oldTime;
    if (!oldPausedState) videoElem.play();
    return framesArray;
  }
  useEffect(() => {
    const doExtract = async () => {
      if (mediaType === "video" && videoRef.current && !isProcessingCrop && !isCropping) {
        setIsExtractingFrames(true);
        const newBase = await extractFramesFromVideo(videoRef.current);
        setOriginalExtractedFrames(newBase);
        setFrames([...newBase]);
        setIsExtractingFrames(false);
      }
    };
    if (framesPanelMode !== "none" && framesPanelMode !== "timeline") doExtract();
    else { setFrames([]); setOriginalExtractedFrames([]); }
  }, [framesPanelMode, url, isProcessingCrop, isCropping, frameInterval, mediaType]);
  const handleTimelineMode = () => {
    setFramesPanelMode(prev => prev === "timeline" ? "none" : "timeline");
    setShowTimeline(prev => !prev);
  };
  const handleViewFrames = () => setFramesPanelMode(prev => prev === "view" ? "none" : "view");
  const handleRearrangeFrames = () => setFramesPanelMode(prev => prev === "rearrange" ? "none" : "rearrange");
  const handleDragStartFrame = (e, index) => {
    setDraggedFrameIndex(index);
    setDropTargetIndex(null);
  };
  const handleDragOverFrame = (e, index) => {
    e.preventDefault();
    setDropTargetIndex(index);
    if (framesContainerRef.current) {
      const rect = framesContainerRef.current.getBoundingClientRect();
      const threshold = 50;
      if (e.clientX < rect.left + threshold) framesContainerRef.current.scrollLeft -= 10;
      else if (e.clientX > rect.right - threshold) framesContainerRef.current.scrollLeft += 10;
    }
  };
  const handleDropFrame = (e, index) => {
    e.preventDefault();
    setFrames(prevFrames => {
      const newFrames = [...prevFrames];
      const [movedFrame] = newFrames.splice(draggedFrameIndex, 1);
      newFrames.splice(index, 0, movedFrame);
      return newFrames.map((frame, i) => ({ ...frame, time: i }));
    });
    setDraggedFrameIndex(null);
    setDropTargetIndex(null);
    saveState();
  };
  async function handleSaveRearrange() {
    if (frames.length === 0) return;
    const newUrl = await reStitchAllFrames();
    if (newUrl) {
      setUrl(newUrl);
      if (videoRef.current) {
        videoRef.current.src = newUrl;
        videoRef.current.load();
        videoRef.current.currentTime = 0;
        videoRef.current.loop = true;
        videoRef.current.play();
        setIsPlaying(true);
        setIsLooping(true);
      }
      setFramesPanelMode("none");
      setActionMode("Idle");
      saveState();
    }
  }

  useEffect(() => {
    const updateTime = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
    };
    const video = videoRef.current;
    if (video) {
      video.addEventListener("timeupdate", updateTime);
      video.addEventListener("loadedmetadata", () => {
        setCurrentTime(0);
        video.loop = true;
        setIsLooping(true);
        video.play();
        setIsPlaying(true);
      });
      return () => {
        video.removeEventListener("timeupdate", updateTime);
      };
    }
  }, [url]);
  const handleCropRotationMouseDownHandler = (e) => handleCropRotationMouseDown(e);
  function setOpacity(val) {
    setOpacityGlobal(val);
  }
  function setHue(val) {
    setHueGlobal(val);
  }
  function setSaturation(val) {
    setSaturationGlobal(val);
  }
  function setBrightness(val) {
    setBrightnessGlobal(val);
  }
  function setContrast(val) {
    setContrastGlobal(val);
  }
  function setBlur(val) {
    setBlurGlobal(val);
  }
  function setSpread(val) {
    setSpreadGlobal(val);
  }
  function setGrayscale(val) {
    setGrayscaleGlobal(val);
  }
  function setSepia(val) {
    setSepiaGlobal(val);
  }
  function setSyncCorners(val) {
    setSyncCornersGlobal(val);
    if (val) {
      const v = Math.min(borderRadiusGlobal || borderTopLeftRadiusGlobal || 0, 100);
      setBorderRadiusGlobal(v); setBorderTopLeftRadiusGlobal(v); setBorderTopRightRadiusGlobal(v); setBorderBottomLeftRadiusGlobal(v); setBorderBottomRightRadiusGlobal(v);
    }
  }
  function setBorderRadius(val) {
    const limitVal = Math.min(val, 100);
    if (syncCornersGlobal) {
      setBorderRadiusGlobal(limitVal); setBorderTopLeftRadiusGlobal(limitVal); setBorderTopRightRadiusGlobal(limitVal);
      setBorderBottomLeftRadiusGlobal(limitVal); setBorderBottomRightRadiusGlobal(limitVal);
    } else setBorderRadiusGlobal(limitVal);
  }
  function setBorderTopLeftRadius(val) {
    const limitVal = Math.min(val, 100);
    setBorderTopLeftRadiusGlobal(limitVal);
  }
  function setBorderTopRightRadius(val) {
    const limitVal = Math.min(val, 100);
    setBorderTopRightRadiusGlobal(limitVal);
  }
  function setBorderBottomLeftRadius(val) {
    const limitVal = Math.min(val, 100);
    setBorderBottomLeftRadiusGlobal(limitVal);
  }
  function setBorderBottomRightRadius(val) {
    const limitVal = Math.min(val, 100);
    setBorderBottomRightRadiusGlobal(limitVal);
  }
  function handleSetPlaybackRate(rate) {
    if (!videoRef.current) return;
    setCurrentPlaybackRate(rate);
    videoRef.current.playbackRate = rate;
  }
  useEffect(() => {
    const handleKeyboard = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          handlePlayVideo();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) handleRewind15();
          else if (videoRef.current) {
            const newTime = Math.max(0, videoRef.current.currentTime - 1);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) handleSkip15();
          else if (videoRef.current && videoRef.current.duration) {
            const newTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 1);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) handleRedo();
            else handleUndo();
          }
          break;
        case "c":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setActionMode("Cropping");
          }
          break;
        case "t":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setActionMode("AddText");
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [videoRef, currentTime, actionMode]);
  const handleAddTransition = (type) => {
    const newTransition = {
      id: Date.now(),
      type: type,
      duration: 1.0,
      startTime: currentTime,
      properties: {}
    };
    setTransitions(prev => [...prev, newTransition]);
    saveState();
  };
  const handleSpeedRamp = (startTime, endTime, startSpeed, endSpeed) => {
    const newRamp = {
      id: Date.now(),
      startTime,
      endTime,
      startSpeed,
      endSpeed
    };
    setSpeedRamps(prev => [...prev, newRamp]);
    saveState();
  };
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (timelineClips.length > 0 || textOverlays.length > 0) {
        saveState();
      }
    }, 30000);
    return () => clearInterval(autoSave);
  }, [timelineClips, textOverlays]);
  return (
    <div className="dinolabsVideoEditorWrapper">
      {(isProcessingCrop || isExtractingFrames || isRebuildingVideoFromFrames || isDownloadingVideo) && (
        <div className="dinolabsVideoEditorContentCropIndicator"><div className="loading-circle" /></div>
      )}
      <DinoLabsVideoEditorToolbar
        showFrameBar={showFrameBar} framesPanelMode={framesPanelMode} resetVideo={resetVideo} downloadVideo={downloadVideo}
        panX={panX} panY={panY} setPanX={setPanX} setPanY={setPanY} maintainAspectRatio={maintainAspectRatio} setMaintainAspectRatio={setMaintainAspectRatio}
        videoWidth={videoWidth} videoHeight={videoHeight} setVideoWidth={setVideoWidth} setVideoHeight={setVideoHeight}
        restoreAspectRatioWidth={restoreAspectRatioWidth} restoreAspectRatioHeight={restoreAspectRatioHeight} actionMode={actionMode} setActionMode={setActionMode}
        isCropDisabled={isCropDisabled} isCropping={isCropping} mediaType={mediaType} finalizeCrop={finalizeCrop} setCropRect={setCropRect}
        setIsCropping={setIsCropping} setCircleCrop={setCircleCrop} circleCrop={circleCrop} undoCrop={undoCrop}
        setOpacity={setOpacity} opacity={opacityGlobal}
        setHue={setHue} hue={hueGlobal}
        setSaturation={setSaturation} saturation={saturationGlobal}
        setBrightness={setBrightness} brightness={brightnessGlobal}
        setContrast={setContrast} contrast={contrastGlobal}
        setBlur={setBlur} blur={blurGlobal}
        setSpread={setSpread} spread={spreadGlobal}
        setGrayscale={setGrayscale} grayscale={grayscaleGlobal}
        setSepia={setSepia} sepia={sepiaGlobal}
        syncCorners={syncCornersGlobal}
        setSyncCorners={setSyncCorners}
        borderRadius={borderRadiusGlobal}
        setBorderRadius={setBorderRadius}
        borderTopLeftRadius={borderTopLeftRadiusGlobal}
        setBorderTopLeftRadius={setBorderTopLeftRadius}
        borderTopRightRadius={borderTopRightRadiusGlobal}
        setBorderTopRightRadius={setBorderTopRightRadius}
        borderBottomLeftRadius={borderBottomLeftRadiusGlobal}
        setBorderBottomLeftRadius={setBorderBottomLeftRadius}
        borderBottomRightRadius={borderBottomRightRadiusGlobal}
        setBorderBottomRightRadius={setBorderBottomRightRadius}
        handleZoomIn={handleZoomIn} handleZoomOut={handleZoomOut} handleRotateLeft={handleRotateLeft}
        handleRotateRight={handleRotateRight} handleFlipHorizontal={handleFlipHorizontal} handleFlipVertical={handleFlipVertical}
        showTextEditor={showTextEditor} setShowTextEditor={setShowTextEditor} textOverlays={textOverlays}
        onAddTextOverlay={handleAddTextOverlay} onUpdateTextOverlay={handleUpdateTextOverlay}
        onDeleteTextOverlay={handleDeleteTextOverlay} selectedTextOverlay={selectedTextOverlay} setSelectedTextOverlay={setSelectedTextOverlay}
      />
      <div className="dinolabsVideoEditorContainerWrapper">
        <div className="dinolabsVideoInputTopBar">
          <div className="dinolabsVideoEditorAudioControls">
            <Tippy content={isMuted ? "Unmute" : "Mute"} theme="tooltip-light">
              <button className="dinolabsVideoButton" onClick={handleToggleMute}>
                <FontAwesomeIcon icon={isMuted ? faVolumeXmark : faVolumeUp} />
              </button>
            </Tippy>
            <div className="dinolabsVideoEditorSliderWrapper">
              <input type="range" min="0" max="100" value={masterVolume} onChange={(e) => handleVolumeChange(Number(e.target.value))} className="dinolabsSettingsSlider"/>
            </div>
          </div>
          <div className="dinolabsVideoEditorPlaybackControls">
            {[0.25, 0.5, 1.0, 1.5, 2.0, 4.0].map(rate => (
              <Tippy key={rate} content={`${rate}x Playback`} theme="tooltip-light">
                <button className="dinolabsVideoPlaybackButton" onClick={() => handleSetPlaybackRate(rate)} disabled={showFrameBar && framesPanelMode !== "view"} style={{ color: currentPlaybackRate === rate ? "#5c2be2" : "#c0c0c0", opacity: (showFrameBar && framesPanelMode !== "view") ? 0.5 : 1.0 }}>{rate}x</button>
              </Tippy>
            ))}
          </div>
        </div>
        <div
          className="dinolabsVideoEditorContainer"
          style={{ cursor: "grab", height: (showFrameBar && showTimeline) ? "20%" : (showTimeline ? "40%" : (showFrameBar ? "60%" : "80%")), minHeight: (showFrameBar && showTimeline) ? "20%" : (showTimeline ? "40%" : (showFrameBar ? "60%" : "80%")), maxHeight: (showFrameBar && showTimeline) ? "20%" : (showTimeline ? "40%" : (showFrameBar ? "60%" : "80%")) }}
          ref={containerRef}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div
            className="dinolabsImageResizer"
            style={{
              top: `calc(50% + ${panY}px)`,
              left: `calc(50% + ${panX}px)`,
              width: `${videoWidth}px`,
              height: `${videoHeight}px`,
              transform: `translate(-50%, -50%) scale(${zoom}) rotate(${rotation}deg)`,
              overflow: "visible",
              borderRadius: syncCornersGlobal
                ? `${borderRadiusGlobal}px`
                : `${borderTopLeftRadiusGlobal}px ${borderTopRightRadiusGlobal}px ${borderBottomRightRadiusGlobal}px ${borderBottomLeftRadiusGlobal}px`
            }}
          >
            <video
              src={url}
              ref={videoRef}
              controls
              draggable={false}
              onDragStart={e => e.preventDefault()}
              className="dinolabsVideoEditorContent"
              style={{
                width: "100%",
                height: "100%",
                userSelect: "none",
                borderRadius: "inherit",
                transform: `scale(${flipX}, ${flipY})`,
                filter: `hue-rotate(${hueGlobal}deg) saturate(${saturationGlobal}%) brightness(${brightnessGlobal}%) contrast(${contrastGlobal}%) blur(${blurGlobal}px) grayscale(${grayscaleGlobal}%) sepia(${sepiaGlobal}%) ${spreadGlobal ? `drop-shadow(0 0 ${spreadGlobal}px rgba(0,0,0,0.5))` : ""}`,
                opacity: opacityGlobal / 100
              }}
            />
            
            {textOverlays.map((overlay, index) => {
              if (currentTime >= overlay.startTime && currentTime < overlay.startTime + overlay.duration) {
                return (
                  <div
                    key={overlay.id}
                    style={{
                      position: "absolute",
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      transform: "translate(-50%, -50%)",
                      fontFamily: overlay.font,
                      fontSize: `${overlay.size}px`,
                      color: overlay.color,
                      textAlign: overlay.alignment,
                      fontWeight: overlay.bold ? "bold" : "normal",
                      fontStyle: overlay.italic ? "italic" : "normal",
                      textDecoration: overlay.underline ? "underline" : "none",
                      opacity: overlay.opacity / 100,
                      pointerEvents: selectedTextOverlay === index ? "auto" : "none",
                      cursor: selectedTextOverlay === index ? "move" : "default",
                      border: selectedTextOverlay === index ? "2px dashed #5C2BE2" : "none",
                      padding: "4px",
                      whiteSpace: "pre-wrap",
                      textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                      zIndex: 100
                    }}
                    onClick={() => setSelectedTextOverlay(index)}
                  >
                    {overlay.text}
                  </div>
                );
              }
              return null;
            })}
            {!isCropping && actionMode === "Idle" && (
              <>
                <div className="dinolabsVideoEditorResizeHandle top-left" onMouseDown={e => handleResizeMouseDown("top-left", e)} style={{ top: "-6px", left: "-6px" }} />
                <div className="dinolabsVideoEditorResizeHandle top-right" onMouseDown={e => handleResizeMouseDown("top-right", e)} style={{ top: "-6px", right: "-6px" }} />
                <div className="dinolabsVideoEditorResizeHandle bottom-left" onMouseDown={e => handleResizeMouseDown("bottom-left", e)} style={{ bottom: "-6px", left: "-6px" }} />
                <div className="dinolabsVideoEditorResizeHandle bottom-right" onMouseDown={e => handleResizeMouseDown("bottom-right", e)} style={{ bottom: "-6px", right: "-6px" }} />
              </>
            )}
            {isCropping && (
              <div
                className="dinolabsVideoEditorCropRectangle"
                style={{
                  position: "absolute",
                  border: "0.4vh dashed rgba(31, 174, 245, 1)",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.width,
                  height: cropRect.height,
                  transform: `rotate(${cropRotation}deg)`,
                  zIndex: 10,
                  borderRadius: circleCrop ? "50%" : "0"
                }}
                onMouseDown={handleCropMouseDown}
              >
                <div className="dinolabsVideoEditorResizeHandle top-left" style={{ pointerEvents: "auto", top: "-8px", left: "-8px" }} onMouseDown={e => handleCropResizeMouseDown("top-left", e)} />
                <div className="dinolabsVideoEditorResizeHandle top-right" style={{ pointerEvents: "auto", top: "-8px", right: "-8px" }} onMouseDown={e => handleCropResizeMouseDown("top-right", e)} />
                <div className="dinolabsVideoEditorResizeHandle bottom-left" style={{ pointerEvents: "auto", bottom: "-8px", left: "-8px" }} onMouseDown={e => handleCropResizeMouseDown("bottom-left", e)} />
                <div className="dinolabsVideoEditorResizeHandle bottom-right" style={{ pointerEvents: "auto", bottom: "-8px", right: "-8px" }} onMouseDown={e => handleCropResizeMouseDown("bottom-right", e)} />
                <div className="dinolabsVideoEditorRotationHandle top-left" style={{ pointerEvents: "auto", position: "absolute", top: "-30px", left: "-30px" }} onMouseDown={handleCropRotationMouseDownHandler} />
                <div className="dinolabsVideoEditorRotationHandle top-right" style={{ pointerEvents: "auto", position: "absolute", top: "-30px", right: "-30px" }} onMouseDown={handleCropRotationMouseDownHandler} />
                <div className="dinolabsVideoEditorRotationHandle bottom-left" style={{ pointerEvents: "auto", position: "absolute", bottom: "-30px", left: "-30px" }} onMouseDown={handleCropRotationMouseDownHandler} />
                <div className="dinolabsVideoEditorRotationHandle bottom-right" style={{ pointerEvents: "auto", position: "absolute", bottom: "-30px", right: "-30px" }} onMouseDown={handleCropRotationMouseDownHandler} />
              </div>
            )}
            <svg
              viewBox={`0 0 ${nativeWidth} ${nativeHeight}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: actionMode !== "Idle" ? "auto" : "none",
                cursor: actionMode === "AddText" ? "text" : "default",
                transform: `scale(${flipX}, ${flipY})`,
                transformOrigin: "center"
              }}
              onMouseDown={handleSvgMouseDown}
            >
            </svg>
          </div>
        </div>
        {showFrameBar && (
          <div className="dinolabsVideoInputBottomBarFrameSupplement" ref={framesContainerRef}>
            {frames.map((frame, idx) => (
              <div
                key={idx}
                className="dinolabsVideoInputBottomBarFrameSupplementImageWrapper"
                draggable={framesPanelMode === "rearrange"}
                onDragStart={framesPanelMode === "rearrange" ? e => handleDragStartFrame(e, idx) : undefined}
                onDragOver={framesPanelMode === "rearrange" ? e => handleDragOverFrame(e, idx) : undefined}
                onDrop={framesPanelMode === "rearrange" ? e => handleDropFrame(e, idx) : undefined}
                style={{
                  border: (framesPanelMode === "rearrange" && dropTargetIndex === idx && draggedFrameIndex !== idx) ? "0.2vh dashed rgba(31, 174, 245, 1)" : "none",
                  backgroundColor: (framesPanelMode === "rearrange" && dropTargetIndex === idx && draggedFrameIndex !== idx) ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.0)"
                }}
                onClick={() => {
                  if (framesPanelMode === "view" && videoRef.current) {
                    videoRef.current.currentTime = frame.time;
                    setCurrentTime(frame.time);
                  }
                }}
              >
                <img src={frame.dataUrl} alt={`Frame ${idx}`} className="dinolabsVideoInputBottomBarFrameSupplementImage" />
                <span className="dinolabsVideoInputBottomBarFrameSupplementImageText">{formatTime(frame.time)}</span>
              </div>
            ))}
          </div>
        )}
        {showTimeline && (
          <Timeline
            clips={timelineClips}
            selectedClips={selectedClips}
            onClipSelect={handleClipSelect}
            onClipSplit={handleClipSplit}
            onClipDelete={handleClipDelete}
            onClipMove={handleClipMove}
            currentTime={currentTime}
            duration={originalDuration || 0}
            onTimelineSeek={handleTimelineSeek}
            timelineZoom={timelineZoom}
            onTimelineZoom={setTimelineZoom}
          />
        )}
        <div className="dinolabsVideoInputBottomBar">
          <div className="dinolabsVideoContentFlex">
            <Tippy content="Rewind 15 Seconds" theme="tooltip-light"><button className="dinolabsVideoButtonSupplementLeading" onClick={handleRewind15} disabled={showFrameBar && framesPanelMode !== "view"} style={{ opacity: (showFrameBar && framesPanelMode !== "view") ? 0.5 : 1.0 }}><FontAwesomeIcon icon={faBackward} /></button></Tippy>
            <Tippy content="Previous Frame" theme="tooltip-light"><button className="dinolabsVideoButton" onClick={() => { if (videoRef.current) { const newTime = Math.max(0, videoRef.current.currentTime - 0.033); videoRef.current.currentTime = newTime; setCurrentTime(newTime); } }} disabled={showFrameBar && framesPanelMode !== "view"} style={{ color: "#c0c0c0", opacity: (showFrameBar && framesPanelMode !== "view") ? 0.5 : 1.0 }}><FontAwesomeIcon icon={faStepBackward} /></button></Tippy>
            <Tippy content="Play/Pause Video" theme="tooltip-light"><button className="dinolabsVideoButton" onClick={handlePlayVideo} disabled={showFrameBar && framesPanelMode !== "view"} style={{ color: "#c0c0c0", opacity: (showFrameBar && framesPanelMode !== "view") ? 0.5 : 1.0 }}><FontAwesomeIcon icon={isPlaying ? faPause : faPlay} /></button></Tippy>
            <Tippy content="Next Frame" theme="tooltip-light"><button className="dinolabsVideoButton" onClick={() => { if (videoRef.current && videoRef.current.duration) { const newTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 0.033); videoRef.current.currentTime = newTime; setCurrentTime(newTime); } }} disabled={showFrameBar && framesPanelMode !== "view"} style={{ color: "#c0c0c0", opacity: (showFrameBar && framesPanelMode !== "view") ? 0.5 : 1.0 }}><FontAwesomeIcon icon={faStepForward} /></button></Tippy>
            <Tippy content="Loop Video" theme="tooltip-light"><button className="dinolabsVideoButton" onClick={handleToggleLoop} disabled={showFrameBar && framesPanelMode !== "view"} style={{ color: isLooping ? "#5c2be2" : "#c0c0c0", opacity: (showFrameBar && framesPanelMode !== "view") ? 0.5 : 1.0 }}><FontAwesomeIcon icon={faRepeat} /></button></Tippy>
            <Tippy content="Skip 15 Seconds" theme="tooltip-light"><button className="dinolabsVideoButtonSupplementTrailing" onClick={handleSkip15} disabled={showFrameBar && framesPanelMode !== "view"} style={{ opacity: (showFrameBar && framesPanelMode !== "view") ? 0.5 : 1.0 }}><FontAwesomeIcon icon={faForward} /></button></Tippy>
          </div>
          <div className="dinolabsVideoContentFlexSmall" style={{ justifyContent: "flex-start" }}>
            <Tippy content="Undo (Ctrl+Z)" theme="tooltip-light">
              <button className="dinolabsVideoButton" onClick={handleUndo} disabled={undoStack.length === 0} style={{ opacity: undoStack.length === 0 ? "0.3" : "1.0" }}>
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
            </Tippy>
            <Tippy content="Redo (Ctrl+Shift+Z)" theme="tooltip-light">
              <button className="dinolabsVideoButton" onClick={handleRedo} disabled={redoStack.length === 0} style={{ opacity: redoStack.length === 0 ? "0.3" : "1.0" }}>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </Tippy>
            <Tippy content="Timeline Editor" theme="tooltip-light">
              <button className="dinolabsVideoButton" disabled={isCropping} style={{ color: showTimeline ? "#5C2BE2" : "#c0c0c0", opacity: isCropping ? "0.6" : "1.0" }} onClick={handleTimelineMode}>
                <FontAwesomeIcon icon={faLayerGroup} />
              </button>
            </Tippy>
            <Tippy content="View Video Frames" theme="tooltip-light">
              <button className="dinolabsVideoButton" disabled={isCropping} style={{ color: framesPanelMode === "view" ? "#5C2BE2" : "#c0c0c0", opacity: isCropping ? "0.6" : "1.0" }} onClick={handleViewFrames}><FontAwesomeIcon icon={faFilm} /></button>
            </Tippy>
            <Tippy content="Rearrange Frames" theme="tooltip-light">
              <button className="dinolabsVideoButton" disabled={isCropping} style={{ color: framesPanelMode === "rearrange" ? "#5C2BE2" : "#c0c0c0", opacity: isCropping ? "0.6" : "1.0" }} onClick={handleRearrangeFrames}><FontAwesomeIcon icon={faTape} /></button>
            </Tippy>
            {framesPanelMode === "rearrange" && (
              <Tippy content="Save Reorganized Video" theme="tooltip-light">
                <button className="dinolabsVideoButton" disabled={isCropping} style={{ opacity: isCropping ? "0.6" : "1.0" }} onClick={handleSaveRearrange}><FontAwesomeIcon icon={faSave} /></button>
              </Tippy>
            )}
            {(showFrameBar || showTimeline) && (
              <Tippy content="Frame Extraction Interval" theme="tooltip-light">
                <select className="dinolabsVideoEditorBottomBarInput" value={frameInterval} onChange={(e) => setFrameInterval(Number(e.target.value))} disabled={isExtractingFrames} style={{ opacity: isExtractingFrames ? 0.6 : 1.0 }}>
                  <option value={0.1}>0.1s</option>
                  <option value={0.25}>0.25s</option>
                  <option value={0.5}>0.5s</option>
                  <option value={1}>1s</option>
                  <option value={2}>2s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </Tippy>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default DinoLabsVideoEditor;