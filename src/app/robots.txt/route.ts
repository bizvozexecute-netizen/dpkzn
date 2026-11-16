// Next.js MetadataRoute.Robots has no field for Yandex-specific directives
// (Host, Clean-param), so robots.txt is served as raw text instead of via
// the typed robots.ts convention.
const BODY = `User-Agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /admin/

Clean-param: etext&yclid&utm_source&utm_medium&utm_campaign&utm_content&utm_term

Host: https://dpkzn.ru
Sitemap: https://dpkzn.ru/sitemap.xml
`;

export function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain" },
  });
}
