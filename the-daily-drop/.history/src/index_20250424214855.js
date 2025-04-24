// src/index.js (or your main entry point)
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App"; // Your main application component (e.g., the map)
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Correct import spelling 'react-router-dom'

// Import Page Components
import SignUpPage from "./pages/SignUpPage"; // Assuming they are in a 'pages' folder
import LoginPage from "./pages/LoginPage";

// Import Protector Components
import { ProtectedRoute } from "./components/ProtectedRoute"; // Adjust path if needed
import { PublicRoute } from "./components/PublicRoute"; // Adjust path if needed

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {" "}
        {/* Single top-level Routes component */}
        {/* Routes accessible only when logged OUT */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          {/* Add any other public-only routes here */}
        </Route>
        {/* Routes accessible only when logged IN */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<App />} />
          {/* Add any other protected routes here (e.g., /profile, /settings) */}
        </Route>
        {/* Optional: Catch-all route for non-matched paths */}
        {/* If logged in, could redirect to '/', if not, to '/login' */}
        {/* Or just show a 'Not Found' page */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
