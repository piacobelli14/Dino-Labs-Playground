import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBook,
  faSpellCheck,
  faCalculator,
  faChartLine,
  faTableCellsLarge,   
  faRulerCombined,     
  faPalette,           
  faUniversalAccess,   
  faCubesStacked,     
  faImages,            
  faHighlighter,
  faCompressArrowsAlt,
  faScissors       
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../helpers/Nav.jsx";
import DinoLabsLoading from "../../helpers/Loading.jsx";
import DinoLabsUnavailable from "../../helpers/Unavailable.jsx";
import useAuth from "../../UseAuth.jsx";
import "../../styles/mainStyles/DinoLabsPlugins/DinoLabsPlugins.css";

const DinoLabsPlugins = () => {
  const { token, userID, organizationID, loading } = useAuth();
  const [isLoaded, setIsLoaded] = useState(true);
  const [screenSize, setScreenSize] = useState(window.innerWidth);
  const navigate = useNavigate();

  const tools = useMemo(
    () => [
      {
        key: "dictionary",
        title: "Dictionary",
        description: "Look up precise definitions and usage examples instantly.",
        icon: faBook,
        gradientClass: "dinolabsPluginsGradientDictionary",
        path: "/dictionary"
      },
      {
        key: "thesaurus",
        title: "Thesaurus",
        description: "Find synonyms and antonyms to sharpen your writing.",
        icon: faSpellCheck,
        gradientClass: "dinolabsPluginsGradientThesaurus",
        path: "/thesaurus"
      },
      {
        key: "calculator",
        title: "Calculator",
        description: "Do quick math, from basics to scientific functions.",
        icon: faCalculator,
        gradientClass: "dinolabsPluginsGradientCalculator",
        path: "/calculator"
      },
      {
        key: "plotting-calculator",
        title: "Plotting Calculator",
        description: "Graph equations and visualize functions interactively.",
        icon: faChartLine,
        gradientClass: "dinolabsPluginsGradientPlotter",
        path: "/plot"
      },
      {
        key: "matrix",
        title: "Matrix",
        description: "Linear algebra helpers and matrix utilities.",
        icon: faTableCellsLarge,
        gradientClass: "dinolabsPluginsGradientMatrix",
        path: "/matrix"
      },
      {
        key: "colortypelab",
        title: "Color & Type Lab",
        description: "Palettes, contrast checks, gradients, variable fonts.",
        icon: faPalette,
        gradientClass: "dinolabsPluginsGradientColorTypeLab",
        path: "/colortypelab"
      },
      {
        key: "compressionlab",
        title: "Compression Lab",
        description: "Compress images, documents, and other files efficiently.",
        icon: faCompressArrowsAlt,
        gradientClass: "dinolabsPluginsGradientCompressionLab",
        path: "/compressionlab"
      },
      {
        key: "backgroundremover",
        title: "Background Remover",
        description: "Remove backgrounds from images with smart detection tools.",
        icon: faScissors,
        gradientClass: "dinolabsPluginsGradientBackgroundRemover",
        path: "/backgroundremover"
      },
    ],
    []
  );

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsLoaded(false);
      setScreenSize(window.innerWidth);
      setTimeout(() => setIsLoaded(true), 300);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="dinolabsPluginsPageWrapper">
      <DinoLabsNav activePage="dinolabside" />
      {screenSize >= 700 && screenSize <= 5399 && isLoaded ? (
        <div className="dinolabsPluginsHeaderContainer">
          <div className="dinolabsPluginsGrid">
            {tools.map((tool) => (
              <button
                key={tool.key}
                className={`dinolabsPluginsToolCard ${tool.gradientClass || ""}`}
                onClick={() => navigate(tool.path)}
                aria-label={tool.title}
                type="button"
              >
                <div className="dinolabsPluginsToolCardIconWrap">
                  <FontAwesomeIcon
                    icon={tool.icon}
                    className="dinolabsPluginsToolCardIcon"
                  />
                </div>
                <div className="dinolabsPluginsToolCardText">
                  <div className="dinolabsPluginsToolCardTitle">{tool.title}</div>
                  <div className="dinolabsPluginsToolCardDescription">
                    {tool.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : !isLoaded ? (
        <DinoLabsLoading />
      ) : (
        <DinoLabsUnavailable screenSize={screenSize} />
      )}
    </div>
  );
};

export default DinoLabsPlugins;