// src/hooks/useAuthStatus.js
import { useState, useEffect } from "react";
import { auth } from "../firebase"; // Adjust the path if your firebase.js is elsewhere
import { onAuthStateChanged } from "firebase/auth";

export function useAuthStatus() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true); // Start as true

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setLoggedIn(true);
      } else {
        // User is signed out
        setLoggedIn(false);
      }
      // Finished checking auth status
      setCheckingStatus(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  return { loggedIn, checkingStatus };
}
