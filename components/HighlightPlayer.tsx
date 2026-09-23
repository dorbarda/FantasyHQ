'use client';

import { useState } from 'react';

/**
 * A YouTube clip that loads only when tapped: a thumbnail and a play button
 * until then. Eight live iframes make a phone page heavy, and an iframe shows
 * blank until it loads — which is also what a screenshot of the recap caught.
 * Non-YouTube embeds fall back to a plain iframe.
 */
export default function HighlightPlayer({ embedUrl, title }: { embedUrl: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const youtubeId = embedUrl.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/)?.[1];

  if (playing || !youtubeId) {
    const src = youtubeId ? `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1` : embedUrl;
    return (
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play: ${title}`}
      className="group absolute inset-0 w-full h-full bg-black"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, fixed size */}
      <img
        src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-black/70 group-hover:bg-black/85 transition-colors">
          <svg viewBox="0 0 24 24" className="w-7 h-7 ml-1 fill-white" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
