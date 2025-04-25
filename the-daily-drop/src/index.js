// src/index.js (or your main router file)
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Ensure using react-router-dom

// Import Page Components
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import MyRewardsPage from "./pages/MyRewardsPage"; // <--- IMPORT THE NEW PAGE
// import AdminPage from "./pages/AdminPage";

// Import Protector Components
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicRoute } from "./routes/PublicRoute";
// Removed MapComponent import if not used directly in routing
import AdminDashboard from "./components/AdminDashboard";
import { AdminProtectedRoute } from "./routes/AdminProtectedRoute";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Auth Gate (App component likely handles initial auth check/redirect) */}
        <Route path="/" element={<App />} />

        {/* Public Routes (Login, SignUp) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Route>

        {/* Protected Routes (Accessible only when logged in) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/map" element={<MapPage />} />
          <Route path="/myrewards" element={<MyRewardsPage />} /> {/* <--- ADD THIS ROUTE */}
          {/* Add any other protected routes here */}
        </Route>

        {/* Admin Only Protected Route */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Add any other admin-only routes here */}
        </Route>

        {/* Optional: Catch-all route for 404 */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
