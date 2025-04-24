import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import DropsManager from "./DropsManager";

function DropListManager() {
  const [drops, setDrops] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const fetchDrops = async () => {
      const snapshot = await getDocs(collection(db, "drops"));
      const dropsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDrops(dropsData);
    };

    fetchDrops();
  }, []);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "drops", id));
    setDrops(drops.filter((drop) => drop.id !== id));
  };

  if (showCreateForm) {
    return <DropsManager />;
  }

  const styles = {
    container: {
      padding: "2rem",
      fontFamily: "'Inter', sans-serif",
    },
    header: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "1.8rem",
      fontWeight: "700",
      marginBottom: "1rem",
      color: "#1e3a8a",
    },
    createButton: {
      marginBottom: "1.5rem",
      padding: "10px 20px",
      borderRadius: "999px",
      border: "1px solid #002AB8",
      color: "#002AB8",
      background: "#fff",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "1rem",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      borderBottom: "1px solid #ddd",
      padding: "12px 8px",
      textAlign: "left",
      fontWeight: "600",
      color: "#1e3a8a",
    },
    td: {
      padding: "12px 8px",
      fontSize: "0.95rem",
    },
    actionButton: {
      marginRight: "10px",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "0.95rem",
    },
    editButton: {
      color: "#1e3a8a",
    },
    deleteButton: {
      color: "red",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Manage Drops</h2>

      <button
        onClick={() => setShowCreateForm(true)}
        style={styles.createButton}
      >
        + Create New Drop
      </button>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Location</th>
            <th style={styles.th}>Start</th>
            <th style={styles.th}>End</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drops.map((drop) => (
            <tr key={drop.id}>
              <td style={styles.td}>{drop.name}</td>
              <td style={styles.td}>
                {drop.location?.latitude.toFixed(3)}, {drop.location?.longitude.toFixed(3)}
              </td>
              <td style={styles.td}>{drop.startTime.toDate().toLocaleString()}</td>
              <td style={styles.td}>{drop.endTime.toDate().toLocaleString()}</td>
              <td style={styles.td}>
                <button
                  style={{ ...styles.actionButton, ...styles.editButton }}
                  onClick={() => alert("Edit functionality coming soon!")}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(drop.id)}
                  style={{ ...styles.actionButton, ...styles.deleteButton }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {drops.length === 0 && (
            <tr>
              <td colSpan="5" style={{ ...styles.td, textAlign: "center" }}>
                No drops available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DropListManager;
