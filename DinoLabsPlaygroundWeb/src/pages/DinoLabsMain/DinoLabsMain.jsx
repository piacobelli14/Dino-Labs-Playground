import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faPerson, faEye, faEyeSlash, faUserCircle, faPersonCirclePlus, faEnvelopeCircleCheck } from "@fortawesome/free-solid-svg-icons";
import "../../styles/mainStyles/DinoLabsAuthenticationStyles/DinoLabsAuthLogin.css";
import DinoLabsNav from "../../helpers/DinoLabsNav";
import useAuth from "../../UseAuth"; 

const DinoLabsMain = () => {
    const navigate = useNavigate();
    const { setToken } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isEmail, setIsEmail] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [screenSize, setScreenSize] = useState(window.innerWidth);

    return (
        <div className="loginPageWrapper" style={{"background": "linear-gradient(to left, #111111, #090011)", "display": screenSize >= 5300 ? "none" : ""}}>
            <DinoLabsNav activePage="main" />
        
        </div>
    );
};

export default DinoLabsMain;