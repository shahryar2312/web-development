/**
 * UserProfilePage.jsx — View 7: User Profile (Screen 4 from proposal wireframes)
 *
 * Proposal spec (§4.2 Screen 4):
 *   "Header with avatar, username, join date. Bio below.
 *    Tabs for Posts, Comments, Saved.
 *    Edit button shown only on own profile. Mobile: stacked."
 *
 * Public view  — shows bio, post/comment history, joined hubs
 * Private view — shows edit profile form (only when viewing own profile)
 *
 * Maps to backend endpoints:
 *   Profile data    — GET /api/users/:username
 *   User posts      — GET /api/users/:username/posts
 *   User comments   — GET /api/users/:username/comments
 *   Edit profile    — PUT /api/users/me  { bio, favoriteGames }
 *   Avatar upload   — PUT /api/users/me/avatar  (multipart/form-data, field: avatar)
 *   Saved posts     — GET /api/users/me/saved  (own profile only)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { api } from '../services/api';
import './UserProfilePage.css';

/* ------------------------------------------------------------------ */
/* EditProfileForm sub-component                                         */
/* ------------------------------------------------------------------ */

/**
 * EditProfileForm — Inline form shown when the user edits their own profile.
 * Avatar is handled separately (its own "Update Avatar" button) to avoid
 * FormData/array serialisation issues with favoriteGames.
 * Maps to: PUT /api/users/me  { bio, favoriteGames }
 *          PUT /api/users/me/avatar  (multipart/form-data, field: avatar)
 *
 * Validation:
 *   bio           — max 500 characters
 *   favoriteGames — max 5 entries, each max 50 characters
 */
