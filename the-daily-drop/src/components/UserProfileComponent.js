// src/components/UserProfileComponent.jsx
import React, { useState, useEffect, useRef } from "react"; // <-- Added useEffect
import { FaChevronRight, FaGift } from "react-icons/fa";
import { useDrag } from "@use-gesture/react";
import { db } from "../firebase"; // <-- Import db
import { collection, getDocs } from "firebase/firestore"; // <-- Import collection, getDocs
import { format, parse } from 'date-fns';

// Placeholder data structure if needed
const placeholderUser = {
  username: "Loading...",
  point: 0,
  // rewards: [] // Add rewards array if applicable
};

// Define target points for progress bar (adjust as needed)
const POINTS_TARGET = 200;

function UserProfileComponent({
  onClose,
  isOpen,
  userData, // Expects object like { id, username, email, point, createdAt, rewards? } or null
  isLoading,
}) {
  const [tempY, setTempY] = useState(0);
  const panelRef = useRef(null);
  const [rewards, setRewards] = useState([]); // <-- State for rewards
  const [isLoadingRewards, setIsLoadingRewards] = useState(false); // <-- Loading state for rewards

  // Use actual data if available and not loading, otherwise use placeholder
  const displayData = !isLoading && userData ? userData : placeholderUser;
  const currentPoints = displayData.point || 0;
  const progressPercent = Math.min(100, (currentPoints / POINTS_TARGET) * 100);
  const pointsNeeded = Math.max(0, POINTS_TARGET - currentPoints);


  // --- Fetch Rewards Effect (with improved logging) ---
  useEffect(() => {
    if (isOpen && userData?.id && !isLoading) {
      const fetchRewards = async () => {
        setIsLoadingRewards(true);
        setRewards([]);
        const userId = userData.id;
        console.log(`Fetching rewards for user: ${userId}`);
        try {
          // ***** Verify collection names: "users" and "reward" *****
          const rewardsColRef = collection(db, "user", userId, "reward");
          const rewardsSnapshot = await getDocs(rewardsColRef);

          if (rewardsSnapshot.empty) {
            console.log(`No documents found in 'reward' subcollection for user ${userId}.`);
          }

          const fetchedRewards = [];
          rewardsSnapshot.forEach((doc) => {
            console.log(`  Reward doc found: ID=${doc.id}, Data=`, doc.data());
            fetchedRewards.push({
              id: doc.id,
              ...doc.data(),
            });
          });
          console.log("Fetched rewards array:", fetchedRewards);
          setRewards(fetchedRewards);
        } catch (error) {
          console.error(`Error fetching rewards for user ${userId}:`, error);
          setRewards([]);
        } finally {
          setIsLoadingRewards(false);
        }
      };
      fetchRewards();
    } else {
      setRewards([]);
    }
  }, [isOpen, userData, isLoading]);


  // --- Swipe Gesture Handling ---
  const bind = useDrag(
    ({ active, movement: [, my], direction: [, dy], velocity: [, vy] }) => {
      const panelHeight = panelRef.current?.offsetHeight || window.innerHeight * 0.75;
      const SWIPE_THRESHOLD = panelHeight * 0.3;
      const VELOCITY_THRESHOLD = 0.3;

      if (active) {
        setTempY(my > 0 ? my : 0); // Only allow dragging down
      } else {
        const isSwipeDown = dy > 0;
        const isFastEnough = vy > VELOCITY_THRESHOLD;
        const isFarEnough = my > SWIPE_THRESHOLD;
        if (isSwipeDown && (isFarEnough || isFastEnough)) {
          onClose();
        }
        setTempY(0); // Reset on release
      }
    },
    { axis: "y" }
  );

  const panelStyle = {
    transform: tempY > 0 ? `translateY(${tempY}px)` : undefined,
    transition: tempY > 0 ? "none" : "transform 0.3s ease-in-out",
  };

  // --- Date Formatting Helper ---
  const formatExpiryDate = (timestamp) => {
       if (!timestamp || typeof timestamp.toDate !== 'function') {
             console.warn("Invalid timestamp received for formatting:", timestamp);
             return "N/A"; // Handle missing or invalid timestamp
           }
    try {
      // Define the format your input string uses
      // Example: "April 27, 2025 at 5:48:58 PM UTC+10"
      // We might need to adjust the parsing format string depending on exact input
      // Let's try a general approach first, might need refinement
      // It's often better to store dates as Firestore Timestamps if possible
      // Convert Firestore Timestamp to JavaScript Date object
     const date = timestamp.toDate();
      // Format the valid Date object
      // Output: "April 27, 2025 at 5:48pm"
      return format(date, "MMMM d, yyyy 'at' h:mmaaa");
    } catch (error) {
      console.error("Error formatting timestamp:", timestamp, error);
      return "Error"; // Handle any unexpected errors during formatting
    }
  };

  return (
    <>
      <style>
        {`
          .profile-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0);
            z-index: 1000; /* Higher than map buttons */
            display: flex; align-items: flex-end;
            transition: background-color 0.3s ease-in-out, visibility 0.3s, opacity 0.3s;
            visibility: hidden; opacity: 0;
          }
          .profile-overlay.visible {
            background-color: rgba(0, 0, 0, 0.3);
            visibility: visible; opacity: 1;
          }
          .profile-panel {
            position: fixed; bottom: 0; left: 0; right: 0;
            width: 100%; max-height: 85vh; /* Allow slightly taller */
            background-color: #f0f0f0; /* Light grey background for panel */
            border-top-left-radius: 20px; border-top-right-radius: 20px;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            transform: translateY(100%);
            /* transition handled by inline style */
            display: flex; flex-direction: column;
            overflow: hidden;
            touch-action: pan-y; cursor: grab;
          }
          .profile-panel:active { cursor: grabbing; }
          .profile-panel.open { transform: translateY(0); }

          .profile-content {
             padding: 20px;
             padding-top: 30px; /* More space at top */
             display: flex; flex-direction: column; align-items: center;
             overflow-y: hidden;
          }
          .profile-avatar {
             width: 80px; height: 80px;
             border-radius: 50%;
             background-color: #6A0DAD; /* Purple */
             color: white;
             display: flex; align-items: center; justify-content: center;
             font-size: 2.5em; font-weight: bold;
             margin-bottom: 15px;
             flex-shrink: 0;
             /* TODO: Replace with actual image if available */
          }
          .profile-username {
             font-size: 1.6em; font-weight: bold;
             color: #333;
             margin-bottom: 25px;
          }

          /* Points Section */
          .points-card {
             background-color: white;
             border-radius: 15px;
             padding: 15px 20px;
             margin-bottom: 25px;
             width: 100%;
             max-width: 400px; /* Limit width */
             box-shadow: 0 2px 5px rgba(0,0,0,0.1);
             box-sizing: border-box;
          }
          .points-header {
             display: flex; justify-content: space-between; align-items: baseline;
             margin-bottom: 8px;
          }
          .points-label { font-size: 0.9em; color: #555; font-weight: 500; }
          .points-value { font-size: 1.1em; color: #333; font-weight: bold; }
          .progress-bar-bg {
             width: 100%; height: 8px;
             background-color: #e0e0e0; /* Light grey background */
             border-radius: 4px;
             overflow: hidden;
             margin-bottom: 8px;
          }
          .progress-bar-fg {
             height: 100%;
             background-color: #E91E63; /* Pink progress */
             border-radius: 4px;
             transition: width 0.5s ease-out; /* Animate progress change */
          }
          .points-needed { font-size: 0.85em; color: #777; text-align: center; }

          /* Rewards Section Wrapper (includes label and list) */
          .rewards-section-wrapper {
             width: 100%;
             max-width: 400px; /* Limit width */
             box-sizing: border-box;
             margin-top: 25px; /* Add space above rewards label */
             display: flex; /* Use flexbox to manage label and list */
             flex-direction: column;
            flex-grow: 1; /* Allow this section to grow */
            overflow: hidden; /* Contain the scrolling list */
            padding-bottom: 10px; /* Add padding at the bottom if needed */
          }
          .rewards-label {
             font-size: 1.1em; font-weight: bold; color: #444;
             margin-bottom: 15px; text-align: left; width: 100%;
            flex-shrink: 0; /* Prevent label from shrinking */
          }
         /* New container specifically for the scrollable list */
         .rewards-list-container {
            width: 100%;
            overflow-y: auto; /* <<< ENABLE SCROLLING HERE */
            overflow-x: hidden;
            flex-grow: 1; /* Allow list to take remaining space */
            box-sizing: border-box;
            
         }

          .reward-card {
             background-color: white;
             border-radius: 15px;
             padding: 15px;
             margin-bottom: 15px;
             display: flex; align-items: center;
             box-shadow: 0 2px 5px rgba(0,0,0,0.1);
             cursor: pointer; /* Indicate clickability if rewards are interactive */
             transition: transform 0.2s ease-out;
          }
          .reward-card:hover { transform: scale(1.02); } /* Optional hover effect */
          .reward-icon-bg {
             width: 45px; height: 45px;
             border-radius: 50%;
             background-color: #FFEB3B; /* Yellow background */
             display: flex; align-items: center; justify-content: center;
             margin-right: 15px;
             flex-shrink: 0;
             color: #5d4037; /* Darker color for icon */
          }
          .reward-details { flex-grow: 1; text-align: left; }
          .reward-title { font-size: 1em; font-weight: 600; color: #333; margin-bottom: 3px; }
          .reward-expiry { font-size: 0.85em; color: #777; }
          .reward-arrow { color: #aaa; margin-left: 10px; }

          .loading-message-profile { /* Unique class name */
             text-align: center; padding: 50px 15px; color: #6c757d; font-style: italic;
          }
          .loading-message-rewards { /* New style for rewards loading */
             text-align: center; padding: 20px 15px; color: #6c757d; font-size: 0.9em;
          }
        `}
      </style>

      <div
        className={`profile-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      >
        <div
          ref={panelRef}
          {...bind()}
          className={`profile-panel ${isOpen ? "open" : ""}`}
          style={panelStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* profile-content now manages overall layout but doesn't scroll */}
          <div className="profile-content">
            {/* Loading/Error for main profile */}
            {isLoading && ( <p className="loading-message-profile">Loading Profile...</p> )}
            {!isLoading && !userData && ( <p className="loading-message-profile">Could not load profile.</p> )}

            {/* Fixed Content (Render only when user data is loaded) */}
            {!isLoading && userData && (
              <>
                <div className="profile-avatar">
                  {displayData.username ? displayData.username.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="profile-username">
                  {displayData.username || "User"}
                </div>
                <div className="points-card">
                  <div className="points-header">
                    <span className="points-label">Points</span>
                    <span className="points-value">{currentPoints} / {POINTS_TARGET}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fg" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <div className="points-needed">
                    {pointsNeeded > 0 ? `${pointsNeeded} more points to collect your reward` : "Reward goal reached!"}
                  </div>
                </div>

                {/* Rewards Section Wrapper */}
                <div className="rewards-section-wrapper">
                  <div className="rewards-label">Your Rewards</div>

                  {/* Scrollable Rewards List Container */}
                  <div className="rewards-list-container">
                    {isLoadingRewards && ( <p className="loading-message-rewards">Loading rewards...</p> )}

                    {!isLoadingRewards && rewards.length > 0 ? (
                      rewards.map((reward) => (
                        <div key={reward.id} className="reward-card">
                          <div className="reward-icon-bg"><FaGift /></div>
                          <div className="reward-details">
                            <div className="reward-title">${reward.value || 0} {reward.id} Coupon</div>
                            <div className="reward-expiry">Expire: {formatExpiryDate(reward.exp)}</div>
                          </div>
                          <FaChevronRight className="reward-arrow" />
                        </div>
                      ))
                    ) : null }

                    {!isLoadingRewards && rewards.length === 0 && (
                      <p style={{ textAlign: "center", color: "#777", fontSize: "0.9em", paddingTop: '20px' }}>
                        No rewards collected yet.
                      </p>
                    )}
                  </div> {/* End rewards-list-container */}
                </div> {/* End rewards-section-wrapper */}
              </>
            )}
          </div> {/* End profile-content */}
        </div> {/* End profile-panel */}
      </div> {/* End profile-overlay */}
    </>
  );
}

export default UserProfileComponent;
