// src/components/PublicRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router";
import { useAuthStatus } from "../hooks/useAuthStatus";

// Option 1: Using Outlet
export function PublicRoute() {
  const { loggedIn, checkingStatus } = useAuthStatus();

  if (checkingStatus) {
    return <div>Loading...</div>;
  }

  return loggedIn ? <Navigate to="/" replace /> : <Outlet />;
}
