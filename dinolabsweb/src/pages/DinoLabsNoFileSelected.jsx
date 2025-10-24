import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen, faCode } from "@fortawesome/free-solid-svg-icons";
import LinePlot from "../helpers/PlottingHelpers/LineHelper.jsx";
import DoughnutPlot from "../helpers/PlottingHelpers/DoughnutHelper.jsx";

const DinoLabsNoFileSelected = ({ handleLoadRepository, handleLoadFile, isPlotRendered, personalUsageByDay, usageLanguages }) => {
  const languageColors = {
    Javascript: "#ec4899",
    Typescript: "#3178c6",
    HTML: "#e34c26",
    CSS: "#9FB7EF",
    JSON: "#8e44ad",
    XML: "#1abc9c",
    Python: "#3572a5",
    PHP: "#8993be",
    Swift: "#ffac45",
    C: "#a8b9cc",
    "C++": "#f34b7d",
    "C#": "#178600",
    Rust: "#dea584",
    Bash: "#4eaa25",
    Shell: "#89e051",
    "Monkey C": "#f45b69",
    SQL: "#c5b7db",
    Assembly: "#5d9ca3",
    default: "#95a5a6",
  };

  const isValidUsageByDay = Array.isArray(personalUsageByDay) && personalUsageByDay.every(
    item => item && item.day instanceof Date && typeof item.count === "number"
  );
  const isValidLanguages = Array.isArray(usageLanguages) && usageLanguages.every(
    item => item && typeof item.language === "string" && typeof item.count === "number"
  );

  const total = isValidLanguages ? usageLanguages.reduce((acc, lang) => acc + (lang.count || 0), 0) : 0;

  return (
    <div className="dinolabsNoFileSelectedWrapper">
      <div className="dinolabsGetStartedStack">
        <div className="dinolabsGetStartedFlex">
          <div className="dinolabsGetStartedWrapperInfo">
            <label className="dinolabsTitle">
              Dino Labs Web Developer
            </label>
            <label className="dinolabsSubtitle">
              Version 1.0.0 (Beta)
            </label>
            <div className="dinolabsStartButtonWrapper">
              <button className="dinolabsStartButton" onClick={handleLoadRepository}>
                <FontAwesomeIcon icon={faFolderOpen} />
                Import a Directory
              </button>
              <button className="dinolabsStartButton" onClick={handleLoadFile}>
                <FontAwesomeIcon icon={faCode} />
                Import a File
              </button>
            </div>
          </div>
        </div>

        <div className="dinolabsLanguageDisplayFlex">
          {isPlotRendered && isValidLanguages ? (
            <div className="dinolabsGetStartedWrapperLanguages">
              <div className="dinolabsUsageLanguagesContainer">
                {usageLanguages.length === 0 ? (
                  <p className="dinolabsLanguageUsageUnavailable">No usage data available.</p>
                ) : (
                  <ul className="dinolabsUsageLanguageList">
                    {usageLanguages.slice(0, 5).map((language) => {
                      const percentage = total > 0 ? (language.count / total) * 100 : 0;
                      const color = languageColors[language.language] || languageColors.default;
                      return (
                        <li key={language.language} className="dinolabsLanguageItem">
                          <div className="dinolabsLanguageLabel">
                            {language.language}
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                          <div
                            className="dinolabsLanguageBar"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div
              className="dinolabsGetStartedWrapperLanguages"
              style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              <div className="loading-circle" />
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

DinoLabsNoFileSelected.propTypes = {
  handleLoadRepository: PropTypes.func.isRequired,
  handleLoadFile: PropTypes.func.isRequired,
  isPlotRendered: PropTypes.bool.isRequired,
  personalUsageByDay: PropTypes.arrayOf(
    PropTypes.shape({
      day: PropTypes.instanceOf(Date).isRequired,
      count: PropTypes.number.isRequired,
    })
  ),
  usageLanguages: PropTypes.arrayOf(
    PropTypes.shape({
      language: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ),
};

DinoLabsNoFileSelected.defaultProps = {
  personalUsageByDay: [],
  usageLanguages: [],
};

export default DinoLabsNoFileSelected;