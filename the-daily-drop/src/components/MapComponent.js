// src/components/MapComponent.js

import React, {
  useState,
  useEffect, // <-- Re-added useEffect for the countdown
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  CircleF,
  OverlayView,
  OverlayViewF,
} from "@react-google-maps/api";

// --- Constants, Styles, etc. ---
const containerStyle = { width: "100%", height: "100%" };
const baseMapOptions = {
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

// --- Helper function to format countdown time ---
function formatTimeDifference(ms) {
  if (ms <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`); // Show minutes if hours > 0
  parts.push(`${seconds}s`);

  return `${parts.join(" ")}`;
}

function MapComponent({
  userPosition,
  userAccuracy,
  drops = [],
  selectedDrop,
  onDropClick,
  onInfoWindowClose,
  onCaptureAttempt,
  isUploading,
  center,
  zoom,
  defaultCenter,
  onMapClick,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_Maps_API_KEY,
    libraries: libraries,
  });

  const mapRef = useRef(null);
  const [countdownText, setCountdownText] = useState(""); // State for the countdown display
  const intervalRef = useRef(null); // Ref to store interval ID

  // --- Callbacks ---
  const onLoad = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    console.log("Map loaded.");
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    if (intervalRef.current) {
      // Clear interval on unmount
      clearInterval(intervalRef.current);
    }
    console.log("Map unmounted.");
  }, []);

  // --- Countdown Timer Effect ---
  useEffect(() => {
    // Clear any existing interval when selectedDrop changes or component unmounts
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start a new interval only if a drop with an endTime is selected
    if (selectedDrop && selectedDrop.endTime) {
      const endTimeDate = selectedDrop.endTime.toDate(); // Convert Firestore Timestamp to JS Date

      const updateCountdown = () => {
        const now = new Date();
        const diff = endTimeDate.getTime() - now.getTime(); // Difference in milliseconds

        setCountdownText(formatTimeDifference(diff)); // Update state with formatted time

        if (diff <= 0) {
          clearInterval(intervalRef.current); // Stop interval when expired
          intervalRef.current = null;
        }
      };

      updateCountdown(); // Initial update immediately
      intervalRef.current = setInterval(updateCountdown, 1000); // Update every second
    } else {
      setCountdownText(""); // Clear text if no drop is selected or no endTime
    }

    // Cleanup function for the effect
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedDrop]); // Rerun effect when selectedDrop changes

  // --- Dynamic Map Options ---
  const mapOptions = useMemo(
    () => ({
      ...baseMapOptions,
      draggable: !selectedDrop,
    }),
    [selectedDrop]
  );

  // --- OverlayView Positioning ---
  const getPixelPositionOffset = useCallback((offsetWidth, offsetHeight) => {
    return { x: -(offsetWidth / 2), y: -(offsetHeight + 44) };
  }, []);

  // --- Event Handler Helper ---
  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // --- Render Logic ---
  if (loadError) return <div>Error loading map: {loadError.message}</div>;
  if (!isLoaded) return <div>Loading Map...</div>;

  const mapCenter = center || defaultCenter;
  const userLocationIcon = {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: "#1976D2",
    fillOpacity: 1.0,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    anchor: new window.google.maps.Point(0, 0),
  };
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
      zoom={zoom}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={onMapClick}
    >
      {/* === User Location Rendering === */}
      {userPosition && (
        <>
          {typeof userAccuracy === "number" && userAccuracy > 0 && (
            <CircleF
              center={userPosition}
              radius={userAccuracy}
              options={circleOptions}
            />
          )}
          <MarkerF
            position={userPosition}
            title={"You are here"}
            icon={userLocationIcon}
            zIndex={5}
          />
        </>
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

      {/* Selected Drop OverlayView */}
      {selectedDrop && selectedDrop.position && (
        <OverlayViewF
          position={selectedDrop.position}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={getPixelPositionOffset}
        >
          <div
            style={{
              background: "white",
              padding: "15px",
              zIndex: 1000,
              borderRadius: "8px",
              boxShadow: "0 2px 7px 1px rgba(0, 0, 0, 0.3)",
              width: "calc(100vw - 40px)",
              height: "calc(100vw - 40px)",

              maxWidth: "600px",
              maxHeight: "600px",
              position: "relative",
              overflow: "auto",
            }}
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onTouchStart={stopPropagation}
            onTouchEnd={stopPropagation}
            onPointerDown={stopPropagation}
            onPointerUp={stopPropagation}
          >
            {/* Close button */}
            <button
              onClick={onInfoWindowClose}
              style={{
                position: "absolute",
                top: "0px",
                right: "0px",
                background: "transparent",
                border: "none",
                fontSize: "18px",
                fontWeight: "bold",
                color: "#555",
                cursor: "pointer",
                padding: "5px",
                lineHeight: "1",
                zIndex: 1,
              }}
              aria-label="Close"
            >
              &times;
            </button>

            {/* Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
              }}
            >
              <div>
                {selectedDrop.imageUrl && (
                  <img
                    src={selectedDrop.imageUrl}
                    alt={selectedDrop.name || "Drop image"}
                    style={{
                      width: "100%",
                      height: "calc(100vw - 140px)",
                      maxHeight: "500px",
                      objectFit: "cover",
                      marginBottom: "10px",
                      borderRadius: "4px",
                      display: "block",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
                <h4
                  style={{
                    marginTop: 0,

                    marginBottom: "8px",
                    fontSize: "16px", // Increased font size
                    fontWeight: "100",
                    paddingRight: "25px",
                  }}
                >
                  {selectedDrop.name || "Unnamed Drop"}
                </h4>
              </div>
              <div>
                <div
                  style={{
                    display: "flex",

                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#495057",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: 1000,
                      }}
                    >
                      {countdownText || "Loading..."}{" "}
                      {/* Display countdown state or loading */}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => onCaptureAttempt(selectedDrop)}
                      disabled={isUploading}
                      style={{
                        width: "100%",
                        paddingTop: "8px",
                        paddingBottom: "8px",
                        paddingLeft: "12px",
                        paddingRight: "12px",
                        backgroundColor: "#6F42C1",
                        border: "none",
                        color: "white",
                        borderRadius: 15,
                      }}
                    >
                      {isUploading ? "Uploading..." : "Take Photo"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- END UPDATE --- */}
          </div>
        </OverlayViewF>
      )}
    </GoogleMap>
  );
}

export default React.memo(MapComponent);
