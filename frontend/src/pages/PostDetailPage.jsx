/**
 * PostDetailPage.jsx — View 4: Individual post with comment thread
 *
 * Displays:
 *   - Full post content (title, body, vote controls, metadata)
 *   - Comment submission form (with validation)
 *   - Nested comment thread with upvote/downvote per comment
 *
 * Maps to backend endpoints:
 *   Post        — GET  /api/posts/:postId
 *   Comments    — GET  /api/posts/:postId/comments
 *   Add comment — POST /api/posts/:postId/comments  { content }
 *   Vote post   — POST /api/posts/:postId/vote      { value: 1|-1 }
 *   Vote comment— POST /api/comments/:commentId/vote { value: 1|-1 }
 */
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useModal } from '../context/ModalContext';
import './PostDetailPage.css';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

// 03.05 Ilia Klodin: backend comment endpoint now supports flat=true param, needed client-side tree builder
/**
 * buildCommentTree — Converts a flat array of comments (each with a .parent
 * field) into a nested tree structure for rendering.
 * Called with the flat=true response from GET /api/posts/:postId/comments.
 */
function buildCommentTree(flatComments) {
  const byId = {};
  const roots = [];
  flatComments.forEach((c) => { byId[c._id] = { ...c, replies: [] }; });
  flatComments.forEach((c) => {
    if (c.parent && byId[c.parent]) {
      byId[c.parent].replies.push(byId[c._id]);
    } else {
      roots.push(byId[c._id]);
    }
  });
  return roots;
}

/* ------------------------------------------------------------------ */
/* CommentItem sub-component                                            */
/* ------------------------------------------------------------------ */

/**
 * CommentItem — Renders a single comment with vote controls.
 * Indented based on comment.depth for nested replies.
 *
 * Props:
 *   comment     {object}   — comment document
 *   postId      {string}   — parent post id (needed for reply submission)
 *   isLocked    {boolean}  — whether the post is locked (hides reply form)
 *   onReplyAdded {function} — callback to splice a new reply into the tree
 */
