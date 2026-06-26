<script lang="ts">
	import { SITE_URL, SITE_NAME, OG_IMAGE, ldScript, RV_PAGES } from '$lib/seo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const p = $derived(data.page);

	const url = $derived(`${SITE_URL}/rv/${p.slug}`);
	const title = $derived(`${p.name} — RV water & tank capacity for Burning Man`);
	const desc = $derived(
		p.black > 0
			? `The ${p.name} holds ${p.fresh} gal fresh, ${p.gray} gal gray, and ${p.black} gal black. See how many pump-outs and water refills it needs for Burning Man and plan your trip.`
			: `The ${p.name} holds ${p.fresh} gal fresh and ${p.gray} gal gray, with no black tank. See how much water it needs for Burning Man and plan your trip.`
	);
	const tankPhrase = $derived(
		p.black > 0
			? `a ${p.black}-gallon black tank`
			: 'no black tank (you’ll rely on the playa porta-potties)'
	);
	const para1 = $derived(
		`With a ${p.gray}-gallon gray tank and ${tankPhrase}, the ${p.name} is set up for self-contained camping. Gray almost always fills first at Burning Man because showers and sinks generate the most water, so a crew of two or three can expect a pump-out roughly every ${p.grayDays}–${p.grayDays + 1} days.`
	);
	const para2 = $derived(
		`Its ${p.fresh}-gallon fresh tank covers about ${p.freshDays}–${p.freshDays + 1} days for that crew before you’ll want a water delivery or refill, since fresh use tracks gray plus black output. These are rough averages — plug the ${p.name} into the planner for exact pump-out and refill dates based on your dates, crew, and shower habits.`
	);
	const related = $derived(RV_PAGES.filter((r) => r.slug !== p.slug).slice(0, 6));
	const ld = $derived(
		ldScript({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Poo Math', item: `${SITE_URL}/` },
				{ '@type': 'ListItem', position: 2, name: 'RV water specs', item: `${SITE_URL}/rv` },
				{ '@type': 'ListItem', position: 3, name: p.name, item: url }
			]
		})
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={desc} />
	<meta property="og:image" content={OG_IMAGE} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={desc} />
	<meta name="twitter:image" content={OG_IMAGE} />
	{@html ld}
</svelte:head>

<article class="seo-page">
	<p class="crumbs"><a href="/">Poo Math</a> › <a href="/rv">RV water specs</a> › {p.name}</p>
	<h1>{p.name}: water &amp; holding-tank capacity for Burning Man</h1>

	<table class="specs">
		<tbody>
			<tr><th scope="row">Fresh water</th><td>{p.fresh} gal</td></tr>
			<tr
				><th scope="row">Gray tank</th><td
					>{p.gray} gal{p.grayTanks > 1 ? ` (${p.grayTanks} tanks)` : ''}</td
				></tr
			>
			<tr><th scope="row">Black tank</th><td>{p.black > 0 ? `${p.black} gal` : 'none'}</td></tr>
			<tr><th scope="row">Shore power</th><td>{p.amp} amp</td></tr>
		</tbody>
	</table>

	<p>{para1}</p>
	<p>{para2}</p>

	<a class="cta" href="/?rv={p.key}">Plan the {p.name} in the calculator →</a>

	<h2>Other rigs</h2>
	<ul class="seo-list">
		{#each related as r (r.slug)}
			<li><a href="/rv/{r.slug}">{r.name}</a></li>
		{/each}
	</ul>
</article>
