import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faPerson, faEye, faEyeSlash, faUserCircle, faPersonCirclePlus, faEnvelopeCircleCheck } from "@fortawesome/free-solid-svg-icons";
import "../../styles/mainStyles/DinoLabsAuthenticationStyles/DinoLabsAuthLogin.css";
import DinoLabsNav from "../../helpers/DinoLabsNav";
import useAuth from "../../UseAuth"; 

const Login = () => {
    const navigate = useNavigate();
    const { setToken } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isEmail, setIsEmail] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [screenSize, setScreenSize] = useState(window.innerWidth);

    const handleLogin = async () => {
        try {
            const response = await fetch("https://www.dinolaboratories.com/dinolabs/dinolabs-web-api/user-authentication", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: email,
                    password,
                }),
            });

            const data = await response.json();
            if (response.status === 200) {
                setToken(data.token);
                if (data.isadmin === true) {
                    navigate("/dinolabs");
                    {/* 
                        Will come back to this later. 
                        For now everyone is routed to the IDE but I plan to build some system admin dashboards. 
                    */}
                } else {
                    navigate("/dinolabs");
                }
            } else if (response.status === 429) {
                setLoginError("Too many login attempts. Please try again in 10 minutes.")
            } else {
                setLoginError(data.message);
            }
        } catch (error) {
            setLoginError("An error occurred. Please try again.");
        }
    };

    return (
        <div className="loginPageWrapper" style={{"background": "linear-gradient(to left, #111111, #090011)", "display": screenSize >= 5300 ? "none" : ""}}>
            <DinoLabsNav activePage="login" />
            <div className="loginCellHeaderContainer" style={{"background": "linear-gradient(to left, #111111, #090011)"}}>
                <div className="loginBlock">
                    <label className="loginTitle">Log in to Dino Labs</label>
                    <label className="loginSubtitle">Use your Dino Labs credentials or create a new account below.</label>

                    <div className="loginInputWrapper">
                        <input
                            className="loginInput"
                            type="text"
                            placeholder={"Email Address or Username"}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    setIsEmail(!isEmail);
                                }
                            }}
                        />
                    </div>

                    {!isEmail && (
                        <button
                            className="loginInputButton"
                            style={{ backgroundColor: "#4E3270", "margin": 0 }}
                            onClick={() => setIsEmail(!isEmail)}
                        >
                            <FontAwesomeIcon icon={faEnvelopeCircleCheck} className="envelopeIcon" />
                            <label className="loginInputText">Continue with Email</label>
                        </button>
                    )}

                    {!isEmail && (
                        <button className="loginInputButton" style={{"backgroundColor": "#232729"}} onClick={() => navigate("/register")}>
                            <FontAwesomeIcon icon={faPersonCirclePlus} className="envelopeIcon" />
                            <label className="loginInputText">Create an Account</label>
                        </button>
                    )}

                    {!isEmail && (
                        <button className="loginSupplementalButton" onClick={() => navigate("/reset")}>Forgot password? <span style={{"color": "#D8C1F5", "font-weight": "800", "opacity": "1"}}>Click here to reset.</span></button>
                    )}

                    
                    {isEmail && (
                        <div className="loginInputWrapper">
                            <input
                                className="loginInput"
                                type={passwordVisible ? "text" : "password"}
                                placeholder={"Password"}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleLogin();
                                    }
                                }}
                            />
                            <FontAwesomeIcon
                                icon={passwordVisible ? faEyeSlash : faEye}
                                onClick={() => setPasswordVisible(!passwordVisible)}
                                className="passwordToggleIcon"
                            />
                        </div>
                    )}

                    {isEmail && (
                        <button
                            className="loginInputButton"
                            style={{ backgroundColor: "#4E3270", "margin": 0 }}
                            onClick={handleLogin}
                        >
                            <label className="loginInputText">Sign In</label>
                        </button>
                    )}

                    <div className="loginError">{loginError}</div>

                    {isEmail && (
                        <button className="loginSupplementalButton" onClick={() => {
                            setIsEmail(!isEmail);
                            setLoginError("");
                        }}>
                            ←   Return to Main
                        </button>
                    )}
                </div>

                <video
                    autoPlay
                    muted
                    loop
                    preload="auto"
                    id="animatedBackgroundEarth"
                    style={{
                        position: "absolute",
                        width: "100vw",
                        height: "100%",
                        top: "0",
                        right: "0",
                        objectFit: "cover",
                        zIndex: "1",
                        pointerEvents: "none",
                    }}
                >
                    <source src="/SolarSystemBackground.mp4" type="video/mp4" />
                </video>
            </div>
        </div>
    );
};

export default Login;