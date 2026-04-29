/**
 * UserProfilePage.jsx — View 7: User Profile (Screen 4 from proposal wireframes)
 *
 * Proposal spec (§4.2 Screen 4):
 *   "Header with avatar, username, join date, karma. Bio below.
 *    Tabs for Posts, Comments, Saved, Activity.
 *    Edit button shown only on own profile. Mobile: stacked."
 *
 * Public view  — shows bio, karma, post history, joined hubs
 * Private view — shows edit profile form (only when viewing own profile)
 *
 * Maps to backend endpoints:
 *   Profile data — GET  /api/users/:username
 *   User posts   — GET  /api/users/:username/posts
 *   Edit profile — PUT  /api/users/:userId  { bio, avatar, favoriteGames }
 */
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UserProfilePage.css';

/* ------------------------------------------------------------------ */
/* Mock Data — mirrors the User model in backend/src/models/User.js    */
/* ------------------------------------------------------------------ */

const MOCK_USERS = {
  admin: {
    _id:        'mock-admin-id-001',
    username:   'admin',
    email:      'admin@gamerhub.com',
    bio:        'Platform Administrator. Keeping the peace on GamerHub.',
    avatar:     '',
    role:       'admin',
    karma:      99999,
    joinedHubs: ['Valorant', 'Minecraft'],
    favoriteGames: ['Valorant', 'Minecraft'],
    createdAt:  new Date('2023-01-01').toISOString(),
    postCount:  10,
    commentCount: 50,
  },
  tarnished_one: {
    _id:        'u1',
    username:   'tarnished_one',
    email:      'tarnished@example.com',
    bio:        'Platinum hunter. Elden Ring veteran. 87 Malenia attempts and counting. I review FromSoftware games in my spare time.',
    avatar:     '',
    role:       'user',
    karma:      9842,
    joinedHubs: ['Elden Ring', 'Valorant'],
    favoriteGames: ['Elden Ring', 'Dark Souls III', 'Sekiro'],
    createdAt:  new Date('2024-01-15').toISOString(),
    postCount:  48,
    commentCount: 213,
  },
  RadiantCoach: {
    _id:        'u2',
    username:   'RadiantCoach',
    email:      'coach@example.com',
    bio:        'Professional Valorant coach. Radiant rank. Helping players climb since 2021.',
    avatar:     '',
    role:       'user',
    karma:      21400,
    joinedHubs: ['Valorant', 'CSGO2'],
    favoriteGames: ['Valorant', 'CS2'],
    createdAt:  new Date('2023-06-01').toISOString(),
    postCount:  112,
    commentCount: 489,
  },
};

