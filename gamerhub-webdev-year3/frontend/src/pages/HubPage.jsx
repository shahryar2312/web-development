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
 *   Leave     — POST /api/hubs/:hubId/leave
 */
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import './HubPage.css';

/* ------------------------------------------------------------------ */
/* Mock Data                                                            */
/* ------------------------------------------------------------------ */

const MOCK_HUBS = {
  valorant: {
    _id: 'h1',
    name: 'Valorant',
    slug: 'valorant',
    game: 'Valorant',
    description: 'The #1 community hub for Valorant players. Share tips, highlight clips, discuss meta, and find teammates. All ranks welcome.',
    memberCount: 48200,
    icon: '',
    banner: '',
    isPrivate: false,
    rules: [
      { title: 'Be respectful', description: 'No toxicity, slurs, or personal attacks.' },
      { title: 'No cheating discussion', description: 'Do not discuss, promote, or request hacks/cheats.' },
      { title: 'Clip quality', description: 'Only post your own clips. No low-effort content.' },
      { title: 'No spam', description: 'Self-promotion and repeated posts will be removed.' },
    ],
  },
  minecraft: {
    _id: 'h2',
    name: 'Minecraft',
    slug: 'minecraft',
    game: 'Minecraft',
    description: 'Build, survive, and explore with fellow Minecrafters. Show off your builds, share seeds, get redstone help.',
    memberCount: 91000,
    icon: '',
    banner: '',
    isPrivate: false,
    rules: [
      { title: 'Credit builds', description: 'If you share someone else\'s build, credit them.' },
      { title: 'No seed requests for explicit content', description: 'Self-explanatory.' },
    ],
  },
  'elden-ring': {
    _id: 'h4',
    name: 'Elden Ring',
    slug: 'elden-ring',
    game: 'Elden Ring',
    description: 'Lore theories, build sharing, and co-op help for Tarnished adventurers in the Lands Between.',
    memberCount: 27500,
    icon: '',
    banner: '',
    isPrivate: false,
    rules: [
      { title: 'Spoiler tags', description: 'Tag all story spoilers with [SPOILER].' },
      { title: 'Be helpful', description: 'New Tarnished are welcome — no gatekeeping.' },
    ],
  },
};

