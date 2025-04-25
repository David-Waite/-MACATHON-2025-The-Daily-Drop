import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // Import the auth instance from your firebase.js file
import { NavLink } from "react-router";
import { useNavigate } from "react-router-dom";

// Define the props interface if using TypeScript (optional but good practice)
// interface SignUpPageProps {
//   switchToLogin: () => void; // Function to switch view back to Login
//   onSignUpSuccess?: () => void; // Optional: Callback for successful signup
// }

// Functional component for the Sign Up Page
// function SignUpPage({ switchToLogin, onSignUpSuccess }: SignUpPageProps) { // TypeScript version
function SignUpPage({ switchToLogin, onSignUpSuccess }) {
  // JavaScript version

  // State hooks for input fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(""); // State to hold potential signup errors
  const [loading, setLoading] = useState(false); // State to indicate loading status
  const navigate = useNavigate();

  // Handler for form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default browser form submission
    setError(""); // Clear previous errors

    // --- Basic Validation ---
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    // Add more complex password validation if needed (length, characters etc.)
    if (password.length < 6) {
      setError("Password should be at least 6 characters long.");
      return;
    }
    // --- End Validation ---

    setLoading(true); // Set loading state

    try {
      // Attempt to create a new user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("User signed up successfully:", userCredential.user.uid);
      navigate("/map");
      // Sign up successful!
      setLoading(false);
      // Clear form - though usually you navigate away immediately
      // setEmail('');
      // setPassword('');
      // setConfirmPassword('');

      // Optional: Call a success handler passed via props if needed
      if (onSignUpSuccess) {
        onSignUpSuccess();
      }

      // NOTE: Just like login, you typically rely on the `onAuthStateChanged`
      // listener in your main App component to detect the newly signed-up user
      // and automatically navigate them to the main part of the application.
    } catch (err) {
      // Handle Firebase errors
      console.error("Sign up failed:", err.code, err.message);
      let friendlyErrorMessage = "Failed to sign up. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        friendlyErrorMessage = "This email address is already registered.";
      } else if (err.code === "auth/weak-password") {
        friendlyErrorMessage =
          "Password is too weak. It should be at least 6 characters long.";
      } else if (err.code === "auth/invalid-email") {
        friendlyErrorMessage = "Please enter a valid email address.";
      }
      // Add more specific Firebase Auth error codes as needed

      setError(friendlyErrorMessage);
      setLoading(false); // Reset loading state on error
    }
  };

  // Basic inline styles (reuse from LoginPage or use CSS classes)
  const styles = {
    /* ... same styles as LoginPage ... */
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      maxWidth: "400px",
      margin: "50px auto",
      border: "1px solid #ccc",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    form: { display: "flex", flexDirection: "column", width: "100%" },
    input: {
      marginBottom: "1rem",
      padding: "0.8rem",
      fontSize: "1rem",
      border: "1px solid #ccc",
      borderRadius: "4px",
    },
    button: {
      padding: "0.8rem",
      fontSize: "1rem",
      backgroundColor: "#28a745",
      /* Green for sign up */ color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      opacity: loading ? 0.7 : 1,
    },
    error: {
      color: "red",
      marginBottom: "1rem",
      textAlign: "center",
      fontSize: "0.9rem",
    },
    switchLink: { marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" },
    link: { color: "#007bff", cursor: "pointer", textDecoration: "underline" },
  };

  return (
    <div style={styles.container}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <p style={styles.error}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password (min. 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Confirm Password"
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
      <div style={styles.switchLink}>
        Already have an account?{" "}
        {/* Ensure switchToLogin is passed as a prop */}
        <NavLink to={"/Login"}>
          <span
            onClick={!loading ? switchToLogin : undefined}
            style={{ ...styles.link, cursor: loading ? "default" : "pointer" }}
          >
            Login
          </span>
        </NavLink>
      </div>
    </div>
  );
}

export default SignUpPage;
