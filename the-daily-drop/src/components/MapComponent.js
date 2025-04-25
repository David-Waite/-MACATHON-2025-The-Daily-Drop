// src/components/MapComponent.js
import React, { useState, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  CircleF, // <-- Make sure CircleF is imported
} from "@react-google-maps/api";

// --- Map Styling & Configuration ---
const containerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: true,
  keyboardShortcuts: false,
  clickableIcons: false,
  // zoomControl: true, // Optional: Add zoom control if needed
};

// Define circle options separately for clarity
const circleOptions = {
  strokeColor: "#8AB4F8", // Lighter blue for stroke
  strokeOpacity: 0.6,
  strokeWeight: 1,
  fillColor: "#8AB4F8", // Lighter blue for fill
  fillOpacity: 0.2,
  clickable: false, // The circle itself shouldn't be clickable
  draggable: false,
  editable: false,
  visible: true,
  zIndex: 1, // Lower zIndex than the central marker
};

const libraries = ["places"];

function MapComponent({
  userPosition,
  userAccuracy, // <-- IMPORTANT: Receive accuracy in meters from parent
  drops = [],
  selectedDrop,
  onDropClick,
  onInfoWindowClose,
  onCaptureAttempt,
  isUploading,
  center,
  defaultCenter,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_Maps_API_KEY,
    libraries: libraries,
  });

  const [map, setMap] = useState(null);

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    console.log("Map loaded.");
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    console.log("Map unmounted.");
  }, []);

  // --- Render Logic ---
  if (loadError) {
    return <div>Error loading map: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  const mapCenter = center || userPosition || defaultCenter;

  // --- Icon Definitions ---

  // Drop Icon (Gift Pin)
  const customDropIcon = {
    url: "/icons/giftPin.png",
    scaledSize: new window.google.maps.Size(30, 40),
    origin: new window.google.maps.Point(0, 0),
    anchor: new window.google.maps.Point(15, 40),
  };

  // User Location Icon (Central Blue Dot - CONSTANT SIZE)
  // Using SVG path is efficient
  const userLocationIcon = {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 8, // <--- This controls the dot's size, keep it constant
    fillColor: "#1976D2", // Standard blue
    fillOpacity: 1.0,
    strokeColor: "#ffffff", // White border for contrast
    strokeWeight: 2,
    anchor: new window.google.maps.Point(0, 0), // Center anchor for CIRCLE
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={16}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {/* === User Location Rendering === */}

      {/* 1. Accuracy Circle (Size based on userAccuracy prop in meters) */}
      {userPosition && typeof userAccuracy === "number" && userAccuracy > 0 && (
        <CircleF
          center={userPosition}
          radius={userAccuracy} // Dynamically set radius in meters
          options={circleOptions} // Apply the styling options
        />
      )}

      {/* 2. Central Blue Dot Marker (Constant visual size) */}
      {userPosition && (
        <MarkerF
          position={userPosition}
          title={"You are here"}
          icon={userLocationIcon} // Use the constant size blue dot icon
          zIndex={5} // Ensure dot is above the circle
          // No need for scaledSize if using 'scale' with SVG path
        />
      )}

      {/* Drop Markers */}
      {drops.map((drop) => (
        <MarkerF
          key={drop.id}
          position={drop.position}
          title={drop.name || "Unnamed Drop"}
          icon={customDropIcon}
          onClick={() => onDropClick(drop)}
          zIndex={3} // Lower zIndex than user marker/circle
        />
      ))}

      {/* Selected Drop InfoWindow */}
      {selectedDrop && (
        <InfoWindowF
          position={selectedDrop.position}
          onCloseClick={onInfoWindowClose}
          zIndex={10} // InfoWindows usually highest
        >
          <div>
            {/* ... InfoWindow content ... */}
            <h4>{selectedDrop.name || "Unnamed Drop"}</h4>
            <p>
              Expires:{" "}
              {selectedDrop.endTime?.toDate().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "N/A"}
            </p>
            <button
              onClick={() => onCaptureAttempt(selectedDrop)}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Attempt Capture"}
            </button>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}

export default React.memo(MapComponent);
