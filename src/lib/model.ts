/**
 * Poo Math — water/waste model.
 *
 * A grounded estimate of how many gray/black pump-outs and fresh-water refills
 * an RV needs across a Burning Man stay. All rates are per person per night
 * unless noted. Drinking/cooking water is assumed bottled (brought separately),
 * so it does not count toward fresh-tank refills.
 */

export type Gender = 'W' | 'M';

export interface Person {
	id: string; // stable identity for keyed {#each} (rows can reorder / be removed)
	name: string;
	gender: Gender;
	arr: string; // ISO yyyy-mm-dd
	dep: string; // ISO yyyy-mm-dd
	use: number; // per-person multiplier (1 = typical)
}

export interface KeyEvent {
	id: string; // stable identity for keyed {#each} (rows can be removed)
	date: string; // ISO yyyy-mm-dd
	label: string;
	imp: boolean; // ⭐ marquee event — drawn bold on the chart
}

export interface Preset {
	label: string;
	f?: number; // fresh gal
	g?: number; // gray gal
	b?: number; // black gal
	gt?: number; // gray tanks
	bt?: number; // black tanks
	a?: string; // shore-power amp
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const parseD = (s: string): Date => {
	const [y, m, d] = s.split('-').map(Number);
	return new Date(y, m - 1, d);
};
export const fmt = (d: Date): string => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
export const fmtDow = (d: Date): string => `${DOW[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
export const addDay = (d: Date): Date => {
	const n = new Date(d);
	n.setDate(n.getDate() + 1);
	return n;
};
export const toISO = (d: Date): string =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const PHASES = ['Build', 'Event', 'Strike'] as const;
export type Phase = (typeof PHASES)[number];
export const PH_COL: Record<Phase, string> = {
	Build: 'rgba(217,164,65,.16)',
	Event: 'rgba(255,106,46,.18)',
	Strike: 'rgba(138,160,184,.15)'
};
export const PH_DOT: Record<Phase, string> = { Build: '#d9a441', Event: '#ff6a2e', Strike: '#8aa0b8' };

/* ---- typical RV/trailer presets ---- */
export const PRESETS: Record<string, Preset> = {
	tt_mid: { label: 'Mid travel trailer (24–28 ft)', f: 45, g: 35, b: 35, gt: 1, bt: 1, a: '30' },
	tt_small: { label: 'Small travel trailer (≤22 ft)', f: 30, g: 25, b: 25, gt: 1, bt: 1, a: '30' },
	tt_large: { label: 'Large travel trailer (30 ft+)', f: 52, g: 40, b: 40, gt: 1, bt: 1, a: '30' },
	// Cruise America (independent, employee-owned) — fleet codes; specs from their own spec pages.
	cruise_america_compact: { label: 'Cruise America — Compact Plus (C21)', f: 21, g: 16, b: 17, gt: 1, bt: 1, a: '30' },
	cruise_america_standard: { label: 'Cruise America — Standard (C25)', f: 40, g: 25, b: 25, gt: 1, bt: 1, a: '30' },
	cruise_america_large: { label: 'Cruise America — Large (C30)', f: 40, g: 22, b: 25, gt: 1, bt: 1, a: '30' },
	cruise_america_truck_camper: { label: 'Cruise America — Truck Camper (T17)', f: 22, g: 15, b: 16, gt: 1, bt: 1, a: '30' },
	// El Monte RV (thl-owned) — separate fleet, rents Class C through Class A.
	elmonte_classc_small: { label: 'El Monte — Class C Small (C22)', f: 31, g: 31, b: 24, gt: 1, bt: 1, a: '30' },
	elmonte_classc_large: { label: 'El Monte — Class C Large (C28)', f: 40, g: 31, b: 31, gt: 1, bt: 1, a: '30' },
	elmonte_classc_family_sleeper: { label: 'El Monte — Class C Family Sleeper (FS31)', f: 31, g: 30, b: 39, gt: 1, bt: 1, a: '30' },
	elmonte_classa: { label: 'El Monte — Class A Family Sleeper (AF33)', f: 50, g: 38, b: 38, gt: 1, bt: 1, a: '50' },
	teardrop: { label: 'Teardrop / tiny trailer', f: 21, g: 20, b: 0, gt: 1, bt: 0, a: '30' },
	popup: { label: 'Pop-up / tent camper', f: 20, g: 12, b: 0, gt: 1, bt: 0, a: '30' },
	airstream: { label: 'Airstream (25–27 ft)', f: 54, g: 37, b: 39, gt: 1, bt: 1, a: '30' },
	fifthwheel: { label: 'Fifth wheel', f: 66, g: 80, b: 45, gt: 2, bt: 1, a: '50' },
	toyhauler: { label: 'Toy hauler', f: 98, g: 82, b: 45, gt: 2, bt: 1, a: '50' },
	classa: { label: 'Class A motorhome', f: 90, g: 55, b: 45, gt: 1, bt: 1, a: '50' },
	classb: { label: 'Class B campervan', f: 25, g: 20, b: 5, gt: 1, bt: 1, a: '30' },
	classc: { label: 'Class C motorhome', f: 45, g: 35, b: 35, gt: 1, bt: 1, a: '30' },
	custom: { label: 'Custom…' }
};
export const DEFAULT_PRESET = 'tt_mid';

/* Generic defaults — Burning Man 2026 event week (Aug 30 – Sep 7). */
export const DEFAULT_GATES_ISO = '2026-08-30';
export const DEFAULT_CLOSE_ISO = '2026-09-07';

export const DEFAULT_PEOPLE: Person[] = [
	{ id: 'person-1', name: 'Person 1', gender: 'W', arr: '2026-08-30', dep: '2026-09-07', use: 1 },
	{ id: 'person-2', name: 'Person 2', gender: 'M', arr: '2026-08-30', dep: '2026-09-07', use: 1 }
];

export const DEFAULT_EVTS: KeyEvent[] = [
	{ id: 'evt-gates', date: '2026-08-30', label: 'Gates open', imp: false },
	{ id: 'evt-man', date: '2026-09-05', label: '🔥 Man Burn', imp: true },
	{ id: 'evt-temple', date: '2026-09-06', label: '🛕 Temple Burn', imp: false },
	{ id: 'evt-exodus', date: '2026-09-07', label: 'Exodus', imp: false }
];

/* ---------- simulation ---------- */

export interface SimInput {
	freshCap: number;
	grayCap: number;
	blackCap: number;
	flow: number; // shower gal/min
	showW: number; // woman shower min/day
	showM: number; // man shower min/day
	hand: number; // hand-wash gal → gray
	dish: number; // dishes gal → gray
	n1: number; // #1 flush gal → black
	n2: number; // #2 flush gal → black
	offload: number; // porta-potty offload fraction (0–1)
	pumpPct: number; // pump trigger as fraction (0.95)
	refillLow: number; // refill when fresh < this many gal
	voucher: number; // refill voucher size (gal)
	gatesISO: string;
	closeISO: string;
	includeBuild: boolean;
	includeStrike: boolean;
	people: Person[];
	events: KeyEvent[];
}

export interface SimPerson extends Person {
	arrD: Date;
	depD: Date;
	grayPD: number;
	blackPD: number;
	freshPD: number;
}

export interface SimEvent {
	date: Date;
	type: 'p' | 'r';
	ph: Phase;
	gray?: number;
	black?: number;
	by?: string;
	fresh?: number;
	final?: boolean;
}

export interface Marker {
	date: Date;
	label: string;
	imp: boolean;
	lvl: { fresh: number; gray: number; black: number } | null;
	ph: Phase;
}

export interface PhaseData {
	nights: number;
	pn: number;
	pump: number;
	refill: number;
	first: Date | null;
	last: Date | null;
}

export interface SeriesPoint {
	date: Date;
	fresh: number;
	gray: number;
	black: number;
}

export interface Sim {
	freshCap: number;
	grayCap: number;
	blackCap: number;
	fresh: number;
	gray: number;
	black: number;
	pumpN: number;
	refillN: number;
	nights: number;
	personNights: number;
	grayTrips: number;
	blackTrips: number;
	events: SimEvent[];
	series: SeriesPoint[];
	start: Date;
	end: Date;
	finalDump: boolean;
	voucher: number;
	gates: Date;
	close: Date;
	phase: Record<Phase, PhaseData>;
	markers: Marker[];
	women: number;
	men: number;
	total: number;
	peakCnt: number;
	fillDays: number;
	ppl: SimPerson[];
	grayTrig: number;
	blackTrig: number;
}

/** Keep only people with a valid arrive < depart range. */
export function validPeople(people: Person[]): Person[] {
	return people.filter((p) => p.arr && p.dep && parseD(p.dep) > parseD(p.arr));
}

export function simulate(inp: SimInput): Sim | null {
	const { freshCap, grayCap, blackCap, flow, hand, dish, n1, n2, offload, voucher } = inp;
	const gd: Record<Gender, number> = { W: inp.showW, M: inp.showM };
	const pumpPct = inp.pumpPct / 100;
	const refillLow = inp.refillLow;

	const gates = parseD(inp.gatesISO);
	const close = parseD(inp.closeISO);
	if (!(close > gates)) return null; // gates must be before close
	const phaseOf = (d: Date): Phase => (d < gates ? 'Build' : d < close ? 'Event' : 'Strike');

	const base = validPeople(inp.people);
	if (!base.length) return null;
	const ppl: SimPerson[] = base.map((p) => {
		const sm = gd[p.gender] || 0;
		const shower = flow * sm;
		const arrD = parseD(p.arr);
		const depD = parseD(p.dep);
		return {
			...p,
			arrD,
			depD,
			grayPD: (shower + hand + dish) * p.use,
			blackPD: (6 * n1 + n2) * (1 - offload) * p.use,
			freshPD: (shower + hand + dish) * p.use + (6 * n1 + n2) * (1 - offload) * p.use
		};
	});
	const women = ppl.filter((p) => p.gender === 'W').length;
	const men = ppl.filter((p) => p.gender === 'M').length;

	const arrMin = ppl.reduce((a, p) => (p.arrD < a ? p.arrD : a), ppl[0].arrD);
	const depMax = ppl.reduce((a, p) => (p.depD > a ? p.depD : a), ppl[0].depD);

	// The Event window (gates→close) is ALWAYS simulated. Pre-build extends the
	// window earlier only when enabled; Strike extends it later only when enabled.
	const start = inp.includeBuild ? (arrMin < gates ? arrMin : gates) : gates;
	const end = inp.includeStrike ? (depMax > close ? depMax : close) : close;

	let fresh = freshCap,
		gray = 0,
		black = 0;
	let pumpN = 0,
		refillN = 0,
		nights = 0,
		personNights = 0,
		grayTrips = 0,
		blackTrips = 0,
		peakCnt = 0,
		peakGrayPD = 0;
	const events: SimEvent[] = [];
	const series: SeriesPoint[] = [];
	const phase = {} as Record<Phase, PhaseData>;
	PHASES.forEach((p) => (phase[p] = { nights: 0, pn: 0, pump: 0, refill: 0, first: null, last: null }));
	const grayTrig = grayCap * pumpPct,
		blackTrig = blackCap * pumpPct;

	for (let d = new Date(start); d < end; d = addDay(d)) {
		const ph = phaseOf(d);
		const here = ppl.filter((p) => d >= p.arrD && d < p.depD);
		nights++;
		phase[ph].nights++;
		personNights += here.length;
		phase[ph].pn += here.length;
		if (!phase[ph].first) phase[ph].first = new Date(d);
		phase[ph].last = new Date(d);
		let need = 0,
			gAdd = 0,
			bAdd = 0,
			gpd = 0;
		here.forEach((p) => {
			need += p.freshPD;
			gAdd += p.grayPD;
			bAdd += p.blackPD;
			gpd += p.grayPD;
		});
		if (here.length > peakCnt || (here.length === peakCnt && gpd > peakGrayPD)) {
			peakCnt = here.length;
			peakGrayPD = gpd;
		}
		if (here.length && fresh - need < refillLow) {
			fresh = Math.min(freshCap, fresh + voucher);
			refillN++;
			phase[ph].refill++;
			events.push({ date: new Date(d), type: 'r', fresh, ph });
		}
		fresh = Math.max(0, fresh - need);
		gray += gAdd;
		black += bAdd;
		const grayFull = grayCap > 0 && gray >= grayTrig,
			blackFull = blackCap > 0 && black >= blackTrig;
		if (grayFull || blackFull) {
			if (grayFull) grayTrips++;
			else blackTrips++;
			pumpN++;
			phase[ph].pump++;
			events.push({ date: new Date(d), type: 'p', gray, black, by: grayFull ? 'gray' : 'black', ph });
			gray = 0;
			black = 0;
		}
		series.push({ date: new Date(d), fresh, gray, black });
	}

	let finalDump = false;
	if (gray > 0.15 * grayCap || black > 0.15 * blackCap) {
		const lastDay = new Date(end.getTime() - 86400000);
		const ph = phaseOf(lastDay);
		pumpN++;
		phase[ph].pump++;
		finalDump = true;
		events.push({ date: lastDay, type: 'p', gray, black, by: 'pre-departure', ph, final: true });
	}

	const lvlAt = (d: Date) => {
		const p = series.find((p) => p.date.getTime() === d.getTime());
		return p ? { fresh: p.fresh, gray: p.gray, black: p.black } : null;
	};
	const markers: Marker[] = validEvents(inp.events)
		.map((e) => {
			const d = parseD(e.date);
			return { date: d, label: e.label, imp: e.imp, lvl: lvlAt(d), ph: phaseOf(d) };
		})
		.sort((a, b) => a.date.getTime() - b.date.getTime());
	const fillDays = peakGrayPD > 0 ? grayTrig / peakGrayPD : 0;

	return {
		freshCap,
		grayCap,
		blackCap,
		fresh,
		gray,
		black,
		pumpN,
		refillN,
		nights,
		personNights,
		grayTrips,
		blackTrips,
		events,
		series,
		start,
		end: new Date(end.getTime() - 86400000),
		finalDump,
		voucher,
		gates,
		close,
		phase,
		markers,
		women,
		men,
		total: ppl.length,
		peakCnt,
		fillDays,
		ppl,
		grayTrig,
		blackTrig
	};
}

export function validEvents(events: KeyEvent[]): KeyEvent[] {
	return events.filter((e) => e.date && e.label);
}

/* ---------- small word helpers ---------- */
export const plural = (n: number, s: string): string => `${n} ${s}${n === 1 ? '' : 's'}`;
export const peopleWord = (n: number): string => (n === 1 ? '1 person' : `${n} people`);
export const womenWord = (n: number): string => (n === 1 ? '1 woman' : `${n} women`);
export const menWord = (n: number): string => (n === 1 ? '1 man' : `${n} men`);
