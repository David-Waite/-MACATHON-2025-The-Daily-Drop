// src/pages/LeaderboardPage.jsx (or wherever you keep your page components)
import React from "react";
// Optional: Import Link if you want navigation back
import { Link } from "react-router-dom";

function LeaderboardPage() {
  // TODO: Add logic here later to fetch and display leaderboard data

  return (
    <div>
      <h1>Leaderboard</h1>
      <p>Top players will be listed here!</p>
      {/* Example data placeholder */}
      <ul>
        <li>Player 1: 150 points</li>
        <li>Player 2: 120 points</li>
        <li>Player 3: 95 points</li>
      </ul>
      <br />
      <Link to="/map">Back to Map</Link>
    </div>
  );
}

export default LeaderboardPage;
