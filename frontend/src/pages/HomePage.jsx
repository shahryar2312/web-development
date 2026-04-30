/**
 * HomePage.jsx — View 1: Landing page / global post feed
 *
 * Displays:
 *   - Hero banner for guests
 *   - Sort controls (hot, new, top)
 *   - List of PostCards (global feed)
 *   - Sidebar with popular hubs
 *
 * Maps to backend endpoints:
 *   Posts feed  — GET /api/hubs/:hubId/posts?sort=<sort>&page=<page>
 *   Hubs list   — GET /api/hubs?sort=members&limit=5
 *
 * Mock data is used so the page is fully interactive without a running backend.
 */
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import HubCard from '../components/HubCard';
import './HomePage.css';

/* ------------------------------------------------------------------ */
/* Mock Data — mirrors the shapes returned by the Express backend       */
/* ------------------------------------------------------------------ */

const MOCK_HUBS = [
  { _id: 'h1', name: 'Valorant',   slug: 'valorant',   game: 'Valorant',          memberCount: 48200, description: 'The #1 hub for Valorant players. Tips, clips, and team-ups.' },
  { _id: 'h2', name: 'Minecraft',  slug: 'minecraft',  game: 'Minecraft',         memberCount: 91000, description: 'Build, survive, and explore with fellow Minecrafters.' },
  { _id: 'h3', name: 'FIFA25',     slug: 'fifa25',     game: 'EA Sports FC 25',   memberCount: 32100, description: 'Ultimate Team squads, trade tips, and match clips.' },
  { _id: 'h4', name: 'Elden Ring', slug: 'elden-ring', game: 'Elden Ring',        memberCount: 27500, description: 'Lore, builds, and co-op for Tarnished everywhere.' },
  { _id: 'h5', name: 'CSGO2',      slug: 'csgo2',      game: 'Counter-Strike 2',  memberCount: 54300, description: 'Strategy, clips, and team-find for CS2 players.' },
];

