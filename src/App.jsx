import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(secs) {
  if (secs == null || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function isEmbed(url) {
  if (!url) return false
  const u = url.toLowerCase()
  return u.includes('sharepoint') || u.includes('microsoftstream') || u.includes('stream.microsoft')
}

function exportCSV(comments, title) {
  const rows = [...comments]
    .sort((a, b) => a.time - b.time)
    .map(c => [
      `"${fmt(c.time)}"`,
      `"${(c.username || '').replace(/"/g, '""')}"`,
      `"${(c.text || '').replace(/"/g, '""')}"`,
      `"${c.resolved ? 'Yes' : 'No'}"`,
    ].join(','))
  const csv = ['Time,Author,Comment,Resolved', ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(title || 'review').replace(/\s+/g, '-').toLowerCase()}-comments.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

function navigateTo(params) {
  const url = new URL(window.location.href)
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) url.searchParams.delete(k)
    else url.searchParams.set(k, v)
  })
  window.history.pushState({}, '', url.toString())
  window.dispatchEvent(new Event('popstate'))
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: '#0f0f13',
  surface: '#1a1a24',
  surfaceHover: '#1f1f2e',
  border: '#2d2d3d',
  text: '#e2e8f0',
  muted: '#94a3b8',
  accent: '#6366f1',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#fbbf24',
}

