import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

function RewardsManager() {
  const [rewards, setRewards] = useState([]);
  const [rewardName, setRewardName] = useState("");
  const [rewardType, setRewardType] = useState("");
  const [rewardValue, setRewardValue] = useState("");

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    const snapshot = await getDocs(collection(db, "rewards"));
    const rewardsData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRewards(rewardsData);
  };

  const handleAddReward = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "rewards"), {
        name: rewardName,
        type: rewardType,
        value: rewardValue,
      });
      alert("Reward added!");
      setRewardName("");
      setRewardType("");
      setRewardValue("");
      fetchRewards(); // ✅ Refresh the rewards list
    } catch (error) {
      console.error("Error adding reward:", error);
    }
  };

  const handleDeleteReward = async (id) => {
    if (window.confirm("Are you sure you want to delete this reward?")) {
      try {
        await deleteDoc(doc(db, "rewards", id));
        setRewards(rewards.filter((reward) => reward.id !== id));
      } catch (error) {
        console.error("Error deleting reward:", error);
      }
    }
  };

  const styles = {
    container: { padding: "2rem", fontFamily: "'Inter', sans-serif" },
    header: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "2rem",
      color: "#1e3a8a",
      marginBottom: "1.5rem",
    },
    form: {
      backgroundColor: "#fefefe",
      fontFamily: "'IBM Plex Mono', monospace",
      border: "1px solid #1e3a8a",
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "2rem",
      maxWidth: "400px",
    },
    input: {
      fontFamily: "'IBM Plex Mono', monospace",
      width: "100%",
      padding: "10px",
      marginBottom: "12px",
      borderRadius: "8px",
      border: "1px solid #1e3a8a",
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
    },
    deleteButton: {
      fontFamily: "'IBM Plex Mono', monospace",
      color: "red",
      border: "none",
      background: "transparent",
      cursor: "pointer",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    thtd: { padding: "10px", borderBottom: "1px solid #ddd", textAlign: "left" },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Manage Rewards</h2>

      <form style={styles.form} onSubmit={handleAddReward}>
        <h3 style={{ color: "#1e3a8a", marginBottom: "1rem" }}>Add New Reward</h3>
        <input
          style={styles.input}
          type="text"
          placeholder="Reward Name"
          value={rewardName}
          onChange={(e) => setRewardName(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="text"
          placeholder="Reward Type (e.g. Voucher, Points)"
          value={rewardType}
          onChange={(e) => setRewardType(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="text"
          placeholder="Reward Value (e.g. $10)"
          value={rewardValue}
          onChange={(e) => setRewardValue(e.target.value)}
          required
        />
        <button type="submit" style={styles.button}>Add Reward</button>
      </form>

      {/* Rewards Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.thtd}>Name</th>
            <th style={styles.thtd}>Type</th>
            <th style={styles.thtd}>Value</th>
            <th style={styles.thtd}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rewards.map((reward) => (
            <tr key={reward.id}>
              <td style={styles.thtd}>{reward.name}</td>
              <td style={styles.thtd}>{reward.type}</td>
              <td style={styles.thtd}>{reward.value}</td>
              <td style={styles.thtd}>
                <button
                  style={styles.deleteButton}
                  onClick={() => handleDeleteReward(reward.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {rewards.length === 0 && (
            <tr>
              <td colSpan="4" style={{ ...styles.thtd, textAlign: "center" }}>
                No rewards available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RewardsManager;
