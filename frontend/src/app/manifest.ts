import type { MetadataRoute } from "next";
import { defaultSeoDescription, siteName } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    description: defaultSeoDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#405544",
    icons: [
      {
        src: "/assets/logos/Reviss_favicon_dark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
