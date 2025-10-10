import { useEffect, useState } from "react"; 
import { useNavigate } from "react-router-dom"; 
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faPerson, faEyeSlash, faEye, faListUl, faMailBulk } from "@fortawesome/free-solid-svg-icons";
import "../../styles/mainStyles/Authentication/AuthRegister.css"
import DinoLabsNav from "../../helpers/Nav";
import useIsTouchDevice from "../../TouchDevice.jsx";
import { color } from "echarts";

const Register = () => {
    const navigate = useNavigate(); 
    const isTouchDevice = useIsTouchDevice();
    const [isPersonal, setIsPersonal] = useState(true); 
    const [isSlug, setIsSlug] = useState(false); 
    const [isPassword, setIsPassword] = useState(false); 
    const [isSuccess, setIsSuccess] = useState(false);
    const [firstName, setFirstName] = useState(""); 
    const [lastName, setLastName] = useState(""); 
    const [email, setEmail] = useState(""); 
    const [username, setUsername] = useState(""); 
    const [phone, setPhone] = useState("");
    const [profileImage, setProfileImage] = useState(null); 
    const [newPassword, setNewPassword] = useState(""); 
    const [confirmPassword, setConfirmPassword] = useState(""); 
    const [newPasswordVisible, setNewPasswordVisible] = useState(false); 
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false); 
    const [registerError, setRegisterError] = useState(""); 
    const [resendLoading, setResendLoading] = useState(false); 
    const [resendStatus, setResendStatus] = useState(false); 
    const [resendMessage, setResendMessage] = useState("");
    const [slug, setSlug] = useState("");

    useEffect(() => {
        if (resendStatus) {
            const timer = setTimeout(() => {
                setResendStatus(false);
                setResendMessage("");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [resendStatus]);

    const formatPhoneNumber = (value) => {
        const numericPhoneValue = value.replace(/\D/g, "");
        const formattedPhoneNumber = numericPhoneValue.replace(
          /^(\d{3})(\d{3})(\d{4})$/,
          "($1) $2-$3"
        );
        return formattedPhoneNumber;
    };

    const generateRandomSlug = () => {
        const adjectives = ["quick", "cool", "dark", "silent", "brave", "swift", "lucky", "wise"];
        const nouns = ["wolf", "fox", "hawk", "lion", "owl", "panther", "eagle", "dragon"];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const hash = Math.random().toString(36).substr(2, 4);
        return `${adj}-${noun}-${hash}`.toLowerCase();
    };
    
    const generateSlug = async () => {
        for (let attempts = 0; attempts < 5; attempts++) {
            const candidate = generateRandomSlug();
            try {
                const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/validate-slug`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        slug: candidate,
                        software: "dinolabsplayground"
                    }),
                });
                if (response.status === 200) {
                    setSlug(candidate);
                    setRegisterError("");
                    return;
                }
            } catch {}
        }
        setRegisterError("Failed to generate a unique slug. Try again.");
    };
    
    const handleSlugStep = async () => {
        if (!slug) {
            setRegisterError("Please choose a slug for your organization or personal account.");
            return;
        }
        if (!/^[a-z0-9\-]{3,32}$/.test(slug)) {
            setRegisterError("Slug must be 3-32 characters, only lowercase letters, numbers, and dashes.");
            return;
        }
        
        try {
            const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/validate-slug`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    slug,
                    software: "dinolabsplayground" 
                }),
            });
            if (response.status === 200) {
                setRegisterError("");
                setIsSlug(false);
                setIsPassword(true);
            } else if (response.status === 409) {
                setRegisterError("That slug is already taken. Please choose another.");
            } else {
                setRegisterError("Error validating slug. Please try again.");
            }
        } catch (error) {
            setRegisterError("Network error while validating slug.");
        }
    };
    
    const handleRegister = async () => {
        if (firstName !== "" && lastName !== "" && email !== "" && username !== "" && phone !== "") {
            if (!/\S+@\S+\.\S+/.test(email)) {
                setRegisterError("Please enter a valid email address.");
                return;
            }
            if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(phone)) {
                setRegisterError("Please enter a valid phone number in the format (XXX) XXX-XXXX.");
                return;
            }
            if (!profileImage) {
                setRegisterError("Profile image is required.");
                return;
            }
    
            const reader = new FileReader();
            reader.readAsDataURL(profileImage);
            reader.onload = async () => {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/validate-new-user-info`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            email, 
                            username, 
                            slug, 
                            image: reader.result,
                            software: "dinolabsplayground" 
                        }),
                    });
                    if (response.status === 200) {
                        setRegisterError("");
                        setIsPersonal(false);
                        setIsSlug(true);      
                    } else {
                        let errorMsg = "An error occurred.";
                        try {
                            const errorData = await response.json();
                            if (errorData && errorData.message) errorMsg = errorData.message;
                        } catch {}
                        setRegisterError(errorMsg);
                    }
                } catch (error) {
                    setRegisterError("Network error.");
                }
            };
            reader.onerror = () => {
                setRegisterError("Error reading the image file. Please try again.");
            };
        } else {
            setRegisterError("Please fill in all fields.");
        }
    };
    
    
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) {
            setProfileImage(null);
            setRegisterError("Profile image is required.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            setProfileImage(null);
            setRegisterError("Unsupported image type. Please upload a PNG, JPEG, GIF, or WebP file.");
            return;
        }
        setRegisterError(""); 
        setProfileImage(file);
    };    
    
    const handlePassword = async () => {
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumber = /\d/.test(newPassword);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-]/.test(newPassword);
        const isLengthValid = newPassword.length >= 8;
    
        if (!isLengthValid) {
            setRegisterError("Password must be at least 8 characters long.");
            return;
        } 
        if (!hasUpperCase) {
            setRegisterError("Password must contain at least 1 uppercase letter.");
            return;
        } 
        if (!hasLowerCase) {
            setRegisterError("Password must contain at least 1 lowercase letter.");
            return;
        } 
        if (!hasNumber) {
            setRegisterError("Password must contain at least 1 number.");
            return;
        } 
        if (!hasSpecialChar) {
            setRegisterError("Password must contain at least 1 special character.");
            return;
        } 
        if (newPassword !== confirmPassword) {
            setRegisterError("Passwords do not match.");
            return;
        } 
    
        const reader = new FileReader();
        reader.readAsDataURL(profileImage);
        reader.onload = async () => {
            const userData = {
                firstName,
                lastName,
                username,
                email,
                password: newPassword,
                phone,
                image: reader.result,
                slug, 
                software: "dinolabsplayground"
            };
            
            try {
                const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/create-user`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(userData),
                });
    
                if (response.status === 200) {
                    setIsSuccess(true);
                } else {
                    const errorData = await response.json();
                    setRegisterError(errorData.message || "Registration failed; please try again later."); 
                }
            } catch (error) {
                setRegisterError("An error occurred while registering. Please try again later.");
            }
        };
        reader.onerror = () => {
            setRegisterError("Error reading the image file. Please try again.");
        };
    };

    const handleResend = async () => {
        setResendLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/resend-verification-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email,
                    software: "dinolabsplayground"
                }),
            });
            if (response.status === 200) {
                setResendMessage("Verification email resent. Please check your inbox.");
                setResendStatus(true);
            } else {
                setResendMessage("Failed to resend verification email. Please try again later.");
                setResendStatus(true); 
            }
        } catch (error) {
            setResendMessage("An error occurred. Please try again later.");
            setResendStatus(true); 
        } finally {
            setResendLoading(false);
        }
    };
    
    return (
        <div className="registerPageWrapper"
            style={{ background: "linear-gradient(135deg, #15171C 0%, #322842 50%, #15171C 100%)" }}
        >
            <DinoLabsNav activePage="sat"/>
            <div className="registerCellHeaderContainer">
                {!isTouchDevice && (
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        id="animatedBackgroundEarth"
                        className="loginVideoBackground"
                    >
                        <source src="/SolarSystemBackground.mp4" type="video/mp4" />
                    </video>
                )}

                <div className="registerHeroBackgroundWrapper">
                    <div className="registerHeroBackground">
                        <div className="registerBackgroundBlur registerBackgroundBlur1"></div>
                        <div className="registerBackgroundBlur registerBackgroundBlur2"></div>
                        <div className="registerBackgroundBlur registerBackgroundBlur3"></div>
                    </div>

                    <div className="registerGridPattern"/>
                
                    {isSuccess ? (
                        <div className={!isTouchDevice ? "registerBlock" : "registerBlockTouch"}>
                             <img className={!isTouchDevice ? "loginLogo" : "loginLogoTouch"}
                                src="./DinoLabsLogo-White.png" 
                                alt="" 
                            />
                            <div className="unverifiedEmailCell" style={{ position: "relative" }}>
                                <FontAwesomeIcon
                                    icon={faMailBulk}
                                    size="3x"
                                    className="unverifiedEmailIcon"
                                />
                                <div className="unverifiedEmailText">
                                    Please verify your email address. 
                                    Once verified, <span className="loginLink" style={{ "color": "#4C3B7E" }} onClick={() => navigate("/login")}>click here to login.</span>
                                </div>
                                <div className="unverifiedEmailButtons">
                                    {!resendStatus ? (
                                        <button
                                            className="unverifiedEmailRefresh"
                                            style={{ background: "rgba(255, 255, 255, 0.2)" }}
                                            onClick={handleResend}
                                        >
                                            <label className="loginInputText">Resend Verification Email</label>
                                        </button>
                                    ) : (
                                        <div className="unverifiedEmailText" style={{"opacity": 0.8}}>
                                            {resendMessage}
                                        </div> 
                                    )}
                                </div>
                                {resendLoading && (
                                <div className="loading-wrapper" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", "height": "100%", backgroundColor: "rgba(0,0,0,0.6)"  }}>
                                    <div className="loading-circle" />
                                </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {isPersonal && (
                               <div className={!isTouchDevice ? "registerBlock" : "registerBlockTouch"} style={{"padding-top": "60px"}}>
                                    <div className="registerInputFlex">
                                        <div className="registerNameFlex" style={{"width": "100%", "height": "100%", "display": "flex", "justify-content": "space-between"}}> 
                                            <input className="registerNameInput"  placeholder={"First Name"} onChange={(e) => setFirstName(e.target.value)}/>
                                            <input className="registerNameInput"  placeholder={"Last Name"} onChange={(e) => setLastName(e.target.value)}/>
                                        </div>
                                    </div>

                                    <div className="registerInputFlex">
                                        <input className="registerInput" placeholder={"Email"} onChange={(e) => setEmail(e.target.value)}/>
                                    </div>

                                    <div className="registerInputFlex">
                                        <input className="registerInput" placeholder={"Phone"} value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}/>
                                    </div>
                                    <div className="registerInputFlex">
                                        <input className="registerInput" placeholder={"Username"} onChange={(e) => setUsername(e.target.value)}/>
                                    </div>

                                    <div className="profilePictureUpload" style={{"backgroundColor": profileImage ? "#4C3B7E" : "rgba(255, 255, 255, 0.6)", "color": profileImage ? "white" : "#222222"}}>
                                        <label className="profileImageText" htmlFor="imageUpload">{profileImage ? "Change Selected Photo" : "Choose a Photo"}</label>
                                        <input
                                            className="profilePicture"
                                            type="file"
                                            id="imageUpload"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            style={{"backgroundColor": profileImage ? "#2D3436" : "rgba(255, 255, 255, 0.9))"}}
                                        />
                                    </div>
                                    
                                    <button className="loginInputButton" onClick={handleRegister} style={{ background: "linear-gradient(135deg, #4C3B7E, #906EAF)", "margin": 0 }}>    
                                        <label className="loginInputText">Continue</label>
                                    </button>

                                    <div className="loginError">{registerError}</div>
                                </div>
                            )}

                            {isSlug && (
                                <div className="registerBlock">
                                    <img className={!isTouchDevice ? "loginLogo" : "loginLogoTouch"}
                                        src="./DinoLabsLogo-White.png" 
                                        alt="" 
                                    />
                                    <div className="registerInputFlex">
                                        <input
                                            className="registerInput"
                                            placeholder={"Personal Slug"}
                                            value={slug}
                                            onChange={e => setSlug(e.target.value.replace(/[^a-zA-Z0-9\-]/g, "").toLowerCase())}
                                            maxLength={32}
                                        />
                                        <small>
                                            This slug will be part of your default project URLs. Only lowercase letters, numbers, and dashes.
                                        </small>
                                    </div>
                                    <button
                                        className="loginInputButton"
                                        style={{ background: "rgba(255, 255, 255, 0.2)" }}
                                        type="button"
                                        onClick={generateSlug}
                                    >
                                        <label className="loginInputText">Generate One For Me</label>
                                    </button>
                                    <button className="loginInputButton" style={{ background: "linear-gradient(135deg, #4C3B7E, #906EAF)" }} onClick={handleSlugStep}>
                                        <label className="loginInputText">Continue</label>
                                    </button>

                                
                                    <div className="loginError">{registerError}</div>
                                </div>

                                
                            )}

                            {isPassword && (
                                <div className="registerBlock">
                                    <img className={!isTouchDevice ? "loginLogo" : "loginLogoTouch"}
                                        src="./DinoLabsLogo-White.png" 
                                        alt="" 
                                    />

                                    <div className="passwordInputFlex"> 
                                        <input className="registerInput" type={newPasswordVisible ? "text" : "password"} placeholder={"New Password"} onChange={(e) => setNewPassword(e.target.value)}/>
                                        <FontAwesomeIcon
                                            icon={newPasswordVisible ? faEyeSlash : faEye}
                                            onClick={() => setNewPasswordVisible(!newPasswordVisible)}
                                            className="registerToggleIcon"
                                        />
                                    </div>
                                    
                                    <div className="passwordInputFlex"> 
                                        <input className="registerInput" type={confirmPasswordVisible ? "text" : "password"} placeholder={"Confirm Password"} onChange={(e) => setConfirmPassword(e.target.value)}/>
                                        <FontAwesomeIcon
                                            icon={confirmPasswordVisible ? faEyeSlash : faEye}
                                            onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                                            className="registerToggleIcon"
                                        />
                                    </div>
                                
                                    <button className="loginInputButton" onClick={handlePassword} style={{ background: "linear-gradient(135deg, #4C3B7E, #906EAF)", "margin": 0 }}>
                                        <label className="loginInputText">Create Account</label>
                                    </button>

                                    <div className="loginError">{registerError}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;