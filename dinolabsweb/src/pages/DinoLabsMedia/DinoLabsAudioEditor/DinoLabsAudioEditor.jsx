import React, { useState, useEffect, useRef } from "react";
import "../../../styles/mainStyles/DinoLabsAudioEditor/DinoLabsAudioEditor.css";
import "../../../styles/helperStyles/Slider.css";
import "../../../styles/helperStyles/Checkbox.css";
import { showDialog } from "../../../helpers/Alert.jsx";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowsRotate,
    faDownload,
    faMinus,
    faPlus,
    faRepeat,
    faBackward,
    faForward,
    faStop,
    faPlay,
    faHeadphones,
    faGaugeHigh,
    faKeyboard,
    faWandMagicSparkles,
    faMicrophoneLines,
    faSliders,
    faLayerGroup,
    faObjectGroup,
    faClone,
    faTrash
} from "@fortawesome/free-solid-svg-icons";

function encodeWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.length * numChannels * 2;
    const buffer = new ArrayBuffer(44 + samples);
    const view = new DataView(buffer);
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples, true);
    let offset = 44;
    const channelData = [];
    for (let c = 0; c < numChannels; c++) {
        channelData.push(audioBuffer.getChannelData(c));
    }
    const len = audioBuffer.length;
    for (let i = 0; i < len; i++) {
        for (let c = 0; c < numChannels; c++) {
            let val = Math.max(-1, Math.min(1, channelData[c][i]));
            val = val < 0 ? val * 32768 : val * 32767;
            view.setInt16(offset, val, true);
            offset += 2;
        }
    }
    return new Blob([buffer], { type: "audio/wav" });
}
function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
function createReverbImpulseResponse(audioCtx, duration, decay, reverse) {
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
        const impulseChannelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            const n = reverse ? length - i : i;
            impulseChannelData[i] =
                (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }
    }
    return impulse;
}
const TimelineClip = ({ clip, index, trackIndex, isSelected, onSelect, onSplit, onDelete, timelineScale, timelineOffset, trackHeight, dropTargetIndex, draggedClipIndex, onDragStart, onDragOver, onDrop, onClipResize }) => {
    const clipWidth = (clip.duration * timelineScale);
    const clipLeft = ((clip.startTime - timelineOffset) * timelineScale);
    const isDropTarget = dropTargetIndex === index && draggedClipIndex !== index;
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);

    const handleTrimMouseDown = (e, handle) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setResizeHandle(handle);
    };

    const handleTrimMouseMove = (e) => {
        if (!isResizing || !resizeHandle) return;
        e.preventDefault();
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const timePosition = (x / timelineScale) + timelineOffset;
        
        if (resizeHandle === 'left') {
            const newStartTime = Math.max(0, timePosition);
            const newDuration = Math.max(0.1, clip.duration - (newStartTime - clip.startTime));
            onClipResize(index, trackIndex, { startTime: newStartTime, duration: newDuration });
        } else if (resizeHandle === 'right') {
            const newDuration = Math.max(0.1, timePosition - clip.startTime);
            onClipResize(index, trackIndex, { duration: newDuration });
        }
    };

    const handleTrimMouseUp = (e) => {
        e.preventDefault();
        setIsResizing(false);
        setResizeHandle(null);
    };

    useEffect(() => {
        if (isResizing) {
            const handleMouseMove = (e) => handleTrimMouseMove(e);
            const handleMouseUp = (e) => handleTrimMouseUp(e);
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing, resizeHandle, clip, index, trackIndex, timelineScale, timelineOffset, onClipResize]);

    return (
        <div
            className={`dinolabsVideoEditorTimelineVideoTrackTimelineClip ${isSelected ? "selected" : ""} ${clip.type}`}
            draggable={!isResizing}
            onDragStart={(e) => {
                if (isResizing) {
                    e.preventDefault();
                    return;
                }
                e.dataTransfer.setData('text/plain', '');
                onDragStart(index, trackIndex);
            }}
            onDragOver={(e) => onDragOver(e, index, trackIndex)}
            onDrop={(e) => onDrop(e, index, trackIndex)}
            style={{
                left: clipLeft,
                width: clipWidth,
                backgroundColor: clip.type === "audio" ? "rgba(33, 150, 243, 0.8)" : "rgba(92, 43, 226, 0.6)",
                border: isDropTarget ? "2px dashed #5C2BE2" : (isSelected ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.3)"),
                height: trackHeight - 2,
                position: "absolute",
                top: 1,
                zIndex: isSelected ? 10 : 1,
            }}
            onClick={() => onSelect(index, trackIndex)}
            onDoubleClick={() => onSplit(index, trackIndex)}
        >
            <span>
                {clip.name || `${clip.type} ${index + 1}`}
            </span>
            {clipWidth > 80 && (
                <div className="dinolabsVideoEditorTimelineVideoTrackTimelineClipSection">
                    <button className="dinolabsVideoEditorTimelineVideoTrackTimelineClipSectionDelete" onClick={(e) => { e.stopPropagation(); onDelete(index, trackIndex); }}>
                        <FontAwesomeIcon icon={faTrash} size="xs" color="white" />
                    </button>
                </div>
            )}
            <div 
                className="trim-handle left" 
                style={{ 
                    position: "absolute", 
                    left: 0, 
                    top: 0, 
                    bottom: 0, 
                    width: "4px", 
                    backgroundColor: "rgba(92, 43, 226, 0.8)", 
                    cursor: "ew-resize", 
                    opacity: isSelected ? 1 : 0 
                }}
                onMouseDown={(e) => handleTrimMouseDown(e, 'left')}
            />
            <div 
                className="trim-handle right" 
                style={{ 
                    position: "absolute", 
                    right: 0, 
                    top: 0, 
                    bottom: 0, 
                    width: "4px", 
                    backgroundColor: "rgba(92, 43, 226, 0.8)", 
                    cursor: "ew-resize", 
                    opacity: isSelected ? 1 : 0 
                }}
                onMouseDown={(e) => handleTrimMouseDown(e, 'right')}
            />
        </div>
    );
};
const Timeline = ({ clips, selectedClips, onClipSelect, onClipSplit, onClipDelete, onClipMove, currentTime, duration, onTimelineSeek, timelineZoom, onTimelineZoom, multiSelectMode, setMultiSelectMode, onClipResize }) => {
    const timelineRef = useRef(null);
    const [timelineOffset, setTimelineOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [draggedClipIndex, setDraggedClipIndex] = useState(null);
    const [draggedTrackIndex, setDraggedTrackIndex] = useState(null);
    const [dropTargetIndex, setDropTargetIndex] = useState(null);
    const [dropTargetTrackIndex, setDropTargetTrackIndex] = useState(null);
    const trackHeight = 60;
    const timelineScale = timelineZoom;

    const tracks = [];
    clips.forEach((clip, clipIndex) => {
        let trackIndex = tracks.findIndex(track => 
            track.every(existingClip => 
                clip.startTime >= existingClip.startTime + existingClip.duration || 
                existingClip.startTime >= clip.startTime + clip.duration
            )
        );
        
        if (trackIndex === -1) {
            trackIndex = tracks.length;
            tracks.push([]);
        }
        
        tracks[trackIndex].push({ ...clip, originalIndex: clipIndex });
    });

    const timelineWidth = Math.max(duration * timelineScale, 1000);

    const handleTimelineClick = (e) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = (x / timelineScale) + timelineOffset;
        onTimelineSeek(Math.max(0, Math.min(time, duration)));
    };

    const handleScroll = (e) => {
        const scrollLeft = e.target.scrollLeft;
        const newOffset = scrollLeft / timelineScale;
        setTimelineOffset(newOffset);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = () => {
        setIsDraggingOver(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const handleClipDragStart = (clipIndex, trackIndex) => {
        setDraggedClipIndex(clipIndex);
        setDraggedTrackIndex(trackIndex);
        setDropTargetIndex(null);
        setDropTargetTrackIndex(null);
    };

    const handleClipDragOver = (e, clipIndex, trackIndex) => {
        e.preventDefault();
        setDropTargetIndex(clipIndex);
        setDropTargetTrackIndex(trackIndex);
    };

    const handleClipDrop = (e, clipIndex, trackIndex) => {
        e.preventDefault();
        if (draggedClipIndex !== null && draggedTrackIndex !== null && 
            !(draggedClipIndex === clipIndex && draggedTrackIndex === trackIndex)) {
            const draggedClipOriginalIndex = tracks[draggedTrackIndex][draggedClipIndex].originalIndex;
            const dropTargetOriginalIndex = tracks[trackIndex][clipIndex].originalIndex;
            onClipMove(draggedClipOriginalIndex, dropTargetOriginalIndex);
        }
        setDraggedClipIndex(null);
        setDraggedTrackIndex(null);
        setDropTargetIndex(null);
        setDropTargetTrackIndex(null);
    };

    return (
        <div className="dinolabsVideoInputBottomBarTimelineSupplement">
            <div className="dinolabsVideoEditorTimelineHeader">
                <div className="dinolabsVideoEditorTimelineHeaderSupplementLeading">
                </div>
                <div className="dinolabsVideoEditorTimelineHeaderSupplementTrailing">
                    <span>
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, "0")} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, "0")}
                    </span>
                </div>
            </div>
            <div 
                className="dinolabsVideoEditorTimeline" 
                ref={timelineRef} 
                onClick={handleTimelineClick} 
                onDragEnter={handleDragEnter} 
                onDragLeave={handleDragLeave} 
                onDragOver={handleDragOver} 
                onDrop={handleDrop} 
                onScroll={handleScroll}
                style={{ 
                    backgroundColor: isDraggingOver ? "rgba(92, 43, 226, 0.2)" : "",
                    overflowX: "auto",
                    overflowY: "auto",
                    maxHeight: "400px"
                }}
            >
                <div style={{ width: timelineWidth, minWidth: "100%", position: "relative" }}>
                    <div className="dinolabsVideoEditorTimelineRuler">
                        {Array.from({ length: Math.ceil(duration / 5) + 1 }, (_, i) => i * 5).map(time => (
                            <div className="dinolabsVideoEditorTimelineRulerItem" key={time} style={{ left: (time - timelineOffset) * timelineScale }}>
                                {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, "0")}
                            </div>
                        ))}
                    </div>
                    <div className="dinolabsVideoEditorTimelinePlayhead" style={{ left: (currentTime - timelineOffset) * timelineScale }} />
                    <div className="dinolabsVideoEditorTimelineTrackContainer">
                        {tracks.map((track, trackIndex) => (
                            <div key={trackIndex} className="dinolabsVideoEditorTimelineVideoTracks">
                                <div className="dinolabsVideoEditorTimelineVideoTrackLabel">Track {trackIndex + 1}</div>
                                <div 
                                    className="dinolabsVideoEditorTimelineVideoTrackContent" 
                                    style={{ 
                                        height: trackHeight,
                                        position: "relative",
                                        minWidth: timelineWidth
                                    }}
                                >
                                    {track.map((clip, clipIndex) => (
                                        <TimelineClip
                                            key={`track-${trackIndex}-clip-${clipIndex}`}
                                            clip={clip}
                                            index={clipIndex}
                                            trackIndex={trackIndex}
                                            isSelected={selectedClips.includes(clip.originalIndex)}
                                            onSelect={(clipIdx, trackIdx) => onClipSelect(clip.originalIndex)}
                                            onSplit={(clipIdx, trackIdx) => onClipSplit(clip.originalIndex)}
                                            onDelete={(clipIdx, trackIdx) => onClipDelete(clip.originalIndex)}
                                            onClipResize={onClipResize}
                                            timelineScale={timelineScale}
                                            timelineOffset={timelineOffset}
                                            trackHeight={trackHeight}
                                            dropTargetIndex={dropTargetIndex}
                                            draggedClipIndex={draggedClipIndex}
                                            onDragStart={handleClipDragStart}
                                            onDragOver={handleClipDragOver}
                                            onDrop={handleClipDrop}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
function DinoLabsAudioEditor({ fileHandle }) {
    const [tracks, setTracks] = useState([]);
    const [audioName, setAudioName] = useState("audio");
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1.0);
    const [volume, setVolume] = useState(100);
    const [pan, setPan] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionEnd, setSelectionEnd] = useState(null);
    const [bass, setBass] = useState(0);
    const [mid, setMid] = useState(0);
    const [treble, setTreble] = useState(0);
    const [vocalBoost, setVocalBoost] = useState(0);
    const [vocalIsolation, setVocalIsolation] = useState(4);
    const [echo, setEcho] = useState(0);
    const [reverb, setReverb] = useState(0);
    const [pitchShift, setPitchShift] = useState(0);
    const [attack, setAttack] = useState(5.0);
    const [decay, setDecay] = useState(5.0);
    const [sustain, setSustain] = useState(0.1);
    const [release, setRelease] = useState(5.0);
    const [showTimeline, setShowTimeline] = useState(false);
    const [timelineClips, setTimelineClips] = useState([]);
    const [selectedClips, setSelectedClips] = useState([]);
    const [timelineZoom, setTimelineZoom] = useState(50);
    const waveformCanvasRef = useRef(null);
    const spectrogramCanvasRef = useRef(null);
    const spectrogramSetupRef = useRef(null);
    const frequencyBarsCanvasRef = useRef(null);
    const frequencyBarsSetupRef = useRef(null);
    const oscilloscopeCanvasRef = useRef(null);
    const oscilloscopeSetupRef = useRef(null);
    const loudnessCanvasRef = useRef(null);
    const loudnessSetupRef = useRef(null);
    const stereoLeftCanvasRef = useRef(null);
    const stereoLeftSetupRef = useRef(null);
    const stereoRightCanvasRef = useRef(null);
    const stereoRightSetupRef = useRef(null);
    const phaseScopeCanvasRef = useRef(null);
    const phaseScopeSetupRef = useRef(null);
    const envelopeCanvasRef = useRef(null);
    const sourcesRef = useRef([]);
    const reverbBufferRef = useRef(null);
    const startTimeRef = useRef(0);
    const startTimeOffsetRef = useRef(0);
    const [fadeIn, setFadeIn] = useState(0);
    const [fadeOut, setFadeOut] = useState(0);
    const [fftSize, setFftSize] = useState(2048);
    useEffect(() => {
        (async () => {
            try {
                const file =
                    typeof fileHandle.getFile === "function"
                        ? await fileHandle.getFile()
                        : fileHandle;
                setAudioName(file.name || "audio");
                const objectUrl = URL.createObjectURL(file);
                const arrayBuffer = await file.arrayBuffer();
                const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
                    1,
                    44100 * 40,
                    44100
                );
                const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
                const rawData = audioBuffer.getChannelData(0);
                const samples = 1000;
                const blockSize = Math.floor(rawData.length / samples);
                const filteredData = [];
                for (let i = 0; i < samples; i++) {
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[i * blockSize + j]);
                    }
                    filteredData.push(sum / blockSize);
                }
                const initialClip = {
                    id: Date.now(),
                    name: file.name,
                    url: objectUrl,
                    buffer: audioBuffer,
                    waveformData: filteredData,
                    type: "audio",
                    startTime: 0,
                    duration: audioBuffer.duration,
                    volume: 100,
                    speed: 1.0,
                    effects: []
                };
                setTracks([initialClip]);
                setTimelineClips([initialClip]);
                setDuration(audioBuffer.duration);
                return () => {
                    URL.revokeObjectURL(objectUrl);
                };
            } catch (error) {
                return;
            }
        })();
    }, [fileHandle]);
    const togglePlay = () => {
        if (isPlaying) {
            stopPlayback();
            releaseEnvelope();
        } else {
            startPlayback(currentTime);
            applyEnvelope();
        }
        setIsPlaying(!isPlaying);
    };
    const stopPlayback = () => {
        sourcesRef.current.forEach(s => s.stop(0));
        sourcesRef.current = [];
        const ctxTime = spectrogramSetupRef.current?.audioCtx?.currentTime || 0;
        const rate = currentPlaybackRate * Math.pow(2, pitchShift / 12);
        const elapsed = (ctxTime - startTimeRef.current) * rate;
        setCurrentTime(startTimeOffsetRef.current + elapsed);
    };
    const startPlayback = (offset = 0) => {
        const audioCtx = spectrogramSetupRef.current?.audioCtx;
        if (!audioCtx) return;
        sourcesRef.current = tracks.map(track => {
            const source = audioCtx.createBufferSource();
            source.buffer = track.buffer;
            source.playbackRate.value = currentPlaybackRate * Math.pow(2, pitchShift / 12);
            source.connect(spectrogramSetupRef.current.mixer);
            source.start(0, offset);
            return source;
        });
        startTimeRef.current = audioCtx.currentTime;
        startTimeOffsetRef.current = offset;
    };
    const toggleLoop = () => {
        setIsLooping(!isLooping);
    };
    const setPlaybackRateHandler = (rate) => {
        setCurrentPlaybackRate(rate);
    };
    const skipForward = (seconds = 5) => {
        seekTo(Math.min(duration, currentTime + seconds));
    };
    const skipBackward = (seconds = 5) => {
        seekTo(Math.max(0, currentTime - seconds));
    };
    const seekTo = (time) => {
        setCurrentTime(time);
        if (isPlaying) {
            stopPlayback();
            startPlayback(time);
        }
    };
    useEffect(() => {
        const rate = currentPlaybackRate * Math.pow(2, pitchShift / 12);
        sourcesRef.current.forEach(s => {
            if (s) s.playbackRate.value = rate;
        });
    }, [pitchShift, currentPlaybackRate]);
    useEffect(() => {
        if (spectrogramSetupRef.current) {
            const { masterGain } = spectrogramSetupRef.current;
            if (masterGain) {
                masterGain.gain.value = volume / 100;
            }
        }
    }, [volume]);
    const setTimeFromMouse = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const fraction = x / rect.width;
        seekTo(fraction * duration);
    };
    const handleWaveformMouseDown = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const fraction = x / rect.width;
        const time = fraction * duration;
        if (multiSelectMode) {
            setIsSelecting(true);
            setSelectionStart(time);
        } else {
            setIsSeeking(true);
            seekTo(time);
        }
    };
    const handleWaveformMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const fraction = x / rect.width;
        const time = fraction * duration;
        if (isSelecting) {
            setSelectionEnd(time);
        } else if (isSeeking) {
            seekTo(time);
        }
    };
    const handleWaveformMouseUp = () => {
        setIsSelecting(false);
        setIsSeeking(false);
    };
    useEffect(() => {
        const canvas = waveformCanvasRef.current;
        if (!canvas || tracks.length === 0) return;
        const ctx = canvas.getContext("2d");
        let animationFrameId;
        function drawWaveform() {
            const rect = canvas.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            
            const padding = 16;
            const labelHeight = 25;
            const plotHeight = height - labelHeight;
            const plotWidth = width - padding * 2;
            
            ctx.clearRect(0, 0, width, height);

            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, plotHeight / 2);
            ctx.lineTo(width - padding, plotHeight / 2);
            ctx.stroke();
            
            ctx.font = "700 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.fillStyle = "#94a3b8";
            const tickInterval = Math.max(1, Math.ceil(duration / 8));
            for (let t = 0; t <= duration; t += tickInterval) {
                const x = padding + (t / duration) * plotWidth;
                ctx.beginPath();
                ctx.moveTo(x, plotHeight - 5);
                ctx.lineTo(x, plotHeight + 5);
                ctx.strokeStyle = "#475569";
                ctx.stroke();
                const timeLabel = `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
                const labelWidth = ctx.measureText(timeLabel).width;
                const labelX = Math.max(padding + 8, Math.min(width - padding - labelWidth - 8, x - labelWidth / 2));
                ctx.fillText(timeLabel, labelX, height - 8);
            }
            const numTracks = tracks.length;
            const bandHeight = plotHeight / numTracks;
            for (let tr = 0; tr < numTracks; tr++) {
                const waveformData = tracks[tr].waveformData;
                const maxVal = Math.max(...waveformData, 0.001);
                const centerY = bandHeight / 2 + tr * bandHeight;
                if (tr > 0) {
                    ctx.beginPath();
                    ctx.moveTo(padding, tr * bandHeight);
                    ctx.lineTo(width - padding, tr * bandHeight);
                    ctx.strokeStyle = "#475569";
                    ctx.stroke();
                }
                const sliceWidth = plotWidth / waveformData.length;
                ctx.beginPath();
                ctx.moveTo(padding, centerY);
                for (let i = 0; i < waveformData.length; i++) {
                    const amplitude = waveformData[i] / maxVal;
                    const scaled = amplitude * (bandHeight / 2) * 0.8;
                    const x = padding + i * sliceWidth;
                    const y = centerY - scaled;
                    ctx.lineTo(x, y);
                }
                for (let i = waveformData.length - 1; i >= 0; i--) {
                    const amplitude = waveformData[i] / maxVal;
                    const scaled = amplitude * (bandHeight / 2) * 0.8;
                    const x = padding + i * sliceWidth;
                    const y = centerY + scaled;
                    ctx.lineTo(x, y);
                }
                ctx.closePath();
                const gradient = ctx.createLinearGradient(0, centerY - (bandHeight / 2), 0, centerY + (bandHeight / 2));
                gradient.addColorStop(0, "#ffffff");
                gradient.addColorStop(0.5, "#5C2BE2");
                gradient.addColorStop(1, "#ffffff");
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            const progress = currentTime / duration;
            const xPos = padding + progress * plotWidth;
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, plotHeight);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            if (selectionStart !== null && selectionEnd !== null) {
                const left = padding + Math.min(selectionStart, selectionEnd) / duration * plotWidth;
                const w = Math.abs(selectionEnd - selectionStart) / duration * plotWidth;
                ctx.fillStyle = "rgba(92, 43, 226, 0.4)";
                ctx.fillRect(left, 0, w, plotHeight);
            }
            animationFrameId = requestAnimationFrame(drawWaveform);
        }
        drawWaveform();
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [tracks, duration, currentTime, selectionStart, selectionEnd]);
    useEffect(() => {
        if (tracks.length <= 0 || duration <= 0) return;
        if (spectrogramSetupRef.current) return;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (!reverbBufferRef.current) {
            reverbBufferRef.current = createReverbImpulseResponse(audioCtx, 5, 3, false);
        }
        const analyserMaster = audioCtx.createAnalyser();
        analyserMaster.fftSize = 2048;
        analyserMaster.smoothingTimeConstant = 0.9;
        const envelopeGainNode = audioCtx.createGain();
        envelopeGainNode.gain.value = 0.0001;
        const masterGain = audioCtx.createGain();
        masterGain.gain.value = 1;
        envelopeGainNode.connect(masterGain);
        masterGain.connect(analyserMaster);
        analyserMaster.connect(audioCtx.destination);
        const bassFilter = audioCtx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 200;
        bassFilter.gain.value = 0;
        const midFilter = audioCtx.createBiquadFilter();
        midFilter.type = "peaking";
        midFilter.frequency.value = 1000;
        midFilter.gain.value = 0;
        midFilter.Q.value = 1;
        const trebleFilter = audioCtx.createBiquadFilter();
        trebleFilter.type = "highshelf";
        trebleFilter.frequency.value = 3000;
        trebleFilter.gain.value = 0;
        const bandStopFilter = audioCtx.createBiquadFilter();
        bandStopFilter.type = "peaking";
        bandStopFilter.gain.value = -30;
        bandStopFilter.frequency.value = 1200;
        bandStopFilter.Q.value = 4;
        const vocalFilter = audioCtx.createBiquadFilter();
        vocalFilter.type = "bandpass";
        vocalFilter.frequency.value = 1200;
        vocalFilter.Q.value = 4;
        const vocalGainNode = audioCtx.createGain();
        vocalGainNode.gain.value = 1;
        const preEffectMix = audioCtx.createGain();
        const mixer = audioCtx.createGain();
        mixer.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(bandStopFilter);
        bandStopFilter.connect(preEffectMix);
        trebleFilter.connect(vocalFilter);
        vocalFilter.connect(vocalGainNode);
        vocalGainNode.connect(preEffectMix);
        const finalMix = audioCtx.createGain();
        preEffectMix.connect(finalMix);
        const delayNode = audioCtx.createDelay();
        delayNode.delayTime.value = 0.3;
        const delayFeedbackGain = audioCtx.createGain();
        delayFeedbackGain.gain.value = 0;
        delayNode.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delayNode);
        const echoMixGain = audioCtx.createGain();
        echoMixGain.gain.value = 0;
        preEffectMix.connect(delayNode);
        delayNode.connect(echoMixGain);
        echoMixGain.connect(finalMix);
        const convolverNode = audioCtx.createConvolver();
        convolverNode.buffer = reverbBufferRef.current;
        const reverbMixGain = audioCtx.createGain();
        reverbMixGain.gain.value = 0;
        preEffectMix.connect(convolverNode);
        convolverNode.connect(reverbMixGain);
        reverbMixGain.connect(finalMix);
        const panner = audioCtx.createStereoPanner();
        panner.pan.value = 0;
        finalMix.connect(panner);
        panner.connect(envelopeGainNode);
        const freqAnalyser = audioCtx.createAnalyser();
        freqAnalyser.fftSize = 2048;
        freqAnalyser.smoothingTimeConstant = 0.9;
        mixer.connect(freqAnalyser);
        const loudnessAnalyser = audioCtx.createAnalyser();
        loudnessAnalyser.fftSize = 1024;
        mixer.connect(loudnessAnalyser);
        const oscAnalyser = audioCtx.createAnalyser();
        oscAnalyser.fftSize = 1024;
        oscAnalyser.smoothingTimeConstant = 0.9;
        mixer.connect(oscAnalyser);
        const channelSplitter = audioCtx.createChannelSplitter(2);
        mixer.connect(channelSplitter);
        const leftAnalyser = audioCtx.createAnalyser();
        leftAnalyser.fftSize = 1024;
        const rightAnalyser = audioCtx.createAnalyser();
        rightAnalyser.fftSize = 1024;
        channelSplitter.connect(leftAnalyser, 0);
        channelSplitter.connect(rightAnalyser, 1);
        spectrogramSetupRef.current = {
            audioCtx,
            mixer,
            analyserMaster,
            freqAnalyser,
            loudnessAnalyser,
            oscAnalyser,
            channelSplitter,
            leftAnalyser,
            rightAnalyser,
            envelopeGainNode,
            masterGain,
            bassFilter,
            midFilter,
            trebleFilter,
            bandStopFilter,
            vocalFilter,
            vocalGainNode,
            preEffectMix,
            finalMix,
            delayNode,
            delayFeedbackGain,
            echoMixGain,
            convolverNode,
            reverbMixGain,
            panner
        };
        return () => {
            try {
                freqAnalyser?.disconnect();
                loudnessAnalyser?.disconnect();
                oscAnalyser?.disconnect();
                channelSplitter?.disconnect();
                leftAnalyser?.disconnect();
                rightAnalyser?.disconnect();
                bassFilter?.disconnect();
                midFilter?.disconnect();
                trebleFilter?.disconnect();
                bandStopFilter?.disconnect();
                vocalFilter?.disconnect();
                vocalGainNode?.disconnect();
                delayNode?.disconnect();
                delayFeedbackGain?.disconnect();
                echoMixGain?.disconnect();
                convolverNode?.disconnect();
                reverbMixGain?.disconnect();
                preEffectMix?.disconnect();
                finalMix?.disconnect();
                panner?.disconnect();
                masterGain?.disconnect();
                analyserMaster?.disconnect();
                if (spectrogramSetupRef.current?.audioCtx.state !== "closed") {
                    spectrogramSetupRef.current.audioCtx.close();
                }
            } catch (error) {
                return;
            }
            spectrogramSetupRef.current = null;
        };
    }, [duration, tracks]);
    const applyEnvelope = () => {
        if (!spectrogramSetupRef.current) return;
        const { audioCtx, envelopeGainNode } = spectrogramSetupRef.current;
        if (!audioCtx || !envelopeGainNode) return;
        const now = audioCtx.currentTime;
        envelopeGainNode.gain.cancelScheduledValues(now);
        envelopeGainNode.gain.setValueAtTime(0.0001, now);
        envelopeGainNode.gain.exponentialRampToValueAtTime(1, now + attack);
        const endOfDecay = now + attack + decay;
        let sustainLevel = sustain;
        if (sustainLevel < 0.0001) sustainLevel = 0.0001;
        envelopeGainNode.gain.exponentialRampToValueAtTime(sustainLevel, endOfDecay);
    };
    const releaseEnvelope = () => {
        if (!spectrogramSetupRef.current) return;
        const { audioCtx, envelopeGainNode } = spectrogramSetupRef.current;
        if (!audioCtx || !envelopeGainNode) return;
        const now = audioCtx.currentTime;
        envelopeGainNode.gain.cancelScheduledValues(now);
        const currentVal = envelopeGainNode.gain.value < 0.0001
            ? 0.0001
            : envelopeGainNode.gain.value;
        envelopeGainNode.gain.setValueAtTime(currentVal, now);
        envelopeGainNode.gain.exponentialRampToValueAtTime(0.0001, now + release);
    };
    useEffect(() => {
        if (isPlaying) {
            applyEnvelope();
        }
    }, [attack, decay, sustain, release, isPlaying]);
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        spectrogramSetupRef.current.bassFilter.gain.value = bass;
    }, [bass]);
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        spectrogramSetupRef.current.midFilter.gain.value = mid;
    }, [mid]);
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        spectrogramSetupRef.current.trebleFilter.gain.value = treble;
    }, [treble]);
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        spectrogramSetupRef.current.vocalGainNode.gain.value = Math.pow(10, vocalBoost / 20);
    }, [vocalBoost]);
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        spectrogramSetupRef.current.vocalFilter.Q.value = vocalIsolation;
        spectrogramSetupRef.current.bandStopFilter.Q.value = vocalIsolation;
    }, [vocalIsolation]);
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        const { delayFeedbackGain, echoMixGain } = spectrogramSetupRef.current;
        const echoVal = echo / 100;
        delayFeedbackGain.gain.value = echoVal;
        echoMixGain.gain.value = echoVal;
    }, [echo]);
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        spectrogramSetupRef.current.reverbMixGain.gain.value = reverb / 100;
    }, [reverb]);
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        spectrogramSetupRef.current.panner.pan.value = pan;
    }, [pan]);
    
    // FIXED: Frequency bars visualization - runs continuously after audio setup
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        if (frequencyBarsSetupRef.current) return;
        
        const freqAnalyser = spectrogramSetupRef.current.freqAnalyser;
        if (!freqAnalyser) return;
        
        const canvas = frequencyBarsCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        const bufferLength = freqAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let animationFrameId;
        
        function drawFrequencyBars() {
            freqAnalyser.getByteFrequencyData(dataArray);
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            
            const padding = 16;
            const labelHeight = 20;
            const plotHeight = rect.height - labelHeight;
            const plotWidth = rect.width - padding * 2;
            
            ctx.clearRect(0, 0, rect.width, rect.height);

            const barWidth = (plotWidth / bufferLength) * 2.5;
            let x = padding;
            for (let i = 0; i < bufferLength / 2; i++) {
                const magnitude = dataArray[i] / 255;
                const barHeight = magnitude * plotHeight * 0.9;
                const gradient = ctx.createLinearGradient(0, plotHeight, 0, plotHeight - barHeight);
                gradient.addColorStop(0, "#ffffff");
                gradient.addColorStop(1, "#5C2BE2");
                ctx.fillStyle = gradient;
                ctx.fillRect(x, plotHeight - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
            
            ctx.font = "700 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.fillStyle = "#94a3b8";
            const { audioCtx } = spectrogramSetupRef.current;
            const sampleRate = audioCtx.sampleRate;
            const fftSize = freqAnalyser.fftSize;
            const binSize = sampleRate / fftSize;
            const freqLabels = [100, 1000, 5000, 10000];
            freqLabels.forEach((f) => {
                if (f > sampleRate / 2) return;
                const i = Math.floor(f / binSize);
                const labelX = padding + i * (barWidth + 1);
                if (labelX < rect.width - padding - 40 && labelX > padding + 8) {
                    const label = f >= 1000 ? `${f / 1000}k` : f.toString();
                    ctx.fillText(label, labelX, rect.height - 8);
                }
            });
            animationFrameId = requestAnimationFrame(drawFrequencyBars);
        }
        
        drawFrequencyBars();
        frequencyBarsSetupRef.current = { animationFrameId };
        
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            frequencyBarsSetupRef.current = null;
        };
    }, [spectrogramSetupRef.current]); // Fixed: Depend on audio setup being ready
    
    // FIXED: Oscilloscope visualization - runs continuously after audio setup
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        if (oscilloscopeSetupRef.current) return;
        
        const oscAnalyser = spectrogramSetupRef.current.oscAnalyser;
        if (!oscAnalyser) return;
        
        const canvas = oscilloscopeCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        const bufferLength = oscAnalyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        let animationFrameId;
        
        const handleDraw = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            
            const padding = 16;
            const labelWidth = 35;
            const titleHeight = 0;
            const plotWidth = rect.width - labelWidth - padding;
            const plotHeight = rect.height - titleHeight - padding;
            
            ctx.clearRect(0, 0, rect.width, rect.height);
            
            const thresholds = [0.25, 0.5, 0.75];
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = "#475569";
            thresholds.forEach((t) => {
                const yPos = titleHeight + plotHeight / 2 - t * (plotHeight / 2) + padding / 2;
                ctx.beginPath();
                ctx.moveTo(labelWidth, yPos);
                ctx.lineTo(rect.width - padding, yPos);
                ctx.stroke();
                const yNeg = titleHeight + plotHeight / 2 + t * (plotHeight / 2) + padding / 2;
                ctx.beginPath();
                ctx.moveTo(labelWidth, yNeg);
                ctx.lineTo(rect.width - padding, yNeg);
                ctx.stroke();
            });
            
            ctx.font = "700 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.textAlign = "right";
            const labels = ["1.0", "0.5", "0", "-0.5", "-1.0"];
            const positions = [0.25, 0.125, 0, -0.125, -0.25];
            labels.forEach((label, i) => {
                const y = titleHeight + plotHeight / 2 - positions[i] * plotHeight + 3 + padding / 2;
                ctx.fillText(label, labelWidth - 8, y);
            });
            ctx.textAlign = "left";
            
            oscAnalyser.getByteTimeDomainData(dataArray);
            ctx.beginPath();
            const sliceWidth = plotWidth / bufferLength;
            let x = labelWidth;
            for (let i = 0; i < bufferLength; i++) {
                const v = (dataArray[i] - 128) / 128;
                const y = titleHeight + (v * plotHeight) / 2 + plotHeight / 2 + padding / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            animationFrameId = requestAnimationFrame(handleDraw);
        };
        
        handleDraw();
        oscilloscopeSetupRef.current = { animationFrameId };
        
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            oscilloscopeSetupRef.current = null;
        };
    }, [spectrogramSetupRef.current]); // Fixed: Depend on audio setup being ready
    
    // FIXED: Stereo left visualization - runs continuously after audio setup
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        if (stereoLeftSetupRef.current) return;
        
        const { leftAnalyser } = spectrogramSetupRef.current;
        if (!leftAnalyser) return;
        
        const canvas = stereoLeftCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        const dataArray = new Uint8Array(leftAnalyser.fftSize);
        const totalBars = 30;
        let animationFrameId;
        
        const drawLeftMeter = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            
            const padding = 8;
            const labelHeight = 15;
            const meterHeight = rect.height - labelHeight - padding;
            
            leftAnalyser.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const val = dataArray[i] - 128;
                sum += val * val;
            }
            let rmsLeft = (Math.sqrt(sum / dataArray.length) / 128) * 4;
            if (rmsLeft > 1) rmsLeft = 1;
            const activeBarsLeft = Math.floor(rmsLeft * totalBars);
            ctx.clearRect(0, 0, rect.width, rect.height);
            
            const barHeight = meterHeight / totalBars;
            for (let i = 0; i < totalBars; i++) {
                const y = padding + meterHeight - (i + 1) * barHeight;
                if (i < activeBarsLeft) {
                    const ratio = i / (totalBars - 1);
                    if (ratio < 0.3) {
                        ctx.fillStyle = "#475569"; 
                    } else if (ratio < 0.7) {
                        ctx.fillStyle = "#5C2BE2";   
                    } else {
                        ctx.fillStyle = "#f1f5f9"; 
                    }
                } else {
                    ctx.fillStyle = "#334155";
                }
                ctx.fillRect(padding, y, rect.width - padding * 2, barHeight - 1);
            }
            
            ctx.font = "700 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.textAlign = "center";
            ctx.fillText("L", rect.width / 2, rect.height - 4);
            ctx.textAlign = "left";
            animationFrameId = requestAnimationFrame(drawLeftMeter);
        };
        
        drawLeftMeter();
        stereoLeftSetupRef.current = { animationFrameId };
        
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            stereoLeftSetupRef.current = null;
        };
    }, [spectrogramSetupRef.current]); // Fixed: Depend on audio setup being ready
    
    // FIXED: Stereo right visualization - runs continuously after audio setup
    useEffect(() => {
        if (!spectrogramSetupRef.current) return;
        if (stereoRightSetupRef.current) return;
        
        const { rightAnalyser } = spectrogramSetupRef.current;
        if (!rightAnalyser) return;
        
        const canvas = stereoRightCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        const dataArray = new Uint8Array(rightAnalyser.fftSize);
        const totalBars = 30;
        let animationFrameId;
        
        const drawRightMeter = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            
            const padding = 8;
            const labelHeight = 15;
            const meterHeight = rect.height - labelHeight - padding;
            
            rightAnalyser.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const val = dataArray[i] - 128;
                sum += val * val;
            }
            let rmsRight = (Math.sqrt(sum / dataArray.length) / 128) * 4;
            if (rmsRight > 1) rmsRight = 1;
            const activeBarsRight = Math.floor(rmsRight * totalBars);
            ctx.clearRect(0, 0, rect.width, rect.height);
            
            const barHeight = meterHeight / totalBars;
            for (let i = 0; i < totalBars; i++) {
                const y = padding + meterHeight - (i + 1) * barHeight;
                if (i < activeBarsRight) {
                    const ratio = i / (totalBars - 1);
                    if (ratio < 0.3) {
                        ctx.fillStyle = "#475569"; 
                    } else if (ratio < 0.7) {
                        ctx.fillStyle = "#5C2BE2";  
                    } else {
                        ctx.fillStyle = "#f1f5f9"; 
                    }
                } else {
                    ctx.fillStyle = "#334155"; 
                }
                ctx.fillRect(padding, y, rect.width - padding * 2, barHeight - 1);
            }
            
            ctx.font = "700 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.textAlign = "center";
            ctx.fillText("R", rect.width / 2, rect.height - 4);
            ctx.textAlign = "left";
            animationFrameId = requestAnimationFrame(drawRightMeter);
        };
        
        drawRightMeter();
        stereoRightSetupRef.current = { animationFrameId };
        
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            stereoRightSetupRef.current = null;
        };
    }, [spectrogramSetupRef.current]); // Fixed: Depend on audio setup being ready
    
    useEffect(() => {
        if (tracks.length <= 0 || duration <= 0) return;
        if (!spectrogramSetupRef.current) return;
        if (phaseScopeSetupRef.current) return;
        const { leftAnalyser, rightAnalyser } = spectrogramSetupRef.current;
        if (!leftAnalyser || !rightAnalyser) return;
        const canvas = phaseScopeCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const bufferLength = leftAnalyser.fftSize;
        const leftData = new Uint8Array(bufferLength);
        const rightData = new Uint8Array(bufferLength);
        const drawPhaseScope = () => {
            leftAnalyser.getByteTimeDomainData(leftData);
            rightAnalyser.getByteTimeDomainData(rightData);
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, rect.width, rect.height);

            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 0.5;
            const gridLines = 5;
            for (let i = 1; i < gridLines; i++) {
                const x = (i / gridLines) * rect.width;
                const y = (i / gridLines) * rect.height;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, rect.height);
                ctx.moveTo(0, y);
                ctx.lineTo(rect.width, y);
                ctx.stroke();
            }
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, rect.height / 2);
            ctx.lineTo(rect.width, rect.height / 2);
            ctx.moveTo(rect.width / 2, 0);
            ctx.lineTo(rect.width / 2, rect.height);
            ctx.stroke();
            ctx.beginPath();
            for (let i = 0; i < bufferLength; i += 4) {
                const leftVal = (leftData[i] - 128) / 128;
                const rightVal = (rightData[i] - 128) / 128;
                const xPos = (leftVal * 0.45 + 0.5) * rect.width;
                const yPos = ((-rightVal * 0.45) + 0.5) * rect.height;
                if (i === 0) {
                    ctx.moveTo(xPos, yPos);
                } else {
                    ctx.lineTo(xPos, yPos);
                }
            }
            ctx.strokeStyle = "#5C2BE2";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.font = "700 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("L+", rect.width - 20, rect.height / 2 + 15);
            ctx.fillText("L-", 5, rect.height / 2 + 15);
            ctx.fillText("R+", rect.width / 2 - 10, 15);
            ctx.fillText("R-", rect.width / 2 - 10, rect.height - 5);
            requestAnimationFrame(drawPhaseScope);
        };
        drawPhaseScope();
        phaseScopeSetupRef.current = { running: true };
        return () => {
            phaseScopeSetupRef.current = null;
        };
    }, [duration]);
    useEffect(() => {
        if (tracks.length <= 0 || duration <= 0) return;
        if (!spectrogramSetupRef.current) return;
        const freqAnalyser = spectrogramSetupRef.current.freqAnalyser;
        if (!freqAnalyser) return;
        const canvas = spectrogramCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const bufferLength = freqAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let x = 0;
        const drawSpectrogram = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                x = 0;
            }
            ctx.scale(dpr, dpr);
            freqAnalyser.getByteFrequencyData(dataArray);
            const imageData = ctx.getImageData(1, 0, rect.width - 1, rect.height);
            ctx.putImageData(imageData, 0, 0);
            ctx.clearRect(rect.width - 1, 0, 1, rect.height);
            const sliceHeight = rect.height / bufferLength;
            for (let i = 0; i < bufferLength; i++) {
                const magnitude = dataArray[i] / 255;

                if (magnitude < 0.3) {
                    ctx.fillStyle = "#334155"; 
                } else if (magnitude < 0.7) {
                    ctx.fillStyle = "#5C2BE2"; 
                } else {
                    ctx.fillStyle = "#f1f5f9"; 
                }
                const y = (bufferLength - i - 1) * sliceHeight;
                ctx.fillRect(rect.width - 1, y, 1, sliceHeight + 1);
            }
            ctx.font = "700 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.fillStyle = "#94a3b8";
            const { audioCtx } = spectrogramSetupRef.current;
            const sampleRate = audioCtx.sampleRate;
            const fftSize = freqAnalyser.fftSize;
            const binSize = sampleRate / fftSize;
            const freqLabels = [20, 100, 500, 2000, 10000, 20000];
            freqLabels.forEach((f) => {
                if (f > sampleRate / 2) return;
                const i = Math.floor(f / binSize);
                const y = (bufferLength - i - 1) * sliceHeight + sliceHeight / 2;
                ctx.fillText(f >= 1000 ? `${f / 1000}k` : f, 2, y);
            });
            x = (x + 1) % rect.width;
            requestAnimationFrame(drawSpectrogram);
        };
        drawSpectrogram();
        return () => { };
    }, [duration]);
    useEffect(() => {
        const canvas = envelopeCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        function drawEnvelope() {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, rect.width, rect.height);
            
            const sustainTime = 5;
            const totalTime = attack + decay + sustainTime + release;
            let x = 0;
            ctx.beginPath();
            ctx.moveTo(0, rect.height);
            x = (attack / totalTime) * rect.width;
            ctx.lineTo(x, 0);
            const decayStart = x;
            x += (decay / totalTime) * rect.width;
            ctx.lineTo(x, rect.height - sustain * rect.height);
            const sustainStart = x;
            x += (sustainTime / totalTime) * rect.width;
            ctx.lineTo(x, rect.height - sustain * rect.height);
            const releaseStart = x;
            x += (release / totalTime) * rect.width;
            ctx.lineTo(x, rect.height);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = "700 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("A", decayStart / 2 - 5, rect.height - 10);
            ctx.fillText("D", (decayStart + sustainStart) / 2 - 5, rect.height - 10);
            ctx.fillText("S", (sustainStart + releaseStart) / 2 - 5, rect.height - 10);
            ctx.fillText("R", (releaseStart + rect.width) / 2 - 5, rect.height - 10);
        }
        drawEnvelope();
    }, [attack, decay, sustain, release]);
    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                if (spectrogramSetupRef.current?.audioCtx) {
                    const ctxTime = spectrogramSetupRef.current.audioCtx.currentTime;
                    const rate = currentPlaybackRate * Math.pow(2, pitchShift / 12);
                    const elapsed = (ctxTime - startTimeRef.current) * rate;
                    const newTime = startTimeOffsetRef.current + elapsed;
                    setCurrentTime(newTime);
                    if (newTime >= duration) {
                        if (isLooping) {
                            seekTo(0);
                        } else {
                            stopPlayback();
                            setIsPlaying(false);
                            releaseEnvelope();
                        }
                    }
                }
            }, 50);
        }
        return () => clearInterval(interval);
    }, [isPlaying, duration, isLooping, currentPlaybackRate, pitchShift]);
    const handleMergeTracks = async () => {
        if (tracks.length === 0) return;
        const sampleRate = tracks[0].buffer.sampleRate;
        const offlineCtx = new OfflineAudioContext(
            2,
            Math.ceil(duration * sampleRate),
            sampleRate
        );
        const sources = tracks.map(track => {
            const src = offlineCtx.createBufferSource();
            src.buffer = track.buffer;
            src.playbackRate.value = Math.pow(2, pitchShift / 12);
            return src;
        });
        let convBuffer = reverbBufferRef.current;
        if (!convBuffer) {
            convBuffer = createReverbImpulseResponse(offlineCtx, 5, 3, false);
        }
        const convolverNode = offlineCtx.createConvolver();
        convolverNode.buffer = convBuffer;
        const reverbMixGain = offlineCtx.createGain();
        reverbMixGain.gain.value = reverb / 100;
        const envelopeGainNode = offlineCtx.createGain();
        envelopeGainNode.gain.value = 1;
        const bassFilter = offlineCtx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 200;
        bassFilter.gain.value = bass;
        const midFilter = offlineCtx.createBiquadFilter();
        midFilter.type = "peaking";
        midFilter.frequency.value = 1000;
        midFilter.gain.value = mid;
        midFilter.Q.value = 1;
        const trebleFilter = offlineCtx.createBiquadFilter();
        trebleFilter.type = "highshelf";
        trebleFilter.frequency.value = 3000;
        trebleFilter.gain.value = treble;
        const bandStopFilter = offlineCtx.createBiquadFilter();
        bandStopFilter.type = "peaking";
        bandStopFilter.gain.value = -30;
        bandStopFilter.frequency.value = 1200;
        bandStopFilter.Q.value = vocalIsolation;
        const vocalFilter = offlineCtx.createBiquadFilter();
        vocalFilter.type = "bandpass";
        vocalFilter.frequency.value = 1200;
        vocalFilter.Q.value = vocalIsolation;
        const vocalGainNode = offlineCtx.createGain();
        vocalGainNode.gain.value = Math.pow(10, vocalBoost / 20);
        const preEffectMix = offlineCtx.createGain();
        const finalMix = offlineCtx.createGain();
        const delayNode = offlineCtx.createDelay();
        delayNode.delayTime.value = 0.3;
        const delayFeedbackGain = offlineCtx.createGain();
        delayFeedbackGain.gain.value = echo / 100;
        delayNode.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delayNode);
        const echoMixGain = offlineCtx.createGain();
        echoMixGain.gain.value = echo / 100;
        const offlineMixer = offlineCtx.createGain();
        sources.forEach(src => src.connect(offlineMixer));
        offlineMixer.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(bandStopFilter);
        bandStopFilter.connect(preEffectMix);
        trebleFilter.connect(vocalFilter);
        vocalFilter.connect(vocalGainNode);
        vocalGainNode.connect(preEffectMix);
        preEffectMix.connect(finalMix);
        preEffectMix.connect(delayNode);
        delayNode.connect(echoMixGain);
        echoMixGain.connect(finalMix);
        preEffectMix.connect(convolverNode);
        convolverNode.connect(reverbMixGain);
        reverbMixGain.connect(finalMix);
        const panner = offlineCtx.createStereoPanner();
        panner.pan.value = pan;
        finalMix.connect(panner);
        panner.connect(envelopeGainNode);
        envelopeGainNode.connect(offlineCtx.destination);
        envelopeGainNode.gain.setValueAtTime(0.0001, 0);
        envelopeGainNode.gain.linearRampToValueAtTime(1, fadeIn);
        envelopeGainNode.gain.exponentialRampToValueAtTime(1, attack + fadeIn);
        envelopeGainNode.gain.exponentialRampToValueAtTime(
            Math.max(sustain, 0.0001),
            attack + decay
        );
        const totalDur = duration;
        const fadeStart = totalDur - release;
        if (fadeStart > attack + decay) {
            envelopeGainNode.gain.setValueAtTime(
                Math.max(sustain, 0.0001),
                fadeStart
            );
            envelopeGainNode.gain.exponentialRampToValueAtTime(
                0.0001,
                fadeStart + release
            );
        }
        envelopeGainNode.gain.setValueAtTime(1, totalDur - fadeOut);
        envelopeGainNode.gain.linearRampToValueAtTime(0.0001, totalDur);
        sources.forEach(src => src.start(0));
        const renderedBuffer = await offlineCtx.startRendering();
        const rawData = renderedBuffer.getChannelData(0);
        const samples = 1000;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[i * blockSize + j]);
            }
            filteredData.push(sum / blockSize);
        }
        const mergedTrack = {
            id: Date.now(),
            name: "merged",
            url: URL.createObjectURL(encodeWav(renderedBuffer)),
            buffer: renderedBuffer,
            waveformData: filteredData,
            type: "audio",
            startTime: 0,
            duration: renderedBuffer.duration,
            volume: 100,
            speed: 1.0,
            effects: []
        };
        setTracks([mergedTrack]);
        setTimelineClips([mergedTrack]);
        setDuration(renderedBuffer.duration);
        setCurrentTime(0);
        if (isPlaying) {
            stopPlayback();
            setIsPlaying(false);
        }
    };
    const handleDownloadAudio = async () => {
        const baseName = "edited_audio";
        const alertResult = await showDialog({
            title: "Select Audio Type",
            message: "Select the audio type to export.",
            inputs: [
                {
                    name: "fileType",
                    type: "select",
                    label: "Audio Type",
                    defaultValue: "wav",
                    options: [
                        { label: ".wav", value: "wav" },
                        { label: ".mp3", value: "mp3" },
                        { label: ".flac", value: "flac" }
                    ]
                }
            ],
            showCancel: true
        });
        if (!alertResult) return;
        const fileType = alertResult.fileType;
        const finalName = baseName + "." + fileType;
        if (tracks.length === 0) return;
        const sampleRate = tracks[0].buffer.sampleRate;
        const offlineCtx = new OfflineAudioContext(
            2,
            Math.ceil(duration * sampleRate),
            sampleRate
        );
        const sources = tracks.map(track => {
            const src = offlineCtx.createBufferSource();
            src.buffer = track.buffer;
            src.playbackRate.value = Math.pow(2, pitchShift / 12);
            return src;
        });
        let convBuffer = reverbBufferRef.current;
        if (!convBuffer) {
            convBuffer = createReverbImpulseResponse(offlineCtx, 5, 3, false);
        }
        const convolverNode = offlineCtx.createConvolver();
        convolverNode.buffer = convBuffer;
        const reverbMixGain = offlineCtx.createGain();
        reverbMixGain.gain.value = reverb / 100;
        const envelopeGainNode = offlineCtx.createGain();
        envelopeGainNode.gain.value = 1;
        const bassFilter = offlineCtx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 200;
        bassFilter.gain.value = bass;
        const midFilter = offlineCtx.createBiquadFilter();
        midFilter.type = "peaking";
        midFilter.frequency.value = 1000;
        midFilter.gain.value = mid;
        midFilter.Q.value = 1;
        const trebleFilter = offlineCtx.createBiquadFilter();
        trebleFilter.type = "highshelf";
        trebleFilter.frequency.value = 3000;
        trebleFilter.gain.value = treble;
        const bandStopFilter = offlineCtx.createBiquadFilter();
        bandStopFilter.type = "peaking";
        bandStopFilter.gain.value = -30;
        bandStopFilter.frequency.value = 1200;
        bandStopFilter.Q.value = vocalIsolation;
        const vocalFilter = offlineCtx.createBiquadFilter();
        vocalFilter.type = "bandpass";
        vocalFilter.frequency.value = 1200;
        vocalFilter.Q.value = vocalIsolation;
        const vocalGainNode = offlineCtx.createGain();
        vocalGainNode.gain.value = Math.pow(10, vocalBoost / 20);
        const preEffectMix = offlineCtx.createGain();
        const finalMix = offlineCtx.createGain();
        const delayNode = offlineCtx.createDelay();
        delayNode.delayTime.value = 0.3;
        const delayFeedbackGain = offlineCtx.createGain();
        delayFeedbackGain.gain.value = echo / 100;
        delayNode.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delayNode);
        const echoMixGain = offlineCtx.createGain();
        echoMixGain.gain.value = echo / 100;
        const offlineMixer = offlineCtx.createGain();
        sources.forEach(src => src.connect(offlineMixer));
        offlineMixer.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(bandStopFilter);
        bandStopFilter.connect(preEffectMix);
        trebleFilter.connect(vocalFilter);
        vocalFilter.connect(vocalGainNode);
        vocalGainNode.connect(preEffectMix);
        preEffectMix.connect(finalMix);
        preEffectMix.connect(delayNode);
        delayNode.connect(echoMixGain);
        echoMixGain.connect(finalMix);
        preEffectMix.connect(convolverNode);
        convolverNode.connect(reverbMixGain);
        reverbMixGain.connect(finalMix);
        const panner = offlineCtx.createStereoPanner();
        panner.pan.value = pan;
        finalMix.connect(panner);
        panner.connect(envelopeGainNode);
        envelopeGainNode.connect(offlineCtx.destination);
        envelopeGainNode.gain.setValueAtTime(0.0001, 0);
        envelopeGainNode.gain.linearRampToValueAtTime(1, fadeIn);
        envelopeGainNode.gain.exponentialRampToValueAtTime(1, attack + fadeIn);
        envelopeGainNode.gain.exponentialRampToValueAtTime(
            Math.max(sustain, 0.0001),
            attack + decay
        );
        const totalDur = duration;
        const fadeStart = totalDur - release;
        if (fadeStart > attack + decay) {
            envelopeGainNode.gain.setValueAtTime(
                Math.max(sustain, 0.0001),
                fadeStart
            );
            envelopeGainNode.gain.exponentialRampToValueAtTime(
                0.0001,
                fadeStart + release
            );
        }
        envelopeGainNode.gain.setValueAtTime(1, totalDur - fadeOut);
        envelopeGainNode.gain.linearRampToValueAtTime(0.0001, totalDur);
        sources.forEach(src => src.start(0));
        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = encodeWav(renderedBuffer);
        const downloadUrl = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    };
    const handleResetAll = () => {
        if (isPlaying) {
            stopPlayback();
        }
        setIsPlaying(false);
        setIsLooping(false);
        setVolume(100);
        setPan(0);
        setBass(0);
        setMid(0);
        setTreble(0);
        setVocalBoost(0);
        setVocalIsolation(4);
        setEcho(0);
        setReverb(0);
        setPitchShift(0);
        setCurrentPlaybackRate(1.0);
        setAttack(5.0);
        setDecay(5.0);
        setSustain(0.1);
        setRelease(5.0);
    };
    const handleResetPitch = () => {
        setPitchShift(0);
    };
    const handleResetEQ = () => {
        setBass(0);
        setMid(0);
        setTreble(0);
    };
    const handleResetEffects = () => {
        setEcho(0);
        setReverb(0);
    };
    const handleResetVocals = () => {
        setVocalBoost(0);
        setVocalIsolation(4);
    };
    const handleResetADSR = () => {
        setAttack(5.0);
        setDecay(5.0);
        setSustain(0.1);
        setRelease(5.0);
    };
    function formatTime(t) {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }
    const handleTimelineSeek = (time) => {
        setCurrentTime(time);
    };
    const handleClipSelect = (index) => {
        if (multiSelectMode) {
            setSelectedClips(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
        } else {
            setSelectedClips([index]);
        }
    };
    const handleClipSplit = (index) => {
        const clip = timelineClips[index];
        if (!clip) return;
        const splitTime = currentTime - clip.startTime;
        if (splitTime <= 0 || splitTime >= clip.duration) return;
        const newClips = [...timelineClips];
        const firstPart = { ...clip, duration: splitTime };
        const secondPart = { ...clip, startTime: clip.startTime + splitTime, duration: clip.duration - splitTime, id: Date.now() };
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
        let currentStart = 0;
        newClips.forEach(clip => {
            clip.startTime = currentStart;
            currentStart += clip.duration;
        });
        setTimelineClips(newClips);
        setDuration(currentStart);
    };
    const handleClipResize = (clipIndex, trackIndex, newProperties) => {
        const newClips = [...timelineClips];
        const clip = newClips[clipIndex];
        if (clip) {
            Object.assign(clip, newProperties);
            setTimelineClips(newClips);
            const maxEnd = Math.max(...newClips.map(c => c.startTime + c.duration));
            setDuration(maxEnd);
        }
    };
    const handleToggleTimeline = () => {
        setShowTimeline(!showTimeline);
    };
    const handleBulkClipOperation = (operation) => {
        const newClips = [...timelineClips];
        selectedClips.forEach(index => {
            switch (operation) {
                case "delete":
                    newClips[index] = null;
                    break;
                case "duplicate":
                    const clip = newClips[index];
                    if (clip) {
                        newClips.push({ ...clip, startTime: clip.startTime + clip.duration, id: Date.now() + Math.random() });
                    }
                    break;
                case "group":
                    break;
                default:
                    break;
            }
        });
        setTimelineClips(newClips.filter(clip => clip !== null));
        setSelectedClips([]);
    };
    useEffect(() => {
        if (spectrogramSetupRef.current) {
            spectrogramSetupRef.current.freqAnalyser.fftSize = fftSize;
        }
    }, [fftSize]);
    return (
        <div className="dinolabsAudioEditorWrapper">
            <div className="dinolabsAudioEditorToolbar">
                <div className="dinolabsAudioEditorCellWrapper">
                    <div className="dinolabsAudioEditorHeaderFlex">
                        <label className="dinolabsAudioEditorCellTitle">
                            <FontAwesomeIcon icon={faHeadphones} />
                            Audio
                        </label>
                        <div className="dinolabsAudioEditorCellFlexSupplement">
                            <Tippy content="Download Audio (Offline Render)" theme="tooltip-light">
                                <button onClick={handleDownloadAudio} className="dinolabsAudioEditorToolButtonHeader">
                                    <FontAwesomeIcon icon={faDownload} />
                                </button>
                            </Tippy>
                            <Tippy content="Reset All" theme="tooltip-light">
                                <button
                                    onClick={handleResetAll}
                                    className="dinolabsAudioEditorToolButtonHeader"
                                >
                                    <FontAwesomeIcon icon={faArrowsRotate} />
                                </button>
                            </Tippy>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Volume: {volume}%</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setVolume((prev) => Math.max(prev - 10, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={(e) => setVolume(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setVolume((prev) => Math.min(prev + 10, 100))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Pan: {pan.toFixed(1)}</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setPan((prev) => Math.max(prev - 0.1, -1))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="-1"
                                    max="1"
                                    step="0.1"
                                    value={pan}
                                    onChange={(e) => setPan(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setPan((prev) => Math.min(prev + 0.1, 1))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="dinolabsAudioEditorCellWrapper">
                    <div className="dinolabsAudioEditorHeaderFlex">
                        <label className="dinolabsAudioEditorCellTitle">
                            <FontAwesomeIcon icon={faGaugeHigh} />
                            Pitch
                        </label>
                        <Tippy content="Reset Pitch" theme="tooltip-light">
                            <button
                                onClick={handleResetPitch}
                                className="dinolabsAudioEditorToolButtonHeader"
                            >
                                <FontAwesomeIcon icon={faArrowsRotate} />
                            </button>
                        </Tippy>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Pitch Shift: {pitchShift} semitones</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setPitchShift((prev) => Math.max(prev - 1, -12))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="-12"
                                    max="12"
                                    value={pitchShift}
                                    onChange={(e) => setPitchShift(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setPitchShift((prev) => Math.min(prev + 1, 12))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="dinolabsAudioEditorCellWrapper">
                    <div className="dinolabsAudioEditorHeaderFlex">
                        <label className="dinolabsAudioEditorCellTitle">
                            <FontAwesomeIcon icon={faKeyboard} />
                            EQ
                        </label>
                        <Tippy content="Reset EQ" theme="tooltip-light">
                            <button
                                onClick={handleResetEQ}
                                className="dinolabsAudioEditorToolButtonHeader"
                            >
                                <FontAwesomeIcon icon={faArrowsRotate} />
                            </button>
                        </Tippy>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Bass: {bass} dB</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setBass((prev) => Math.max(prev - 1, -30))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="-30"
                                    max="30"
                                    value={bass}
                                    onChange={(e) => setBass(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setBass((prev) => Math.min(prev + 1, 30))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Mid: {mid} dB</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setMid((prev) => Math.max(prev - 1, -30))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="-30"
                                    max="30"
                                    value={mid}
                                    onChange={(e) => setMid(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setMid((prev) => Math.min(prev + 1, 30))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Treble: {treble} dB</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setTreble((prev) => Math.max(prev - 1, -30))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="-30"
                                    max="30"
                                    value={treble}
                                    onChange={(e) => setTreble(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setTreble((prev) => Math.min(prev + 1, 30))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="dinolabsAudioEditorCellWrapper">
                    <div className="dinolabsAudioEditorHeaderFlex">
                        <label className="dinolabsAudioEditorCellTitle">
                            <FontAwesomeIcon icon={faWandMagicSparkles} />
                            Effects
                        </label>
                        <Tippy content="Reset Effects" theme="tooltip-light">
                            <button
                                onClick={handleResetEffects}
                                className="dinolabsAudioEditorToolButtonHeader"
                            >
                                <FontAwesomeIcon icon={faArrowsRotate} />
                            </button>
                        </Tippy>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Echo: {echo}%</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setEcho((prev) => Math.max(prev - 5, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={echo}
                                    onChange={(e) => setEcho(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setEcho((prev) => Math.min(prev + 5, 100))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Reverb: {reverb}%</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setReverb((prev) => Math.max(prev - 5, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={reverb}
                                    onChange={(e) => setReverb(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setReverb((prev) => Math.min(prev + 5, 100))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Fade In: {fadeIn} s</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setFadeIn((prev) => Math.max(prev - 0.5, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    value={fadeIn}
                                    onChange={(e) => setFadeIn(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setFadeIn((prev) => Math.min(prev + 0.5, 10))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Fade Out: {fadeOut} s</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setFadeOut((prev) => Math.max(prev - 0.5, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    value={fadeOut}
                                    onChange={(e) => setFadeOut(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setFadeOut((prev) => Math.min(prev + 0.5, 10))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="dinolabsAudioEditorCellWrapper">
                    <div className="dinolabsAudioEditorHeaderFlex">
                        <label className="dinolabsAudioEditorCellTitle">
                            <FontAwesomeIcon icon={faMicrophoneLines} />
                            Vocals
                        </label>
                        <Tippy content="Reset Vocals" theme="tooltip-light">
                            <button
                                onClick={handleResetVocals}
                                className="dinolabsAudioEditorToolButtonHeader"
                            >
                                <FontAwesomeIcon icon={faArrowsRotate} />
                            </button>
                        </Tippy>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Vocal Boost: {vocalBoost} dB</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setVocalBoost((prev) => Math.max(prev - 1, -30))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    min="-30"
                                    max="30"
                                    value={vocalBoost}
                                    onChange={(e) => setVocalBoost(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setVocalBoost((prev) => Math.min(prev + 1, 30))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Vocal Isolation: {vocalIsolation.toFixed(1)} Q</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setVocalIsolation((prev) => Math.max(prev - 0.1, 0.5))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    step="0.1"
                                    min="0.5"
                                    max="20"
                                    value={vocalIsolation}
                                    onChange={(e) => setVocalIsolation(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setVocalIsolation((prev) => Math.min(prev + 0.1, 20))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="dinolabsAudioEditorCellWrapper">
                    <div className="dinolabsAudioEditorHeaderFlex">
                        <label className="dinolabsAudioEditorCellTitle">
                            <FontAwesomeIcon icon={faSliders} />
                            ADSR
                        </label>
                        <Tippy content="Reset ADSR" theme="tooltip-light">
                            <button
                                onClick={handleResetADSR}
                                className="dinolabsAudioEditorToolButtonHeader"
                            >
                                <FontAwesomeIcon icon={faArrowsRotate} />
                            </button>
                        </Tippy>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Attack: {attack.toFixed(1)} s</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setAttack((prev) => Math.max(prev - 1, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    step="1"
                                    min="0"
                                    max="10"
                                    value={attack}
                                    onChange={(e) => setAttack(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setAttack((prev) => Math.min(prev + 1, 10))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Decay: {decay.toFixed(1)} s</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setDecay((prev) => Math.max(prev - 1, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    step="1"
                                    min="0"
                                    max="10"
                                    value={decay}
                                    onChange={(e) => setDecay(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setDecay((prev) => Math.min(prev + 1, 10))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Sustain: {sustain.toFixed(1)}</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setSustain((prev) => Math.max(prev - 0.1, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    step="0.1"
                                    min="0"
                                    max="1"
                                    value={sustain}
                                    onChange={(e) => setSustain(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setSustain((prev) => Math.min(prev + 0.1, 1))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    <div className="dinolabsAudioEditorCellFlexStack">
                        <label className="dinolabsAudioEditorCellFlexTitle">Release: {release.toFixed(1)} s</label>
                        <div className="dinolabsAudioEditorCellFlex">
                            <button
                                onClick={() => setRelease((prev) => Math.max(prev - 1, 0))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faMinus} />
                            </button>
                            <div className="dinolabsAudioEditorSliderWrapper">
                                <input
                                    type="range"
                                    step="1"
                                    min="0"
                                    max="10"
                                    value={release}
                                    onChange={(e) => setRelease(Number(e.target.value))}
                                    className="dinolabsSettingsSlider"
                                />
                            </div>
                            <button
                                onClick={() => setRelease((prev) => Math.min(prev + 1, 10))}
                                className="dinolabsAudioEditorToolButton"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="dinolabsAudioEditorContainerWrapper">
                <div className="dinolabsAudioInputTopBar">
                    <div className="dinolabsAudioEditorAudioControls">
                        <label>{formatTime(currentTime)} / {formatTime(duration)}</label>
                    </div>
                    <div className="dinolabsAudioEditorPlaybackControls">
                        {[0.5, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                            <Tippy key={rate} content={`${rate}x Playback`} theme="tooltip-light">
                                <button
                                    className="dinolabsAudioButtonX"
                                    onClick={() => setPlaybackRateHandler(rate)}
                                    style={{ color: currentPlaybackRate === rate ? "#5C2BE2" : "" }}
                                >
                                    {rate}x
                                </button>
                            </Tippy>
                        ))}
                    </div>
                </div>
                <div className="dinolabsAudioEditorContainer" style={{
                    height: showTimeline ? "40%" : "80%",
                    minHeight: showTimeline ? "40%" : "80%",
                    maxHeight: showTimeline ? "40%" : "80%",
                    overflow: "hidden"
                }}>
                    <div className="dinolabsAudioEditorInnerWrapper">
                        <div className="dinolabsAudioEditorInnerWrapperWaveForm">
                            <canvas
                                ref={waveformCanvasRef}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "block",
                                    cursor: multiSelectMode ? "crosshair" : "pointer"
                                }}
                                onMouseDown={handleWaveformMouseDown}
                                onMouseMove={handleWaveformMouseMove}
                                onMouseUp={handleWaveformMouseUp}
                            />
                        </div>
                        <div className="dinolabsAudioEditorInnerWrapperSupplementsFlex">
                            <div className="dinolabsAudioEditorInnerWrapperSupplementBig">
                                <canvas
                                    ref={frequencyBarsCanvasRef}
                                    style={{ width: "100%", height: "100%", display: "block" }}
                                />
                            </div>
                            <div className="dinolabsAudioEditorInnerWrapperSupplementBig">
                                <canvas
                                    ref={oscilloscopeCanvasRef}
                                    style={{ width: "100%", height: "100%", display: "block" }}
                                />
                            </div>
                            <div className="dinolabsAudioEditorInnerWrapperSupplementSmall">
                                <canvas
                                    ref={stereoLeftCanvasRef}
                                    style={{ width: "100%", height: "100%", display: "block" }}
                                />
                            </div>
                            <div className="dinolabsAudioEditorInnerWrapperSupplementSmall">
                                <canvas
                                    ref={stereoRightCanvasRef}
                                    style={{ width: "100%", height: "100%", display: "block" }}
                                />
                            </div>
                    
                        </div>
                    </div>
                </div>
                {showTimeline && (
                    <Timeline
                        clips={timelineClips}
                        selectedClips={selectedClips}
                        onClipSelect={handleClipSelect}
                        onClipSplit={handleClipSplit}
                        onClipDelete={handleClipDelete}
                        onClipMove={handleClipMove}
                        onClipResize={handleClipResize}
                        currentTime={currentTime}
                        duration={duration}
                        onTimelineSeek={handleTimelineSeek}
                        timelineZoom={timelineZoom}
                        onTimelineZoom={setTimelineZoom}
                        multiSelectMode={multiSelectMode}
                        setMultiSelectMode={setMultiSelectMode}
                    />
                )}
                <div className="dinolabsAudioInputBottomBar">
                    <div className="dinolabsAudioContentFlexBig">
                        <Tippy content="Rewind 5 Seconds" theme="tooltip-light">
                            <button
                                onClick={() => skipBackward(5)}
                                className="dinolabsAudioButtonSupplementLeading"
                            >
                                <FontAwesomeIcon icon={faBackward} />
                            </button>
                        </Tippy>
                        <Tippy content={isPlaying ? "Pause" : "Play"} theme="tooltip-light">
                            <button
                                onClick={togglePlay}
                                className="dinolabsAudioButton"
                            >
                                <FontAwesomeIcon icon={isPlaying ? faStop : faPlay} />
                            </button>
                        </Tippy>
                        <Tippy content="Loop" theme="tooltip-light">
                            <button
                                onClick={toggleLoop}
                                className="dinolabsAudioButton"
                                style={{ color: isLooping ? "#5C2BE2" : "" }}
                            >
                                <FontAwesomeIcon icon={faRepeat} />
                            </button>
                        </Tippy>
                        <Tippy content="Skip 5 Seconds" theme="tooltip-light">
                            <button
                                onClick={() => skipForward(5)}
                                className="dinolabsAudioButtonSupplementTrailing"
                            >
                                <FontAwesomeIcon icon={faForward} />
                            </button>
                        </Tippy>
                    </div>
                    <div className="dinolabsAudioContentFlexSmall" style={{ justifyContent: "flex-end" }}>
                        <Tippy content="Timeline Editor" theme="tooltip-light">
                            <button className="dinolabsAudioButton" style={{ color: showTimeline ? "#5C2BE2" : "" }} onClick={handleToggleTimeline}>
                                <FontAwesomeIcon icon={faLayerGroup} />
                            </button>
                        </Tippy>
                        {showTimeline && selectedClips.length > 0 && (
                            <>
                                <Tippy content="Delete Selected Clips" theme="tooltip-light">
                                    <button className="dinolabsAudioButton" onClick={() => handleBulkClipOperation("delete")}>
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </Tippy>
                                <Tippy content="Duplicate Selected Clips" theme="tooltip-light">
                                    <button className="dinolabsAudioButton" onClick={() => handleBulkClipOperation("duplicate")}>
                                        <FontAwesomeIcon icon={faClone} />
                                    </button>
                                </Tippy>
                                <Tippy content="Group Selected Clips" theme="tooltip-light">
                                    <button className="dinolabsAudioButton" onClick={() => handleBulkClipOperation("group")}>
                                        <FontAwesomeIcon icon={faObjectGroup} />
                                    </button>
                                </Tippy>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
export default DinoLabsAudioEditor;