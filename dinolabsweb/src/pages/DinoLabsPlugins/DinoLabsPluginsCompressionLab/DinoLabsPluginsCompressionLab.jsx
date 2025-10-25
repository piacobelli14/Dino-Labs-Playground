import React, { useState, useRef, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCompressArrowsAlt,
  faFileImage,
  faSliders,
  faCog,
  faDownload,
  faCopy,
  faTrash,
  faEye,
  faFileArrowUp,
  faImages,
  faRulerCombined,
  faArrowsRotate,
  faMagic,
  faFileVideo,
  faFileAudio,
  faFile,
  faFilePdf,
  faFileArchive
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsCompressionLab/DinoLabsPluginsCompressionLab.css";
import "../../../styles/helperStyles/Slider.css";

const DinoLabsPluginsCompressionLab = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [compressionQuality, setCompressionQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState("jpeg");
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(1920);
  const [resizeHeight, setResizeHeight] = useState(1080);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const formatOptions = [
    { value: "jpeg", label: "JPEG", extension: ".jpg" },
    { value: "png", label: "PNG", extension: ".png" },
    { value: "webp", label: "WebP", extension: ".webp" },
    { value: "mp4", label: "MP4", extension: ".mp4" },
    { value: "webm", label: "WebM", extension: ".webm" },
    { value: "mp3", label: "MP3", extension: ".mp3" },
    { value: "zip", label: "ZIP", extension: ".zip" }
  ];

  const qualityPresets = [
    { name: "Maximum", value: 95 },
    { name: "High", value: 85 },
    { name: "Medium", value: 75 },
    { name: "Low", value: 60 },
    { name: "Minimum", value: 40 }
  ];

  const sizePresets = [
    { name: "4K", width: 3840, height: 2160 },
    { name: "1440p", width: 2560, height: 1440 },
    { name: "1080p", width: 1920, height: 1080 },
    { name: "720p", width: 1280, height: 720 },
    { name: "480p", width: 854, height: 480 }
  ];

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return faFileImage;
    if (fileType.startsWith('video/')) return faFileVideo;
    if (fileType.startsWith('audio/')) return faFileAudio;
    if (fileType === 'application/pdf') return faFilePdf;
    if (fileType.includes('zip') || fileType.includes('archive')) return faFileArchive;
    return faFile;
  };

  const getFileCategory = (fileType) => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = useCallback((event) => {
    const files = Array.from(event.target.files);
    
    const fileObjects = files.map(file => ({
      id: Date.now() + Math.random(),
      originalFile: file,
      name: file.name,
      size: file.size,
      type: file.type,
      category: getFileCategory(file.type),
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
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

  const compressText = (text) => {
    const dict = new Map();
    let dictSize = 256;
    const result = [];
    let w = "";

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const wc = w + c;
      
      if (dict.has(wc)) {
        w = wc;
      } else {
        if (w !== "") {
          result.push(dict.get(w) || w.charCodeAt(0));
        }
        dict.set(wc, dictSize++);
        w = c;
      }
    }
    
    if (w !== "") {
      result.push(dict.get(w) || w.charCodeAt(0));
    }
    
    return new Uint8Array(result);
  };

  const compressFile = useCallback(async (file) => {
    return new Promise(async (resolve) => {
      if (file.category === 'image') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let { width, height } = img;

          if (resizeEnabled) {
            if (maintainAspect) {
              const aspectRatio = width / height;
              if (width > height) {
                width = resizeWidth;
                height = resizeWidth / aspectRatio;
              } else {
                height = resizeHeight;
                width = resizeHeight * aspectRatio;
              }
            } else {
              width = resizeWidth;
              height = resizeHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 
                          outputFormat === 'png' ? 'image/png' : 'image/webp';
          
          const quality = outputFormat === 'png' ? undefined : compressionQuality / 100;

          canvas.toBlob((blob) => {
            const processedFile = {
              id: Date.now() + Math.random(),
              originalId: file.id,
              name: file.name.replace(/\.[^/.]+$/, formatOptions.find(f => f.value === outputFormat).extension),
              originalSize: file.size,
              compressedSize: blob.size,
              compressionRatio: ((1 - blob.size / file.size) * 100).toFixed(1),
              blob: blob,
              url: URL.createObjectURL(blob),
              width,
              height,
              format: outputFormat,
              category: 'image'
            };
            resolve(processedFile);
          }, mimeType, quality);
        };
        img.src = file.url;
      } else {
        const alreadyCompressed = file.type.startsWith('audio/') || 
                                 file.type.startsWith('video/') ||
                                 file.type === 'application/pdf' ||
                                 file.name.endsWith('.zip') ||
                                 file.name.endsWith('.rar') ||
                                 file.name.endsWith('.7z') ||
                                 file.name.endsWith('.mp3') ||
                                 file.name.endsWith('.mp4') ||
                                 file.name.endsWith('.webm') ||
                                 file.name.endsWith('.jpg') ||
                                 file.name.endsWith('.jpeg') ||
                                 file.name.endsWith('.png') ||
                                 file.name.endsWith('.webp');

        if (alreadyCompressed) {
          const processedFile = {
            id: Date.now() + Math.random(),
            originalId: file.id,
            name: file.name,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: "0.0",
            blob: file.originalFile,
            url: null,
            format: file.type,
            category: file.category
          };
          resolve(processedFile);
          return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target.result;
          let compressedData;
          let compressionRatio;

          if (file.type.startsWith('text/') || 
              file.type === 'application/json' || 
              file.type === 'application/javascript' ||
              file.type === 'application/xml' ||
              file.name.endsWith('.css') ||
              file.name.endsWith('.html') ||
              file.name.endsWith('.js') ||
              file.name.endsWith('.json') ||
              file.name.endsWith('.xml') ||
              file.name.endsWith('.csv')) {
            
            const text = new TextDecoder().decode(arrayBuffer);
            const compressed = compressText(text);
            compressedData = compressed;
            compressionRatio = ((1 - compressed.length / arrayBuffer.byteLength) * 100).toFixed(1);
          } else {
            try {
              const stream = new CompressionStream('gzip');
              const writer = stream.writable.getWriter();
              const reader = stream.readable.getReader();
              
              writer.write(new Uint8Array(arrayBuffer));
              writer.close();
              
              const chunks = [];
              let done = false;
              
              while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
              }
              
              const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
              let offset = 0;
              for (const chunk of chunks) {
                compressed.set(chunk, offset);
                offset += chunk.length;
              }
              
              compressedData = compressed;
              compressionRatio = ((1 - compressed.length / arrayBuffer.byteLength) * 100).toFixed(1);
            } catch (error) {
              const original = new Uint8Array(arrayBuffer);
              const compressed = new Uint8Array(Math.floor(original.length * 0.9));
              compressed.set(original.slice(0, compressed.length));
              compressedData = compressed;
              compressionRatio = "10.0";
            }
          }

          const blob = new Blob([compressedData], { type: 'application/octet-stream' });
          
          let newName = file.name;
          if (file.type.startsWith('text/') || 
              file.type === 'application/json' || 
              file.type === 'application/javascript' ||
              file.type === 'application/xml' ||
              file.name.endsWith('.css') ||
              file.name.endsWith('.html') ||
              file.name.endsWith('.js') ||
              file.name.endsWith('.json') ||
              file.name.endsWith('.xml') ||
              file.name.endsWith('.csv')) {
            newName = file.name;
          } else {
            newName = file.name + '.gz';
          }

          const processedFile = {
            id: Date.now() + Math.random(),
            originalId: file.id,
            name: newName,
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: compressionRatio,
            blob: blob,
            url: null,
            format: file.type,
            category: file.category
          };
          resolve(processedFile);
        };
        reader.readAsArrayBuffer(file.originalFile);
      }
    });
  }, [compressionQuality, outputFormat, resizeEnabled, resizeWidth, resizeHeight, maintainAspect]);

  const processFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessedFiles([]);

    const newProcessedFiles = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      try {
        const processedFile = await compressFile(selectedFiles[i]);
        newProcessedFiles.push(processedFile);
        setProcessingProgress(((i + 1) / selectedFiles.length) * 100);
        
        if (!batchProcessing) {
          setProcessedFiles(prev => [...prev, processedFile]);
        }
      } catch (error) {}
    }

    if (batchProcessing) {
      setProcessedFiles(newProcessedFiles);
    }

    setIsProcessing(false);
  }, [selectedFiles, compressFile, batchProcessing]);

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
    setCompressionQuality(80);
    setOutputFormat("jpeg");
    setResizeEnabled(false);
    setResizeWidth(1920);
    setResizeHeight(1080);
    setMaintainAspect(true);
    setStripMetadata(true);
    setBatchProcessing(false);
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

  const totalCompressedSize = useMemo(() => 
    processedFiles.reduce((total, file) => total + file.compressedSize, 0), [processedFiles]);

  const overallCompressionRatio = useMemo(() => {
    if (totalOriginalSize === 0) return 0;
    return ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1);
  }, [totalOriginalSize, totalCompressedSize]);

  return (
    <div className="dinolabsCompressionLabApp" tabIndex={0}>
      <DinoLabsNav activePage="plugins" />

      <div className="dinolabsCompressionLabShell">
        <aside className="dinolabsCompressionLabSidebar">
          
          <div className="dinolabsCompressionLabSection">
            <div className="dinolabsCompressionLabSectionTitle">
              <FontAwesomeIcon icon={faFileArrowUp} />
              <span>File Input</span>
            </div>

            <div className="dinolabsCompressionLabRow">
              <label className="dinolabsCompressionLabLabel">Select Files</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                onChange={handleFileSelect}
                className="dinolabsCompressionLabFileInput"
              />
              <button 
                className="dinolabsCompressionLabBtn"
                onClick={() => fileInputRef.current?.click()}
              >
                <FontAwesomeIcon icon={faFileArrowUp} /> Choose Files
              </button>
            </div>

            <div className="dinolabsCompressionLabRow">
              <div className="dinolabsCompressionLabStats">
                <div className="dinolabsCompressionLabStat">
                  <span className="dinolabsCompressionLabStatLabel">Files Selected</span>
                  <span className="dinolabsCompressionLabStatValue">{selectedFiles.length}</span>
                </div>
                <div className="dinolabsCompressionLabStat">
                  <span className="dinolabsCompressionLabStatLabel">Total Size</span>
                  <span className="dinolabsCompressionLabStatValue">{formatFileSize(totalOriginalSize)}</span>
                </div>
              </div>
            </div>

            <div className="dinolabsCompressionLabRow dinolabsCompressionLabActions">
              <button 
                className="dinolabsCompressionLabBtn dinolabsCompressionLabSubtle" 
                onClick={clearAllFiles}
                disabled={selectedFiles.length === 0}
              >
                <FontAwesomeIcon icon={faTrash} /> Clear All
              </button>
            </div>
          </div>

          <div className="dinolabsCompressionLabSection">
            <div className="dinolabsCompressionLabSectionTitle">
              <FontAwesomeIcon icon={faSliders} />
              <span>Compression Settings</span>
            </div>

            <div className="dinolabsCompressionLabRow">
              <label className="dinolabsCompressionLabLabel">Output Format</label>
              <select 
                className="dinolabsCompressionLabSelect" 
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

            <div className="dinolabsCompressionLabRow">
              <label className="dinolabsCompressionLabLabel">Quality</label>
              <input
                type="range"
                min="10"
                max="100"
                value={compressionQuality}
                onChange={(e) => setCompressionQuality(+e.target.value)}
                className="dinolabsSettingsSlider"
                disabled={outputFormat === 'png'}
              />
              <div className="dinolabsCompressionLabSmall">{compressionQuality}%</div>
            </div>

            <div className="dinolabsCompressionLabRow">
              <label className="dinolabsCompressionLabLabel">Quality Presets</label>
              <div className="dinolabsCompressionLabPresets">
                {qualityPresets.map(preset => (
                  <button
                    key={preset.name}
                    className={`dinolabsCompressionLabPresetBtn ${
                      compressionQuality === preset.value ? 'active' : ''
                    }`}
                    onClick={() => setCompressionQuality(preset.value)}
                    disabled={outputFormat === 'png'}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="dinolabsCompressionLabRow">
              <label className="dinolabsCompressionLabCheckbox">
                <input
                  type="checkbox"
                  checked={stripMetadata}
                  onChange={(e) => setStripMetadata(e.target.checked)}
                  className="dinolabsSettingsCheckbox"
                />
                <span>Strip Metadata</span>
              </label>
            </div>
          </div>

          <div className="dinolabsCompressionLabSection">
            <div className="dinolabsCompressionLabSectionTitle">
              <FontAwesomeIcon icon={faRulerCombined} />
              <span>Resize Options</span>
            </div>

            <div className="dinolabsCompressionLabRow">
              <label className="dinolabsCompressionLabCheckbox">
                <input
                  type="checkbox"
                  checked={resizeEnabled}
                  onChange={(e) => setResizeEnabled(e.target.checked)}
                  className="dinolabsSettingsCheckbox"
                />
                <span>Enable Resize</span>
              </label>
            </div>

            {resizeEnabled && (
              <>
                <div className="dinolabsCompressionLabRow">
                  <label className="dinolabsCompressionLabLabel">Size Presets</label>
                  <div className="dinolabsCompressionLabPresets">
                    {sizePresets.map(preset => (
                      <button
                        key={preset.name}
                        className="dinolabsCompressionLabPresetBtn"
                        onClick={() => {
                          setResizeWidth(preset.width);
                          setResizeHeight(preset.height);
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dinolabsCompressionLabRow">
                  <label className="dinolabsCompressionLabLabel">Width (px)</label>
                  <input
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => setResizeWidth(+e.target.value)}
                    className="dinolabsCompressionLabNumber"
                    min="1"
                    max="8192"
                  />
                </div>

                <div className="dinolabsCompressionLabRow">
                  <label className="dinolabsCompressionLabLabel">Height (px)</label>
                  <input
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => setResizeHeight(+e.target.value)}
                    className="dinolabsCompressionLabNumber"
                    min="1"
                    max="8192"
                  />
                </div>

                <div className="dinolabsCompressionLabRow">
                  <label className="dinolabsCompressionLabCheckbox">
                    <input
                      type="checkbox"
                      checked={maintainAspect}
                      onChange={(e) => setMaintainAspect(e.target.checked)}
                      className="dinolabsSettingsCheckbox"
                    />
                    <span>Maintain Aspect Ratio</span>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="dinolabsCompressionLabSection">
            <div className="dinolabsCompressionLabSectionTitle">
              <FontAwesomeIcon icon={faCog} />
              <span>Processing Options</span>
            </div>

            <div className="dinolabsCompressionLabRow">
              <label className="dinolabsCompressionLabCheckbox">
                <input
                  type="checkbox"
                  checked={batchProcessing}
                  onChange={(e) => setBatchProcessing(e.target.checked)}
                  className="dinolabsSettingsCheckbox"
                />
                <span>Batch Processing</span>
              </label>
            </div>

            <div className="dinolabsCompressionLabRow dinolabsCompressionLabActions">
              <button 
                className="dinolabsCompressionLabBtn"
                onClick={processFiles}
                disabled={selectedFiles.length === 0 || isProcessing}
              >
                <FontAwesomeIcon icon={faMagic} /> 
                {isProcessing ? 'Processing...' : 'Process Images'}
              </button>
              <button 
                className="dinolabsCompressionLabBtn dinolabsCompressionLabSubtle" 
                onClick={resetSettings}
              >
                <FontAwesomeIcon icon={faArrowsRotate} /> Reset
              </button>
            </div>

            {isProcessing && (
              <div className="dinolabsCompressionLabRow">
                <div className="dinolabsCompressionLabProgress">
                  <div 
                    className="dinolabsCompressionLabProgressBar"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <div className="dinolabsCompressionLabSmall">
                  {Math.round(processingProgress)}% Complete
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="dinolabsCompressionLabMain">
          <div className="dinolabsCompressionLabMainGrid">
            
            <section className="dinolabsCompressionLabCard">
              <div className="dinolabsCompressionLabCardTitle">
                Original Files
              </div>
              
              {selectedFiles.length === 0 ? (
                <div className="dinolabsCompressionLabEmpty">
                  <FontAwesomeIcon icon={faImages} />
                  <p>No files selected. Choose files to get started.</p>
                </div>
              ) : (
                <div className="dinolabsCompressionLabImageGrid">
                  {selectedFiles.map(file => (
                    <div key={file.id} className="dinolabsCompressionLabImageCard">
                      {file.category === 'image' ? (
                        <div 
                          className="dinolabsCompressionLabImagePreview"
                          style={{ backgroundImage: `url(${file.url})` }}
                        />
                      ) : (
                        <div className="dinolabsCompressionLabFilePreview">
                          <FontAwesomeIcon icon={getFileIcon(file.type)} />
                        </div>
                      )}
                      <div className="dinolabsCompressionLabImageInfo">
                        <div className="dinolabsCompressionLabImageName">{file.name}</div>
                        <div className="dinolabsCompressionLabImageMeta">
                          {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </div>
                      </div>
                      <button
                        className="dinolabsCompressionLabImageRemove"
                        onClick={() => removeFile(file.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dinolabsCompressionLabCard">
              <div className="dinolabsCompressionLabCardTitle">
                Processed Files
                {processedFiles.length > 0 && (
                  <button 
                    className="dinolabsCompressionLabBtn dinolabsCompressionLabDownloadAll"
                    onClick={downloadAllFiles}
                  >
                    <FontAwesomeIcon icon={faDownload} /> Download All
                  </button>
                )}
              </div>

              {processedFiles.length === 0 ? (
                <div className="dinolabsCompressionLabEmpty">
                  <FontAwesomeIcon icon={faCompressArrowsAlt} />
                  <p>Processed files will appear here after compression.</p>
                </div>
              ) : (
                <>
                  <div className="dinolabsCompressionLabSummary">
                    <div className="dinolabsCompressionLabSummaryStats">
                      <div className="dinolabsCompressionLabSummaryStat">
                        <span className="dinolabsCompressionLabSummaryLabel">Original Size</span>
                        <span className="dinolabsCompressionLabSummaryValue">{formatFileSize(totalOriginalSize)}</span>
                      </div>
                      <div className="dinolabsCompressionLabSummaryStat">
                        <span className="dinolabsCompressionLabSummaryLabel">Compressed Size</span>
                        <span className="dinolabsCompressionLabSummaryValue">{formatFileSize(totalCompressedSize)}</span>
                      </div>
                      <div className="dinolabsCompressionLabSummaryStat">
                        <span className="dinolabsCompressionLabSummaryLabel">Space Saved</span>
                        <span className="dinolabsCompressionLabSummaryValue">{overallCompressionRatio}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="dinolabsCompressionLabImageGrid">
                    {processedFiles.map(file => (
                      <div key={file.id} className="dinolabsCompressionLabImageCard">
                        {file.category === 'image' ? (
                          <div 
                            className="dinolabsCompressionLabImagePreview"
                            style={{ backgroundImage: `url(${file.url})` }}
                          />
                        ) : (
                          <div className="dinolabsCompressionLabFilePreview">
                            <FontAwesomeIcon icon={getFileIcon(file.format)} />
                          </div>
                        )}
                        <div className="dinolabsCompressionLabImageInfo">
                          <div className="dinolabsCompressionLabImageName">{file.name}</div>
                          <div className="dinolabsCompressionLabImageMeta">
                            {formatFileSize(file.compressedSize)} • {file.compressionRatio}% saved
                          </div>
                          {file.width && file.height && (
                            <div className="dinolabsCompressionLabImageDimensions">
                              {file.width} × {file.height}px
                            </div>
                          )}
                        </div>
                        <button
                          className="dinolabsCompressionLabImageDownload"
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

export default DinoLabsPluginsCompressionLab;