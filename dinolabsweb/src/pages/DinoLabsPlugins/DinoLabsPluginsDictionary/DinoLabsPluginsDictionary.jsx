import React, { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faSearch,
  faCircleNotch,
  faTriangleExclamation,
  faArrowUpRightFromSquare
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsDictionary/DinoLabsPluginsDictionary.css";

const MW_API_BASE = "https://www.dictionaryapi.com/api/v3/references/collegiate/json";

const getMWKey = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return (
        import.meta.env.VITE_REACT_APP_MW_DICTIONARY_KEY ||
        import.meta.env.VITE_REACT_APP_MW_DICT_KEY ||
        import.meta.env.VITE_MW_DICTIONARY_KEY ||
        import.meta.env.VITE_MW_KEY ||
        ""
      );
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env) {
      return (
        process.env.REACT_APP_MW_DICTIONARY_KEY ||
        process.env.REACT_APP_MW_DICT_KEY ||
        process.env.MW_DICTIONARY_KEY ||
        process.env.MW_KEY ||
        ""
      );
    }
  } catch {}
  return "";
};

const DinoLabsPluginsDictionary = () => {
  const apiKey = getMWKey();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [entries, setEntries] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchDefinitions = useCallback(async (termRaw) => {
    const term = (termRaw || "").trim();
    if (!term) return;

    if (!apiKey) {
      setStatus("error");
      setErrorMsg("Missing Merriam-Webster API key. Set VITE_REACT_APP_MW_DICTIONARY_KEY in .env.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    setEntries([]);
    setSuggestions([]);

    try {
      const url = `${MW_API_BASE}/${encodeURIComponent(term)}?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data) && data.every((d) => typeof d === "string")) {
        setSuggestions(data.slice(0, 12));
        setEntries([]);
        setStatus("done");
        return;
      }

      const normalized = (Array.isArray(data) ? data : [])
        .filter((d) => d && d.meta && d.hwi)
        .map((d) => {
          const headword = d?.hwi?.hw ? String(d.hwi.hw).replace(/\*/g, "·") : d?.meta?.id || term;
          const fl = d?.fl || "";
          const shortdef = Array.isArray(d?.shortdef) ? d.shortdef : [];
          const offsiteId = (d?.meta?.id || "").replace(/:.+$/, "");
          const offsiteUrl = offsiteId ? `https://www.merriam-webster.com/dictionary/${encodeURIComponent(offsiteId)}` : null;

          return {
            id: d?.meta?.uuid || `${headword}-${fl}`,
            headword,
            fl,
            defs: shortdef.slice(0, 6),
            offsiteUrl
          };
        });

      setEntries(normalized);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMsg(err?.message || "Something went wrong.");
    }
  }, [apiKey]);

  const onSuggestion = (s) => {
    setQuery(s);
    fetchDefinitions(s);
  };

  return (
    <div className="dinolabsPluginsDictionaryApp">
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsPluginsDictionaryHeader">
        {!apiKey && (
          <div className="dinolabsPluginsDictionaryBanner">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>Add <code>VITE_REACT_APP_MW_DICTIONARY_KEY</code> to <code>.env</code></span>
          </div>
        )}

        <div className="dinolabsPluginsDictionarySearch">
          <FontAwesomeIcon icon={faSearch} className="dinolabsPluginsDictionarySearchIcon" />
          <input
            className="dinolabsPluginsDictionarySearchInput"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchDefinitions(query);
              }
            }}
            placeholder="Search a word…"
            maxLength={64}
            inputMode="search"
            autoCorrect="off"
          />
          <button
            className="dinolabsPluginsDictionarySearchBtn"
            disabled={status === "loading"}
            onClick={() => fetchDefinitions(query)}
            aria-label="Search"
            type="button"
          >
            {status === "loading" ? <FontAwesomeIcon icon={faCircleNotch} spin /> : <FontAwesomeIcon icon={faChevronRight} />}
          </button>
        </div>

        {status === "done" && suggestions.length > 0 && (
          <div className="dinolabsPluginsDictionarySuggestions">
            {suggestions.map((s) => (
              <button key={s} className="dinolabsPluginsDictionaryChip" onClick={() => onSuggestion(s)} type="button">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="dinolabsPluginsDictionaryContent">
        {(status === "idle" ||
          (entries.length === 0 && suggestions.length === 0 && status !== "loading" && status !== "error")) && (
          <div className="dinolabsPluginsDictionaryEmpty">📚 Type a word and press enter to look it up.</div>
        )}

        {status === "error" && (
          <div className="dinolabsPluginsDictionaryEmpty dinolabsPluginsDictionaryError">🚨 {errorMsg || "Error fetching results."}</div>
        )}

        <div className="dinolabsPluginsDictionaryGrid">
          {entries.map((e) => (
            <div key={e.id} className="dinolabsPluginsDictionaryCard">
              <div className="dinolabsPluginsDictionaryCardHeader">
                <h2 className="dinolabsPluginsDictionaryWord">{e.headword}</h2>
                {e.fl && <span className="dinolabsPluginsDictionaryPos">{e.fl}</span>}
              </div>

              <div className="dinolabsPluginsDictionaryDefs">
                {e.defs.length === 0 ? (
                  <div className="dinolabsPluginsDictionaryDef">No definition available.</div>
                ) : (
                  e.defs.map((d, idx) => (
                    <div key={idx} className="dinolabsPluginsDictionaryDef">
                      <span className="dinolabsPluginsDictionaryNum">{idx + 1}</span>
                      <span className="dinolabsPluginsDictionaryText">{d}</span>
                    </div>
                  ))
                )}
              </div>

              {e.offsiteUrl && (
                <div className="dinolabsPluginsDictionaryCardFooter">
                  <a
                    className="dinolabsPluginsDictionaryLink"
                    href={e.offsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                    <span>View Full Entry</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DinoLabsPluginsDictionary;
