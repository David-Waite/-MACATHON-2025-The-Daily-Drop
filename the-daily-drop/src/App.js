import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";


function App() {
  const auth = getAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // Show loading while checking

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Logged in
        if (user.email === "admin@gmail.com") {
          navigate("/admin");
        } else {
          navigate("/map");
        }
      } else {
        // Not logged in
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup
  }, [auth, navigate]);

  if (loading) {
    return <div>Loading...</div>; // Or a spinner
  }

  return null; // Nothing here, redirect logic handles everything
}

export default App;
