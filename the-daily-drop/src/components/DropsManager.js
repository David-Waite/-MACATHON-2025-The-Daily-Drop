import React, { useState, useEffect } from "react";
import AdminMapPicker from "./AdminPicker";
import { db, storage } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  GeoPoint,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

function DropsManager() {
  const [name, setName] = useState("");
  const [reward, setReward] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);
  const [rewardsList, setRewardsList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const snapshot = await getDocs(collection(db, "rewards"));
        const rewardsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRewardsList(rewardsData);
      } catch (error) {
        console.error("Error fetching rewards:", error);
      }
    };

    fetchRewards();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");

    if (file) {
      if (!file.type.startsWith("image/")) {
        setFileError("Please select an image file (e.g., jpg, png).");
        setSelectedFile(null);
        e.target.value = null;
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFileError("");

    if (!selectedLat || !selectedLng) {
      alert("Please select a location on the map.");
      return;
    }
    if (!selectedFile) {
      setFileError("Please select an image for the drop.");
      return;
    }
    if (!reward) {
      alert("Please select a reward.");
      return;
    }
    if (!startTime || !endTime) {
      alert("Please select both start and end times.");
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      alert("End time must be after start time.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const fileExtension = selectedFile.name.split(".").pop();
    const uniqueFileName = `drops_images/${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}.${fileExtension}`;
    const storageRef = ref(storage, uniqueFileName);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        console.error("Upload failed:", error);
        alert(`Image upload failed: ${error.message}`);
        setIsUploading(false);
        setUploadProgress(0);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at", downloadURL);

          await addDoc(collection(db, "drops"), {
            name,
            reward,
            startTime: Timestamp.fromDate(new Date(startTime)),
            endTime: Timestamp.fromDate(new Date(endTime)),
            location: new GeoPoint(selectedLat, selectedLng),
            imageUrl: downloadURL,
            createdAt: Timestamp.now(),
          });

          alert("Drop created successfully!");

          setName("");
          setReward("");
          setStartTime("");
          setEndTime("");
          setSelectedLat(null);
          setSelectedLng(null);
          setSelectedFile(null);
          setFileError("");
          if (document.getElementById("drop-image-input")) {
            document.getElementById("drop-image-input").value = null;
          }
        } catch (firestoreError) {
          console.error("Error creating drop document:", firestoreError);
          alert("Failed to save drop details after image upload.");
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    );
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
    fileInputContainer: {
      marginBottom: "16px",
    },
    progressBar: {
      width: "100%",
      height: "8px",
      backgroundColor: "#e0e0e0",
      borderRadius: "4px",
      marginTop: "8px",
      overflow: "hidden",
    },
    progressBarInner: {
      height: "100%",
      backgroundColor: "#0056b3",
      width: "0%",
      transition: "width 0.4s ease",
      borderRadius: "4px",
    },
    errorText: {
      color: "red",
      fontSize: "12px",
      marginTop: "-12px",
      marginBottom: "10px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <h2
          style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}
        >
          📍 Create New Drop
        </h2>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Drop Name</label>
          <input
            type="text"
            placeholder="e.g., Central Park Surprise"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>Reward</label>
          <select
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            style={styles.select}
            required
          >
            <option value="" disabled>
              Select a Reward
            </option>
            {rewardsList.map((rewardOption) => (
              <option key={rewardOption.id} value={rewardOption.name}>
                {rewardOption.name} ({rewardOption.type} - {rewardOption.value})
              </option>
            ))}
          </select>

          <label style={styles.label}>Start Date & Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>End Date & Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={styles.input}
            required
          />

          <div style={styles.fileInputContainer}>
            <label style={styles.label}>Drop Image</label>
            <input
              id="drop-image-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={styles.input}
              required
            />
            {fileError && <p style={styles.errorText}>{fileError}</p>}
          </div>

          {selectedLat && selectedLng && (
            <div style={styles.locationText}>
              Location: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
            </div>
          )}

          {isUploading && (
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressBarInner,
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          )}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity:
                isUploading ||
                !selectedLat ||
                !selectedLng ||
                !selectedFile ||
                !name ||
                !reward ||
                !startTime ||
                !endTime
                  ? 0.6
                  : 1,
              cursor:
                isUploading ||
                !selectedLat ||
                !selectedLng ||
                !selectedFile ||
                !name ||
                !reward ||
                !startTime ||
                !endTime
                  ? "not-allowed"
                  : "pointer",
            }}
            disabled={
              isUploading ||
              !selectedLat ||
              !selectedLng ||
              !selectedFile ||
              !name ||
              !reward ||
              !startTime ||
              !endTime
            }
          >
            {isUploading
              ? `Uploading (${Math.round(uploadProgress)}%)...`
              : "Create Drop"}
          </button>
        </form>
      </div>

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
