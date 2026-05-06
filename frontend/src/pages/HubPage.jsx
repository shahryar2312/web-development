/**
 * HubPage.jsx — View 3: Individual hub (gaming community) page
 *
 * Displays:
 *   - Hub banner, icon, name, member count, description
 *   - Join / Leave button
 *   - Sort controls and post feed for this hub
 *   - Sidebar with hub rules and info
 *   - "Create Post" button (visible to logged-in users)
 *
 * Maps to backend endpoints:
 *   Hub info  — GET /api/hubs/:slug          (by slug)
 *   Posts     — GET /api/hubs/:hubId/posts?sort=<sort>&page=<page>
 *   Join      — POST /api/hubs/:hubId/join
 *   Leave     — DELETE /api/hubs/:hubId/join
 */
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PostCard from '../components/PostCard';
import './HubPage.css';

function HubPage() {
  const { slug }               = useParams();
  const { isLoggedIn, user }   = useAuth();

  const [hub,         setHub]         = useState(null);
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [sort,        setSort]        = useState('hot');
  const [joined,      setJoined]      = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [joinLoading, setJoinLoading] = useState(false);

  // Load hub data on mount
  useEffect(() => {
    setLoading(true);
    setError('');

    api.get(`/api/hubs/slug/${slug}`)
      .then((data) => {
        setHub(data.hub);
        setMemberCount(data.hub.memberCount ?? 0);
        return api.get(`/api/hubs/${data.hub._id}/posts?sort=hot`);
      })
      .then((data) => setPosts(data.posts || []))
      .catch(() => setError('Hub not found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Sync join state once both hub and user are available
  useEffect(() => {
    if (hub && user) {
      const joined = user.joinedHubs?.some(
        (id) => id.toString() === hub._id.toString()
      );
      setJoined(joined ?? false);
    }
  }, [hub, user]);

  // Re-fetch posts when sort changes (after hub is loaded)
  useEffect(() => {
    if (!hub) return;
    api.get(`/api/hubs/${hub._id}/posts?sort=${sort}`)
      .then((data) => setPosts(data.posts || []))
      .catch(console.error);
  }, [sort]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * handleJoinToggle — Joins or leaves the hub.
   * Maps to:
   *   POST   /api/hubs/:hubId/join
   *   DELETE /api/hubs/:hubId/join  (leave)
   */
  const handleJoinToggle = async () => {
    if (!isLoggedIn) { alert('Please log in to join a hub.'); return; }
    setJoinLoading(true);
    try {
      const method = joined ? 'delete' : 'post';
      await api[method](`/api/hubs/${hub._id}/join`);
      setJoined((prev) => !prev);
      setMemberCount((prev) => joined ? prev - 1 : prev + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) return <div className="container empty-state" style={{ marginTop: '4rem' }}><p>Loading hub…</p></div>;
  if (error)   return <div className="container empty-state" style={{ marginTop: '4rem' }}><h2>{error}</h2><Link to="/hubs" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Hubs</Link></div>;

  return (
    <div>
      <div className="hub-banner" style={{ background: 'linear-gradient(135deg, #1a1d27 0%, #22263a 100%)' }}>
        <div className="container hub-banner__inner">
          <div className="hub-banner__icon">
            {hub.icon
              ? <img src={hub.icon} alt={`${hub.name} icon`} />
              : <span>{hub.name.charAt(0).toUpperCase()}</span>
            }
          </div>

          <div className="hub-banner__info">
            <h1 className="hub-banner__name">h/{hub.name}</h1>
            <p className="hub-banner__game">🎮 {hub.game}</p>
            <p className="hub-banner__members">
              👥 {memberCount.toLocaleString()} members
              {hub.isPrivate && <span className="badge badge-warning" style={{ marginLeft: '8px' }}>Private</span>}
            </p>
          </div>

          <div className="hub-banner__actions">
            <button
              className={`btn ${joined ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleJoinToggle}
              disabled={joinLoading}
            >
              {joinLoading ? '…' : joined ? '✓ Joined' : 'Join Hub'}
            </button>
            {isLoggedIn && (
              <Link to={`/hub/${slug}/create-post`} className="btn btn-secondary">
                + Create Post
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="page-layout">

          <section aria-label={`${hub.name} posts`}>
            <p className="hub-page__desc">{hub.description}</p>

            <div className="feed-controls" style={{ marginBottom: 'var(--space-4)' }}>
              <span className="feed-controls__label">Sort:</span>
              {['hot', 'new', 'top'].map((mode) => (
                <button
                  key={mode}
                  className={`feed-controls__btn ${sort === mode ? 'active' : ''}`}
                  onClick={() => setSort(mode)}
                  aria-pressed={sort === mode}
                >
                  {mode === 'hot' ? '🔥' : mode === 'new' ? '✨' : '🏆'} {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {posts.length === 0 ? (
              <div className="empty-state">
                <h3>No posts yet in h/{hub.name}</h3>
                {isLoggedIn
                  ? <Link to={`/hub/${slug}/create-post`} className="btn btn-primary" style={{ marginTop: '1rem' }}>Be the first to post</Link>
                  : <p>Log in to create the first post.</p>
                }
              </div>
            ) : (
              <div className="feed">
                {posts.map((post) => <PostCard key={post._id} post={post} />)}
              </div>
            )}
          </section>

          <aside className="sidebar">
            <div className="sidebar__widget">
              <h2 className="sidebar__title">About h/{hub.name}</h2>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
                {hub.description}
              </p>
              <div className="hub-stats">
                <div className="hub-stat">
                  <strong>{memberCount.toLocaleString()}</strong>
                  <span>Members</span>
                </div>
                <div className="hub-stat">
                  <strong>{posts.length}</strong>
                  <span>Posts shown</span>
                </div>
              </div>
              {isLoggedIn && (
                <Link to={`/hub/${slug}/create-post`} className="btn btn-primary sidebar__more">
                  + Create Post
                </Link>
              )}
            </div>

            {hub.rules?.length > 0 && (
              <div className="sidebar__widget">
                <h2 className="sidebar__title">📋 Hub Rules</h2>
                <ol className="hub-rules">
                  {hub.rules.map((rule, idx) => (
                    <li key={idx} className="hub-rules__item">
                      <strong>{rule.title}</strong>
                      {rule.description && <p>{rule.description}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default HubPage;