const S = {
  app: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: C.bg,
    color: C.text,
    minHeight: '100vh',
    fontSize: 14,
    lineHeight: 1.5,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '13px 24px',
    backgroundColor: C.surface,
    borderBottom: `1px solid ${C.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    gap: 12,
  },
  logo: {
    fontSize: 16,
    fontWeight: 700,
    color: C.accent,
    letterSpacing: '-0.3px',
    margin: 0,
    userSelect: 'none',
  },
  main: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '28px 24px 48px',
  },
  // ─ Create screen ─
  createWrap: {
    maxWidth: 520,
    margin: '48px auto 0',
  },
  card: {
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: '32px 36px',
  },
  h1: {
    fontSize: 22,
    fontWeight: 700,
    margin: '0 0 6px 0',
    color: '#f1f5f9',
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    margin: '0 0 26px 0',
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    backgroundColor: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    marginBottom: 0,
  },
  formGroup: { marginBottom: 16 },
  // ─ Buttons ─
  btnPrimary: {
    padding: '9px 20px',
    backgroundColor: C.accent,
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap',
  },
  btnSecondary: {
    padding: '7px 14px',
    backgroundColor: 'transparent',
    color: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnApprove: {
    padding: '9px 18px',
    backgroundColor: C.success,
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnResolve: {
    padding: '3px 10px',
    backgroundColor: 'transparent',
    color: C.success,
    border: `1px solid ${C.success}`,
    borderRadius: 5,
    fontSize: 12,
    cursor: 'pointer',
  },
  btnReopen: {
    padding: '3px 10px',
    backgroundColor: 'transparent',
    color: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    fontSize: 12,
    cursor: 'pointer',
  },
  btnExport: {
    padding: '7px 13px',
    backgroundColor: 'transparent',
    color: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  // ─ Alerts ─
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 7,
    padding: '9px 13px',
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 14,
  },
  approvedBanner: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: 8,
    padding: '11px 16px',
    color: '#86efac',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 16,
  },
  // ─ Review header ─
  reviewHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
    flexWrap: 'wrap',
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 6px 0',
    color: '#f1f5f9',
  },
  statusPill: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 9px',
    borderRadius: 20,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  // ─ Video ─
  videoWrap: {
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  video: {
    width: '100%',
    display: 'block',
    maxHeight: 500,
  },
  iframe: {
    width: '100%',
    height: 480,
    border: 'none',
    display: 'block',
  },
  videoErrorBox: {
    padding: '60px 24px',
    textAlign: 'center',
    color: C.muted,
    backgroundColor: '#000',
    borderRadius: 10,
    marginBottom: 4,
  },
  // ─ Timeline ─
  timelineWrap: {
    position: 'relative',
    height: 18,
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    marginBottom: 18,
    overflow: 'visible',
  },
  markerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    border: '2px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },
  // ─ Sections ─
  section: {
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    margin: '0 0 14px 0',
  },
  // ─ Comment input ─
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  inputHint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 7,
  },
  // ─ Comment item ─
  commentItem: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottom: `1px solid ${C.border}`,
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  timestampPill: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: C.accent,
    color: '#fff',
    padding: '2px 7px',
    borderRadius: 4,
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: 600,
    color: '#cbd5e1',
  },
  resolvedTag: {
    fontSize: 10,
    color: C.success,
    backgroundColor: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.25)',
    padding: '1px 6px',
    borderRadius: 4,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  commentText: {
    fontSize: 14,
    margin: '0 0 8px 0',
    lineHeight: 1.55,
    wordBreak: 'break-word',
  },
  // ─ Instructions ─
  instrBox: {
    backgroundColor: 'rgba(99,102,241,0.06)',
    border: '1px solid rgba(99,102,241,0.18)',
    borderRadius: 10,
    padding: '18px 20px',
    marginTop: 22,
  },
  instrTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    margin: '0 0 12px 0',
  },
  instrStep: {
    display: 'flex',
    gap: 10,
    marginBottom: 9,
    alignItems: 'flex-start',
    fontSize: 13,
    color: C.muted,
  },
  instrNum: {
    backgroundColor: C.accent,
    color: '#fff',
    borderRadius: '50%',
    minWidth: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  // ─ Share bar ─
  shareBar: {
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    padding: '8px 0 0',
    wordBreak: 'break-all',
  },
  // ─ Centered page ─
  centerPage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
  },
  centerContent: {
    textAlign: 'center',
    maxWidth: 400,
  },
}

// ── VideoPlayer ───────────────────────────────────────────────────────────────

function VideoPlayer({ url, videoRef, onTimeUpdate, onDurationChange, onError, hasError }) {
  if (hasError) {
    return (
      <div style={S.videoErrorBox}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontWeight: 600, marginBottom: 4, color: C.text }}>Unable to load video</div>
        <div style={{ fontSize: 13 }}>The URL may be incorrect or the video may require authentication.</div>
        <div style={{ fontSize: 11, marginTop: 10, opacity: 0.5, wordBreak: 'break-all' }}>{url}</div>
      </div>
    )
  }

  if (isEmbed(url)) {
    return (
      <div style={S.videoWrap}>
        <iframe
          src={url}
          style={S.iframe}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Review Video"
        />
      </div>
    )
  }

  return (
    <div style={S.videoWrap}>
      <video
        ref={videoRef}
        src={url}
        style={S.video}
        controls
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
        onError={onError}
      />
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function Timeline({ comments, duration, onMarkerClick }) {
  if (!duration || duration === 0) return null

  return (
    <div style={S.timelineWrap} title="Click a marker to jump to that comment">
      {comments.map(c => {
        const pct = Math.min(Math.max((c.time / duration) * 100, 0.6), 99.4)
        const color = c.resolved ? C.success : C.danger
        return (
          <div
            key={c.id}
            onClick={() => onMarkerClick(c)}
            title={`${fmt(c.time)} — ${c.username || 'Anonymous'}: ${c.text}`}
            style={{ ...S.markerDot, left: `${pct}%`, backgroundColor: color }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.5)'
              e.currentTarget.style.boxShadow = `0 0 0 4px ${c.resolved ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        )
      })}
    </div>
  )
}

// ── CommentItem ───────────────────────────────────────────────────────────────