/* Mock post history for each user */
const MOCK_USER_POSTS = {
  tarnished_one: [
    { _id: 'p1', title: 'My first Platinum in Elden Ring after 200 hours — worth every second!', voteScore: 4821, commentCount: 312, hub: { name: 'Elden Ring', slug: 'elden-ring' }, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { _id: 'ep1', title: '[SPOILER] Ending lore breakdown — all 6 endings explained', voteScore: 5210, commentCount: 302, hub: { name: 'Elden Ring', slug: 'elden-ring' }, createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString() },
  ],
  RadiantCoach: [
    { _id: 'vp1', title: 'Immortal 3 → Radiant in 2 weeks — here is my full routine', voteScore: 3402, commentCount: 214, hub: { name: 'Valorant', slug: 'valorant' }, createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
  ],
};

/* ------------------------------------------------------------------ */
/* EditProfileForm sub-component                                         */
/* ------------------------------------------------------------------ */

/**
 * EditProfileForm — Inline form shown when the user edits their own profile.
 * Maps to: PUT /api/users/:userId  { bio, favoriteGames }
 *
 * Validation:
 *   bio — max 500 characters
 *   favoriteGames — max 5 entries, each max 50 characters
 */
function EditProfileForm({ user, onSave, onCancel }) {
  const [bio,           setBio]           = useState(user.bio);
  const [gamesInput,    setGamesInput]    = useState(user.favoriteGames.join(', '));
  const [errors,        setErrors]        = useState({});
  const [saving,        setSaving]        = useState(false);
  const [successMsg,    setSuccessMsg]    = useState('');

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
   * handleSave — Submits the profile update.
   * Maps to: PUT /api/users/:userId  { bio, favoriteGames }
   */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);

    /*
     * --- BACKEND INTEGRATION POINT ---
     * const res = await fetch(`/api/users/${user._id}`, {
     *   method: 'PUT',
     *   headers: { 'Content-Type': 'application/json' },
     *   credentials: 'include',
     *   body: JSON.stringify({
     *     bio: bio.trim(),
     *     favoriteGames: gamesInput.split(',').map((g) => g.trim()).filter(Boolean),
     *   }),
     * });
     * const data = await res.json();
     * if (res.ok) { onSave(data.user); }
     */

    // Mock: call onSave with the updated data
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('Profile updated successfully!');
      onSave({
        ...user,
        bio: bio.trim(),
        favoriteGames: gamesInput.split(',').map((g) => g.trim()).filter(Boolean),
      });
    }, 600);
  };

  return (
    <form className="edit-profile-form card" onSubmit={handleSave} noValidate aria-label="Edit profile form">
      <h3 className="edit-profile-form__title">Edit Profile</h3>

      {successMsg && (
        <div className="alert alert-success" role="status">{successMsg}</div>
      )}

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
  const { user: loggedInUser } = useAuth();

  // Find the mock user by username
  let initialProfile = MOCK_USERS[username];

  // If not in MOCK_USERS but it's the currently logged-in user, use their session data
  if (!initialProfile && loggedInUser?.username === username) {
    initialProfile = {
      _id: loggedInUser._id,
      username: loggedInUser.username,
      email: loggedInUser.email,
      bio: loggedInUser.bio || '',
      avatar: loggedInUser.avatar || '',
      role: loggedInUser.role || 'user',
      karma: 0,
      joinedHubs: loggedInUser.joinedHubs || [],
      favoriteGames: loggedInUser.favoriteGames || [],
      createdAt: new Date().toISOString(),
      postCount: 0,
      commentCount: 0,
    };
  }

  const [profileUser, setProfileUser] = useState(initialProfile ?? null);
  const userPosts = MOCK_USER_POSTS[username] ?? [];

  // Active tab: 'posts' | 'comments' | 'saved' | 'activity'
  const [activeTab, setActiveTab] = useState('posts');

  // Edit mode — only available on own profile
  const [editMode, setEditMode] = useState(false);

  // Whether the logged-in user is viewing their own profile
  const isOwnProfile = loggedInUser?.username === username;

  /* ---- Not found ---- */
  if (!profileUser) {
    return (
      <div className="container empty-state" style={{ marginTop: '4rem' }}>
        <h2>User not found</h2>
        <p>The user <strong>u/{username}</strong> does not exist.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</Link>
      </div>
    );
  }

  /**
   * formatDate — Converts ISO date to a readable join date string.
   */
  const formatJoinDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatRelative = (iso) => {
    const delta = (Date.now() - new Date(iso).getTime()) / 1000;
    if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  /**
   * handleEditSave — Receives updated user data from EditProfileForm.
   */
  const handleEditSave = (updatedUser) => {
    setProfileUser(updatedUser);
    setEditMode(false);
  };

  /* Tab content map */
  const TAB_CONTENT = {
    posts: (
      <div className="profile-posts">
        {userPosts.length === 0 ? (
          <div className="empty-state"><h3>No posts yet</h3></div>
        ) : (
          userPosts.map((post) => (
            <div key={post._id} className="profile-post-card card">
              <div className="profile-post-card__meta">
                <Link to={`/hub/${post.hub.slug}`} className="profile-post-card__hub">
                  h/{post.hub.name}
                </Link>
                <span>•</span>
                <time>{formatRelative(post.createdAt)}</time>
              </div>
              <Link to={`/post/${post._id}`} className="profile-post-card__title">
                {post.title}
              </Link>
              <div className="profile-post-card__stats">
                <span>▲ {post.voteScore.toLocaleString()} votes</span>
                <span>💬 {post.commentCount} comments</span>
              </div>
            </div>
          ))
        )}
      </div>
    ),
    comments: (
      <div className="empty-state">
        <h3>Comment history</h3>
        <p>
          {/*
           * --- BACKEND INTEGRATION POINT ---
           * GET /api/users/:username/comments
           * Fetches paginated comment history for this user.
           */}
          Comment history will load here from <code>GET /api/users/{username}/comments</code>.
        </p>
      </div>
    ),
    saved: (
      <div className="empty-state">
        <h3>Saved posts</h3>
        {isOwnProfile
          ? <p>Your saved posts appear here. Only you can see this tab.</p>
          : <p>This tab is only visible to the profile owner.</p>
        }
      </div>
    ),
    activity: (
      <div className="empty-state">
        <h3>Recent activity</h3>
        <p>
          {/*
           * --- BACKEND INTEGRATION POINT ---
           * GET /api/users/:username/activity
           * Returns a combined feed of posts, comments, and votes.
           */}
          Activity feed will load from <code>GET /api/users/{username}/activity</code>.
        </p>
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
            {profileUser.role === 'admin' && <span className="badge badge-danger">Admin</span>}
          </div>

          <div className="profile-header__stats">
            <div className="profile-stat">
              <strong>{profileUser.karma.toLocaleString()}</strong>
              <span>Karma</span>
            </div>
            <div className="profile-stat">
              <strong>{profileUser.postCount}</strong>
              <span>Posts</span>
            </div>
            <div className="profile-stat">
              <strong>{profileUser.commentCount}</strong>
              <span>Comments</span>
            </div>
          </div>

          <p className="profile-header__joined">
            📅 Joined {formatJoinDate(profileUser.createdAt)}
          </p>

          {profileUser.bio && (
            <p className="profile-header__bio">{profileUser.bio}</p>
          )}

          {/* Favourite games */}
          {profileUser.favoriteGames.length > 0 && (
            <div className="profile-header__games">
              <span className="profile-header__games-label">🎮 Favourite games:</span>
              {profileUser.favoriteGames.map((game) => (
                <span key={game} className="badge badge-primary">{game}</span>
              ))}
            </div>
          )}

          {/* Joined hubs */}
          {profileUser.joinedHubs.length > 0 && (
            <div className="profile-header__hubs">
              <span className="profile-header__games-label">Communities:</span>
              {profileUser.joinedHubs.map((hub) => (
                <Link
                  key={hub}
                  to={`/hub/${hub.toLowerCase().replace(/\s+/g, '-')}`}
                  className="badge badge-info"
                >
                  h/{hub}
                </Link>
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
      </section>

      {/* ---- Edit profile form (own profile only) ---- */}
      {isOwnProfile && editMode && (
        <EditProfileForm
          user={profileUser}
          onSave={handleEditSave}
          onCancel={() => setEditMode(false)}
        />
      )}

      {/* ---- Tabs ---- */}
      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        {['posts', 'comments', 'saved', 'activity'].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {/* Hide "saved" tab from other users */}
            {tab === 'saved' && !isOwnProfile ? null : ''}
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
