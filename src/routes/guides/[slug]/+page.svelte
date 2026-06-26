<script lang="ts">
	import { SITE_URL, SITE_NAME, OG_IMAGE, UPDATED_ISO, ldScript, guideBySlug } from '$lib/seo';
	import type { Guide } from '$lib/seo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const g = $derived(data.page);

	const url = $derived(`${SITE_URL}/guides/${g.slug}`);
	const fullTitle = $derived(`${g.title} | ${SITE_NAME}`);
	const related = $derived(
		g.related.map((s) => guideBySlug(s)).filter((x): x is Guide => x != null)
	);
	const ld = $derived(
		ldScript([
			{
				'@context': 'https://schema.org',
				'@type': 'Article',
				headline: g.h1,
				description: g.description,
				datePublished: UPDATED_ISO,
				dateModified: UPDATED_ISO,
				mainEntityOfPage: url,
				author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
				publisher: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` }
			},
			{
				'@context': 'https://schema.org',
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Poo Math', item: `${SITE_URL}/` },
					{ '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
					{ '@type': 'ListItem', position: 3, name: g.h1, item: url }
				]
			}
		])
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={g.description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={g.description} />
	<meta property="og:image" content={OG_IMAGE} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={g.description} />
	<meta name="twitter:image" content={OG_IMAGE} />
	{@html ld}
</svelte:head>

<article class="seo-page">
	<p class="crumbs"><a href="/">Poo Math</a> › <a href="/guides">Guides</a> › {g.title}</p>
	<h1>{g.h1}</h1>
	{#each g.body as para, i (i)}
		<p>{para}</p>
	{/each}

	<a class="cta" href="/">Plan your trip in the calculator →</a>

	{#if related.length}
		<h2>Related guides</h2>
		<ul class="seo-list">
			{#each related as r (r.slug)}
				<li><a href="/guides/{r.slug}">{r.h1}</a></li>
			{/each}
		</ul>
	{/if}
</article>
