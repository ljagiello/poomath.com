<script lang="ts">
	import { SITE_URL, SITE_NAME, OG_IMAGE, ldScript, GUIDES } from '$lib/seo';

	const url = `${SITE_URL}/guides`;
	const title = 'Burning Man RV water & pump-out guides';
	const desc =
		'Plain-English answers to the most common Burning Man RV water questions — how much water per person, how often to pump out, Leave No Trace, tank sizes and more.';
	const ld = ldScript({
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: title,
		itemListElement: GUIDES.map((g, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: g.h1,
			url: `${SITE_URL}/guides/${g.slug}`
		}))
	});
</script>

<svelte:head>
	<title>{title} | {SITE_NAME}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={`${title} | ${SITE_NAME}`} />
	<meta property="og:description" content={desc} />
	<meta property="og:image" content={OG_IMAGE} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={OG_IMAGE} />
	{@html ld}
</svelte:head>

<article class="seo-page">
	<p class="crumbs"><a href="/">Poo Math</a> › Guides</p>
	<h1>Burning Man RV water &amp; pump-out guides</h1>
	<p>
		Short, practical answers to the questions that come up when you’re planning water and pump-outs
		for an RV at Burning Man. When you’re ready, the planner turns the rules of thumb into exact
		dates for your rig and crew.
	</p>
	<ul class="seo-list seo-list-lg">
		{#each GUIDES as g (g.slug)}
			<li>
				<a href="/guides/{g.slug}">{g.h1}</a>
				<span class="seo-list-desc">{g.description}</span>
			</li>
		{/each}
	</ul>
</article>
