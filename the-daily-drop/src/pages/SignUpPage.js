// src/pages/SignUpPage.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase"; // Import db for Firestore
import { doc, setDoc, serverTimestamp  } from "firebase/firestore"; // Import Firestore functions
import { NavLink, useNavigate } from "react-router-dom"; // Combined imports

function SignUpPage() {
  const navigate = useNavigate();

  // State hooks
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // <-- Add state for username
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // Keep for validation
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handler for form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // --- Validation ---
    // Add username check
    if (!email || !username || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters long.");
      return;
    }
    // Optional: Add username validation (e.g., length, allowed characters)
    if (username.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }
    // --- End Validation ---

    setLoading(true);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("User signed up in Auth successfully:", user.uid);

      // 2. Create user document in Firestore
      // Use user.uid as the document ID in the 'users' collection
      const userDocRef = doc(db, "user", user.uid);

      // Data to store in the user's document
      const userData = {
        username: username, // Store the entered username
        email: email, // Store email for reference if needed
        point: 0, // Initialize points to 0
        createdAt: serverTimestamp(), // Optional: track creation time
      };

      // Set the document in Firestore
      await setDoc(userDocRef, userData);
      console.log("User document created in Firestore.");

      // Sign up successful! Navigate away.
      // setLoading(false); // Navigation will unmount component
      navigate("/map"); // Navigate to the main map page after successful signup & doc creation

    } catch (err) {
      // Handle Firebase errors (Auth or Firestore)
      console.error("Sign up failed:", err.code, err.message);
      let friendlyErrorMessage = "Failed to sign up. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        friendlyErrorMessage = "This email address is already registered.";
      } else if (err.code === "auth/weak-password") {
        friendlyErrorMessage = "Password is too weak (min. 6 characters).";
      } else if (err.code === "auth/invalid-email") {
        friendlyErrorMessage = "Please enter a valid email address.";
      }
      // Add more specific Firebase Auth error codes as needed
      // Firestore errors during setDoc might also occur (e.g., permissions)

      setError(friendlyErrorMessage);
      setLoading(false); // Reset loading state on error
    }
  };

  // --- Styles (Reusing from LoginPage with minor adjustments) ---
  const styles = {
    pageContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#6A0DAD", // Deep purple background
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
      marginTop: "10px", // Space above button
      fontSize: "1rem",
      fontWeight: "bold",
      color: "white",
      backgroundColor: "#E91E63", // Pink color for button
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      transition: "opacity 0.2s",
      opacity: loading ? 0.7 : 1,
      marginBottom: "25px", // Space below button before link
    },
    error: {
      color: "#dc3545",
      marginBottom: "15px",
      fontSize: "0.9rem",
      minHeight: "1.2em", // Reserve space
    },
    navLink: {
      textDecoration: "none",
    },
    loginLinkText: { // Changed name for clarity
      fontSize: "0.95rem",
      color: "#555",
      textDecoration: "underline",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <img
          src="/icons/giftPin.png" // Path relative to 'public'
          alt="App Logo"
          style={styles.logo}
        />

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.error}>{error && <p>{error}</p>}</div>

          <input
            type="email"
            placeholder="Email..." // Placeholder text from image
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
          />
          {/* --- Add Username Input --- */}
          <input
            type="text"
            placeholder="name..." // Placeholder text from image
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
          />
          {/* --- End Username Input --- */}
          <input
            type="password"
            placeholder="Password..." // Placeholder text from image
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Confirm Password..." // Added placeholder
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        {/* Link to Login Page */}
        <NavLink to="/login" style={styles.navLink}>
          <span style={styles.loginLinkText}>Login</span>
        </NavLink>
      </div>
    </div>
  );
}

export default SignUpPage;
