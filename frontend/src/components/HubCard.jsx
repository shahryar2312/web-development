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
 * Join/leave maps to:
 *   POST   /api/hubs/:hubId/join   (requires auth) — join the hub
 *   DELETE /api/hubs/:hubId/join   (requires auth) — leave the hub
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './HubCard.css';

function HubCard({ hub }) {
  const { isLoggedIn, user } = useAuth();

  const [joined,      setJoined]      = useState(false);
  const [memberCount, setMemberCount] = useState(hub.memberCount ?? 0);
  const [loading,     setLoading]     = useState(false);

  // 04.05 Ilia Klodin: keeps "JJoin" button in sync after session restore — without this it always showed "Join" even if already a member
  // sync join state whenever the auth user updates (e.g. after session restore)
  useEffect(() => {
    setJoined(
      user?.joinedHubs?.some((id) => id.toString() === hub._id.toString()) ?? false
    );
  }, [user, hub._id]);

  const handleJoinToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { alert('Please log in to join a hub.'); return; }
    if (loading) return;
    setLoading(true);
    try {
      // 04.05 Ilia Klodin: leave uses DELETE /join
      if (joined) {
        await api.delete(`/api/hubs/${hub._id}/join`);
      } else {
        await api.post(`/api/hubs/${hub._id}/join`);
      }
      setJoined((prev) => !prev);
      setMemberCount((prev) => joined ? prev - 1 : prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link to={`/hub/${hub.slug}`} className="hub-card" aria-label={`Go to ${hub.name} hub`}>
      <div className="hub-card__top">
        <div className="hub-card__icon">
          {hub.icon
            ? <img src={hub.icon} alt={`${hub.name} icon`} />
            : <span>{hub.name.charAt(0).toUpperCase()}</span>
          }
        </div>

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
      </div>

      <button
        className={`hub-card__join btn ${joined ? 'btn-secondary' : 'btn-primary'}`}
        onClick={handleJoinToggle}
        disabled={loading}
        aria-label={joined ? `Leave ${hub.name}` : `Join ${hub.name}`}
      >
        {loading ? '…' : joined ? 'Leave' : 'Join'}
      </button>
    </Link>
  );
}

export default HubCard;
