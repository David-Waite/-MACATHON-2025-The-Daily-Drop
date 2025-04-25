import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";

// --- Firebase Imports ---
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  GeoPoint,
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth"; // Import Firebase Auth
import { useNavigate } from "react-router-dom"; // For redirect after logout

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

// --- Map Styling & Configuration ---
const containerStyle = {
  width: "100%",
  height: "100vh",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
};

const libraries = ["places"];

function MapComponent({ userId }) {
  const [userPosition, setUserPosition] = useState(null);
  const [drops, setDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [map, setMap] = useState(null);

  const defaultCenter = { lat: -37.8111, lng: 144.9469 };
  const DISTANCE_THRESHOLD_METERS = 30;

  const navigate = useNavigate(); // For redirect after logout
  const fileInputRef = useRef(null); // Create a ref for the file input
  const [isUploading, setIsUploading] = useState(false); // State for loading indicator
  const [dropToSubmit, setDropToSubmit] = useState(null); // Store drop info during upload
  // --- Logout Function ---
  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        console.log("User signed out");
        navigate("/login"); // Redirect to login page
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  // --- User Location ---
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error("Error getting user location:", error);
        if (!userPosition) {
          setUserPosition(defaultCenter);
        }
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- Google Maps API Loader ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_Maps_API_KEY,
    libraries: libraries,
  });

  // --- Fetch Active Drops ---
  useEffect(() => {
    const dropsRef = collection(db, "drops");
    const now = Timestamp.now();
    const q = query(dropsRef, where("startTime", "<=", now));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const activeDrops = [];
        querySnapshot.forEach((doc) => {
          const dropData = doc.data();
          if (dropData.endTime && dropData.endTime >= now) {
            if (dropData.location instanceof GeoPoint) {
              activeDrops.push({
                id: doc.id,
                ...dropData,
                position: {
                  lat: dropData.location.latitude,
                  lng: dropData.location.longitude,
                },
              });
            }
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

  // --- Capture Attempt ---
  const handleCaptureAttempt = (dropData) => {
    // Pass the whole drop object now
    if (!userPosition) {
      // No need to check === defaultCenter here
      alert(
        "Could not get your current location. Please enable location services and wait for GPS fix."
      );
      return;
    }

    // Ensure dropData and its position exist
    if (!dropData || !dropData.position) {
      console.error("Drop data or position missing in handleCaptureAttempt");
      alert("Error: Could not identify the selected drop.");
      return;
    }

    const distance = getDistanceFromLatLonInKm(
      userPosition.lat,
      userPosition.lng,
      dropData.position.lat,
      dropData.position.lng
    );

    console.log(`Distance to drop: ${distance.toFixed(2)} meters`);

    if (distance <= DISTANCE_THRESHOLD_METERS) {
      // Store the drop data needed for submission
      setDropToSubmit(dropData);
      // Trigger the hidden file input
      fileInputRef.current.click();
    } else {
      alert(`Too far! Get within ${DISTANCE_THRESHOLD_METERS} meters.`);
    }
  };

  const onLoad = useCallback(
    function callback(mapInstance) {
      const initialCenter = userPosition || defaultCenter;
      mapInstance.setCenter(initialCenter);
      mapInstance.setZoom(16);
      setMap(mapInstance);
    },
    [userPosition, defaultCenter]
  );

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div>
        Error loading maps: {loadError.message} <br /> Make sure your API key is
        correct and billing is enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    const user = auth.currentUser; // Get current user

    // Make sure we still have the drop info and user is logged in
    if (!file || !dropToSubmit || !user) {
      console.error("File, drop info, or user missing for upload.");
      alert("Could not initiate upload. Please try again.");
      setDropToSubmit(null); // Clear the stored drop
      // Clear the file input value so onChange fires again if the same file is chosen
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Check if file is an image (basic check)
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      setDropToSubmit(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Start the upload process
    uploadPhotoAndUpdateFirestore(file, user.uid, dropToSubmit.id);

    // Clear the file input value after selection
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  return (
    <>
      {/* --- Logout Button --- */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 999 }}>
        <button onClick={handleLogout}>Log Out</button>
      </div>
      <input
        type="file"
        accept="image/*" // Allow any image type
        capture // On mobile, hints to use the camera directly
        style={{ display: "none" }} // Keep it hidden
        ref={fileInputRef}
        onChange={handleFileSelect} // We'll create this function next
      />

      <GoogleMap
        mapContainerStyle={containerStyle}
        zoom={16}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        center={{ lat: -37.8106, lng: 144.9545 }}
      >
        {userPosition && userPosition !== defaultCenter && (
          <MarkerF position={userPosition} title={"You are here"} />
        )}

        {drops.map((drop) => (
          <MarkerF
            key={drop.id}
            position={drop.position}
            onClick={() => {
              setSelectedDrop(drop);
            }}
          />
        ))}

        {selectedDrop && (
          <InfoWindowF
            position={selectedDrop.position}
            onCloseClick={() => {
              setSelectedDrop(null);
            }}
          >
            <div>
              <h4>{selectedDrop.name || "Unnamed Drop"}</h4>
              <p>
                Expires at:{" "}
                {selectedDrop.endTime?.toDate().toLocaleTimeString()}
              </p>
              <button
                onClick={() => handleCaptureAttempt(selectedDrop)} // Pass selectedDrop
                disabled={isUploading} // Disable button while uploading
              >
                {isUploading ? "Uploading..." : "Attempt Capture"}
              </button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </>
  );
}

export default MapComponent;
