import React, { useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import DashboardOverview from "./DashboardOverview";
import DropsManager from "./DropListManager";
import SubmissionsReview from "./SubmissionsReview";
import RewardsManager from "./RewardsManager";

function AdminDashboard() {
  const [view, setView] = useState("dashboard");

  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate("/login");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  const styles = {
    container: {
      display: "flex",
      height: "100vh",
      fontFamily: "'Playfair Display', serif", // Elegant serif font
      backgroundColor: "#1e3a8a", // deep royal blue
     
    },
    sidebar: {
      width: "250px",
      backgroundColor: "#1e3a8a",
      padding: "2rem 1rem",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      borderRight: "1px solid #3b4cca",
    },
    sidebarTop: {
      display: "flex",
      flexDirection: "column",
    },
    header: {
      fontSize: "1.9rem",
      fontWeight: "700",
      color: "#fef9f3",
      marginBottom: "2rem",
      marginLeft:"0.7rem",
      textAlign: "left",
      lineHeight: "1.2",
    },
    navButton: (active) => ({
      backgroundColor: active ? "#fef9f3" : "transparent",
      color: active ? "#1e3a8a" : "#fef9f3",
      border: "1px solid #fef9f3",
      borderRadius: "999px",    
      padding: "0.75rem 1rem",
      marginBottom: "1rem",
      textAlign: "left",
      cursor: "pointer",
      fontSize: "1rem",
      fontWeight: "500",

      fontFamily: "'IBM Plex Mono', monospace",
      transition: "all 0.2s ease",
    }),
    logoutButton: {
        
      backgroundColor: "#991b1b",
      color: "#fef9f3",
      border: "none",
      fontFamily: "'IBM Plex Mono', monospace",
      borderRadius: "999px",    
      padding: "0.55rem 1rem",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "1rem",
      marginTop: "2rem",
    },
    main: {
      flex: 1,
      padding: "2rem",
      overflowY: "auto",
      backgroundColor: "#FFFFFF",
      color: "#1e3a8a", // flip text for main content
      fontFamily: "'Inter', sans-serif", // cleaner content font
    },
    mainHeader: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "2rem",
      fontWeight: "700",
      marginBottom: "1rem",
    },
  };
  

  return (
    <div style={styles.container}>
    {/* Sidebar */}
    <div style={styles.sidebar}>
      <div style={styles.sidebarTop}>
        <div style={styles.header}>Admin Dashboard</div>
        <button style={styles.navButton(view === "dashboard")} onClick={() => setView("dashboard")}>
          Dashboard Overview
        </button>
        <button style={styles.navButton(view === "drops")} onClick={() => setView("drops")}>
          Manage Drops
        </button>
        <button style={styles.navButton(view === "submissions")} onClick={() => setView("submissions")}>
          Review Submissions
        </button>
        <button style={styles.navButton(view === "rewards")} onClick={() => setView("rewards")}>
          Rewards
        </button>
      </div>
  
      <button style={styles.logoutButton} onClick={handleLogout}>
        Logout
      </button>
    </div>
  
    {/* Main Content */}
    <div style={styles.main}>
      {view === "dashboard" && <DashboardOverview />}
      {view === "drops" && <DropsManager />}
      {view === "submissions" && <SubmissionsReview />}
      {view === "rewards" && <RewardsManager />}
    </div>
  </div>
  
  
  );
}

export default AdminDashboard;
