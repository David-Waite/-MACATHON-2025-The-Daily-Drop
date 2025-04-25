// src/components/AdminProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStatus } from "../hooks/useAuthStatus"; // Your hook checking login status
import { auth } from "../firebase"; // Import Firebase auth instance

// Read the Admin User ID from environment variables
const ADMIN_UID = process.env.REACT_APP_ADMIN_UID;

export function AdminProtectedRoute() {
  const { loggedIn, checkingStatus } = useAuthStatus();
  const currentUser = auth.currentUser; // Get the currently signed-in user object

  if (checkingStatus) {
    // Show loading indicator while checking auth state
    return <div>Checking authorization...</div>; // Or a spinner
  }

  // Check 1: Is the user logged in?
  if (!loggedIn || !currentUser) {
    // If not logged in, redirect to login page
    console.log(
      "AdminProtectedRoute: User not logged in. Redirecting to /login."
    );
    return <Navigate to="/login" replace />;
  }

  // Check 2: Is the logged-in user the ADMIN?
  if (currentUser.uid === ADMIN_UID) {
    // If logged in AND is the admin, allow access to the admin route
    console.log("AdminProtectedRoute: Admin user authorized. Rendering route.");
    return <Outlet />; // Render the nested route (AdminPage)
  } else {
    // If logged in but NOT the admin, redirect them away (e.g., to the map)
    console.log(
      "AdminProtectedRoute: User is logged in but not admin. Redirecting to /map."
    );
    // You could also redirect to a specific "Unauthorized" page if you prefer
    return <Navigate to="/map" replace />;
  }
}
