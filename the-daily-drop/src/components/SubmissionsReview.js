import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  Timestamp,
  getDoc,
} from "firebase/firestore";

function SubmissionsReview() {
  const [drops, setDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingDrops, setLoadingDrops] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Fetch all drops on initial load
  useEffect(() => {
    const fetchDrops = async () => {
      setLoadingDrops(true);
      try {
        const snapshot = await getDocs(collection(db, "drops"));
        const dropsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        dropsData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setDrops(dropsData);
      } catch (error) {
        console.error("Error fetching drops:", error);
      } finally {
        setLoadingDrops(false);
      }
    };

    fetchDrops();
  }, []);

  // Function to fetch submissions AND usernames for a specific drop
  const fetchSubmissionsForDrop = async (dropId) => {
    if (!dropId) return;
    setLoadingSubmissions(true);
    setSubmissions([]);
    try {
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("dropId", "==", dropId),
        where("status", "==", "Pending")
      );
      const submissionSnapshot = await getDocs(submissionsQuery);
      const submissionsData = submissionSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (submissionsData.length === 0) {
        setSubmissions([]);
        setLoadingSubmissions(false);
        return;
      }

      const userPromises = submissionsData.map((sub) => {
        if (sub.userId) {
          return getDoc(doc(db, "user", sub.userId));
        }
        return Promise.resolve(null);
      });

      const userDocs = await Promise.all(userPromises);

      const usernameMap = {};
      userDocs.forEach((userDoc) => {
        if (userDoc && userDoc.exists()) {
          usernameMap[userDoc.id] = userDoc.data().username || "Unknown";
        }
      });

      const submissionsWithUsernames = submissionsData.map((sub) => ({
        ...sub,
        username: usernameMap[sub.userId] || sub.userId || "Unknown User",
      }));

      setSubmissions(submissionsWithUsernames);
    } catch (error) {
      console.error("Error fetching submissions or user data:", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Handler when "Review" button is clicked for a drop
  const handleSelectDrop = (drop) => {
    setSelectedDrop(drop);
    fetchSubmissionsForDrop(drop.id);
  };

  // Handler to go back to the drops list
  const handleGoBack = () => {
    setSelectedDrop(null);
    setSubmissions([]);
  };

  // Handlers for approving/rejecting submissions
  const handleApprove = async (submissionId) => {
    try {
      await updateDoc(doc(db, "submissions", submissionId), {
        status: "approved",
      });
      setSubmissions(submissions.filter((sub) => sub.id !== submissionId));
      alert("Submission approved!");
    } catch (error) {
      console.error("Error approving submission:", error);
      alert("Failed to approve submission.");
    }
  };

  const handleReject = async (submissionId) => {
    try {
      await updateDoc(doc(db, "submissions", submissionId), {
        status: "rejected",
      });
      setSubmissions(submissions.filter((sub) => sub.id !== submissionId));
      alert("Submission rejected!");
    } catch (error) {
      console.error("Error rejecting submission:", error);
      alert("Failed to reject submission.");
    }
  };

  // --- Styles ---
  const styles = {
    container: { padding: "2rem", fontFamily: "'Inter', sans-serif" },
    header: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "2rem",
      fontWeight: "700",
      marginBottom: "1.5rem",
      color: "#1e3a8a",
    },
    // Styles for Drop List View
    dropListContainer: {},
    dropItem: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      padding: "1rem",
      border: "1px solid #e0e0e0",
      borderRadius: "12px",
      marginBottom: "1rem",
      backgroundColor: "#fff",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    },
    dropImage: {
      width: "80px",
      height: "80px",
      objectFit: "cover",
      borderRadius: "8px",
      flexShrink: 0,
    },
    dropInfo: {
      flexGrow: 1,
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
    },
    dropName: {
      fontWeight: "600",
      fontSize: "1.1rem",
      color: "#2c3e50",
    },
    dropMeta: {
      fontSize: "0.85rem",
      color: "#555",
    },
    reviewButton: {
      backgroundColor: "#3b4cca",
      color: "#fff",
      border: "none",
      padding: "0.7rem 1.5rem",
      borderRadius: "999px",
      cursor: "pointer",
      fontWeight: "500",
      fontFamily: "'IBM Plex Mono', monospace",
      transition: "background-color 0.2s",
      whiteSpace: "nowrap",
      flexShrink: 0,
      ":hover": {
        backgroundColor: "#2563eb",
      },
    },
    // Styles for Submission Review View
    submissionViewContainer: {},
    backButton: {
      backgroundColor: "#6b7280",
      color: "#fff",
      border: "none",
      padding: "0.6rem 1.2rem",
      borderRadius: "999px",
      cursor: "pointer",
      fontWeight: "500",
      fontFamily: "'IBM Plex Mono', monospace",
      marginBottom: "1.5rem",
      transition: "background-color 0.2s",
      ":hover": {
        backgroundColor: "#4b5563",
      },
    },
    // *** UPDATED submissionCard styles ***
    submissionCard: {
      border: "1px solid #e0e0e0", // Lighter border
      borderRadius: "12px",
      padding: "1rem",
      marginBottom: "1rem",
      display: "flex", // Use flexbox
      alignItems: "center", // Vertically center items
      justifyContent: "space-between", // Space out image, details, buttons
      gap: "1rem",
      backgroundColor: "#fff", // White background like image
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)", // Subtle shadow
    },
    // *** UPDATED submissionImg styles ***
    submissionImg: {
      width: "100px", // Adjust size as needed
      height: "100px",
      objectFit: "cover",
      borderRadius: "8px",
      border: "1px solid #eee", // Very light border
      flexShrink: 0, // Prevent shrinking
    },
    // *** UPDATED submissionDetails styles ***
    submissionDetails: {
      flexGrow: 1, // Take up space in the middle
      display: "flex",
      flexDirection: "column",
      justifyContent: "center", // Center text vertically if needed
      gap: "0.4rem", // Space between text lines
      paddingLeft: "1rem", // Add some space left of the text
      paddingRight: "1rem", // Add some space right of the text
    },
    submissionDetailText: {
      fontSize: "0.95rem",
      color: "#333",
      lineHeight: 1.4, // Adjust line height for spacing
    },
    // *** UPDATED submissionButtons styles ***
    submissionButtons: {
      display: "flex",
      flexDirection: "column", // Stack buttons vertically
      gap: "0.6rem", // Space between buttons
      flexShrink: 0, // Prevent shrinking
    },
    // *** UPDATED approveButton styles ***
    approveButton: {
      backgroundColor: "#3b4cca", // Blue color like image
      color: "#fff",
      border: "none",
      padding: "0.6rem 1.5rem", // Adjust padding for size
      borderRadius: "999px", // Pill shape
      cursor: "pointer",
      fontWeight: "500",
      textAlign: "center",
      minWidth: "100px", // Ensure minimum width
      transition: "background-color 0.2s",
      ":hover": {
        backgroundColor: "#2563eb", // Darker blue on hover
      },
    },
    // *** UPDATED rejectButton styles ***
    rejectButton: {
      backgroundColor: "#991b1b", // Dark red like image
      color: "#fff",
      border: "none",
      padding: "0.6rem 1.5rem", // Match approve button padding
      borderRadius: "999px", // Pill shape
      cursor: "pointer",
      fontWeight: "500",
      textAlign: "center",
      minWidth: "100px", // Ensure minimum width
      transition: "background-color 0.2s",
      ":hover": {
        backgroundColor: "#7f1d1d", // Darker red on hover
      },
    },
    loadingText: {
      textAlign: "center",
      padding: "2rem",
      color: "#666",
      fontSize: "1.1rem",
    },
    noItemsText: {
      textAlign: "center",
      padding: "1rem",
      color: "#888",
      fontSize: "1rem",
      border: "1px dashed #ccc",
      borderRadius: "8px",
      marginTop: "1rem",
    },
  };

  // Helper to format Firestore Timestamps
  const formatDate = (timestamp) => {
    if (timestamp && timestamp.toDate) {
      return timestamp
        .toDate()
        .toLocaleString("en-AU", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        });
    }
    return "N/A";
  };

  // --- Render Logic ---
  return (
    <div style={styles.container}>
      {!selectedDrop ? (
        // View 1: List of Drops
        <div style={styles.dropListContainer}>
          <h2 style={styles.header}>Select Drop to Review Submissions</h2>
          {loadingDrops ? (
            <p style={styles.loadingText}>Loading drops...</p>
          ) : drops.length === 0 ? (
            <p style={styles.noItemsText}>No drops found.</p>
          ) : (
            drops.map((drop) => (
              <div key={drop.id} style={styles.dropItem}>
                <img
                  src={drop.imageUrl}
                  alt={drop.name || "Drop image"}
                  style={styles.dropImage}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <div style={styles.dropInfo}>
                  <div style={styles.dropName}>{drop.name || "Unnamed Drop"}</div>
                  <div style={styles.dropMeta}>
                    Start Time: {formatDate(drop.startTime)} | End Time:{" "}
                    {formatDate(drop.endTime)}
                  </div>
                  <div style={styles.dropMeta}>
                    Reward: {drop.reward || "Not specified"}
                  </div>
                </div>
                <button
                  style={styles.reviewButton}
                  onClick={() => handleSelectDrop(drop)}
                >
                  Review
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        // View 2: Submissions for Selected Drop
        <div style={styles.submissionViewContainer}>
          <button onClick={handleGoBack} style={styles.backButton}>
            &larr; Back to Drops List
          </button>
          <h2 style={styles.header}>
            Reviewing Submissions for: {selectedDrop.name}
          </h2>
          {loadingSubmissions ? (
            <p style={styles.loadingText}>Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <p style={styles.noItemsText}>
              No pending submissions found for this drop.
            </p>
          ) : (
            submissions.map((submission) => (
              <div key={submission.id} style={styles.submissionCard}>
                {/* Image on the left */}
                <img
                  src={submission.photoUrl}
                  alt="Submission"
                  style={styles.submissionImg}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                {/* Details in the middle */}
                <div style={styles.submissionDetails}>
                  <p style={styles.submissionDetailText}>
                    Submitted by: <strong>{submission.username}</strong>
                  </p>
                  <p style={styles.submissionDetailText}>
                    Submitted at: {formatDate(submission.timestamp)}
                  </p>
                </div>
                {/* Buttons stacked on the right */}
                <div style={styles.submissionButtons}>
                  <button
                    style={styles.approveButton}
                    onClick={() => handleApprove(submission.id)}
                  >
                    Accept {/* <-- Text changed */}
                  </button>
                  <button
                    style={styles.rejectButton}
                    onClick={() => handleReject(submission.id)}
                  >
                    Reject {/* <-- Text changed */}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SubmissionsReview;
