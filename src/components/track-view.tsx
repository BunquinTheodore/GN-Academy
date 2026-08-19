"use client";

import { useEffect, useRef } from "react";
import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

/**
 * Fires one funnel event when a server-rendered page mounts. The ref guard
 * keeps React's development double-effect (and any client-side re-render)
 * from double-counting a single view.
 */
export function TrackView({
  event,
  props,
}: {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(event, props);
    // Props is a fresh object literal each render; the ref is the real guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}
