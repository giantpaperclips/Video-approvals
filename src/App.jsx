import { useRef, useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

export default function VideoReviewApp() {
  const videoRef = useRef(null);

  // REVIEW STATE
  const [reviewId, setReviewId] = useState(null);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState("in_review");
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);

  // USER + COMMENTS
  const [username, setUsername] = useState("");
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  const isApproved = status === "approved";
  const sortedComments = [...comments].sort((a, b) => a.time - b.time);

  /* ───────────── LOAD REVIEW ───────────── */
  const loadReview = async (id) => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setTitle(data.title);
      setVideoUrl(data.video_url);
      setStatus(data.status);
    }

    setIsLoading(false);
  };

  /* ───────────── LOAD COMMENTS ───────────── */
  const loadComments = async (id) => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("review_id", id);

    if (data) setComments(data);
  };

  /* ───────────── REALTIME (FILTERED) ───────────── */
  useEffect(() => {
    if (!reviewId) return;

    const channel = supabase
      .channel(`comments-${reviewId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `review_id=eq.${reviewId}`,
        },
        () => {
          // delay avoids race vs insert/update
          setTimeout(() => loadComments(reviewId), 150);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reviewId]);

  /* ───────────── INITIAL LOAD ───────────── */
  useEffect(() => {
    const storedName = localStorage.getItem("review-username");
    if (storedName) setUsername(storedName);

    const idFromUrl = new URLSearchParams(window.location.search).get("review");

    if (idFromUrl) {
      setReviewId(idFromUrl);
      loadReview(idFromUrl);
      loadComments(idFromUrl);
    } else {
      setIsLoading(false);
    }
  }, []);

  /* ───────────── ADD COMMENT (OPTIMISTIC) ───────────── */
  const addComment = async () => {
    if (!text || !username || !reviewId || isApproved) return;

    const comment = {
      id: crypto.randomUUID(),
      review_id: reviewId,
      time: videoRef.current?.currentTime || 0,
      text,
      username,
      resolved: false,
    };

    // ✅ instant UI feedback
    setComments((prev) => [...prev, comment]);
    setText("");
    localStorage.setItem("review-username", username);

    const { error } = await supabase.from("comments").insert(comment);

    // rollback if insert fails
    if (error) {
      console.error("❌ Failed to save comment:", error);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    }
  };

  /* ───────────── TOGGLE RESOLVED (OPTIMISTIC) ───────────── */
  const toggleResolved = async (id) => {
    if (isApproved) return;

    const comment = comments.find((c) => c.id === id);
    if (!comment) return;

    // ✅ immediate UI update
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, resolved: !c.resolved } : c
      )
    );

    const { error } = await supabase
      .from("comments")
      .update({ resolved: !comment.resolved })
      .eq("id", id);

    // rollback if update fails
    if (error) {
      console.error("❌ Failed to toggle resolve:", error);
      setComments((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, resolved: comment.resolved } : c
        )
      );
    }
  };

  /* ───────────── APPROVE REVIEW ───────────── */
  const approveReview = async () => {
    await supabase
      .from("reviews")
      .update({ status: "approved" })
      .eq("id", reviewId);

    setStatus("approved");
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;

  /* ───────────── RENDER ───────────── */
  if (isLoading) {
    return <p style={{ padding: 32 }}>Loading review…</p>;
  }

  return (
    <div style={{ maxWidth: 820, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1 style={{ textAlign: "center" }}>{title}</h1>

      {/* VIDEO */}
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        width="100%"
        preload="metadata"
        onLoadedMetadata={() =>
          setDuration(videoRef.current?.duration || 0)
        }
        style={{ borderRadius: 8 }}
      />

      {/* TIMELINE MARKERS */}
      {duration > 0 && sortedComments.length > 0 && (
        <div
          style={{
            position: "relative",
            height: 10,
            background: "#ddd",
            margin: "14px 0",
            borderRadius: 5,
          }}
        >
          {sortedComments.map((c) => (
            <div
              key={c.id}
              title={`${formatTime(c.time)} — ${c.text}`}
              onClick={() => {
                videoRef.current.currentTime = c.time;
                videoRef.current.play();
              }}
              style={{
                position: "absolute",
                left: `${(c.time / duration) * 100}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: c.resolved ? "#4caf50" : "#e53935",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}

      {/* COMMENTS */}
      <section style={{ marginTop: 24 }}>
        <h2>Comments</h2>

        <input
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isApproved}
          style={{ width: "100%", padding: 8 }}
        />

        <textarea
          placeholder="Add a comment at the current time"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isApproved}
          style={{ width: "100%", padding: 8, marginTop: 8 }}
        />

        <button
          onClick={addComment}
          disabled={!text || !username || isApproved}
          style={{
            marginTop: 8,
            opacity: !text || !username || isApproved ? 0.6 : 1,
            cursor:
              !text || !username || isApproved ? "not-allowed" : "pointer",
          }}
        >
          Add Comment
        </button>

        <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
          {sortedComments.map((c) => (
            <li
              key={c.id}
              style={{
                padding: 12,
                marginBottom: 8,
                background: "#fafafa",
                borderRadius: 6,
                opacity: c.resolved ? 0.6 : 1,
                textDecoration: c.resolved ? "line-through" : "none",
              }}
            >
              <strong>{formatTime(c.time)}</strong> — {c.text} ({c.username})
              <div>
                <button
                  onClick={() => toggleResolved(c.id)}
                  disabled={isApproved}
                >
                  {c.resolved ? "Reopen" : "Resolve"}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {!isApproved &&
          sortedComments.length > 0 &&
          sortedComments.every((c) => c.resolved) && (
            <button onClick={approveReview}>
              Mark as Approved
            </button>
          )}

        {isApproved && <p>✅ Review approved (locked)</p>}
      </section>
    </div>
  );
}
``