// src/components/MapComponent.js
import React, { useState, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";

// --- Map Styling & Configuration ---
const containerStyle = {
  width: "100%",
  height: "100%", // Make it fill the container from MapPage
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  // Consider adding gestureHandling: 'greedy' or 'cooperative'
};

const libraries = ["places"]; // Keep if needed, otherwise remove

function MapComponent({
  userPosition,
  drops = [], // Default to empty array
  selectedDrop,
  onDropClick,
  onInfoWindowClose,
  onCaptureAttempt,
  isUploading,
  center, // Receive center from parent
  defaultCenter, // Receive default center
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script", // Keep a unique ID
    googleMapsApiKey: process.env.REACT_APP_Maps_API_KEY, // Ensure this env var is accessible
    libraries: libraries,
  });

  const [map, setMap] = useState(null); // Keep local map instance if needed for internal map methods

  const onLoad = useCallback(
    (mapInstance) => {
      // No need to set center/zoom here if controlled by 'center' prop in GoogleMap
      // mapInstance.setCenter(center); // Usually not needed if 'center' prop is set
      // mapInstance.setZoom(16);      // Usually not needed if 'zoom' prop is set
      setMap(mapInstance);
      console.log("Map loaded.");
    },
    [] // No dependencies needed if not setting center/zoom manually
  );

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

  // Determine the center for the map. Prioritize received center, then userPosition, then default.
  const mapCenter = center || userPosition || defaultCenter;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter} // Control center via prop
      zoom={16} // Control zoom via prop (or pass as prop if needed)
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {/* User Marker */}
      {userPosition && (
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
          title={drop.name || "Unnamed Drop"}
          onClick={() => onDropClick(drop)} // Use the passed callback
          // Optional: Add a custom icon for drops
          // icon={{ url: '/path/to/drop-icon.png', scaledSize: new window.google.maps.Size(35, 35) }}
        />
      ))}

      {/* Selected Drop InfoWindow */}
      {selectedDrop && (
        <InfoWindowF
          position={selectedDrop.position}
          onCloseClick={onInfoWindowClose} // Use the passed callback
        >
          <div>
            <h4>{selectedDrop.name || "Unnamed Drop"}</h4>
            <p>
              Expires:{" "}
              {selectedDrop.endTime?.toDate().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "N/A"}
            </p>
            {/* Add distance display if userPosition is available */}
            {/* {userPosition && (
              <p>
                Distance:{" "}
                {getDistanceFromLatLonInKm(
                  userPosition.lat,
                  userPosition.lng,
                  selectedDrop.position.lat,
                  selectedDrop.position.lng
                ).toFixed(0)}
                m
              </p>
            )} */}
            <button
              onClick={() => onCaptureAttempt(selectedDrop)} // Use the passed callback
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

export default React.memo(MapComponent); // Memoize if props don't change often unnecessarily
