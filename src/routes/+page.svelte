<script lang="ts">
	import {
		PRESETS,
		DEFAULT_PRESET,
		DEFAULT_PEOPLE,
		DEFAULT_EVTS,
		DEFAULT_GATES_ISO,
		DEFAULT_CLOSE_ISO,
		PHASES,
		PH_DOT,
		simulate,
		fmt,
		addDay,
		plural,
		peopleWord,
		womenWord,
		menWord,
		type Person,
		type KeyEvent,
		type SimEvent,
		type Marker
	} from '$lib/model';
	import { monteCarlo, weatherRisk, WEATHER } from '$lib/montecarlo';
	import { POO_FACTS } from '$lib/facts';
	import TankChart from '$lib/components/TankChart.svelte';

	/* ---------- SEO ---------- */
	const SITE_URL = 'https://poomath.com/';
	const OG_IMAGE = 'https://poomath.com/og.png';
	const SEO_TITLE = 'Poo Math — Burning Man RV pump-out & water planner';
	const SEO_DESC =
		'Figure out how many RV gray/black pump-outs and fresh-water refills you need for Burning Man — when, and the risk around it.';
	// Injected via {@html} because a literal <script> with JSON braces can't sit
	// directly in Svelte markup. WebApplication schema for a free web tool.
	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Poo Math',
		url: SITE_URL,
		description: SEO_DESC,
		applicationCategory: 'UtilitiesApplication',
		operatingSystem: 'Web',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
	})}<\/script>`;

	// FAQ — rendered visibly below and emitted as FAQPage schema from this same
	// source, so the structured data always matches the on-page content.
	const FAQ = [
		{
			q: 'How much water do you need per person per day at Burning Man?',
			a: 'Plan for roughly 6–8 gallons per person per day in an RV, and showers dominate. At Poo Math’s defaults — a 1.6 gallon-per-minute shower for about 3 minutes — one person uses 5–6 gallons of greywater from washing alone, before drinking water, dishes, and toilet flushes.'
		},
		{
			q: 'How often do you need to pump out RV tanks at Burning Man?',
			a: 'Usually every 2–4 days, set by whichever tank fills first — typically the gray tank, because showers dominate. A 35-gallon gray tank shared by 2–3 people fills in about 2–3 days. Poo Math triggers a service at 95% full and schedules pump-out trucks across build, event, and strike.'
		},
		{
			q: 'Can you dump RV greywater or blackwater on the playa?',
			a: 'No. Burning Man’s Leave No Trace rules prohibit draining any greywater or blackwater onto the playa. You must keep it in your tanks and have it removed by a licensed pump-out truck, or haul it out yourself. Dumping on the ground is a serious violation.'
		},
		{
			q: 'How big are RV black and gray water tanks?',
			a: 'Most rentals hold about 25–45 gallons each for gray and black. A mid-size travel trailer is around 35 gallons gray and 35 gallons black; compact campers can be 15–20. Poo Math includes presets for common Cruise America, El Monte, Airstream, and trailer models.'
		},
		{
			q: 'How much fresh water should you bring for an RV at Burning Man?',
			a: 'Your fresh tank rarely lasts the week, so plan refills. Fresh use roughly equals gray plus black output — about 6–8 gallons per person per day. A 45-gallon fresh tank serving two people lasts only about 3 days, so Poo Math schedules water deliveries before you run dry.'
		}
	];
	const faqLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: FAQ.map((f) => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: { '@type': 'Answer', text: f.a }
		}))
	})}<\/script>`;

	/* ---------- rig ---------- */
	let preset = $state(DEFAULT_PRESET);
	let model = $state(PRESETS[DEFAULT_PRESET].label);
	let freshCap = $state(PRESETS[DEFAULT_PRESET].f ?? 45);
	let grayCap = $state(PRESETS[DEFAULT_PRESET].g ?? 35);
	let blackCap = $state(PRESETS[DEFAULT_PRESET].b ?? 35);
	let grayTanks = $state(PRESETS[DEFAULT_PRESET].gt ?? 1);
	let blackTanks = $state(PRESETS[DEFAULT_PRESET].bt ?? 1);
	let amp = $state(PRESETS[DEFAULT_PRESET].a ?? '30');

	/* ---------- event window ---------- */
	let gatesISO = $state(DEFAULT_GATES_ISO);
	let closeISO = $state(DEFAULT_CLOSE_ISO);
	let includeBuild = $state(true);
	let includeStrike = $state(true);

	/* ---------- crew & key nights ---------- */
	let people = $state<Person[]>(DEFAULT_PEOPLE.map((p) => ({ ...p })));
	let events = $state<KeyEvent[]>(DEFAULT_EVTS.map((e) => ({ ...e })));

	/* ---------- water use ---------- */
	let flow = $state(1.6);
	let showW = $state(3);
	let showM = $state(2.5);
	let hand = $state(0.5);
	let dish = $state(1);
	let n1 = $state(0.15);
	let n2 = $state(0.8);
	let offload = $state(0);
	let pumpPct = $state(95);
	let refillLow = $state(10);
	let voucher = $state(75);

	/* ---------- monte carlo ---------- */
	let mcVar = $state(0.45);
	let mcSafe = $state(0.15);
	let mcWeather = $state('typical');

	/* ---------- summary ---------- */
	let copied = $state(false);

	/* ---------- poo fact ---------- */
	let factIdx = $state(0);

	/* ---------- derived model ---------- */
	const valves = $derived(grayTanks + blackTanks);
	const sim = $derived(
		simulate({
			freshCap,
			grayCap,
			blackCap,
			flow,
			showW,
			showM,
			hand,
			dish,
			n1,
			n2,
			offload,
			pumpPct,
			refillLow,
			voucher,
			gatesISO,
			closeISO,
			includeBuild,
			includeStrike,
			people,
			events
		})
	);

	const mc = $derived(sim ? monteCarlo(sim, mcVar, 1000, mcSafe) : null);
	const mcHistMax = $derived(mc ? Math.max(1, ...Object.values(mc.hist)) : 1);
	const wr = $derived.by(() => {
		if (!sim) return null;
		const w = WEATHER[mcWeather];
		if (!w || (w.pMajor <= 0 && w.lam <= 0)) return null;
		return weatherRisk(sim, mcVar, 1200, w);
	});

	const valveSub = $derived(valves > 2 ? 'has dual tank' : valves <= 1 ? 'single combined' : 'gray+black');

	/* Merge service events + key-night markers into one sorted timeline. */
	type TLPump = SimEvent & { k: 'p'; idx: number };
	type TLRefill = SimEvent & { k: 'r'; idx: number };
	type TLMarker = Marker & { k: 'm' };
	type TLItem = TLPump | TLRefill | TLMarker;
	const timeline = $derived.by<TLItem[]>(() => {
		if (!sim) return [];
		const merged: (
			| { kind: 'svc'; e: SimEvent }
			| { kind: 'mark'; m: Marker }
		)[] = [
			...sim.events.map((e) => ({ kind: 'svc' as const, e })),
			...sim.markers.map((m) => ({ kind: 'mark' as const, m }))
		];
		merged.sort((a, b) => {
			const da = a.kind === 'svc' ? a.e.date.getTime() : a.m.date.getTime();
			const db = b.kind === 'svc' ? b.e.date.getTime() : b.m.date.getTime();
			return da - db;
		});
		const out: TLItem[] = [];
		let pc = 0,
			rc = 0;
		for (const item of merged) {
			if (item.kind === 'mark') out.push({ ...item.m, k: 'm' });
			else if (item.e.type === 'p') out.push({ ...item.e, k: 'p', idx: ++pc });
			else out.push({ ...item.e, k: 'r', idx: ++rc });
		}
		return out;
	});

	const phaseRows = $derived.by(() => {
		if (!sim) return [];
		return PHASES.filter((p) => sim.phase[p].nights > 0).map((p) => {
			const d = sim.phase[p];
			const dates = d.first && d.last ? `${fmt(d.first)}–${fmt(addDay(d.last))}` : '—';
			return { p, d, dates };
		});
	});

	const mcSummaryText = $derived.by(() => {
		if (!mc) return '';
		const safePct = Math.round((1 - mcSafe) * 100);
		return `Most likely ${plural(mc.mode, 'pump-out')} · range ${mc.minK}–${mc.maxK} · plan for ${mc.p90} to cover 90% of scenarios. “Service by” keeps you ahead of the tank in ${safePct}% of cases.`;
	});

	const weatherBox = $derived.by(() => {
		if (!wr) return null;
		const ovf = Math.round(wr.overflowRate * 100);
		const worst = Math.round(wr.worstFull * 100);
		const label = ({ low: 'Low', typical: 'Typical', high: 'High' } as Record<string, string>)[mcWeather] ?? mcWeather;
		const rec =
			ovf >= 8
				? 'Dump the gray tank to empty before any rain in the forecast — a 2023-style 2–3 day lockdown would overflow it.'
				: ovf >= 3
					? 'Keep gray-tank margin during the event in case a closure hits.'
					: 'Closure overflow risk is low — just watch the forecast.';
		return { ovf, worst, label, rec };
	});

	/* ---------- results summary ---------- */
	const summary = $derived.by(() => {
		if (!sim) return null;
		const s = sim;
		const evs = s.events.slice().sort((a, b) => a.date.getTime() - b.date.getTime());
		const pumpDates = evs.filter((e) => e.type === 'p').map((e) => fmt(e.date)).join(', ') || 'none needed';
		const refillDates = evs.filter((e) => e.type === 'r').map((e) => fmt(e.date)).join(', ') || 'none needed';
		return { ev: s.phase.Event, pumpDates, refillDates, limiting: s.grayTrips >= s.blackTrips ? 'gray' : 'black' };
	});

	const summaryText = $derived.by(() => {
		if (!sim || !summary) return '';
		const s = sim;
		return `${model} · ${peopleWord(s.total)} (${womenWord(s.women)}, ${menWord(s.men)})
On playa ${fmt(s.start)}–${fmt(s.end)} (${s.nights} nights)

Pump-outs: ${s.pumpN} total (${summary.ev.pump} during event week) — ${s.grayCap} gal gray + ${s.blackCap} gal black, ${plural(valves, 'dump valve')} / 1 hookup
Water refills: ${s.refillN} total (${summary.ev.refill} during event week) — ${s.freshCap} gal fresh, ${s.voucher} gal/voucher
Shore power: ${amp} amp · Limiting tank: ${summary.limiting} fills first

Pump-out dates: ${summary.pumpDates}
Refill dates: ${summary.refillDates}`;
	});

	/* ---------- actions ---------- */
	function selectPreset(k: string) {
		preset = k;
		const p = PRESETS[k];
		if (!p || k === 'custom') return;
		freshCap = p.f ?? freshCap;
		grayCap = p.g ?? grayCap;
		blackCap = p.b ?? blackCap;
		grayTanks = p.gt ?? grayTanks;
		blackTanks = p.bt ?? blackTanks;
		amp = p.a ?? amp;
		model = p.label;
	}
	const markCustom = () => (preset = 'custom');

	function addPerson() {
		people.push({ id: crypto.randomUUID(), name: '', gender: 'W', arr: gatesISO, dep: closeISO, use: 1 });
	}
	function removePerson(i: number) {
		people.splice(i, 1);
	}
	function movePerson(i: number, dir: number) {
		const j = i + dir;
		if (j < 0 || j >= people.length) return;
		const tmp = people[i];
		people[i] = people[j];
		people[j] = tmp;
	}

	function addEvent() {
		events.push({ id: crypto.randomUUID(), date: gatesISO, label: 'New event', imp: false });
	}
	function removeEvent(i: number) {
		events.splice(i, 1);
	}

	function reset() {
		selectPreset(DEFAULT_PRESET);
		gatesISO = DEFAULT_GATES_ISO;
		closeISO = DEFAULT_CLOSE_ISO;
		includeBuild = true;
		includeStrike = true;
		flow = 1.6;
		showW = 3;
		showM = 2.5;
		hand = 0.5;
		dish = 1;
		n1 = 0.15;
		n2 = 0.8;
		offload = 0;
		pumpPct = 95;
		refillLow = 10;
		voucher = 75;
		mcVar = 0.45;
		mcSafe = 0.15;
		mcWeather = 'typical';
		people = DEFAULT_PEOPLE.map((p) => ({ ...p }));
		events = DEFAULT_EVTS.map((e) => ({ ...e }));
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(summaryText);
			copied = true;
			setTimeout(() => (copied = false), 1400);
		} catch {
			/* clipboard unavailable */
		}
	}

	function newFact() {
		let i = factIdx;
		while (i === factIdx && POO_FACTS.length > 1) i = Math.floor(Math.random() * POO_FACTS.length);
		factIdx = i;
	}
