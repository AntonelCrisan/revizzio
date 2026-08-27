"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  type Notification,
  type NotificationType,
} from "@/lib/notifications-api";

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function typeDotClass(type: NotificationType) {
  if (type === "project_ready") return "bg-success";
  if (type === "weak_concepts") return "bg-warning";
  return "bg-info";
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("ro-RO", { numeric: "auto" });

  if (Math.abs(diffSeconds) < 60) return formatter.format(diffSeconds, "second");
  if (Math.abs(diffSeconds) < 3600)
    return formatter.format(Math.round(diffSeconds / 60), "minute");
  if (Math.abs(diffSeconds) < 86400)
    return formatter.format(Math.round(diffSeconds / 3600), "hour");
  return formatter.format(Math.round(diffSeconds / 86400), "day");
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumped on every local mutation (delete, mark-read) so an in-flight GET
  // started before that mutation can be detected as stale and ignored when
  // it resolves — otherwise its response can clobber the optimistic update.
  const stateVersion = useRef(0);

  async function loadNotifications() {
    const requestVersion = stateVersion.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await listNotifications();
      if (stateVersion.current !== requestVersion) return;
      setNotifications(result.items);
      setUnreadCount(result.unread_count);
    } catch (loadError) {
      if (stateVersion.current !== requestVersion) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Notificările nu au putut fi încărcate.",
      );
    } finally {
      if (stateVersion.current === requestVersion) setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialNotifications() {
      const requestVersion = stateVersion.current;
      setIsLoading(true);
      setError(null);

      try {
        const result = await listNotifications();
        if (!isMounted || stateVersion.current !== requestVersion) return;
        setNotifications(result.items);
        setUnreadCount(result.unread_count);
      } catch (loadError) {
        if (!isMounted || stateVersion.current !== requestVersion) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Notificările nu au putut fi încărcate.",
        );
      } finally {
        if (isMounted && stateVersion.current === requestVersion) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleMarkAllRead() {
    stateVersion.current += 1;
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );

    try {
      await markAllNotificationsRead();
    } catch {
      // The bell stays interactive; a failed mark-all-read is low-stakes and
      // will simply be retried on the next open.
    }
  }

  async function handleDelete(notificationId: string) {
    stateVersion.current += 1;
    const deletedNotification = notifications.find(
      (item) => item.id === notificationId,
    );
    setNotifications((current) =>
      current.filter((item) => item.id !== notificationId),
    );
    if (deletedNotification && !deletedNotification.read_at) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    try {
      await deleteNotification(notificationId);
    } catch {
      if (deletedNotification) {
        stateVersion.current += 1;
        setNotifications((current) =>
          [...current, deletedNotification].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        );
        if (!deletedNotification.read_at) {
          setUnreadCount((current) => current + 1);
        }
      }
    }
  }

  function toggleOpen() {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    if (nextIsOpen) void loadNotifications();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notificări"
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-surface text-content transition hover:bg-surface-hover"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-black text-danger-soft">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Închide notificările"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[100] cursor-default bg-transparent"
          />
          <div className="fixed right-4 top-16 z-[101] w-[min(92vw,380px)] overflow-hidden rounded-xl border border-subtle bg-surface shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Notificări
              </p>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="text-xs font-bold text-action transition hover:opacity-75"
                >
                  Marchează tot ca citit
                </button>
              ) : null}
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-sm text-muted">Se încarcă...</p>
              ) : error ? (
                <p className="p-4 text-sm font-semibold text-danger">{error}</p>
              ) : notifications.length === 0 ? (
                <p className="p-4 text-sm text-muted">
                  Nu ai nicio notificare încă.
                </p>
              ) : (
                <ul className="divide-y divide-subtle">
                  {notifications.map((notification) => {
                    const content = (
                      <div className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-hover">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${typeDotClass(notification.type)} ${
                            notification.read_at ? "opacity-30" : ""
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-content">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {notification.body}
                          </p>
                          {notification.project_name ? (
                            <p className="mt-1 text-[11px] font-bold text-action">
                              Proiect: {notification.project_name}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[11px] font-semibold text-muted">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    );

                    return (
                      <li
                        key={notification.id}
                        className="flex items-stretch"
                      >
                        <div className="min-w-0 flex-1">
                          {notification.project_id ? (
                            <Link
                              href="/myaccount"
                              onClick={() => setIsOpen(false)}
                              className="block"
                            >
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete(notification.id)}
                          aria-label="Șterge notificarea"
                          className="flex shrink-0 items-center px-2 text-muted transition hover:text-danger"
                        >
                          <CloseIcon />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
