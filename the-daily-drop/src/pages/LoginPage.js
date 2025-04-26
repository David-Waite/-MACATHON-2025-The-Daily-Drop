// src/pages/LoginPage.js
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { NavLink, useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    // ... (handleSubmit function remains the same) ...
    event.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      if (user.email === "admin@gmail.com") {
        navigate("/admin");
      } else {
        navigate("/map");
      }
    } catch (err) {
      console.error("Login failed:", err.code, err.message);
      let friendlyErrorMessage =
        "Failed to log in. Please check your credentials.";
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        friendlyErrorMessage = "Invalid email or password.";
      }
      setError(friendlyErrorMessage);
      setLoading(false);
    }
  };

  const styles = {
    // ... (pageContainer, card, logo, form, input styles remain the same) ...
    pageContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#6A0DAD",
      padding: "20px",
    },
    card: {
      backgroundColor: "white",
      padding: "40px 30px",
      borderRadius: "20px",
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
      maxWidth: "380px",
      textAlign: "center",
    },
    logo: {
      width: "60px",
      height: "auto",
      marginBottom: "30px",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      alignItems: "center",
    },
    input: {
      width: "100%",
      padding: "12px 15px",
      marginBottom: "15px",
      fontSize: "1rem",
      border: "none",
      borderRadius: "10px",
      backgroundColor: "#f0f0f0",
      boxSizing: "border-box",
    },
    button: {
      width: "100%",
      padding: "12px",
      marginTop: "10px", // Keep margin top for space between password and button
      fontSize: "1rem",
      fontWeight: "bold",
      color: "white",
      backgroundColor: "#E91E63",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      transition: "opacity 0.2s",
      opacity: loading ? 0.7 : 1,
      // Add margin bottom to push the link down
      marginBottom: "25px", // <-- Add margin below the button
    },
    error: {
      color: "#dc3545",
      marginBottom: "15px",
      fontSize: "0.9rem",
      minHeight: "1.2em",
    },
    // Style for the NavLink component itself (optional, if needed)
    navLink: {
      textDecoration: "none", // Remove underline from NavLink
      // marginTop: "25px", // Apply margin here instead of span if preferred
    },
    // Style for the text inside the link
    signUpLinkText: {
      // Remove marginTop from here if applied to NavLink
      fontSize: "0.95rem",
      color: "#555",
      textDecoration: "underline", // Keep underline on the text
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <img src="/icons/giftPin.png" alt="App Logo" style={styles.logo} />
        <p>
          <strong>Admin credentials</strong> <br /> Email: Admin@gamil.com
          <br />
          Password: Admin1
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.error}>{error && <p>{error}</p>}</div>
          <input
            type="email"
            placeholder="Email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
          />
          {/* Button now has marginBottom */}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging In..." : "Login"}
          </button>
        </form>

        {/* Apply navLink style to NavLink */}
        <NavLink to="/signup" style={styles.navLink}>
          {/* Apply signUpLinkText style to the span */}
          <span style={styles.signUpLinkText}>Sign Up</span>
        </NavLink>
      </div>
    </div>
  );
}

export default LoginPage;
