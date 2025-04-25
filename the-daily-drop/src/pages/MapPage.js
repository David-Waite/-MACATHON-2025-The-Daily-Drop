// src/pages/MapPage.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
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
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { FaTrophy, FaLocationArrow } from "react-icons/fa";
import MapComponent from "../components/MapComponent";
import LeaderboardComponent from "../components/LeaderboardComponent";

// --- Helpers ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d * 1000;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// --- Constants for Zoom ---
const DEFAULT_ZOOM = 16; // Your standard map zoom level
const CLICKED_ZOOM = 20; // Zoom level when a drop is clicked

function MapPage() {
  // --- State ---
  const [userPosition, setUserPosition] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [drops, setDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dropToSubmit, setDropToSubmit] = useState(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [currentCenter, setCurrentCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM); // <-- ADDED zoom state
  const [isFirstLocationUpdate, setIsFirstLocationUpdate] = useState(true);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const watchIdRef = useRef(null);
  const defaultCenter = { lat: -37.8111, lng: 144.9469 }; // Example: Near Docklands
  const DISTANCE_THRESHOLD_METERS = 30;

  // --- Auth ---
  const handleLogout = () => {
    const authInstance = getAuth();
    signOut(authInstance)
      .then(() => {
        console.log("User signed out");
        navigate("/login");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  // --- Effects ---
  useEffect(() => {
    // Location watch effect
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
            // setMapZoom(DEFAULT_ZOOM); // Redundant as it's the initial state
            setIsFirstLocationUpdate(false);
            console.log("Centered map on first location update.");
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          if (isFirstLocationUpdate) {
            setCurrentCenter(defaultCenter);
            // setMapZoom(DEFAULT_ZOOM); // Redundant
            setIsFirstLocationUpdate(false);
            console.log("Error getting location, centering on default.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error("Geolocation is not supported.");
      setCurrentCenter(defaultCenter);
      // setMapZoom(DEFAULT_ZOOM); // Redundant
      setIsFirstLocationUpdate(false);
      console.log("Geolocation not supported, centering on default.");
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("Stopped watching position.");
      }
    };
  }, [isFirstLocationUpdate]); // Only run on mount/unmount based on this flag

  useEffect(() => {
    // Drops fetch effect
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

  useEffect(() => {
    // Leaderboard fetch effect
    if (!isLeaderboardOpen) {
      return;
    }
    const fetchLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      setLeaderboardData([]);
      console.log("Fetching leaderboard data...");
      try {
        const usersRef = collection(db, "user"); // Assuming 'user' is your collection name
        const q = query(usersRef, orderBy("point", "desc"), limit(20)); // Adjust field name if needed
        const querySnapshot = await getDocs(q);
        const formattedData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const userId = doc.id;
          // Use 'username' field, fallback to a generic name if missing
          const username = data.username || `User...${userId.slice(-4)}`;
          const score = data.point || 0; // Use 'point' field, fallback to 0
          formattedData.push({ id: userId, username: username, score: score });
        });
        console.log("Formatted Leaderboard Data:", formattedData);
        setLeaderboardData(formattedData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setLeaderboardData([]); // Clear data on error
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };
    fetchLeaderboard();
  }, [isLeaderboardOpen]);

  // --- Capture/Upload Logic ---
  const handleCaptureAttempt = async (dropData) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to capture drops.");
      return;
    }
    const currentUserId = user.uid;
    if (!userPosition) {
      alert("Could not get your current location.");
      return;
    }
    if (!dropData?.position?.lat || !dropData?.id) {
      console.error("Invalid drop data:", dropData);
      alert("Error: Invalid drop data.");
      return;
    }
    const distance = getDistanceFromLatLonInKm(
      userPosition.lat,
      userPosition.lng,
      dropData.position.lat,
      dropData.position.lng
    );
    console.log(`Distance: ${distance.toFixed(2)}m`);

    if (distance <= DISTANCE_THRESHOLD_METERS) {
      try {
        // Check if already submitted
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
          console.log("Triggering photo input.");
          setDropToSubmit(dropData); // Store drop context for file handler
          fileInputRef.current?.click(); // Open file input
        }
      } catch (error) {
        console.error("Error checking submission:", error);
        alert("Could not verify submission status.");
      }
    } else {
      alert(
        `Too far! ${distance.toFixed(
          0
        )}m away. Get within ${DISTANCE_THRESHOLD_METERS}m.`
      );
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    const user = auth.currentUser;

    // Ensure we have file, drop context, and user
    if (!file || !dropToSubmit || !user) {
      console.error("File, drop, or user missing.");
      if (!dropToSubmit) alert("Drop context lost."); // Inform user if drop context is gone
      setDropToSubmit(null); // Clear drop context
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      return;
    }

    // Basic file type validation
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      setDropToSubmit(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Proceed with upload
    uploadPhotoAndUpdateFirestore(file, user.uid, dropToSubmit.id);

    // Reset file input after selection is handled
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPhotoAndUpdateFirestore = async (file, userId, dropId) => {
    setIsUploading(true);
    setDropToSubmit(null); // Clear context once upload starts

    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${userId}-${dropId}-${timestamp}.${fileExtension}`;
    const filePath = `submissions/${dropId}/${uniqueFileName}`; // Organize by dropId
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Optional: Track progress
        // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error.message}`);
        setIsUploading(false);
      },
      async () => {
        // Handle successful uploads on complete
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at", downloadURL);

          // Add submission record to Firestore
          const submissionsRef = collection(db, "submissions");
          const submissionData = {
            userId: userId,
            dropId: dropId,
            photoUrl: downloadURL,
            timestamp: serverTimestamp(), // Use server timestamp
            // Add user location if needed:
            // captureLocation: new GeoPoint(userPosition.lat, userPosition.lng)
          };
          await addDoc(submissionsRef, submissionData);
          console.log("Submission record added");
          alert("Drop captured successfully!");
          setSelectedDrop(null); // Close the overlay after successful capture
          setMapZoom(DEFAULT_ZOOM); // Optionally zoom out after capture
        } catch (firestoreError) {
          console.error("Error adding submission:", firestoreError);
          alert(`Capture failed (db error): ${firestoreError.message}`);
        } finally {
          setIsUploading(false); // Ensure loading state is reset
        }
      }
    );
  };

  // --- Leaderboard Toggle Handlers ---
  const toggleLeaderboard = () => setIsLeaderboardOpen(!isLeaderboardOpen);
  const closeLeaderboard = () => setIsLeaderboardOpen(false);

  // --- Map Interaction Handlers ---
  const handleDropMarkerClick = useCallback((drop) => {
    console.log("Drop marker clicked:", drop.id);
    setSelectedDrop(drop);
    if (
      drop.position &&
      typeof drop.position.lat === "number" &&
      typeof drop.position.lng === "number"
    ) {
      const newCenter = {
        lat: drop.position.lat + 0.0002,
        lng: drop.position.lng,
      };
      setCurrentCenter(newCenter);
      setMapZoom(CLICKED_ZOOM); // <-- SET ZOOM ON CLICK
      console.log("Map centered and zoomed on drop:", newCenter, CLICKED_ZOOM);
    } else {
      console.warn("Clicked drop is missing valid position data:", drop);
    }
  }, []); // No dependencies needed if CLICKED_ZOOM is constant

  const handleOverlayClose = useCallback(() => {
    console.log(
      "handleOverlayClose called. Current selectedDrop:",
      selectedDrop?.id // Log ID for clarity
    );
    if (selectedDrop) {
      setSelectedDrop(null);
      setMapZoom(DEFAULT_ZOOM); // <-- RESET ZOOM ON CLOSE
      console.log("Overlay closed, zoom reset to default.");
      // Optionally recenter map here if desired, e.g., back to user location
      // if (userPosition) setCurrentCenter({...userPosition});
    }
  }, [selectedDrop]); // Dependency: selectedDrop

  const handleRecenterMap = useCallback(() => {
    console.log("handleRecenterMap called. User pos:", userPosition);
    if (userPosition) {
      setCurrentCenter({ ...userPosition });
      setMapZoom(DEFAULT_ZOOM); // Also reset zoom when recentering
    } else {
      console.warn("User position not available.");
      alert("Location not available yet.");
    }
  }, [userPosition]);

  // --- Render ---
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* UI Buttons */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      </div>
      <div
        onClick={toggleLeaderboard}
        style={{
          position: "absolute",
          bottom: `calc(14px + env(safe-area-inset-bottom, 0px))`,
          right: 14,
          zIndex: 10,
          backgroundColor: "#6F42C1", // Purple color
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
      <div
        onClick={handleRecenterMap}
        style={{
          position: "absolute",
          bottom: `calc(78px + env(safe-area-inset-bottom, 0px))`, // Position above leaderboard button
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

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        capture // Suggests using the camera on mobile
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* Map Component */}
      <MapComponent
        userPosition={userPosition}
        userAccuracy={userAccuracy}
        drops={drops}
        selectedDrop={selectedDrop}
        onDropClick={handleDropMarkerClick}
        onInfoWindowClose={handleOverlayClose} // Used by overlay close button
        onCaptureAttempt={handleCaptureAttempt}
        isUploading={isUploading}
        center={currentCenter || defaultCenter} // Use controlled center or fallback
        zoom={mapZoom} // <-- PASS ZOOM STATE
        defaultCenter={defaultCenter}
        onMapClick={handleOverlayClose} // Clicking map outside overlay also closes it
      />

      {/* Leaderboard Component */}
      <LeaderboardComponent
        onClose={closeLeaderboard}
        isOpen={isLeaderboardOpen}
        leaderboardData={leaderboardData}
        isLoading={isLoadingLeaderboard}
      />
    </div>
  );
}

export default MapPage;
