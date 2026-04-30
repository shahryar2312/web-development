/**
 * PostCard.jsx — Reusable post summary card
 *
 * Displayed on the Home feed and Hub pages.
 * Shows: vote score, title, author, hub name, comment count, post type badge.
 *
 * Props:
 *   post {object} — post document from the backend
 *     { _id, title, content, type, voteScore, commentCount,
 *       author: { username }, hub: { name, slug }, createdAt }
 *
 * Maps to:
 *   Upvote   — POST /api/posts/:postId/vote  { value: 1 }
 *   Downvote — POST /api/posts/:postId/vote  { value: -1 }
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PostCard.css';

function PostCard({ post }) {
  const { isLoggedIn } = useAuth();

  // Local vote state — in full integration this syncs with the server
  const [voteScore, setVoteScore] = useState(post.voteScore ?? 0);
  const [userVote, setUserVote]   = useState(0); // -1, 0, or 1

  /**
   * handleVote — Sends an upvote or downvote to the backend.
   * Maps to: POST /api/posts/:postId/vote  { value: voteValue }
   * Toggling the same vote cancels it (sets value to 0).
   */
  const handleVote = (voteValue) => {
    if (!isLoggedIn) {
      alert('Please log in to vote.');
      return;
    }

    /*
     * --- BACKEND INTEGRATION POINT ---
     * fetch(`/api/posts/${post._id}/vote`, {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   credentials: 'include',
     *   body: JSON.stringify({ value: voteValue === userVote ? 0 : voteValue }),
     * });
     */

    // Optimistic UI update
    if (voteValue === userVote) {
      // Cancel vote
      setVoteScore((prev) => prev - userVote);
      setUserVote(0);
    } else {
      // Switch or new vote
      setVoteScore((prev) => prev - userVote + voteValue);
      setUserVote(voteValue);
    }
  };

  /**
   * formatDate — Converts an ISO date string to a relative time string.
   * e.g. "2 hours ago", "3 days ago"
   */
  const formatDate = (isoString) => {
    const date  = new Date(isoString);
    const delta = (Date.now() - date.getTime()) / 1000; // seconds ago
    if (delta < 60)   return 'just now';
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  // Map post type to a display badge
  const typeBadgeMap = {
    text:  { label: 'Text',  cls: 'badge-info' },
    image: { label: 'Image', cls: 'badge-success' },
    link:  { label: 'Link',  cls: 'badge-warning' },
    lfg:   { label: 'LFG',  cls: 'badge-primary' },
  };
  const badge = typeBadgeMap[post.type] ?? typeBadgeMap.text;

  return (
    <article className="post-card">
      {/* ---- Vote column ---- */}
      <div className="post-card__votes">
        <button
          className={`vote-btn vote-btn--up ${userVote === 1 ? 'active' : ''}`}
          onClick={() => handleVote(1)}
          aria-label="Upvote"
          title="Upvote"
        >
          ▲
        </button>
        <span className="vote-btn__score" aria-live="polite">{voteScore}</span>
        <button
          className={`vote-btn vote-btn--down ${userVote === -1 ? 'active' : ''}`}
          onClick={() => handleVote(-1)}
          aria-label="Downvote"
          title="Downvote"
        >
          ▼
        </button>
      </div>

      {/* ---- Post content ---- */}
      <div className="post-card__body">
        {/* Meta row: hub name + post type */}
        <div className="post-card__meta">
          <Link to={`/hub/${post.hub?.slug}`} className="post-card__hub-link">
            h/{post.hub?.name ?? 'unknown'}
          </Link>
          <span className="post-card__dot">•</span>
          <span className="post-card__author">u/{post.author?.username ?? 'unknown'}</span>
          <span className="post-card__dot">•</span>
          <time className="post-card__time" dateTime={post.createdAt}>
            {formatDate(post.createdAt)}
          </time>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
        </div>

        {/* Post title — links to the detail page */}
        <h2 className="post-card__title">
          <Link to={`/post/${post._id}`}>{post.title}</Link>
        </h2>

        {/* Short content preview (first 200 characters) */}
        {post.content && (
          <p className="post-card__preview">
            {post.content.length > 200
              ? `${post.content.slice(0, 200)}…`
              : post.content}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="post-card__tags">
            {post.tags.map((tag) => (
              <span key={tag} className="post-card__tag">#{tag}</span>
            ))}
          </div>
        )}

        {/* Footer: comment count link */}
        <div className="post-card__footer">
          <Link to={`/post/${post._id}`} className="post-card__comments">
            💬 {post.commentCount ?? 0} comments
          </Link>
          {post.isPinned && <span className="badge badge-warning">📌 Pinned</span>}
          {post.isLocked && <span className="badge badge-danger">🔒 Locked</span>}
        </div>
      </div>
    </article>
  );
}

export default PostCard;
