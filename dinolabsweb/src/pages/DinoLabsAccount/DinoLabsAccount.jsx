import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

import "../../styles/mainStyles/DinoLabsAccount/DinoLabsAccount.css";
import "../../styles/helperStyles/Switch.css";
import "../../styles/helperStyles/Checkbox.css";
import "../../styles/helperStyles/Slider.css";
import "../../styles/mainStyles/DinoLabsPlots.css";
import "../../styles/helperStyles/LoadingSpinner.css";

import { showDialog } from "../../helpers/Alert.jsx";
import useIsTouchDevice from "../../TouchDevice.jsx";
import LinePlot from "../../helpers/PlottingHelpers/LineHelper.jsx";
import useAuth from "../../UseAuth.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faA,
    faArrowDown,
    faArrowUp,
    faCopy,
    faExclamationTriangle,
    faList,
    faMagnifyingGlass,
    faMagnifyingGlassPlus,
    faSquare,
    faTableColumns,
    faXmark,
    faCode,
    faIdCard,
    faEnvelope,
    faMobileScreen,
    faPersonDigging,
    faBuilding,
    faScroll,
    faCity,
    faUserTie,
    faUpRightFromSquare,
    faUserGear,
    faAddressCard,
    faUsers,
    faLock,
    faUsersGear,
    faKeyboard,
    faPallet,
    faPalette,
    faSquareXmark,
    faRectangleXmark,
    faFloppyDisk,
    faRotateLeft,
    faImage
} from "@fortawesome/free-solid-svg-icons";

