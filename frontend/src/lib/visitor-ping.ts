export function pingVisit(path: string): void {
  try {
    const body = JSON.stringify({ path });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/visits/ping", blob);
      return;
    }

    void fetch("/api/visits/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // Best-effort visit tracking only; failures are not user-facing.
  }
}
