// src/components/PublicRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router";
import { useAuthStatus } from "../hooks/useAuthStatus";

// Option 1: Using Outlet
export function PublicRoute() {
  const { loggedIn, checkingStatus } = useAuthStatus();

  if (checkingStatus) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/loadingAnimation.gif" // Make sure this image exists in /public
          alt="loading"
          style={{ height: "50px", width: "50px" }}
        />
      </div>
    );
  }

  return loggedIn ? <Navigate to="/" replace /> : <Outlet />;
}
