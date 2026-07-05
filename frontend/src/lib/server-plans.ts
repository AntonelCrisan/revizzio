import "server-only";

import { cookies, headers } from "next/headers";
import type { SubscriptionPlan } from "@/lib/plans-api";

export const fallbackSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: "fallback-start",
    slug: "start",
    name: "Start",
    price_ron: "0.00",
    old_price_ron: null,
    discount_label: null,
    billing_interval: "lunar",
    badge: "gratuit",
    description: "Pentru primul curs și testarea fluxului Revizzio.",
    material_limit: "3 materiale procesate lunar",
    ai_level: "AI de bază",
    storage: "Istoric limitat",
    stripe_product_id: null,
    stripe_price_id: null,
    is_visible: true,
    is_featured: false,
    sort_order: 0,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    features: [
      {
        id: "fallback-start-1",
        label: "Flashcard-uri și quiz-uri de bază",
        sort_order: 0,
      },
      {
        id: "fallback-start-2",
        label: "Rezumat generat pentru fiecare material",
        sort_order: 1,
      },
      {
        id: "fallback-start-3",
        label: "Acces la progresul general",
        sort_order: 2,
      },
    ],
  },
  {
    id: "fallback-focus",
    slug: "focus",
    name: "Focus",
    price_ron: "29.00",
    old_price_ron: "39.00",
    discount_label: "25% reducere lansare",
    billing_interval: "lunar",
    badge: "recomandat",
    description: "Cel mai bun raport pentru studenți activi.",
    material_limit: "30 materiale procesate lunar",
    ai_level: "Repetiție inteligentă și strategii AI",
    storage: "Istoric complet pe proiecte",
    stripe_product_id: null,
    stripe_price_id: null,
    is_visible: true,
    is_featured: true,
    sort_order: 1,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    features: [
      {
        id: "fallback-focus-1",
        label: "Analiză de progres pe fiecare proiect",
        sort_order: 0,
      },
      {
        id: "fallback-focus-2",
        label: "Prioritate la generare",
        sort_order: 1,
      },
      {
        id: "fallback-focus-3",
        label: "Chat AI contextual pe proiect",
        sort_order: 2,
      },
      {
        id: "fallback-focus-4",
        label: "Highlight-uri și explicații AI",
        sort_order: 3,
      },
    ],
  },
  {
    id: "fallback-pro",
    slug: "pro",
    name: "Pro",
    price_ron: "59.00",
    old_price_ron: "79.00",
    discount_label: "20 RON economie",
    billing_interval: "lunar",
    badge: "examene",
    description: "Pentru sesiuni intense și mai multe materii.",
    material_limit: "Materiale nelimitate rezonabil",
    ai_level: "Planuri AI pentru examene",
    storage: "Export și arhivă extinsă",
    stripe_product_id: null,
    stripe_price_id: null,
    is_visible: true,
    is_featured: false,
    sort_order: 2,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    features: [
      {
        id: "fallback-pro-1",
        label: "Planuri de învățare pe data examenului",
        sort_order: 0,
      },
      {
        id: "fallback-pro-2",
        label: "Export pentru rezumate și flashcard-uri",
        sort_order: 1,
      },
      {
        id: "fallback-pro-3",
        label: "Suport prioritar",
        sort_order: 2,
      },
      {
        id: "fallback-pro-4",
        label: "Predicții avansate de pregătire",
        sort_order: 3,
      },
    ],
  },
];

async function requestHeaders(includeAuth: boolean) {
  const requestHeaders = new Headers();
  const userAgent = (await headers()).get("user-agent");

  if (includeAuth) {
    const cookieHeader = (await cookies()).toString();
    if (cookieHeader) {
      requestHeaders.set("cookie", cookieHeader);
    }
  }

  if (userAgent) {
    requestHeaders.set("user-agent", userAgent);
  }

  return requestHeaders;
}

async function serverPlansRequest<T>(
  path: string,
  options: { includeAuth?: boolean } = {},
): Promise<T | null> {
  const baseUrl = process.env.API_URL;
  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/plans/${path}`, {
      method: "GET",
      headers: await requestHeaders(Boolean(options.includeAuth)),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function getServerAdminPlans(): Promise<SubscriptionPlan[] | null> {
  return serverPlansRequest<SubscriptionPlan[]>("admin", { includeAuth: true });
}

export function getServerPublicPlans(): Promise<SubscriptionPlan[] | null> {
  return serverPlansRequest<SubscriptionPlan[]>("");
}
