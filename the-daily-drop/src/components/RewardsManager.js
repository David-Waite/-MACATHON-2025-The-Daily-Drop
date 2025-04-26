import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query, // Import query
  where, // Import where
} from "firebase/firestore";

function RewardsManager() {
  const [rewards, setRewards] = useState([]);
  const [rewardName, setRewardName] = useState("");
  const [rewardType, setRewardType] = useState(""); // Default to empty string for placeholder
  const [rewardValue, setRewardValue] = useState("");
  const [nameError, setNameError] = useState(""); // State for name uniqueness error

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    const snapshot = await getDocs(collection(db, "rewards"));
    const rewardsData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    // Sort rewards alphabetically by name for consistent display
    rewardsData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    setRewards(rewardsData);
  };

  // Check if reward name already exists
  const checkRewardNameExists = async (name) => {
    if (!name) return false; // Don't check empty names
    const q = query(collection(db, "rewards"), where("name", "==", name));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Return true if name exists
  };

  const handleAddReward = async (e) => {
    e.preventDefault();
    setNameError(""); // Reset error on submit

    // Check for name uniqueness before adding
    const nameExists = await checkRewardNameExists(rewardName);
    if (nameExists) {
      setNameError(`Reward name "${rewardName}" already exists. Please use a unique name.`);
      return; // Stop the submission
    }

    // Ensure a type is selected
    if (!rewardType) {
        alert("Please select a reward type (Voucher or Points).");
        return;
    }

    try {
      await addDoc(collection(db, "rewards"), {
        name: rewardName,
        type: rewardType, // Value comes directly from the select dropdown
        value: rewardValue,
      });
      alert("Reward added!");
      setRewardName("");
      setRewardType(""); // Reset type dropdown
      setRewardValue("");
      setNameError(""); // Clear error on success
      fetchRewards(); // Refresh the rewards list
    } catch (error) {
      console.error("Error adding reward:", error);
      alert(`Failed to add reward: ${error.message}`);
    }
  };

  const handleDeleteReward = async (id) => {
    if (window.confirm("Are you sure you want to delete this reward? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "rewards", id));
        // Update state locally to reflect deletion immediately
        setRewards((prevRewards) =>
          prevRewards.filter((reward) => reward.id !== id)
        );
        alert("Reward deleted successfully.");
      } catch (error) {
        console.error("Error deleting reward:", error);
        alert(`Failed to delete reward: ${error.message}`);
      }
    }
  };

  // --- Styles --- (Add style for error text)
  const styles = {
    container: { padding: "2rem", fontFamily: "'Inter', sans-serif" },
    header: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "2rem",
      color: "#1e3a8a",
      marginBottom: "1.5rem",
    },
    form: {
      backgroundColor: "#f8f9fa", // Lighter background
      fontFamily: "'IBM Plex Mono', monospace",
      border: "1px solid #dee2e6", // Lighter border
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "2rem",
      maxWidth: "450px", // Slightly wider
      boxShadow: "0 2px 5px rgba(0,0,0,0.05)", // Subtle shadow
    },
    formHeader: {
        color: "#1e3a8a",
        marginBottom: "1rem",
        fontSize: "1.2rem",
        fontWeight: "600",
    },
    // Use a common style for input and select
    inputOrSelect: {
      fontFamily: "'IBM Plex Mono', monospace",
      width: "100%",
      padding: "10px 12px", // Consistent padding
      marginBottom: "12px",
      borderRadius: "8px",
      border: "1px solid #ced4da", // Standard border color
      fontSize: "0.95rem", // Slightly larger font
      backgroundColor: "#fff", // White background for inputs/select
      boxSizing: "border-box", // Include padding and border in element's total width/height
    },
    button: {
      fontFamily: "'IBM Plex Mono', monospace",
      backgroundColor: "#1e3a8a",
      color: "#fff",
      border: "none",
      padding: "10px 20px",
      borderRadius: "999px",
      cursor: "pointer",
      fontWeight: "500",
      transition: "background-color 0.2s ease",
      ":hover": {
          backgroundColor: "#1c3170", // Darken on hover
      }
    },
    deleteButton: {
      fontFamily: "'IBM Plex Mono', monospace",
      color: "#dc3545", // Bootstrap danger color
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "5px", // Add some padding for easier clicking
      fontSize: "0.9rem",
      fontWeight: "500",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "1rem", // Add space above table
    },
    th: { // Style for table header
        padding: "12px 10px",
        borderBottom: "2px solid #1e3a8a", // Stronger header underline
        textAlign: "left",
        fontWeight: "600", // Bold header text
        color: "#1e3a8a", // Header text color
        fontSize: "0.9rem",
        textTransform: "uppercase", // Uppercase headers
        letterSpacing: "0.5px",
    },
    td: { // Style for table data cells
        padding: "12px 10px",
        borderBottom: "1px solid #e9ecef", // Lighter row separator
        textAlign: "left",
        fontSize: "0.95rem",
        color: "#495057", // Dark gray text
    },
    // *** NEW STYLE for error text ***
    errorText: {
        color: "#dc3545", // Red color for errors
        fontSize: "0.85rem",
        marginTop: "-8px", // Pull up slightly below the input
        marginBottom: "10px",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Manage Rewards</h2>

      {/* Add Reward Form */}
      <form style={styles.form} onSubmit={handleAddReward}>
        <h3 style={styles.formHeader}>Add New Reward</h3>

        {/* Reward Name Input */}
        <input
          style={styles.inputOrSelect} // Use shared style
          type="text"
          placeholder="Unique Reward Name (e.g., $10 GYG Voucher)"
          value={rewardName}
          onChange={(e) => {
              setRewardName(e.target.value);
              setNameError(""); // Clear error when user types
          }}
          required
        />
        {/* Display name error if it exists */}
        {nameError && <p style={styles.errorText}>{nameError}</p>}

        {/* Reward Type Dropdown - REPLACED INPUT */}
        <select
          style={styles.inputOrSelect} // Use shared style
          value={rewardType}
          onChange={(e) => setRewardType(e.target.value)}
          required // Make selection required
        >
          <option value="" disabled> -- Select Reward Type -- </option>
          <option value="Voucher">Voucher</option>
          <option value="Points">Points</option>
          {/* Add other types here if needed in the future */}
        </select>

        {/* Reward Value Input */}
        <input
          style={styles.inputOrSelect} // Use shared style
          type="text"
          // Dynamically change placeholder based on type
          placeholder={rewardType === "Points" ? "Value (e.g., 100)" : "Value (e.g., $10 Off)"}
          value={rewardValue}
          onChange={(e) => setRewardValue(e.target.value)}
          required
        />

        {/* Submit Button */}
        <button type="submit" style={styles.button}>
          Add Reward
        </button>
      </form>

      {/* Rewards Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Value</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rewards.length > 0 ? (
            rewards.map((reward) => (
              <tr key={reward.id}>
                <td style={styles.td}>{reward.name}</td>
                <td style={styles.td}>{reward.type}</td>
                <td style={styles.td}>{reward.value}</td>
                <td style={styles.td}>
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDeleteReward(reward.id)}
                    title={`Delete ${reward.name}`} // Add tooltip for clarity
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ ...styles.td, textAlign: "center", fontStyle: 'italic', color: '#6c757d' }}>
                No rewards available. Add one using the form above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RewardsManager;
