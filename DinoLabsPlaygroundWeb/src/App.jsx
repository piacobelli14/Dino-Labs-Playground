import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./pages/DinoLabsAuthentication/DinoLabsAuthLogin"; 
import Register from "./pages/DinoLabsAuthentication/DinoLabsAuthRegister"; 
import Reset from "./pages/DinoLabsAuthentication/DinoLabsAuthReset";
import Verification from "./pages/DinoLabsAuthentication/DinoLabsAuthVerifyEmail";
import DinoLabsMain from "./pages/DinoLabsMain/DinoLabsMain";
import { useEffect, useState } from "react";

import "./styles/App.css";

function App() {
  const [osClass, setOsClass] = useState("");

  useEffect(() => {
    const detectOS = () => {
      const userAgent = navigator.userAgent;
      if (userAgent.indexOf("Win") !== -1) {
        return "windows";
      } else if (userAgent.indexOf("Mac") !== -1) {
        return "mac";
      }
      return "";
    };

    const os = detectOS();
    setOsClass(os);
  }, []);

  return (
    <Router>
      <div className={`App ${osClass}`}>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="/reset" element={<Reset/>}/>
          <Route path="/verify" element={<Verification/>}/>
          <Route path="/dinolabs" element={<DinoLabsMain/>}/>
          <Route index element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
