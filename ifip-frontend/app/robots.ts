import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://internship.nextif.org";
  
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/apply", "/partners/apply", "/login"],
      disallow: [
        "/admin/",
        "/dashboard/",
        "/api/",
        "/forgot-password",
        "/reset-password",
        "/set-password",
        "/verify-payment",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
