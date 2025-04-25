import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getDoc, addDoc, increment, Timestamp } from "firebase/firestore";
import { query, where } from "firebase/firestore";

function SubmissionsReview() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
  const fetchSubmissions = async () => {
    const snapshot = await getDocs(collection(db, "submissions"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Print status of each submission
    console.log("Fetched Submissions:");
    data.forEach((sub) => {
      console.log(`ID: ${sub.id}, Status: ${sub.status}`);
    });

    // Filter for status === "pending" (case-insensitive)
    const pendingSubmissions = data.filter(
      (sub) => sub.status?.toLowerCase() === "pending"
    );

    setSubmissions(pendingSubmissions);
  };

  fetchSubmissions();
}, []);

  const handleApprove = async (submission) => {
    try {
      await updateDoc(doc(db, "submissions", submission.id), { status: "approved" });
  
      const dropDocRef = doc(db, "drops", submission.dropId);
      const dropDocSnap = await getDoc(dropDocRef);
      const dropData = dropDocSnap.data();
  
      const rewardName = dropData.reward;
  
      const rewardsQuery = query(collection(db, "rewards"), where("name", "==", rewardName));
      const rewardsSnapshot = await getDocs(rewardsQuery);
  
      if (rewardsSnapshot.empty) {
        throw new Error("Reward not found for name: " + rewardName);
      }
  
      const rewardData = rewardsSnapshot.docs[0].data();
  
      const userRef = doc(db, "user", submission.userId);
  
      if (rewardData.type === "Points") {
        await updateDoc(userRef, {
          point: increment(parseInt(rewardData.value, 10)),
        });
      } else {
        const userRewardRef = collection(userRef, "reward");
        await addDoc(userRewardRef, {
          name: rewardData.name,
          value: rewardData.value,
          type: rewardData.type,
          exp: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        });
      }
  
      setSubmissions(submissions.filter((sub) => sub.id !== submission.id));
      alert("Submission approved and reward given!");
    } catch (error) {
      console.error("Error approving submission:", error);
      alert("Failed to approve submission.");
    }
  };
  

  const handleReject = async (id) => {
    await updateDoc(doc(db, "submissions", id), { status: "rejected" });
    setSubmissions(submissions.filter((sub) => sub.id !== id));
  };

  const styles = {
    container: { padding: "2rem", fontFamily: "'Inter', sans-serif" },
    header: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "2rem",
      fontWeight: "700",
      marginBottom: "2rem",
      color: "#1e3a8a",
    },
    card: {
      border: "1px solid #1e3a8a",
      borderRadius: "12px",
      padding: "1rem",
      marginBottom: "1rem",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    img: { width: "150px", borderRadius: "8px" },
    details: { flex: 1 },
    buttons: { display: "flex", gap: "0.5rem" },
    approve: {
      backgroundColor: "#1e3a8a",
      color: "#fff",
      border: "none",
      padding: "0.5rem 1rem",
      borderRadius: "999px",
      cursor: "pointer",
    },
    reject: {
      backgroundColor: "#991b1b",
      color: "#fff",
      border: "none",
      padding: "0.5rem 1rem",
      borderRadius: "999px",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Review Submissions</h2>
      {submissions.length === 0 && <p>No pending submissions.</p>}
      {submissions.map((submission) => (
        <div key={submission.id} style={styles.card}>
          <img src={submission.photoUrl} alt="Submission" style={styles.img} />
          <div style={styles.details}>
            <p><strong>Submitted by:</strong> {submission.userName}</p>
            <p><strong>Drop:</strong> {submission.dropName}</p>
          </div>
          <div style={styles.buttons}>
          <button style={styles.approve} onClick={() => handleApprove(submission)}>Approve</button>

            <button style={styles.reject} onClick={() => handleReject(submission.id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SubmissionsReview;
