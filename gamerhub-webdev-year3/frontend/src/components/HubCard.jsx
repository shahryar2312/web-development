/**
 * HubCard.jsx — Reusable hub (gaming community) card
 *
 * Shown in the sidebar and the home page's "Popular Hubs" section.
 * Displays: hub name, game, member count, description snippet, join button.
 *
 * Props:
 *   hub {object} — hub document from the backend
 *     { _id, name, slug, game, description, memberCount, icon }
 *
 * Join button maps to:
 *   POST /api/hubs/:hubId/join   (requires auth)
 *   POST /api/hubs/:hubId/leave  (to undo)
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './HubCard.css';

function HubCard({ hub }) {
  const { isLoggedIn } = useAuth();

  // Track join state locally; in full integration this checks user.joinedHubs
  const [joined, setJoined] = useState(false);
  const [memberCount, setMemberCount] = useState(hub.memberCount ?? 0);

  /**
   * handleJoinToggle — Joins or leaves a hub.
   * Maps to:
   *   POST /api/hubs/:hubId/join   { } — join the hub
   *   POST /api/hubs/:hubId/leave  { } — leave the hub
   */
  const handleJoinToggle = (e) => {
    // Prevent the card click navigating to the hub page
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      alert('Please log in to join a hub.');
      return;
    }

    /*
     * --- BACKEND INTEGRATION POINT ---
     * const endpoint = joined
     *   ? `/api/hubs/${hub._id}/leave`
     *   : `/api/hubs/${hub._id}/join`;
     *
     * fetch(endpoint, {
     *   method: 'POST',
     *   credentials: 'include',
     * }).then((res) => {
     *   if (res.ok) {
     *     setJoined((prev) => !prev);
     *     setMemberCount((prev) => joined ? prev - 1 : prev + 1);
     *   }
     * });
     */

    // Optimistic update for demo purposes
    setJoined((prev) => !prev);
    setMemberCount((prev) => joined ? prev - 1 : prev + 1);
  };

  return (
    <Link to={`/hub/${hub.slug}`} className="hub-card" aria-label={`Go to ${hub.name} hub`}>
      {/* Hub icon / avatar */}
      <div className="hub-card__icon">
        {hub.icon ? (
          <img src={hub.icon} alt={`${hub.name} icon`} />
        ) : (
          /* Fallback: first letter of hub name */
          <span>{hub.name.charAt(0).toUpperCase()}</span>
        )}
      </div>

      {/* Hub info */}
      <div className="hub-card__info">
        <h3 className="hub-card__name">h/{hub.name}</h3>
        <p className="hub-card__game">🎮 {hub.game}</p>
        <p className="hub-card__members">👥 {memberCount.toLocaleString()} members</p>
        {hub.description && (
          <p className="hub-card__desc">
            {hub.description.length > 80
              ? `${hub.description.slice(0, 80)}…`
              : hub.description}
          </p>
        )}
      </div>

      {/* Join / Leave button */}
      <button
        className={`hub-card__join btn ${joined ? 'btn-secondary' : 'btn-primary'}`}
        onClick={handleJoinToggle}
        aria-label={joined ? `Leave ${hub.name}` : `Join ${hub.name}`}
      >
        {joined ? 'Leave' : 'Join'}
      </button>
    </Link>
  );
}

export default HubCard;
