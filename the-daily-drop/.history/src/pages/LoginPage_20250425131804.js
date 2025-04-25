import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { NavLink } from "react-router";
import { useNavigate } from "react-router-dom"; // Correct import

// Define the props interface if using TypeScript (optional but good practice)
// interface LoginPageProps {
//   switchToSignUp: () => void; // Function to switch view to Sign Up
//   onLoginSuccess: () => void; // Optional: Callback for successful login
// }

// Functional component for the Login Page
// function LoginPage({ switchToSignUp, onLoginSuccess }: LoginPageProps) { // TypeScript version
function LoginPage({ switchToSignUp, onLoginSuccess }) {
  // JavaScript version
  const navigate = useNavigate();

  // State hooks for email and password input fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // State to hold potential login errors
  const [loading, setLoading] = useState(false); // State to indicate loading status

  // Handler for form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default browser form submission
    setError(""); // Clear previous errors

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true); // Set loading state

    try {
      // Attempt to sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      setLoading(false);
      setEmail("");
      setPassword("");
      if (user.email === "admin@gmail.com") {
        navigate("/admin");
      } else {
        navigate("/map");
      }
      // Optional: Call a success handler passed via props if needed
      if (onLoginSuccess) {
        onLoginSuccess();
      }

      // NOTE: Typically, you wouldn't handle redirection *here*.
      // The standard pattern is to have an `onAuthStateChanged` listener
      // in your main App component or routing setup. When Firebase detects
      // a logged-in user, that listener updates the app state or redirects
      // the user to the main part of the application (e.g., the map view).
    } catch (err) {
      // Handle Firebase errors (e.g., wrong password, user not found)
      console.error("Login failed:", err.code, err.message);
      let friendlyErrorMessage =
        "Failed to log in. Please check your credentials.";
      // You could add more specific messages based on err.code if desired
      // e.g., if (err.code === 'auth/user-not-found') { ... }
      setError(friendlyErrorMessage);
      setLoading(false); // Reset loading state on error
    }
  };

  // Basic inline styles (reuse from previous example or use CSS)
  const styles = {
    /* ... same styles as before ... */
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
      backgroundColor: "#007bff",
      color: "white",
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
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <p style={styles.error}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading} // Disable input when loading
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading} // Disable input when loading
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Logging In..." : "Login"}
        </button>
      </form>
      <div style={styles.switchLink}>
        Don't have an account? {/* Ensure switchToSignUp is passed as a prop */}
        <NavLink to={"/SignUp"}>
          <span
            onClick={!loading ? switchToSignUp : undefined}
            style={{ ...styles.link, cursor: loading ? "default" : "pointer" }}
          >
            Sign Up
          </span>
        </NavLink>
      </div>
    </div>
  );
}

export default LoginPage;
