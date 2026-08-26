"use client";

import { useEffect } from "react";
import { pingVisit } from "@/lib/visitor-ping";

const SESSION_FLAG_KEY = "revizzio-visit-pinged";

export function VisitorPing() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG_KEY)) return;
      window.sessionStorage.setItem(SESSION_FLAG_KEY, "1");
    } catch {
      // Session storage may be unavailable; ping anyway for this page view.
    }

    pingVisit(window.location.pathname);
  }, []);

  return null;
}
