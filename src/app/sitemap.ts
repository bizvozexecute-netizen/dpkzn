import type { MetadataRoute } from "next";
import { getAllServices } from "@/lib/db/queries/services";
import { getBlogPosts, getPortfolioItems } from "@/lib/db/queries/content";
import { ALARM_HUB_URL, getAlarmLandings } from "@/lib/db/queries/alarm";

const DOMAIN = "https://dpkzn.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  const services = getAllServices().map((s) => ({
    url: `${DOMAIN}${s.url}`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const blogPosts = getBlogPosts().map((p) => {
    return {
      url: `${DOMAIN}/blog/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    };
  });

  const portfolio = getPortfolioItems().map((w) => ({
    url: `${DOMAIN}/portfolio/${w.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: DOMAIN,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...services,
    // Посадочные сигнализаций — только при активном хабе и активной записи в alarm_landings
    ...(services.some((s) => s.url === `${DOMAIN}${ALARM_HUB_URL}`)
      ? getAlarmLandings().map((l) => ({ url: `${DOMAIN}${l.url}`, changeFrequency: "monthly" as const, priority: 0.8 }))
      : []),
    { url: `${DOMAIN}/antikor` },
    {
      url: `${DOMAIN}/portfolio`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...portfolio,
    {
      url: `${DOMAIN}/blog`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...blogPosts,
    {
      url: `${DOMAIN}/about`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${DOMAIN}/contacts`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${DOMAIN}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
