// Global media controls (prevents audio leaks when UI changes hide media elements)

function stopMediaElement(el: HTMLMediaElement) {
  try {
    el.pause();
  } catch {
    // ignore
  }

  try {
    // Ensure audio is killed even if playback pipeline is stuck
    el.muted = true;
    // volume exists on HTMLMediaElement
    (el as HTMLMediaElement).volume = 0;
  } catch {
    // ignore
  }
}

export function stopAllMediaPipelines() {
  if (typeof document === "undefined") return;

  document.dispatchEvent(new Event("upplin:media-stop"));
  const els = Array.from(document.querySelectorAll<HTMLMediaElement>("video, audio"));
  for (const el of els) { if (!el.hasAttribute("data-camera")) stopMediaElement(el); }
}
