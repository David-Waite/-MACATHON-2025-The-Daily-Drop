import React, { useState, useEffect, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";

// --- Firebase Imports ---
import { db } from "../firebase"; // Adjust path
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  GeoPoint,
} from "firebase/firestore";

// --- Geolocation Helper (Haversine formula) ---
// (Same function as before)
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

// Optional: Add custom map styles from https://mapstyle.withgoogle.com/
// Or hide Points of Interest, etc.
const mapOptions = {
  // styles: customMapStyles, // Your custom style array
  disableDefaultUI: true, // Hide default controls like zoom, street view
  zoomControl: true, // Optionally re-enable zoom
  clickableIcons: false, // Prevent clicking on Google's default POIs
};

const libraries = ["places"]; // Optional: Add other libraries if needed

function MapComponent({ userId }) {
  const [userPosition, setUserPosition] = useState(null); // { lat: number, lng: number }
  const [drops, setDrops] = useState([]); // Array of drop objects
  const [selectedDrop, setSelectedDrop] = useState(null); // Track which InfoWindow to show
  const [map, setMap] = useState(null); // Reference to map instance

  // Default center (West Melbourne, VIC) - Use your uni's coords ideally
  const defaultCenter = { lat: -37.8111, lng: 144.9469 };

  const DISTANCE_THRESHOLD_METERS = 30;

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords; // Get accuracy
        console.log(`Position accuracy: ${accuracy} meters`); // Log it
        setUserPosition({ lat: latitude, lng: longitude });
        // Optional: You could display the accuracy radius visually on the map
        // Or disable actions if accuracy > threshold (e.g., > 50 meters)
      },
      (error) => {
        console.error("Error getting user location:", error);
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  // --- 1. Load Google Maps JavaScript API ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_Maps_API_KEY, // Your key from .env.local
    libraries: libraries,
  });

  // --- 2. Get User's Location ---
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error("Error getting user location:", error);
        // Handle case where location is denied - maybe center on default location
        if (!userPosition) {
          setUserPosition(defaultCenter); // Fallback to default center maybe?
        }
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId); // Cleanup
  }, []); // Empty dependency array

  // --- 3. Fetch Active Drops from Firestore ---
  useEffect(() => {
    const dropsRef = collection(db, "drops");
    const now = Timestamp.now();
    const q = query(dropsRef, where("startTime", "<=", now)); // Filter startTime

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const activeDrops = [];
        querySnapshot.forEach((doc) => {
          const dropData = doc.data();
          // Client-side filter for endTime
          if (dropData.endTime && dropData.endTime >= now) {
            if (dropData.location instanceof GeoPoint) {
              activeDrops.push({
                id: doc.id,
                ...dropData,
                // Convert GeoPoint for Google Maps
                position: {
                  lat: dropData.location.latitude,
                  lng: dropData.location.longitude,
                },
              });
            } else {
              console.warn(`Drop ${doc.id} has invalid location format.`);
            }
          }
        });
        console.log("Active Drops:", activeDrops);
        setDrops(activeDrops);
      },
      (error) => {
        console.error("Error fetching drops:", error);
      }
    );

    return () => unsubscribe(); // Cleanup listener
  }, []);

  // --- 4. Handle Drop Interaction ---
  const handleCaptureAttempt = (dropPosition) => {
    if (!userPosition || userPosition === defaultCenter) {
      // Check if we have a real user position
      alert(
        "Could not get your current location. Please enable location services."
      );
      return;
    }

    const distance = getDistanceFromLatLonInKm(
      userPosition.lat,
      userPosition.lng,
      dropPosition.lat,
      dropPosition.lng
    );

    console.log(`Distance to drop: ${distance.toFixed(2)} meters`);

    if (distance <= DISTANCE_THRESHOLD_METERS) {
      alert("You are close enough! Trigger photo upload here.");
      // --- TRIGGER YOUR PHOTO UPLOAD LOGIC ---
    } else {
      alert(`Too far! Get within ${DISTANCE_THRESHOLD_METERS} meters.`);
    }
  };

  // --- Map Callbacks ---
  const onLoad = useCallback(
    function callback(mapInstance) {
      // Center map initially, perhaps on user position if available, else default
      const initialCenter = userPosition || defaultCenter;
      mapInstance.setCenter(initialCenter);
      mapInstance.setZoom(16); // Adjust zoom level
      setMap(mapInstance); // Store map instance if needed
    },
    [userPosition, defaultCenter]
  ); // Re-run if userPosition changes before load

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  // --- Render Logic ---
  if (loadError) {
    return (
      <div>
        Error loading maps: {loadError.message} <br /> Make sure your API key is
        correct and billing is enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return <div>Loading Map...</div>; // Or a loading spinner
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      //   center={userPosition || defaultCenter} // Center map on user or default
      zoom={16} // Initial zoom
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      center={{ lat: -37.8106, lng: 144.9545 }}
    >
      {/* User Marker */}
      {userPosition &&
        userPosition !== defaultCenter && ( // Only show if real position found
          <MarkerF
            position={userPosition}
            title={"You are here"}
            // Optional: Add a custom icon for the user
            // icon={{ url: '/path/to/user-icon.png', scaledSize: new window.google.maps.Size(30, 30) }}
          />
        )}

      {/* Drop Markers */}
      {drops.map((drop) => (
        <MarkerF
          key={drop.id}
          position={drop.position}
          //   title={drop.name || "Unnamed Drop"}
          // Optional: Custom drop icon
          // icon={{ url: drop.iconUrl || '/path/to/default-drop-icon.png', scaledSize: new window.google.maps.Size(40, 40) }}
          //   onClick={() => {
          //     setSelectedDrop(drop); // Set this drop as selected to show InfoWindow
          //   }}
        />
      ))}

      {/* InfoWindow for Selected Drop */}
      {selectedDrop && (
        <InfoWindowF
          position={selectedDrop.position}
          onCloseClick={() => {
            setSelectedDrop(null); // Clear selection when closing InfoWindow
          }}
        >
          <div>
            <h4>{selectedDrop.name || "Unnamed Drop"}</h4>
            {/* Optional: Add description or image */}
            {/* <img src={selectedDrop.imageUrl} width="50" alt="drop"/> */}
            <p>
              Expires at: {selectedDrop.endTime?.toDate().toLocaleTimeString()}
            </p>
            <button onClick={() => handleCaptureAttempt(selectedDrop.position)}>
              Attempt Capture
            </button>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}

export default MapComponent;
