// src/index.js (or your main router file)
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter, Routes, Route } from "react-router"; // Or react-router-dom

// Import Page Components
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
// import AdminPage from "./pages/AdminPage";
import LeaderboardPage from "./pages/LeaderboardPage"; // <--- Import your new page

// Import Protector Components
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicRoute } from "./routes/PublicRoute";
import MapComponent from "./components/MapComponent";
import AdminDashboard from "./components/AdminDashboard";
import { AdminProtectedRoute } from "./routes/AdminProtectedRoute";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} /> // Auth gate
        {/* Public Routes (Login, SignUp) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Route>
        {/* Protected Routes (Map, Admin, Leaderboard) */}
        <Route element={<ProtectedRoute />}>
          {/* This checks if user is logged in */}
          {/* Routes rendered via <Outlet /> inside ProtectedRoute if auth check passes */}
          {/* <Route path="/map" element={<MapComponent />} /> */}
          <Route path="/map" element={<MapPage />}/>
          <Route path="/leaderboard" element={<LeaderboardPage />} />{" "}
          {/* <--- Add this line */}
          {/* Add any other protected routes here */}
        </Route>
        {/* Admin Only Protected Route */}
        <Route element={<AdminProtectedRoute />}>
          {" "}
          {/* <--- Use the specific admin protector */}
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Add any other admin-only routes here */}
        </Route>
        {/* Optional: Catch-all route */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
