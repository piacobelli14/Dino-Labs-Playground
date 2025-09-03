import React from "react";
import PropTypes from "prop-types";
import "../styles/helperStyles/Unavailable.css";

const DinoLabsUnavailable = ({ screenSize }) => {
  const safeScreenSize = typeof screenSize === "number" ? screenSize : 0;

  return (
    <div className="unavailable-container">
      <div className="unavailable-wrapper">
        <img
          className="unavailable-image"
          src="./DinoLabsLogo-White.png"
          alt=""
          onError={(e) => {
            e.target.src = "/fallback-logo.png"; 
          }}
        />
        <label className="unavailable-label">
          The Dino Labs IDE is currently unavailable at this screen size.
        </label>
        <label className="unavailable-sub-label">
          Please sign in on a {safeScreenSize < 700 ? "larger" : "smaller"} screen to continue.
        </label>
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