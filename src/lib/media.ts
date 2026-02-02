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

  try {
    // If it was playing a MediaStream
    (el as any).srcObject = null;
  } catch {
    // ignore
  }

  try {
    el.currentTime = 0;
  } catch {
    // ignore
  }

  try {
    el.removeAttribute("src");
    // Some browsers keep decoders alive; load() forces teardown
    el.load();
  } catch {
    // ignore
  }
}

export function stopAllMediaPipelines() {
  if (typeof document === "undefined") return;

  const els = Array.from(document.querySelectorAll<HTMLMediaElement>("video, audio"));
  for (const el of els) stopMediaElement(el);

  // Double-tap: schedule another pass in case something re-attaches src on the same tick
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => {
      const again = Array.from(document.querySelectorAll<HTMLMediaElement>("video, audio"));
      for (const el of again) stopMediaElement(el);
    });
  }
}
