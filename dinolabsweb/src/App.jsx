import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./styles/App.css";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./pages/Authentication/AuthLogin"; 
import Register from "./pages/Authentication/AuthRegister"; 
import Reset from "./pages/Authentication/AuthReset";
import Verification from "./pages/Authentication/AuthVerifyEmail";
import DinoLabs from "./pages/DinoLabs"; 
import DinoLabsMonitor from "./pages/DinoLabsAccount/DinoLabsMonitoring";
import DinoLabsPlugins from "./pages/DinoLabsPlugins/DinoLabsPlugins";
import DinoLabsPluginsDictionary from "./pages/DinoLabsPlugins/DinoLabsPluginsDictionary/DinoLabsPluginsDictionary";
import DinoLabsPluginsThesaurus from "./pages/DinoLabsPlugins/DinoLabsPluginsThesaurus/DinoLabsPluginsThesaurus";
import DinoLabsPluginsCalculator from "./pages/DinoLabsPlugins/DinoLabsPluginsCalculator/DinoLabsPluginsCalculator";
import DinoLabsPluginsMatrix from "./pages/DinoLabsPlugins/DinoLabsPluginsMatrix/DinoLabsPluginsMatrix";
import DinoLabsPluginsColorTypeLab from "./pages/DinoLabsPlugins/DinoLabsPluginsColorTypeLab/DinoLabsPluginsColorTypeLab";
import DinoLabsPluginsPlot from "./pages/DinoLabsPlugins/DinoLabsPluginsPlot/DinoLabsPluginsPlot";

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

          <Route path="/dinolabs" element={
            <ProtectedRoute>
              <DinoLabs />
            </ProtectedRoute>
          } />
          <Route path="/monitoring" element={
            <ProtectedRoute>
              <DinoLabsMonitor />
            </ProtectedRoute>
          } />
          <Route path="/plugins" element={
            <ProtectedRoute>
              <DinoLabsPlugins />
            </ProtectedRoute>
          } />
          <Route path="/dictionary" element={
            <ProtectedRoute>
              <DinoLabsPluginsDictionary />
            </ProtectedRoute>
          } />
          <Route path="/thesaurus" element={
            <ProtectedRoute>
              <DinoLabsPluginsThesaurus />
            </ProtectedRoute>
          } />
          <Route path="/calculator" element={
            <ProtectedRoute>
              <DinoLabsPluginsCalculator />
            </ProtectedRoute>
          } />
          <Route path="/matrix" element={
            <ProtectedRoute>
              <DinoLabsPluginsMatrix />
            </ProtectedRoute>
          } />
          <Route path="/colortypelab" element={
            <ProtectedRoute>
              <DinoLabsPluginsColorTypeLab />
            </ProtectedRoute>
          } />
          <Route path="/plot" element={
            <ProtectedRoute>
              <DinoLabsPluginsPlot />
            </ProtectedRoute>
          } />

          <Route index element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
