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
  addDoc,
  increment,
  getCountFromServer,
} from "firebase/firestore";

function SubmissionsReview() {
  // State to hold categorized drops
  const [activeDrops, setActiveDrops] = useState([]);
  const [inactiveDrops, setInactiveDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  // *** NEW STATE: Store reward details for the selected drop ***
  const [selectedDropRewardData, setSelectedDropRewardData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingDrops, setLoadingDrops] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false); // Now covers submissions AND reward check

  // useEffect to fetch, count, and categorize drops (no changes here)
  useEffect(() => {
    const fetchDropsAndCounts = async () => {
      setLoadingDrops(true);
      setActiveDrops([]);
      setInactiveDrops([]);
      try {
        const dropsSnapshot = await getDocs(collection(db, "drops"));
        const dropsData = dropsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const countPromises = dropsData.map(async (drop) => {
          const submissionsQuery = query(collection(db, "submissions"), where("dropId", "==", drop.id), where("status", "==", "Pending"));
          const countSnapshot = await getCountFromServer(submissionsQuery);
          return { ...drop, pendingCount: countSnapshot.data().count };
        });
        const dropsWithCounts = await Promise.all(countPromises);
        const now = new Date();
        const active = []; const inactive = [];
        dropsWithCounts.forEach((drop) => {
          const startTime = drop.startTime?.toDate ? drop.startTime.toDate() : null;
          const endTime = drop.endTime?.toDate ? drop.endTime.toDate() : null;
          if (startTime && endTime && startTime <= now && endTime >= now) { active.push(drop); }
          else { inactive.push(drop); }
        });
        active.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        inactive.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setActiveDrops(active);
        setInactiveDrops(inactive);
      } catch (error) { console.error("Error fetching drops/counts:", error); }
      finally { setLoadingDrops(false); }
    };
    fetchDropsAndCounts();
  }, []);

  // --- Updated function to fetch Submissions AND Reward Type for the selected drop ---
  const fetchSubmissionsAndRewardForDrop = async (drop) => {
    if (!drop || !drop.id) return;
    setLoadingSubmissions(true);
    setSubmissions([]);
    setSelectedDropRewardData(null); // Reset reward data on new selection

    try {
      // 1. Fetch Reward details for the selected drop first
      let rewardData = null;
      const rewardName = drop.reward; // Get reward name from the passed drop object
      if (rewardName) {
        const rewardsQuery = query(collection(db, "rewards"), where("name", "==", rewardName));
        const rewardsSnapshot = await getDocs(rewardsQuery);
        if (!rewardsSnapshot.empty) {
          rewardData = { id: rewardsSnapshot.docs[0].id, ...rewardsSnapshot.docs[0].data() };
          setSelectedDropRewardData(rewardData); // Store reward data in state
          console.log("Selected Drop Reward Type:", rewardData.type);
        } else {
          console.warn(`Reward details not found for name: "${rewardName}"`);
        }
      } else {
        console.warn(`Reward name missing in selected drop: ${drop.id}`);
      }

      // 2. Fetch Submissions (only pending)
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("dropId", "==", drop.id),
        where("status", "==", "Pending")
      );
      const submissionSnapshot = await getDocs(submissionsQuery);
      const submissionsData = submissionSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (submissionsData.length === 0) {
        setSubmissions([]); // Ensure submissions are empty if none found
        // Keep loading false, reward data might still be set
      } else {
        // 3. Fetch Usernames
        const userPromises = submissionsData.map((sub) => sub.userId ? getDoc(doc(db, "user", sub.userId)) : Promise.resolve(null));
        const userDocs = await Promise.all(userPromises);
        const usernameMap = {};
        userDocs.forEach((userDoc) => { if (userDoc?.exists()) { usernameMap[userDoc.id] = userDoc.data().username || "Unknown"; } });
        const submissionsWithUsernames = submissionsData.map((sub) => ({ ...sub, username: usernameMap[sub.userId] || sub.userId || "Unknown User" }));
        setSubmissions(submissionsWithUsernames);
      }
    } catch (error) {
      console.error("Error fetching submissions or reward data:", error);
      setSelectedDropRewardData(null); // Clear reward data on error
      setSubmissions([]); // Clear submissions on error
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Updated handler to call the new fetch function
  const handleSelectDrop = (drop) => {
    setSelectedDrop(drop);
    fetchSubmissionsAndRewardForDrop(drop); // Pass the whole drop object
  };

  // Updated handler to reset reward data state
  const handleGoBack = () => {
    setSelectedDrop(null);
    setSelectedDropRewardData(null); // Reset reward data
    setSubmissions([]);
  };

  // --- Approval Handlers ---

  // Standard Approve (Handles Points or Vouchers/Other)
  const handleApprove = async (submission) => {
    // Basic validation
    if (!submission?.id || !submission?.dropId || !submission?.userId) { console.error("Invalid submission data:", submission); alert("Cannot approve: Missing details."); return; }

    // Use reward data from state if available, otherwise re-fetch (safer)
    let rewardDataToUse = selectedDropRewardData;
    let rewardName = selectedDrop?.reward;

    try {
        // Re-fetch reward data inside handler for consistency, especially if state could be stale
        const dropDocRef = doc(db, "drops", submission.dropId);
        const dropDocSnap = await getDoc(dropDocRef);
        if (!dropDocSnap.exists()) throw new Error(`Drop ${submission.dropId} not found.`);
        const dropData = dropDocSnap.data();
        rewardName = dropData.reward;
        if (!rewardName) throw new Error(`Reward name missing in drop ${submission.dropId}.`);

        const rewardsQuery = query(collection(db, "rewards"), where("name", "==", rewardName));
        const rewardsSnapshot = await getDocs(rewardsQuery);
        if (rewardsSnapshot.empty) throw new Error(`Reward details not found for name: "${rewardName}".`);
        rewardDataToUse = { id: rewardsSnapshot.docs[0].id, ...rewardsSnapshot.docs[0].data() };

        // Proceed with approval logic
        await updateDoc(doc(db, "submissions", submission.id), { status: "approved" });
        const userRef = doc(db, "user", submission.userId);

        if (rewardDataToUse.type?.toLowerCase() === "points") {
            const pointsToAdd = parseInt(rewardDataToUse.value, 10);
            if (isNaN(pointsToAdd)) throw new Error(`Invalid point value "${rewardDataToUse.value}".`);
            await updateDoc(userRef, { point: increment(pointsToAdd) });
        } else {
            const userRewardRef = collection(userRef, "reward");
            const expirationDate = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
            await addDoc(userRewardRef, { name: rewardDataToUse.name, value: rewardDataToUse.value, type: rewardDataToUse.type, claimed: false, issuedAt: Timestamp.now(), exp: expirationDate, dropId: submission.dropId });
        }

        // Update UI and counts
        setSubmissions((prev) => prev.filter((sub) => sub.id !== submission.id));
        setActiveDrops(prev => prev.map(d => d.id === submission.dropId ? {...d, pendingCount: Math.max(0, (d.pendingCount ?? 1) - 1)} : d));
        setInactiveDrops(prev => prev.map(d => d.id === submission.dropId ? {...d, pendingCount: Math.max(0, (d.pendingCount ?? 1) - 1)} : d)); // Also update inactive just in case
        alert("Submission approved and reward processed!");

    } catch (error) { console.error("Error approving submission:", error); alert(`Failed to approve: ${error.message}`); }
  };

  // *** NEW Handler for Double Points ***
  const handleApproveDoublePoints = async (submission) => {
    if (!submission?.id || !submission?.dropId || !submission?.userId) { console.error("Invalid submission data:", submission); alert("Cannot approve: Missing details."); return; }

    try {
        // 1. Fetch necessary data (Drop -> Reward) - Essential to get correct value
        const dropDocRef = doc(db, "drops", submission.dropId);
        const dropDocSnap = await getDoc(dropDocRef);
        if (!dropDocSnap.exists()) throw new Error(`Drop ${submission.dropId} not found.`);
        const dropData = dropDocSnap.data();
        const rewardName = dropData.reward;
        if (!rewardName) throw new Error(`Reward name missing in drop ${submission.dropId}.`);

        const rewardsQuery = query(collection(db, "rewards"), where("name", "==", rewardName));
        const rewardsSnapshot = await getDocs(rewardsQuery);
        if (rewardsSnapshot.empty) throw new Error(`Reward details not found for name: "${rewardName}".`);
        const rewardData = { id: rewardsSnapshot.docs[0].id, ...rewardsSnapshot.docs[0].data() };

        // 2. Check if it's actually a Points reward (safety check)
        if (rewardData.type?.toLowerCase() !== "points") {
            throw new Error(`Cannot award double points for non-points reward type: "${rewardData.type}".`);
        }

        // 3. Calculate Double Points
        const pointsValue = parseInt(rewardData.value, 10);
        if (isNaN(pointsValue)) throw new Error(`Invalid point value "${rewardData.value}".`);
        const doublePoints = pointsValue * 2;

        // 4. Update Submission Status
        await updateDoc(doc(db, "submissions", submission.id), { status: "approved" });

        // 5. Update User Points
        const userRef = doc(db, "user", submission.userId);
        await updateDoc(userRef, { point: increment(doublePoints) });

        // 6. Update UI and counts
        setSubmissions((prev) => prev.filter((sub) => sub.id !== submission.id));
        setActiveDrops(prev => prev.map(d => d.id === submission.dropId ? {...d, pendingCount: Math.max(0, (d.pendingCount ?? 1) - 1)} : d));
        setInactiveDrops(prev => prev.map(d => d.id === submission.dropId ? {...d, pendingCount: Math.max(0, (d.pendingCount ?? 1) - 1)} : d));
        alert(`Submission approved and ${doublePoints} points awarded!`);

    } catch (error) { console.error("Error approving with double points:", error); alert(`Failed to approve with double points: ${error.message}`); }
  };


  // handleReject (no changes needed here)
  const handleReject = async (submissionId, dropId) => {
    if (!submissionId) { console.error("Invalid submission ID"); return; }
    try {
      await updateDoc(doc(db, "submissions", submissionId), { status: "rejected" });
      setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
      setActiveDrops(prev => prev.map(d => d.id === dropId ? {...d, pendingCount: Math.max(0, (d.pendingCount ?? 1) - 1)} : d));
      setInactiveDrops(prev => prev.map(d => d.id === dropId ? {...d, pendingCount: Math.max(0, (d.pendingCount ?? 1) - 1)} : d));
      alert("Submission rejected.");
    } catch(error) { console.error("Error rejecting submission:", error); alert("Failed to reject submission."); }
  };
  // --- End unchanged functions ---

  // --- Styles --- (Add style for the new button)
  const styles = {
    // (Keep all previous styles: container, header, sectionHeader, dropListContainer, dropItem, dropImage, dropInfo, dropName, dropMeta, pendingCount, reviewButton, submissionViewContainer, backButton, submissionCard, submissionImg, submissionDetails, submissionDetailText, rejectButton, loadingText, noItemsText)
    container: { padding: "2rem", fontFamily: "'Inter', sans-serif" },
    header: { fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: "700", marginBottom: "1.5rem", color: "#1e3a8a", },
    sectionHeader: { fontSize: "1.4rem", fontWeight: "600", color: "#1e3a8a", marginTop: "2rem", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid #e0e7ff", },
    dropListContainer: {},
    dropItem: { display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", border: "1px solid #e0e0e0", borderRadius: "12px", marginBottom: "1rem", backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", },
    dropImage: { width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", flexShrink: 0, },
    dropInfo: { flexGrow: 1, display: "flex", flexDirection: "column", gap: "0.25rem", },
    dropName: { fontWeight: "600", fontSize: "1.1rem", color: "#2c3e50", },
    dropMeta: { fontSize: "0.85rem", color: "#555", },
    pendingCount: { fontSize: "0.9rem", fontWeight: "500", color: "#1e3a8a", backgroundColor: "#e0e7ff", padding: "0.3rem 0.8rem", borderRadius: "999px", textAlign: "center", whiteSpace: "nowrap", flexShrink: 0, marginRight: '1rem', },
    reviewButton: { backgroundColor: "#3b4cca", color: "#fff", border: "none", padding: "0.7rem 1.5rem", borderRadius: "999px", cursor: "pointer", fontWeight: "500", fontFamily: "'IBM Plex Mono', monospace", transition: "background-color 0.2s", whiteSpace: "nowrap", flexShrink: 0, ":hover": { backgroundColor: "#312e81", }, }, // Adjusted hover color
    submissionViewContainer: {},
    backButton: { backgroundColor: "#6b7280", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "999px", cursor: "pointer", fontWeight: "500", fontFamily: "'IBM Plex Mono', monospace", marginBottom: "1.5rem", transition: "background-color 0.2s", ":hover": { backgroundColor: "#4b5563", }, },
    submissionCard: { border: "1px solid #e0e0e0", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", },
    submissionImg: { width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", border: "1px solid #eee", flexShrink: 0, },
    submissionDetails: { flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.4rem", paddingLeft: "1rem", paddingRight: "1rem", },
    submissionDetailText: { fontSize: "0.95rem", color: "#333", lineHeight: 1.4, },
    submissionButtons: { display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0, }, // Reduced gap slightly
    // Standard Accept button
    approveButton: {
      backgroundColor: "#3b4cca", // Keep original blue
      color: "#fff", border: "none", padding: "0.5rem 1.2rem", // Slightly smaller padding
      borderRadius: "999px", cursor: "pointer", fontWeight: "500", textAlign: "center", minWidth: "140px", // Adjusted min-width
      transition: "background-color 0.2s", ":hover": { backgroundColor: "#312e81", }, // Darker blue
    },
    // *** NEW STYLE for Double Points button ***
    doublePointsButton: {
        backgroundColor: "#15803d", // Green color for emphasis
        color: "#fff", border: "none", padding: "0.5rem 1.2rem", // Match approve button
        borderRadius: "999px", cursor: "pointer", fontWeight: "500", textAlign: "center", minWidth: "140px", // Match approve button
        transition: "background-color 0.2s", ":hover": { backgroundColor: "#166534", }, // Darker green
    },
    rejectButton: {
      backgroundColor: "#991b1b", color: "#fff", border: "none", padding: "0.5rem 1.2rem", // Match approve button
      borderRadius: "999px", cursor: "pointer", fontWeight: "500", textAlign: "center", minWidth: "140px", // Match approve button
      transition: "background-color 0.2s", ":hover": { backgroundColor: "#7f1d1d", },
    },
    loadingText: { textAlign: "center", padding: "2rem", color: "#666", fontSize: "1.1rem", },
    noItemsText: { padding: "1rem 0", color: "#888", fontSize: "0.95rem", },
  };

  // Helper to format Firestore Timestamps (no changes needed)
  const formatDate = (timestamp) => {
    if (timestamp?.toDate) { return timestamp.toDate().toLocaleString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, day: "2-digit", month: "2-digit", year: "2-digit" }); } return "N/A";
  };

  // --- Render Logic --- (Update Submission Card Buttons)
  return (
    <div style={styles.container}>
      {!selectedDrop ? (
        // View 1: List of Drops (No changes needed here)
        <div style={styles.dropListContainer}>
          <h2 style={styles.header}>Review Submissions by Drop</h2>
          {loadingDrops ? ( <p style={styles.loadingText}>Loading drops and counts...</p> ) : (
            <>
              <h3 style={styles.sectionHeader}>Active Drops</h3>
              {activeDrops.length === 0 ? ( <p style={styles.noItemsText}>No active drops found.</p> ) : (
                activeDrops.map((drop) => (
                  <div key={drop.id} style={styles.dropItem}>
                    <img src={drop.imageUrl} alt={drop.name || "Drop"} style={styles.dropImage} onError={(e) => { e.target.style.display = "none"; }} />
                    <div style={styles.dropInfo}>
                      <div style={styles.dropName}>{drop.name || "Unnamed"}</div>
                      <div style={styles.dropMeta}>Start: {formatDate(drop.startTime)} | End: {formatDate(drop.endTime)}</div>
                      <div style={styles.dropMeta}>Reward: {drop.reward || "N/A"}</div>
                    </div>
                    <div style={styles.pendingCount}>{drop.pendingCount ?? 0} Pending</div>
                    <button style={styles.reviewButton} onClick={() => handleSelectDrop(drop)}>Review</button>
                  </div>
                ))
              )}
              <h3 style={styles.sectionHeader}>Inactive Drops</h3>
              {inactiveDrops.length === 0 ? ( <p style={styles.noItemsText}>No inactive drops found.</p> ) : (
                inactiveDrops.map((drop) => (
                   <div key={drop.id} style={styles.dropItem}>
                    <img src={drop.imageUrl} alt={drop.name || "Drop"} style={styles.dropImage} onError={(e) => { e.target.style.display = "none"; }} />
                    <div style={styles.dropInfo}>
                      <div style={styles.dropName}>{drop.name || "Unnamed"}</div>
                      <div style={styles.dropMeta}>Start: {formatDate(drop.startTime)} | End: {formatDate(drop.endTime)}</div>
                      <div style={styles.dropMeta}>Reward: {drop.reward || "N/A"}</div>
                    </div>
                    <div style={styles.pendingCount}>{drop.pendingCount ?? 0} Pending</div>
                    <button style={styles.reviewButton} onClick={() => handleSelectDrop(drop)}>Review</button>
                  </div>
                ))
              )}
              {activeDrops.length === 0 && inactiveDrops.length === 0 && !loadingDrops && (
                 <p style={{...styles.noItemsText, marginTop: '1rem', textAlign: 'center'}}>No drops available to review.</p>
              )}
            </>
          )}
        </div>
      ) : (
        // View 2: Submissions for Selected Drop (Updated Buttons)
        <div style={styles.submissionViewContainer}>
          <button onClick={handleGoBack} style={styles.backButton}>&larr; Back to Drops List</button>
          <h2 style={styles.header}>Reviewing Submissions for: {selectedDrop.name}</h2>
          {loadingSubmissions ? ( <p style={styles.loadingText}>Loading submissions...</p> ) :
           submissions.length === 0 ? ( <p style={styles.noItemsText}>No pending submissions found for this drop.</p> ) :
           ( submissions.map((submission) => (
              <div key={submission.id} style={styles.submissionCard}>
                <img src={submission.photoUrl} alt="Submission" style={styles.submissionImg} onError={(e) => { e.target.style.display = "none"; }} />
                <div style={styles.submissionDetails}>
                  <p style={styles.submissionDetailText}>Submitted by: <strong>{submission.username}</strong></p>
                  <p style={styles.submissionDetailText}>Submitted at: {formatDate(submission.timestamp)}</p>
                </div>
                {/* --- Updated Button Logic --- */}
                <div style={styles.submissionButtons}>
                  {/* Standard Accept Button (Always shown) */}
                  <button style={styles.approveButton} onClick={() => handleApprove(submission)}>
                    Accept
                  </button>

                  {/* Double Points Button (Conditional) */}
                  {selectedDropRewardData?.type?.toLowerCase() === 'points' && (
                    <button style={styles.doublePointsButton} onClick={() => handleApproveDoublePoints(submission)}>
                      Accept (x2 Points)
                    </button>
                  )}

                  {/* Reject Button (Always shown) */}
                  <button style={styles.rejectButton} onClick={() => handleReject(submission.id, submission.dropId)}>
                    Reject
                  </button>
                </div>
                {/* --- End Updated Button Logic --- */}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SubmissionsReview;
