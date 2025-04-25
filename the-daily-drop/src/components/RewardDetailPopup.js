// src/components/RewardDetailPopup.jsx
import React from "react";
import { FaTimes } from "react-icons/fa"; // Icon for close button
import { format } from "date-fns"; // Reuse date formatting

// --- Date Formatting Helper (Copied from UserProfileComponent) ---
const formatExpiryDate = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "N/A";
  }
  try {
    const date = timestamp.toDate();
    return format(date, "MMMM d, yyyy 'at' h:mmaaa");
  } catch (error) {
    return "Error";
  }
};

function RewardDetailPopup({ isOpen, onClose, reward }) {
  // Don't render anything if not open or no reward data
  if (!isOpen || !reward) {
    return null;
  }

  return (
    <>
      <style>
        {`
          .reward-popup-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0.6); /* Darker overlay */
            z-index: 1050; /* Higher than profile/leaderboard */
            display: flex; align-items: center; justify-content: center;
            transition: opacity 0.2s ease-in-out, visibility 0.2s;
            visibility: hidden; opacity: 0;
            padding: 20px; /* Add padding for smaller screens */
          }
          .reward-popup-overlay.visible {
            visibility: visible; opacity: 1;
          }
          .reward-popup-box {
            background-color: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.25);
            text-align: center;
            max-width: 350px; /* Max width for the popup */
            width: 90%; /* Responsive width */
            position: relative; /* For positioning close button */
            box-sizing: border-box;
            transform: scale(0.9); /* Start slightly smaller */
            transition: transform 0.2s ease-out;
          }
          .reward-popup-overlay.visible .reward-popup-box {
             transform: scale(1); /* Scale in when visible */
          }
          .reward-popup-close-btn {
            position: absolute; top: 10px; right: 10px;
            background: none; border: none;
            font-size: 1.5em; color: #aaa;
            cursor: pointer; padding: 5px; line-height: 1;
          }
          .reward-popup-close-btn:hover {
            color: #333;
          }
          .reward-popup-image {
            width: 80%; /* Adjust size as needed */
            max-width: 250px;
            height: auto;
            margin: 10px auto 25px; /* Center and add spacing */
            display: block;
            border: 1px solid #eee; /* Optional border */
          }
          .reward-popup-title {
            font-size: 1.3em; font-weight: bold; color: #333;
            margin-bottom: 8px;
          }
          .reward-popup-expiry {
            font-size: 0.9em; color: #666;
            margin-bottom: 0; /* No space needed below expiry */
          }
        `}
      </style>

      <div
        className={`reward-popup-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose} // Close when overlay is clicked
        aria-hidden={!isOpen}
      >
        <div
          className="reward-popup-box"
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
          role="dialog"
          aria-modal="true"
          aria-labelledby="reward-popup-title"
        >
          <button
            className="reward-popup-close-btn"
            onClick={onClose}
            aria-label="Close reward details"
          >
            <FaTimes />
          </button>

          <img
            src="/placeholder-qr.png" // Make sure this image exists in /public
            alt="Reward QR Code Placeholder"
            className="reward-popup-image"
          />

          <h3 id="reward-popup-title" className="reward-popup-title">
            ${reward.value || 0} {reward.id} Coupon
          </h3>
          <p className="reward-popup-expiry">
            Expires: {formatExpiryDate(reward.exp)}
          </p>
        </div>
      </div>
    </>
  );
}

export default RewardDetailPopup;
