import { error } from '@sveltejs/kit';
import { GUIDES, guideBySlug } from '$lib/seo';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => GUIDES.map((g) => ({ slug: g.slug }));

export const load: PageLoad = ({ params }) => {
	const page = guideBySlug(params.slug);
	if (!page) error(404, 'Guide not found');
	return { page };
};
