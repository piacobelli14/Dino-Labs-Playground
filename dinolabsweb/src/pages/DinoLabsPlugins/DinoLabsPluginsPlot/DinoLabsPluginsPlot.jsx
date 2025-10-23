import React, { useState, useRef, useEffect, useCallback } from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import DinoLabsNav from "../../../helpers/Nav";
import DinoLabsColorPicker from "../../../helpers/ColorPicker.jsx";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsPlot/DinoLabsPluginsPlot.css";
import "../../../styles/helperStyles/Slider.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faHouse, faKeyboard, faLineChart, faMinus, faPlus, faRotate, faXmark } from "@fortawesome/free-solid-svg-icons";

const KNOWN_FUNCTIONS = [
  "sin", "cos", "tan", "sec", "csc", "cot",
  "asin", "acos", "atan", "asec", "acsc", "acot",
  "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "sech", "csch", "coth", "asech", "acsch", "acoth",
  "exp", "ln", "log", "logn", "sqrt", "pow", "root",
  "abs", "floor", "ceil", "round", "sign",
  "hypot", "clamp", "fact", "perm", "comb",
  "toRad", "toDeg"
];

const KNOWN_CONSTANTS = [
  "pi", "e", "tau", "phi", "gamma",
  "c", "G", "h", "hbar", "k", "R", "NA", "qe", "eps0", "mu0",
  "me", "mp", "mn", "g0", "sigmaSB", "Ry", "alpha", "ke"
];

