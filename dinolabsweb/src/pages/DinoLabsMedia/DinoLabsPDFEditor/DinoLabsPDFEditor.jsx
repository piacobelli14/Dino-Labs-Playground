import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../../../styles/mainStyles/DinoLabsPDFEditor/DinoLabsPDFEditor.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faDownload } from "@fortawesome/free-solid-svg-icons";

function clampPosition(rect, width = 180, height = 200, offset = 6) {
  let top = rect.bottom + offset, left = rect.left;
  if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - offset);
  return { top, left };
}

export default function DinoLabsPdfViewer({ fileHandle }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [displayName, setDisplayName] = useState("Untitled.pdf");
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const menuPortalRef = useRef(null);
  const fileBtnRef = useRef(null);

  useEffect(() => {
    let createdUrl = null;

    async function loadFile() {
      setError(null);
      setLoading(true);
      setPdfUrl(null);

      try {
        if (!fileHandle) {
          setLoading(false);
          return;
        }
        const file = await fileHandle.getFile();
        const name = file.name || "Untitled.pdf";
        setDisplayName(name);

        const ext = name.split(".").pop()?.toLowerCase();
        if (ext !== "pdf") throw new Error(`Unsupported file type: .${ext}`);

        createdUrl = URL.createObjectURL(file);
        setPdfUrl(createdUrl);
      } catch (error) {
        setError(error?.message || String(error));
      } finally {
        setLoading(false);
      }
    }

    loadFile();
    return () => {
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileHandle]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = displayName || "Untitled.pdf";
    a.click();
  };

  useEffect(() => {
    const down = (e) => {
      if (openMenu && !menuPortalRef.current?.contains(e.target) && !e.target.closest(".dinolabsOperationsButton")) {
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
      <div className="dinolabsPDFDropdownMenu" ref={menuPortalRef} style={{ top: menuPosition.top, left: menuPosition.left }}>
        {items.map((item, i) => (
          <div
            className="dinolabsPDFDropdownMenuItem"
            key={i}
            style={{ borderBottom: i < items.length - 1 ? "1px solid #444" : "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3a3a3a")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            onClick={() => {
              item.action();
              setOpenMenu(null);
            }}
          >
            {item.icon && <FontAwesomeIcon icon={item.icon} />}
            {item.text}
          </div>
        ))}
      </div>,
      document.body
    );
  };

  const LoadingUI = (
    <div className="loading-wrapper">
      <div className="loading-circle" />
      <label className="loading-title">Dino Labs Web IDE</label>
    </div>
  );

  return (
    <div className="dinolabsPDFContentWrapper">
      <div className="dinolabsPDFToolbarWrapper">
        <div className="dinolabsPDFToolBar">
          <div className="dinolabsPDFTitleWrapper">
            <div className="dinolabsPDFFileNameStack">
              <label className="dinolabsPDFFileNameInput">
                <FontAwesomeIcon icon={faFile} /> {displayName}
              </label>
              <div className="dinolabsPDFOperationsButtonsWrapper">
                <button ref={fileBtnRef} className="dinolabsPDFOperationsButton" onClick={() => openTopMenu("file", fileBtnRef)}>
                  File
                </button>
                {renderDropdownMenu("file", [{ icon: faDownload, text: "Export", action: handleDownload }])}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && LoadingUI}

      <div className="dinolabsPDFContent" style={{ overflow: "auto", textAlign: "center" }}>
        {pdfUrl && !error && !loading && (
          <iframe
            title="PDF"
            src={`${pdfUrl}#page=1&zoom=page-width&view=FitH&navpanes=0`}
            style={{
              width: "100%",
              height: "calc(100vh - 140px)", 
              border: "none",
              background: "#1f1f1f",
            }}
          />
        )}

      </div>
    </div>
  );
}
