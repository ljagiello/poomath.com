import { SITE_URL, RV_PAGES, GUIDES, UPDATED_ISO } from '$lib/seo';

export const prerender = true;

const urls = [
	`${SITE_URL}/`,
	`${SITE_URL}/rv`,
	`${SITE_URL}/guides`,
	...RV_PAGES.map((r) => `${SITE_URL}/rv/${r.slug}`),
	...GUIDES.map((g) => `${SITE_URL}/guides/${g.slug}`)
];

export function GET() {
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		urls.map((u) => `\t<url><loc>${u}</loc><lastmod>${UPDATED_ISO}</lastmod></url>`).join('\n') +
		'\n</urlset>\n';
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
