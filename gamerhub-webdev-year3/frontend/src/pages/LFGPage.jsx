/**
 * LFGPage.jsx — View 5: Looking for Group listings
 *
 * Displays a searchable, filterable list of LFG posts from across all hubs.
 * Filters: platform, region, skill level, status (open/closed).
 * Includes a "Create LFG Post" form (with full client-side validation).
 *
 * Maps to backend endpoints:
 *   LFG feed   — GET  /api/lfg?platform=<p>&region=<r>&status=open&page=1
 *   Create LFG — POST /api/hubs/:hubId/posts  { type: 'lfg', title, content, lfgDetails: {...} }
 */
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LFGPage.css';

/* ------------------------------------------------------------------ */
/* Mock Data                                                            */
/* ------------------------------------------------------------------ */

const MOCK_LFG = [
  {
    _id: 'lfg1',
    title: '[Valorant] Diamond 5-stack — EU servers, weekday evenings',
    content: 'Looking for 2 players to complete our 5-stack. Must have mic, be positive, and know basics.',
    voteScore: 45,
    author:    { username: 'EuroFragger' },
    hub:       { name: 'Valorant', slug: 'valorant' },
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lfgDetails: { platform: 'PC', region: 'EU', skillLevel: 'Advanced', playersNeeded: 2, currentPlayers: 3, voiceChat: true, gameMode: 'Ranked', status: 'open', schedule: 'Weekday evenings (GMT)', requirements: 'Diamond+, must have mic', contactInfo: 'DM me on Discord: EuroFragger#1234' },
  },
  {
    _id: 'lfg2',
    title: '[Minecraft] SMP looking for active builders',
    content: 'Running a whitelist SMP with 8 people, need 2 more active players who love building.',
    voteScore: 31,
    author:    { username: 'CreeperSlayer' },
    hub:       { name: 'Minecraft', slug: 'minecraft' },
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    lfgDetails: { platform: 'PC', region: 'Global', skillLevel: 'Intermediate', playersNeeded: 2, currentPlayers: 8, voiceChat: false, gameMode: 'Survival SMP', status: 'open', schedule: 'Weekends', requirements: 'Active player, no griefing', contactInfo: 'Reply here or Discord server' },
  },
  {
    _id: 'lfg3',
    title: '[CS2] NA Faceit Level 8+ looking for team',
    content: 'LFM for a serious Faceit team. Practice schedule 3 nights/week.',
    voteScore: 88,
    author:    { username: 'awpGod_official' },
    hub:       { name: 'CSGO2', slug: 'csgo2' },
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    lfgDetails: { platform: 'PC', region: 'NA', skillLevel: 'Expert', playersNeeded: 3, currentPlayers: 2, voiceChat: true, gameMode: 'Faceit Ranked', status: 'open', schedule: 'Mon/Wed/Fri 8pm EST', requirements: 'Faceit Level 8+, no toxic behaviour', contactInfo: 'Discord: awpGod#9999' },
  },
  {
    _id: 'lfg4',
    title: '[Elden Ring] Co-op helpers needed — Malenia fight',
    content: 'Completely lost. Need 2 experienced summons for Malenia. PS5.',
    voteScore: 12,
    author:    { username: 'NewTarnished' },
    hub:       { name: 'Elden Ring', slug: 'elden-ring' },
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    lfgDetails: { platform: 'PlayStation', region: 'EU', skillLevel: 'Beginner', playersNeeded: 2, currentPlayers: 1, voiceChat: false, gameMode: 'Co-op', status: 'open', schedule: 'Now', requirements: 'Just be patient!', contactInfo: 'PSN: NewTarnished_ER' },
  },
  {
    _id: 'lfg5',
    title: '[Valorant] Unrated fun games — any rank welcome',
    content: 'Casual 5-stack for unrated. No sweat, just chill and have fun.',
    voteScore: 24,
    author:    { username: 'ChillGamer' },
    hub:       { name: 'Valorant', slug: 'valorant' },
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    lfgDetails: { platform: 'PC', region: 'NA', skillLevel: 'Any', playersNeeded: 4, currentPlayers: 1, voiceChat: true, gameMode: 'Unrated', status: 'closed', schedule: 'Weekends', requirements: 'None', contactInfo: 'Discord: ChillGamer#0001' },
  },
];

const PLATFORMS  = ['All', 'PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Cross-platform'];
const REGIONS    = ['All', 'NA', 'EU', 'Asia', 'OCE', 'SA', 'Global'];
const SKILL_LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Any'];

/* ------------------------------------------------------------------ */
/* LFG Card sub-component                                               */
/* ------------------------------------------------------------------ */

/**
 * LFGCard — Renders a single LFG listing card.
 */
