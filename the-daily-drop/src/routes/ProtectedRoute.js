// src/components/ProtectedRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router";
import { useAuthStatus } from "../hooks/useAuthStatus"; // Adjust path if needed

// Option 1: Using Outlet (preferred for wrapping multiple routes)
export function ProtectedRoute() {
  const { loggedIn, checkingStatus } = useAuthStatus();

  if (checkingStatus) {
    // Optional: Add a better loading spinner/component here
    return <div>Loading...</div>;
  }

  return loggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

// Option 2: Passing element directly (if wrapping single routes)
// export function ProtectedRoute({ element }) {
//   const { loggedIn, checkingStatus } = useAuthStatus();

//   if (checkingStatus) {
//     return <div>Loading...</div>;
//   }

//   return loggedIn ? element : <Navigate to="/login" replace />;
// }
