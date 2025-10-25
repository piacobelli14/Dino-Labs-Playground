import React, { useState, useRef, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faScissors,
  faImage,
  faSliders,
  faCog,
  faDownload,
  faCopy,
  faTrash,
  faEye,
  faFileArrowUp,
  faImages,
  faMagicWandSparkles,
  faArrowsRotate,
  faPaintBrush,
  faEyeDropper,
  faAdjust
} from "@fortawesome/free-solid-svg-icons";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import DinoLabsNav from "../../../helpers/Nav";
import DinoLabsColorPicker from "../../../helpers/ColorPicker.jsx";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsBackgroundRemover/DinoLabsPluginsBackgroundRemover.css";
import "../../../styles/helperStyles/Slider.css";

const DinoLabsPluginsBackgroundRemover = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [tolerance, setTolerance] = useState(30);
  const [smoothing, setSmoothing] = useState(2);
  const [outputFormat, setOutputFormat] = useState("png");
  const [removalMode, setRemovalMode] = useState("smart");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [replaceBackground, setReplaceBackground] = useState(false);
  const [replacementColor, setReplacementColor] = useState("#ffffff");
  const [featherEdge, setFeatherEdge] = useState(true);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [colorPickerOpen, setColorPickerOpen] = useState({
    background: false,
    replacement: false
  });

  const fileInputRef = useRef(null);

  const formatOptions = [
    { value: "png", label: "PNG", extension: ".png" },
    { value: "jpeg", label: "JPEG", extension: ".jpg" },
    { value: "webp", label: "WebP", extension: ".webp" }
  ];

  const removalModes = [
    { value: "smart", label: "Smart Removal" },
    { value: "color", label: "Color Key" },
    { value: "edge", label: "Edge Detection" },
    { value: "corner", label: "Corner Sampling" }
  ];

  const tolerancePresets = [
    { name: "Low", value: 10 },
    { name: "Medium", value: 30 },
    { name: "High", value: 60 },
    { name: "Maximum", value: 100 }
  ];

  const handleFileSelect = useCallback((event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    const fileObjects = imageFiles.map(file => ({
      id: Date.now() + Math.random(),
      originalFile: file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      processed: false
    }));

    setSelectedFiles(prev => [...prev, ...fileObjects]);
  }, []);

  const removeFile = useCallback((fileId) => {
    setSelectedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return updated;
    });
    setProcessedFiles(prev => prev.filter(f => f.originalId !== fileId));
  }, []);

  const clearAllFiles = useCallback(() => {
    selectedFiles.forEach(file => {
      if (file.url) URL.revokeObjectURL(file.url);
    });
    processedFiles.forEach(file => {
      if (file.url) URL.revokeObjectURL(file.url);
    });
    setSelectedFiles([]);
    setProcessedFiles([]);
    setProcessingProgress(0);
  }, [selectedFiles, processedFiles]);

  const toggleColorPicker = (pickerType) => {
    setColorPickerOpen(prev => ({
      ...prev,
      [pickerType]: !prev[pickerType]
    }));
  };

  const closeColorPicker = (pickerType) => {
    setColorPickerOpen(prev => ({
      ...prev,
      [pickerType]: false
    }));
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const colorDistance = (c1, c2) => {
    return Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
  };

  const removeBackground = useCallback(async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let targetColor;
        
        switch (removalMode) {
          case "color":
            targetColor = hexToRgb(backgroundColor);
            break;
          case "corner":
            const corners = [
              {r: data[0], g: data[1], b: data[2]},
              {r: data[(canvas.width - 1) * 4], g: data[(canvas.width - 1) * 4 + 1], b: data[(canvas.width - 1) * 4 + 2]}, 
              {r: data[(canvas.height - 1) * canvas.width * 4], g: data[(canvas.height - 1) * canvas.width * 4 + 1], b: data[(canvas.height - 1) * canvas.width * 4 + 2]}, 
            ];
            targetColor = corners[0]; 
            break;
          case "edge":
            const edgePixels = [];
            for (let i = 0; i < canvas.width; i++) {
              edgePixels.push({r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2]});
            }
            targetColor = edgePixels[0];
            break;
          default: 
            targetColor = {r: data[0], g: data[1], b: data[2]};
            break;
        }

        for (let i = 0; i < data.length; i += 4) {
          const pixel = {r: data[i], g: data[i + 1], b: data[i + 2]};
          const distance = colorDistance(pixel, targetColor);
          
          if (distance <= tolerance) {
            if (replaceBackground) {
              const replacement = hexToRgb(replacementColor);
              data[i] = replacement.r;
              data[i + 1] = replacement.g;
              data[i + 2] = replacement.b;
              data[i + 3] = 255;
            } else {
              data[i + 3] = 0; 
            }
          } else if (featherEdge && distance <= tolerance + smoothing) {
            const alpha = 1 - ((distance - tolerance) / smoothing);
            if (replaceBackground) {
              const replacement = hexToRgb(replacementColor);
              data[i] = Math.round(pixel.r * (1 - alpha) + replacement.r * alpha);
              data[i + 1] = Math.round(pixel.g * (1 - alpha) + replacement.g * alpha);
              data[i + 2] = Math.round(pixel.b * (1 - alpha) + replacement.b * alpha);
              data[i + 3] = 255;
            } else {
              data[i + 3] = Math.round(255 * alpha);
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 
                        outputFormat === 'png' ? 'image/png' : 'image/webp';
        
        canvas.toBlob((blob) => {
          const processedFile = {
            id: Date.now() + Math.random(),
            originalId: file.id,
            name: file.name.replace(/\.[^/.]+$/, formatOptions.find(f => f.value === outputFormat).extension),
            originalSize: file.size,
            processedSize: blob.size,
            blob: blob,
            url: URL.createObjectURL(blob),
            width: canvas.width,
            height: canvas.height,
            format: outputFormat
          };
          resolve(processedFile);
        }, mimeType, outputFormat === 'jpeg' ? 0.9 : undefined);
      };
      img.src = file.url;
    });
  }, [tolerance, smoothing, outputFormat, removalMode, backgroundColor, replaceBackground, replacementColor, featherEdge]);

  const processFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessedFiles([]);

    const newProcessedFiles = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      try {
        const processedFile = await removeBackground(selectedFiles[i]);
        newProcessedFiles.push(processedFile);
        setProcessingProgress(((i + 1) / selectedFiles.length) * 100);
        setProcessedFiles(prev => [...prev, processedFile]);
      } catch (error) {}
    }

    setIsProcessing(false);
  }, [selectedFiles, removeBackground]);

  const downloadFile = useCallback((processedFile) => {
    const a = document.createElement('a');
    a.href = processedFile.url;
    a.download = processedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const downloadAllFiles = useCallback(() => {
    processedFiles.forEach(file => {
      setTimeout(() => downloadFile(file), 100);
    });
  }, [processedFiles, downloadFile]);

  const resetSettings = useCallback(() => {
    setTolerance(30);
    setSmoothing(2);
    setOutputFormat("png");
    setRemovalMode("smart");
    setBackgroundColor("#ffffff");
    setReplaceBackground(false);
    setReplacementColor("#ffffff");
    setFeatherEdge(true);
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalOriginalSize = useMemo(() => 
    selectedFiles.reduce((total, file) => total + file.size, 0), [selectedFiles]);

  const totalProcessedSize = useMemo(() => 
    processedFiles.reduce((total, file) => total + file.processedSize, 0), [processedFiles]);

  return (
    <div className="dinolabsBackgroundRemoverApp" tabIndex={0}>
      <DinoLabsNav activePage="plugins" />

      <div className="dinolabsBackgroundRemoverShell">
        <aside className="dinolabsBackgroundRemoverSidebar">
          
          <div className="dinolabsBackgroundRemoverSection">
            <div className="dinolabsBackgroundRemoverSectionTitle">
              <FontAwesomeIcon icon={faFileArrowUp} />
              <span>Image Input</span>
            </div>

            <div className="dinolabsBackgroundRemoverRow">
              <label className="dinolabsBackgroundRemoverLabel">Select Images</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="dinolabsBackgroundRemoverFileInput"
              />
              <button 
                className="dinolabsBackgroundRemoverBtn"
                onClick={() => fileInputRef.current?.click()}
              >
                <FontAwesomeIcon icon={faImage} /> Choose Images
              </button>
            </div>

            <div className="dinolabsBackgroundRemoverRow">
              <div className="dinolabsBackgroundRemoverStats">
                <div className="dinolabsBackgroundRemoverStat">
                  <span className="dinolabsBackgroundRemoverStatLabel">Images Selected</span>
                  <span className="dinolabsBackgroundRemoverStatValue">{selectedFiles.length}</span>
                </div>
                <div className="dinolabsBackgroundRemoverStat">
                  <span className="dinolabsBackgroundRemoverStatLabel">Total Size</span>
                  <span className="dinolabsBackgroundRemoverStatValue">{formatFileSize(totalOriginalSize)}</span>
                </div>
              </div>
            </div>

            <div className="dinolabsBackgroundRemoverRow dinolabsBackgroundRemoverActions">
              <button 
                className="dinolabsBackgroundRemoverBtn dinolabsBackgroundRemoverSubtle" 
                onClick={clearAllFiles}
                disabled={selectedFiles.length === 0}
              >
                <FontAwesomeIcon icon={faTrash} /> Clear All
              </button>
            </div>
          </div>

          <div className="dinolabsBackgroundRemoverSection">
            <div className="dinolabsBackgroundRemoverSectionTitle">
              <FontAwesomeIcon icon={faSliders} />
              <span>Removal Settings</span>
            </div>

            <div className="dinolabsBackgroundRemoverRow">
              <label className="dinolabsBackgroundRemoverLabel">Removal Mode</label>
              <select 
                className="dinolabsBackgroundRemoverSelect" 
                value={removalMode} 
                onChange={(e) => setRemovalMode(e.target.value)}
              >
                {removalModes.map(mode => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            {removalMode === 'color' && (
              <div className="dinolabsBackgroundRemoverRow">
                <label className="dinolabsBackgroundRemoverLabel">Background Color</label>
                <div className="dinolabsBackgroundRemoverColorRow">
                  <Tippy 
                    content={
                      <DinoLabsColorPicker 
                        color={backgroundColor} 
                        onChange={(newColor) => setBackgroundColor(newColor)} 
                      />
                    } 
                    visible={colorPickerOpen.background} 
                    onClickOutside={() => closeColorPicker('background')} 
                    interactive={true} 
                    placement="right-start"
                    offset={[0, 10]}
                    appendTo={document.body}
                    className="color-picker-tippy"
                  >
                    <button
                      className="dinolabsBackgroundRemoverColorPicker"
                      style={{ backgroundColor: backgroundColor }}
                      onClick={() => toggleColorPicker('background')}
                      title="Change Background Color"
                    />
                  </Tippy>
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="dinolabsBackgroundRemoverInput"
                  />
                </div>
              </div>
            )}

            <div className="dinolabsBackgroundRemoverRow">
              <label className="dinolabsBackgroundRemoverLabel">Tolerance</label>
              <input
                type="range"
                min="1"
                max="100"
                value={tolerance}
                onChange={(e) => setTolerance(+e.target.value)}
                className="dinolabsSettingsSlider"
              />
              <div className="dinolabsBackgroundRemoverSmall">{tolerance}</div>
            </div>

            <div className="dinolabsBackgroundRemoverRow">
              <label className="dinolabsBackgroundRemoverLabel">Tolerance Presets</label>
              <div className="dinolabsBackgroundRemoverPresets">
                {tolerancePresets.map(preset => (
                  <button
                    key={preset.name}
                    className={`dinolabsBackgroundRemoverPresetBtn ${
                      tolerance === preset.value ? 'active' : ''
                    }`}
                    onClick={() => setTolerance(preset.value)}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="dinolabsBackgroundRemoverRow">
              <label className="dinolabsBackgroundRemoverLabel">Edge Smoothing</label>
              <input
                type="range"
                min="0"
                max="10"
                value={smoothing}
                onChange={(e) => setSmoothing(+e.target.value)}
                className="dinolabsSettingsSlider"
              />
              <div className="dinolabsBackgroundRemoverSmall">{smoothing}px</div>
            </div>

            <div className="dinolabsBackgroundRemoverRow">
              <label className="dinolabsBackgroundRemoverCheckbox">
                <input
                  type="checkbox"
                  checked={featherEdge}
                  onChange={(e) => setFeatherEdge(e.target.checked)}
                  className="dinolabsSettingsCheckbox"
                />
                <span>Feather Edges</span>
              </label>
            </div>
          </div>

          <div className="dinolabsBackgroundRemoverSection">
            <div className="dinolabsBackgroundRemoverSectionTitle">
              <FontAwesomeIcon icon={faPaintBrush} />
              <span>Background Options</span>
            </div>

            <div className="dinolabsBackgroundRemoverRow">
              <label className="dinolabsBackgroundRemoverCheckbox">
                <input
                  type="checkbox"
                  checked={replaceBackground}
                  onChange={(e) => setReplaceBackground(e.target.checked)}
                  className="dinolabsSettingsCheckbox"
                />
                <span>Replace Background</span>
              </label>
            </div>

            {replaceBackground && (
              <div className="dinolabsBackgroundRemoverRow">
                <label className="dinolabsBackgroundRemoverLabel">Replacement Color</label>
                <div className="dinolabsBackgroundRemoverColorRow">
                  <Tippy 
                    content={
                      <DinoLabsColorPicker 
                        color={replacementColor} 
                        onChange={(newColor) => setReplacementColor(newColor)} 
                      />
                    } 
                    visible={colorPickerOpen.replacement} 
                    onClickOutside={() => closeColorPicker('replacement')} 
                    interactive={true} 
                    placement="right-start"
                    offset={[0, 10]}
                    appendTo={document.body}
                    className="color-picker-tippy"
                  >
                    <button
                      className="dinolabsBackgroundRemoverColorPicker"
                      style={{ backgroundColor: replacementColor }}
                      onClick={() => toggleColorPicker('replacement')}
                      title="Change Replacement Color"
                    />
                  </Tippy>
                  <input
                    type="text"
                    value={replacementColor}
                    onChange={(e) => setReplacementColor(e.target.value)}
                    className="dinolabsBackgroundRemoverInput"
                  />
                </div>
              </div>
            )}

            <div className="dinolabsBackgroundRemoverRow">
              <label className="dinolabsBackgroundRemoverLabel">Output Format</label>
              <select 
                className="dinolabsBackgroundRemoverSelect" 
                value={outputFormat} 
                onChange={(e) => setOutputFormat(e.target.value)}
              >
                {formatOptions.map(format => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dinolabsBackgroundRemoverSection">
            <div className="dinolabsBackgroundRemoverSectionTitle">
              <FontAwesomeIcon icon={faCog} />
              <span>Processing</span>
            </div>

            <div className="dinolabsBackgroundRemoverRow dinolabsBackgroundRemoverActions">
              <button 
                className="dinolabsBackgroundRemoverBtn"
                onClick={processFiles}
                disabled={selectedFiles.length === 0 || isProcessing}
              >
                <FontAwesomeIcon icon={faMagicWandSparkles} /> 
                {isProcessing ? 'Processing...' : 'Remove Backgrounds'}
              </button>
              <button 
                className="dinolabsBackgroundRemoverBtn dinolabsBackgroundRemoverSubtle" 
                onClick={resetSettings}
              >
                <FontAwesomeIcon icon={faArrowsRotate} /> Reset
              </button>
            </div>

            {isProcessing && (
              <div className="dinolabsBackgroundRemoverRow">
                <div className="dinolabsBackgroundRemoverProgress">
                  <div 
                    className="dinolabsBackgroundRemoverProgressBar"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <div className="dinolabsBackgroundRemoverSmall">
                  {Math.round(processingProgress)}% Complete
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="dinolabsBackgroundRemoverMain">
          <div className="dinolabsBackgroundRemoverMainGrid">
            
            <section className="dinolabsBackgroundRemoverCard">
              <div className="dinolabsBackgroundRemoverCardTitle">
                Original Images
              </div>
              
              {selectedFiles.length === 0 ? (
                <div className="dinolabsBackgroundRemoverEmpty">
                  <FontAwesomeIcon icon={faImages} />
                  <p>No images selected. Choose images to get started.</p>
                </div>
              ) : (
                <div className="dinolabsBackgroundRemoverImageGrid">
                  {selectedFiles.map(file => (
                    <div key={file.id} className="dinolabsBackgroundRemoverImageCard">
                      <div 
                        className="dinolabsBackgroundRemoverImagePreview"
                        style={{ backgroundImage: `url(${file.url})` }}
                      />
                      <div className="dinolabsBackgroundRemoverImageInfo">
                        <div className="dinolabsBackgroundRemoverImageName">{file.name}</div>
                        <div className="dinolabsBackgroundRemoverImageMeta">
                          {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase()}
                        </div>
                      </div>
                      <button
                        className="dinolabsBackgroundRemoverImageRemove"
                        onClick={() => removeFile(file.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dinolabsBackgroundRemoverCard">
              <div className="dinolabsBackgroundRemoverCardTitle">
                Processed Images
                {processedFiles.length > 0 && (
                  <button 
                    className="dinolabsBackgroundRemoverBtn dinolabsBackgroundRemoverDownloadAll"
                    onClick={downloadAllFiles}
                  >
                    <FontAwesomeIcon icon={faDownload} /> Download All
                  </button>
                )}
              </div>

              {processedFiles.length === 0 ? (
                <div className="dinolabsBackgroundRemoverEmpty">
                  <FontAwesomeIcon icon={faScissors} />
                  <p>Processed images will appear here after background removal.</p>
                </div>
              ) : (
                <>
                  <div className="dinolabsBackgroundRemoverSummary">
                    <div className="dinolabsBackgroundRemoverSummaryStats">
                      <div className="dinolabsBackgroundRemoverSummaryStat">
                        <span className="dinolabsBackgroundRemoverSummaryLabel">Original Size</span>
                        <span className="dinolabsBackgroundRemoverSummaryValue">{formatFileSize(totalOriginalSize)}</span>
                      </div>
                      <div className="dinolabsBackgroundRemoverSummaryStat">
                        <span className="dinolabsBackgroundRemoverSummaryLabel">Processed Size</span>
                        <span className="dinolabsBackgroundRemoverSummaryValue">{formatFileSize(totalProcessedSize)}</span>
                      </div>
                      <div className="dinolabsBackgroundRemoverSummaryStat">
                        <span className="dinolabsBackgroundRemoverSummaryLabel">Images Processed</span>
                        <span className="dinolabsBackgroundRemoverSummaryValue">{processedFiles.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="dinolabsBackgroundRemoverImageGrid">
                    {processedFiles.map(file => (
                      <div key={file.id} className="dinolabsBackgroundRemoverImageCard">
                        <div 
                          className="dinolabsBackgroundRemoverImagePreview dinolabsBackgroundRemoverTransparencyBg"
                          style={{ backgroundImage: `url(${file.url})` }}
                        />
                        <div className="dinolabsBackgroundRemoverImageInfo">
                          <div className="dinolabsBackgroundRemoverImageName">{file.name}</div>
                          <div className="dinolabsBackgroundRemoverImageMeta">
                            {formatFileSize(file.processedSize)} • {file.format.toUpperCase()}
                          </div>
                          <div className="dinolabsBackgroundRemoverImageDimensions">
                            {file.width} × {file.height}px
                          </div>
                        </div>
                        <button
                          className="dinolabsBackgroundRemoverImageDownload"
                          onClick={() => downloadFile(file)}
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DinoLabsPluginsBackgroundRemover;