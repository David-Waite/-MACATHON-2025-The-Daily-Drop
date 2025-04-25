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
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage, auth } from "../firebase"; // Ensure auth is imported correctly

// Import the map display component
import MapComponent from "../components/MapComponent"; // Adjust path if needed

// --- Geolocation Helper (Keep it here or move to a utils file) ---
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
  const [userPosition, setUserPosition] = useState(null);
  const [drops, setDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dropToSubmit, setDropToSubmit] = useState(null); // Store drop info during upload trigger

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const defaultCenter = { lat: -37.8111, lng: 144.9469 }; // Flagstaff Gardens approx
  const DISTANCE_THRESHOLD_METERS = 30; // Keep your desired threshold

  // --- Logout Function ---
  const handleLogout = () => {
    const authInstance = getAuth(); // Use getAuth()
    signOut(authInstance)
      .then(() => {
        console.log("User signed out");
        navigate("/login");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  // --- User Location ---
  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserPosition({ lat: latitude, lng: longitude });
          console.log("User position updated:", { latitude, longitude });
        },
        (error) => {
          console.error("Error getting user location:", error);
          // Maybe set to default or show error message?
          // For now, let's not set default here, MapComponent can handle null userPosition
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      // Handle lack of geolocation support
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- Fetch Active Drops ---
  useEffect(() => {
    const dropsRef = collection(db, "drops");
    const now = Timestamp.now();
    // Query for drops where the end time is in the future
    const q = query(dropsRef, where("endTime", ">=", now));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const activeDrops = [];
        const currentTime = Timestamp.now(); // Get current time again inside snapshot
        querySnapshot.forEach((doc) => {
          const dropData = doc.data();
          // Double check startTime is also valid (in the past or now)
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
        console.log("Fetched Active Drops:", activeDrops);
        setDrops(activeDrops);
      },
      (error) => {
        console.error("Error fetching drops:", error);
      }
    );

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []); // Empty dependency array means this runs once on mount

  // --- Capture Attempt Logic ---
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

    if (!dropData || !dropData.position || !dropData.id) {
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
          // Not submitted yet, trigger photo input
          console.log("User is close enough and hasn't submitted. Triggering photo input.");
          setDropToSubmit(dropData); // Store drop info for when file is selected
          fileInputRef.current?.click(); // Use optional chaining
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

  // --- File Selection Handler ---
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0]; // Use optional chaining
    const user = auth.currentUser;

    if (!file || !dropToSubmit || !user) {
      console.error("File, drop info, or user missing for upload.");
      if (!dropToSubmit) alert("Could not determine which drop to submit for. Please try capturing again.");
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

    // Proceed with upload
    uploadPhotoAndUpdateFirestore(file, user.uid, dropToSubmit.id);

    // Clear the file input value AFTER initiating the upload process
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- Upload and Firestore Update ---
  const uploadPhotoAndUpdateFirestore = async (file, userId, dropId) => {
    setIsUploading(true);
    setDropToSubmit(null); // Clear the temporary drop state immediately

    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${userId}-${dropId}-${timestamp}.${fileExtension}`; // Include dropId for clarity
    const filePath = `submissions/${dropId}/${uniqueFileName}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error.message}`);
        setIsUploading(false);
      },
      async () => {
        // Upload completed successfully
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at", downloadURL);

          const submissionsRef = collection(db, "submissions");
          const submissionData = {
            userId: userId,
            dropId: dropId,
            photoUrl: downloadURL,
            timestamp: serverTimestamp(),
            // Add user position at time of submission if desired
            // captureLocation: new GeoPoint(userPosition.lat, userPosition.lng)
          };

          await addDoc(submissionsRef, submissionData);
          console.log("Submission record added to Firestore for drop:", dropId);
          alert("Drop captured successfully!");
          setSelectedDrop(null); // Close the InfoWindow
        } catch (firestoreError) {
          console.error("Error adding submission to Firestore:", firestoreError);
          alert(`Capture failed (database error): ${firestoreError.message}`);
          // Consider how to handle this - maybe delete the uploaded photo?
        } finally {
          setIsUploading(false); // Ensure loading state is turned off
        }
      }
    );
  };

  // --- Navigation Handlers ---
  const handleGoToLeaderboard = () => {
    navigate("/leaderboard");
  };

  // --- Render ---
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* UI Elements Overlaying the Map */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
        <button onClick={handleLogout}>Log Out</button>
      </div>
      <div style={{ position: "absolute", bottom: 10, right: 10, zIndex: 10 }}>
        <button onClick={handleGoToLeaderboard}>Leaderboard</button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        capture // Prefer camera on mobile
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* Map Component */}
      <MapComponent
        userPosition={userPosition}
        drops={drops}
        selectedDrop={selectedDrop}
        onDropClick={setSelectedDrop} // Pass setter function directly
        onInfoWindowClose={() => setSelectedDrop(null)} // Pass clear function
        onCaptureAttempt={handleCaptureAttempt} // Pass the handler
        isUploading={isUploading}
        center={userPosition || defaultCenter} // Center on user or default
        defaultCenter={defaultCenter} // Pass default just in case
      />
    </div>
  );
}

export default MapPage;
