import type { AuthUser, AuthUserPlan } from "@/lib/auth-api";

export function formatPlanPrice(value: AuthUserPlan["price_ron"]) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2).replace(".", ",");
}

export function getActivePlan(user: AuthUser | null): AuthUserPlan | null {
  return user?.current_plan ?? null;
}

export function getActivePlanName(user: AuthUser | null) {
  return getActivePlan(user)?.name ?? "Start";
}

export function getActivePlanBadge(user: AuthUser | null) {
  const plan = getActivePlan(user);
  return plan?.badge || (plan ? "Activ" : "Gratuit");
}

export function getActivePlanPriceLabel(user: AuthUser | null) {
  const plan = getActivePlan(user);
  if (!plan || Number(plan.price_ron) === 0) return "Gratuit";
  return `${formatPlanPrice(plan.price_ron)} RON / ${plan.billing_interval}`;
}

export function getActivePlanMaterialLimit(user: AuthUser | null) {
  return getActivePlan(user)?.material_limit ?? "3 materiale procesate lunar";
}

export function getActivePlanProgressWidth(user: AuthUser | null) {
  const plan = getActivePlan(user);
  if (!plan || Number(plan.price_ron) === 0) return "w-1/3";

  const normalizedSlug = plan.slug.toLowerCase();
  const normalizedName = plan.name.toLowerCase();
  if (normalizedSlug.includes("pro") || normalizedName.includes("pro")) {
    return "w-full";
  }

  return "w-2/3";
}
