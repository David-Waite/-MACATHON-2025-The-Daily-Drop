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
import { db, storage, auth } from "../firebase"; // Ensure auth is imported correctly
import { FaTrophy } from "react-icons/fa"; // Keep your icon import

// Import Components
import MapComponent from "../components/MapComponent";
import LeaderboardComponent from "../components/LeaderboardComponent"; // <-- Import Leaderboard

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

function MapPage() {
  // --- State Variables ---
  const [userPosition, setUserPosition] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null); // <-- ADDED: State for accuracy
  const [drops, setDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dropToSubmit, setDropToSubmit] = useState(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false); // <-- Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState([]); // <-- Leaderboard Data State
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false); // <-- Leaderboard Loading State
  const [currentCenter, setCurrentCenter] = useState(null); // <-- ADDED: State to manage map center
  const [isFirstLocationUpdate, setIsFirstLocationUpdate] = useState(true); // <-- ADDED: Track first update

  // --- Hooks ---
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const watchIdRef = useRef(null); // <-- ADDED: Use ref for watchId

  // --- Constants ---
  const defaultCenter = { lat: -37.8111, lng: 144.9469 }; // Flagstaff Gardens approx
  const DISTANCE_THRESHOLD_METERS = 30; // Capture radius

  // --- Authentication ---
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

  // --- User Location Effect ---
  useEffect(() => {
    // Use watchIdRef defined outside the effect
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        // Store ID in ref
        (position) => {
          // Destructure latitude, longitude, AND accuracy
          const { latitude, longitude, accuracy } = position.coords;
          const currentPosition = { lat: latitude, lng: longitude };

          setUserPosition(currentPosition);
          setUserAccuracy(accuracy); // <-- Set the accuracy state

          // console.log("User position updated:", currentPosition); // Less console noise
          // console.log("User accuracy updated:", accuracy);

          // Center map on first successful location update
          if (isFirstLocationUpdate) {
            setCurrentCenter(currentPosition);
            setIsFirstLocationUpdate(false);
            console.log("Centered map on first location update.");
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          // If location fails initially, center on default
          if (isFirstLocationUpdate) {
            setCurrentCenter(defaultCenter);
            setIsFirstLocationUpdate(false); // Still counts as 'first update' handled
            console.log("Error getting location, centering on default.");
          }
          // Optionally clear position/accuracy if error occurs later
          // setUserPosition(null);
          // setUserAccuracy(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      // Handle lack of geolocation support - center on default
      setCurrentCenter(defaultCenter);
      setIsFirstLocationUpdate(false);
      console.log("Geolocation not supported, centering on default.");
    }

    // Cleanup function using the ref
    return () => {
      if (watchIdRef.current !== null) {
        // Check ref's current value
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("Stopped watching position.");
      }
    };
    // Effect dependencies: re-run if needed, though the first update logic handles internal state change
  }, [isFirstLocationUpdate]); // Depend on isFirstLocationUpdate to correctly handle the centering logic

  // --- Fetch Active Drops Effect ---
  useEffect(() => {
    const dropsRef = collection(db, "drops");
    const now = Timestamp.now();
    const q = query(dropsRef, where("endTime", ">=", now)); // Drops ending now or later

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const activeDrops = [];
        const currentTime = Timestamp.now();
        querySnapshot.forEach((doc) => {
          const dropData = doc.data();
          // Also check if drop has started
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
        // console.log("Fetched Active Drops:", activeDrops); // Reduce console noise
        setDrops(activeDrops);
      },
      (error) => {
        console.error("Error fetching drops:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  // --- Fetch Leaderboard Data Effect (Reads directly from users collection) ---
  useEffect(() => {
    if (!isLeaderboardOpen) {
      return; // Don't fetch if closed
    }

    const fetchLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      setLeaderboardData([]); // Clear previous data
      console.log("Fetching leaderboard data from users collection...");

      try {
        // 1. Reference the 'users' collection (MAKE SURE COLLECTION NAME IS 'user')
        const usersRef = collection(db, "user"); // Or 'users' if that's the actual name

        // 2. Create the query: Order by 'point' descending, limit results
        const q = query(
          usersRef,
          orderBy("point", "desc"), // Order by the 'point' field
          limit(20) // Get the top 20 users (adjust as needed)
        );

        // 3. Execute the query
        const querySnapshot = await getDocs(q);

        // 4. Format the data directly from user documents
        const formattedData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const userId = doc.id; // Document ID is the userId

          // Extract username and point, providing fallbacks
          const username = data.username || `User...${userId.slice(-4)}`; // Use stored username or fallback
          const score = data.point || 0; // Use stored point or fallback to 0

          formattedData.push({
            id: userId, // Use the document ID (userId) as the key
            username: username,
            score: score,
          });
        });

        console.log("Formatted Leaderboard Data:", formattedData);
        setLeaderboardData(formattedData); // Set the state with the new data
      } catch (error) {
        console.error(
          "Error fetching leaderboard from users collection:",
          error
        );
        setLeaderboardData([]); // Ensure data is cleared on error
      } finally {
        setIsLoadingLeaderboard(false); // Set loading state to false
      }
    };

    fetchLeaderboard();
  }, [isLeaderboardOpen]); // Dependency: re-run when isLeaderboardOpen changes

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
    setDropToSubmit(null); // Clear temp state

    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${userId}-${dropId}-${timestamp}.${fileExtension}`;
    const filePath = `submissions/${dropId}/${uniqueFileName}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // console.log("Upload is " + progress + "% done"); // Less noise
      },
      (error) => {
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error.message}`);
        setIsUploading(false);
      },
      async () => {
        // Success
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
        } catch (firestoreError) {
          console.error(
            "Error adding submission to Firestore:",
            firestoreError
          );
          alert(`Capture failed (database error): ${firestoreError.message}`);
          // TODO: Consider deleting the uploaded photo from Storage if Firestore fails
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  // --- Leaderboard Toggle Handlers ---
  const toggleLeaderboard = () => {
    setIsLeaderboardOpen(!isLeaderboardOpen);
  };

  const closeLeaderboard = () => {
    setIsLeaderboardOpen(false);
  };

  // --- Render ---
  return (
    // Added overflow: hidden to prevent body scroll when leaderboard is open
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Logout Button */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
        <button onClick={handleLogout} className="logout-button">
          {" "}
          {/* Added class for potential styling */}
          Log Out
        </button>
      </div>

      {/* Leaderboard Button (using FaTrophy) */}
      <div
        onClick={toggleLeaderboard} // <-- Use toggleLeaderboard here
        style={{
          position: "absolute",
          bottom: 14, // Adjust as needed
          right: 14, // Adjust as needed
          zIndex: 10, // Ensure it's above map but below leaderboard panel overlay
          backgroundColor: "#6F42C1", // Purple color from image
          padding: "16px", // Adjust padding to control size
          borderRadius: "50%", // Makes it circular
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer", // Add pointer cursor
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)", // Optional shadow
        }}
        role="button" // Accessibility
        aria-label="Open Leaderboard"
      >
        <FaTrophy color="white" size={24} /> {/* White icon */}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        capture
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* Map Component */}
      <MapComponent
        userPosition={userPosition}
        userAccuracy={userAccuracy} // <-- PASS ACCURACY PROP
        drops={drops}
        selectedDrop={selectedDrop}
        onDropClick={setSelectedDrop}
        onInfoWindowClose={() => setSelectedDrop(null)}
        onCaptureAttempt={handleCaptureAttempt}
        isUploading={isUploading}
        center={currentCenter || defaultCenter} // <-- USE CONTROLLED CENTER
        defaultCenter={defaultCenter} // Pass fallback default center
      />

      {/* Leaderboard Component */}
      {/* Rendered based on isLeaderboardOpen state passed down */}
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