const DinoLabsPluginsPlot = () => {
  const canvasRef = useRef(null);

  const [formulas, setFormulas] = useState([]);
  const [variables, setVariables] = useState([]);
  const [intercepts, setIntercepts] = useState([]);
  const [isKeyboardView, setIsKeyboardView] = useState(false);
  const [functionMode, setFunctionMode] = useState("fx");
  const [colorPickerOpen, setColorPickerOpen] = useState({});
  const [mathMinX, setMathMinX] = useState(-10);
  const [mathMaxX, setMathMaxX] = useState(10);
  const [mathMinY, setMathMinY] = useState(-10);
  const [mathMaxY, setMathMaxY] = useState(10);

  const randomColor = () => {
    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd", "#00d2d3", "#ff9f43", "#10ac84", "#ee5253"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getPrefixForMode = (mode) => {
    switch (mode) {
      case "derv": return "y' = ";
      case "integ": return "∫y = ";
      default: return "y = ";
    }
  };

  const evaluateFunction = (formula, x, vars = {}) => {
    const allVars = { x, ...vars };
    let expression = formula.text;
    
    const prefixes = ["y = ", "y' = ", "∫y = "];
    for (const prefix of prefixes) {
      if (expression.startsWith(prefix)) {
        expression = expression.substring(prefix.length);
        break;
      }
    }
    
    if (!expression.trim()) return NaN;

    const SAFE = {
      sin: (v) => Math.sin(v),
      cos: (v) => Math.cos(v),
      tan: (v) => Math.tan(v),
      sec: (v) => 1 / Math.cos(v),
      csc: (v) => 1 / Math.sin(v),
      cot: (v) => 1 / Math.tan(v),
      asin: (v) => (v < -1 || v > 1) ? NaN : Math.asin(v),
      acos: (v) => (v < -1 || v > 1) ? NaN : Math.acos(v),
      atan: (v) => Math.atan(v),
      asec: (v) => (v === 0 ? NaN : ((1/v < -1 || 1/v > 1) ? NaN : Math.acos(1/v))),
      acsc: (v) => (v === 0 ? NaN : ((1/v < -1 || 1/v > 1) ? NaN : Math.asin(1/v))),
      acot: (v) => (v === 0 ? Math.PI/2 : Math.atan(1/v)),

      sinh: (v) => (Math.sinh ? Math.sinh(v) : (Math.exp(v) - Math.exp(-v)) / 2),
      cosh: (v) => (Math.cosh ? Math.cosh(v) : (Math.exp(v) + Math.exp(-v)) / 2),
      tanh: (v) => (Math.tanh ? Math.tanh(v) : (Math.exp(v) - Math.exp(-v)) / (Math.exp(v) + Math.exp(-v))),
      asinh: (v) => (Math.asinh ? Math.asinh(v) : Math.log(v + Math.sqrt(v*v + 1))),
      acosh: (v) => (v < 1 ? NaN : (Math.acosh ? Math.acosh(v) : Math.log(v + Math.sqrt(v - 1) * Math.sqrt(v + 1)))),
      atanh: (v) => (v <= -1 || v >= 1) ? NaN : (Math.atanh ? Math.atanh(v) : 0.5 * Math.log((1 + v) / (1 - v))),
      sech: (v) => 1 / (Math.cosh ? Math.cosh(v) : (Math.exp(v) + Math.exp(-v)) / 2),
      csch: (v) => {
        const s = (Math.sinh ? Math.sinh(v) : (Math.exp(v) - Math.exp(-v)) / 2);
        return s === 0 ? NaN : 1 / s;
      },
      coth: (v) => {
        const t = (Math.tanh ? Math.tanh(v) : (Math.exp(v) - Math.exp(-v)) / (Math.exp(v) + Math.exp(-v)));
        return t === 0 ? NaN : 1 / t;
      },
      asech: (v) => (v <= 0 || v > 1) ? NaN : SAFE.acosh(1 / v),
      acsch: (v) => (v === 0 ? NaN : SAFE.asinh(1 / v)),
      acoth: (v) => (Math.abs(v) <= 1 ? NaN : SAFE.atanh(1 / v)),

      exp: (v) => Math.exp(v),
      ln: (v) => (v <= 0 ? NaN : Math.log(v)),
      log: (v) => (v <= 0 ? NaN : (Math.log10 ? Math.log10(v) : Math.log(v) / Math.LN10)),
      logn: (v, b) => (v <= 0 || b <= 0 || b === 1) ? NaN : Math.log(v) / Math.log(b),
      sqrt: (v) => (v < 0 ? NaN : Math.sqrt(v)),
      pow: (...xs) => {
        if (xs.length === 1) return Math.pow(xs[0], 2);
        if (xs.length === 2) return Math.pow(xs[0], xs[1]);
        return NaN;
      },
      root: (v, n) => {
        if (n === 0 || !isFinite(n)) return NaN;
        if (v < 0) {
          if (Number.isInteger(n) && Math.abs(n % 2) === 1) return -Math.pow(-v, 1 / n);
          return NaN;
        }
        return Math.pow(v, 1 / n);
      },

      abs: (v) => Math.abs(v),
      floor: (v) => Math.floor(v),
      ceil: (v) => Math.ceil(v),
      round: (v) => Math.round(v),
      sign: (v) => Math.sign(v),
      hypot: (...xs) => (xs.length < 2 ? NaN : Math.hypot(...xs)),
      clamp: (v, min, max) => (min > max ? NaN : Math.max(min, Math.min(max, v))),
      fact: (n) => {
        if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
        let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
      },
      perm: (n, k) => {
        if (![n, k].every(Number.isInteger) || n < 0 || k < 0 || k > n) return NaN;
        let r = 1; for (let i = n - k + 1; i <= n; i++) r *= i; return r;
      },
      comb: (n, k) => {
        if (![n, k].every(Number.isInteger) || n < 0 || k < 0 || k > n) return NaN;
        k = Math.min(k, n - k); let num = 1, den = 1;
        for (let i = 1; i <= k; i++) { num *= n - k + i; den *= i; }
        return num / den;
      },
      toRad: (deg) => deg * (Math.PI / 180),
      toDeg: (rad) => rad * (180 / Math.PI)
    };

    const CONST = {
      pi: Math.PI,
      e: Math.E,
      tau: 2 * Math.PI,
      phi: (1 + Math.sqrt(5)) / 2,
      gamma: 0.5772156649015329,
      c: 299792458,
      G: 6.67430e-11,
      h: 6.62607015e-34,
      hbar: 1.054571817e-34,
      k: 1.380649e-23,
      R: 8.314462618,
      NA: 6.02214076e23,
      qe: 1.602176634e-19,
      eps0: 8.8541878128e-12,
      mu0: 1.25663706212e-6,
      me: 9.1093837015e-31,
      mp: 1.67262192369e-27,
      mn: 1.67492749804e-27,
      g0: 9.80665,
      sigmaSB: 5.670374419e-8,
      Ry: 10973731.568160,
      alpha: 7.2973525693e-3,
      ke: 8.9875517923e9
    };
    
    let result = expression;


    for (const [varName, value] of Object.entries(allVars)) {
      // Use word boundary only after variable name to avoid partial matches
      const regex = new RegExp(`${varName}\\b`, "g");
      result = result.replace(regex, `(${value})`);
    }

    result = result.replace(/\^/g, "**");

    const constNames = [...KNOWN_CONSTANTS].sort((a, b) => b.length - a.length);
    for (const cname of constNames) {
      const re = new RegExp(`\\b${cname}\\b`, "g");
      result = result.replace(re, `CONST.${cname}`);
    }

    const fnNames = [...KNOWN_FUNCTIONS].sort((a, b) => b.length - a.length);
    for (const fname of fnNames) {
      const re = new RegExp(`\\b${fname}\\s*\\(`, "g");
      result = result.replace(re, `SAFE.${fname}(`);
    }

    // Add implicit multiplication for patterns like 2x, 3(x+1), etc.
    result = result.replace(/(\d)([a-zA-Z])/g, "$1*$2");
    result = result.replace(/(\d)(\()/g, "$1*$2");
    result = result.replace(/(\))(\d)/g, "$1*$2");
    result = result.replace(/(\))(\()/g, "$1*$2");
    result = result.replace(/([a-zA-Z])(\d)/g, "$1*$2");

    try {
      const value = eval(result);
      return isFinite(value) ? value : NaN;
    } catch (error) {
      return NaN;
    }
  };

  const addFormula = () => {
    const newFormula = {
      id: Date.now(),
      text: getPrefixForMode(functionMode),
      color: randomColor(),
      isHidden: false,
      mode: functionMode
    };
    setFormulas([...formulas, newFormula]);
  };

  const updateFormula = (id, newText) => {
    setFormulas(formulas.map(f => f.id === id ? { ...f, text: newText } : f));
    setIntercepts([]);
  };

  const updateFormulaColor = (id, newColor) => {
    setFormulas(formulas.map(f => f.id === id ? { ...f, color: newColor } : f));
    setIntercepts([]);
  };

  const removeFormula = (id) => {
    setFormulas(formulas.filter(f => f.id !== id));
    setIntercepts([]);
    const newColorPickerOpen = { ...colorPickerOpen };
    delete newColorPickerOpen[id];
    setColorPickerOpen(newColorPickerOpen);
  };

  const toggleFormulaVisibility = (id) => {
    setFormulas(formulas.map(f => f.id === id ? { ...f, isHidden: !f.isHidden } : f));
  };

  const toggleColorPicker = (id) => {
    setColorPickerOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const closeColorPicker = (id) => {
    setColorPickerOpen(prev => ({
      ...prev,
      [id]: false
    }));
  };

  const addVariable = (name) => {
    if (!variables.find(v => v.name === name)) {
      setVariables([...variables, { id: Date.now(), name, value: 0 }]);
    }
  };

  const updateVariableValue = (id, value) => {
    setVariables(variables.map(v => v.id === id ? { ...v, value } : v));
    setIntercepts([]);
  };

  const removeVariable = (id) => {
    setVariables(variables.filter(v => v.id !== id));
    setIntercepts([]);
  };

  const insertText = (text) => {
    if (formulas.length > 0) {
      const lastFormula = formulas[formulas.length - 1];
      updateFormula(lastFormula.id, lastFormula.text + text);
    }
  };

  const zoomGraph = (isZoomIn) => {
    const centerX = (mathMinX + mathMaxX) / 2;
    const centerY = (mathMinY + mathMaxY) / 2;
    const rangeX = mathMaxX - mathMinX;
    const rangeY = mathMaxY - mathMinY;
    const zoomFactor = isZoomIn ? 0.9 : 1.1;
    
    const newRangeX = rangeX * zoomFactor;
    const newRangeY = rangeY * zoomFactor;
    
    setMathMinX(centerX - newRangeX / 2);
    setMathMaxX(centerX + newRangeX / 2);
    setMathMinY(centerY - newRangeY / 2);
    setMathMaxY(centerY + newRangeY / 2);
  };

  const resetZoom = () => {
    setMathMinX(-10);
    setMathMaxX(10);
    setMathMinY(-10);
    setMathMaxY(10);
  };

  const findIntercepts = () => {
    const foundIntercepts = [];
    const sampleCount = 400;
    const dx = (mathMaxX - mathMinX) / sampleCount;
    const vars = Object.fromEntries(variables.map(v => [v.name, v.value]));
    
    for (let i = 0; i < formulas.length; i++) {
      const formula = formulas[i];
      if (formula.isHidden) continue;
      
      let prevY = evaluateFunction(formula, mathMinX, vars);
      
      for (let j = 1; j <= sampleCount; j++) {
        const x = mathMinX + j * dx;
        const y = evaluateFunction(formula, x, vars);
        
        if (isFinite(prevY) && isFinite(y)) {
          if (prevY * y < 0) {
            const root = x - dx * (y / (y - prevY));
            if (root >= mathMinX && root <= mathMaxX) {
              foundIntercepts.push({
                x: parseFloat(root.toFixed(4)),
                y: 0,
                formulaColor: formula.color
              });
            }
          }
        }
        prevY = y;
      }
      
      if (mathMinX <= 0 && mathMaxX >= 0) {
        const yInt = evaluateFunction(formula, 0, vars);
        if (isFinite(yInt) && yInt >= mathMinY && yInt <= mathMaxY) {
          foundIntercepts.push({
            x: 0,
            y: parseFloat(yInt.toFixed(4)),
            formulaColor: formula.color
          });
        }
      }
    }
    
    setIntercepts(foundIntercepts);
  };

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    
    const transform = (xv, yv) => ({
      x: ((xv - mathMinX) / (mathMaxX - mathMinX)) * width,
      y: height - ((yv - mathMinY) / (mathMaxY - mathMinY)) * height
    });
    
    const niceTickStep = (range) => {
      const roughStep = range / 10;
      const exponent = Math.floor(Math.log10(roughStep));
      const fraction = roughStep / Math.pow(10, exponent);
      const niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
      return niceFraction * Math.pow(10, exponent);
    };
    
    const tickStepX = niceTickStep(mathMaxX - mathMinX);
    const tickStepY = niceTickStep(mathMaxY - mathMinY);
    
    ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    let xTick = Math.ceil(mathMinX / tickStepX) * tickStepX;
    while (xTick <= mathMaxX) {
      const start = transform(xTick, mathMinY);
      const end = transform(xTick, mathMaxY);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      xTick += tickStepX;
    }
    
    let yTick = Math.ceil(mathMinY / tickStepY) * tickStepY;
    while (yTick <= mathMaxY) {
      const start = transform(mathMinX, yTick);
      const end = transform(mathMaxX, yTick);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      yTick += tickStepY;
    }
    ctx.stroke();
    
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    if (mathMinY <= 0 && mathMaxY >= 0) {
      const start = transform(mathMinX, 0);
      const end = transform(mathMaxX, 0);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    }
    
    if (mathMinX <= 0 && mathMaxX >= 0) {
      const start = transform(0, mathMinY);
      const end = transform(0, mathMaxY);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    }
    ctx.stroke();
    
    const vars = Object.fromEntries(variables.map(v => [v.name, v.value]));
    
    formulas.forEach(formula => {
      if (formula.isHidden) return;
      
      ctx.strokeStyle = formula.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const samples = 1000;
      const dx = (mathMaxX - mathMinX) / samples;
      let isFirstPoint = true;
      
      for (let i = 0; i <= samples; i++) {
        const xv = mathMinX + i * dx;
        let y = evaluateFunction(formula, xv, vars);
        
        if (isFinite(y) && Math.abs(y) < 1e6) {
          const point = transform(xv, y);
          if (point.y >= -height && point.y <= 2 * height) {
            if (isFirstPoint) {
              ctx.moveTo(point.x, point.y);
              isFirstPoint = false;
            } else {
              ctx.lineTo(point.x, point.y);
            }
          } else {
            isFirstPoint = true;
          }
        } else {
          isFirstPoint = true;
        }
      }
      ctx.stroke();
    });
    
    intercepts.forEach(intercept => {
      const point = transform(intercept.x, intercept.y);
      
      if (point.x >= -20 && point.x <= width + 20 && point.y >= -20 && point.y <= height + 20) {
        ctx.fillStyle = intercept.formulaColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const text = `(${intercept.x.toFixed(2)}, ${intercept.y.toFixed(2)})`;
        ctx.font = "bold 11px monospace";
        const textMetrics = ctx.measureText(text);
        const padding = 6;
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.lineWidth = 1;
        const rectX = point.x - textMetrics.width / 2 - padding;
        const rectY = point.y - 28 - padding;
        const rectW = textMetrics.width + 2 * padding;
        const rectH = 14 + 2 * padding;
        
        ctx.fillRect(rectX, rectY, rectW, rectH);
        ctx.strokeRect(rectX, rectY, rectW, rectH);
        
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, point.x, point.y - 22);
      }
    });
  }, [formulas, variables, intercepts, mathMinX, mathMaxX, mathMinY, mathMaxY]);

  const extractMissingVariables = (text) => {
    if (!text) return [];
    
    // Remove prefix first
    let expression = text;
    const prefixes = ["y = ", "y' = ", "∫y = "];
    for (const prefix of prefixes) {
      if (expression.startsWith(prefix)) {
        expression = expression.substring(prefix.length);
        break;
      }
    }
    
    if (!expression.trim()) return [];
    
    const matches = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const variableNames = matches.filter(match => 
      !KNOWN_FUNCTIONS.includes(match) &&
      !KNOWN_CONSTANTS.includes(match) &&
      match !== "Math" &&
      !match.startsWith("y") &&
      match !== "x"  // x is the independent variable, not controllable
    );
    const existingVars = variables.map(v => v.name);
    return [...new Set(variableNames)].filter(name => !existingVars.includes(name));
  };

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  useEffect(() => {
    const handleResize = () => drawGraph();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawGraph]);

  return (
    <div className="dinolabsPluginsPlotApp" tabIndex={0}>
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsPluginsPlotContainer">
        <div className="dinolabsPluginsPlotLeftPanel">
          <div className="dinolabsPluginsPlotHeader">
            <button 
              className="dinolabsPluginsPlotAddButton" 
              onClick={addFormula}
              title="Add New Formula"
            >
              <FontAwesomeIcon icon={faPlus}/>
            </button>
            <div className="dinolabsPluginsPlotModeSelector">
              <button 
                className={`dinolabsPluginsPlotModeButton ${functionMode === "fx" ? "active" : ""}`}
                onClick={() => setFunctionMode("fx")}
                title="Function Mode"
              >
                f(x)
              </button>
              <button 
                className={`dinolabsPluginsPlotModeButton ${functionMode === "derv" ? "active" : ""}`}
                onClick={() => setFunctionMode("derv")}
                title="Derivative Mode"
              >
                d/dx
              </button>
              <button 
                className={`dinolabsPluginsPlotModeButton ${functionMode === "integ" ? "active" : ""}`}
                onClick={() => setFunctionMode("integ")}
                title="Integral Mode"
              >
                ∫f
              </button>
            </div>
          </div>

          <div className="dinolabsPluginsPlotFormulasList">
            {formulas.map(formula => {
              const missingVars = extractMissingVariables(formula.text);
              return (
                <div key={formula.id} className="dinolabsPluginsPlotFormulaItem">
                  <div className="dinolabsPluginsPlotFormulaRow">
                    <div className="dinolabsPluginsPlotColorControls">
                      <Tippy 
                        content={
                          <DinoLabsColorPicker 
                            color={formula.color} 
                            onChange={(newColor) => updateFormulaColor(formula.id, newColor)} 
                          />
                        } 
                        visible={colorPickerOpen[formula.id]} 
                        onClickOutside={() => closeColorPicker(formula.id)} 
                        interactive={true} 
                        placement="left-start"
                        offset={[0, 10]}
                        appendTo={document.body}
                        className="color-picker-tippy"
                      >
                        <button
                          className="dinolabsPluginsPlotColorIndicator"
                          style={{ backgroundColor: formula.color }}
                          onClick={() => toggleColorPicker(formula.id)}
                          title="Change Color"
                        />
                      </Tippy>
                      <button
                        className={`dinolabsPluginsPlotVisibilityToggle ${formula.isHidden ? 'hidden' : 'visible'}`}
                        onClick={() => toggleFormulaVisibility(formula.id)}
                        title={formula.isHidden ? "Show Formula" : "Hide Formula"}
                      >
                        <FontAwesomeIcon icon={formula.isHidden ? faEye : faEyeSlash}/>

                      </button>
                    </div>
                    <input
                      type="text"
                      className="dinolabsPluginsPlotFormulaInput"
                      value={formula.text}
                      onChange={(e) => updateFormula(formula.id, e.target.value)}
                      placeholder="Enter formula..."
                    />
                    <button 
                      className="dinolabsPluginsPlotRemoveButton"
                      onClick={() => removeFormula(formula.id)}
                      title="Remove Formula"
                    >
                      <FontAwesomeIcon icon={faXmark}/>
                    </button>
                  </div>
                  {missingVars.length > 0 && (
                    <div className="dinolabsPluginsPlotMissingVars">
                      <span>Add variables: </span>
                      {missingVars.map(varName => (
                        <button 
                          key={varName}
                          className="dinolabsPluginsPlotVarButton"
                          onClick={() => addVariable(varName)}
                          title={`Add variable ${varName}`}
                        >
                          {varName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="dinolabsPluginsPlotVariablesList">
            {variables.map(variable => (
              <div key={variable.id} className="dinolabsPluginsPlotVariableItem">
                <div className="dinolabsPluginsPlotVariableHeader">
                  <small>
                  <span className="dinolabsPluginsPlotVariableName">{variable.name}: </span>
                  <span className="dinolabsPluginsPlotVariableValue">{variable.value.toFixed(1)}</span>
                  </small>
                  <button 
                    className="dinolabsPluginsPlotRemoveButton"
                    onClick={() => removeVariable(variable.id)}
                    title="Remove Variable"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={variable.value}
                  onChange={(e) => updateVariableValue(variable.id, parseFloat(e.target.value))}
                  className="dinolabsSettingsSlider"
                />
              </div>
            ))}
          </div>

          <button 
            className="dinolabsPluginsPlotKeyboardToggle"
            onClick={() => setIsKeyboardView(!isKeyboardView)}
            title="Toggle Virtual Keyboard"
          >
            <FontAwesomeIcon icon={faKeyboard}/>
            <span>{isKeyboardView ? "Hide Keyboard" : "Show Keyboard"}</span>
          </button>
        </div>

        <div className="dinolabsPluginsPlotGraphArea">
          <canvas 
            ref={canvasRef}
            className="dinolabsPluginsPlotCanvas"
          />
          
          <div className="dinolabsPluginsPlotControls">
            <button 
              className="dinolabsPluginsPlotControlButton zoom-in" 
              onClick={() => zoomGraph(true)}
              title="Zoom In"
            >
              <FontAwesomeIcon icon={faPlus}/>
            </button>
            <button 
              className="dinolabsPluginsPlotControlButton zoom-out" 
              onClick={() => zoomGraph(false)}
              title="Zoom Out" 
            >
              <FontAwesomeIcon icon={faMinus}/>
            </button>
            <button 
              className="dinolabsPluginsPlotControlButton reset-zoom" 
              onClick={resetZoom}
              title="Reset Zoom"
            >
              <FontAwesomeIcon icon={faRotate}/>
            </button>
          </div>

          <button 
            className="dinolabsPluginsPlotInterceptButton" 
            onClick={findIntercepts}
            title="Find Function Intercepts"
          >
            <FontAwesomeIcon icon={faLineChart}/>
            <span>Find Intercepts</span>
          </button>
        </div>
      </div>

      {isKeyboardView && (
        <div className="dinolabsPluginsPlotKeyboard">
          <div className="dinolabsPluginsPlotKeyboardSection">
            <h4>Numbers & Operators</h4>
            <div className="dinolabsPluginsPlotKeyboardGrid">
              {["7", "8", "9", "+", "(", ")"].map(key => (
                <button key={key} className="dinolabsPluginsPlotKey" onClick={() => insertText(key)}>
                  {key}
                </button>
              ))}
              {["4", "5", "6", "-", "[", "]"].map(key => (
                <button key={key} className="dinolabsPluginsPlotKey" onClick={() => insertText(key)}>
                  {key}
                </button>
              ))}
              {["1", "2", "3", "/", "{", "}"].map(key => (
                <button key={key} className="dinolabsPluginsPlotKey" onClick={() => insertText(key)}>
                  {key}
                </button>
              ))}
              {["0", ".", "=", "*", "|", "^"].map(key => (
                <button key={key} className="dinolabsPluginsPlotKey" onClick={() => insertText(key)}>
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="dinolabsPluginsPlotKeyboardSection">
            <h4>Functions</h4>
            <div className="dinolabsPluginsPlotKeyboardGrid">
              {[
                "sin(", "cos(", "tan(", "sec(", "csc(", "cot(",
                "asin(", "acos(", "atan(", "asec(", "acsc(", "acot(",
                "sinh(", "cosh(", "tanh(", "asinh(", "acosh(", "atanh(",
                "sech(", "csch(", "coth(", "asech(", "acsch(", "acoth(",
                "exp(", "ln(", "log(", "logn(", "sqrt(", "pow(", "root(",
                "abs(", "floor(", "ceil(", "round(", "sign(", "hypot(", "clamp(",
                "fact(", "perm(", "comb(", "toRad(", "toDeg("
              ].map(key => (
                <button key={key} className="dinolabsPluginsPlotKey function" onClick={() => insertText(key)}>
                  {key.replace("(", "")}
                </button>
              ))}
            </div>
          </div>

          <div className="dinolabsPluginsPlotKeyboardSection">
            <h4>Constants & Variables</h4>
            <div className="dinolabsPluginsPlotKeyboardGrid">
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("3.14159")}>π</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("2.71828")}>e</button>

              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("tau")}>τ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("phi")}>φ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("gamma")}>γ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("c")}>c</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("G")}>G</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("h")}>h</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("hbar")}>ħ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("k")}>k</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("R")}>R</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("NA")}>Nₐ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("qe")}>qₑ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("eps0")}>ε₀</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("mu0")}>μ₀</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("me")}>mₑ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("mp")}>mₚ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("mn")}>mₙ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("g0")}>g₀</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("sigmaSB")}>σ</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("Ry")}>R∞</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("alpha")}>α</button>
              <button className="dinolabsPluginsPlotKey constant" onClick={() => insertText("ke")}>kₑ</button>

              <button className="dinolabsPluginsPlotKey variable" onClick={() => insertText("x")}>x</button>
              <button className="dinolabsPluginsPlotKey variable" onClick={() => insertText("a")}>a</button>
              <button className="dinolabsPluginsPlotKey variable" onClick={() => insertText("b")}>b</button>
              <button className="dinolabsPluginsPlotKey variable" onClick={() => insertText("c")}>c</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DinoLabsPluginsPlot;