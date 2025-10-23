import React, { useMemo, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRandom,
  faDeleteLeft,
  faTrashCan,
  faDownLeftAndUpRightToCenter,
  faSquareRootVariable,
  faPlusMinus,
  faCopy,
  faPaste,
  faDownload,
  faChevronRight,
  faArrowUpRightFromSquare,
  faLayerGroup,
  faTableCellsLarge,
  faRulerCombined,
  faVectorSquare
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsMatrix/DinoLabsPluginsMatrix.css";

export default function DinoLabsPluginsMatrix() {

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const roundNice = (x) => {
    if (!isFinite(x)) return x.toString();
    const s =
      Math.abs(x) >= 1e6 || (Math.abs(x) < 1e-4 && x !== 0)
        ? x.toExponential(6)
        : x.toFixed(6);
    return s.replace(/\.?0+($|e)/i, "$1");
  };

  const deepClone = (m) => m.map((r) => r.slice());

  const zeros = (r, c) => Array.from({ length: r }, () => Array(c).fill(0));

  const identity = (n) =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    );

  const randomMatrix = (r, c) =>
    Array.from({ length: r }, () =>
      Array.from({ length: c }, () => Math.round((Math.random() * 2 - 1) * 100) / 10)
    );

  const shape = (M) => [M.length, (M[0] || []).length];

  const matrixToCSV = (M) => M.map((row) => row.map(roundNice).join(",")).join("\n");

  const matrixToJSON = (M) => JSON.stringify(M);

  const matrixToLaTeX = (M) =>
    "\\begin{bmatrix}\n" +
    M.map((row) => row.map(roundNice).join(" & ")).join(" \\\\\n") +
    "\n\\end{bmatrix}";

  const parseTextToMatrix = (txt) => {
    const trimmed = (txt || "").trim();
    if (!trimmed) return [[0]];
    const rows = trimmed
      .replace(/;+$/gm, "")
      .split(/\n|;/g)
      .map((line) =>
        line
          .trim()
          .split(/,|\t|\s+/g)
          .filter(Boolean)
          .map((x) => (x === "-" || x === "." ? 0 : Number(x)))
          .map((x) => (Number.isFinite(x) ? x : 0))
      )
      .filter((r) => r.length > 0);
    const maxC = rows.reduce((m, r) => Math.max(m, r.length), 0);
    if (rows.length === 0 || maxC === 0) return [[0]];
    return rows.map((r) => (r.length === maxC ? r : r.concat(Array(maxC - r.length).fill(0))));
  };

  const add = (A, B) => {
    const [ra, ca] = shape(A);
    const [rb, cb] = shape(B);
    if (ra !== rb || ca !== cb) throw new Error("Shapes Must Match For Addition Or Subtraction.");
    return A.map((row, i) => row.map((v, j) => v + B[i][j]));
  };

  const sub = (A, B) => {
    const [ra, ca] = shape(A);
    const [rb, cb] = shape(B);
    if (ra !== rb || ca !== cb) throw new Error("Shapes Must Match For Addition Or Subtraction.");
    return A.map((row, i) => row.map((v, j) => v - B[i][j]));
  };

  const scalarMul = (A, k) => A.map((row) => row.map((v) => v * k));

  const transpose = (A) => {
    const [r, c] = shape(A);
    const T = zeros(c || 1, r || 1);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
    return T;
  };

  const multiply = (A, B) => {
    const [ra, ca] = shape(A);
    const [rb, cb] = shape(B);
    if (ca !== rb) throw new Error("Inner Dimensions Must Match For Multiplication.");
    const C = zeros(ra, cb);
    for (let i = 0; i < ra; i++) {
      for (let k = 0; k < ca; k++) {
        const aik = A[i][k];
        if (aik === 0) continue;
        for (let j = 0; j < cb; j++) C[i][j] += aik * B[k][j];
      }
    }
    return C;
  };

  const rref = (A, tol = 1e-10) => {
    const M = deepClone(A);
    const [rows, cols] = shape(M);
    let lead = 0;
    const ops = [];
    for (let r = 0; r < rows; r++) {
      if (lead >= cols) break;
      let i = r;
      while (Math.abs(M[i][lead]) < tol) {
        i++;
        if (i === rows) {
          i = r;
          lead++;
          if (lead === cols) break;
        }
      }
      if (lead === cols) break;
      if (i !== r) {
        [M[i], M[r]] = [M[r], M[i]];
        ops.push(`R${r + 1} ↔ R${i + 1}`);
      }
      const lv = M[r][lead];
      if (Math.abs(lv) > tol) {
        for (let j = 0; j < cols; j++) M[r][j] /= lv;
        ops.push(`R${r + 1} ← R${r + 1} / ${roundNice(lv)}`);
      }
      for (let i2 = 0; i2 < rows; i2++) {
        if (i2 !== r) {
          const lv2 = M[i2][lead];
          if (Math.abs(lv2) > tol) {
            for (let j = 0; j < cols; j++) M[i2][j] -= lv2 * M[r][j];
            ops.push(`R${i2 + 1} ← R${i2 + 1} - (${roundNice(lv2)})·R${r + 1}`);
          }
        }
      }
      lead++;
    }
    return { R: M, ops };
  };

  const rankFromRREF = (R, tol = 1e-10) => R.reduce((acc, row) => acc + (row.some((v) => Math.abs(v) > tol) ? 1 : 0), 0);

  const luDecompose = (A) => {
    const n = A.length;
    if (n === 0 || A[0].length !== n) throw new Error("LU Decomposition Requires A Square Matrix.");
    const LU = deepClone(A);
    const P = Array.from({ length: n }, (_, i) => i);
    let pivSign = 1;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const kmax = Math.min(i, j);
        let s = 0;
        for (let k = 0; k < kmax; k++) s += LU[i][k] * LU[k][j];
        LU[i][j] -= s;
      }
      let p = j;
      for (let i = j + 1; i < n; i++) if (Math.abs(LU[i][j]) > Math.abs(LU[p][j])) p = i;
      if (p !== j) {
        [LU[p], LU[j]] = [LU[j], LU[p]];
        [P[p], P[j]] = [P[j], P[p]];
        pivSign = -pivSign;
      }
      if (j < n && LU[j][j] !== 0) {
        for (let i = j + 1; i < n; i++) LU[i][j] /= LU[j][j];
      }
      for (let i = j + 1; i < n; i++) {
        for (let k = j + 1; k < n; k++) LU[i][k] -= LU[i][j] * LU[j][k];
      }
    }
    return { LU, P, pivSign };
  };

  const determinant = (A) => {
    const n = A.length;
    if (n === 0 || A[0].length !== n) throw new Error("Determinant Requires A Square Matrix.");
    const { LU, pivSign } = luDecompose(A);
    let det = pivSign;
    for (let i = 0; i < n; i++) det *= LU[i][i];
    return det;
  };

  const luSolve = (LU, P, b) => {
    const n = LU.length;
    const x = new Array(n);
    for (let i = 0; i < n; i++) {
      let sum = b[P[i]];
      for (let j = 0; j < i; j++) sum -= LU[i][j] * x[j];
      x[i] = sum;
    }
    for (let i = n - 1; i >= 0; i--) {
      let sum = x[i];
      for (let j = i + 1; j < n; j++) sum -= LU[i][j] * x[j];
      x[i] = sum / LU[i][i];
    }
    return x;
  };

  const solveAxEqualsb = (A, bCol) => {
    const n = A.length;
    if (n === 0 || A[0].length !== n) throw new Error("Solve Requires A Square Matrix.");
    if (bCol.length !== n) throw new Error("The b Vector Must Have The Same Number Of Rows As A.");
    const { LU, P } = luDecompose(A);
    const x = luSolve(LU, P, bCol.map((v) => v[0] ?? v));
    return x.map((v) => [v]);
  };

  const inverse = (A) => {
    const n = A.length;
    if (n === 0 || A[0].length !== n) throw new Error("Inverse Requires A Square Matrix.");
    const Aug = A.map((row, i) => row.concat(identity(n)[i]));
    const { R } = rref(Aug);
    const tol = 1e-8;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j && Math.abs(R[i][j] - 1) > tol) throw new Error("Matrix Is Singular; No Inverse.");
        if (i !== j && Math.abs(R[i][j]) > tol) throw new Error("Matrix Is Singular; No Inverse.");
      }
    }
    return R.map((row) => row.slice(n));
  };

  const powerIteration = (A, maxIter = 1000, tol = 1e-10) => {
    const [n, m] = shape(A);
    if (n !== m) throw new Error("Eigen Computation Requires A Square Matrix.");
    let v = Array.from({ length: n }, () => 1 / Math.sqrt(n));
    let lambdaOld = 0;
    const dot = (x, y) => x.reduce((s, xi, i) => s + xi * y[i], 0);
    const norm = (x) => Math.sqrt(dot(x, x));
    for (let it = 0; it < maxIter; it++) {
      const w = Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) w[i] += A[i][j] * v[j];
      const nv = norm(w);
      if (nv < tol) break;
      const vNext = w.map((x) => x / nv);
      const lambda = dot(vNext, w);
      if (Math.abs(lambda - lambdaOld) < tol) {
        v = vNext;
        lambdaOld = lambda;
        break;
      }
      v = vNext;
      lambdaOld = lambda;
    }
    return { eigenvalue: lambdaOld, eigenvector: v.map((x) => [x]) };
  };

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const valueToHeat = (v, minV, maxV) => {
    if (!isFinite(v)) return "var(--mx-cell-bg)";
    const span = Math.max(Math.abs(minV), Math.abs(maxV)) || 1;
    const t = Math.max(-1, Math.min(1, v / span));
    if (Math.abs(t) < 0.15) return "hsl(210 20% 30%)";
    const intensity = Math.abs(t);
    const hue = t < 0 ? 210 : 0;
    const sat = 35 + intensity * 45;
    const light = 18 + (1 - intensity) * 12;
    return `hsl(${hue} ${clamp01(sat)}% ${clamp01(light)}%)`;
  };

  const MatrixGrid = ({ label, matrix, setMatrix, minV, maxV, editable = true }) => {
    const [rows, cols] = shape(matrix);
    const onChange = useCallback(
      (r, c, val) => {
        const n = Number(val);
        const v = Number.isFinite(n) ? n : 0;
        setMatrix((prev) => {
          const next = deepClone(prev);
          next[r][c] = v;
          return next;
        });
      },
      [setMatrix]
    );
    return (
      <div className="dinolabsMatrixMatrixBox" aria-live="polite">
        <div className="dinolabsMatrixMatrixHeader">
          <span className="dinolabsMatrixMatrixTitle">{label}</span>
          <span className="dinolabsMatrixMatrixDims">
            {rows}×{cols}
          </span>
        </div>
        <div
          className="dinolabsMatrixMatrixGrid"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(48px, 1fr))` }}
        >
          {matrix.map((row, i) =>
            row.map((v, j) => (
              <input
                key={`${i}-${j}`}
                className="dinolabsMatrixCellInput"
                type="text"
                inputMode="decimal"
                value={Number.isFinite(v) ? String(v) : ""}
                onChange={(e) => editable && onChange(i, j, e.target.value)}
                readOnly={!editable}
                style={{ backgroundColor: valueToHeat(v, minV, maxV) }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const formatMessage = (s) => {
    const str = String(s || "").trim();
    if (!str) return "";
    const titled = str
      .split(" ")
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
    return titled.endsWith(".") ? titled : `${titled}.`;
  };

  const [aRows, setARows] = useState(3);
  const [aCols, setACols] = useState(3);
  const [bRows, setBRows] = useState(3);
  const [bCols, setBCols] = useState(3);
  const [A, setA] = useState(() => zeros(3, 3));
  const [B, setB] = useState(() => zeros(3, 3));
  const [Result, setResult] = useState(() => zeros(1, 1));
  const [lastOp, setLastOp] = useState("");
  const [scalar, setScalar] = useState(2);
  const [importText, setImportText] = useState("");
  const [rrefOps, setRrefOps] = useState([]);
  const [history, setHistory] = useState([]);

  const [minV, maxV] = useMemo(() => {
    const all = [...A.flat(), ...B.flat(), ...Result.flat()].filter((x) => Number.isFinite(x));
    if (all.length === 0) return [-1, 1];
    return [Math.min(...all), Math.max(...all)];
  }, [A, B, Result]);

  const resizeMatrix = (M, rNew, cNew) => {
    const [rOld, cOld] = shape(M);
    const r = clamp(rNew, 1, 10);
    const c = clamp(cNew, 1, 10);
    const next = zeros(r, c);
    for (let i = 0; i < Math.min(rOld, r); i++)
      for (let j = 0; j < Math.min(cOld, c); j++) next[i][j] = M[i][j];
    return next;
  };

  const handleSetARows = (val) => {
    const r = clamp(Number(val) || 1, 1, 10);
    setARows(r);
    setA((prev) => resizeMatrix(prev, r, aCols));
  };

  const handleSetACols = (val) => {
    const c = clamp(Number(val) || 1, 1, 10);
    setACols(c);
    setA((prev) => resizeMatrix(prev, aRows, c));
  };

  const handleSetBRows = (val) => {
    const r = clamp(Number(val) || 1, 1, 10);
    setBRows(r);
    setB((prev) => resizeMatrix(prev, r, bCols));
  };

  const handleSetBCols = (val) => {
    const c = clamp(Number(val) || 1, 1, 10);
    setBCols(c);
    setB((prev) => resizeMatrix(prev, bRows, c));
  };

  const pushHistory = (label, out) => {
    setHistory((h) => [{ label, out: deepClone(out), ts: Date.now() }, ...h].slice(0, 50));
  };

  const doAdd = () => {
    try {
      const C = add(A, B);
      setResult(C);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("A + B", C);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doSub = () => {
    try {
      const C = sub(A, B);
      setResult(C);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("A - B", C);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doMulAB = () => {
    try {
      const C = multiply(A, B);
      setResult(C);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("A × B", C);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doMulBA = () => {
    try {
      const C = multiply(B, A);
      setResult(C);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("B × A", C);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doScalarA = () => {
    const k = Number(scalar) || 0;
    const C = scalarMul(A, k);
    setResult(C);
    setLastOp("Operation Completed Successfully.");
    setRrefOps([]);
    pushHistory(`${roundNice(k)} · A`, C);
  };

  const doScalarB = () => {
    const k = Number(scalar) || 0;
    const C = scalarMul(B, k);
    setResult(C);
    setLastOp("Operation Completed Successfully.");
    setRrefOps([]);
    pushHistory(`${roundNice(k)} · B`, C);
  };

  const doTransposeA = () => {
    const C = transpose(A);
    setResult(C);
    setLastOp("Operation Completed Successfully.");
    setRrefOps([]);
    pushHistory("Aᵀ", C);
  };

  const doTransposeB = () => {
    const C = transpose(B);
    setResult(C);
    setLastOp("Operation Completed Successfully.");
    setRrefOps([]);
    pushHistory("Bᵀ", C);
  };

  const doDetA = () => {
    try {
      const d = determinant(A);
      const C = [[d]];
      setResult(C);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("det(A)", C);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doDetB = () => {
    try {
      const d = determinant(B);
      const C = [[d]];
      setResult(C);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("det(B)", C);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doInverseA = () => {
    try {
      const inv = inverse(A);
      setResult(inv);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("A⁻¹", inv);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doInverseB = () => {
    try {
      const invB = inverse(B);
      setResult(invB);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("B⁻¹", invB);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doRrefA = () => {
    const { R, ops } = rref(A);
    setResult(R);
    setLastOp("Operation Completed Successfully.");
    setRrefOps(ops);
    pushHistory("RREF(A)", R);
  };

  const doRrefB = () => {
    const { R, ops } = rref(B);
    setResult(R);
    setLastOp("Operation Completed Successfully.");
    setRrefOps(ops);
    pushHistory("RREF(B)", R);
  };

  const doRankA = () => {
    const r = rankFromRREF(rref(A).R);
    const C = [[r]];
    setResult(C);
    setLastOp("Operation Completed Successfully.");
    setRrefOps([]);
    pushHistory("rank(A)", C);
  };

  const doRankB = () => {
    const r = rankFromRREF(rref(B).R);
    const C = [[r]];
    setResult(C);
    setLastOp("Operation Completed Successfully.");
    setRrefOps([]);
    pushHistory("rank(B)", C);
  };

  const doSolveAxEqB = () => {
    const [ra, ca] = shape(A);
    const [rb, cb] = shape(B);
    if (ra === 0 || ca !== ra) {
      setLastOp("Solve Requires A Square Matrix.");
      return;
    }
    if (!(rb === ra && cb === 1)) {
      setLastOp("For Solve, B Must Be A Column Vector With The Same Rows As A.");
      return;
    }
    try {
      const x = solveAxEqualsb(A, B);
      setResult(x);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("Solve A x = b", x);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const doEigenA = () => {
    try {
      const { eigenvalue, eigenvector } = powerIteration(A);
      const out = [[eigenvalue], ...eigenvector];
      setResult(out);
      setLastOp("Operation Completed Successfully.");
      setRrefOps([]);
      pushHistory("eig(A) ~", out);
    } catch (error) {
      setLastOp(formatMessage(error.message || error));
    }
  };

  const fillZeroA = () => setA(zeros(aRows, aCols));

  const fillZeroB = () => setB(zeros(bRows, bCols));

  const fillIdA = () => {
    const n = Math.min(aRows, aCols);
    const I = identity(n);
    setARows(n);
    setACols(n);
    setA(I);
  };

  const fillIdB = () => {
    const n = Math.min(bRows, bCols);
    const I = identity(n);
    setBRows(n);
    setBCols(n);
    setB(I);
  };

  const fillRandomA = () => setA(randomMatrix(aRows, aCols));

  const fillRandomB = () => setB(randomMatrix(bRows, bCols));

  const copyToClipboard = async (fmt, src) => {
    const payload = fmt === "csv" ? matrixToCSV(src) : fmt === "json" ? matrixToJSON(src) : matrixToLaTeX(src);
    try {
      await navigator.clipboard.writeText(payload);
      setLastOp(`Copied ${fmt.toUpperCase()} To Clipboard.`);
    } catch {
      setLastOp("Copy Failed.");
    }
  };

  const downloadText = (name, text) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importToA = () => {
    const M = parseTextToMatrix(importText);
    setARows(M.length);
    setACols(M[0]?.length || 1);
    setA(M);
  };

  const importToB = () => {
    const M = parseTextToMatrix(importText);
    setBRows(M.length);
    setBCols(M[0]?.length || 1);
    setB(M);
  };

  return (
    <div className="dinolabsMatrixApp" tabIndex={0}>
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsMatrixContainer">
        <aside className="dinolabsMatrixSidebar">
          <div className="dinolabsMatrixSection">
            <div className="dinolabsMatrixSectionTitle">
              <FontAwesomeIcon icon={faTableCellsLarge} />
              <span>Dimensions</span>
            </div>
            <div className="dinolabsMatrixRow">
              <div className="dinolabsMatrixDimCol">
                <div className="dinolabsMatrixDimLabel">A Rows</div>
                <input className="dinolabsMatrixNum" type="number" min="1" max="10" value={aRows} onChange={(e) => handleSetARows(e.target.value)} />
              </div>
              <div className="dinolabsMatrixDimCol">
                <div className="dinolabsMatrixDimLabel">A Cols</div>
                <input className="dinolabsMatrixNum" type="number" min="1" max="10" value={aCols} onChange={(e) => handleSetACols(e.target.value)} />
              </div>
              <div className="dinolabsMatrixDimCol">
                <div className="dinolabsMatrixDimLabel">B Rows</div>
                <input className="dinolabsMatrixNum" type="number" min="1" max="10" value={bRows} onChange={(e) => handleSetBRows(e.target.value)} />
              </div>
              <div className="dinolabsMatrixDimCol">
                <div className="dinolabsMatrixDimLabel">B Cols</div>
                <input className="dinolabsMatrixNum" type="number" min="1" max="10" value={bCols} onChange={(e) => handleSetBCols(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="dinolabsMatrixSection">
            <div className="dinolabsMatrixSectionTitle">
              <FontAwesomeIcon icon={faRulerCombined} />
              <span>Templates</span>
            </div>
            <div className="dinolabsMatrixBtnRow">
              <button type="button" className="dinolabsMatrixBtn" onClick={fillZeroA}><FontAwesomeIcon icon={faTrashCan} /> Zero A</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={fillZeroB}><FontAwesomeIcon icon={faTrashCan} /> Zero B</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={fillIdA}><FontAwesomeIcon icon={faVectorSquare} /> I (A)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={fillIdB}><FontAwesomeIcon icon={faVectorSquare} /> I (B)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={fillRandomA}><FontAwesomeIcon icon={faRandom} /> Random A</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={fillRandomB}><FontAwesomeIcon icon={faRandom} /> Random B</button>
            </div>
          </div>

          <div className="dinolabsMatrixSection">
            <div className="dinolabsMatrixSectionTitle">
              <FontAwesomeIcon icon={faLayerGroup} />
              <span>Ops (Binary)</span>
            </div>
            <div className="dinolabsMatrixBtnRow">
              <button type="button" className="dinolabsMatrixBtn" onClick={doAdd}>A + B</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doSub}>A − B</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doMulAB}>A × B</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doMulBA}>B × A</button>
            </div>
          </div>

          <div className="dinolabsMatrixSection">
            <div className="dinolabsMatrixSectionTitle">
              <FontAwesomeIcon icon={faPlusMinus} />
              <span>Scalar</span>
            </div>
            <div className="dinolabsMatrixBtnRow">
              <input className="dinolabsMatrixNum" type="number" step="0.1" value={scalar} onChange={(e) => setScalar(e.target.value)} />
              <button type="button" className="dinolabsMatrixBtn" onClick={doScalarA}>k·A</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doScalarB}>k·B</button>
            </div>
          </div>

          <div className="dinolabsMatrixSection">
            <div className="dinolabsMatrixSectionTitle">
              <FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} />
              <span>Transpose</span>
            </div>
            <div className="dinolabsMatrixBtnRow">
              <button type="button" className="dinolabsMatrixBtn" onClick={doTransposeA}>Aᵀ</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doTransposeB}>Bᵀ</button>
            </div>
          </div>

          <div className="dinolabsMatrixSection">
            <div className="dinolabsMatrixSectionTitle">
              <FontAwesomeIcon icon={faSquareRootVariable} />
              <span>Advanced</span>
            </div>
            <div className="dinolabsMatrixBtnRow">
              <button type="button" className="dinolabsMatrixBtn" onClick={doDetA}>det(A)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doDetB}>det(B)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doInverseA}>A⁻¹</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doInverseB}>B⁻¹</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doRrefA}>RREF(A)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doRrefB}>RREF(B)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doRankA}>rank(A)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doRankB}>rank(B)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doSolveAxEqB}>Solve A x = b (b = B)</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={doEigenA}>eig(A) (approx)</button>
            </div>
          </div>

          <div className="dinolabsMatrixSection">
            <div className="dinolabsMatrixSectionTitle">
              <FontAwesomeIcon icon={faCopy} />
              <span>Import / Export</span>
            </div>
            <textarea
              className="dinolabsMatrixTextArea"
              placeholder="Paste CSV, whitespace, or semicolon separated values here."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="dinolabsMatrixBtnRow">
              <button type="button" className="dinolabsMatrixBtn" onClick={importToA}><FontAwesomeIcon icon={faPaste} /> To A</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={importToB}><FontAwesomeIcon icon={faPaste} /> To B</button>
              <button type="button" className="dinolabsMatrixBtn" onClick={() => copyToClipboard("csv", Result)}>CSV <FontAwesomeIcon icon={faCopy} /></button>
              <button type="button" className="dinolabsMatrixBtn" onClick={() => copyToClipboard("json", Result)}>JSON <FontAwesomeIcon icon={faCopy} /></button>
              <button type="button" className="dinolabsMatrixBtn" onClick={() => copyToClipboard("tex", Result)}>LaTeX <FontAwesomeIcon icon={faCopy} /></button>
              <button type="button" className="dinolabsMatrixBtn" onClick={() => downloadText("matrix_result.csv", matrixToCSV(Result))}><FontAwesomeIcon icon={faDownload} /> Download CSV</button>
            </div>
          </div>
        </aside>

        <main className="dinolabsMatrixMain">
          <div className="dinolabsMatrixGrids">
            <MatrixGrid label="A" matrix={A} setMatrix={setA} minV={minV} maxV={maxV} />
            <MatrixGrid label="B" matrix={B} setMatrix={setB} minV={minV} maxV={maxV} />
          </div>

          <div className="dinolabsMatrixResultPanel">
            <div className="dinolabsMatrixResultHeader" aria-live="polite">
              <div className="dinolabsMatrixResultTitle">
                {lastOp ? <em className="dinolabsMatrixLastOp">({lastOp})</em> : null}
              </div>
              <div className="dinolabsMatrixPillGroup">
                <button type="button" className="dinolabsMatrixBtn subtle" onClick={() => setA(deepClone(Result))}>Send → A</button>
                <button type="button" className="dinolabsMatrixBtn subtle" onClick={() => setB(deepClone(Result))}>Send → B</button>
                <button type="button" className="dinolabsMatrixBtn subtle" onClick={() => setResult(zeros(1, 1))}><FontAwesomeIcon icon={faDeleteLeft} /> Clear</button>
              </div>
            </div>

            <div className="dinolabsMatrixResultGridWrap">
              <MatrixGrid label="R" matrix={Result} setMatrix={() => {}} minV={minV} maxV={maxV} editable={false} />
            </div>

            {rrefOps.length > 0 && (
              <div className="dinolabsMatrixOpsLog">
                <div className="dinolabsMatrixOpsTitle">RREF Steps <FontAwesomeIcon icon={faArrowUpRightFromSquare} /></div>
                <div className="dinolabsMatrixOpsList">
                  {rrefOps.map((op, i) => (
                    <div key={i} className="dinolabsMatrixOpsItem">{i + 1}. {op}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="dinolabsMatrixHistory">
              <div className="dinolabsMatrixHistoryTitle">History</div>
              <div className="dinolabsMatrixHistoryList">
                {history.map((h, idx) => (
                  <div key={idx} className="dinolabsMatrixHistoryItem">
                    <div className="dinolabsMatrixHistoryHead">
                      <span className="dinolabsMatrixHistoryLabel">{h.label}</span>
                      <div className="dinolabsMatrixPillGroup">
                        <button type="button" className="dinolabsMatrixBtn tiny" onClick={() => setResult(deepClone(h.out))}>Preview</button>
                        <button type="button" className="dinolabsMatrixBtn tiny" onClick={() => setA(deepClone(h.out))}>→ A</button>
                        <button type="button" className="dinolabsMatrixBtn tiny" onClick={() => setB(deepClone(h.out))}>→ B</button>
                      </div>
                    </div>
                    <div className="dinolabsMatrixHistoryGrid">
                      <div
                        className="dinolabsMatrixMatrixGrid mini"
                        style={{ gridTemplateColumns: `repeat(${(h.out[0] || []).length}, minmax(24px, 1fr))` }}
                      >
                        {h.out.map((row, i) =>
                          row.map((v, j) => (
                            <div key={`${i}-${j}`} className="dinolabsMatrixCellMini">{roundNice(v)}</div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <div className="dinolabsMatrixHistoryEmpty">No History Yet</div>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}