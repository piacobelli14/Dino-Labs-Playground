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
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsThesaurus/DinoLabsPluginsThesaurus.css";

const MW_THES_BASE = "https://www.dictionaryapi.com/api/v3/references/thesaurus/json";

const getMWThesKey = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return (
        import.meta.env.VITE_REACT_APP_MW_THESAURUS_KEY ||
        import.meta.env.VITE_MW_THESAURUS_KEY ||
        import.meta.env.VITE_REACT_APP_MW_THES_KEY ||
        ""
      );
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env) {
      return (
        process.env.REACT_APP_MW_THESAURUS_KEY ||
        process.env.MW_THESAURUS_KEY ||
        process.env.REACT_APP_MW_THES_KEY ||
        ""
      );
    }
  } catch {}
  return "";
};

const toArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const uniqTrimmed = (arr) => [...new Set(toArray(arr).map((s) => String(s).trim()).filter(Boolean))];

const DinoLabsPluginsThesaurus = () => {
  const apiKey = getMWThesKey();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [entries, setEntries] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const normalizeThesEntry = (d, fallbackQuery) => {
    const headword =
      (d?.hwi?.hw && String(d.hwi.hw).replace(/\*/g, "·")) ||
      d?.meta?.id ||
      fallbackQuery;

    const fl = d?.fl || "";

    const syns = [];
    const ants = [];

    const defs = Array.isArray(d?.def) ? d.def : [];
    defs.forEach((def) => {
      const sseq = def?.sseq || [];
      sseq.forEach((grp) => {
        grp.forEach((item) => {
          const sense = item?.[1];
          if (!sense) return;
          const synList = sense.syn_list || [];
          synList.forEach((bucket) => {
            const words = bucket.map((w) => w?.wd).filter(Boolean);
            if (words.length) syns.push(words);
          });
          const antList = sense.ant_list || [];
          antList.forEach((bucket) => {
            const words = bucket.map((w) => w?.wd).filter(Boolean);
            if (words.length) ants.push(words);
          });
        });
      });
    });

    const flatSyns = uniqTrimmed(syns.flat());
    const flatAnts = uniqTrimmed(ants.flat());

    const offsiteId = (d?.meta?.id || "").replace(/:.+$/, "");
    const offsiteUrl = offsiteId
      ? `https://www.merriam-webster.com/thesaurus/${encodeURIComponent(offsiteId)}`
      : null;

    return {
      id: d?.meta?.uuid || `${headword}-${fl}`,
      headword,
      fl,
      synBuckets: syns.slice(0, 2),
      syns: flatSyns.slice(0, 18),
      ants: flatAnts.slice(0, 12),
      offsiteUrl
    };
  };

  const fetchThesaurus = useCallback(async (termRaw) => {
    const term = (termRaw || "").trim();
    if (!term) return;

    if (!apiKey) {
      setStatus("error");
      setErrorMsg("Missing Merriam-Webster Thesaurus key. Set VITE_REACT_APP_MW_THESAURUS_KEY in .env.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    setEntries([]);
    setSuggestions([]);

    try {
      const url = `${MW_THES_BASE}/${encodeURIComponent(term)}?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data) && data.every((d) => typeof d === "string")) {
        setSuggestions(data.slice(0, 10));
        setEntries([]);
        setStatus("done");
        return;
      }

      const normalized = (Array.isArray(data) ? data : [])
        .filter((d) => d && d.meta)
        .map((d) => normalizeThesEntry(d, term));

      setEntries(normalized);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMsg(err?.message || "Something went wrong.");
    }
  }, [apiKey]);

  const onSuggestion = (s) => {
    setQuery(s);
    fetchThesaurus(s);
  };

  return (
    <div className="dinolabsPluginsThesaurusApp">
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsPluginsThesaurusHeader">
        {!apiKey && (
          <div className="dinolabsPluginsThesaurusBanner">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>Add <code>VITE_REACT_APP_MW_THESAURUS_KEY</code> to <code>.env</code></span>
          </div>
        )}

        <div className="dinolabsPluginsThesaurusSearch">
          <FontAwesomeIcon icon={faSearch} className="dinolabsPluginsThesaurusSearchIcon" />
          <input
            className="dinolabsPluginsThesaurusSearchInput"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchThesaurus(query);
              }
            }}
            placeholder="Find synonyms…"
            maxLength={64}
            inputMode="search"
            autoCorrect="off"
          />
          <button
            className="dinolabsPluginsThesaurusSearchBtn"
            disabled={status === "loading"}
            onClick={() => fetchThesaurus(query)}
            aria-label="Search"
            type="button"
          >
            {status === "loading" ? <FontAwesomeIcon icon={faCircleNotch} spin /> : <FontAwesomeIcon icon={faChevronRight} />}
          </button>
        </div>

        {status === "done" && suggestions.length > 0 && (
          <div className="dinolabsPluginsThesaurusSuggestions">
            {suggestions.map((s) => (
              <button
                key={s}
                className="dinolabsPluginsThesaurusChip"
                onClick={() => onSuggestion(s)}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="dinolabsPluginsThesaurusContent">
        {(status === "idle" ||
          (entries.length === 0 && suggestions.length === 0 && status !== "loading" && status !== "error")) && (
          <div className="dinolabsPluginsThesaurusEmpty">🔍 Type a word and press enter to explore synonyms.</div>
        )}

        {status === "error" && (
          <div className="dinolabsPluginsThesaurusEmpty dinolabsPluginsThesaurusError">🚨 {errorMsg || "Error fetching results."}</div>
        )}

        <div className="dinolabsPluginsThesaurusGrid">
          {entries.map((e) => (
            <div key={e.id} className="dinolabsPluginsThesaurusCard">
              <div className="dinolabsPluginsThesaurusCardHeader">
                <h2 className="dinolabsPluginsThesaurusWord">{e.headword}</h2>
                {e.fl && <span className="dinolabsPluginsThesaurusPos">{e.fl}</span>}
              </div>

              <div className="dinolabsPluginsThesaurusSynonyms">
                {e.synBuckets && e.synBuckets.length > 0 ? (
                  e.synBuckets.map((bucket, idx) => (
                    <div key={idx} className="dinolabsPluginsThesaurusChipRow">
                      {bucket.slice(0, 8).map((w, i) => (
                        <span key={i} className="dinolabsPluginsThesaurusSynChip">
                          {w}
                        </span>
                      ))}
                    </div>
                  ))
                ) : e.syns.length > 0 ? (
                  <div className="dinolabsPluginsThesaurusChipRow">
                    {e.syns.map((w, i) => (
                      <span key={i} className="dinolabsPluginsThesaurusSynChip">
                        {w}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="dinolabsPluginsThesaurusNoResults">No Synonyms Found.</div>
                )}

                {e.ants && e.ants.length > 0 && (
                  <div className="dinolabsPluginsThesaurusAntonyms">
                    <div className="dinolabsPluginsThesaurusAntLabel">Antonyms</div>
                    <div className="dinolabsPluginsThesaurusChipRow">
                      {e.ants.map((w, i) => (
                        <span key={i} className="dinolabsPluginsThesaurusAntChip">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {e.offsiteUrl && (
                <div className="dinolabsPluginsThesaurusCardFooter">
                  <a
                    className="dinolabsPluginsThesaurusLink"
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

export default DinoLabsPluginsThesaurus;
