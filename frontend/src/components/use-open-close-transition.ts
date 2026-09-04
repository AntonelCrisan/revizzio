"use client";

import { useEffect, useState } from "react";

/**
 * Keeps a popover mounted long enough to animate out.
 *
 * Unmounting on the same tick the flag flips means the closing frames never
 * render, so a panel would fade in but vanish. This reports both whether to
 * render and which visual state to render in.
 *
 * Mounting is derived rather than stored, so the element is in the tree on the
 * very first frame the flag turns on and nothing is set synchronously from the
 * effect. Only the phase moves, and only from a frame callback or a timer.
 *
 * The reduced-motion rule in globals.css collapses every transition to
 * ~0.01ms, so the extra mounted frames are imperceptible there.
 */
export function useOpenCloseTransition(isOpen: boolean, durationMs = 180) {
  const [phase, setPhase] = useState<"closed" | "open">("closed");

  useEffect(() => {
    if (isOpen) {
      // Two frames, not one: a single `requestAnimationFrame` can still run
      // before the browser paints the "from" state, and the transition is
      // then skipped entirely. The second frame guarantees a painted start.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setPhase("open"));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    const timer = window.setTimeout(() => setPhase("closed"), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, isOpen]);

  return {
    /** Render it: it is open, or still animating out. */
    isMounted: isOpen || phase === "open",
    /** Apply the open styles. */
    isVisible: isOpen && phase === "open",
  };
}
