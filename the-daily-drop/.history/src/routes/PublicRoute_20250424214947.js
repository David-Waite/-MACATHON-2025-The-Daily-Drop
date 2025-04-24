// src/components/PublicRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router";
import { useAuthStatus } from "../hooks/useAuthStatus"; // Adjust path if needed

// Option 1: Using Outlet
export function PublicRoute() {
  const { loggedIn, checkingStatus } = useAuthStatus();

  if (checkingStatus) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  return loggedIn ? <Navigate to="/" replace /> : <Outlet />;
}

// Option 2: Passing element directly
// export function PublicRoute({ element }) {
//   const { loggedIn, checkingStatus } = useAuthStatus();

//   if (checkingStatus) {
//     return <div>Loading...</div>;
//   }

//   return loggedIn ? <Navigate to="/" replace /> : element;
// }