const MOCK_POSTS_BY_SLUG = {
  valorant: [
    { _id: 'vp1', title: 'Immortal 3 → Radiant in 2 weeks — here is my full routine', content: 'Deathmatch every morning, VCT VODs, aim lab 30 min. Details inside.', type: 'text', voteScore: 3402, commentCount: 214, tags: ['ranked', 'guide'], isPinned: true, isLocked: false, author: { username: 'RadiantCoach' }, hub: { name: 'Valorant', slug: 'valorant' }, createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
    { _id: 'vp2', title: '5-stack LFG — Diamond, EU, weekday evenings', content: 'Looking for a 5th for ranked push. Must have mic and be chill.', type: 'lfg', voteScore: 55, commentCount: 8, tags: ['lfg', 'EU'], isPinned: false, isLocked: false, author: { username: 'EuroFragger' }, hub: { name: 'Valorant', slug: 'valorant' }, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { _id: 'vp3', title: 'Patch 9.0 Neon buff is actually insane', content: 'Full run velocity + sprint reload is broken on Haven.', type: 'text', voteScore: 1890, commentCount: 97, tags: ['patch', 'neon', 'meta'], isPinned: false, isLocked: false, author: { username: 'MetaWatcher' }, hub: { name: 'Valorant', slug: 'valorant' }, createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString() },
  ],
  minecraft: [
    { _id: 'mp1', title: 'My 200-hour survival world — full base tour', content: 'Started with a dirt hut and now I have a full netherite beacon. Gallery in comments.', type: 'image', voteScore: 12400, commentCount: 438, tags: ['build', 'survival'], isPinned: false, isLocked: false, author: { username: 'BlockMaster' }, hub: { name: 'Minecraft', slug: 'minecraft' }, createdAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString() },
  ],
  'elden-ring': [
    { _id: 'ep1', title: '[SPOILER] Ending lore breakdown — all 6 endings explained', content: 'After 3 playthroughs I finally understand the Elden Ring lore.', type: 'text', voteScore: 5210, commentCount: 302, tags: ['lore', 'spoiler'], isPinned: false, isLocked: false, author: { username: 'TarnishedLore' }, hub: { name: 'Elden Ring', slug: 'elden-ring' }, createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString() },
  ],
};

/* Default fallback hub */
const DEFAULT_HUB = {
  _id:         'unknown',
  name:        'Unknown Hub',
  slug:        'unknown',
  game:        'Unknown Game',
  description: 'This hub does not exist.',
  memberCount: 0,
  icon:        '',
  banner:      '',
  isPrivate:   false,
  rules:       [],
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

function HubPage() {
  const { slug }    = useParams(); // URL segment, e.g. "valorant"
  const { isLoggedIn } = useAuth();

  // Look up mock hub by slug; fall back to default
  const hub  = MOCK_HUBS[slug]             ?? DEFAULT_HUB;
  const posts = MOCK_POSTS_BY_SLUG[slug]   ?? [];

  // Sort mode for the post feed
  const [sort, setSort]     = useState('hot');

  // Join state
  const [joined, setJoined]           = useState(false);
  const [memberCount, setMemberCount] = useState(hub.memberCount);

  /**
   * handleJoinToggle — Joins or leaves the hub.
   * Maps to:
   *   POST /api/hubs/:hubId/join
   *   POST /api/hubs/:hubId/leave
   */
  const handleJoinToggle = () => {
    if (!isLoggedIn) {
      alert('Please log in to join a hub.');
      return;
    }
    /*
     * --- BACKEND INTEGRATION POINT ---
     * const endpoint = joined ? `/api/hubs/${hub._id}/leave` : `/api/hubs/${hub._id}/join`;
     * fetch(endpoint, { method: 'POST', credentials: 'include' });
     */
    setJoined((prev) => !prev);
    setMemberCount((prev) => joined ? prev - 1 : prev + 1);
  };

  /**
   * sortedPosts — Sorts mock posts by the active mode.
   */
  const sortedPosts = [...posts].sort((a, b) => {
    if (sort === 'new') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'top') return b.voteScore - a.voteScore;
    return (b.voteScore * 0.7) - (a.voteScore * 0.7);
  });

  return (
    <div>
      {/* ---- Hub Banner ---- */}
      <div className="hub-banner" style={{ background: 'linear-gradient(135deg, #1a1d27 0%, #22263a 100%)' }}>
        <div className="container hub-banner__inner">
          {/* Hub icon */}
          <div className="hub-banner__icon">
            {hub.icon
              ? <img src={hub.icon} alt={`${hub.name} icon`} />
              : <span>{hub.name.charAt(0).toUpperCase()}</span>
            }
          </div>

          {/* Hub info */}
          <div className="hub-banner__info">
            <h1 className="hub-banner__name">h/{hub.name}</h1>
            <p className="hub-banner__game">🎮 {hub.game}</p>
            <p className="hub-banner__members">
              👥 {memberCount.toLocaleString()} members
              {hub.isPrivate && <span className="badge badge-warning" style={{ marginLeft: '8px' }}>Private</span>}
            </p>
          </div>

          {/* Actions */}
          <div className="hub-banner__actions">
            <button
              className={`btn ${joined ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleJoinToggle}
            >
              {joined ? '✓ Joined' : 'Join Hub'}
            </button>
            {isLoggedIn && (
              <Link to={`/hub/${slug}/create-post`} className="btn btn-secondary">
                + Create Post
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ---- Main layout ---- */}
      <div className="container">
        <div className="page-layout">

          {/* ===== Post feed ===== */}
          <section aria-label={`${hub.name} posts`}>
            {/* Hub description */}
            <p className="hub-page__desc">{hub.description}</p>

            {/* Sort controls */}
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

            {/* Posts */}
            {sortedPosts.length === 0 ? (
              <div className="empty-state">
                <h3>No posts yet in h/{hub.name}</h3>
                {isLoggedIn
                  ? <Link to={`/hub/${slug}/create-post`} className="btn btn-primary" style={{ marginTop: '1rem' }}>Be the first to post</Link>
                  : <p>Log in to create the first post.</p>
                }
              </div>
            ) : (
              <div className="feed">
                {sortedPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            )}
          </section>

          {/* ===== Sidebar ===== */}
          <aside className="sidebar">
            {/* About widget */}
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
                  <span>Posts</span>
                </div>
              </div>
              {isLoggedIn && (
                <Link to={`/hub/${slug}/create-post`} className="btn btn-primary sidebar__more">
                  + Create Post
                </Link>
              )}
            </div>

            {/* Rules widget */}
            {hub.rules.length > 0 && (
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
