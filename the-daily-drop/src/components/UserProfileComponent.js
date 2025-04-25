// src/components/UserProfileComponent.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaGift } from "react-icons/fa";
import { db, auth } from "../firebase"; // <-- Import auth instance
import { getAuth, signOut } from "firebase/auth"; // <-- Import auth functions
import { collection, getDocs } from "firebase/firestore";
import { format } from "date-fns";

// Placeholder data structure if needed
const placeholderUser = {
  username: "Loading...",
  point: 0,
};

// Define target points for progress bar (adjust as needed)
const POINTS_TARGET = 200;

function UserProfileComponent({
  onClose,
  isOpen,
  userData, // Expects object like { id, username, email, point, createdAt, rewards? } or null
  isLoading,
}) {
  const [rewards, setRewards] = useState([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // <-- State for confirmation dialog
  const navigate = useNavigate();

  // Use actual data if available and not loading, otherwise use placeholder
  const displayData = !isLoading && userData ? userData : placeholderUser;
  const currentPoints = displayData.point || 0;
  const progressPercent = Math.min(100, (currentPoints / POINTS_TARGET) * 100);
  const pointsNeeded = Math.max(0, POINTS_TARGET - currentPoints);

  // --- Fetch Rewards Effect ---
  useEffect(() => {
    // Reset confirmation dialog if panel is closed/reopened
    if (!isOpen) {
      setShowLogoutConfirm(false);
    }

    if (isOpen && userData?.id && !isLoading) {
      const fetchRewards = async () => {
        setIsLoadingRewards(true);
        setRewards([]);
        const userId = userData.id;
        console.log(`Fetching rewards for user: ${userId}`);
        try {
          const rewardsColRef = collection(db, "user", userId, "reward");
          const rewardsSnapshot = await getDocs(rewardsColRef);

          if (rewardsSnapshot.empty) {
            console.log(
              `No documents found in 'reward' subcollection for user ${userId}.`
            );
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

  // --- Date Formatting Helper (Unchanged) ---
  const formatExpiryDate = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== "function") {
      console.warn("Invalid timestamp received for formatting:", timestamp);
      return "N/A";
    }
    try {
      const date = timestamp.toDate();
      return format(date, "MMMM d, yyyy 'at' h:mmaaa");
    } catch (error) {
      console.error("Error formatting timestamp:", timestamp, error);
      return "Error";
    }
  };

  // --- Navigation Handler (Unchanged) ---
  const handleViewMoreRewards = () => {
    navigate("/myrewards");
    onClose(); // Close profile when navigating away
  };

  // --- Logout Handlers ---
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true); // Show the confirmation dialog
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false); // Hide the confirmation dialog
  };

  const confirmLogout = () => {
    const authInstance = getAuth(); // Get auth instance
    signOut(authInstance)
      .then(() => {
        console.log("User signed out from profile");
        setShowLogoutConfirm(false); // Hide dialog
        onClose(); // Close the profile panel
        navigate("/login"); // Redirect to login page
      })
      .catch((error) => {
        console.error("Error signing out from profile:", error);
        alert(`Error signing out: ${error.message}`); // Inform user
        setShowLogoutConfirm(false); // Hide dialog even on error
      });
  };

  // Slice rewards for display
  const displayedRewards = rewards.slice(0, 4);
  const hasMoreRewards = rewards.length > 4;

  return (
    <>
      <style>
        {`

          .profile-panel {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            background-color: #f0f0f0;
            z-index: 1000;
            display: flex; flex-direction: column;
            overflow-y: auto;
            transition: opacity 0.3s ease-in-out, visibility 0.3s;
            visibility: hidden; opacity: 0;
            padding-top: 60px;
            box-sizing: border-box;
            padding-bottom: 0px;
          }
          .profile-panel.open { visibility: visible; opacity: 1; }

          .back-button {
            position: absolute; top: 15px; left: 15px;
            background: none; border: none;
            font-size: 1.5em; color: #333;
            cursor: pointer; padding: 5px; z-index: 1002;
          }

          .profile-content {
             padding: 0 20px 30px 20px;
             display: flex; flex-direction: column; align-items: center;
             width: 100%; box-sizing: border-box;
          }
          .profile-avatar {
             width: 80px; height: 80px; border-radius: 50%;
             background-color: #6A0DAD; color: white;
             display: flex; align-items: center; justify-content: center;
             font-size: 2.5em; font-weight: bold;
             margin-bottom: 15px; flex-shrink: 0;
          }
          .profile-username {
             font-size: 1.6em; font-weight: bold; color: #333;
             margin-bottom: 25px; text-align: center;
          }

          /* Points Section (Unchanged) */
          .points-card {
             background-color: white; border-radius: 15px;
             padding: 15px 20px; margin-bottom: 25px;
             width: 100%; max-width: 400px;
             box-shadow: 0 2px 5px rgba(0,0,0,0.1); box-sizing: border-box;
          }
          .points-header {
             display: flex; justify-content: space-between; align-items: baseline;
             margin-bottom: 8px;
          }
          .points-label { font-size: 0.9em; color: #555; font-weight: 500; }
          .points-value { font-size: 1.1em; color: #333; font-weight: bold; }
          .progress-bar-bg {
             width: 100%; height: 8px; background-color: #e0e0e0;
             border-radius: 4px; overflow: hidden; margin-bottom: 8px;
          }
          .progress-bar-fg {
             height: 100%; background-color: #E91E63; border-radius: 4px;
             transition: width 0.5s ease-out;
          }
          .points-needed { font-size: 0.85em; color: #777; text-align: center; }

          /* Rewards Section Wrapper */
          .rewards-section-wrapper {
             width: 100%; max-width: 400px; box-sizing: border-box;
             margin-top: 25px; display: flex; flex-direction: column;
          }

          /* NEW: Header container for label and link */
          .rewards-header {
            display: flex;
            justify-content: space-between; /* Pushes items apart */
            align-items: baseline; /* Aligns text nicely */
            width: 100%;
            margin-bottom: 15px; /* Space below header */
          }

          .rewards-label {
             font-size: 1.1em; font-weight: bold; color: #444;
             /* No width or text-align needed */
          }

          /* NEW: Style for the "See All" link */
          .see-all-link {
            background: none;
            border: none;
            color: #6A0DAD; /* Link color (purple) */
            font-size: 0.9em;
            font-weight: 500;
            cursor: pointer;
            padding: 0; /* Remove default padding */
            text-decoration: none; /* Optional: remove underline */
          }
          .see-all-link:hover {
            text-decoration: underline; /* Add underline on hover */
          }

          .reward-card {
             background-color: white; border-radius: 15px;
             padding: 15px; margin-bottom: 15px;
             display: flex; align-items: center;
             box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .reward-icon-bg {
             width: 45px; height: 45px; border-radius: 50%;
             background-color: #FFEB3B;
             display: flex; align-items: center; justify-content: center;
             margin-right: 15px; flex-shrink: 0; color: #5d4037;
          }
          .reward-details { flex-grow: 1; text-align: left; }
          .reward-title { font-size: 1em; font-weight: 600; color: #333; margin-bottom: 3px; }
          .reward-expiry { font-size: 0.85em; color: #777; }

          /* Removed .view-more-rewards styles */

          .loading-message-profile, .loading-message-rewards {
             text-align: center; padding: 50px 15px; color: #6c757d; font-style: italic;
          }
          .loading-message-rewards { padding: 20px 15px; font-size: 0.9em; }
          .no-rewards-message {
             text-align: center; color: #777; font-size: 0.9em; padding-top: 20px;
          }
         .logout-button-profile { /* New class for profile logout button */
            display: block; /* Make it block level */
            width: calc(100% - 40px); /* Full width minus padding */
            max-width: 400px; /* Match card width */
            margin: 30px auto 20px; /* Center horizontally, add vertical space */
            padding: 12px 20px;
            background-color: #6A0DAD; /* Red color for logout */
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1em;
            font-weight: bold;
            cursor: pointer;
            text-align: center;
            transition: background-color 0.2s;
          }
          .logout-button-profile:hover {
            background-color: #6A0DAD; /* Darker red on hover */
          }

          /* Confirmation Dialog Styles */
          .confirm-dialog-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1050; /* Higher than profile panel */
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease-in-out, visibility 0.2s;
          }
          .confirm-dialog-overlay.visible {
            opacity: 1;
            visibility: visible;
          }
          .confirm-dialog-box {
            background-color: white;
            padding: 25px 30px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 300px;
            width: 80%;
          }
          .confirm-dialog-box p {
            margin-bottom: 20px;
            font-size: 1.1em;
            color: #333;
          }
          .confirm-dialog-buttons {
            display: flex;
            justify-content: space-around; /* Space out buttons */
          }
          .confirm-dialog-buttons button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            font-size: 0.95em;
            font-weight: 500;
            cursor: pointer;
            min-width: 80px;
            transition: background-color 0.2s, box-shadow 0.2s;
          }
          .confirm-dialog-confirm {
            background-color: #dc3545; /* Red */
            color: white;
          }
          .confirm-dialog-confirm:hover {
            background-color: #c82333;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          }
          .confirm-dialog-cancel {
            background-color: #6c757d; /* Grey */
            color: white;
          }
           .confirm-dialog-cancel:hover {
            background-color: #5a6268;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          }
        `}
      </style>

{/* Profile Panel */}
<div
        className={`profile-panel ${isOpen ? "open" : ""}`}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="back-button"
          onClick={onClose}
          aria-label="Close Profile"
        >
          <FaArrowLeft />
        </button>

        <div className="profile-content">
          {isLoading && (
            <p className="loading-message-profile">Loading Profile...</p>
          )}
          {!isLoading && !userData && (
            <p className="loading-message-profile">Could not load profile.</p>
          )}

          {!isLoading && userData && (
            <>
              {/* Avatar, Username, Points Card, Rewards Section... */}
              {/* ... (existing content remains the same) ... */}
              <div className="profile-avatar">
                {displayData.username
                  ? displayData.username.charAt(0).toUpperCase()
                  : "U"}
              </div>
              <div className="profile-username">
                {displayData.username || "User"}
              </div>

              <div className="points-card">
                <div className="points-header">
                  <span className="points-label">Points</span>
                  <span className="points-value">
                    {currentPoints} / {POINTS_TARGET}
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fg"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="points-needed">
                  {pointsNeeded > 0
                    ? `${pointsNeeded} more points to collect your reward`
                    : "Reward goal reached!"}
                </div>
              </div>

              <div className="rewards-section-wrapper">
                <div className="rewards-header">
                  <div className="rewards-label">Your Rewards</div>
                  {!isLoadingRewards && hasMoreRewards && (
                    <button
                      className="see-all-link"
                      onClick={handleViewMoreRewards}
                    >
                      See All ({rewards.length})
                    </button>
                  )}
                </div>

                {isLoadingRewards && (
                  <p className="loading-message-rewards">Loading rewards...</p>
                )}

                {!isLoadingRewards && displayedRewards.length > 0
                  ? displayedRewards.map((reward) => (
                      <div key={reward.id} className="reward-card">
                        <div className="reward-icon-bg">
                          <FaGift />
                        </div>
                        <div className="reward-details">
                          <div className="reward-title">
                            ${reward.value || 0} {reward.id} Coupon
                          </div>
                          <div className="reward-expiry">
                            Expire: {formatExpiryDate(reward.exp)}
                          </div>
                        </div>
                      </div>
                    ))
                  : null}

                {!isLoadingRewards && rewards.length === 0 && (
                  <p className="no-rewards-message">
                    No rewards collected yet.
                  </p>
                )}
              </div>

              {/* Logout Button - Placed after rewards */}
              <button
                className="logout-button-profile"
                onClick={handleLogoutClick} // <-- Trigger confirmation
              >
                Log Out
              </button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <div
        className={`confirm-dialog-overlay ${
          showLogoutConfirm ? "visible" : ""
        }`}
        // Optional: click overlay to cancel
        // onClick={cancelLogout}
      >
        <div
          className="confirm-dialog-box"
          onClick={(e) => e.stopPropagation()} // Prevent overlay click from closing box
        >
          <p>Are you sure you want to log out?</p>
          <div className="confirm-dialog-buttons">
            <button
              className="confirm-dialog-cancel"
              onClick={cancelLogout} // <-- Cancel handler
            >
              Cancel
            </button>
            <button
              className="confirm-dialog-confirm"
              onClick={confirmLogout} // <-- Confirm handler
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserProfileComponent;