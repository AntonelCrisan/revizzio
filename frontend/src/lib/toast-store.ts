/**
 * The message bus behind the toast notification centre.
 *
 * It lives outside React on purpose: any layer can raise a message
 * (`toast.success(...)` from an event handler, a catch block, or a plain
 * helper in `lib/`) without needing a hook or a context in scope. The viewport
 * component subscribes with `useSyncExternalStore` and is the only renderer.
 */

export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastInput = {
  /** Visual family; drives colours and icon. Defaults to `info`. */
  tone?: ToastTone;
  /** The one-line message. Required — a toast without a headline says nothing. */
  title: string;
  /** Optional second line for detail (an error reason, a next step). */
  description?: string;
  /** Auto-dismiss delay. `0` keeps the toast until it is closed by hand. */
  durationMs?: number;
};

export type ToastRecord = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  durationMs: number;
  /**
   * Bumped when the same message is raised again while it is still on screen.
   * The card watches it to restart its countdown instead of the stack growing
   * a second identical copy (double submits, retried requests).
   */
  revision: number;
};

export const DEFAULT_TOAST_DURATION_MS = 3000;

/** Older toasts are dropped past this, so the stack never walks off screen. */
const MAX_VISIBLE_TOASTS = 3;

const EMPTY_SNAPSHOT: ToastRecord[] = [];

let toasts: ToastRecord[] = EMPTY_SNAPSHOT;
let nextId = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function isSameMessage(toast: ToastRecord, input: Required<Pick<ToastInput, "tone" | "title">> & ToastInput) {
  return (
    toast.tone === input.tone &&
    toast.title === input.title &&
    toast.description === input.description
  );
}

export function subscribeToToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToastsSnapshot() {
  return toasts;
}

/**
 * Server render and hydration both start from an empty stack: a toast is
 * always the result of something the visitor did in this tab.
 */
export function getToastsServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

export function pushToast(input: ToastInput) {
  const title = input.title.trim();

  // A blank message would render an empty card. Callers that forward an API
  // string they did not check should stay silent instead.
  if (!title) return null;

  const resolved = {
    tone: input.tone ?? "info",
    title,
    description: input.description?.trim() || undefined,
    durationMs: Math.max(0, input.durationMs ?? DEFAULT_TOAST_DURATION_MS),
  };

  const existing = toasts.find((toast) => isSameMessage(toast, resolved));

  if (existing) {
    toasts = toasts.map((toast) =>
      toast.id === existing.id
        ? { ...toast, durationMs: resolved.durationMs, revision: toast.revision + 1 }
        : toast,
    );
    notify();
    return existing.id;
  }

  nextId += 1;
  const id = `toast-${nextId}`;
  toasts = [...toasts, { id, ...resolved, revision: 0 }].slice(-MAX_VISIBLE_TOASTS);
  notify();
  return id;
}

export function dismissToast(id: string) {
  const remaining = toasts.filter((toast) => toast.id !== id);
  if (remaining.length === toasts.length) return;

  toasts = remaining.length ? remaining : EMPTY_SNAPSHOT;
  notify();
}

function toneShortcut(tone: ToastTone) {
  return (title: string, description?: string, durationMs?: number) =>
    pushToast({ tone, title, description, durationMs });
}

/**
 * The shorthand used across the app:
 * `toast.success("Parola a fost schimbată.")`.
 */
export const toast = {
  show: pushToast,
  success: toneShortcut("success"),
  error: toneShortcut("error"),
  warning: toneShortcut("warning"),
  info: toneShortcut("info"),
  dismiss: dismissToast,
};
