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
import { useModal } from '../context/ModalContext';
import { api } from '../services/api';
import './HubCard.css';

function HubCard({ hub }) {
  const { isLoggedIn, user, refreshUser } = useAuth();
  const { showModal }        = useModal();

  const [joined,      setJoined]      = useState(false);
  const [memberCount, setMemberCount] = useState(hub.memberCount ?? 0);
  const [loading,     setLoading]     = useState(false);

  // 04.05 Ilia Klodin: keeps "JJoin" button in sync after session restore — without this it always showed "Join" even if already a member
  // sync join state whenever the auth user updates (e.g. after session restore)
  useEffect(() => {
    setJoined(
      user?.joinedHubs?.some((h) => (h._id || h).toString() === hub._id.toString()) ?? false
    );
  }, [user, hub._id]);

  const handleJoinToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { showModal({ title: 'Authentication Required', message: 'Please log in to join a hub.', type: 'error' }); return; }
    if (loading) return;

    const performAction = async (isLeaving) => {
      setLoading(true);
      try {
        if (isLeaving) {
          await api.delete(`/api/hubs/${hub._id}/join`);
        } else {
          await api.post(`/api/hubs/${hub._id}/join`);
        }
        await refreshUser();
        setJoined((prev) => !prev);
        setMemberCount((prev) => isLeaving ? prev - 1 : prev + 1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (joined) {
      showModal({
        title: 'Leave Hub',
        message: `Are you sure you want to leave h/${hub.name}?`,
        type: 'warning',
        confirmText: 'Leave',
        cancelText: 'Cancel',
        onConfirm: () => performAction(true)
      });
    } else {
      performAction(false);
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
        {loading ? '…' : joined ? '✓ Joined' : 'Join'}
      </button>
    </Link>
  );
}

export default HubCard;
