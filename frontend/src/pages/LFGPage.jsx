/**
 * LFGPage.jsx — View 5: Looking for Group listings
 *
 * Displays a searchable, filterable list of LFG posts from across all hubs.
 * Filters: platform, region, skill level, status (open/closed).
 * Includes a "Create LFG Post" form (with full client-side validation).
 *
 * Maps to backend endpoints:
 *   LFG feed   — GET  /api/lfg?platform=<p>&region=<r>&skillLevel=<s>&status=open&page=1
 *   Create LFG — POST /api/hubs/:hubId/posts  { type: 'lfg', title, content, lfgDetails: {...} }
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './LFGPage.css';

const PLATFORMS    = ['All', 'PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Cross-platform'];
const REGIONS      = ['All', 'NA', 'EU', 'Asia', 'OCE', 'SA', 'Global'];
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

  const d = post.lfgDetails || {};
  const spotsLeft = (d.playersNeeded ?? 0) - (d.currentPlayers ?? 0);

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
          {post.hub && (
            <>
              <Link to={`/hub/${post.hub.slug}`} className="lfg-card__hub">h/{post.hub.name}</Link>
              <span>•</span>
            </>
          )}
          <span>u/{post.author?.username}</span>
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
      {d.schedule     && <p className="lfg-card__extra">🕐 <strong>Schedule:</strong> {d.schedule}</p>}
      {d.requirements && <p className="lfg-card__extra">📋 <strong>Requirements:</strong> {d.requirements}</p>}
      {d.contactInfo  && <p className="lfg-card__extra">📩 <strong>Contact:</strong> {d.contactInfo}</p>}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */

const initialForm = {
  title: '', content: '', platform: 'PC', region: 'EU', skillLevel: 'Any',
  gameMode: '', playersNeeded: '2', voiceChat: false, schedule: '',
  requirements: '', contactInfo: '', hubId: '',
};

function LFGPage() {
  const { isLoggedIn, user } = useAuth();

  /* ---- Filter state ---- */
  const [platform,     setPlatform]     = useState('All');
  const [region,       setRegion]       = useState('All');
  const [skillLevel,   setSkillLevel]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'closed' | 'all'

  /* ---- Feed state ---- */
  const [lfgList,     setLfgList]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState('');
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [total,       setTotal]       = useState(0);

  /* ---- Hubs for form selector ---- */
  const [hubs, setHubs] = useState([]);

  /* ---- Create LFG form visibility ---- */
  const [showForm,   setShowForm]   = useState(false);

  /* ---- Create LFG form state ---- */
  const [formData,   setFormData]   = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /* ---- Load hubs on mount for form selector ---- */
  // 03.05 Ilia Klodin: needed to populate hub dropdown in the create form
  useEffect(() => {
    api.get('/api/hubs?sort=name')
      .then((data) => {
        const list = data.hubs || [];
        setHubs(list);
        if (list.length > 0) {
          setFormData((prev) => ({ ...prev, hubId: list[0]._id }));
        }
      })
      .catch(console.error);
  }, []);

  /**
   * buildParams — Builds URLSearchParams from current filter state.
   * STATUS TRICK: for "all statuses" send ?status= (empty string) so the
   * backend skips its default 'open'-only filter. If statusFilter === 'all'
   * we set the param to '' which is falsy on the backend side.
   */
  // 03.05 Ilia Klodin: useCallback needed so the filter useEffect can depend on it without causing infinite re-renders
  const buildParams = useCallback((pageNum) => {
    const params = new URLSearchParams({ page: pageNum });
    if (platform   !== 'All') params.set('platform',   platform);
    if (region     !== 'All') params.set('region',     region);
    if (skillLevel !== 'All') params.set('skillLevel', skillLevel);
    // 03.05 Ilia Klodin: sending empty string bypasses backend's default 'open' filter, undefined would trigger the default, 'all' would return no results
    // empty string bypasses the backend 'open' default, returning all statuses
    params.set('status', statusFilter === 'all' ? '' : statusFilter);
    return params;
  }, [platform, region, skillLevel, statusFilter]);

  /* ---- Re-fetch from page 1 when filters change ---- */
  // 03.05 Ilia Klodin: re-fetches from page 1 whenever filters change
  useEffect(() => {
    setPage(1);
    setHasMore(false);
    setLoading(true);
    setError('');

    api.get(`/api/lfg?${buildParams(1)}`)
      .then((data) => {
        setLfgList(data.posts || []);
        const meta = data._meta;
        setTotal(meta?.total ?? 0);
        setHasMore(1 < (meta?.pages ?? 1));
      })
      .catch(() => setError('Failed to load LFG posts. Please try again.'))
      .finally(() => setLoading(false));
  }, [buildParams]);

  /* ---- Load more (append to list) ---- */
  // 03.05 Ilia Klodin: appends results rather than replacing, keeps scroll position
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);

    api.get(`/api/lfg?${buildParams(nextPage)}`)
      .then((data) => {
        setLfgList((prev) => [...prev, ...(data.posts || [])]);
        const meta = data._meta;
        setHasMore(nextPage < (meta?.pages ?? 1));
      })
      .catch(() => setError('Failed to load more posts.'))
      .finally(() => setLoadingMore(false));
  };

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

    if (!formData.hubId) {
      errs.hubId = 'Please select a hub.';
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

    try {
      const data = await api.post(`/api/hubs/${formData.hubId}/posts`, {
        type: 'lfg',
        title: formData.title,
        content: formData.content,
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
      });

      const selectedHub = hubs.find((h) => h._id === formData.hubId);
      const newPost = {
        ...data.post,
        hub: selectedHub ? { name: selectedHub.name, slug: selectedHub.slug } : data.post?.hub,
      };

      setLfgList((prev) => [newPost, ...prev]);
      setTotal((prev) => prev + 1);
      setFormData({ ...initialForm, hubId: formData.hubId });
      setSuccessMsg('✅ LFG post created! Other players can now find you.');
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setFormErrors((prev) => ({ ...prev, _submit: err.message }));
    } finally {
      setSubmitting(false);
    }
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
          {formErrors._submit && <div className="alert alert-error">{formErrors._submit}</div>}
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
                <label className="form-label" htmlFor="lfg-hub">Hub / Game *</label>
                <select id="lfg-hub" name="hubId" className={`form-select ${formErrors.hubId ? 'error' : ''}`} value={formData.hubId} onChange={handleFormChange}>
                  {hubs.length === 0 && <option value="">Loading hubs…</option>}
                  {hubs.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
                {formErrors.hubId && <span className="field-error" role="alert">{formErrors.hubId}</span>}
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
          Showing <strong>{lfgList.length}</strong>{total > 0 && ` of ${total}`} listings
        </p>
      </section>

      {/* ---- LFG listings ---- */}
      <section className="lfg-list" aria-label="LFG listings">
        {loading ? (
          <div className="empty-state"><p>Loading LFG posts…</p></div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : lfgList.length === 0 ? (
          <div className="empty-state">
            <h3>No LFG posts match your filters</h3>
            <p>Try adjusting the filters above, or be the first to post!</p>
          </div>
        ) : (
          <>
            {lfgList.map((post) => <LFGCard key={post._id} post={post} />)}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default LFGPage;
