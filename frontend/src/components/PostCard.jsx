/**
 * PostCard.jsx — Reusable post summary card
 *
 * Displayed on the Home feed and Hub pages.
 * Shows: vote score, title, author, hub name, comment count, post type badge.
 *
 * Props:
 *   post {object} — post document from the backend
 *     { _id, title, content, type, voteScore, userVote, commentCount,
 *       author: { username }, hub: { name, slug }, createdAt }
 *
 * Maps to:
 *   Upvote   — POST /api/posts/:postId/vote  { value: 1 }
 *   Downvote — POST /api/posts/:postId/vote  { value: -1 }
 *   (Sending the same value a second time cancels the vote server-side.)
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './PostCard.css';

function PostCard({ post }) {
  const { isLoggedIn } = useAuth();

  const [voteScore, setVoteScore] = useState(post.voteScore ?? 0);
  const [userVote,  setUserVote]  = useState(post.userVote  ?? 0);
  const [voting,    setVoting]    = useState(false);

  const handleVote = async (voteValue) => {
    if (!isLoggedIn) { alert('Please log in to vote.'); return; }
    if (voting) return;
    setVoting(true);
    try {
      // 04.05 Ilia Klodin: api.js handles the envelope unwrap so we get voteScore/userVote directly, no need to drill into data.data
      const data = await api.post(`/api/posts/${post._id}/vote`, { value: voteValue });
      setVoteScore(data.voteScore);
      setUserVote(data.userVote);
    } catch (err) {
      console.error(err);
    } finally {
      setVoting(false);
    }
  };

  const formatDate = (isoString) => {
    const delta = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (delta < 60)    return 'just now';
    if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  const typeBadgeMap = {
    text:  { label: 'Text',  cls: 'badge-info' },
    image: { label: 'Image', cls: 'badge-success' },
    link:  { label: 'Link',  cls: 'badge-warning' },
    lfg:   { label: 'LFG',   cls: 'badge-primary' },
  };
  const badge = typeBadgeMap[post.type] ?? typeBadgeMap.text;

  return (
    <article className="post-card">
      <div className="post-card__votes">
        <button
          className={`vote-btn vote-btn--up ${userVote === 1 ? 'active' : ''}`}
          onClick={() => handleVote(1)}
          disabled={voting}
          aria-label="Upvote"
          title="Upvote"
        >
          ▲
        </button>
        <span className="vote-btn__score" aria-live="polite">{voteScore}</span>
        <button
          className={`vote-btn vote-btn--down ${userVote === -1 ? 'active' : ''}`}
          onClick={() => handleVote(-1)}
          disabled={voting}
          aria-label="Downvote"
          title="Downvote"
        >
          ▼
        </button>
      </div>

      <div className="post-card__body">
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

        <h2 className="post-card__title">
          <Link to={`/post/${post._id}`}>{post.title}</Link>
        </h2>

        {/* 05.05 Ilia Klodin: added image preview on card, lazy-loaded so the feed doesn't hammer bandwidth, emulates reddit feed behavior where media posts had previews */}
        {post.type === 'image' && post.url && (
          <Link to={`/post/${post._id}`} className="post-card__image-wrap">
            <img src={post.url} alt="" className="post-card__image" loading="lazy" />
          </Link>
        )}

        {post.content && (
          <p className="post-card__preview">
            {post.content.length > 200 ? `${post.content.slice(0, 200)}…` : post.content}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="post-card__tags">
            {post.tags.map((tag) => <span key={tag} className="post-card__tag">#{tag}</span>)}
          </div>
        )}

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
