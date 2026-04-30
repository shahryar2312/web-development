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
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PostDetailPage.css';

/* ------------------------------------------------------------------ */
/* Mock Data                                                            */
/* ------------------------------------------------------------------ */

const MOCK_POSTS = {
  p1: {
    _id: 'p1',
    title: 'My first Platinum in Elden Ring after 200 hours — worth every second!',
    content: `Finally did it. Malenia was the final boss I needed and it only took me 87 attempts.

The trick that finally worked: Bloodhound's Step to dodge Scarlet Rot, Rivers of Blood bleed build,
and just... patience. Lots of patience.

Best gaming achievement of my life. AMA!`,
    type: 'text',
    voteScore: 4821,
    commentCount: 3,
    tags: ['achievement', 'platinum', 'malenia'],
    isPinned: false,
    isLocked: false,
    author:    { username: 'tarnished_one' },
    hub:       { _id: 'h4', name: 'Elden Ring', slug: 'elden-ring' },
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  vp1: {
    _id: 'vp1',
    title: 'Immortal 3 → Radiant in 2 weeks — here is my full routine',
    content: `I peaked Immortal 3 for two acts and was about to give up on Radiant. Here is the routine that finally worked:

1. 30 min Aim Lab every morning (Gridshot, Strafetrack, Sidetrack)
2. 1 hour deathmatch — no peeking, just cleaning up aim
3. Watch 1 full VCT game per day focusing on positioning
4. Ranked only when mentally fresh

Agent: Mainly Jett, switched to Chamber for the last push.

Feel free to ask questions!`,
    type: 'text',
    voteScore: 3402,
    commentCount: 2,
    tags: ['ranked', 'guide', 'radiant'],
    isPinned: true,
    isLocked: false,
    author:    { username: 'RadiantCoach' },
    hub:       { _id: 'h1', name: 'Valorant', slug: 'valorant' },
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
};

const MOCK_COMMENTS = {
  p1: [
    { _id: 'c1', content: 'Congrats! 87 attempts on Malenia is actually pretty good. Most people take 150+', voteScore: 342, author: { username: 'BossRushFan' }, parent: null, depth: 0, createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString() },
    { _id: 'c2', content: 'Which ending did you go for? I always do Age of Stars first run.', voteScore: 89,  author: { username: 'LoreNerd42'  }, parent: null, depth: 0, createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    { _id: 'c3', content: 'Same! The music when you finally beat her is 🔥', voteScore: 201, author: { username: 'SoundtrackFan' }, parent: 'c1', depth: 1, createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
  ],
  vp1: [
    { _id: 'c4', content: 'This is exactly what I needed. Bookmarked. Do you recommend any specific Aim Lab playlist?', voteScore: 128, author: { username: 'SilverStruggle' }, parent: null, depth: 0, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { _id: 'c5', content: 'ValorantAim default + Strafetrack 180. Start at 60% speed.', voteScore: 77, author: { username: 'RadiantCoach' }, parent: 'c4', depth: 1, createdAt: new Date(Date.now() - 100 * 60 * 1000).toISOString() },
  ],
};

/* ------------------------------------------------------------------ */
/* CommentItem sub-component                                            */
/* ------------------------------------------------------------------ */

/**
 * CommentItem — Renders a single comment with vote controls.
 * Indented based on comment.depth for nested replies.
 *
 * Props:
 *   comment {object} — comment document
 */
function CommentItem({ comment }) {
  const { isLoggedIn } = useAuth();
  const [score, setScore]     = useState(comment.voteScore);
  const [userVote, setUserVote] = useState(0);

  /**
   * handleVote — Upvotes or downvotes a comment.
   * Maps to: POST /api/comments/:commentId/vote  { value }
   */
  const handleVote = (val) => {
    if (!isLoggedIn) { alert('Please log in to vote.'); return; }
    /*
     * --- BACKEND INTEGRATION POINT ---
     * fetch(`/api/comments/${comment._id}/vote`, {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   credentials: 'include',
     *   body: JSON.stringify({ value: val === userVote ? 0 : val }),
     * });
     */
    if (val === userVote) { setScore((s) => s - userVote); setUserVote(0); }
    else { setScore((s) => s - userVote + val); setUserVote(val); }
  };

  const formatDate = (iso) => {
    const delta = (Date.now() - new Date(iso).getTime()) / 1000;
    if (delta < 60)    return 'just now';
    if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  return (
    <div
      className="comment"
      style={{ marginLeft: `${comment.depth * 24}px` }}
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
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */

function PostDetailPage() {
  const { postId }    = useParams();
  const { isLoggedIn, user } = useAuth();

  const post     = MOCK_POSTS[postId];
  const comments = MOCK_COMMENTS[postId] ?? [];

  /* Vote state for the post itself */
  const [postScore, setPostScore]   = useState(post?.voteScore ?? 0);
  const [postVote, setPostVote]     = useState(0);

  /* Comment form state */
  const [commentText, setCommentText]   = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentList, setCommentList]   = useState(comments);
  const [submitting, setSubmitting]     = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /* If post not found */
  if (!post) {
    return (
      <div className="container empty-state" style={{ marginTop: '4rem' }}>
        <h2>Post not found</h2>
        <p>This post may have been deleted or the link is incorrect.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</Link>
      </div>
    );
  }

  /**
   * handlePostVote — Votes on the main post.
   * Maps to: POST /api/posts/:postId/vote  { value }
   */
  const handlePostVote = (val) => {
    if (!isLoggedIn) { alert('Please log in to vote.'); return; }
    if (val === postVote) { setPostScore((s) => s - postVote); setPostVote(0); }
    else { setPostScore((s) => s - postVote + val); setPostVote(val); }
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

    /*
     * --- BACKEND INTEGRATION POINT ---
     * const res = await fetch(`/api/posts/${postId}/comments`, {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   credentials: 'include',
     *   body: JSON.stringify({ content: commentText.trim() }),
     * });
     * const data = await res.json();
     * if (res.ok) { setCommentList((prev) => [data.comment, ...prev]); }
     */

    // Mock: prepend the new comment to the list
    const newComment = {
      _id:       `c-new-${Date.now()}`,
      content:   commentText.trim(),
      voteScore: 0,
      author:    { username: user?.username ?? 'you' },
      parent:    null,
      depth:     0,
      createdAt: new Date().toISOString(),
    };

    setCommentList((prev) => [newComment, ...prev]);
    setCommentText('');
    setSubmitSuccess(true);
    setSubmitting(false);

    // Clear success message after 3 seconds
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  const formatDate = (iso) => {
    const delta = (Date.now() - new Date(iso).getTime()) / 1000;
    if (delta < 60)    return 'just now';
    if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  const typeBadgeMap = { text: { label: 'Text', cls: 'badge-info' }, image: { label: 'Image', cls: 'badge-success' }, link: { label: 'Link', cls: 'badge-warning' }, lfg: { label: 'LFG', cls: 'badge-primary' } };
  const badge = typeBadgeMap[post.type] ?? typeBadgeMap.text;

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
                <button className={`vote-btn vote-btn--up ${postVote === 1 ? 'active' : ''}`} onClick={() => handlePostVote(1)} aria-label="Upvote">▲</button>
                <span className="vote-btn__score" aria-live="polite">{postScore}</span>
                <button className={`vote-btn vote-btn--down ${postVote === -1 ? 'active' : ''}`} onClick={() => handlePostVote(-1)} aria-label="Downvote">▼</button>
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

                {/* Title */}
                <h1 className="post-detail__title">{post.title}</h1>

                {/* Body */}
                {post.content && (
                  <div className="post-detail__body">
                    {post.content.split('\n').map((line, i) => (
                      <p key={i}>{line || <br />}</p>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {post.tags?.length > 0 && (
                  <div className="post-card__tags">
                    {post.tags.map((t) => <span key={t} className="post-card__tag">#{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---- Comment form ---- */}
          <section className="comment-form-section" aria-label="Add a comment">
            <h2 className="comment-form-section__title">
              💬 {commentList.length} Comment{commentList.length !== 1 ? 's' : ''}
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
                  <Link to="/login"    className="btn btn-primary">Log In</Link>
                  <Link to="/register" className="btn btn-secondary">Register</Link>
                </div>
              </div>
            )}
          </section>

          {/* ---- Comment thread ---- */}
          <section className="comment-thread" aria-label="Comments">
            {commentList.length === 0 ? (
              <div className="empty-state">
                <h3>No comments yet</h3>
                <p>Be the first to share your thoughts!</p>
              </div>
            ) : (
              commentList.map((c) => <CommentItem key={c._id} comment={c} />)
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