function CommentItem({ comment, postId, isLocked, onReplyAdded }) {
  const { isLoggedIn, user } = useAuth();
  const { showModal } = useModal();
  const [score, setScore] = useState(comment.voteScore ?? 0);
  const [userVote, setUserVote] = useState(comment.userVote ?? 0);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * handleVote — Upvotes or downvotes a comment.
   * Maps to: POST /api/comments/:commentId/vote  { value }
   */
  const handleVote = async (val) => {
    if (!isLoggedIn) { showModal({ title: 'Authentication Required', message: 'Please log in to vote.', type: 'error' }); return; }
    try {
      // 03.05 Ilia Klodin: was sending value:0 on second click which backend rejects with 400, same value cancels instead
      const data = await api.post(`/api/comments/${comment._id}/vote`, { value: val });
      setScore(data.voteScore);
      setUserVote(data.userVote);
    } catch (err) {
      console.error('Vote failed:', err.message);
    }
  };

  /**
   * handleReplySubmit — Posts a reply to this comment.
   * Maps to: POST /api/posts/:postId/comments  { content, parent }
   */
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed) { setReplyError('Reply cannot be empty.'); return; }
    if (trimmed.length > 10000) { setReplyError('Reply cannot exceed 10,000 characters.'); return; }

    setSubmitting(true);
    try {
      const data = await api.post(`/api/posts/${postId}/comments`, {
        content: trimmed,
        parent: comment._id,
      });
      onReplyAdded(comment._id, { ...data.comment, replies: [] });
      setReplyText('');
      setShowReply(false);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso) => {
    const delta = (Date.now() - new Date(iso).getTime()) / 1000;
    if (delta < 60) return 'just now';
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  return (
    <div
      className="comment"
      style={{ marginLeft: `${Math.min(comment.depth, 8) * 24}px` }}
      aria-label={`Comment by ${comment.author?.username}`}
    >
      <div className="comment__header">
        <span className="comment__author">u/{comment.author?.username ?? 'unknown'}</span>
        <time className="comment__time">{formatDate(comment.createdAt)}</time>
      </div>

      <p className="comment__content">{comment.content}</p>

      <div className="comment__footer">
        <button className={`vote-btn vote-btn--up ${userVote === 1 ? 'active' : ''}`} onClick={() => handleVote(1)} aria-label="Upvote comment">▲</button>
        <span className="comment__score">{score}</span>
        <button className={`vote-btn vote-btn--down ${userVote === -1 ? 'active' : ''}`} onClick={() => handleVote(-1)} aria-label="Downvote comment">▼</button>
        {isLoggedIn && !isLocked && (
          <button
            className="comment__reply-btn"
            onClick={() => setShowReply((p) => !p)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4"/>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
            </svg>
            Reply
          </button>
        )}
      </div>

      {showReply && (
        <form onSubmit={handleReplySubmit} className="comment__reply-form" noValidate>
          <textarea
            className={`form-textarea ${replyError ? 'error' : ''}`}
            rows={3}
            placeholder={`Reply to u/${comment.author?.username}…`}
            value={replyText}
            onChange={(e) => { setReplyText(e.target.value); setReplyError(''); }}
            maxLength={10000}
          />
          {replyError && <span className="field-error" role="alert">{replyError}</span>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Posting…' : 'Post Reply'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowReply(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Nested replies */}
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply._id}
          comment={reply}
          postId={postId}
          isLocked={isLocked}
          onReplyAdded={onReplyAdded}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */

function PostDetailPage() {
  const { postId } = useParams();
  const { isLoggedIn, user } = useAuth();
  const { showModal } = useModal();
  const navigate = useNavigate();

  /* Post and comments loaded from the API */
  const [post, setPost] = useState(null);
  const [commentTree, setCommentTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* Vote state for the post itself */
  const [postScore, setPostScore] = useState(0);
  const [postVote, setPostVote] = useState(0);

  /* Comment form state */
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 05.05 Ilia Klodin: click-to-expand image viewer, escape key to dismiss
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [postHub, setPostHub] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightboxOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  /* ---- Fetch post and comments on mount / postId change ---- */
  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/api/posts/${postId}`),
      // 03.05 Ilia Klodin: flat=true fetches all comments in one shot for client-side tree building for nesting
      api.get(`/api/posts/${postId}/comments?flat=true`),
    ])
      .then(([postData, commentsData]) => {
        setPost(postData.post);
        setPostScore(postData.post.voteScore ?? 0);
        setPostVote(postData.post.userVote ?? 0);
        setCommentTree(buildCommentTree(commentsData.comments || []));
      })
      .catch(() => setError('Post not found or failed to load.'))
      .finally(() => setLoading(false));
  }, [postId]);

  // 07.05 Ilia Klodin: fetch hub staff after post loads so mod tools know who has permissions
  useEffect(() => {
    if (!post?._id) return;
    api.get(`/api/hubs/${post.hub._id}`)
      .then(d => setPostHub(d.hub))
      .catch(() => { });
  }, [post?._id]);

  /* Loading / error guards */
  if (loading) {
    return (
      <div className="container empty-state" style={{ marginTop: '4rem' }}>
        <p>Loading post…</p>
      </div>
    );
  }

  /* If post not found */
  if (error || !post) {
    return (
      <div className="container empty-state" style={{ marginTop: '4rem' }}>
        <h2>Post not found</h2>
        <p>{error || 'This post may have been deleted or the link is incorrect.'}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</Link>
      </div>
    );
  }

  const isOwner = user?._id?.toString() === post.author?._id?.toString();
  const isAdmin = user?.role === 'admin';
  const isHubMod = postHub?.moderators?.some(m => m._id?.toString() === user?._id?.toString()) ?? false;
  const isHubCreator = postHub?.creator?._id?.toString() === user?._id?.toString() ?? false;
  const canModerate = isAdmin || isHubMod || isHubCreator;
  const canDelete = isOwner || canModerate;

  // 06.05 Ilia Klodin: author can edit their own unlocked post, author/admin can delete
  const handleEditStart = () => { setEditTitle(post.title); setEditContent(post.content || ''); setEditError(''); setIsEditing(true); };
  const handleEditCancel = () => { setIsEditing(false); setEditError(''); };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) { setEditError('Title cannot be empty.'); return; }
    setEditSaving(true); setEditError('');
    try {
      const data = await api.put(`/api/posts/${postId}`, { title: editTitle.trim(), content: editContent.trim() || undefined });
      setPost(prev => ({ ...prev, title: data.post.title, content: data.post.content }));
      setIsEditing(false);
    } catch (err) { setEditError(err.message); }
    finally { setEditSaving(false); }
  };
  const handleDelete = () => {
    showModal({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This cannot be undone.',
      type: 'error', confirmText: 'Delete', cancelText: 'Cancel',
      onConfirm: async () => {
        try { await api.delete(`/api/posts/${postId}`); navigate(`/hub/${post.hub.slug}`); }
        catch (err) { console.error('Delete failed:', err.message); }
      },
    });
  };

  // 07.05 Ilia Klodin: mod actions — lock toggles comments, ban removes user from the hub
  const handleLockToggle = async () => {
    try {
      const data = await api.patch(`/api/posts/${postId}/lock`, { isLocked: !post.isLocked });
      setPost(prev => ({ ...prev, isLocked: data.post.isLocked }));
    } catch (err) {
      showModal({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleBanFromHub = () => {
    showModal({
      title: 'Ban from Hub',
      message: `Ban u/${post.author.username} from h/${post.hub.name}? They won't be able to post or comment here.`,
      type: 'error', confirmText: 'Ban User', cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.post(`/api/hubs/${post.hub._id}/ban/${post.author._id}`);
          showModal({ title: 'Done', message: `u/${post.author.username} has been banned from h/${post.hub.name}.`, type: 'success' });
        } catch (err) {
          showModal({ title: 'Error', message: err.message, type: 'error' });
        }
      },
    });
  };

  /**
   * handlePostVote — Votes on the main post.
   * Maps to: POST /api/posts/:postId/vote  { value }
   */
  const handlePostVote = async (val) => {
    if (!isLoggedIn) { showModal({ title: 'Authentication Required', message: 'Please log in to vote.', type: 'error' }); return; }
    try {
      // 03.05 Ilia Klodin: was sending value:0 on second click which backend rejects with 400, same value cancels instead
      const data = await api.post(`/api/posts/${postId}/vote`, { value: val });
      setPostScore(data.voteScore);
      setPostVote(data.userVote);
    } catch (err) {
      console.error('Vote failed:', err.message);
    }
  };

  /**
   * validateComment — Checks that the comment is non-empty and within length.
   * Rules mirror Comment model: minlength 1, maxlength 10000.
   */
  const validateComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      setCommentError('Comment cannot be empty.');
      return false;
    }
    if (trimmed.length > 10000) {
      setCommentError('Comment cannot exceed 10,000 characters.');
      return false;
    }
    setCommentError('');
    return true;
  };

  /**
   * handleCommentSubmit — Posts a new comment.
   * Maps to: POST /api/posts/:postId/comments  { content }
   */
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!validateComment()) return;

    setSubmitting(true);
    try {
      const data = await api.post(`/api/posts/${postId}/comments`, { content: commentText.trim() });
      // Prepend the new comment to the top of the thread
      setCommentTree((prev) => [{ ...data.comment, replies: [] }, ...prev]);
      setCommentText('');
      setSubmitSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * handleReplyAdded — Splices a newly posted reply into the correct position
   * in the comment tree without a full refetch.
   */
  const handleReplyAdded = (parentId, newReply) => {
    function insertReply(nodes) {
      return nodes.map((node) => {
        if (node._id === parentId) {
          return { ...node, replies: [newReply, ...(node.replies || [])] };
        }
        if (node.replies?.length) {
          return { ...node, replies: insertReply(node.replies) };
        }
        return node;
      });
    }
    setCommentTree((prev) => insertReply(prev));
  };

  const formatDate = (iso) => {
    const delta = (Date.now() - new Date(iso).getTime()) / 1000;
    if (delta < 60) return 'just now';
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  const typeBadgeMap = { text: { label: 'Text', cls: 'badge-info' }, image: { label: 'Image', cls: 'badge-success' }, link: { label: 'Link', cls: 'badge-warning' }, lfg: { label: 'LFG', cls: 'badge-primary' } };
  const badge = typeBadgeMap[post.type] ?? typeBadgeMap.text;

  // Count all comments including nested replies for the section heading
  const totalComments = (function count(nodes) {
    return nodes.reduce((acc, n) => acc + 1 + count(n.replies || []), 0);
  })(commentTree);

  return (
    <div className="container">
      <div className="page-layout">

        {/* ===== Main post column ===== */}
        <article className="post-detail" aria-label="Post detail">

          {/* Breadcrumb */}
          <nav className="post-detail__breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to={`/hub/${post.hub.slug}`}>h/{post.hub.name}</Link>
            <span>›</span>
            <span>Post</span>
          </nav>

          {/* Post card */}
          <div className="post-detail__card card">
            <div className="post-detail__inner">

              {/* Vote column */}
              <div className="post-card__votes">
                <button className={`vote-btn vote-btn--up ${postVote === 1 ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handlePostVote(1); }} aria-label="Upvote">▲</button>
                <span className="vote-btn__score" aria-live="polite">{postScore < 0 ? 0 : postScore}</span>
                <button className={`vote-btn vote-btn--down ${postVote === -1 ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handlePostVote(-1); }} aria-label="Downvote">▼</button>
              </div>

              {/* Content */}
              <div className="post-detail__content">
                {/* Meta */}
                <div className="post-detail__meta">
                  <Link to={`/hub/${post.hub.slug}`} className="post-card__hub-link">h/{post.hub.name}</Link>
                  <span className="post-card__dot">•</span>
                  <span>u/{post.author.username}</span>
                  <span className="post-card__dot">•</span>
                  <time>{formatDate(post.createdAt)}</time>
                  <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  {post.isPinned && <span className="badge badge-warning">📌 Pinned</span>}
                  {post.isLocked && <span className="badge badge-danger">🔒 Locked</span>}
                </div>

                {/* Title + Body — or inline edit form */}
                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="post-detail__edit-form">
                    <input
                      className="form-input"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      maxLength={300}
                      placeholder="Post title"
                      autoFocus
                    />
                    <textarea
                      className="form-textarea"
                      rows={6}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      maxLength={40000}
                      placeholder="Post content (optional)"
                      style={{ marginTop: '0.5rem' }}
                    />
                    {editError && <span className="field-error" role="alert">{editError}</span>}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={editSaving}>
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleEditCancel}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h1 className="post-detail__title">{post.title}</h1>
                    {post.content && (
                      <div className="post-detail__body">
                        {post.content.split('\n').map((line, i) => (
                          <p key={i}>{line || <br />}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Image or link URL */}
                {(post.type === 'image' || post.type === 'link') && post.url && (
                  <div className="post-detail__url">
                    {post.type === 'image'
                      ? <button className="post-detail__image-btn" onClick={() => setLightboxOpen(true)} aria-label="View full image">
                        <img src={post.url} alt="Post image" className="post-detail__image" />
                      </button>
                      : <a href={post.url} target="_blank" rel="noopener noreferrer" className="post-card__link">🔗 {post.url}</a>
                    }
                  </div>
                )}

                {/* 05.05 Ilia Klodin: fullscreen overlay, click backdrop or X to close */}
                {lightboxOpen && (
                  <div className="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={() => setLightboxOpen(false)}>
                    <button className="lightbox__close" aria-label="Close image viewer">✕</button>
                    <img
                      src={post.url}
                      alt="Post image"
                      className="lightbox__img"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* LFG details block */}
                {post.lfgDetails && post.type === 'lfg' && (
                  <div className="lfg-card__details" style={{ marginTop: '1rem' }}>
                    {post.lfgDetails.platform && <div className="lfg-detail"><span className="lfg-detail__key">Platform</span><span className="lfg-detail__val">{post.lfgDetails.platform}</span></div>}
                    {post.lfgDetails.region && <div className="lfg-detail"><span className="lfg-detail__key">Region</span><span className="lfg-detail__val">{post.lfgDetails.region}</span></div>}
                    {post.lfgDetails.skillLevel && <div className="lfg-detail"><span className="lfg-detail__key">Skill</span><span className="lfg-detail__val">{post.lfgDetails.skillLevel}</span></div>}
                    {post.lfgDetails.gameMode && <div className="lfg-detail"><span className="lfg-detail__key">Mode</span><span className="lfg-detail__val">{post.lfgDetails.gameMode}</span></div>}
                    {post.lfgDetails.playersNeeded && <div className="lfg-detail"><span className="lfg-detail__key">Spots</span><span className="lfg-detail__val">{post.lfgDetails.playersNeeded - (post.lfgDetails.currentPlayers || 1)} of {post.lfgDetails.playersNeeded} left</span></div>}
                    {post.lfgDetails.voiceChat !== undefined && <div className="lfg-detail"><span className="lfg-detail__key">Voice</span><span className="lfg-detail__val">{post.lfgDetails.voiceChat ? '🎙 Required' : '🔇 Optional'}</span></div>}
                    {post.lfgDetails.status && <div className="lfg-detail"><span className="lfg-detail__key">Status</span><span className={`badge ${post.lfgDetails.status === 'open' ? 'badge-success' : 'badge-danger'}`}>{post.lfgDetails.status}</span></div>}
                    {post.lfgDetails.schedule && <p className="lfg-card__extra">🕐 <strong>Schedule:</strong> {post.lfgDetails.schedule}</p>}
                    {post.lfgDetails.requirements && <p className="lfg-card__extra">📋 <strong>Requirements:</strong> {post.lfgDetails.requirements}</p>}
                    {post.lfgDetails.contactInfo && <p className="lfg-card__extra">📩 <strong>Contact:</strong> {post.lfgDetails.contactInfo}</p>}
                  </div>
                )}

                {/* Tags */}
                {post.tags?.length > 0 && (
                  <div className="post-card__tags">
                    {post.tags.map((t) => <span key={t} className="post-card__tag">#{t}</span>)}
                  </div>
                )}

                {/* 07.05 Ilia Klodin: edit for author, delete/lock/ban for mods and admin */}
                {!isEditing && (isOwner || canModerate) && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {isOwner && !post.isLocked && (
                      <button className="btn btn-secondary btn-sm" onClick={handleEditStart}>Edit</button>
                    )}
                    {canDelete && (
                      <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-danger, #e53e3e)' }} onClick={handleDelete}>
                        Delete
                      </button>
                    )}
                    {canModerate && (
                      <button className="btn btn-secondary btn-sm" onClick={handleLockToggle}>
                        {post.isLocked ? 'Unlock' : 'Lock'}
                      </button>
                    )}
                    {canModerate && !isOwner && (
                      <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-danger, #e53e3e)' }} onClick={handleBanFromHub}>
                        Ban from Hub
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---- Comment form ---- */}
          <section className="comment-form-section" aria-label="Add a comment">
            <h2 className="comment-form-section__title">
              💬 {totalComments} Comment{totalComments !== 1 ? 's' : ''}
            </h2>

            {post.isLocked ? ( /* ---- 28.04 Ilia Klodin -added post locked state in light of expanded admin-mod functionality----- */
              /* previously the comment form was still present for locked posts, which made 0 sense */
              <div className="comment-form__guest card">
                <p>🔒 This post has been locked by a moderator. No new comments can be added.</p>
              </div>
            ) : isLoggedIn ? (
              <form onSubmit={handleCommentSubmit} noValidate aria-label="Comment form">
                {submitSuccess && (
                  <div className="alert alert-success" role="status">
                    ✅ Comment posted successfully!
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="comment-input">
                    Comment as <strong>{user?.username}</strong>
                  </label>
                  <textarea
                    id="comment-input"
                    className={`form-textarea ${commentError ? 'error' : ''}`}
                    rows={4}
                    placeholder="What are your thoughts?"
                    value={commentText}
                    onChange={(e) => { setCommentText(e.target.value); setCommentError(''); }}
                    maxLength={10000}
                    aria-required="true"
                    aria-describedby={commentError ? 'comment-error' : 'comment-count'}
                  />
                  <div className="comment-form__footer">
                    {commentError && (
                      <span id="comment-error" className="field-error" role="alert">{commentError}</span>
                    )}
                    <span id="comment-count" className="comment-form__count" aria-live="polite">
                      {commentText.length} / 10,000
                    </span>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>
                  {submitting ? 'Posting…' : 'Post Comment'}
                </button>
              </form>
            ) : (
              <div className="comment-form__guest card">
                <p>You must be logged in to comment.</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <Link to="/login" className="btn btn-primary">Log In</Link>
                  <Link to="/register" className="btn btn-secondary">Register</Link>
                </div>
              </div>
            )}
          </section>

          {/* ---- Comment thread ---- */}
          <section className="comment-thread" aria-label="Comments">
            {commentTree.length === 0 ? (
              <div className="empty-state">
                <h3>No comments yet</h3>
                <p>Be the first to share your thoughts!</p>
              </div>
            ) : (
              commentTree.map((c) => (
                <CommentItem
                  key={c._id}
                  comment={c}
                  postId={postId}
                  isLocked={post.isLocked}
                  onReplyAdded={handleReplyAdded}
                />
              ))
            )}
          </section>
        </article>

        {/* ===== Sidebar ===== */}
        <aside className="sidebar">
          <div className="sidebar__widget">
            <h2 className="sidebar__title">About h/{post.hub.name}</h2>
            <Link to={`/hub/${post.hub.slug}`} className="btn btn-secondary sidebar__more">
              Visit Hub
            </Link>
          </div>

          <div className="sidebar__widget">
            <h2 className="sidebar__title">Post Rules</h2>
            <ul className="sidebar__rules">
              <li>Be civil and constructive</li>
              <li>No spoilers without tags</li>
              <li>Stay on topic</li>
            </ul>
          </div>
        </aside>

      </div>
    </div>
  );
}

export default PostDetailPage;
