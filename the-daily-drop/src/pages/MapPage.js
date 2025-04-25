// src/pages/MapPage.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  GeoPoint,
  addDoc,
  getDocs,
  limit,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage, auth } from "../firebase"; // Ensure auth is imported correctly
import { FaTrophy, FaLocationArrow, FaUser } from "react-icons/fa"; // Keep your icon import

// Import Components
import MapComponent from "../components/MapComponent";
import LeaderboardComponent from "../components/LeaderboardComponent";
import UserProfileComponent from "../components/UserProfileComponent";

// --- Geolocation Helper ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Distance in meters
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// --- Constants ---
const DEFAULT_ZOOM = 16; // Standard map zoom level
const CLICKED_ZOOM = 20; // Zoom level when a drop is clicked
const defaultCenter = { lat: -37.8111, lng: 144.9469 }; // Flagstaff Gardens approx
const DISTANCE_THRESHOLD_METERS = 30; // Capture radius

function MapPage() {
  // --- State Variables ---
  const [userPosition, setUserPosition] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [drops, setDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dropToSubmit, setDropToSubmit] = useState(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(false);
  const [currentCenter, setCurrentCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM); // <-- ADDED zoom state
  const [isFirstLocationUpdate, setIsFirstLocationUpdate] = useState(true);

  // --- Hooks ---
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const watchIdRef = useRef(null);


  // --- User Location Effect ---
  useEffect(() => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const currentPosition = { lat: latitude, lng: longitude };
          setUserPosition(currentPosition);
          setUserAccuracy(accuracy);
          if (isFirstLocationUpdate) {
            setCurrentCenter(currentPosition);
            // Keep default zoom on first load
            setIsFirstLocationUpdate(false);
            console.log("Centered map on first location update.");
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          if (isFirstLocationUpdate) {
            setCurrentCenter(defaultCenter);
            setIsFirstLocationUpdate(false);
            console.log("Error getting location, centering on default.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setCurrentCenter(defaultCenter);
      setIsFirstLocationUpdate(false);
      console.log("Geolocation not supported, centering on default.");
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("Stopped watching position.");
      }
    };
  }, [isFirstLocationUpdate]);

  // --- Fetch Active Drops Effect ---
  useEffect(() => {
    const dropsRef = collection(db, "drops");
    const now = Timestamp.now();
    const q = query(dropsRef, where("endTime", ">=", now));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const activeDrops = [];
        const currentTime = Timestamp.now();
        querySnapshot.forEach((doc) => {
          const dropData = doc.data();
          if (
            dropData.startTime &&
            dropData.startTime <= currentTime &&
            dropData.location instanceof GeoPoint
          ) {
            activeDrops.push({
              id: doc.id,
              ...dropData,
              position: {
                lat: dropData.location.latitude,
                lng: dropData.location.longitude,
              },
            });
          }
        });
        setDrops(activeDrops);
      },
      (error) => {
        console.error("Error fetching drops:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  // --- Fetch Leaderboard Data Effect ---
  useEffect(() => {
    if (!isLeaderboardOpen) {
      return;
    }
    const fetchLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      setLeaderboardData([]);
      console.log("Fetching leaderboard data from users collection...");
      try {
        const usersRef = collection(db, "user");
        const q = query(usersRef, orderBy("point", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        const formattedData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const userId = doc.id;
          const username = data.username || `User...${userId.slice(-4)}`;
          const score = data.point || 0;
          formattedData.push({ id: userId, username: username, score: score });
        });
        console.log("Formatted Leaderboard Data:", formattedData);
        setLeaderboardData(formattedData);
      } catch (error) {
        console.error(
          "Error fetching leaderboard from users collection:",
          error
        );
        setLeaderboardData([]);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };
    fetchLeaderboard();
  }, [isLeaderboardOpen]);

  // --- Fetch Current User Data Effect ---
  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }
    const fetchCurrentUser = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user logged in to fetch profile data.");
        setCurrentUserData(null);
        return;
      }
      setIsLoadingCurrentUser(true);
      console.log("Fetching current user data for:", user.uid);
      try {
        const userDocRef = doc(db, "user", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          console.log("Current user data:", docSnap.data());
          setCurrentUserData({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.log("No such user document!");
          setCurrentUserData(null);
        }
      } catch (error) {
        console.error("Error fetching current user data:", error);
        setCurrentUserData(null);
      } finally {
        setIsLoadingCurrentUser(false);
      }
    };
    fetchCurrentUser();
  }, [isProfileOpen]);

  // --- Capture Logic ---
  const handleCaptureAttempt = async (dropData) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to capture drops.");
      return;
    }
    const currentUserId = user.uid;
    if (!userPosition) {
      alert(
        "Could not get your current location. Please enable location services and try again."
      );
      return;
    }
    if (!dropData?.position?.lat || !dropData?.id) {
      console.error("Drop data invalid in handleCaptureAttempt:", dropData);
      alert("Error: Could not identify the selected drop.");
      return;
    }
    const distance = getDistanceFromLatLonInKm(
      userPosition.lat,
      userPosition.lng,
      dropData.position.lat,
      dropData.position.lng
    );
    console.log(`Distance to drop ${dropData.id}: ${distance.toFixed(2)}m`);

    if (distance <= DISTANCE_THRESHOLD_METERS) {
      try {
        const submissionsRef = collection(db, "submissions");
        const q = query(
          submissionsRef,
          where("userId", "==", currentUserId),
          where("dropId", "==", dropData.id),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          alert("You have already captured this drop!");
        } else {
          console.log("Close enough & not submitted. Triggering photo input.");
          setDropToSubmit(dropData);
          fileInputRef.current?.click();
        }
      } catch (error) {
        console.error("Error checking for existing submission:", error);
        alert("Could not verify submission status. Please try again.");
      }
    } else {
      alert(
        `Too far! You are ${distance.toFixed(
          0
        )}m away. Get within ${DISTANCE_THRESHOLD_METERS}m.`
      );
    }
  };

  // --- File Handling ---
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    const user = auth.currentUser;
    if (!file || !dropToSubmit || !user) {
      console.error("File, drop info, or user missing for upload.");
      if (!dropToSubmit)
        alert("Drop context lost. Please try capturing again.");
      setDropToSubmit(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      setDropToSubmit(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    uploadPhotoAndUpdateFirestore(file, user.uid, dropToSubmit.id);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- Upload Logic ---
  const uploadPhotoAndUpdateFirestore = async (file, userId, dropId) => {
    setIsUploading(true);
    setDropToSubmit(null);
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${userId}-${dropId}-${timestamp}.${fileExtension}`;
    const filePath = `submissions/${dropId}/${uniqueFileName}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Optional progress tracking
      },
      (error) => {
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error.message}`);
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at", downloadURL);
          const submissionsRef = collection(db, "submissions");
          const submissionData = {
            userId: userId,
            dropId: dropId,
            photoUrl: downloadURL,
            timestamp: serverTimestamp(),
            // Optional: captureLocation: new GeoPoint(userPosition.lat, userPosition.lng)
          };
          await addDoc(submissionsRef, submissionData);
          console.log("Submission record added for drop:", dropId);
          alert("Drop captured successfully!");
          setSelectedDrop(null); // Close InfoWindow
          setMapZoom(DEFAULT_ZOOM); // <-- RESET ZOOM ON SUCCESSFUL CAPTURE
        } catch (firestoreError) {
          console.error(
            "Error adding submission to Firestore:",
            firestoreError
          );
          alert(`Capture failed (database error): ${firestoreError.message}`);
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  // --- Leaderboard Toggle Handlers ---
  const toggleLeaderboard = () => setIsLeaderboardOpen(!isLeaderboardOpen);
  const closeLeaderboard = () => setIsLeaderboardOpen(false);

  // --- Profile Toggle Handlers ---
  const toggleProfile = () => {
    console.log("Toggling profile. Current state:", isProfileOpen);
      setIsProfileOpen(!isProfileOpen);
  }
  const closeProfile = () => setIsProfileOpen(false);

  // --- Map Interaction Handlers ---
  const handleDropMarkerClick = useCallback(
    (drop) => {
      console.log("Drop marker clicked:", drop.id);
      setSelectedDrop(drop);
      if (
        drop.position &&
        typeof drop.position.lat === "number" &&
        typeof drop.position.lng === "number"
      ) {
        // Center slightly above the marker to account for InfoWindow
        const newCenter = {
          lat: drop.position.lat + 0.0002, // Small offset north
          lng: drop.position.lng,
        };
        setCurrentCenter(newCenter);
        setMapZoom(CLICKED_ZOOM); // <-- SET ZOOM ON CLICK
        console.log(
          "Map centered and zoomed on drop:",
          newCenter,
          CLICKED_ZOOM
        );
      } else {
        console.warn("Clicked drop is missing valid position data:", drop);
      }
    },
    [] // CLICKED_ZOOM is a constant, no dependency needed
  );

  const handleOverlayClose = useCallback(() => {
    console.log(
      "handleOverlayClose called. Current selectedDrop:",
      selectedDrop?.id
    );
    if (selectedDrop) {
      setSelectedDrop(null);
      setMapZoom(DEFAULT_ZOOM); // <-- RESET ZOOM ON CLOSE
      console.log("Overlay closed, zoom reset to default.");
      // Optionally recenter map here if desired
    }
  }, [selectedDrop]); // Dependency: selectedDrop

  const handleRecenterMap = useCallback(() => {
    console.log(
      "handleRecenterMap called. Current userPosition:",
      userPosition
    );
    if (userPosition) {
      console.log("Attempting to set center to:", userPosition);
      setCurrentCenter({ ...userPosition });
      setMapZoom(DEFAULT_ZOOM); // <-- RESET ZOOM ON RECENTER
    } else {
      console.warn("User position not available to recenter.");
      alert(
        "Your current location is not available yet. Please wait or check permissions."
      );
    }
  }, [userPosition]); // Dependency: userPosition

  // --- Render ---
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh  ", // Use 100vh for full viewport height
        overflow: "hidden",
      }}
    >
     {/* Log state during render */}
     {console.log("MapPage render - isProfileOpen:", isProfileOpen)}
      {/* Leaderboard Button */}
      <div
        onClick={toggleLeaderboard}
        style={{
          position: "absolute",
          bottom: `calc(14px + env(safe-area-inset-bottom, 0px))`,
          right: 14,
          zIndex: 10,
          backgroundColor: "#6F42C1",
          padding: "16px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
        role="button"
        aria-label="Open Leaderboard"
      >
        <FaTrophy color="white" size={24} />
      </div>

      {/* Recenter Button */}
      <div
        onClick={handleRecenterMap}
        style={{
          position: "absolute",
          bottom: `calc(78px + env(safe-area-inset-bottom, 0px))`, // Position above leaderboard
          right: 14,
          zIndex: 10,
          backgroundColor: "white",
          padding: "16px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
        role="button"
        aria-label="Recenter Map"
      >
        <FaLocationArrow color="#1976D2" size={24} />
      </div>

      {/* User Profile Button */}
      <div
        onClick={toggleProfile}
        style={{
          position: "absolute",
          bottom: `calc(14px + env(safe-area-inset-bottom, 0px))`, // Same level as leaderboard
          left: 14, // Position on the left
          zIndex: 10,
          backgroundColor: "#6F42C1",
          padding: "16px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
        role="button"
        aria-label="Open Profile"
      >
        <FaUser color="white" size={24} />
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        style={{
          position: "absolute !important",
          height: "1px",
          width: "1px",
          overflow: "hidden",
          clip: "rect(1px, 1px, 1px, 1px)",
          whiteSpace: "nowrap" /* prevent line breaks */,
          border: 0,
          padding: 0,
          margin: " -1px",
        }}
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* Map Component */}
      <MapComponent
        userPosition={userPosition}
        userAccuracy={userAccuracy}
        drops={drops}
        selectedDrop={selectedDrop}
        onDropClick={handleDropMarkerClick} // <-- Use handler for zoom/center
        onInfoWindowClose={handleOverlayClose} // <-- Use handler to reset zoom
        onCaptureAttempt={handleCaptureAttempt}
        isUploading={isUploading}
        center={currentCenter || defaultCenter} // Use controlled center
        zoom={mapZoom} // <-- Pass zoom state
        defaultCenter={defaultCenter}
        onMapClick={handleOverlayClose} // <-- Close overlay/reset zoom on map click
      />

      {/* Leaderboard Component */}
      <LeaderboardComponent
        onClose={closeLeaderboard}
        isOpen={isLeaderboardOpen}
        leaderboardData={leaderboardData}
        isLoading={isLoadingLeaderboard}
      />

      {/* User Profile Component */}
      <UserProfileComponent
        onClose={closeProfile}
        isOpen={isProfileOpen}
        userData={currentUserData}
        isLoading={isLoadingCurrentUser}
      />
    </div>
  );
}

export default MapPage;
