<script lang="ts">
	import { SITE_URL, SITE_NAME, OG_IMAGE, ldScript, RV_PAGES } from '$lib/seo';

	const url = `${SITE_URL}/rv`;
	const title = 'RV water & holding-tank capacities for Burning Man';
	const desc =
		'Fresh, gray, and black tank capacities for common RVs and trailers — Cruise America, El Monte, Airstream, fifth wheels and more — with pump-out and water planning for Burning Man.';
	const ld = ldScript({
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: title,
		itemListElement: RV_PAGES.map((r, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: r.name,
			url: `${SITE_URL}/rv/${r.slug}`
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
	<p class="crumbs"><a href="/">Poo Math</a> › RV water specs</p>
	<h1>RV water &amp; holding-tank capacities for Burning Man</h1>
	<p>
		Fresh, gray, and black tank sizes for common rental and tow rigs. Pick yours to see its
		capacities and a rough pump-out and water-refill cadence, then open the planner prefilled for
		that rig.
	</p>
	<table class="specs specs-wide">
		<thead>
			<tr><th scope="col">RV / trailer</th><th scope="col">Fresh</th><th scope="col">Gray</th><th scope="col">Black</th></tr>
		</thead>
		<tbody>
			{#each RV_PAGES as r (r.slug)}
				<tr>
					<td><a href="/rv/{r.slug}">{r.name}</a></td>
					<td>{r.fresh}</td>
					<td>{r.gray}</td>
					<td>{r.black > 0 ? r.black : '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="seo-foot">All capacities in US gallons. <a href="/">Open the planner →</a></p>
</article>
