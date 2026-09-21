"use client";

import { useEffect, useRef, useState } from "react";

/*
  The right-hand side of a /marketing client card: the same phone mockup /work
  uses for a mobile case, with the account's own video on the screen instead of
  a screenshot.

  The frame is not re-authored here. .kagu-thumb--phone / .kagu-phone in
  src/styles/file-card.css already own the bezel, the radii, the island and the
  short-viewport trims, and they are height-driven with a container query — so
  the same shell that holds a screenshot on /work holds a 9:19.5 video here and
  shrinks with the pinned card on a short screen. Only what goes on the screen
  changed.

  This is a client island for three reasons, all of them about not being rude
  with someone's battery and data:

    - Playback follows visibility. The pile sits mid-page, so the video is
      paused until its card is actually on screen and paused again the moment
      it leaves. IntersectionObserver, not a scroll listener.
    - Autoplay has to be muted to be allowed at all, so the sound is behind a
      button rather than silently lost. Unmuting also unhides the native
      controls, since that is the point at which someone wants a scrubber.
    - Under prefers-reduced-motion nothing plays on its own. The poster frame
      sits there with the controls showing and it starts when asked.

  preload="metadata" so the card costs a few kB until it is looked at. And on
  a narrow screen the frame keeps file-card.css's order:-1 and sits above the
  copy — right for a preview, and right for this: the video is the first thing
  worth seeing, where the button grid it replaced read better after the copy.
*/

export function ClientReel({
  src,
  label,
  poster,
}: {
  /** Path under /public — an H.264 MP4 at the phone's 9:19.5 portrait aspect. */
  src: string;
  /** Client name, for the accessible name of the video and the sound button. */
  label: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  // Assume motion is fine for the first paint — the effect corrects it before
  // anything can play, and guessing the other way would leave the common case
  // with a video that never starts if the effect is late.
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React does not render `muted` into the server HTML, so the element can
    // reach its first frame unmuted and have autoplay refused. Set it on the
    // node as well as in JSX.
    video.muted = true;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      setReduced(motion.matches);
      if (motion.matches) video.pause();
    };
    onMotion();
    motion.addEventListener("change", onMotion);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !motion.matches) {
          // Rejected autoplay is an expected outcome, not an error: the poster
          // stays up and the controls are there to start it by hand.
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      // A pinned card is tall; wait until a real part of the phone is showing.
      { threshold: 0.4 },
    );
    io.observe(video);

    return () => {
      io.disconnect();
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  // Once the sound is on, the person is watching rather than glancing, so give
  // them the browser's own transport instead of a bare rectangle.
  const withControls = !muted || reduced;

  return (
    <div className="kagu-thumb kagu-thumb--phone kagu-thumb--reel">
      <div className="kagu-phone">
        <div className="kagu-phone__body">
          <span className="kagu-phone__island" aria-hidden />
          <div className="kagu-phone__screen">
            <video
              ref={videoRef}
              className="kagu-reel__video"
              src={src}
              poster={poster}
              title={`${label} — social content we produce and run`}
              muted={muted}
              loop
              playsInline
              preload="metadata"
              controls={withControls}
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
            />
            <button
              type="button"
              className="kagu-reel__sound"
              onClick={() => {
                const video = videoRef.current;
                const next = !muted;
                setMuted(next);
                if (video) video.muted = next;
                // Unmuting is a user gesture, so this is the one moment a
                // video held back by autoplay policy is allowed to start —
                // and the moment a browser that only permitted it while it
                // was silent will stop it, so play unconditionally rather
                // than only when it is already paused.
                if (!next) void video?.play().catch(() => {});
              }}
              aria-pressed={!muted}
              aria-label={
                muted
                  ? `Unmute the ${label} video`
                  : `Mute the ${label} video`
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" />
                {muted ? (
                  <>
                    <path d="m16.2 9.6 4.2 4.8" />
                    <path d="m20.4 9.6-4.2 4.8" />
                  </>
                ) : (
                  <>
                    <path d="M16.1 9.2a4 4 0 0 1 0 5.6" />
                    <path d="M18.6 6.9a7.3 7.3 0 0 1 0 10.2" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
