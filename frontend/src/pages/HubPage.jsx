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
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useModal } from '../context/ModalContext';
import PostCard from '../components/PostCard';
import './HubPage.css';

function HubPage() {
  const { slug }                            = useParams();
  const { isLoggedIn, user, refreshUser }   = useAuth();
  const { showModal }                       = useModal();
  const navigate                            = useNavigate();

  const [hub,         setHub]         = useState(null);
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [sort,        setSort]        = useState('hot');
  const [searchQuery, setSearchQuery] = useState('');
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
      })
      .catch(() => setError('Hub not found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Sync join state once both hub and user are available
  useEffect(() => {
    if (hub && user) {
      const joined = user.joinedHubs?.some(
        (h) => (h._id || h).toString() === hub._id.toString()
      );
      setJoined(joined ?? false);
    }
  }, [hub, user]);

  // Re-fetch posts when sort or search changes (after hub is loaded)
  useEffect(() => {
    if (!hub) return;
    
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ sort });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      api.get(`/api/hubs/${hub._id}/posts?${params}`)
        .then((data) => setPosts(data.posts || []))
        .catch(console.error);
    }, 500);

    return () => clearTimeout(timer);
  }, [sort, searchQuery, hub]);

  /**
   * handleJoinToggle — Joins or leaves the hub.
   * Maps to:
   *   POST   /api/hubs/:hubId/join
   *   DELETE /api/hubs/:hubId/join  (leave)
   */
  const handleJoinToggle = async () => {
    if (!isLoggedIn) { showModal({ title: 'Authentication Required', message: 'Please log in to join a hub.', type: 'error' }); return; }
    
    const performAction = async (isLeaving) => {
      setJoinLoading(true);
      try {
        const method = isLeaving ? 'delete' : 'post';
        await api[method](`/api/hubs/${hub._id}/join`);
        await refreshUser();
        setJoined((prev) => !prev);
        setMemberCount((prev) => isLeaving ? prev - 1 : prev + 1);
      } catch (err) {
        showModal({ title: 'Error', message: err.message, type: 'error' });
      } finally {
        setJoinLoading(false);
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

  if (loading) return <div className="container empty-state" style={{ marginTop: '4rem' }}><p>Loading hub…</p></div>;
  if (error)   return <div className="container empty-state" style={{ marginTop: '4rem' }}><h2>{error}</h2><Link to="/hubs" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Hubs</Link></div>;

  // 07.05 Ilia Klodin: hub staff checks — creator is distinct from mods even though they're also in the mods array
  const isHubCreator = hub.creator?._id?.toString() === user?._id?.toString();
  const isHubMod     = hub.moderators?.some(m => m._id?.toString() === user?._id?.toString()) && !isHubCreator;
  const isAdmin      = user?.role === 'admin';
  const isStaff      = isHubCreator || isHubMod || isAdmin;

  const handleDeleteHub = () => {
    showModal({
      title: 'Delete Hub',
      message: `Permanently delete h/${hub.name} and all its posts? This cannot be undone.`,
      type: 'error', confirmText: 'Delete Hub', cancelText: 'Cancel',
      onConfirm: async () => {
        try { await api.delete(`/api/hubs/${hub._id}`); navigate('/hubs'); }
        catch (err) { showModal({ title: 'Error', message: err.message, type: 'error' }); }
      },
    });
  };

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

            <div className="feed-controls" style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                className="form-input"
                style={{ flex: 1, minWidth: '200px' }}
                placeholder={`Search posts in h/${hub.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search posts"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

            <div className="sidebar__widget">
              <h2 className="sidebar__title"> Hub Staff</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Owner</span>
                  <Link to={`/user/${hub.creator.username}`} style={{ fontSize: 'var(--fs-sm)' }}>
                    u/{hub.creator.username}
                  </Link>
                </div>
                {hub.moderators
                  .filter(m => m._id?.toString() !== hub.creator._id?.toString())
                  .map(mod => (
                    <div key={mod._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Mod</span>
                      <Link to={`/user/${mod.username}`} style={{ fontSize: 'var(--fs-sm)' }}>
                        u/{mod.username}
                      </Link>
                    </div>
                  ))
                }
              </div>
            </div>

            {isStaff && (
              <div className="sidebar__widget">
                <h2 className="sidebar__title">🛠️ Mod Tools</h2>
                {(isHubCreator || isAdmin) && (
                  <button
                    className="btn btn-secondary sidebar__more"
                    style={{ color: 'var(--color-danger, #e53e3e)' }}
                    onClick={handleDeleteHub}
                  >
                    Delete Hub
                  </button>
                )}
              </div>
            )}

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