const DinoLabsAccount = ({
    keyBinds,
    setKeyBinds,
    zoomLevel,
    setZoomLevel,
    colorTheme,
    setColorTheme
}) => {
    const navigate = useNavigate();
    const isTouchDevice = useIsTouchDevice();
    const { token, userID, organizationID, loading } = useAuth();

    const [uiState, setUiState] = useState({
        isLoaded: false,
        screenSize: window.innerWidth,
        resizeTrigger: false,
        selectedState: "none",
        isEditingKeyBinds: null
    });

    const [userInfo, setUserInfo] = useState({
        isAdmin: "",
        email: "",
        firstName: "",
        lastName: "",
        image: "",
        phone: "",
        role: "",
        twoFAEnabled: false,
        multiFAEnabled: false,
        loginNotis: false,
        exportNotis: false,
        dataSharing: false
    });

    const [organizationInfo, setOrganizationInfo] = useState({
        organizationName: "",
        organizationEmail: "",
        organizationPhone: "",
        organizationImage: ""
    });

    const [displayPreferences, setDisplayPreferences] = useState({
        displayEmail: false,
        displayPhone: false,
        displayTeamID: false,
        displayTeamEmail: false,
        displayTeamPhone: false,
        displayTeamAdminStatus: false,
        displayTeamRole: false
    });

    const [personalUsageByDay, setPersonalUsageByDay] = useState([]);

    const defaultKeyBinds = {
        save: "s",
        undo: "z",
        redo: "y",
        cut: "x",
        copy: "c",
        paste: "v",
        search: "f",
        selectAll: "a",
    };

    const keyBindDisplayNames = {
        save: "Save File",
        undo: "Undo Last Action",
        redo: "Redo Last Action",
        cut: "Cut",
        copy: "Copy",
        paste: "Paste",
        search: "Search",
        selectAll: "Select All",
    };

    const themeOptions = [
        { name: "Default Theme", value: "default", colors: ["#C586C0", "#CE9178", "#B5CEA8"] },
        { name: "Dark Theme", value: "dark", colors: ["#a76fa0", "#a35955", "#8b9a75"] },
        { name: "Light Theme", value: "light", colors: ["#7B68EE", "#FFA07A", "#98FB98"] }
    ];

    const navigationButtons = [
        { key: "profileEditor", icon: faAddressCard, label: "Edit My Profile" },
        { key: "personalInfo", icon: faUserGear, label: "Update My Personal Information" },
        { key: "teamInfo", icon: faUsersGear, label: "Update My Team Information" },
        { key: "settingsManagement", icon: faCode, label: "Edit My Dino Labs IDE Settings" },
        { key: "shortcutManagement", icon: faKeyboard, label: "Configure My Keyboard Shortcuts" },
        { key: "themeManagement", icon: faPalette, label: "Change My Editor Theme" }
    ];

    const [editProfile, setEditProfile] = useState({
        isEditing: false,
        firstName: "",
        lastName: "",
        phone: "",
        role: "",
        imageUrl: "",
        imageFile: null,
        imagePreview: "",
        saving: false
    });

    const [teamAccess, setTeamAccess] = useState({
        joinCode: "",
        joining: false,
        creating: false,
        teamName: "",
        teamSlug: ""
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                await Promise.all([
                    fetchUserInfo(userID, organizationID),
                    fetchPersonalUsageData(userID, organizationID)
                ]);
                setUiState(prev => ({ ...prev, isLoaded: true }));
            } catch (error) {
                return;
            }
        };

        if (!loading && token) {
            fetchData();
        }
    }, [userID, loading, token]);

    useEffect(() => {
        const handleResize = () => {
            setUiState(prev => ({
                ...prev,
                isLoaded: false,
                screenSize: window.innerWidth,
                resizeTrigger: !prev.resizeTrigger
            }));

            setTimeout(() => setUiState(prev => ({ ...prev, isLoaded: true })), 300);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!organizationID || organizationID === userID) {
            setUiState(prev => ({ ...prev, selectedState: "permissions" }));
        } else {
            setUiState(prev => ({ ...prev, selectedState: "none" }));
        }
    }, [organizationID, userID]);

    useEffect(() => {
        setEditProfile(prev => ({
            ...prev,
            firstName: userInfo.firstName || "",
            lastName: userInfo.lastName || "",
            phone: userInfo.phone || "",
            role: userInfo.role || "",
            imageUrl: userInfo.image || "",
            imagePreview: userInfo.image || ""
        }));
    }, [userInfo.firstName, userInfo.lastName, userInfo.phone, userInfo.role, userInfo.image]);

    const fetchUserInfo = async (userID, organizationID) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/user-info`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ userID, organizationID }),
            });

            if (response.status !== 200) {
                throw new Error(`Internal Server Error`);
            }

            const data = await response.json();
            const userData = data[0];

            setUserInfo({
                isAdmin: userData.isadmin,
                email: userData.email,
                firstName: userData.firstname,
                lastName: userData.lastname,
                image: userData.image,
                phone: userData.phone,
                role: userData.role,
                twoFAEnabled: userData.twofa,
                multiFAEnabled: userData.multifa,
                loginNotis: userData.loginnotis,
                exportNotis: userData.exportnotis,
                dataSharing: userData.datashare
            });

            setOrganizationInfo({
                organizationName: userData.organizationname,
                organizationEmail: userData.organizationemail,
                organizationPhone: userData.organizationphone,
                organizationImage: userData.organizationimage
            });

            setDisplayPreferences({
                displayEmail: userData.showpersonalemail,
                displayPhone: userData.showpersonalphone,
                displayTeamID: userData.showteamid,
                displayTeamEmail: userData.showteamemail,
                displayTeamPhone: userData.showteamphone,
                displayTeamAdminStatus: userData.showteamadminstatus,
                displayTeamRole: userData.showteamrole
            });

            if (userData.userkeybinds) {
                setKeyBinds({ ...defaultKeyBinds, ...userData.userkeybinds });
            } else {
                setKeyBinds(defaultKeyBinds);
            }

            setZoomLevel(userData.userzoomlevel);
            setColorTheme(userData.usercolortheme);
        } catch (error) {
            return;
        }
    };

    const fetchPersonalUsageData = async (userID, organizationID) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("Token not found in localStorage");
            }

            const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/usage-info`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ userID, organizationID }),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.personalUsageInfo || !Array.isArray(data.personalUsageInfo)) {
                throw new Error("Unexpected data structure from the backend");
            }

            setPersonalUsageByDay(
                data.personalUsageInfo.map((item) => ({
                    day: new Date(item.day),
                    count: parseInt(item.usage_count, 0),
                }))
            );
        } catch (error) {
            return;
        }
    };

    const updateShowColumnValue = async (userID, organizationID, showColumn, showColumnValue) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("Token not found in localStorage");
            }

            const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/update-user-show-values`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ userID, organizationID, showColumn, showColumnValue }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update show values: ${response.statusText}`);
            }
        } catch (error) {
            return;
        }
    };

    const getKeyBindDisplayName = (action) => {
        return keyBindDisplayNames[action] || action;
    };

    const handleKeyBindChange = async (action, newKey) => {
        if (newKey.length !== 1) {
            return;
        }

        const lowerNewKey = newKey.toLowerCase();

        for (const [actionName, key] of Object.entries(keyBinds)) {
            if (key === lowerNewKey && actionName !== action) {
                await showDialog({
                    title: "System Alert",
                    message: `Key "${newKey}" is already assigned to "${actionName}". Please choose a different key.`,
                    showCancel: false
                });
                return;
            }
        }

        const updatedKeyBinds = { ...keyBinds, [action]: lowerNewKey };
        setKeyBinds(updatedKeyBinds);
        saveUserKeyBinds(userID, organizationID, updatedKeyBinds);
    };

    const saveUserKeyBinds = async (userID, organizationID, updatedKeyBinds) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/update-user-keybinds`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ userID, organizationID, keyBinds: updatedKeyBinds }),
            });

            if (!response.ok) {
                throw new Error(`Failed to save key binds: ${response.statusText}`);
            }
        } catch (error) {
            await showDialog({
                title: "System Alert",
                message: "Failed to save key bindings. Please try again.",
                showCancel: false
            });
        }
    };

    const saveUserPreferences = async (userID, organizationID, zoomLevel, colorTheme) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/update-user-preferences`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ userID, organizationID, zoomLevel, colorTheme }),
            });

            if (!response.ok) {
                throw new Error("Failed to save preferences");
            }
        } catch (error) {
            await showDialog({
                title: "System Alert",
                message: "Failed to save preferences. Please try again.",
                showCancel: false
            });
        }
    };

    const handleStateChange = (state) => {
        const newState = uiState.selectedState === state ? "none" : state;
        setUiState(prev => ({ ...prev, selectedState: newState }));
    };

    const updateDisplayPreference = (key, value) => {
        setDisplayPreferences(prev => ({ ...prev, [key]: value }));
        updateShowColumnValue(userID, organizationID, key, value);
    };

    const handleProfileField = (field, value) => {
        setEditProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleImageFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setEditProfile(prev => ({
                ...prev,
                imageFile: file,
                imagePreview: e.target.result
            }));
        };
        reader.readAsDataURL(file);
    };

    const uploadProfileImage = async (file) => {
        const token = localStorage.getItem("token");
        const form = new FormData();
        form.append("file", file);
        form.append("userID", userID);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/upload-user-image`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: form
            });
            if (!res.ok) throw new Error("Image upload failed");
            const data = await res.json();
            return data.url;
        } catch (err) {
            await showDialog({
                title: "System Alert",
                message: "Failed to upload image. Please try again.",
                showCancel: false
            });
            throw err;
        }
    };

    const updateUserProfile = async () => {
        const token = localStorage.getItem("token");
        const {
            firstName, lastName, phone, role, imageFile, imageUrl
        } = editProfile;

        if (!firstName.trim() || !lastName.trim()) {
            await showDialog({
                title: "System Alert",
                message: "First and last name are required.",
                showCancel: false
            });
            return;
        }

        try {
            setEditProfile(prev => ({ ...prev, saving: true }));

            let finalImageUrl = imageUrl;
            if (imageFile) {
                finalImageUrl = await uploadProfileImage(imageFile);
            }

            const res = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/update-user-profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userID,
                    organizationID,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phone.trim(),
                    role: role.trim(),
                    image: finalImageUrl
                })
            });

            if (!res.ok) {
                throw new Error("Failed to update profile");
            }

            setUserInfo(prev => ({
                ...prev,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim(),
                role: role.trim(),
                image: finalImageUrl
            }));

            setEditProfile(prev => ({
                ...prev,
                isEditing: false,
                imageFile: null,
                imageUrl: finalImageUrl,
                saving: false
            }));

            await showDialog({
                title: "Profile Updated",
                message: "Your account information has been saved.",
                showCancel: false
            });
        } catch (err) {
            setEditProfile(prev => ({ ...prev, saving: false }));
            await showDialog({
                title: "System Alert",
                message: "Failed to update profile. Please try again.",
                showCancel: false
            });
        }
    };

    const resetProfileEdits = () => {
        setEditProfile(prev => ({
            ...prev,
            isEditing: false,
            firstName: userInfo.firstName || "",
            lastName: userInfo.lastName || "",
            phone: userInfo.phone || "",
            role: userInfo.role || "",
            imageUrl: userInfo.image || "",
            imageFile: null,
            imagePreview: userInfo.image || ""
        }));
    };

    const setTeamField = (k, v) => setTeamAccess(prev => ({ ...prev, [k]: v }));

    const joinTeam = async () => {
        if (!teamAccess.joinCode.trim()) {
            await showDialog({ title: "Join Team", message: "Enter a team code.", showCancel: false });
            return;
        }
        try {
            setTeamField("joining", true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/join-team`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userID,
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    teamCode: teamAccess.joinCode.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Failed to request access");
            await showDialog({ title: "Join Team", message: data.message || "Access request sent.", showCancel: false });
            setTeamField("joinCode", "");
        } catch (e) {
            await showDialog({ title: "Join Team", message: e.message || "Failed to request access.", showCancel: false });
        } finally {
            setTeamField("joining", false);
        }
    };

    const createTeam = async () => {
        const name = teamAccess.teamName.trim();
        const slug = teamAccess.teamSlug.trim();
        if (!name || !slug) {
            await showDialog({ title: "Create Team", message: "Team name and slug are required.", showCancel: false });
            return;
        }
        try {
            setTeamField("creating", true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/create-team`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ userID, teamName: name, teamSlug: slug })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Failed to create team");

            await showDialog({
                title: "Team Created",
                message: `Team created. Your team code is ${data.orgid}. Reloading to update your session.`,
                showCancel: false
            });

            window.location.reload();
        } catch (e) {
            await showDialog({ title: "Create Team", message: e.message || "Failed to create team.", showCancel: false });
        } finally {
            setTeamField("creating", false);
        }
    };

    const renderToggleButton = (label, checked, onChange, tooltipContent) => (
        <button className="dinolabsSettingsButtonLine">
            <span>{label}</span>
            <span>
                <Tippy content={tooltipContent} theme="tooltip-light">
                    <label className="consoleSwitch">
                        <input type="checkbox" checked={checked} onChange={onChange} />
                        <span className="consoleSlider round"></span>
                    </label>
                </Tippy>
                <label className="dinolabsSettingsToggleLabel">
                    {checked ? "Yes" : "No"}
                </label>
            </span>
        </button>
    );

    const renderPersonalInfo = () => (
        <div className="dinolabsPersonalWrapper">
            <img className="dinolabsAccountImage" src={userInfo.image} alt="" />
            <div className="dinolabsAccountNameStack">
                <label className="dinolabsAccountName">{userInfo.firstName} {userInfo.lastName}</label>
                <label className="dinolabsAccountSubName">
                    <FontAwesomeIcon icon={faIdCard} />
                    @{userID}
                </label>
                <label className="dinolabsAccountSubName">
                    <FontAwesomeIcon icon={faEnvelope} />
                    {displayPreferences.displayEmail ? userInfo.email : "•".repeat(userInfo.email.length || 4)}
                </label>
                <label className="dinolabsAccountSubName">
                    <FontAwesomeIcon icon={faMobileScreen} />
                    {displayPreferences.displayPhone ? userInfo.phone : "•".repeat((userInfo.phone || "").length || 4)}
                </label>
                <label className="dinolabsAccountSubName">
                    <FontAwesomeIcon icon={faCity} />
                    <strong>{organizationInfo.organizationName}</strong>
                    <span>(ID: {displayPreferences.displayTeamID ? organizationID : "•".repeat((organizationID || "").length || 4)})</span>
                </label>
            </div>
        </div>
    );

    const renderOrganizationInfo = () => {
        if (organizationID !== "" && organizationID && organizationID !== userID) {
            return (
                <div className="dinolabsPersonalWrapper" style={{ border: "none" }}>
                    <img className="dinolabsAccountImage" src={organizationInfo.organizationImage} alt="User Avatar" />
                    <div className="dinolabsAccountNameStack">
                        <label className="dinolabsAccountSubName">
                            <FontAwesomeIcon icon={faCity} />
                            <strong>{organizationInfo.organizationName.trim()}</strong>
                        </label>
                        <label className="dinolabsAccountSubName">
                            <FontAwesomeIcon icon={faIdCard} />
                            <span>{displayPreferences.displayTeamID ? organizationID : "•".repeat((organizationID || "").length || 4)}</span>
                        </label>
                        <label className="dinolabsAccountSubName">
                            <FontAwesomeIcon icon={faEnvelope} />
                            <span>{displayPreferences.displayTeamEmail ? organizationInfo.organizationEmail : "•".repeat((organizationInfo.organizationEmail || "").length || 4)}</span>
                        </label>
                        <label className="dinolabsAccountSubName">
                            <FontAwesomeIcon icon={faMobileScreen} />
                            <span>{displayPreferences.displayTeamPhone ? organizationInfo.organizationPhone : "•".repeat((organizationInfo.organizationPhone || "").length || 4)}</span>
                        </label>
                    </div>
                </div>
            );
        }

        return (
            <div className="dinolabsPersonalWrapperStack" style={{ alignItems: "stretch" }}>
                {/*
        <label className="dinolabsIDEAccountOrgNotAvailable" style={{ marginBottom: 12 }}> 
          <FontAwesomeIcon icon={faExclamationTriangle}/>
          <small>This user is not a part of a team.</small>
        </label>
        */}

                <div className="dinolabsAccountEditFormSmall">
                    <div className="dinolabsAccountEditHeader">
                        <FontAwesomeIcon icon={faUsers} /> <span>Join an Existing Team</span>
                    </div>
                    <div className="dinolabsAccountEditRow">
                        <label className="dinolabsAccountEditLabel">Team Code</label>
                        <input
                            className="dinolabsSettingsInput dinolabsAccountEditInput"
                            type="text"
                            value={teamAccess.joinCode}
                            onChange={(e) => setTeamField("joinCode", e.target.value)}
                            placeholder="Enter the 6-digit team code"
                        />
                    </div>
                    <div className="dinolabsAccountEditActions">
                        <button
                            className="dinolabsSettingsActionButtonPrimary"
                            onClick={joinTeam}
                            disabled={teamAccess.joining}
                        >
                            <FontAwesomeIcon icon={faUsers} />
                            <span>{teamAccess.joining ? "Requesting..." : "Request Access"}</span>
                        </button>
                    </div>
                </div>

                <div className="dinolabsAccountEditFormSmall" style={{ marginTop: 16 }}>
                    <div className="dinolabsAccountEditHeader">
                        <FontAwesomeIcon icon={faBuilding} /> <span>Create a New Team</span>
                    </div>
                    <div className="dinolabsAccountEditRow">
                        <label className="dinolabsAccountEditLabel">Team Name</label>
                        <input
                            className="dinolabsSettingsInput dinolabsAccountEditInput"
                            type="text"
                            value={teamAccess.teamName}
                            onChange={(e) => setTeamField("teamName", e.target.value)}
                            placeholder="Your team name"
                        />
                    </div>
                    <div className="dinolabsAccountEditRow">
                        <label className="dinolabsAccountEditLabel">Team Slug</label>
                        <input
                            className="dinolabsSettingsInput dinolabsAccountEditInput"
                            type="text"
                            value={teamAccess.teamSlug}
                            onChange={(e) => setTeamField("teamSlug", e.target.value)}
                            placeholder="your-team-slug"
                        />
                    </div>
                    <div className="dinolabsAccountEditActions">
                        <button
                            className="dinolabsSettingsActionButtonPrimary"
                            onClick={createTeam}
                            disabled={teamAccess.creating}
                        >
                            <FontAwesomeIcon icon={faBuilding} />
                            <span>{teamAccess.creating ? "Creating..." : "Create Team"}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderNavigationButtons = () => (
        <div className="dinolabsAccountFunctionalityList">
            {navigationButtons.map(button => (
                <button
                    key={button.key}
                    className="dinolabsAccountFunctionalityButton"
                    onClick={() => handleStateChange(button.key)}
                    style={{ backgroundColor: uiState.selectedState === button.key ? "rgba(255,255,255,0.1)" : "" }}
                >
                    <span>
                        <FontAwesomeIcon icon={button.icon} />
                        <i>{button.label}</i>
                    </span>
                    <FontAwesomeIcon icon={uiState.selectedState === button.key ? faSquareXmark : faUpRightFromSquare} />
                </button>
            ))}
        </div>
    );

    const renderPersonalInfoSettings = () => (
        <div className="dinolabsSettingsButtonWrapper">
            {renderToggleButton(
                "Display my email address.",
                displayPreferences.displayEmail,
                () => updateDisplayPreference("showpersonalemail", !displayPreferences.displayEmail),
                "Toggle Email Display"
            )}
            {renderToggleButton(
                "Display my phone number.",
                displayPreferences.displayPhone,
                () => updateDisplayPreference("showpersonalphone", !displayPreferences.displayPhone),
                "Toggle Phone Number Display"
            )}
        </div>
    );

    const renderTeamInfoSettings = () => (
        <div className="dinolabsSettingsButtonWrapper">
            {renderToggleButton(
                "Display my team's ID number.",
                displayPreferences.displayTeamID,
                () => updateDisplayPreference("showteamid", !displayPreferences.displayTeamID),
                "Toggle Team ID Display"
            )}
            {renderToggleButton(
                "Display my team's email.",
                displayPreferences.displayTeamEmail,
                () => updateDisplayPreference("showteamemail", !displayPreferences.displayTeamEmail),
                "Toggle Team Email Display"
            )}
            {renderToggleButton(
                "Display my team's phone number.",
                displayPreferences.displayTeamPhone,
                () => updateDisplayPreference("showteamphone", !displayPreferences.displayTeamPhone),
                "Toggle Team Phone Display"
            )}
            {renderToggleButton(
                `Display my admin status at ${organizationInfo.organizationName}.`,
                displayPreferences.displayTeamAdminStatus,
                () => updateDisplayPreference("showteamadminstatus", !displayPreferences.displayTeamAdminStatus),
                "Toggle Admin Info Display"
            )}
            {renderToggleButton(
                `Display my role at ${organizationInfo.organizationName}.`,
                displayPreferences.displayTeamRole,
                () => updateDisplayPreference("showteamrole", !displayPreferences.displayTeamRole),
                "Toggle Role Display"
            )}
        </div>
    );

    const renderSettingsManagement = () => (
        <div className="dinolabsSettingsButtonWrapper">
            <button className="dinolabsSettingsButtonLine">
                <span>Set Default Zoom Level</span>
                <span>
                    <div className="dinolabsContentSliderWrapper">
                        <input
                            type="range"
                            value={zoomLevel}
                            min="0.5"
                            max="3"
                            step="0.1"
                            onChange={(e) => setZoomLevel(Number(e.target.value))}
                            onMouseUp={(e) => saveUserPreferences(userID, organizationID, Number(e.target.value), colorTheme)}
                            onTouchEnd={(e) => saveUserPreferences(userID, organizationID, Number(e.target.value), colorTheme)}
                            className="dinolabsSettingsSlider"
                        />
                    </div>
                    <label className="dinolabsSettingsToggleLabel">{(zoomLevel * 100).toFixed(0)}%</label>
                </span>
            </button>
        </div>
    );

    const renderShortcutManagement = () => (
        <div className="dinolabsSettingsButtonWrapper">
            {Object.entries(keyBinds).map(([action, key]) => (
                <button key={action} className="dinolabsSettingsButtonLine">
                    <span>{getKeyBindDisplayName(action)}</span>
                    <span>
                        <button className="dinolabsSettingsKeyIcon">⌘</button>
                        {uiState.isEditingKeyBinds === action ? (
                            <select
                                className="dinolabsSettingsKeyIconSelect"
                                value={key}
                                onChange={(e) => {
                                    handleKeyBindChange(action, e.target.value);
                                    setUiState(prev => ({ ...prev, isEditingKeyBinds: null }));
                                }}
                                onBlur={() => setUiState(prev => ({ ...prev, isEditingKeyBinds: null }))}
                            >
                                {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890").map(letter => (
                                    <option key={letter} value={letter}>{letter}</option>
                                ))}
                            </select>
                        ) : (
                            <button
                                className="dinolabsSettingsKeyIcon"
                                onClick={() => setUiState(prev => ({ ...prev, isEditingKeyBinds: action }))}
                            >
                                {key}
                            </button>
                        )}
                    </span>
                </button>
            ))}
        </div>
    );

    const renderThemeManagement = () => (
        <div className="dinolabsSettingsButtonWrapper">
            {themeOptions.map(theme => (
                <button key={theme.value} className="dinolabsSettingsButtonLine">
                    <span>
                        {theme.name}
                        <span className="dinolabsSettingsThemeIndicator">
                            {theme.colors.map((color, index) => (
                                <span
                                    key={index}
                                    className="dinolabsSettingsThemeIndicatorDot"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        checked={colorTheme === theme.value}
                        className="dinolabsSettingsCheckbox"
                        onChange={() => {
                            setColorTheme(theme.value);
                            saveUserPreferences(userID, organizationID, zoomLevel, theme.value);
                        }}
                    />
                </button>
            ))}
        </div>
    );

    const renderProfileEditor = () => (
        <div className="dinolabsAccountEditForm">
            <div className="dinolabsAccountEditRow" style={{ "margin-top": 0 }}>
                <label className="dinolabsAccountEditLabel">First Name</label>
                <input
                    className="dinolabsSettingsInput dinolabsAccountEditInput"
                    type="text"
                    value={editProfile.firstName}
                    onChange={(e) => handleProfileField("firstName", e.target.value)}
                    placeholder="First name"
                />
            </div>

            <div className="dinolabsAccountEditRow">
                <label className="dinolabsAccountEditLabel">Last Name</label>
                <input
                    className="dinolabsSettingsInput dinolabsAccountEditInput"
                    type="text"
                    value={editProfile.lastName}
                    onChange={(e) => handleProfileField("lastName", e.target.value)}
                    placeholder="Last name"
                />
            </div>

            <div className="dinolabsAccountEditRow">
                <label className="dinolabsAccountEditLabel">Phone</label>
                <input
                    className="dinolabsSettingsInput dinolabsAccountEditInput"
                    type="text"
                    value={editProfile.phone}
                    onChange={(e) => handleProfileField("phone", e.target.value)}
                    placeholder="(###) ###-####"
                />
            </div>

            <div className="dinolabsAccountEditRow">
                <label className="dinolabsAccountEditLabel">Role / Title</label>
                <input
                    className="dinolabsSettingsInput dinolabsAccountEditInput"
                    type="text"
                    value={editProfile.role}
                    onChange={(e) => handleProfileField("role", e.target.value)}
                    placeholder="Your role"
                />
            </div>

            <div className="dinolabsAccountImageUploadControls">
                <div className="dinolabsAccountImagePreviewStack">
                    <img
                        className="dinolabsAccountImagePreview"
                        alt=""
                        src={editProfile.imagePreview || userInfo.image}
                    />
                </div>
                <div className="dinolabsAccountImageUploadStack">
                    <label className="dinolabsAccountEditLabelBig">Profile Image</label>
                    <label className="dinolabsSettingsFilePicker">
                        <FontAwesomeIcon icon={faImage} />
                        <span>Choose Image</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageFile(e.target.files?.[0])}
                        />
                    </label>
                    <small className="dinolabsAccountEditHelp">PNG/JPG, recommended square, ≤ 5MB.</small>
                </div>
            </div>

            <div className="dinolabsAccountEditActions">
                <button
                    className="dinolabsSettingsActionButtonPrimary"
                    onClick={updateUserProfile}
                    disabled={editProfile.saving}
                    title="Save changes"
                >
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    <span>{editProfile.saving ? "Saving..." : "Save"}</span>
                </button>
                <button
                    className="dinolabsSettingsActionButtonSecondary"
                    onClick={resetProfileEdits}
                    disabled={editProfile.saving}
                    title="Reset unsaved changes"
                >
                    <FontAwesomeIcon icon={faRotateLeft} />
                    <span>Reset</span>
                </button>
            </div>
        </div>
    );

    const renderSettingsContent = () => {
        const settingsMap = {
            profileEditor: renderProfileEditor,
            personalInfo: renderPersonalInfoSettings,
            teamInfo: renderTeamInfoSettings,
            settingsManagement: renderSettingsManagement,
            shortcutManagement: renderShortcutManagement,
            themeManagement: renderThemeManagement
        };

        if (uiState.selectedState === "none") {
            return <LinePlot plotType="accountPageUsagePlot" data={personalUsageByDay} />;
        }

        const renderFunction = settingsMap[uiState.selectedState];
        return renderFunction ? (
            <div className="dinolabsSettingsOperationsWrapper">
                {renderFunction()}
            </div>
        ) : null;
    };

    const renderLoadingState = () => (
        <div className="dinolabsAccountWrapper">
            <div className="loading-wrapper">
                <div className="loading-circle" />
                <label className="loading-title">Dino Labs Web IDE</label>
            </div>
        </div>
    );

    const renderMainContent = () => (
        <div className="dinolabsAccountWrapper">
            <div className="dinolabsAccountInformationContainer">
                {renderPersonalInfo()}
                {renderOrganizationInfo()}
            </div>

            <div className="dinolabsAccountFunctionalityContainer">
                <div className="dinolabsAccountFunctionalityCellLeading">
                    {renderNavigationButtons()}
                </div>

                <div className="dinolabsAccountFunctionalityCellTrailing">
                    {renderSettingsContent()}
                </div>
            </div>
        </div>
    );

    return (
        <div className="dinolabsSettingsContainer">
            {uiState.isLoaded ? renderMainContent() : renderLoadingState()}
        </div>
    );
};

export default DinoLabsAccount;
