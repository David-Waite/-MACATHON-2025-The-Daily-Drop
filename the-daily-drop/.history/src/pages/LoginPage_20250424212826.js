import React, { useState } from "react";

function LoginPage({ handleLogin, switchToSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      await handleLogin(email, password);
    } catch (err) {
      setError(
        err.message || "Failed to log in. Please check your credentials."
      );
      setLoading(false);
    }
  };

  // Basic inline styles (or use CSS classes)
  const styles = {
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
    form: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
    },
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
      opacity: loading ? 0.7 : 1, // Dim button when loading
    },
    error: {
      color: "red",
      marginBottom: "1rem",
      textAlign: "center",
      fontSize: "0.9rem",
    },
    switchLink: {
      marginTop: "1rem",
      textAlign: "center",
      fontSize: "0.9rem",
    },
    link: {
      color: "#007bff",
      cursor: "pointer",
      textDecoration: "underline",
    },
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
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Logging In..." : "Login"}
        </button>
      </form>
      <div style={styles.switchLink}>
        Don't have an account?{" "}
        <span onClick={switchToSignUp} style={styles.link}>
          Sign Up
        </span>
      </div>
    </div>
  );
}

export default LoginPage;