</script>

<svelte:head>
	<title>{SEO_TITLE}</title>
	<meta name="description" content={SEO_DESC} />
	<link rel="canonical" href={SITE_URL} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Poo Math" />
	<meta property="og:url" content={SITE_URL} />
	<meta property="og:title" content={SEO_TITLE} />
	<meta property="og:description" content={SEO_DESC} />
	<meta property="og:image" content={OG_IMAGE} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={SEO_TITLE} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={SEO_TITLE} />
	<meta name="twitter:description" content={SEO_DESC} />
	<meta name="twitter:image" content={OG_IMAGE} />
	<meta name="twitter:image:alt" content={SEO_TITLE} />

	{@html jsonLd}
	{@html faqLd}
</svelte:head>

<header>
	<div class="hwrap">
		<div class="htext">
			<div class="eyebrow">Burning Man RV · pump-outs &amp; water</div>
			<h1>Poo Math</h1>
			<p>
				How many gray/black pump-outs &amp; fresh-water refills does your rig need — and when? Name your
				crew (women &amp; men use water differently), pick your RV, split by Build / Event / Strike.
			</p>
		</div>
		<div class="hemoji" aria-hidden="true">💩</div>
	</div>
</header>

<main>
<div class="factbar">
	<span class="ft-ico">💩</span>
	<span class="ft-txt"><b>Poo fact:</b> {POO_FACTS[factIdx]}</span>
	<button class="ft-btn" onclick={newFact} title="another fact">↻ another</button>
