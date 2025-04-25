// src/components/MapComponent.js
import React, { useState, useEffect, useRef, useCallback } from "react"; // Added useRef
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  CircleF,
} from "@react-google-maps/api";

// --- Timing and Animation ---
const ANIMATION_DURATION_MS = 500; // How long the animation should take (adjust as needed)

// Linear interpolation function
const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

// --- Map Styling & Configuration ---
const containerStyle = {
  width: "100%",
  height: "100%",
};
const mapOptions = {
  disableDefaultUI: true,
  keyboardShortcuts: false,
  clickableIcons: false,
};
const circleOptions = {
  strokeColor: "#8AB4F8",
  strokeOpacity: 0.6,
  strokeWeight: 1,
  fillColor: "#8AB4F8",
  fillOpacity: 0.2,
  clickable: false,
  draggable: false,
  editable: false,
  visible: true,
  zIndex: 1,
};
const libraries = ["places"];

// --- Component ---

function MapComponent({
  userPosition, // This is the TARGET position from the parent
  userAccuracy,
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
  const [userMarkerInstance, setUserMarkerInstance] = useState(null); // State to hold the marker instance
  const [renderedPosition, setRenderedPosition] = useState(userPosition); // State for the marker's CURRENT animated position

  // Refs for animation state to avoid unnecessary effect triggers
  const animationFrameId = useRef(null);
  const animationStartTime = useRef(null);
  const animationStartPosition = useRef(null);
  const animationTargetPosition = useRef(null);

  // --- Map Load/Unload Callbacks ---
  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    console.log("Map loaded.");
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    // Cancel any ongoing animation when map unmounts
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    console.log("Map unmounted.");
  }, []);

  // --- User Marker Load Callback ---
  const onUserMarkerLoad = useCallback(
    (marker) => {
      console.log("User marker loaded.");
      setUserMarkerInstance(marker);
      // Initialize rendered position when marker loads if not already set
      setRenderedPosition((prev) => prev ?? userPosition);
    },
    [userPosition]
  ); // Dependency needed if userPosition is available on first load

  // --- Animation Effect ---
  useEffect(() => {
    // Ensure we have the marker instance and a new target position
    if (!userMarkerInstance || !userPosition) {
      // If user position becomes null, stop animation and reset rendered position
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      // Optionally set renderedPosition to null or keep last known?
      // setRenderedPosition(userPosition); // Sync if target becomes null
      return;
    }

    // Update target position ref
    animationTargetPosition.current = userPosition;

    // Set the start position for the animation
    // If no animation is running, start from the current rendered position
    if (!animationFrameId.current) {
      animationStartPosition.current = renderedPosition ?? userPosition; // Use current rendered or target if null
      // Only start a new animation if the target is different enough from start
      // (Avoids tiny animations for minimal changes) - Optional threshold check can be added here
      if (
        !animationStartPosition.current ||
        animationStartPosition.current.lat !==
          animationTargetPosition.current.lat ||
        animationStartPosition.current.lng !==
          animationTargetPosition.current.lng
      ) {
        animationStartTime.current = performance.now();
        startAnimation();
      }
    }
    // If an animation IS already running, the loop will pick up the new target position naturally

    // Cleanup function for this effect run (doesn't cancel animation here)
    return () => {
      // Cancel animation only if the component unmounts or marker instance disappears
      // Handled in onUnmount and the initial check of this effect
    };

    // Dependencies: Run when the TARGET position changes or the marker instance becomes available
  }, [userPosition, userMarkerInstance, renderedPosition]); // renderedPosition needed to define start point if animation isn't running

  // Separate function to request and manage the animation frame loop
  const startAnimation = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current); // Cancel previous frame if any
    }
    animationFrameId.current = requestAnimationFrame(animationLoop);
  };

  // --- Animation Loop ---
  const animationLoop = (timestamp) => {
    if (
      !animationStartTime.current ||
      !animationStartPosition.current ||
      !animationTargetPosition.current ||
      !userMarkerInstance
    ) {
      animationFrameId.current = null; // Stop if state is invalid
      return;
    }

    const elapsed = timestamp - animationStartTime.current;
    const progress = Math.min(1, elapsed / ANIMATION_DURATION_MS); // Ensure progress doesn't exceed 1

    // Interpolate latitude and longitude
    const currentLat = lerp(
      animationStartPosition.current.lat,
      animationTargetPosition.current.lat,
      progress
    );
    const currentLng = lerp(
      animationStartPosition.current.lng,
      animationTargetPosition.current.lng,
      progress
    );
    const newRenderedPos = { lat: currentLat, lng: currentLng };

    // Directly update the marker's position on the map
    userMarkerInstance.setPosition(newRenderedPos);
    // Update React state for the rendered position (important for next animation start point)
    setRenderedPosition(newRenderedPos);

    if (progress < 1) {
      // Continue animation
      animationFrameId.current = requestAnimationFrame(animationLoop);
    } else {
      // Animation finished
      console.log(
        "Animation finished at target:",
        animationTargetPosition.current
      );
      setRenderedPosition(animationTargetPosition.current); // Ensure final state matches target
      animationFrameId.current = null; // Clear the animation ID
      animationStartTime.current = null;
      animationStartPosition.current = null;
      // Target ref remains for next update comparison
    }
  };

  // --- Render Logic ---
  if (loadError) return <div>Error loading map: {loadError.message}</div>;
  if (!isLoaded) return <div>Loading Map...</div>;

  // Map center is controlled by parent now
  const mapCenter = center || defaultCenter;

  // User Location Icon (Constant Size Blue Dot)
  const userLocationIcon = {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: "#1976D2",
    fillOpacity: 1.0,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    anchor: new window.google.maps.Point(0, 0),
  };

  // Drop Icon (Gift Pin)
  const customDropIcon = {
    url: "/icons/giftPin.png",
    scaledSize: new window.google.maps.Size(30, 40),
    origin: new window.google.maps.Point(0, 0),
    anchor: new window.google.maps.Point(15, 40),
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={16} // Or pass zoom from parent if needed
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {/* === User Location Rendering === */}

      {/* 1. Accuracy Circle (Positioned based on the animated renderedPosition) */}
      {renderedPosition &&
        typeof userAccuracy === "number" &&
        userAccuracy > 0 && (
          <CircleF
            center={renderedPosition} // <-- Use renderedPosition for circle center
            radius={userAccuracy}
            options={circleOptions}
          />
        )}

      {/* 2. Central Blue Dot Marker (Uses renderedPosition, gets instance via onLoad) */}
      {/* Render marker only when we have an initial position */}
      {(userPosition || renderedPosition) && (
        <MarkerF
          // Use renderedPosition for display, but don't list it as a dependency for onLoad
          position={renderedPosition ?? userPosition} // Use current animated position, fallback to target
          title={"You are here"}
          icon={userLocationIcon}
          zIndex={5}
          onLoad={onUserMarkerLoad} // <-- Get the marker instance
          // Optimization: prevent marker re-renders just due to position prop changing
          // The animation loop updates the instance directly.
          // However, we DO need it to render initially at the right spot.
          // Keying it might cause remounts, which we don't want.
          // Let's rely on `setPosition` in the loop.
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
          zIndex={3}
        />
      ))}

      {/* Selected Drop InfoWindow */}
      {selectedDrop && (
        <InfoWindowF
          position={selectedDrop.position}
          onCloseClick={onInfoWindowClose}
          zIndex={10}
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

// Memoize based on props, but be aware animation state is internal
export default React.memo(MapComponent);
