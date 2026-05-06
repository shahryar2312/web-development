import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './CreatePostPage.css';

const PLATFORMS    = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Cross-platform'];
const REGIONS      = ['NA', 'EU', 'Asia', 'OCE', 'SA', 'Global'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Any'];

function CreatePostPage() {
  const { slug }             = useParams();
  const { isLoggedIn, user } = useAuth();
  const navigate             = useNavigate();

  const [hub,         setHub]         = useState(null);
  const [hubLoading,  setHubLoading]  = useState(true);
  const [hubError,    setHubError]    = useState('');

  const [postType,    setPostType]    = useState('text');
  const [imageMode,   setImageMode]   = useState('url'); // 'url' | 'file'
  const [imageFile,   setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '', content: '', url: '', tags: '', flair: '',
    platform: 'PC', region: 'EU', skillLevel: 'Any',
    gameMode: '', playersNeeded: '2', voiceChat: false,
    schedule: '', requirements: '', contactInfo: '',
  });
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Redirect guests
  if (!isLoggedIn) {
    return (
      <div className="container empty-state" style={{ marginTop: '4rem' }}>
        <h2>You must be logged in to post.</h2>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
          <Link to="/login"    className="btn btn-primary">Log In</Link>
          <Link to="/register" className="btn btn-secondary">Register</Link>
        </div>
      </div>
    );
  }

  // Fetch hub data to get the _id
  useEffect(() => {
    api.get(`/api/hubs/slug/${slug}`)
      .then((data) => setHub(data.hub))
      .catch(() => setHubError('Hub not found.'))
      .finally(() => setHubLoading(false));
  }, [slug]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, url: '' }));
  };

  const parseTags = (raw) => {
    if (!raw.trim()) return { valid: true, tags: [] };
    const tags = [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))];
    if (tags.length > 5)        return { valid: false, tags, error: 'Maximum 5 tags allowed.' };
    const tooLong = tags.find((t) => t.length > 30);
    if (tooLong)                return { valid: false, tags, error: `Tag "${tooLong}" exceeds 30 characters.` };
    return { valid: true, tags };
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim())             errs.title   = 'Title is required.';
    else if (formData.title.trim().length < 3)  errs.title   = 'Title must be at least 3 characters.';
    else if (formData.title.trim().length > 300) errs.title  = 'Title cannot exceed 300 characters.';

    if ((postType === 'text' || postType === 'lfg') && !formData.content.trim()) errs.content = 'Post body is required.';
    if (formData.content.length > 40000) errs.content = 'Content cannot exceed 40,000 characters.';

    if (postType === 'image') {
      if (imageMode === 'url' && !formData.url.trim()) {
        errs.url = 'Image URL is required.';
      } else if (imageMode === 'url') {
        try { new URL(formData.url); } catch { errs.url = 'Please enter a valid URL.'; }
      } else if (imageMode === 'file' && !imageFile) {
        errs.url = 'Please select an image file.';
      }
    }

    if (postType === 'link') {
      if (!formData.url.trim()) errs.url = 'Link URL is required.';
      else { try { new URL(formData.url); } catch { errs.url = 'Please enter a valid URL.'; } }
    }

    const { valid: tagsValid, error: tagError } = parseTags(formData.tags);
    if (!tagsValid) errs.tags = tagError;
    if (formData.flair.length > 50) errs.flair = 'Flair cannot exceed 50 characters.';

    if (postType === 'lfg') {
      const pn = parseInt(formData.playersNeeded, 10);
      if (isNaN(pn) || pn < 1) errs.playersNeeded = 'Players needed must be at least 1.';
      if (pn > 100)             errs.playersNeeded = 'Players needed cannot exceed 100.';
      if (!formData.contactInfo.trim()) errs.contactInfo = 'Contact information is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !hub) return;
    setSubmitting(true);

    try {
      const { tags } = parseTags(formData.tags);
      let body;

      if (postType === 'image' && imageMode === 'file' && imageFile) {
        // Multipart upload — multer on the backend picks up req.file
        const fd = new FormData();
        fd.append('image', imageFile);
        fd.append('title', formData.title.trim());
        fd.append('content', formData.content.trim());
        fd.append('type', 'image');
        // Append each tag separately so multer gives the controller a real array,
        // not a JSON string — isArray() validator rejects serialised strings.
        // 04.05 Ilia Klodin: each tag needed its own fd.append call so multer gives the controller an array not a json wtring
        tags.forEach(tag => fd.append('tags', tag));
        fd.append('flair', formData.flair.trim());
        body = fd;
      } else {
        body = {
          title:   formData.title.trim(),
          content: formData.content.trim(),
          type:    postType,
          url:     (postType === 'image' || postType === 'link') ? formData.url : undefined,
          tags,
          flair:   formData.flair.trim(),
          ...(postType === 'lfg' && {
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
          }),
        };
      }

      const data = await api.post(`/api/hubs/${hub._id}/posts`, body);
      navigate(`/post/${data.post._id}`);
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message }));
    } finally {
      setSubmitting(false);
    }
  };

  const titleLeft   = 300 - formData.title.length;
  const contentLeft = 40000 - formData.content.length;

  if (hubLoading) return <div className="container empty-state" style={{ marginTop: '4rem' }}><p>Loading hub…</p></div>;
  if (hubError)   return <div className="container empty-state" style={{ marginTop: '4rem' }}><h2>{hubError}</h2><Link to="/hubs" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Hubs</Link></div>;

  const hubName = hub?.name ?? slug;

  return (
    <div className="container">
      <div className="create-post-layout">

        <section className="create-post__form-area" aria-label="Create post form">
          <nav className="create-post__breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to={`/hub/${slug}`}>h/{hubName}</Link>
            <span>›</span>
            <span>Create Post</span>
          </nav>

          <h1 className="create-post__title">Create a Post in h/{hubName}</h1>

          <div className="post-type-tabs" role="tablist" aria-label="Post type">
            {[
              { key: 'text',  label: '📝 Text'  },
              { key: 'image', label: '🖼 Image' },
              { key: 'link',  label: '🔗 Link'  },
              { key: 'lfg',   label: '👥 LFG'   },
            ].map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={postType === key}
                className={`post-type-tab ${postType === key ? 'active' : ''}`}
                onClick={() => { setPostType(key); setErrors({}); setImageFile(null); setImagePreview(''); }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="create-post__form card">
            {errors.submit && <div className="alert alert-error" role="alert">{errors.submit}</div>}

            {/* Title */}
            <div className="form-group">
              <label className="form-label" htmlFor="cp-title">
                Title * <span className="create-post__char-count">{titleLeft} characters remaining</span>
              </label>
              <input id="cp-title" type="text" name="title" className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="Give your post a title" value={formData.title} onChange={handleChange} maxLength={300} />
              {errors.title && <span className="field-error" role="alert">{errors.title}</span>}
            </div>

            {/* Content (text + lfg) */}
            {(postType === 'text' || postType === 'lfg') && (
              <div className="form-group">
                <label className="form-label" htmlFor="cp-content">
                  {postType === 'lfg' ? 'Description *' : 'Body *'}
                  <span className="create-post__char-count">{contentLeft.toLocaleString()} characters remaining</span>
                </label>
                <textarea id="cp-content" name="content" className={`form-textarea ${errors.content ? 'error' : ''}`}
                  rows={6} placeholder={postType === 'lfg' ? 'Describe what you are looking for…' : 'Tell your story…'}
                  value={formData.content} onChange={handleChange} maxLength={40000} />
                {errors.content && <span className="field-error" role="alert">{errors.content}</span>}
              </div>
            )}

            {/* Image upload/URL */}
            {postType === 'image' && (
              <div className="form-group">
                <label className="form-label">Image *</label>
                <div className="post-type-tabs" style={{ marginBottom: '0.75rem' }}>
                  <button type="button" className={`post-type-tab ${imageMode === 'url' ? 'active' : ''}`} onClick={() => { setImageMode('url'); setImageFile(null); setImagePreview(''); }}>🔗 Enter URL</button>
                  <button type="button" className={`post-type-tab ${imageMode === 'file' ? 'active' : ''}`} onClick={() => { setImageMode('file'); setFormData(p => ({ ...p, url: '' })); }}>📁 Upload File</button>
                </div>
                {imageMode === 'url' ? (
                  <>
                    <input id="cp-url" type="url" name="url" className={`form-input ${errors.url ? 'error' : ''}`}
                      placeholder="https://example.com/image.png" value={formData.url} onChange={handleChange} />
                    {formData.url && !errors.url && (
                      <div className="create-post__img-preview">
                        <img src={formData.url} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }} onChange={handleFileChange} />
                    <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                      {imageFile ? `✓ ${imageFile.name}` : 'Choose image (max 5 MB)'}
                    </button>
                    {imagePreview && (
                      <div className="create-post__img-preview">
                        <img src={imagePreview} alt="Preview" style={{ maxHeight: '200px' }} />
                      </div>
                    )}
                  </>
                )}
                {errors.url && <span className="field-error" role="alert">{errors.url}</span>}
              </div>
            )}

            {/* Link URL */}
            {postType === 'link' && (
              <div className="form-group">
                <label className="form-label" htmlFor="cp-url">Link URL *</label>
                <input id="cp-url" type="url" name="url" className={`form-input ${errors.url ? 'error' : ''}`}
                  placeholder="https://example.com/..." value={formData.url} onChange={handleChange} />
                {errors.url && <span className="field-error" role="alert">{errors.url}</span>}
              </div>
            )}

            {/* LFG-specific fields */}
            {postType === 'lfg' && (
              <div className="lfg-fields">
                <h3 className="lfg-fields__title">LFG Details</h3>
                <div className="lfg-fields__grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-platform">Platform</label>
                    <select id="cp-platform" name="platform" className="form-select" value={formData.platform} onChange={handleChange}>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-region">Region</label>
                    <select id="cp-region" name="region" className="form-select" value={formData.region} onChange={handleChange}>
                      {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-skill">Skill Level</label>
                    <select id="cp-skill" name="skillLevel" className="form-select" value={formData.skillLevel} onChange={handleChange}>
                      {SKILL_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-players">Players Needed *</label>
                    <input id="cp-players" type="number" name="playersNeeded" className={`form-input ${errors.playersNeeded ? 'error' : ''}`}
                      min={1} max={100} value={formData.playersNeeded} onChange={handleChange} />
                    {errors.playersNeeded && <span className="field-error" role="alert">{errors.playersNeeded}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-mode">Game Mode</label>
                    <input id="cp-mode" type="text" name="gameMode" className="form-input" placeholder="e.g. Ranked, Casual"
                      value={formData.gameMode} onChange={handleChange} maxLength={100} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-schedule">Schedule</label>
                    <input id="cp-schedule" type="text" name="schedule" className="form-input" placeholder="e.g. Weekday evenings"
                      value={formData.schedule} onChange={handleChange} maxLength={200} />
                  </div>
                  <div className="form-group lfg-fields__full">
                    <label className="form-label" htmlFor="cp-requirements">Requirements</label>
                    <input id="cp-requirements" type="text" name="requirements" className="form-input"
                      placeholder="e.g. Must have mic, Gold+ rank" value={formData.requirements} onChange={handleChange} maxLength={500} />
                  </div>
                  <div className="form-group lfg-fields__full">
                    <label className="form-label" htmlFor="cp-contact">Contact Info *</label>
                    <input id="cp-contact" type="text" name="contactInfo" className={`form-input ${errors.contactInfo ? 'error' : ''}`}
                      placeholder="e.g. Discord: User#1234" value={formData.contactInfo} onChange={handleChange} maxLength={200} />
                    {errors.contactInfo && <span className="field-error" role="alert">{errors.contactInfo}</span>}
                  </div>
                  <div className="form-group lfg-fields__full">
                    <label className="create-post__checkbox">
                      <input type="checkbox" name="voiceChat" checked={formData.voiceChat} onChange={handleChange} />
                      Voice chat required
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="form-group">
              <label className="form-label" htmlFor="cp-tags">Tags (optional)</label>
              <input id="cp-tags" type="text" name="tags" className={`form-input ${errors.tags ? 'error' : ''}`}
                placeholder="e.g. guide, ranked, tips  (comma-separated, max 5)" value={formData.tags} onChange={handleChange} />
              <span className="field-hint">Separate with commas. Max 5 tags, 30 chars each.</span>
              {errors.tags && <span className="field-error" role="alert">{errors.tags}</span>}
            </div>

            {/* Flair */}
            <div className="form-group">
              <label className="form-label" htmlFor="cp-flair">Flair (optional)</label>
              <input id="cp-flair" type="text" name="flair" className={`form-input ${errors.flair ? 'error' : ''}`}
                placeholder="e.g. Clip, Discussion, Question" value={formData.flair} onChange={handleChange} maxLength={50} />
              {errors.flair && <span className="field-error" role="alert">{errors.flair}</span>}
            </div>

            <p className="create-post__posting-as">
              Posting as <strong>u/{user?.username}</strong> in <strong>h/{hubName}</strong>
            </p>

            <div className="create-post__actions">
              <button type="submit" className="btn btn-primary" disabled={submitting || !hub}>
                {submitting ? 'Posting…' : '📢 Post'}
              </button>
              <Link to={`/hub/${slug}`} className="btn btn-secondary">Cancel</Link>
            </div>
          </form>
        </section>

        <aside className="create-post__sidebar">
          <div className="sidebar__widget">
            <h2 className="sidebar__title">📋 Posting Tips</h2>
            <ul className="create-post__tips">
              <li>Make the title descriptive and specific</li>
              <li>Use the correct post type</li>
              <li>Add relevant tags to help people find your post</li>
              <li>Be respectful and follow hub rules</li>
              <li>For LFG, include your contact info and schedule</li>
            </ul>
          </div>
          <div className="sidebar__widget">
            <h2 className="sidebar__title">h/{hubName} Rules</h2>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)' }}>
              Please review the hub rules before posting.
            </p>
            <Link to={`/hub/${slug}`} className="btn btn-secondary sidebar__more" style={{ marginTop: '0.75rem' }}>
              View Hub Rules
            </Link>
          </div>
        </aside>

      </div>
    </div>
  );
}

export default CreatePostPage;