function CommentItem({ comment, onResolve, onReopen, onSeek, approved }) {
  const isResolved = comment.resolved

  return (
    <div style={{ ...S.commentItem, opacity: isResolved ? 0.6 : 1 }}>
      <div style={S.commentMeta}>
        <span
          style={S.timestampPill}
          onClick={() => onSeek(comment.time)}
          title="Jump to this timestamp"
        >
          {fmt(comment.time)}
        </span>
        <span style={S.commentUsername}>{comment.username || 'Anonymous'}</span>
        {isResolved && <span style={S.resolvedTag}>Resolved</span>}
      </div>

      <p style={{
        ...S.commentText,
        textDecoration: isResolved ? 'line-through' : 'none',
        color: isResolved ? C.muted : C.text,
      }}>
        {comment.text}
      </p>

      {!approved && (
        isResolved
          ? <button onClick={() => onReopen(comment.id)} style={S.btnReopen}>Reopen</button>
          : <button onClick={() => onResolve(comment.id)} style={S.btnResolve}>Resolve</button>
      )}
    </div>
  )
}

// ── CreateReview ──────────────────────────────────────────────────────────────

function CreateReview() {
  const [title, setTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    if (!title.trim()) return setError('Please enter a review title.')
    if (!videoUrl.trim()) return setError('Please enter a video URL.')

    setLoading(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('reviews')
        .insert([{ title: title.trim(), video_url: videoUrl.trim(), status: 'in_review' }])
        .select()
        .single()

      if (err) throw err
      navigateTo({ review: data.id })
    } catch (e) {
      setError(e.message || 'Could not create review. Check your Supabase configuration.')
      setLoading(false)
    }
  }

  const handleKey = e => e.key === 'Enter' && !loading && handleCreate()

  return (
    <div style={S.app}>
      <header style={S.header}>
        <h1 style={S.logo}>VideoReview</h1>
      </header>

      <div style={S.main}>
        <div style={S.createWrap}>
          <div style={S.card}>
            <h2 style={S.h1}>New Review</h2>
            <p style={S.subtitle}>Create a review link to share with your team</p>

            {error && <div style={S.errorBox}>{error}</div>}

            <div style={S.formGroup}>
              <label style={S.label}>Review Title</label>
              <input
                style={S.input}
                placeholder="e.g. Episode 3 – Scene 2 Rough Cut"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
                autoFocus
              />
            </div>

            <div style={{ ...S.formGroup, marginBottom: 20 }}>
              <label style={S.label}>Video URL</label>
              <input
                style={S.input}
                placeholder="https://... (MP4 or SharePoint / Stream URL)"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
              />
            </div>

            <button
              onClick={handleCreate}
              style={{ ...S.btnPrimary, width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create Review'}
            </button>
          </div>

          <div style={S.instrBox}>
            <p style={S.instrTitle}>How it works</p>
            {[
              'Paste your video link (MP4 or SharePoint/Stream) and create a review',
              'Copy the browser URL and share it with your team',
              'Play the video and click "Add" to leave timestamped comments',
              'Click any timeline marker or timestamp to jump directly to that moment',
              'Resolve comments as feedback is addressed — then Approve the review',
            ].map((step, i) => (
              <div key={i} style={S.instrStep}>
                <div style={S.instrNum}>{i + 1}</div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ReviewScreen ──────────────────────────────────────────────────────────────

function ReviewScreen({ reviewId }) {
  const [review, setReview] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [videoError, setVideoError] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [username, setUsername] = useState(() => localStorage.getItem('vr_username') || '')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState(null)
  const videoRef = useRef(null)

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)

      const [{ data: rev, error: revErr }, { data: coms, error: comErr }] = await Promise.all([
        supabase.from('reviews').select('*').eq('id', reviewId).single(),
        supabase.from('comments').select('*').eq('review_id', reviewId).order('time', { ascending: true }),
      ])

      if (cancelled) return

      if (revErr) {
        setLoadError('Review not found. The ID may be invalid or the review was deleted.')
        setLoading(false)
        return
      }

      setReview(rev)
      setComments(coms || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [reviewId])

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel(`review-${reviewId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `review_id=eq.${reviewId}` },
        payload => {
          // Small delay prevents optimistic update collisions
          setTimeout(() => {
            if (payload.eventType === 'INSERT') {
              setComments(prev => {
                if (prev.some(c => c.id === payload.new.id)) return prev
                return [...prev, payload.new].sort((a, b) => a.time - b.time)
              })
            } else if (payload.eventType === 'UPDATE') {
              setComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c))
            } else if (payload.eventType === 'DELETE') {
              setComments(prev => prev.filter(c => c.id !== payload.old?.id))
            }
          }, 350)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reviews', filter: `id=eq.${reviewId}` },
        payload => { setReview(payload.new) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [reviewId])

  // ── Comment actions ───────────────────────────────────────────────────────

  const handleAddComment = async () => {
    if (!username.trim()) return setCommentError('Please enter your name.')
    if (!commentText.trim()) return setCommentError('Please enter a comment.')

    const name = username.trim()
    localStorage.setItem('vr_username', name)
    setCommentError(null)
    setSubmitting(true)

    const optimisticId = crypto.randomUUID()
    const optimistic = {
      id: optimisticId,
      review_id: reviewId,
      time: currentTime,
      text: commentText.trim(),
      username: name,
      resolved: false,
      _optimistic: true,
    }

    setComments(prev => [...prev, optimistic].sort((a, b) => a.time - b.time))
    const savedText = commentText
    setCommentText('')

    try {
      const { data, error: err } = await supabase
        .from('comments')
        .insert([{
          review_id: reviewId,
          time: optimistic.time,
          text: optimistic.text,
          username: optimistic.username,
          resolved: false,
        }])
        .select()
        .single()

      if (err) throw err
      // Replace optimistic entry with real DB row
      setComments(prev => prev.map(c => c.id === optimisticId ? data : c))
    } catch (e) {
      setComments(prev => prev.filter(c => c.id !== optimisticId))
      setCommentText(savedText)
      setCommentError(e.message || 'Failed to save comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async id => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c))
    const { error } = await supabase.from('comments').update({ resolved: true }).eq('id', id)
    if (error) setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: false } : c))
  }

  const handleReopen = async id => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: false } : c))
    const { error } = await supabase.from('comments').update({ resolved: false }).eq('id', id)
    if (error) setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c))
  }

  const handleApprove = async () => {
    if (!window.confirm('Mark this review as Approved?\n\nThis will lock all comments.')) return
    const { error } = await supabase.from('reviews').update({ status: 'approved' }).eq('id', reviewId)
    if (!error) setReview(prev => ({ ...prev, status: 'approved' }))
  }

  // ── Video helpers ─────────────────────────────────────────────────────────

  const seekTo = time => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      videoRef.current.play().catch(() => {})
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const approved = review?.status === 'approved'
  const resolvedCount = comments.filter(c => c.resolved).length
  const allResolved = comments.length > 0 && resolvedCount === comments.length
  const canApprove = allResolved && !approved
  const embedVideo = isEmbed(review?.video_url)
  const sortedComments = [...comments].sort((a, b) => a.time - b.time)

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...S.app, ...S.centerPage }}>
        <div style={{ ...S.centerContent, color: C.muted }}>Loading review…</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ ...S.app, ...S.centerPage }}>
        <div style={S.centerContent}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Review Not Found</div>
          <div style={{ color: C.muted, marginBottom: 20 }}>{loadError}</div>
          <button onClick={() => navigateTo({ review: null })} style={S.btnPrimary}>
            Create New Review
          </button>
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div style={S.app}>
      <header style={S.header}>
        <h1 style={S.logo}>VideoReview</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {comments.length > 0 && (
            <button onClick={() => exportCSV(comments, review?.title)} style={S.btnExport}>
              Export CSV
            </button>
          )}
          <button onClick={() => navigateTo({ review: null })} style={S.btnSecondary}>
            New Review
          </button>
        </div>
      </header>

      <div style={S.main}>
        {/* Review header */}
        <div style={S.reviewHeader}>
          <div>
            <h2 style={S.reviewTitle}>{review?.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{
                ...S.statusPill,
                backgroundColor: approved ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                color: approved ? C.success : C.warning,
                border: `1px solid ${approved ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
              }}>
                {approved ? 'Approved' : 'In Review'}
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>
                {comments.length} comment{comments.length !== 1 ? 's' : ''}
                {comments.length > 0 && ` · ${resolvedCount} resolved`}
              </span>
            </div>
          </div>

          {canApprove && (
            <button onClick={handleApprove} style={S.btnApprove}>
              ✓ Approve Review
            </button>
          )}
        </div>

        {/* Approved banner */}
        {approved && (
          <div style={S.approvedBanner}>
            ✓ Review Approved — this review is locked
          </div>
        )}

        {/* Video player */}
        <VideoPlayer
          url={review?.video_url}
          videoRef={videoRef}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
          onError={() => setVideoError(true)}
          hasError={videoError}
        />

        {/* Timeline markers — only for native video (not iframes) */}
        {!embedVideo && !videoError && (
          <Timeline
            comments={sortedComments}
            duration={duration}
            onMarkerClick={c => seekTo(c.time)}
          />
        )}

        {/* Add comment */}
        {!approved && (
          <div style={S.section}>
            <p style={S.sectionTitle}>
              Add Comment
              {!embedVideo && duration > 0 && (
                <span style={{ color: C.accent, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  {' '}at {fmt(currentTime)}
                </span>
              )}
            </p>

            {commentError && <div style={S.errorBox}>{commentError}</div>}

            <div style={S.inputRow}>
              <input
                style={{ ...S.input, flex: '0 0 150px' }}
                placeholder="Your name"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={submitting}
              />
              <input
                style={{ ...S.input, flex: 1 }}
                placeholder="Write a comment… (Enter to submit)"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !submitting && handleAddComment()}
                disabled={submitting}
              />
              <button
                onClick={handleAddComment}
                style={{ ...S.btnPrimary, opacity: submitting ? 0.6 : 1 }}
                disabled={submitting}
              >
                {submitting ? '…' : 'Add'}
              </button>
            </div>

            {!embedVideo && duration > 0 && (
              <div style={S.inputHint}>
                Timestamp captured from video position · play the video to the moment you want to comment on, then click Add
              </div>
            )}
          </div>
        )}

        {/* Comment list */}
        <div style={S.section}>
          <p style={S.sectionTitle}>
            Comments ({sortedComments.length})
            {sortedComments.length > 0 && resolvedCount > 0 && (
              <span style={{ color: C.success, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {' '}· {resolvedCount}/{sortedComments.length} resolved
              </span>
            )}
          </p>

          {sortedComments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted }}>
              No comments yet — be the first to add feedback.
            </div>
          ) : (
            <>
              {sortedComments.map(c => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  onResolve={handleResolve}
                  onReopen={handleReopen}
                  onSeek={seekTo}
                  approved={approved}
                />
              ))}

              {/* Remove border from last item */}
              <style>{`.vr-last-comment { border-bottom: none !important; margin-bottom: 0 !important; }`}</style>
            </>
          )}
        </div>

        {/* Share link */}
        <div style={S.shareBar}>
          Share: <span style={{ opacity: 0.7 }}>{window.location.href}</span>
        </div>
      </div>
    </div>
  )
}

// ── App (URL router) ──────────────────────────────────────────────────────────

export default function App() {
  const [reviewId, setReviewId] = useState(
    () => new URLSearchParams(window.location.search).get('review')
  )

  useEffect(() => {
    const handler = () => {
      setReviewId(new URLSearchParams(window.location.search).get('review'))
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  return reviewId ? <ReviewScreen reviewId={reviewId} /> : <CreateReview />
}
