import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faXmark,
  faRightToBracket,
  faIdCard,
  faRightFromBracket,
  faCode,
  faSquarePlus,
  faComputer,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/helperStyles/NavBar.css";
import useAuth from "../UseAuth.jsx";
import useIsTouchDevice from "../TouchDevice.jsx";

const DinoLabsNav = ({ activePage }) => {
  const navigate = useNavigate();
  const isTouchDevice = useIsTouchDevice();
  const { token, isAdmin, loading } = useAuth();
  const [isHamburger, setIsHamburger] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  useEffect(() => {
    const checkTokenExpiration = () => {
      if (token) {
        const decodedToken = decodeToken(token);
        if (decodedToken.exp * 1000 < Date.now()) {
          setIsTokenExpired(true);
        } else {
          setIsTokenExpired(false);
        }
      }
    };

    checkTokenExpiration();
  }, [token]);

  useEffect(() => {
    if (isHamburger) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isHamburger]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userid");
    localStorage.removeItem("orgid");
    navigate("/login");
  };

  const decodeToken = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return {};
    }
  };

  return (
    <>
      <div className="homeHeaderContainer" style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}>
        <div className="homeTopNavBarContainer">
          <div className="homeSkipToContent">
            <img
              className="homeLogo"
              src="./DinoLabsLogo-White.png"
              alt="Logo"
            />
            <label className="homeHeader" style={{ color: "#f1f5f9" }}>
              Dino Labs
            </label>
          </div>

          <div className="homeNavSupplement"></div>

          {!isTouchDevice && (
            <button
              className="homeHamburgerCircle"
              onClick={() => setIsHamburger(!isHamburger)}
            >
              <FontAwesomeIcon
                icon={isHamburger ? faXmark : faBars}
                className="homeHamburgerIcon"
                style={{ color: "#f1f5f9" }}
              />
            </button>
          )}
        </div>
      </div>

      {isHamburger && !isTouchDevice && (
        !isAdmin ? (
          <div className="homeHamburgerPopout">
            <div className="homeHamburgerContent">
              {token && !isTokenExpired && (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/dinolabs")}
                  style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faCode} className="navigationButtonIcon" />
                    Playground
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}

              {token && !isTokenExpired && (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/monitoring")}
                  style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faComputer} className="navigationButtonIcon" />
                    Monitoring
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}

              {token && !isTokenExpired && (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/plugins")}
                  style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faSquarePlus} className="navigationButtonIcon" />
                    Add Ons
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}

              {!token && (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/register")}
                  style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faIdCard} className="navigationButtonIcon" />
                    Sign Up
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}

              {!token ? (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/login")}
                  style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon
                      icon={faRightToBracket}
                      className="navigationButtonIcon"
                    />
                    Login
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              ) : (
                <button className="navigationButtonWrapper" onClick={handleLogout} style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}>
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon
                      icon={faRightFromBracket}
                      className="navigationButtonIcon"
                    />
                    Sign Out
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="homeHamburgerPopout">
            <div className="homeHamburgerContent">
              {isAdmin && token && !isTokenExpired && (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/dinolabs")}
                  style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faCode} className="navigationButtonIcon" />
                    Playground
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}
              {isAdmin && token && !isTokenExpired && (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/monitoring")}
                  style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faComputer} className="navigationButtonIcon" />
                    Monitoring
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}
              <button className="navigationButtonWrapper" onClick={handleLogout} style={{ "background": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}>
                <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                  <FontAwesomeIcon
                    icon={faRightFromBracket}
                    className="navigationButtonIcon"
                  />
                  Sign Out
                </div>
                <div
                  className="navigationButtonDivider"
                  style={{ backgroundColor: "#94a3b8" }}
                />
              </button>
            </div>
          </div>
        )
      )}
    </>
  );
};

export default DinoLabsNav;