</div>

<div class="wrap">
	<!-- ============ LEFT: INPUTS ============ -->
	<div>
		<div class="card">
			<h2>🔥 Event window &amp; phases</h2>
			<div class="grid2">
				<div class="field"><label for="gates">Gates open</label><input id="gates" type="date" bind:value={gatesISO} /></div>
				<div class="field"><label for="close">Event close / exodus</label><input id="close" type="date" bind:value={closeISO} /></div>
			</div>
			<div style="margin-top:12px">
				<label class="toggle-row"
					><input type="checkbox" bind:checked={includeBuild} /> Include
					<b style="color:var(--build)">pre-build</b> (nights before gates)</label
				>
				<label class="toggle-row"
					><input type="checkbox" bind:checked={includeStrike} /> Include
					<b style="color:var(--strike)">strike</b> (nights after close)</label
				>
			</div>
			<div class="hint">
				The <b style="color:var(--event)">Event</b> window is always planned. Nights before gates are
				<b style="color:var(--build)">Build</b>, nights after close are
				<b style="color:var(--strike)">Strike</b> — switch those on only if your crew is there for them.
				Camp service usually runs during Event only.
			</div>
		</div>

		<div class="card">
			<h2>🎇 Key nights / burns</h2>
			<table>
				<thead><tr><th>Date</th><th>Label</th><th style="text-align:center">⭐ Key</th><th></th></tr></thead>
				<tbody>
					{#each events as e, i (e.id)}
						<tr class="evt-row">
							<td><input class="mid" type="date" aria-label="Event date" bind:value={e.date} /></td>
							<td><input type="text" aria-label="Event label" bind:value={e.label} /></td>
							<td style="text-align:center"
								><input type="checkbox" aria-label="Mark as key night" bind:checked={e.imp} /></td
							>
							<td><button class="btn-x" title="remove" onclick={() => removeEvent(i)}>✕</button></td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="toolbar">
				<button class="btn-ghost" onclick={addEvent}>+ Add event</button>
				<span class="hint" style="align-self:center"
					>⭐ Key → shown bold on the chart with a tank-status check so you can service <i>before</i> the
					big night.</span
				>
			</div>
		</div>

		<div class="card">
			<h2>🚐 Trailer / RV</h2>
			<div class="field">
				<label for="preset">Pick a type (fills typical specs — then tweak)</label>
				<select id="preset" value={preset} onchange={(e) => selectPreset(e.currentTarget.value)}>
					{#each Object.entries(PRESETS) as [k, v] (k)}
						<option value={k}>{v.label}</option>
					{/each}
				</select>
			</div>
			<div class="field" style="margin-top:10px">
				<label for="model">Model / name</label><input id="model" type="text" bind:value={model} />
			</div>
			<div class="grid3" style="margin-top:10px">
				<div class="field"><label for="freshCap">Fresh (gal)</label><input id="freshCap" type="number" min="0" bind:value={freshCap} oninput={markCustom} /></div>
				<div class="field"><label for="grayCap">Gray (gal)</label><input id="grayCap" type="number" min="0" bind:value={grayCap} oninput={markCustom} /></div>
				<div class="field"><label for="blackCap">Black (gal)</label><input id="blackCap" type="number" min="0" bind:value={blackCap} oninput={markCustom} /></div>
			</div>
			<div class="grid3" style="margin-top:10px">
				<div class="field"><label for="grayTanks"># Gray tanks</label><input id="grayTanks" type="number" min="0" bind:value={grayTanks} oninput={markCustom} /></div>
				<div class="field"><label for="blackTanks"># Black tanks</label><input id="blackTanks" type="number" min="0" bind:value={blackTanks} oninput={markCustom} /></div>
				<div class="field">
					<label for="amp">Shore power amp</label>
					<select id="amp" bind:value={amp} onchange={markCustom}>
						<option value="20">20</option>
						<option value="30">30</option>
						<option value="50">50</option>
					</select>
				</div>
			</div>
			<div class="hint">
				Valves = gray + black tanks · all drain to 1 sewer hookup →
				<b>{plural(valves, 'valve')} / 1 hookup</b>
			</div>
		</div>

		<div class="card">
			<h2>👥 Who’s in the rig</h2>
			<div>
				{#each people as p, i (p.id)}
					<div class="p-card">
						<div class="p-l1">
							<input class="p-name" type="text" placeholder="name" bind:value={p.name} />
							<select class="p-gender {p.gender}" aria-label="Gender" bind:value={p.gender}>
								<option value="W">♀ Woman</option>
								<option value="M">♂ Man</option>
							</select>
							<span class="p-acts">
								<button class="btn-mv" title="move up" onclick={() => movePerson(i, -1)}>▲</button>
								<button class="btn-mv" title="move down" onclick={() => movePerson(i, 1)}>▼</button>
								<button class="btn-x" title="remove" onclick={() => removePerson(i)}>✕</button>
							</span>
						</div>
						<div class="p-l2">
							<div><label for="arr-{i}">Arrives</label><input id="arr-{i}" type="date" bind:value={p.arr} /></div>
							<div><label for="dep-{i}">Departs</label><input id="dep-{i}" type="date" bind:value={p.dep} /></div>
							<div><label for="use-{i}">Use ×</label><input id="use-{i}" type="number" step="0.05" min="0" bind:value={p.use} /></div>
						</div>
					</div>
				{/each}
			</div>
			<div class="toolbar" style="align-items:center;justify-content:space-between">
				<button class="btn-ghost" onclick={addPerson}>+ Add person</button>
				{#if sim}
					<span class="crewsum"
						>{peopleWord(sim.total)} · <b style="color:var(--woman)">{sim.women}♀</b> /
						<b style="color:var(--man)">{sim.men}♂</b> · peak {sim.peakCnt} aboard</span
					>
				{:else}
					<span class="crewsum">add at least one person</span>
				{/if}
			</div>
			<div class="hint" style="margin-top:8px">
				Each person has their own arrive/depart dates, so solo stretches &amp; overlaps are handled
				automatically. Gender sets a default shower length (below); <b>Use ×</b> nudges one person up/down
				(heavier user ≈1.3, lighter ≈0.8).
			</div>
		</div>

		<div class="card">
			<h2>💧 Water use</h2>
			<h3>Showers (the big gender difference)</h3>
			<div class="grid3">
				<div class="field"><label for="flow">Shower flow (gal/min)</label><input id="flow" type="number" step="0.1" bind:value={flow} /></div>
				<div class="field"><label for="showW">♀ Woman min/day</label><input id="showW" type="number" step="0.5" bind:value={showW} /></div>
				<div class="field"><label for="showM">♂ Man min/day</label><input id="showM" type="number" step="0.5" bind:value={showM} /></div>
			</div>
			<div class="hint">
				Playa-conservative defaults (short navy showers). Bump these up if folks shower fully every day →
				watch the pumpouts climb.
			</div>
			<h3>Sink → gray (per person · night, gal)</h3>
			<div class="grid2">
				<div class="field"><label for="hand">🧼 Hand-wash</label><input id="hand" type="number" step="0.1" bind:value={hand} /></div>
				<div class="field"><label for="dish">🍽️ Dishes</label><input id="dish" type="number" step="0.1" bind:value={dish} /></div>
			</div>
			<h3>Toilet → black (per person · night)</h3>
			<div class="grid3">
				<div class="field"><label for="n1">💧 #1 flush (gal)</label><input id="n1" type="number" step="0.05" bind:value={n1} /></div>
				<div class="field"><label for="n2">💩 #2 flush (gal)</label><input id="n2" type="number" step="0.05" bind:value={n2} /></div>
				<div class="field">
					<label for="porta">🚽 Porta-potty offload</label>
					<select id="porta" bind:value={offload}>
						<option value={0}>None (all in RV)</option>
						<option value={0.33}>Some (~⅓)</option>
						<option value={0.66}>A lot (~⅔)</option>
					</select>
				</div>
			</div>
			<div class="hint">
				Black = 6×#1 + 1×#2 per person/day (EPA: ~5 flushes/day, ~6:1 #1:#2). Gravity-toilet volumes —
				cassette/electric is far less (~0.07 gal/flush), macerating more (~0.85).
			</div>
			<div class="hint">
				Drinking &amp; cooking water is assumed bottled/jugged (brought separately) — not drawn from the
				fresh tank, so it doesn’t count toward water refills. <b>Porta-potty offload</b> (default none — set
				it to your own habit) cuts black-tank fill &amp; saves flush water. The exact share is anecdotal,
				not measured.
			</div>
			{#if sim}
				<div class="callout">
					{#if sim.fillDays > 0}
						📏 Reality check: at peak occupancy ({sim.peakCnt} aboard) your gray tank fills about
						<b>every {sim.fillDays.toFixed(1)} days</b>. Tune the shower/sink numbers until that matches
						what you’ve actually seen.
					{:else}
						Add tank capacity &amp; crew to see the reality check.
					{/if}
				</div>
			{/if}
			<h3>Service triggers</h3>
			<div class="grid3">
				<div class="field"><label for="pumpPct">Pump at % full</label><input id="pumpPct" type="number" min="50" max="100" bind:value={pumpPct} /></div>
				<div class="field"><label for="refillLow">Refill below (gal)</label><input id="refillLow" type="number" min="0" bind:value={refillLow} /></div>
				<div class="field"><label for="voucher">Refill voucher (gal)</label><input id="voucher" type="number" min="1" bind:value={voucher} /></div>
			</div>
			<div style="margin-top:10px"><button class="btn-ghost" style="width:100%" onclick={reset}>↺ Reset to defaults</button></div>
			<div class="callout">
				🚱 Gray water can’t be dumped on the playa (Leave No Trace) — it’s tank-limited. During
				build/strike you’re likely self-servicing, so watch those phase counts.
			</div>
			<details style="margin-top:12px">
				<summary>📚 Data behind these numbers</summary>
				<div class="srcs hint" style="margin-top:8px;line-height:1.8">
					Defaults scale metered residential data down to playa conservation (no gray dumping → every
					gallon in is waste you pump out):<br />
					· <a href="https://survival.burningman.org/survival-health-and-safety/survival/" target="_blank" rel="noopener">Burning Man Survival Guide</a> — 1.5 gal/person/day (all uses)<br />
					· <a href="https://burningman.org/black-rock-city/preparation/camping-tips/gray-water/" target="_blank" rel="noopener">Burning Man — Gray Water</a> — zero dumping on the playa<br />
					· <a href="https://www.circleofblue.org/wp-content/uploads/2016/04/WRF_REU2016.pdf" target="_blank" rel="noopener">Residential End Uses of Water (REU2016)</a> — shower 2.1 gpm × 7.8 min baseline<br />
					· <a href="https://theharrispoll.com/articles/shower-habits/" target="_blank" rel="noopener">Harris Poll — Shower Habits</a> — women 16.8 vs men 15.4 min (~1.4 min gap)<br />
					· <a href="https://www.thervgeeks.com/how-much-water-does-an-rv-toilet-use-per-flush/" target="_blank" rel="noopener">RV Geeks — RV toilet flush</a> — #1 ~0.15 gal, #2 ~0.75–1 gal (gravity)<br />
					· <a href="https://www.epa.gov/watersense/bathroom-faucets" target="_blank" rel="noopener">EPA WaterSense</a> — faucet 1.5–2.2 gpm; ~5 flushes/day &amp; ~0.2 gal/hand-wash basis<br />
					· <a href="https://www.boondockersbible.com/learn/how-much-water-do-i-need-for-boondocking/" target="_blank" rel="noopener">Boondocker's Bible</a> — conservation per-activity split
				</div>
			</details>
		</div>
	</div>

	<!-- ============ RIGHT: RESULTS ============ -->
	<div>
		<div class="card">
			<h2>📊 What you need — totals</h2>
			<div class="cards">
				<div class="stat pump"><div class="big">{sim ? sim.pumpN : '–'}</div><div class="lab">Pumpouts</div><div class="sub">{sim ? 'over the whole stay' : ''}</div></div>
				<div class="stat refill"><div class="big">{sim ? sim.refillN : '–'}</div><div class="lab">Water refills</div><div class="sub">{sim ? 'over the whole stay' : ''}</div></div>
				<div class="stat amp"><div class="big">{amp}A</div><div class="lab">Shore power</div><div class="sub">hookup</div></div>
				<div class="stat valve"><div class="big">{valves} / 1</div><div class="lab">Valves / hookup</div><div class="sub">{valveSub}</div></div>
			</div>
			{#if sim}
				<div class="row-flex" style="margin-top:12px">
					<span class="pill">{fmt(sim.start)} – {fmt(sim.end)} · {sim.nights} nights</span>
					<span class="pill">{sim.personNights} person-nights</span>
					<span class="pill">Limiting tank: {sim.grayTrips >= sim.blackTrips ? 'gray' : 'black'}</span>
				</div>
			{/if}
		</div>

		<div class="card">
			<h2>🔨🔥🧹 Split by phase</h2>
			<table class="phtable">
				<thead><tr><th class="lft">Phase</th><th>Dates</th><th>Nights</th><th>Ppl-nts</th><th>Pumpouts</th><th>Refills</th></tr></thead>
				<tbody>
					{#each phaseRows as { p, d, dates } (p)}
						<tr class={p}>
							<td class="lft"><span class="tag" style="background:{PH_DOT[p]}"></span>{p}</td>
							<td>{dates}</td>
							<td>{d.nights}</td>
							<td>{d.pn}</td>
							<td><b style="color:var(--burn2)">{d.pump}</b></td>
							<td><b style="color:var(--fresh)">{d.refill}</b></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="card">
			<h2>🎲 Pump-out risk · Monte Carlo</h2>
			<div class="grid3">
				<div class="field">
					<label for="mcVar">Daily variability</label>
					<select id="mcVar" bind:value={mcVar}>
						<option value={0.25}>Steady</option>
						<option value={0.45}>Normal</option>
						<option value={0.7}>Variable</option>
					</select>
				</div>
				<div class="field">
					<label for="mcSafe">Safety margin</label>
					<select id="mcSafe" bind:value={mcSafe}>
						<option value={0.5}>Relaxed (P50)</option>
						<option value={0.15}>Safe (85%)</option>
						<option value={0.05}>Very safe (95%)</option>
					</select>
				</div>
				<div class="field">
					<label for="mcWeather">Weather closures</label>
					<select id="mcWeather" bind:value={mcWeather}>
						<option value="off">Off</option>
						<option value="low">Low (7%)</option>
						<option value="typical">Typical (10%)</option>
						<option value="high">High (15%)</option>
					</select>
				</div>
			</div>
			{#if mc}
				<div class="callout" style="margin-top:10px">{mcSummaryText}</div>
				<table class="phtable" style="margin-top:4px">
					<thead><tr><th class="lft">Pump-out</th><th>Likely date</th><th>Service by</th><th>Chance</th></tr></thead>
					<tbody>
						{#each mc.cycles as c (c.k)}
							<tr>
								<td class="lft">#{c.k}</td>
								<td>{fmt(c.likely)}</td>
								<td><b style="color:var(--burn2)">{fmt(c.safe)}</b></td>
								<td>{Math.round(c.needed * 100)}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<div class="hint" style="margin-top:10px">
					Pump-out count across <b>1000</b> random scenarios (each varies daily showers &amp; dishes):
				</div>
				<div style="display:flex;align-items:flex-end;gap:6px;height:74px;margin-top:6px">
					{#each Array(mc.maxK - mc.minK + 1) as _, k (k)}
						{const n = mc.minK + k}
						{const f = mc.hist[n] ?? 0}
						<div class="mch">
							<span class="bv">{Math.round((f / mc.trials) * 100)}%</span>
							<div
								class="bar"
								style="height:{Math.max(2, Math.round((f / mcHistMax) * 46))}px{n === mc.mode
									? ';background:linear-gradient(180deg,#5fe6ff,#3fb6e0)'
									: ''}"
							></div>
							<span class="bl">{n}</span>
						</div>
					{/each}
				</div>
				<div class="hint" style="margin-top:8px">
					“Service by” = dump early enough to stay ahead of the gray tank in your chosen % of scenarios.
				</div>
			{/if}
			{#if weatherBox}
				<div class="callout warn" style="margin-top:10px">
					🌧️ <b>Weather closure risk ({weatherBox.label}):</b> ~<b style="color:var(--burn2)"
						>{weatherBox.ovf}%</b
					>
					chance a no-driving spell (rain/mud) overflows the gray tank before trucks return · worst-case
					fill <b>{weatherBox.worst}%</b>. {weatherBox.rec}
				</div>
			{/if}
			<details style="margin-top:10px">
				<summary>🌧️ Playa weather history &amp; closure sources</summary>
				<div class="srcs hint" style="margin-top:8px;line-height:1.8">
					Rain falls in the event window roughly <b>1 in 3 years</b> (usually ≤0.25 in); driving was
					meaningfully impacted in <b>5 of the last 14 events</b> (2014, 2015, 2023, 2024, 2025) — but
					only <b>2023</b> was a true multi-day lockdown (~0.5–0.8 in over ~24 h, ~2.5–3 days no driving).
					September averages just ~0.2–0.3 in. Track it yourself:<br />
					· <a href="https://xmacis.rcc-acis.org/" target="_blank" rel="noopener">xmACIS2 / RCC-ACIS</a> — official NOAA station data (Gerlach COOP USC00263090 through 2018; Reno KRNO USW00023185)<br />
					· <a href="https://www.gerlachweather.com/" target="_blank" rel="noopener">gerlachweather.com</a> — nearest year-round station to Black Rock City<br />
					· <a href="https://airport.burningman.org/weather/" target="_blank" rel="noopener">BRC Airport (88NV) weather</a> — on-playa tower station, webcam &amp; brcweather.com forecast<br />
					· <a href="https://eplanning.blm.gov/public_projects/nepa/93518/168663/205281/Public_Health_and_Safety_at_the_Burning_Man_Event.pdf" target="_blank" rel="noopener">BLM</a> — ~0.25 in makes the playa undrivable (halts truck service)<br />
					· <a href="https://www.cnn.com/2023/09/04/us/burning-man-storms-shelter-monday/index.html" target="_blank" rel="noopener">CNN</a> — 2023 driving ban lifted Mon Sep 4 (~2.5–3 days)
				</div>
			</details>
		</div>

		<div class="card">
			<h2>📈 Tank levels over the trip</h2>
			<TankChart {sim} />
			<div class="legend">
				<span><i class="sw" style="background:var(--fresh)"></i>Fresh</span>
				<span><i class="sw" style="background:var(--gray)"></i>Gray</span>
				<span><i class="sw" style="background:var(--black)"></i>Black</span>
				<span><i class="sw" style="background:var(--burn)"></i>Pumpout</span>
				<span><i class="sw" style="background:#7fe8ff"></i>Refill</span>
				<span><i class="sw" style="background:#d9a441"></i>Build</span>
				<span><i class="sw" style="background:#ff6a2e"></i>Event</span>
				<span><i class="sw" style="background:#8aa0b8"></i>Strike</span>
				<span><i class="sw" style="background:var(--burn2);border-radius:0;width:3px;height:13px"></i>⭐ Key</span>
			</div>
		</div>

		<div class="card">
			<h2>🗓️ Service &amp; event timeline</h2>
			<div class="events">
				{#if !timeline.length}
					<div class="ev">Nothing scheduled with these settings.</div>
				{/if}
				{#each timeline as it (it.k + '-' + it.date.getTime() + '-' + ('idx' in it ? it.idx : it.label))}
					{#if it.k === 'p'}
						<div class="ev p">
							<span class="dot"></span><span class="when">{fmt(it.date)}</span>
							<span class="ph {it.ph}">{it.ph}</span>
							<span>Pumpout #{it.idx}{it.final ? ' (pre-departure)' : ''}</span>
							<span class="tank"
								>gray {Math.round(it.gray ?? 0)} · black {Math.round(it.black ?? 0)}{it.by && !it.final
									? ` · ${it.by} full`
									: ''}</span
							>
						</div>
					{:else if it.k === 'r'}
						<div class="ev r">
							<span class="dot"></span><span class="when">{fmt(it.date)}</span>
							<span class="ph {it.ph}">{it.ph}</span>
							<span>Water refill #{it.idx}</span>
							<span class="tank">tank → {Math.round(it.fresh ?? 0)} gal</span>
						</div>
					{:else}
						<div class="ev m {it.imp ? 'imp' : ''}">
							<span class="dot"></span><span class="when">{fmt(it.date)}</span>
							<span class="ph {it.ph}">{it.ph}</span>
							<span>{it.imp ? '⭐ ' : ''}{it.label}</span>
							<span class="tank"
								>{it.lvl
									? `fresh ${Math.round(it.lvl.fresh)} · gray ${Math.round(it.lvl.gray)} · black ${Math.round(it.lvl.black)}`
									: '—'}</span
							>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<div class="card">
			<div class="row-flex">
				<h2 style="margin:0">🧾 Summary</h2>
				<button class="btn" onclick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
			</div>
			{#if sim && summary}
				<p class="sum-lead">
					<b>{model}</b> · {peopleWord(sim.total)} (<b style="color:var(--woman)">{sim.women}♀</b> /
					<b style="color:var(--man)">{sim.men}♂</b>) · on playa
					<b>{fmt(sim.start)} – {fmt(sim.end)}</b> ({sim.nights} nights)
				</p>
				<ul class="sum-list">
					<li>
						<span class="sum-k">Pump-outs</span>
						<span class="sum-v"
							><b style="color:var(--burn2)">{sim.pumpN}</b> total
							<span class="sum-sub">({summary.ev.pump} during event week)</span> — {sim.grayCap} gal gray
							+ {sim.blackCap} gal black</span
						>
					</li>
					<li>
						<span class="sum-k">Water refills</span>
						<span class="sum-v"
							><b style="color:var(--fresh)">{sim.refillN}</b> total
							<span class="sum-sub">({summary.ev.refill} during event week)</span> — {sim.freshCap} gal
							fresh, {sim.voucher} gal/voucher</span
						>
					</li>
					<li>
						<span class="sum-k">Hookups</span>
						<span class="sum-v">{plural(valves, 'dump valve')} / 1 sewer · {amp} amp shore power</span>
					</li>
					<li>
						<span class="sum-k">Limiting tank</span>
						<span class="sum-v">{summary.limiting} fills first</span>
					</li>
					<li>
						<span class="sum-k">Pump-out dates</span>
						<span class="sum-v">{summary.pumpDates}</span>
					</li>
					<li>
						<span class="sum-k">Refill dates</span>
						<span class="sum-v">{summary.refillDates}</span>
					</li>
				</ul>
			{:else}
				<p class="sum-lead">Add at least one person to see your summary.</p>
			{/if}
		</div>
	</div>
</div>

<section class="faq">
	<h2>🚐 Burning Man RV water &amp; pump-out FAQ</h2>
	{#each FAQ as item (item.q)}
		<details class="faq-q">
			<summary>{item.q}</summary>
			<p>{item.a}</p>
		</details>
	{/each}
</section>
</main>
