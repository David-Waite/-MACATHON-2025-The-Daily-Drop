// src/components/LeaderboardComponent.jsx
import React, { useState, useRef } from "react";
import { FaChevronDown } from "react-icons/fa";
import { useDrag } from "@use-gesture/react";
// Default placeholder data if nothing is passed or while loading initially
const placeholderData = [
  { id: "1", username: "Qwerty", score: 5716 },
  { id: "2", username: "Qwerty123", score: 3628 },
  { id: "3", username: "Qwerty123", score: 3422 },
  { id: "4", username: "Qwerty123", score: 2928 },
  { id: "5", username: "Qwerty123", score: 2668 },
  { id: "6", username: "Qwerty123", score: 2257 },
  { id: "7", username: "Qwerty123", score: 2043 },
  { id: "8", username: "Qwerty123", score: 1876 },
  { id: "9", username: "Qwerty123", score: 1753 },
  { id: "10", username: "Qwerty123", score: 1681 },
];

function LeaderboardComponent({
  onClose,
  isOpen, // Controls visibility and animation
  leaderboardData = [], // Default to empty array if prop not provided
  isLoading,
}) {
  // Determine what data to show: actual data if not loading, otherwise empty
  const dataToDisplay = !isLoading ? leaderboardData : [];

  // Use placeholder only if loading AND leaderboardData is empty (initial load)
  const showPlaceholder = isLoading && leaderboardData.length === 0;

// State to manage the temporary Y offset during drag for visual feedback
const [tempY, setTempY] = useState(0);
const panelRef = useRef(null); // Ref to apply styles directly if needed

// --- Swipe Gesture Handling ---
const bind = useDrag(
  ({
    active, // boolean: true when dragging, false when released
    movement: [, my], // vertical movement relative to start point (my = movementY)
    direction: [, dy], // direction of movement (-1 up, 0 neutral, 1 down)
    velocity: [, vy], // vertical velocity
    cancel, // function to cancel the gesture
  }) => {
    const panelHeight = panelRef.current?.offsetHeight || window.innerHeight * 0.75; // Estimate height
    const SWIPE_THRESHOLD = panelHeight * 0.3; // Need to swipe down at least 30% of panel height
    const VELOCITY_THRESHOLD = 0.3; // Minimum velocity for a flick

    if (active) {
      // Only allow dragging downwards from the initial open position
      // Update tempY for visual feedback only when moving down
      setTempY(my > 0 ? my : 0);
    } else {
      // Drag ended (finger lifted)
      const isSwipeDown = dy > 0; // Moving down
      const isFastEnough = vy > VELOCITY_THRESHOLD;
      const isFarEnough = my > SWIPE_THRESHOLD;

      // Check if it qualifies as a close gesture
      if (isSwipeDown && (isFarEnough || isFastEnough)) {
        console.log("Swipe down detected, closing.");
        onClose(); // Trigger the close action
      }
      // Reset temporary Y offset after drag ends (panel will animate via CSS)
      setTempY(0);
    }
  },
  {
    axis: "y", // Only track vertical dragging
    // Optional: prevent scrolling page while dragging panel
    // eventOptions: { passive: false },
    // filterTaps: true, // Ignore brief taps
    // threshold: 10, // Minimum movement pixels to trigger drag
  }
);
// --- End Swipe Handling ---

// Determine the transform style: prioritize tempY during drag, otherwise rely on isOpen class
const panelStyle = {
  // Apply temporary transform only when dragging down
  transform: tempY > 0 ? `translateY(${tempY}px)` : undefined,
  // Ensure transition is off during active drag for instant feedback,
  // but on otherwise so the open/close animation works.
  transition: tempY > 0 ? "none" : "transform 0.3s ease-in-out",
};


  return (
    <>
      {/* Inject styles directly into the component */}
      <style>
        {`
          .leaderboard-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0); /* Start transparent */
            z-index: 998; /* Below panel, above map */
            display: flex;
            align-items: flex-end; /* Align panel to bottom */
            transition: background-color 0.3s ease-in-out, visibility 0.3s, opacity 0.3s;
            visibility: hidden; /* Hide overlay when not open */
            opacity: 0;
          }

          .leaderboard-overlay.visible {
            background-color: rgba(0, 0, 0, 0.3); /* Fade in dimming */
            visibility: visible; /* Show overlay */
            opacity: 1;
          }

          .leaderboard-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-height: 75vh; /* Limit height */
            background-color: #f8f9fa; /* Light background */
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
            z-index: 999; /* Above overlay and map controls */
            transform: translateY(100%); /* Start hidden below */
            transition: transform 0.3s ease-in-out;
            display: flex;
            flex-direction: column;
            overflow: hidden; /* Prevent content spill */
          }

          .leaderboard-panel.open {
            transform: translateY(0); /* Slide up */
          }

          .leaderboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
            flex-shrink: 0;
          }

          .leaderboard-header h2 {
            margin: 0;
            font-size: 1.2em;
            font-weight: 600;
            text-align: center;
            flex-grow: 1;
          }

          .back-button {
            background: none;
            border: none;
            font-size: 1.8em;
            font-weight: bold;
            cursor: pointer;
            padding: 0 10px;
            color: #333;
            line-height: 1;
          }

          .leaderboard-list {
            list-style: none;
            padding: 10px 15px;
            margin: 0;
            overflow-y: auto; /* Enable scrolling */
            flex-grow: 1;
          }

          .leaderboard-item {
            display: flex;
            align-items: center;
            padding: 12px 10px;
            margin-bottom: 8px;
            background-color: #e9ecef; /* Default background */
            border-radius: 12px;
            font-size: 0.95em;
          }

          .leaderboard-item.top {
            background-color: #6f42c1; /* Purple background */
            color: white;
            font-weight: bold;
          }

          .leaderboard-avatar {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background-color: #ced4da; /* Placeholder color */
            margin-right: 15px;
            flex-shrink: 0;
          }

          .leaderboard-item.top .leaderboard-avatar {
            background-color: #f8f9fa; /* Lighter circle on purple */
          }

          .leaderboard-name {
            flex-grow: 1;
            margin-right: 10px;
            white-space: nowrap; /* Prevent wrapping */
            overflow: hidden;
            text-overflow: ellipsis; /* Add ... if name is too long */
          }

          .leaderboard-score {
            font-weight: bold;
            font-size: 1.1em;
            min-width: 50px;
            text-align: right;
          }

          .leaderboard-footer {
            padding: 10px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            flex-shrink: 0;
          }

          .down-arrow {
            font-size: 1.2em;
            color: #6c757d;
          }

          .loading-message, .empty-message {
             text-align: center;
             padding: 30px 15px;
             color: #6c757d;
             font-style: italic;
          }
        `}
      </style>

      {/* Overlay fades in/out and closes panel when clicked */}
      <div
        className={`leaderboard-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      >
        {/* Add the ref and spread the bind() properties here */}
        {/* Apply the dynamic panelStyle */}
        <div
          ref={panelRef}
          {...bind()} // <-- Apply the drag handlers
          className={`leaderboard-panel ${isOpen ? "open" : ""}`}
          style={panelStyle} // <-- Apply dynamic style for drag feedback/transition control
          onClick={(e) => e.stopPropagation()}
        >
          <div className="leaderboard-header">
            <h2>Leaderboard</h2>
          </div>

          {/* Loading/Empty/List states */}
          {isLoading && (
            <p className="loading-message">Loading leaderboard...</p>
          )}
          {!isLoading && dataToDisplay.length === 0 && (
            <p className="empty-message">No scores yet. Go capture some drops!</p>
          )}
          {!isLoading && dataToDisplay.length > 0 && (
            <ul className="leaderboard-list">
              {dataToDisplay.map((entry, index) => (
                <li
                  key={entry.id}
                  className={`leaderboard-item ${index === 0 ? "top" : ""}`}
                >
                  <div className="leaderboard-avatar"></div>
                  <span className="leaderboard-name">{entry.username}</span>
                  <span className="leaderboard-score">{entry.score}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Footer still closes on click */}
          <div
            className="leaderboard-footer"
            onClick={onClose}
            role="button"
            aria-label="Close leaderboard"
          >
            <span className="down-arrow">
              <FaChevronDown size={18} />
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default LeaderboardComponent;
