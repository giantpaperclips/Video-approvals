import { useRef, useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

export default function VideoReviewApp() {
  const videoRef = useRef(null);

  const [reviewId, setReviewId] = useState(null);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState("in_review");
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);

  const [username, setUsername] = useState("");
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  const isApproved = status === "approved";
  const sortedComments = [...comments].sort((a, b) => a.time - b.time);

  const isSharePoint = videoUrl.includes("sharepoint") || videoUrl.includes("stream");

  /* LOAD REVIEW */
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

  /* LOAD COMMENTS */
  const loadComments = async (id) => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("review_id", id);

    if (data) setComments(data);
  };

  /* REALTIME */
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
          setTimeout(() => loadComments(reviewId), 150);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [reviewId]);

  /* INITIAL LOAD */
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

  /* CREATE REVIEW */
  const createReview = async () => {
    if (!title || !videoUrl) return;

    const id = crypto.randomUUID();

    await supabase.from("reviews").insert({
      id,
      title,
      video_url: videoUrl,
      status: "in_review",
    });

    window.location.search = `?review=${id}`;
  };

  /* NEW REVIEW BUTTON */
  const createNew = () => {
    window.location.href = "/";
  };

  /* ADD COMMENT */
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

    setComments((prev) => [...prev, comment]);
    setText("");
    localStorage.setItem("review-username", username);

    await supabase.from("comments").insert(comment);
  };

  /* TOGGLE */
  const toggleResolved = async (id) => {
    if (isApproved) return;

    const comment = comments.find((c) => c.id === id);
    if (!comment) return;

    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, resolved: !c.resolved } : c
      )
    );

    await supabase
      .from("comments")
      .update({ resolved: !comment.resolved })
      .eq("id", id);
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;

  /* LOADING */
  if (isLoading) return <p style={{ padding: 32 }}>Loading…</p>;

  /* CREATE SCREEN (WITH INSTRUCTIONS) */
  if (!reviewId) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "system-ui" }}>
        <h1>Video Review Tool</h1>

        <p>
          <strong>How to use:</strong><br />
          1. Paste a SharePoint or MP4 video link<br />
          2. Click Create Review<br />
          3. Share the URL with your team<br />
          4. Add timestamped comments<br />
          5. Resolve comments before approval
        </p>

        <input
          placeholder="Video Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <input
          placeholder="Paste SharePoint or MP4 video URL"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <button onClick={createReview}>Create Review</button>
      </div>
    );
  }

  /* MAIN REVIEW UI */
  return (
    <div style={{ maxWidth: 820, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>{title}</h1>

      {/* NEW REVIEW BUTTON */}
      <button onClick={createNew} style={{ marginBottom: 10 }}>
        ➕ Create New Review
      </button>

      {/* VIDEO HANDLING */}
      {isSharePoint ? (
        {videoUrl}
      ) : (
        {videoUrl} =>
            setDuration(videoRef.current?.duration || 0)
          }
        />
      )}

      <h2>Comments</h2>

      <input
        placeholder="Your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <textarea
        placeholder="Add comment at current time"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button onClick={addComment}>Add Comment</button>

      <ul>
        {sortedComments.map((c) => (
          <li key={c.id}>
            <strong>{formatTime(c.time)}</strong> — {c.text}
            <button onClick={() => toggleResolved(c.id)}>
              {c.resolved ? "Reopen" : "Resolve"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
