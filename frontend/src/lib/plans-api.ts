export type SubscriptionPlanFeature = {
  id: string;
  label: string;
  sort_order: number;
};

export type SubscriptionPlan = {
  id: string;
  slug: string;
  name: string;
  price_ron: string | number;
  old_price_ron: string | number | null;
  discount_label: string | null;
  billing_interval: string;
  badge: string | null;
  description: string;
  material_limit: string;
  ai_level: string;
  storage: string;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  is_visible: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  features: SubscriptionPlanFeature[];
};

export type SubscriptionPlanFeatureUpdate = {
  id?: string | null;
  label: string;
  sort_order: number;
};

export type SubscriptionPlanUpdate = {
  id?: string | null;
  slug: string;
  name: string;
  price_ron: string;
  old_price_ron: string | null;
  discount_label: string | null;
  billing_interval: string;
  badge: string | null;
  description: string;
  material_limit: string;
  ai_level: string;
  storage: string;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  is_visible: boolean;
  is_featured: boolean;
  sort_order: number;
  features: SubscriptionPlanFeatureUpdate[];
};

type ApiErrorPayload = {
  detail?: string;
};

export class PlansApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PlansApiError";
  }
}

async function plansRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/plans/${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // The fallback below handles non-JSON upstream errors.
    }
    throw new PlansApiError(
      payload.detail || "Planurile nu au putut fi salvate.",
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function getAdminPlans(): Promise<SubscriptionPlan[]> {
  return plansRequest<SubscriptionPlan[]>("admin");
}

export function updateAdminPlans(
  plans: SubscriptionPlanUpdate[],
): Promise<SubscriptionPlan[]> {
  return plansRequest<SubscriptionPlan[]>("admin", {
    method: "PUT",
    body: JSON.stringify({ plans }),
  });
}