const MOCK_POSTS = [
  {
    _id: 'p1',
    title: 'My first Platinum in Elden Ring after 200 hours — worth every second!',
    content: 'Finally did it. Malenia was the final boss I needed and it only took me 87 attempts. AMA.',
    type: 'text',
    voteScore: 4821,
    commentCount: 312,
    tags: ['achievement', 'platinum', 'malenia'],
    isPinned: false,
    isLocked: false,
    author: { username: 'tarnished_one' },
    hub:    { name: 'Elden Ring', slug: 'elden-ring' },
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    _id: 'p2',
    title: '[LFG] Looking for ranked teammates — Diamond+ only, EU servers',
    content: 'Main: Jett/Reyna. 500+ hours. Need 2 more for a 5-stack. Voice chat required.',
    type: 'lfg',
    voteScore: 98,
    commentCount: 24,
    tags: ['lfg', 'ranked', 'EU'],
    isPinned: false,
    isLocked: false,
    author: { username: 'spikeDefuser99' },
    hub:    { name: 'Valorant', slug: 'valorant' },
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    _id: 'p3',
    title: 'Minecraft 1.22 snapshot — caves & biomes overhaul teased by Mojang',
    content: 'New cherry blossom biome variant and underground crystal caves spotted in the latest snapshot. Screenshots inside.',
    type: 'image',
    voteScore: 2103,
    commentCount: 87,
    tags: ['news', 'snapshot', 'biome'],
    isPinned: true,
    isLocked: false,
    author: { username: 'CreeperSlayer' },
    hub:    { name: 'Minecraft', slug: 'minecraft' },
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    _id: 'p4',
    title: 'CS2 Major predictions thread — who wins the Grand Final?',
    content: 'FaZe vs NaVi Grand Final confirmed. Place your bets and reasoning below.',
    type: 'text',
    voteScore: 731,
    commentCount: 198,
    tags: ['major', 'esports', 'prediction'],
    isPinned: false,
    isLocked: false,
    author: { username: 'awpGod_official' },
    hub:    { name: 'CSGO2', slug: 'csgo2' },
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    _id: 'p5',
    title: 'Rate my Ultimate Team — 500k budget FIFA 25',
    content: 'Built around Mbappe and Rodri in the midfield. Full squad in the link.',
    type: 'link',
    url: 'https://www.futbin.com',
    voteScore: 214,
    commentCount: 41,
    tags: ['FUT', 'squad', 'budget'],
    isPinned: false,
    isLocked: false,
    author: { username: 'GoalMachine_88' },
    hub:    { name: 'FIFA25', slug: 'fifa25' },
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

function HomePage() {
  const { isLoggedIn } = useAuth();
  const [searchParams]  = useSearchParams();
  const searchQuery     = searchParams.get('search') || '';

  // Sort mode: 'hot' | 'new' | 'top'
  const [sort, setSort] = useState('hot');
  
  //30.04 Ilia Klodin: filter posts when a search query is present. when intergrated with the backend it should call GET /api/search?q=<query>
  // previous implementation had no filtering at all and thus any search term returned 0 results
  const filteredPosts = searchQuery
    ? MOCK_POSTS.filter(p => {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.hub.name.toLowerCase().includes(q) ||
          p.author.username.toLowerCase().includes(q) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
        );
      })
    : MOCK_POSTS;

  /**
   * sortedPosts — Returns the filtered post list sorted by the active mode.
   * In full integration this would be a query param on the API request:
   *   GET /api/hubs/:hubId/posts?sort=hot&page=1
   */
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sort === 'new') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'top') return b.voteScore - a.voteScore;
    // 'hot' — balance recency and votes
    return (b.voteScore * 0.7 + new Date(b.createdAt).getTime() * 0.3) -
           (a.voteScore * 0.7 + new Date(a.createdAt).getTime() * 0.3);
  });

  return (
    <div className="container">

      {/* ---- Hero banner (guests only) ---- */}
      {!isLoggedIn && (
        <section className="hero" aria-label="Welcome banner">
          <div className="hero__content">
            <h1 className="hero__title">Welcome to <span>GamerHub</span></h1>
            <p className="hero__subtitle">
              The gaming community platform. Find your hub, share your clips,
              and team up with players worldwide.
            </p>
            <div className="hero__actions">
              <Link to="/register" className="btn btn-primary hero__cta">
                Join GamerHub — it's free
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Already a member? Log in
              </Link>
            </div>
          </div>
          <div className="hero__graphic" aria-hidden="true">🎮</div>
        </section>
      )}

      {/* ---- Main layout: feed + sidebar ---- */}
      <div className="page-layout">

        {/* ===== Feed column ===== */}
        <section aria-label="Post feed">

          {/* persistent search indicator - emulating reddit behavior here */}
          {searchQuery && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              🔍 Showing results for: <strong>{searchQuery}</strong>
              {' '}({filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} found)
            </div>
          )}

          {/* Sort controls */}
          <div className="feed-controls">
            <span className="feed-controls__label">Sort by:</span>
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

          {/* Post list */}
          <div className="feed">
            {sortedPosts.length === 0 ? (
              <div className="empty-state">
                <h3>No posts yet</h3>
                <p>Be the first to post in this feed!</p>
              </div>
            ) : (
              sortedPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))
            )}
          </div>
        </section>

        {/* ===== Sidebar ===== */}
        <aside className="sidebar" aria-label="Popular hubs">
          <div className="sidebar__widget">
            <h2 className="sidebar__title">🔥 Popular Hubs</h2>
            <div className="sidebar__hub-list">
              {MOCK_HUBS.map((hub) => (
                <HubCard key={hub._id} hub={hub} />
              ))}
            </div>
            <Link to="/hubs" className="btn btn-secondary sidebar__more">
              Browse all hubs
            </Link>
          </div>

          {/* Rules / info widget */}
          <div className="sidebar__widget">
            <h2 className="sidebar__title">📋 Community Rules</h2>
            <ol className="sidebar__rules">
              <li>Be respectful to all members</li>
              <li>No spam or self-promotion</li>
              <li>Stay on topic within each hub</li>
              <li>No cheating discussions</li>
              <li>Mark spoilers appropriately</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default HomePage;