function EditProfileForm({ profileUser, onSave, onCancel }) {
  const { refreshUser } = useAuth();

  const [bio,        setBio]        = useState(profileUser.bio || '');
  const [gamesInput, setGamesInput] = useState((profileUser.favoriteGames || []).join(', '));
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [avatarTab,     setAvatarTab]     = useState('file');
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [avatarUrl,     setAvatarUrl]     = useState('');
  const [avatarSaving,  setAvatarSaving]  = useState(false);
  const [avatarError,   setAvatarError]   = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');

  /**
   * validate — Client-side checks for the edit profile form.
   * Rules mirror the User model in backend/src/models/User.js.
   */
  const validate = () => {
    const errs = {};

    if (bio.length > 500) {
      errs.bio = 'Bio cannot exceed 500 characters.';
    }

    const games = gamesInput.split(',').map((g) => g.trim()).filter(Boolean);
    if (games.length > 5) {
      errs.games = 'You can list a maximum of 5 favourite games.';
    }
    const tooLong = games.find((g) => g.length > 50);
    if (tooLong) {
      errs.games = `Game name "${tooLong}" exceeds 50 characters.`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /**
   * handleSave — Submits the profile update (bio + favoriteGames).
   * Maps to: PUT /api/users/me  { bio, favoriteGames }
   */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors({});
    try {
      const games = gamesInput.split(',').map((g) => g.trim()).filter(Boolean);
      await api.put('/api/users/me', { bio: bio.trim(), favoriteGames: games });
      await refreshUser();
      setSuccessMsg('Profile updated!');
      onSave();
    } catch (err) {
      setErrors((p) => ({ ...p, _submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  /**
   * handleAvatarUpdate — Uploads a new avatar.
   * File upload: PUT /api/users/me/avatar  (multipart/form-data, field: avatar)
   * URL update:  PUT /api/users/me         { avatar: url }
   * Kept as a separate action so favoriteGames array serialises cleanly via JSON.
   */
  // 03.05 Ilia Klodin: kept separate from bio/games update because favoriteGames array doesnt serialize cleanly in FormData
  const handleAvatarUpdate = async () => {
    setAvatarError('');
    setAvatarSuccess('');

    if (avatarTab === 'file' && !avatarFile) {
      setAvatarError('Please select an image file.');
      return;
    }
    if (avatarTab === 'url' && !avatarUrl.trim()) {
      setAvatarError('Please enter a URL.');
      return;
    }

    setAvatarSaving(true);
    try {
      if (avatarTab === 'file') {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        await api.put('/api/users/me/avatar', fd);
      } else {
        await api.put('/api/users/me', { avatar: avatarUrl.trim() });
      }
      await refreshUser();
      setAvatarSuccess('Avatar updated!');
      onSave();
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <form className="edit-profile-form card" onSubmit={handleSave} noValidate aria-label="Edit profile form">
      <h3 className="edit-profile-form__title">Edit Profile</h3>

      {/* Avatar — separate action to avoid FormData/array serialisation issues */}
      <div className="form-group">
        <label className="form-label">Avatar</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button type="button" className={`btn btn-sm ${avatarTab === 'file' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAvatarTab('file')}>Upload File</button>
          <button type="button" className={`btn btn-sm ${avatarTab === 'url'  ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAvatarTab('url')}>Enter URL</button>
        </div>
        {avatarTab === 'file' ? (
          <input type="file" className="form-input" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0] || null)} />
        ) : (
          <input type="url" className="form-input" placeholder="https://example.com/avatar.jpg" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        )}
        {avatarError   && <p className="field-error">{avatarError}</p>}
        {avatarSuccess && <p style={{ color: 'var(--color-success)', fontSize: 'var(--fs-sm)', marginTop: '0.25rem' }}>{avatarSuccess}</p>}
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={handleAvatarUpdate} disabled={avatarSaving}>
          {avatarSaving ? 'Updating…' : 'Update Avatar'}
        </button>
      </div>

      {/* Bio */}
      <div className="form-group">
        <label className="form-label" htmlFor="ep-bio">
          Bio
          <span style={{ float: 'right', fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)' }}>
            {bio.length} / 500
          </span>
        </label>
        <textarea
          id="ep-bio"
          className={`form-textarea ${errors.bio ? 'error' : ''}`}
          rows={4}
          maxLength={500}
          placeholder="Tell the community about yourself..."
          value={bio}
          onChange={(e) => { setBio(e.target.value); setErrors((p) => ({ ...p, bio: '' })); }}
          aria-describedby={errors.bio ? 'ep-bio-error' : undefined}
        />
        {errors.bio && <span id="ep-bio-error" className="field-error" role="alert">{errors.bio}</span>}
      </div>

      {/* Favourite Games */}
      <div className="form-group">
        <label className="form-label" htmlFor="ep-games">Favourite Games</label>
        <input
          id="ep-games"
          type="text"
          className={`form-input ${errors.games ? 'error' : ''}`}
          placeholder="e.g. Valorant, Elden Ring, Minecraft  (comma-separated, max 5)"
          value={gamesInput}
          onChange={(e) => { setGamesInput(e.target.value); setErrors((p) => ({ ...p, games: '' })); }}
          aria-describedby={errors.games ? 'ep-games-error' : 'ep-games-hint'}
        />
        <span id="ep-games-hint" className="field-hint">Separate with commas. Max 5 games.</span>
        {errors.games && <span id="ep-games-error" className="field-error" role="alert">{errors.games}</span>}
      </div>

      {errors._submit && <div className="alert alert-error">{errors._submit}</div>}
      {successMsg    && <div className="alert alert-success" role="status">{successMsg}</div>}

      <div className="edit-profile-form__actions">
        <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */

function UserProfilePage() {
  const { username }           = useParams();
  const { user: loggedInUser, refreshUser, isLoggedIn } = useAuth();
  const { showModal }          = useModal();

  const [profileUser,  setProfileUser]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Active tab: 'posts' | 'comments' | 'saved'
  const [activeTab,    setActiveTab]    = useState('posts');

  // Edit mode — only available on own profile
  const [editMode,     setEditMode]     = useState(false);
  
  // Follow loading state
  const [followLoading, setFollowLoading] = useState(false);

  /* ---- Posts tab ---- */
  const [posts,        setPosts]        = useState([]);
  const [postsTotal,   setPostsTotal]   = useState(0);
  const [postsPage,    setPostsPage]    = useState(1);
  const [postsMore,    setPostsMore]    = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);

  /* ---- Comments tab ---- */
  const [comments,        setComments]        = useState([]);
  const [commentsTotal,   setCommentsTotal]   = useState(0);
  const [commentsPage,    setCommentsPage]    = useState(1);
  const [commentsMore,    setCommentsMore]    = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  /* ---- Saved tab (own profile only) ---- */
  const [savedPosts,   setSavedPosts]   = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError,   setSavedError]   = useState('');

  // Whether the logged-in user is viewing their own profile
  const isOwnProfile = loggedInUser?.username === username;

  /**
   * fetchProfile — Loads profile data, posts, and comments in parallel.
   * Page counters are reset to 1 whenever the username param changes.
   * Maps to:
   *   GET /api/users/:username
   *   GET /api/users/:username/posts?page=1
   *   GET /api/users/:username/comments?page=1
   */
  // 03.05 Ilia Klodin: parallel loading of profile data, posts, and comments for better user experince
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    setPostsPage(1);
    setCommentsPage(1);
    try {
      const [profileData, postsData, commentsData] = await Promise.all([
        api.get(`/api/users/${username}`),
        api.get(`/api/users/${username}/posts?page=1`),
        api.get(`/api/users/${username}/comments?page=1`),
      ]);
      setProfileUser(profileData.user);
      setPosts(postsData.posts || []);
      // 03.05 Ilia Klodin: user model has no postCount field, for now using total from pagination, might change later
      setPostsTotal(postsData._meta?.total ?? 0);
      setPostsMore(1 < (postsData._meta?.pages ?? 1));
      setComments(commentsData.comments || []);
      setCommentsTotal(commentsData._meta?.total ?? 0);
      setCommentsMore(1 < (commentsData._meta?.pages ?? 1));
    } catch (err) {
      setError(err.status === 404 ? 'User not found.' : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ---- Fetch saved posts when switching to saved tab (own profile only) ---- */
  // 03.05 Ilia Klodin: saved tab is only visible to profile owner so no point fetching for visitors
  useEffect(() => {
    if (activeTab !== 'saved' || !isOwnProfile) return;
    setSavedLoading(true);
    setSavedError('');
    api.get('/api/users/me/saved')
      .then((data) => setSavedPosts(data.posts || []))
      .catch((err) => setSavedError(err.message || 'Failed to load saved posts.'))
      .finally(() => setSavedLoading(false));
  }, [activeTab, isOwnProfile]);

  /* ---- Load more posts ---- */
  const handleLoadMorePosts = async () => {
    const next = postsPage + 1;
    setPostsPage(next);
    setPostsLoading(true);
    try {
      const data = await api.get(`/api/users/${username}/posts?page=${next}`);
      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setPostsMore(next < (data._meta?.pages ?? 1));
    } catch (err) {
      console.error(err);
    } finally {
      setPostsLoading(false);
    }
  };

  /* ---- Load more comments ---- */
  const handleLoadMoreComments = async () => {
    const next = commentsPage + 1;
    setCommentsPage(next);
    setCommentsLoading(true);
    try {
      const data = await api.get(`/api/users/${username}/comments?page=${next}`);
      setComments((prev) => [...prev, ...(data.comments || [])]);
      setCommentsMore(next < (data._meta?.pages ?? 1));
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading(false);
    }
  };

  /**
   * handleEditSave — Called after EditProfileForm saves successfully.
   * Re-fetches profile so header stats and bio refresh.
   */
  const handleEditSave = async () => {
    setEditMode(false);
    await fetchProfile();
  };

  /**
   * handleLeaveHub — Leaves a hub and refreshes profile.
   */
  const handleLeaveHub = (e, hubId, hubName) => {
    e.preventDefault();
    e.stopPropagation();
    showModal({
      title: 'Leave Hub',
      message: `Are you sure you want to leave h/${hubName}?`,
      type: 'error',
      confirmText: 'Leave',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/api/hubs/${hubId}/join`);
          await fetchProfile();
          await refreshUser();
        } catch (err) {
          showModal({ title: 'Error', message: err.message, type: 'error' });
        }
      }
    });
  };

  /**
   * handleFollowToggle — Follows or unfollows the profile user.
   */
  const handleFollowToggle = async () => {
    if (!isLoggedIn) {
      showModal({ title: 'Authentication Required', message: 'Log in to follow users.', type: 'error' });
      return;
    }
    setFollowLoading(true);
    try {
      if (profileUser.isFollowing) {
        await api.delete(`/api/users/${username}/follow`);
        setProfileUser(prev => ({
          ...prev,
          isFollowing: false,
          followersCount: Math.max(0, prev.followersCount - 1)
        }));
      } else {
        await api.post(`/api/users/${username}/follow`);
        setProfileUser(prev => ({
          ...prev,
          isFollowing: true,
          followersCount: prev.followersCount + 1
        }));
      }
    } catch (err) {
      showModal({ title: 'Error', message: err.message || 'Failed to update follow status.', type: 'error' });
    } finally {
      setFollowLoading(false);
    }
  };

  /**
   * formatJoinDate — Converts ISO date to a readable join date string.
   */
  const formatJoinDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' });

  const formatRelative = (iso) => {
    const delta = (Date.now() - new Date(iso).getTime()) / 1000;
    if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  /* ---- Loading / error states ---- */
  if (loading) return <div className="container empty-state" style={{ marginTop: '4rem' }}><p>Loading profile…</p></div>;
  if (error)   return (
    <div className="container empty-state" style={{ marginTop: '4rem' }}>
      <h2>{error}</h2>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</Link>
    </div>
  );
  if (!profileUser) return null;

  /* Tab content map */
  const TAB_CONTENT = {
    posts: (
      <div className="profile-posts">
        {posts.length === 0 ? (
          <div className="empty-state"><h3>No posts yet</h3></div>
        ) : (
          <>
            {posts.map((post) => (
              <div key={post._id} className="profile-post-card card">
                <div className="profile-post-card__meta">
                  <Link to={`/hub/${post.hub?.slug}`} className="profile-post-card__hub">
                    h/{post.hub?.name}
                  </Link>
                  <span>•</span>
                  <time>{formatRelative(post.createdAt)}</time>
                </div>
                <Link to={`/post/${post._id}`} className="profile-post-card__title">
                  {post.title}
                </Link>
                <div className="profile-post-card__stats">
                  <span>▲ {post.voteScore?.toLocaleString() ?? 0} votes</span>
                  <span>💬 {post.commentCount ?? 0} comments</span>
                </div>
              </div>
            ))}
            {postsMore && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-secondary" onClick={handleLoadMorePosts} disabled={postsLoading}>
                  {postsLoading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    ),

    comments: (
      <div className="profile-posts">
        {comments.length === 0 ? (
          <div className="empty-state"><h3>No comments yet</h3></div>
        ) : (
          <>
            {comments.map((comment) => (
              <div key={comment._id} className="profile-post-card card">
                <div className="profile-post-card__meta">
                  {comment.post && (
                    <>
                      <Link to={`/post/${comment.post._id ?? comment.post}`} className="profile-post-card__hub">
                        {comment.post.title ?? 'View post'}
                      </Link>
                      <span>•</span>
                    </>
                  )}
                  <time>{formatRelative(comment.createdAt)}</time>
                </div>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text)', margin: '0.25rem 0 0' }}>
                  {comment.content?.length > 200 ? `${comment.content.slice(0, 200)}…` : comment.content}
                </p>
              </div>
            ))}
            {commentsMore && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-secondary" onClick={handleLoadMoreComments} disabled={commentsLoading}>
                  {commentsLoading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    ),

    saved: (
      <div className="profile-posts">
        {savedLoading ? (
          <div className="empty-state"><p>Loading saved posts…</p></div>
        ) : savedError ? (
          <div className="alert alert-error">{savedError}</div>
        ) : savedPosts.length === 0 ? (
          <div className="empty-state">
            <h3>No saved posts yet</h3>
            <p>Posts you save will appear here. Only you can see this tab.</p>
          </div>
        ) : (
          savedPosts.map((post) => (
            <div key={post._id} className="profile-post-card card">
              <div className="profile-post-card__meta">
                <Link to={`/hub/${post.hub?.slug}`} className="profile-post-card__hub">
                  h/{post.hub?.name}
                </Link>
                <span>•</span>
                <span>u/{post.author?.username}</span>
                <span>•</span>
                <time>{formatRelative(post.createdAt)}</time>
              </div>
              <Link to={`/post/${post._id}`} className="profile-post-card__title">
                {post.title}
              </Link>
              <div className="profile-post-card__stats">
                <span>▲ {post.voteScore?.toLocaleString() ?? 0} votes</span>
                <span>💬 {post.commentCount ?? 0} comments</span>
              </div>
            </div>
          ))
        )}
      </div>
    ),
  };

  return (
    <div className="container">

      {/* ---- Profile header card ---- */}
      <section className="profile-header card" aria-label={`${profileUser.username}'s profile`}>

        {/* Avatar */}
        <div className="profile-header__avatar" aria-label={`Avatar for ${profileUser.username}`}>
          {profileUser.avatar
            ? <img src={profileUser.avatar} alt={`${profileUser.username} avatar`} />
            : <span>{profileUser.username.charAt(0).toUpperCase()}</span>
          }
        </div>

        {/* Info */}
        <div className="profile-header__info">
          <div className="profile-header__name-row">
            <h1 className="profile-header__username">u/{profileUser.username}</h1>
            {profileUser.role === 'admin'     && <span className="badge badge-danger">Admin</span>}
            {profileUser.role === 'moderator' && <span className="badge badge-warning">Mod</span>}
            {profileUser.isBanned             && <span className="badge badge-danger">Banned</span>}
          </div>

          <div className="profile-header__stats">
            <div className="profile-stat">
              <strong>{postsTotal.toLocaleString()}</strong>
              <span>Posts</span>
            </div>
            <div className="profile-stat">
              <strong>{commentsTotal.toLocaleString()}</strong>
              <span>Comments</span>
            </div>
            <div className="profile-stat">
              <strong>{profileUser.followersCount?.toLocaleString() || 0}</strong>
              <span>Followers</span>
            </div>
            <div className="profile-stat">
              <strong>{profileUser.followingCount?.toLocaleString() || 0}</strong>
              <span>Following</span>
            </div>
          </div>

          <p className="profile-header__joined">
            📅 Joined {formatJoinDate(profileUser.createdAt)}
          </p>

          {profileUser.bio && (
            <p className="profile-header__bio">{profileUser.bio}</p>
          )}

          {/* Favourite games */}
          {profileUser.favoriteGames?.length > 0 && (
            <div className="profile-header__games">
              <span className="profile-header__games-label">🎮 Favourite games:</span>
              {profileUser.favoriteGames.map((game) => (
                <span key={game} className="badge badge-primary">{game}</span>
              ))}
            </div>
          )}

          {/* Joined hubs */}
          {profileUser.joinedHubs?.length > 0 && (
            <div className="profile-header__hubs">
              <span className="profile-header__games-label">Communities:</span>
              {profileUser.joinedHubs.map((hub) => (
                <div key={hub._id ?? hub} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Link
                    to={`/hub/${hub.slug}`}
                    className="badge badge-info"
                  >
                    h/{hub.name}
                  </Link>
                  {isOwnProfile && (
                    <button 
                      className="badge badge-danger" 
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={(e) => handleLeaveHub(e, hub._id, hub.name)}
                      aria-label={`Leave ${hub.name}`}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit button — only shown on own profile */}
        {isOwnProfile && !editMode && (
          <button
            className="btn btn-secondary profile-header__edit"
            onClick={() => setEditMode(true)}
            aria-label="Edit your profile"
          >
            ✏️ Edit Profile
          </button>
        )}

        {/* Follow button — only shown on other profiles */}
        {!isOwnProfile && isLoggedIn && (
          <button
            className={`btn ${profileUser.isFollowing ? 'btn-secondary' : 'btn-primary'} profile-header__edit`}
            onClick={handleFollowToggle}
            disabled={followLoading}
            aria-label={profileUser.isFollowing ? `Unfollow ${profileUser.username}` : `Follow ${profileUser.username}`}
            style={{ minWidth: '120px' }}
          >
            {followLoading ? '…' : profileUser.isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </section>

      {/* ---- Edit profile form (own profile only) ---- */}
      {isOwnProfile && editMode && (
        <EditProfileForm
          profileUser={profileUser}
          onSave={handleEditSave}
          onCancel={() => setEditMode(false)}
        />
      )}

      {/* 29.04 Ilia Klodin - fixed major privacy issue where Saved tab was visible for other users - critical user experience and privacy failure */}
      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        {(['posts', 'comments', ...(isOwnProfile ? ['saved'] : [])]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ---- Tab content ---- */}
      <div className="profile-tab-content" role="tabpanel">
        {TAB_CONTENT[activeTab]}
      </div>

    </div>
  );
}

export default UserProfilePage;
