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
const DISTANCE_THRESHOLD_METERS = 3000; // Capture radius

function MapPage() {
  // --- State Variables ---
  const [userPosition, setUserPosition] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [drops, setDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(false);
  const [currentCenter, setCurrentCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM); // <-- ADDED zoom state
  const [isFirstLocationUpdate, setIsFirstLocationUpdate] = useState(true);
  const [image, setImage] = useState(null); // Image file
  // --- Hooks ---
  const navigate = useNavigate();
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
      return; // Don't fetch if closed
    }

    const fetchLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      setLeaderboardData([]); // Clear previous data
      console.log(
        "Fetching leaderboard data for all users based on approved submissions..."
      );

      try {
        // --- Step 1: Fetch ALL users ---
        console.log("Fetching all users...");
        const usersRef = collection(db, "user"); // Ensure collection name is 'user'
        const usersSnapshot = await getDocs(usersRef);
        const allUsers = {}; // { userId: { username: 'name' } }
        usersSnapshot.forEach((doc) => {
          allUsers[doc.id] = {
            username: doc.data().username || `User...${doc.id.slice(-4)}`,
            // Initialize score, will be updated later
            score: 0,
          };
        });
        console.log(`Fetched ${Object.keys(allUsers).length} users.`);

        // --- Step 2: Fetch ALL approved submissions ---
        console.log("Fetching approved submissions...");
        const submissionsRef = collection(db, "submissions");
        const approvedQuery = query(
          submissionsRef,
          where("status", "==", "approved")
        );
        const approvedSubmissionsSnapshot = await getDocs(approvedQuery);
        console.log(
          `Found ${approvedSubmissionsSnapshot.size} approved submissions.`
        );

        // --- Step 3: Count approved submissions per user ---
        const userCounts = {}; // { userId: count }
        approvedSubmissionsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId) {
            userCounts[data.userId] = (userCounts[data.userId] || 0) + 1;
          }
        });
        console.log("Counts for users with approved submissions:", userCounts);

        // --- Step 4: Combine data - Update scores for users with submissions ---
        Object.keys(userCounts).forEach((userId) => {
          if (allUsers[userId]) {
            // Update score if user exists in our allUsers map
            allUsers[userId].score = userCounts[userId];
          } else {
            // This case shouldn't happen often if submissions have valid userIds
            // but handles potential orphaned submissions
            console.warn(
              `User ID ${userId} found in submissions but not in 'user' collection.`
            );
            // Optionally add them with a placeholder name if desired
            // allUsers[userId] = { username: `User...${userId.slice(-4)}`, score: userCounts[userId] };
          }
        });

        // --- Step 5: Convert the allUsers map to an array ---
        const formattedData = Object.entries(allUsers).map(
          ([userId, userData]) => ({
            id: userId,
            username: userData.username,
            score: userData.score, // Score is now correctly 0 or the count
          })
        );

        // --- Step 6: Sort the final array by score descending ---
        formattedData.sort((a, b) => b.score - a.score);

        console.log("Final Formatted Leaderboard Data:", formattedData);
        setLeaderboardData(formattedData); // Set the final state

      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setLeaderboardData([]); // Clear data on error
      } finally {
        setIsLoadingLeaderboard(false); // Set loading state to false
      }
    };

    fetchLeaderboard();

  }, [isLeaderboardOpen]); // Dependency: re-run when isLeaderboardOpen changes

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
          // Optional: Clear the image state if they already captured it
          // setImage(null);
        } else {
          // ---vvv--- MODIFIED PART ---vvv---
          // Checks passed & not submitted before. Now check if image exists in state.
          if (image) {
            console.log(
              "Close enough, image selected, & not submitted. Proceeding with upload."
            );
            // Call the upload function directly with the file from state
            uploadPhotoAndUpdateFirestore(image, currentUserId, dropData.id);
            // Optional: Clear image state immediately after starting upload attempt
            // setImage(null);
          } else {
            // This case means the checks passed, but no image was selected beforehand.
            console.error(
              "Capture attempt approved, but no image is selected in state."
            );
            alert(
              "An image is required to capture the drop. Please select one first."
            );
            // You might want to prompt the user to select an image here,
            // depending on your UI flow (e.g., trigger the original fileInputRef if it still exists)
            // fileInputRef.current?.click(); // Example: Trigger input if needed
          }
          // ---^^^--- END OF MODIFIED PART ---^^^---
        }
      } catch (error) {
        console.error("Error checking for existing submission:", error);
        alert("Could not verify submission status. Please try again.");
        // Optional: Ensure isUploading is false if an error occurs here
        // if (typeof setIsUploading === 'function') setIsUploading(false);
      }
    } else {
      alert(
        `Too far! You are ${distance.toFixed(
          0
        )}m away. Get within ${DISTANCE_THRESHOLD_METERS}m.`
      );
    }
  };

  // --- Upload Logic ---
  const uploadPhotoAndUpdateFirestore = async (file, userId, dropId) => {
    // Ensure you have setIsUploading state setter available in this scope
    if (typeof setIsUploading === "function") setIsUploading(true);

    // Add a check if the file is valid before proceeding
    if (!file || !(file instanceof File)) {
      console.error("Upload function called without a valid file:", file);
      alert("Cannot upload: Invalid file provided.");
      if (typeof setIsUploading === "function") setIsUploading(false);
      return; // Stop execution if file is invalid
    }

    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${userId}-${dropId}-${timestamp}.${fileExtension}`;
    const filePath = `submissions/${dropId}/${uniqueFileName}`; // Organise uploads by dropId
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Optional progress tracking
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
        // You could update state here to show progress visually
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error.message}`);
        if (typeof setIsUploading === "function") setIsUploading(false);
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
            timestamp: serverTimestamp(),
            status: "Pending",
            // Add userPosition if it's available and needed
            ...(userPosition && {
              captureLocation: new GeoPoint(userPosition.lat, userPosition.lng),
            }),
          };

          await addDoc(submissionsRef, submissionData);
          console.log("Submission record added for drop:", dropId);
          alert("Drop captured successfully!");

          // Reset UI state after successful capture
          if (typeof setSelectedDrop === "function") setSelectedDrop(null); // Close InfoWindow/Overlay
          if (typeof setMapZoom === "function") setMapZoom(DEFAULT_ZOOM); // Reset zoom
          if (typeof setImage === "function") setImage(null); // Clear the selected image state
        } catch (firestoreError) {
          console.error(
            "Error adding submission to Firestore:",
            firestoreError
          );
          // Inform user about the specific error phase
          alert(
            `Capture successful, but saving failed: ${firestoreError.message}. Please try refreshing.`
          );
          // Note: The image *is* uploaded to storage here, but the Firestore record failed.
          // You might need manual cleanup or retry logic depending on requirements.
        } finally {
          // Ensure uploading state is reset regardless of Firestore success/failure
          if (typeof setIsUploading === "function") setIsUploading(false);
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
  };
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
    }
  };
  // --- Render ---
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%", // Use 100vh for full viewport height
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
        onImageChange={handleImageChange}
        selectedImageFile={image}
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
