// src/pages/MyRewardsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaGift } from "react-icons/fa";
import { db, auth } from "../firebase"; // Import auth and db
import { collection, getDocs, query, orderBy } from "firebase/firestore"; // Import necessary Firestore functions
import { format } from "date-fns";
import RewardDetailPopup from "../components/RewardDetailPopup";

// --- Date Formatting Helper (Copied from UserProfileComponent) ---
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

function MyRewardsPage() {
  const [rewards, setRewards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReward, setSelectedReward] = useState(null); // <-- State for selected reward
  const [isRewardPopupOpen, setIsRewardPopupOpen] = useState(false); // <-- State for popup visibility
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllRewards = async () => {
      setIsLoading(true);
      setError(null);
      setRewards([]); // Clear previous rewards

      const user = auth.currentUser;
      if (!user) {
        console.error("No user logged in to fetch rewards.");
        setError("You must be logged in to view rewards.");
        setIsLoading(false);
        // Optional: Redirect to login
        // navigate('/login');
        return;
      }

      const userId = user.uid;
      console.log(`Fetching ALL rewards for user: ${userId}`);

      try {
        // Reference the user's 'reward' subcollection
        const rewardsColRef = collection(db, "user", userId, "reward");
        // Optional: Order rewards, e.g., by expiration date ascending
        const q = query(rewardsColRef, orderBy("exp", "asc")); // Order by expiry

        const rewardsSnapshot = await getDocs(q); // Use the query 'q'

        if (rewardsSnapshot.empty) {
          console.log(
            `No documents found in 'reward' subcollection for user ${userId}.`
          );
        }

        const fetchedRewards = [];
        rewardsSnapshot.forEach((doc) => {
          fetchedRewards.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        console.log("Fetched all rewards array:", fetchedRewards);
        setRewards(fetchedRewards);
      } catch (err) {
        console.error(`Error fetching all rewards for user ${userId}:`, err);
        setError("Could not load rewards. Please try again later.");
        setRewards([]); // Ensure rewards are empty on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllRewards();
  }, []); // Run only on component mount

  const handleBack = () => {
    navigate(-1); // Go back to the previous page (likely the map)
  };

   // --- Reward Popup Handlers ---
  const handleRewardClick = (rewardData) => {
     setSelectedReward(rewardData);
     setIsRewardPopupOpen(true);
   };
  
   const handleCloseRewardPopup = () => {
     setIsRewardPopupOpen(false);
     setSelectedReward(null);
   };


  return (
    <>
      {/* Reusing some styles from UserProfileComponent for consistency */}
      <style>
        {`
          .my-rewards-page {
            padding: 20px;
            padding-top: 70px; /* Space for header */
            background-color: #f0f0f0; /* Match profile background */
            min-height: 100vh; /* Ensure it fills height */
            box-sizing: border-box;
          }
          .rewards-page-header {
            position: fixed; /* Keep header fixed at top */
            top: 0; left: 0; right: 0;
            display: flex;
            align-items: center;
            padding: 15px 20px;
            background-color: white; /* White header background */
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 10; /* Keep above content */
          }
          .rewards-back-button {
            background: none; border: none;
            font-size: 1.3em; /* Slightly smaller than profile */
            color: #333;
            cursor: pointer;
            padding: 5px;
            margin-right: 15px; /* Space between button and title */
          }
          .rewards-page-title {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
          }
          .rewards-list-full {
            margin-top: 10px; /* Space below header */
            max-width: 600px; /* Limit width on larger screens */
            margin-left: auto;
            margin-right: auto;
          }

          /* Copied Reward Card Styles */
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

          /* Loading/Error/No Rewards Messages */
          .rewards-message {
            text-align: center;
            padding: 40px 15px;
            color: #6c757d;
            font-style: italic;
            font-size: 1em;
          }
        `}
      </style>

      <div className="my-rewards-page">
        <div className="rewards-page-header">
          <button
            className="rewards-back-button"
            onClick={handleBack}
            aria-label="Go Back"
          >
            <FaArrowLeft />
          </button>
          <h1 className="rewards-page-title">My Rewards</h1>
        </div>

        <div className="rewards-list-full">
          {isLoading && (
            <p className="rewards-message">Loading your rewards...</p>
          )}
          {error && <p className="rewards-message">{error}</p>}
          {!isLoading && !error && rewards.length === 0 && (
            <p className="rewards-message">You haven't collected any rewards yet.</p>
          )}

          {!isLoading &&
            !error &&
            rewards.length > 0 &&
            rewards.map((reward) => (
              <div key={reward.id} 
              className="reward-card"
                onClick={() => handleRewardClick(reward)} // <-- Add onClick
                role="button" // <-- Accessibility
                tabIndex={0} // <-- Accessibility
                style={{ cursor: 'pointer' }} // <-- Visual cue
              >
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
            ))}
        </div>
      </div>
      {/* Render Reward Detail Popup */}
     <RewardDetailPopup
       isOpen={isRewardPopupOpen}
       onClose={handleCloseRewardPopup}
       reward={selectedReward}
     />
    </>
  );
}

export default MyRewardsPage;
