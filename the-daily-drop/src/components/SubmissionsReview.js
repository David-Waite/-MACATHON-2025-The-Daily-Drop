import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

function SubmissionsReview() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const snapshot = await getDocs(collection(db, "submissions"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubmissions(data);
    };

    fetchSubmissions();
  }, []);

  const handleApprove = async (id) => {
    await updateDoc(doc(db, "submissions", id), { status: "approved" });
    setSubmissions(submissions.filter((sub) => sub.id !== id));
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
            <button style={styles.approve} onClick={() => handleApprove(submission.id)}>Approve</button>
            <button style={styles.reject} onClick={() => handleReject(submission.id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SubmissionsReview;
