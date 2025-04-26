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
  // Only show minutes and seconds for this format
  // const hours = Math.floor(totalMinutes / 60);

  // let parts = [];
  // if (hours > 0) parts.push(`${hours}h`);
  // if (minutes > 0 || hours > 0) parts.push(`${minutes}m`); // Show minutes if hours > 0
  // parts.push(`${seconds}s`);
  // return `${parts.join(" ")}`;

  // Format as M:SS
  const displayMinutes = String(minutes);
  const displaySeconds = String(seconds).padStart(2, "0");
  return `${displayMinutes}:${displaySeconds}`;
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
  onImageChange,
  selectedImageFile,
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

  const hiddenInputStyle = {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px", // Offset to ensure it's truly off-screen
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)", // Clip visibility
    whiteSpace: "nowrap", // Prevent line wrapping affecting layout
    borderWidth: 0, // No border
  };

  // --- UPDATED Button Style ---
  const buttonLabelStyle = {
    // display: "block", // No longer block
    // width: "100%", // No longer full width
    padding: "10px 20px", // Adjusted padding
    // --- Conditional Background Color ---
    backgroundColor: isUploading
      ? "#a381d6" // Lighter purple when uploading (disabled look)
      : selectedImageFile
      ? "#5a3c9e" // Darker purple when ready to capture (indicates action change)
      : "#6F42C1", // Default purple when asking to select
    border: "none", // No border
    color: "white", // Text color
    borderRadius: "20px", // More rounded corners
    textAlign: "center", // Center the text
    // --- Conditional Cursor ---
    cursor: isUploading ? "not-allowed" : "pointer", // Indicate non-interactive state
    fontSize: "14px", // Adjusted font size
    fontWeight: "bold", // Adjust as needed
    // --- Conditional Opacity ---
    opacity: isUploading ? 0.7 : 1, // Dim when uploading
    userSelect: "none", // Prevent text selection on clicking the label
    // boxSizing: "border-box", // Not needed if not block/width 100%
    whiteSpace: "nowrap", // Prevent text wrapping
  };

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
          // Optionally call onCloseInfoWindow here if the timer expires?
          // onInfoWindowClose();
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
  }, [selectedDrop, onInfoWindowClose]); // Added onInfoWindowClose dependency if used in cleanup

  // --- Dynamic Map Options ---
  const mapOptions = useMemo(
    () => ({
      ...baseMapOptions,
      // Keep map draggable even when a drop is selected for this version
      // draggable: !selectedDrop,
    }),
    [] // No dependency needed if always draggable
  );

  // --- OverlayView Positioning ---
  const getInfoWindowOffset = useCallback((offsetWidth, offsetHeight) => {
    // Offset for the main InfoWindow-like overlay, relative to marker anchor
    // Adjust vertical offset slightly if needed to better position the larger box
    return { x: -(offsetWidth / 2), y: -(offsetHeight + 50) }; // Increased vertical offset
  }, []);

  // --- Offset for the pulsing animation ---
  const getPulseOffset = useCallback((offsetWidth, offsetHeight) => {
    // Center the pulse div (whose size is defined in CSS)
    // directly over the coordinate point (lat/lng).
    // Using your fine-tuned values:
    return {
      x: -(offsetWidth / 2) - 30,
      y: -(offsetHeight + 40),
    };
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
    // Anchor still defines where the *icon* is placed relative to the coordinate
    anchor: new window.google.maps.Point(15, 40),
  };

  return (
    <>
      {/* Style tag for pulse animation (remains the same) */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(0.9);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.3);
              opacity: 0.3;
            }
            100% {
              transform: scale(0.9);
              opacity: 0.7;
            }
          }

          .pulse-effect {
            width: 60px; /* Adjust size as needed */
            height: 60px;
            background-color: rgba(255, 0, 100, 0.5); /* Pinkish pulse color */
            border-radius: 50%;
            animation: pulse 1.5s infinite ease-in-out;
            pointer-events: none; /* Prevent pulse from intercepting clicks */
            position: absolute; /* Needed for correct positioning via offset */
          }
        `}
      </style>

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
              zIndex={5} // User marker above drops
            />
          </>
        )}

        {/* Drop Markers and their Pulses */}
        {drops.map((drop) => (
          // Use React.Fragment to group marker and its pulse overlay
          <React.Fragment key={drop.id}>
            {/* --- Pulsing effect for THIS drop (conditionally rendered) --- */}
            {(!selectedDrop || drop.id !== selectedDrop.id) &&
              drop.position && (
                <OverlayViewF
                  position={drop.position} // Position pulse at the drop's coordinate
                  mapPaneName={OverlayView.OVERLAY_LAYER} // Render below markers
                  getPixelPositionOffset={getPulseOffset} // Use the SIMPLIFIED offset
                >
                  <div className="pulse-effect"></div>
                </OverlayViewF>
              )}

            {/* The actual Drop Marker */}
            <MarkerF
              position={drop.position}
              title={drop.name || "Unnamed Drop"}
              icon={customDropIcon} // Icon uses its own anchor point
              onClick={() => onDropClick(drop)}
              zIndex={3} // Drop markers above pulse, below user
            />
          </React.Fragment>
        ))}

        {/* Selected Drop OverlayView (InfoWindow-like) - Renders only when a drop IS selected */}
        {selectedDrop && selectedDrop.position && (
          <OverlayViewF
            position={selectedDrop.position}
            mapPaneName={OverlayView.FLOAT_PANE} // Render above most things
            getPixelPositionOffset={getInfoWindowOffset} // Use updated offset for this overlay
          >
            {/* --- Container with updated styles --- */}
            <div
              style={{
                background: "white",
                padding: "20px", // Increased padding
                borderRadius: "16px", // More rounded corners
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)", // Softer shadow
                // Use min/max width for better responsiveness
                width: "85vw", // Use viewport width percentage
                maxWidth: "380px", // Max width constraint
                minWidth: "280px", // Min width constraint
                position: "relative",
                // Removed fixed height, let content determine height
                // height: "calc(100vw - 40px)",
                // maxHeight: "600px",
                overflow: "hidden", // Hide overflow initially
                pointerEvents: "auto", // Ensure this overlay IS interactive
                display: "flex", // Use flexbox for layout
                flexDirection: "column", // Stack elements vertically
                gap: "12px", // Add gap between elements
              }}
              // Stop propagation handlers remain the same
              onClick={stopPropagation}
              onMouseDown={stopPropagation}
              onMouseUp={stopPropagation}
              onTouchStart={stopPropagation}
              onTouchEnd={stopPropagation}
              onPointerDown={stopPropagation}
              onPointerUp={stopPropagation}
            >
              {/* Close button (Keep as is) */}
              <button
                onClick={onInfoWindowClose}
                style={{
                  position: "absolute",
                  top: "8px", // Adjust position slightly
                  right: "8px",
                  background: "transparent",
                  border: "none",
                  fontSize: "22px", // Slightly larger
                  fontWeight: "bold",
                  color: "#aaa", // Lighter color
                  cursor: "pointer",
                  padding: "5px",
                  lineHeight: "1",
                  zIndex: 1, // Ensure button is clickable above content
                }}
                aria-label="Close"
              >
                &times;
              </button>

              {/* --- Top Section: Name and Reward --- */}
              <div style={{ textAlign: "center", paddingRight: "20px" }}>
                {" "}
                {/* Add padding to avoid overlap with close btn */}
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: "4px", // Reduced margin
                    fontSize: "2em", // Larger font size for name
                    fontWeight: "bold", // Bold name
                    color: "#495057",
                  }}
                >
                  {selectedDrop.name || "Unnamed Drop"}
                </h2>
                {/* Display Reward */}
                {selectedDrop.reward && (
                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: "10px", // Space below reward
                      fontSize: "0.9em", // Standard size for reward text
                      color: "#495057", // Grey color for reward

                    }}
                  >
                    Reward: {selectedDrop.reward}
                  </p>
                )}
              </div>

              {/* --- Middle Section: Image --- */}
              {selectedDrop.imageUrl && (
                <img
                  src={selectedDrop.imageUrl}
                  alt={selectedDrop.name || "Drop image"}
                  style={{
                    width: "100%", // Make image fill container width
                    // Let height be auto based on aspect ratio, but limit it
                    maxHeight: "calc(min(50vh, 300px))", // Limit height relative to viewport or fixed max
                    objectFit: "cover", // Cover the area
                    borderRadius: "8px", // Rounded corners for image
                    display: "block", // Remove extra space below image
                    // marginBottom: "10px", // Gap handles spacing now
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}

              {/* --- Bottom Section: Countdown and Button --- */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center", // Vertically align items
                  justifyContent: "space-between", // Space out timer and button
                  marginTop: "5px", // Add some space above this section
                }}
              >
                {/* Countdown Timer */}
                <div
                  style={{
                    color: "#333",
                    fontSize: "2.2em", // Larger font size for timer
                    fontWeight: "bold", // Bold timer
                    fontVariantNumeric: "tabular-nums", // Keep numbers aligned
                  }}
                >
                  {countdownText || "..."}{" "}
                  {/* Display countdown state or loading */}
                </div>

                {/* Action Button Area */}
                <div>
                  {/* Hidden actual file input */}
                  <input
                    type="file"
                    accept="image/*" // Only allow image files
                    onChange={onImageChange} // Calls parent handler when a file is selected
                    id="hidden-file-input" // Unique ID for the label to reference
                    style={hiddenInputStyle} // Apply styles to hide it
                    disabled={isUploading} // Disable if uploading
                  />

                  {/* Styled Label acting as the button */}
                  <label
                    htmlFor={
                      !selectedImageFile && !isUploading
                        ? "hidden-file-input"
                        : undefined
                    }
                    style={buttonLabelStyle} // Apply the UPDATED button styles
                    onClick={
                      selectedImageFile && !isUploading
                        ? () => onCaptureAttempt(selectedDrop)
                        : undefined
                    }
                    role="button" // Semantic role
                    aria-disabled={isUploading} // Accessibility state
                    tabIndex={isUploading ? -1 : 0} // Control focusability
                  >
                    {/* Conditional Button Text */}
                    {isUploading
                      ? "Uploading..."
                      : selectedImageFile
                      ? "Capture" // Shorter text
                      : "Take Photo"}
                  </label>
                </div>
              </div>
            </div>
          </OverlayViewF>
        )}
      </GoogleMap>
    </>
  );
}

export default React.memo(MapComponent);
