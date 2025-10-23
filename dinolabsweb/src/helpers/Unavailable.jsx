import React from "react";
import PropTypes from "prop-types";
import "../styles/helperStyles/Unavailable.css";

const DinoLabsUnavailable = ({ screenSize }) => {
  const safeScreenSize = typeof screenSize === "number" ? screenSize : 0;

  return (
    <div className="dinolabsUnavailableContainer">
      <div className="dinolabsUnavailableWrapper">
        <div className="dinolabsUnavailableContent">
          <img
            className="dinolabsUnavailableImage"
            src="./DinoLabsLogo-White.png"
            alt="Dino Labs Logo"
            onError={(e) => {
              e.target.src = "/fallback-logo.png"; 
            }}
          />
          <div className="dinolabsUnavailableTextStack">
            <h1 className="dinolabsUnavailableTitle">
              Dino Labs IDE Unavailable
            </h1>
            <p className="dinolabsUnavailableMessage">
              The IDE is currently unavailable at this screen size.
            </p>
            <p className="dinolabsUnavailableSubMessage">
              Please sign in on a {safeScreenSize < 700 ? "larger" : "smaller"} screen to continue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

DinoLabsUnavailable.propTypes = {
  screenSize: PropTypes.number,
};

DinoLabsUnavailable.defaultProps = {
  screenSize: 0,
};

export default DinoLabsUnavailable;