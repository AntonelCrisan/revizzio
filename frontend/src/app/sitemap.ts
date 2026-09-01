import type { MetadataRoute } from "next";
import { absoluteUrl, planDetailPath, publicSitemapRoutes } from "@/lib/seo";
import {
  fallbackSubscriptionPlans,
  getServerPublicPlans,
} from "@/lib/server-plans";

// getServerPublicPlans() reads request headers, so this route is dynamic and
// cannot also declare a revalidate window.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = publicSitemapRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Plans live in the database, so their detail pages cannot be a static list.
  const plans = (await getServerPublicPlans()) ?? fallbackSubscriptionPlans;
  const planEntries = plans
    .filter((plan) => plan.is_visible)
    .sort((first, second) => first.sort_order - second.sort_order)
    .map((plan) => ({
      url: absoluteUrl(planDetailPath(plan.slug)),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...staticEntries, ...planEntries];
}
