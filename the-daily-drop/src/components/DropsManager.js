import React, { useState, useEffect } from "react";
import AdminMapPicker from "./AdminPicker";
import { db } from "../firebase";
import { collection, getDocs, addDoc, Timestamp, GeoPoint } from "firebase/firestore";

function DropsManager() {
  const [name, setName] = useState("");
  const [reward, setReward] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);
  const [rewardsList, setRewardsList] = useState([]); // For dropdown options

  // Fetch rewards on mount
  useEffect(() => {
    const fetchRewards = async () => {
      const snapshot = await getDocs(collection(db, "rewards"));
      const rewardsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRewardsList(rewardsData);
    };

    fetchRewards();
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validate Location
    if (!selectedLat || !selectedLng) {
      alert("Please select a location on the map.");
      return;
    }
  
    // Validate Time
    if (new Date(endTime) <= new Date(startTime)) {
      alert("End time must be after start time.");
      return;
    }
  
    // Save to Firestore
    try {
      await addDoc(collection(db, "drops"), {
        name,
        reward,
        startTime: Timestamp.fromDate(new Date(startTime)),
        endTime: Timestamp.fromDate(new Date(endTime)),
        location: new GeoPoint(selectedLat, selectedLng),
        createdAt: Timestamp.now(),
      });
  
      alert("Drop created successfully!");
      // Clear form
      setName("");
      setReward("");
      setStartTime("");
      setEndTime("");
      setReward("");
      setSelectedLat(null);
      setSelectedLng(null);
    } catch (error) {
      console.error("Error creating drop:", error);
      alert("Failed to create drop.");
    }
  };
  

  const styles = {
    container: {
      position: "relative",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      fontFamily: "'IBM Plex Mono', monospace",
      backgroundColor: "#f9f9f9",
    },
    formWrapper: {
      position: "absolute",
      top: "40px",
      left: "40px",
      backgroundColor: "#ffffff",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
      zIndex: 10,
      width: "340px",
      border: "1px solid #ececec",
    },
    heading: {
      fontSize: "20px",
      fontWeight: "700",
      color: "#002AB8",
      marginBottom: "20px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#555",
      marginBottom: "4px",
      display: "block",
      fontFamily: "'Inter', sans-serif",
    },
    input: {
      width: "100%",
      marginBottom: "16px",
      padding: "10px 12px",
      borderRadius: "10px",
      border: "1px solid #ddd",
      fontSize: "14px",
      fontFamily: "'Inter', sans-serif",
    },
    button: {
      width: "100%",
      padding: "12px",
      borderRadius: "999px",
      border: "none",
      backgroundColor: "#002AB8",
      color: "#fff",
      fontWeight: "500",
      fontSize: "14px",
      cursor: "pointer",
      fontFamily: "'IBM Plex Mono', monospace",
      transition: "background 0.3s ease",
    },
    locationText: {
      fontSize: "13px",
      color: "#666",
      marginBottom: "10px",
      fontFamily: "'Inter', sans-serif",
    },
    searchBox: {
      position: "absolute",
      top: "40px",
      left: "400px",
      zIndex: 10,
      width: "320px",
    },
    searchInput: {
      width: "100%",
      padding: "12px",
      borderRadius: "12px",
      border: "1px solid #ccc",
      fontSize: "14px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      fontFamily: "'Inter', sans-serif",
    },
    select: {
        width: "100%",
        marginBottom: "16px",
        padding: "10px 12px",
        borderRadius: "10px",
        border: "1px solid #ddd",
        fontSize: "14px",
        fontFamily: "'Inter', sans-serif",
      },
  };
  
 


  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>📍 Create New Drop</h2>
        <form onSubmit={handleSubmit}>
        <label>Drop Name</label>
          <input
            type="text"
            placeholder="Drop Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
         <label>Reward</label>
          <select
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">Select a Reward</option>
            {rewardsList.map((rewardOption) => (
              <option key={rewardOption.id} value={rewardOption.name}>
                {rewardOption.name} ({rewardOption.type} - {rewardOption.value})
              </option>
            ))}
          </select>


          <label>Start Date & Time</label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          style={styles.input}
        />

        <label>End Date & Time</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          style={styles.input}
        />
          {selectedLat && selectedLng && (
            <div style={styles.locationText}>
              Location: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
            </div>
          )}
        <button
  type="submit"
  style={{
    ...styles.button,
    opacity: (!selectedLat || !selectedLng) ? 0.6 : 1,
    cursor: (!selectedLat || !selectedLng) ? "not-allowed" : "pointer",
  }}
  disabled={!selectedLat || !selectedLng}
>
  Create Drop
</button>

        </form>
      </div>

      {/* Pass custom styles for search input */}
      <AdminMapPicker
        selectedLat={selectedLat}
        selectedLng={selectedLng}
        setSelectedLat={setSelectedLat}
        setSelectedLng={setSelectedLng}
        searchBoxStyle={styles.searchBox}
        searchInputStyle={styles.searchInput}
      />
    </div>
  );
}

export default DropsManager;
