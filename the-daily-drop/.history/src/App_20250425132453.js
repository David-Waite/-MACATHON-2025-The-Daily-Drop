import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom"; // Or 'react-router'

// Define the specific Admin User ID as a constant
const ADMIN_UID = process.env.REACT_APP_ADMIN_UID;

function App() {
  const auth = getAuth(); // Get the auth instance (ensure Firebase is initialized)
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // Start in loading state

  useEffect(() => {
    // onAuthStateChanged returns the unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        console.log("Auth state changed: User logged in - UID:", user.uid);
        // Check if the logged-in user's UID matches the Admin UID
        if (user.uid === ADMIN_UID) {
          console.log("Admin user detected. Redirecting to /admin...");
          // Redirect to the admin page, replacing the current history entry
          navigate("/admin", { replace: true });
        } else {
          console.log("Regular user detected. Redirecting to /map...");
          // Redirect regular users to the map page, replacing history entry
          navigate("/map", { replace: true });
        }
      } else {
        // User is signed out
        console.log(
          "Auth state changed: User logged out. Redirecting to /login..."
        );
        // Redirect to login page, replacing history entry
        navigate("/login", { replace: true });
      }
      // Finished checking auth state, set loading to false
      setLoading(false);
    });

    // Cleanup the listener when the component unmounts
    return () => {
      console.log("Cleaning up auth listener.");
      unsubscribe();
    };
  }, [auth, navigate]); // Dependencies for the effect

  // Display a loading message while checking authentication state
  if (loading) {
    return <div>Checking authentication...</div>; // You can replace this with a spinner component
  }

  // Once loading is false, this component renders nothing itself,
  // as the navigation will have already been triggered by the effect.
  return null;
}

export default App;