function LFGCard({ post }) {
  const formatDate = (iso) => {
    const delta = (Date.now() - new Date(iso).getTime()) / 1000;
    if (delta < 60)    return 'just now';
    if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  const d = post.lfgDetails;
  const spotsLeft = d.playersNeeded - d.currentPlayers;

  return (
    <article className="lfg-card card">
      {/* Header */}
      <div className="lfg-card__header">
        <div className="lfg-card__title-row">
          <Link to={`/post/${post._id}`} className="lfg-card__title">{post.title}</Link>
          <span className={`badge ${d.status === 'open' ? 'badge-success' : 'badge-danger'}`}>
            {d.status === 'open' ? '🟢 Open' : '🔴 Closed'}
          </span>
        </div>
        <div className="lfg-card__meta">
          <Link to={`/hub/${post.hub.slug}`} className="lfg-card__hub">h/{post.hub.name}</Link>
          <span>•</span>
          <span>u/{post.author.username}</span>
          <span>•</span>
          <time>{formatDate(post.createdAt)}</time>
        </div>
      </div>

      {/* Content snippet */}
      <p className="lfg-card__content">{post.content}</p>

      {/* Details grid */}
      <div className="lfg-card__details">
        <div className="lfg-detail"><span className="lfg-detail__key">Platform</span><span className="lfg-detail__val">{d.platform}</span></div>
        <div className="lfg-detail"><span className="lfg-detail__key">Region</span><span className="lfg-detail__val">{d.region}</span></div>
        <div className="lfg-detail"><span className="lfg-detail__key">Skill</span><span className="lfg-detail__val">{d.skillLevel}</span></div>
        <div className="lfg-detail"><span className="lfg-detail__key">Mode</span><span className="lfg-detail__val">{d.gameMode || '—'}</span></div>
        <div className="lfg-detail"><span className="lfg-detail__key">Spots</span><span className="lfg-detail__val">{spotsLeft > 0 ? `${spotsLeft} of ${d.playersNeeded} left` : 'Full'}</span></div>
        <div className="lfg-detail"><span className="lfg-detail__key">Voice</span><span className="lfg-detail__val">{d.voiceChat ? '🎙 Required' : '🔇 Optional'}</span></div>
      </div>

      {/* Schedule & requirements */}
      {d.schedule    && <p className="lfg-card__extra">🕐 <strong>Schedule:</strong> {d.schedule}</p>}
      {d.requirements && <p className="lfg-card__extra">📋 <strong>Requirements:</strong> {d.requirements}</p>}
      {d.contactInfo  && <p className="lfg-card__extra">📩 <strong>Contact:</strong> {d.contactInfo}</p>}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */

function LFGPage() {
  const { isLoggedIn, user } = useAuth();

  /* ---- Filter state ---- */
  const [platform,   setPlatform]   = useState('All');
  const [region,     setRegion]     = useState('All');
  const [skillLevel, setSkillLevel] = useState('All');
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'closed' | 'all'

  /* ---- Create LFG form visibility ---- */
  const [showForm, setShowForm] = useState(false);

  /* ---- Create LFG form state ---- */
  const initialForm = { title: '', content: '', platform: 'PC', region: 'EU', skillLevel: 'Any', gameMode: '', playersNeeded: '2', voiceChat: false, schedule: '', requirements: '', contactInfo: '', hubSlug: 'valorant' };
  const [formData, setFormData]   = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /* ---- LFG list (starts with mock, new posts prepended) ---- */
  const [lfgList, setLfgList] = useState(MOCK_LFG);

  /**
   * filteredList — Applies active filters to the LFG list.
   * In full integration these would be query params on GET /api/lfg
   */
  const filteredList = useMemo(() => {
    return lfgList.filter((post) => {
      const d = post.lfgDetails;
      if (platform !== 'All'    && d.platform   !== platform)   return false;
      if (region   !== 'All'    && d.region     !== region)     return false;
      if (skillLevel !== 'All'  && d.skillLevel !== skillLevel) return false;
      if (statusFilter !== 'all' && d.status    !== statusFilter) return false;
      return true;
    });
  }, [lfgList, platform, region, skillLevel, statusFilter]);

  /* ---- Form handlers ---- */
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  /**
   * validateForm — Client-side validation for the Create LFG form.
   * Mirrors the backend createRules and LFG model constraints.
   */
  const validateForm = () => {
    const errs = {};

    if (!formData.title.trim()) {
      errs.title = 'Title is required.';
    } else if (formData.title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters.';
    } else if (formData.title.trim().length > 300) {
      errs.title = 'Title cannot exceed 300 characters.';
    }

    if (!formData.content.trim()) {
      errs.content = 'Description is required.';
    }

    const pn = parseInt(formData.playersNeeded, 10);
    if (isNaN(pn) || pn < 1) {
      errs.playersNeeded = 'Players needed must be at least 1.';
    } else if (pn > 100) {
      errs.playersNeeded = 'Players needed cannot exceed 100.';
    }

    if (!formData.contactInfo.trim()) {
      errs.contactInfo = 'Contact information is required so players can reach you.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /**
   * handleFormSubmit — Creates a new LFG post.
   * Maps to: POST /api/hubs/:hubId/posts
   *   Body: { type: 'lfg', title, content, lfgDetails: { platform, region, ... } }
   */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    /*
     * --- BACKEND INTEGRATION POINT ---
     * const res = await fetch(`/api/hubs/${selectedHub._id}/posts`, {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   credentials: 'include',
     *   body: JSON.stringify({
     *     type: 'lfg',
     *     title: formData.title,
     *     content: formData.content,
     *     lfgDetails: {
     *       platform: formData.platform,
     *       region: formData.region,
     *       skillLevel: formData.skillLevel,
     *       gameMode: formData.gameMode,
     *       playersNeeded: parseInt(formData.playersNeeded),
     *       currentPlayers: 1,
     *       voiceChat: formData.voiceChat,
     *       schedule: formData.schedule,
     *       requirements: formData.requirements,
     *       contactInfo: formData.contactInfo,
     *       status: 'open',
     *     },
     *   }),
     * });
     */

    // Mock: prepend to the list
    const newPost = {
      _id:        `lfg-new-${Date.now()}`,
      title:      formData.title,
      content:    formData.content,
      voteScore:  0,
      author:     { username: user?.username ?? 'you' },
      hub:        { name: formData.hubSlug.charAt(0).toUpperCase() + formData.hubSlug.slice(1), slug: formData.hubSlug },
      createdAt:  new Date().toISOString(),
      lfgDetails: {
        platform:      formData.platform,
        region:        formData.region,
        skillLevel:    formData.skillLevel,
        gameMode:      formData.gameMode,
        playersNeeded: parseInt(formData.playersNeeded, 10),
        currentPlayers: 1,
        voiceChat:     formData.voiceChat,
        schedule:      formData.schedule,
        requirements:  formData.requirements,
        contactInfo:   formData.contactInfo,
        status:        'open',
      },
    };

    setLfgList((prev) => [newPost, ...prev]);
    setFormData(initialForm);
    setSuccessMsg('✅ LFG post created! Other players can now find you.');
    setShowForm(false);
    setSubmitting(false);

    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="container">
      {/* ---- Page header ---- */}
      <div className="lfg-header">
        <div>
          <h1 className="lfg-header__title">👥 Looking for Group</h1>
          <p className="lfg-header__subtitle">Find teammates across all GamerHub communities.</p>
        </div>
        {isLoggedIn ? (
          <button className="btn btn-primary" onClick={() => setShowForm((p) => !p)}>
            {showForm ? '✕ Cancel' : '+ Post LFG'}
          </button>
        ) : (
          <Link to="/login" className="btn btn-primary">Log in to Post LFG</Link>
        )}
      </div>

      {/* ---- Success message ---- */}
      {successMsg && (
        <div className="alert alert-success" role="status">{successMsg}</div>
      )}

      {/* ---- Create LFG Form ---- */}
      {showForm && isLoggedIn && (
        <section className="lfg-form-section card" aria-label="Create LFG post form">
          <h2 className="lfg-form-section__title">Create LFG Post</h2>
          <form onSubmit={handleFormSubmit} noValidate>
            <div className="lfg-form__grid">

              {/* Title */}
              <div className="form-group lfg-form__full">
                <label className="form-label" htmlFor="lfg-title">Post Title *</label>
                <input id="lfg-title" type="text" name="title" className={`form-input ${formErrors.title ? 'error' : ''}`} placeholder="e.g. [Valorant] Diamond 5-stack EU" value={formData.title} onChange={handleFormChange} maxLength={300} aria-required="true" />
                {formErrors.title && <span className="field-error" role="alert">{formErrors.title}</span>}
              </div>

              {/* Description */}
              <div className="form-group lfg-form__full">
                <label className="form-label" htmlFor="lfg-content">Description *</label>
                <textarea id="lfg-content" name="content" className={`form-textarea ${formErrors.content ? 'error' : ''}`} rows={3} placeholder="Describe what you are looking for..." value={formData.content} onChange={handleFormChange} aria-required="true" />
                {formErrors.content && <span className="field-error" role="alert">{formErrors.content}</span>}
              </div>

              {/* Hub */}
              <div className="form-group">
                <label className="form-label" htmlFor="lfg-hub">Hub / Game</label>
                <select id="lfg-hub" name="hubSlug" className="form-select" value={formData.hubSlug} onChange={handleFormChange}>
                  <option value="valorant">Valorant</option>
                  <option value="minecraft">Minecraft</option>
                  <option value="csgo2">CS2</option>
                  <option value="elden-ring">Elden Ring</option>
                  <option value="fifa25">FIFA 25</option>
                </select>
              </div>

              {/* Platform */}
              <div className="form-group">
                <label className="form-label" htmlFor="lfg-platform">Platform</label>
                <select id="lfg-platform" name="platform" className="form-select" value={formData.platform} onChange={handleFormChange}>
                  {PLATFORMS.filter((p) => p !== 'All').map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Region */}
              <div className="form-group">
                <label className="form-label" htmlFor="lfg-region">Region</label>
                <select id="lfg-region" name="region" className="form-select" value={formData.region} onChange={handleFormChange}>
                  {REGIONS.filter((r) => r !== 'All').map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Skill Level */}
              <div className="form-group">
                <label className="form-label" htmlFor="lfg-skill">Skill Level</label>
                <select id="lfg-skill" name="skillLevel" className="form-select" value={formData.skillLevel} onChange={handleFormChange}>
                  {SKILL_LEVELS.filter((s) => s !== 'All').map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Players Needed */}
              <div className="form-group">
                <label className="form-label" htmlFor="lfg-players">Players Needed *</label>
                <input id="lfg-players" type="number" name="playersNeeded" className={`form-input ${formErrors.playersNeeded ? 'error' : ''}`} min={1} max={100} value={formData.playersNeeded} onChange={handleFormChange} aria-required="true" />
                {formErrors.playersNeeded && <span className="field-error" role="alert">{formErrors.playersNeeded}</span>}
              </div>

              {/* Game Mode */}
              <div className="form-group">
                <label className="form-label" htmlFor="lfg-mode">Game Mode</label>
                <input id="lfg-mode" type="text" name="gameMode" className="form-input" placeholder="e.g. Ranked, Casual, Co-op" value={formData.gameMode} onChange={handleFormChange} maxLength={100} />
              </div>

              {/* Schedule */}
              <div className="form-group">
                <label className="form-label" htmlFor="lfg-schedule">Schedule</label>
                <input id="lfg-schedule" type="text" name="schedule" className="form-input" placeholder="e.g. Weekday evenings GMT" value={formData.schedule} onChange={handleFormChange} maxLength={200} />
              </div>

              {/* Contact */}
              <div className="form-group">
                <label className="form-label" htmlFor="lfg-contact">Contact Info *</label>
                <input id="lfg-contact" type="text" name="contactInfo" className={`form-input ${formErrors.contactInfo ? 'error' : ''}`} placeholder="e.g. Discord: User#1234" value={formData.contactInfo} onChange={handleFormChange} maxLength={200} aria-required="true" />
                {formErrors.contactInfo && <span className="field-error" role="alert">{formErrors.contactInfo}</span>}
              </div>

              {/* Requirements */}
              <div className="form-group lfg-form__full">
                <label className="form-label" htmlFor="lfg-requirements">Requirements</label>
                <input id="lfg-requirements" type="text" name="requirements" className="form-input" placeholder="e.g. Must have mic, Gold+ rank" value={formData.requirements} onChange={handleFormChange} maxLength={500} />
              </div>

              {/* Voice chat checkbox */}
              <div className="form-group lfg-form__full">
                <label className="lfg-form__checkbox">
                  <input type="checkbox" name="voiceChat" checked={formData.voiceChat} onChange={handleFormChange} />
                  Voice chat required
                </label>
              </div>
            </div>

            <div className="lfg-form__actions">
              <button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>
                {submitting ? 'Posting…' : '📢 Post LFG'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {/* ---- Filters ---- */}
      <section className="lfg-filters card" aria-label="Filter LFG posts">
        <h2 className="lfg-filters__title">🔍 Filter</h2>
        <div className="lfg-filters__grid">
          <div className="form-group">
            <label className="form-label" htmlFor="filter-platform">Platform</label>
            <select id="filter-platform" className="form-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="filter-region">Region</label>
            <select id="filter-region" className="form-select" value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="filter-skill">Skill Level</label>
            <select id="filter-skill" className="form-select" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>
              {SKILL_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="filter-status">Status</label>
            <select id="filter-status" className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <p className="lfg-filters__count" aria-live="polite">
          Showing <strong>{filteredList.length}</strong> of <strong>{lfgList.length}</strong> listings
        </p>
      </section>

      {/* ---- LFG listings ---- */}
      <section className="lfg-list" aria-label="LFG listings">
        {filteredList.length === 0 ? (
          <div className="empty-state">
            <h3>No LFG posts match your filters</h3>
            <p>Try adjusting the filters above, or be the first to post!</p>
          </div>
        ) : (
          filteredList.map((post) => <LFGCard key={post._id} post={post} />)
        )}
      </section>
    </div>
  );
}

export default LFGPage;
