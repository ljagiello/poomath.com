import { error } from '@sveltejs/kit';
import { RV_PAGES, rvBySlug } from '$lib/seo';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => RV_PAGES.map((r) => ({ slug: r.slug }));

export const load: PageLoad = ({ params }) => {
	const page = rvBySlug(params.slug);
	if (!page) error(404, 'RV model not found');
	return { page };
};
