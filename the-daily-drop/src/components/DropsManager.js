import React, { useState, useEffect } from "react";
import AdminMapPicker from "./AdminPicker"; // Assuming this is the correct path
import { db, storage } from "../firebase"; // Make sure firebase is correctly configured
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  GeoPoint,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

function DropsManager() {
  // Existing State
  const [name, setName] = useState("");
  const [reward, setReward] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(""); // Using duration
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);
  const [rewardsList, setRewardsList] = useState([]);

  // State for File Upload (Added back)
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState("");

  // Fetch rewards on mount
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

  // Handle File Change (Added back)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError(""); // Reset error on new file selection
    console.log("File selected:", file); // <-- Log the selected file

    if (file) {
      if (!file.type.startsWith("image/")) {
        setFileError("Please select an image file (e.g., jpg, png, gif).");
        setSelectedFile(null);
        e.target.value = null;
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  // Updated handleSubmit to include file upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFileError("");

    // --- Input Validations ---
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
    if (!startTime || !duration) {
      alert("Please enter start time and duration.");
      return;
    }
    const durationMinutes = parseInt(duration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      alert("Duration must be a positive number of minutes.");
      return;
    }
    // --- End Validations ---

    setIsUploading(true);
    setUploadProgress(0);

    const calculatedEndTime = new Date(
      new Date(startTime).getTime() + durationMinutes * 60 * 1000
    );

    // --- File Upload Logic ---
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
        setFileError(`Image upload failed: ${error.message}`);
        setIsUploading(false);
        setUploadProgress(0);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at", downloadURL);

          await addDoc(collection(db, "drops"), {
            name: name || "Untitled Drop",
            reward,
            startTime: Timestamp.fromDate(new Date(startTime)),
            endTime: Timestamp.fromDate(calculatedEndTime),
            location: new GeoPoint(selectedLat, selectedLng),
            imageUrl: downloadURL,
            createdAt: Timestamp.now(),
          });

          alert("Drop created successfully!");

          // --- Reset Form State ---
          setName("");
          setReward("");
          setStartTime("");
          setDuration("");
          setSelectedLat(null);
          setSelectedLng(null);
          setSelectedFile(null);
          setFileError("");
          if (document.getElementById("drop-image-input")) {
            document.getElementById("drop-image-input").value = null;
          }
          // --- End Reset ---
        } catch (firestoreError) {
          console.error("Error creating drop document:", firestoreError);
          alert(
            "Failed to save drop details to database after image upload."
          );
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    );
  };

  // --- Styles --- (Keep existing styles)
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
      transition: "background 0.3s ease, opacity 0.3s ease",
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

  // Determine if the button should be disabled
  const isButtonDisabled =
    isUploading ||
    !selectedLat ||
    !selectedLng ||
    !selectedFile ||
    !name ||
    !reward ||
    !startTime ||
    !duration;

  // *** ADD THIS CONSOLE LOG ***
  // Log the state values right before rendering the button
  console.log("--- Button State Check ---");
  console.log("isUploading:", isUploading);
  console.log("selectedLat:", selectedLat);
  console.log("selectedLng:", selectedLng);
  console.log("selectedFile:", selectedFile); // Check if this is null or a File object
  console.log("name:", `"${name}"`); // Log strings in quotes to see empty strings
  console.log("reward:", `"${reward}"`);
  console.log("startTime:", `"${startTime}"`);
  console.log("duration:", `"${duration}"`);
  console.log("isButtonDisabled:", isButtonDisabled); // See the final result
  console.log("--------------------------");

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <h2
          style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}
        >
          📍 Create New Drop
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Drop Name */}
          <label style={styles.label}>Drop Name</label>
          <input
            type="text"
            placeholder="e.g., Campus Coffee Drop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            required
          />

          {/* Reward Selection */}
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

          {/* Start Time */}
          <label style={styles.label}>Start Date & Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={styles.input}
            required
          />

          {/* Duration */}
          <label style={styles.label}>Duration (in minutes)</label>
          <input
            type="number"
            min="1"
            placeholder="e.g., 60"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={styles.input}
            required
          />

          {/* File Input */}
          <div style={styles.fileInputContainer}>
            <label style={styles.label}>Drop Image</label>
            <input
              id="drop-image-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={styles.input}
              required
              disabled={isUploading}
            />
            {fileError && <p style={styles.errorText}>{fileError}</p>}
          </div>

          {/* Location Display */}
          {selectedLat && selectedLng && (
            <div style={styles.locationText}>
              Location: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
            </div>
          )}

          {/* Upload Progress Bar */}
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

          {/* Submit Button */}
          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: isButtonDisabled ? 0.6 : 1,
              cursor: isButtonDisabled ? "not-allowed" : "pointer",
            }}
            disabled={isButtonDisabled}
          >
            {isUploading
              ? `Uploading (${Math.round(uploadProgress)}%)...`
              : "Create Drop"}
          </button>
        </form>
      </div>

      {/* Map Picker Component */}
      <AdminMapPicker
        selectedLat={selectedLat}
        selectedLng={selectedLng}
        setSelectedLat={setSelectedLat} // Make sure these props are correctly passed and handled
        setSelectedLng={setSelectedLng} // in AdminMapPicker
        searchBoxStyle={styles.searchBox}
        searchInputStyle={styles.searchInput}
      />
    </div>
  );
}

export default DropsManager;
