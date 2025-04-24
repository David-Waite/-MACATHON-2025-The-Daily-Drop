import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

function DashboardOverview() {
  const [totalDrops, setTotalDrops] = useState(0);
  const [activeDrops, setActiveDrops] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [rewardsGiven, setRewardsGiven] = useState(0);
  const [usersParticipating, setUsersParticipating] = useState(0);
  const [nearlyExpiredDrops, setNearlyExpiredDrops] = useState([]); // 🔥 New state

  useEffect(() => {
    const fetchData = async () => {
      const dropsSnapshot = await getDocs(collection(db, "drops"));
      const submissionsSnapshot = await getDocs(collection(db, "submissions"));

      const dropsData = dropsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTotalDrops(dropsData.length);

      const now = new Date();
      const active = dropsData.filter((drop) => drop.endTime.toDate() >= now).length;
      setActiveDrops(active);

      // 🔥 Nearly Expired Logic (Next 48 hours)
      const soonExpiring = dropsData.filter((drop) => {
        const endTime = drop.endTime.toDate();
        const timeLeft = (endTime - now) / (1000 * 60 * 60); // hours left
        return timeLeft <= 48 && timeLeft > 0;
      });
      setNearlyExpiredDrops(soonExpiring);

      setTotalSubmissions(submissionsSnapshot.size);
      setRewardsGiven(18); // Placeholder
      setUsersParticipating(42); // Placeholder
    };

    fetchData();
  }, []);

  const styles = {
    container: {
      padding: "2rem",
      fontFamily: "'Inter', sans-serif",
    },
    header: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "2rem",
      fontWeight: "700",
      marginBottom: "2rem",
      color: "#1e3a8a",
    },
    cardsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "1.5rem",
    },
    card: {
      backgroundColor: "#fff",
      border: "2px solid #1e3a8a",
      borderRadius: "12px",
      padding: "1.2rem",
      textAlign: "center",
    },
    cardTitle: {
      fontSize: "1rem",
      color: "#444",
      marginBottom: "0.5rem",
    },
    cardValue: {
      fontSize: "1.8rem",
      fontWeight: "600",
      color: "#1e3a8a",
      fontFamily: "'IBM Plex Mono', monospace",
    },
    expiredSection: {
      marginTop: "2rem",
    },
    expiredTitle: {
      fontSize: "1.2rem",
      fontWeight: "600",
      color: "#1e3a8a",
      marginBottom: "1rem",
    },
    expiredItem: {
      padding: "0.5rem 0",
      borderBottom: "1px solid #ddd",
      fontSize: "0.95rem",
      color: "#333",
    },
    timer: {
      fontWeight: "bold",
      color: "#d97706", // orange
    },
  };

  const formatTimeLeft = (endTime) => {
    const now = new Date();
    const timeLeftMs = endTime - now;
    const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Dashboard Overview</h2>
      <div style={styles.cardsGrid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Drops</div>
          <div style={styles.cardValue}>{totalDrops}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Active Drops</div>
          <div style={styles.cardValue}>{activeDrops}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Pending Submissions</div>
          <div style={styles.cardValue}>{totalSubmissions}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Rewards Given</div>
          <div style={styles.cardValue}>{rewardsGiven}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Users Participating</div>
          <div style={styles.cardValue}>{usersParticipating}</div>
        </div>
      </div>

      {/* 🔥 Nearly Expired Drops */}
      {nearlyExpiredDrops.length > 0 && (
        <div style={styles.expiredSection}>
          <div style={styles.expiredTitle}>Drops Expiring Soon:</div>
          {nearlyExpiredDrops.map((drop) => (
            <div key={drop.id} style={styles.expiredItem}>
              📍 <strong>{drop.name}</strong> - Expires in{" "}
              <span style={styles.timer}>{formatTimeLeft(drop.endTime.toDate())}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardOverview;
