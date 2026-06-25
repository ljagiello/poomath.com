/**
 * Monte Carlo pump-out risk + weather-closure overflow risk.
 *
 * Daily gray/black additions are drawn from lognormal distributions around each
 * person's mean, using a seeded PRNG so results are stable for fixed inputs
 * (no flicker on re-render).
 */
import type { Sim } from './model';

export function mulberry32(a: number): () => number {
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function mcGauss(rng: () => number): number {
	const u = rng() || 1e-9,
		v = rng();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v);
}

export function mcLn(rng: () => number, m: number, cv: number): number {
	if (m <= 0) return 0;
	const s2 = Math.log(1 + cv * cv);
	return Math.exp(Math.log(m) - s2 / 2 + Math.sqrt(s2) * mcGauss(rng));
}

export function pctile(a: number[], f: number): number {
	if (!a.length) return 0;
	return a[Math.min(a.length - 1, Math.max(0, Math.floor(f * (a.length - 1))))];
}

export interface MCCycle {
	k: number;
	needed: number;
	likely: Date;
	safe: Date;
}

export interface MCResult {
	hist: Record<number, number>;
	mode: number;
	p90: number;
	minK: number;
	maxK: number;
	cycles: MCCycle[];
	trials: number;
}

export function monteCarlo(sim: Sim, cv: number, trials: number, safeF: number): MCResult {
	const DAY = 86400000,
		s0 = sim.start.getTime(),
		nights = sim.nights,
		gT = sim.grayTrig,
		bT = sim.blackTrig,
		gC = sim.grayCap,
		bC = sim.blackCap;
	const ranges = sim.ppl.map((p) => ({
		a: Math.round((p.arrD.getTime() - s0) / DAY),
		d: Math.round((p.depD.getTime() - s0) / DAY),
		g: p.grayPD,
		b: p.blackPD
	}));
	const rng = mulberry32(0x9e3779b1),
		counts: number[] = new Array(trials);
	const cyc: Record<number, number[]> = {};
	for (let t = 0; t < trials; t++) {
		let gray = 0,
			black = 0,
			k = 0;
		for (let di = 0; di < nights; di++) {
			let gA = 0,
				bA = 0;
			for (const r of ranges) {
				if (di >= r.a && di < r.d) {
					gA += mcLn(rng, r.g, cv);
					bA += mcLn(rng, r.b, cv);
				}
			}
			gray += gA;
			black += bA;
			if ((gC > 0 && gray >= gT) || (bC > 0 && black >= bT)) {
				k++;
				(cyc[k] || (cyc[k] = [])).push(di);
				gray = 0;
				black = 0;
			}
		}
		if (gray > 0.15 * gC || black > 0.15 * bC) {
			k++;
			(cyc[k] || (cyc[k] = [])).push(nights - 1);
		}
		counts[t] = k;
	}
	const hist: Record<number, number> = {};
	let topK = 0;
	counts.forEach((n) => {
		hist[n] = (hist[n] || 0) + 1;
		if (n > topK) topK = n;
	});
	let mode = 0,
		modeF = -1;
	for (const n in hist) {
		if (hist[n] > modeF) {
			modeF = hist[n];
			mode = +n;
		}
	}
	const sorted = counts.slice().sort((a, b) => a - b),
		cycles: MCCycle[] = [];
	for (let k = 1; k <= topK; k++) {
		const arr = (cyc[k] || []).slice().sort((a, b) => a - b),
			needed = arr.length / trials;
		if (needed < 0.08) continue;
		cycles.push({
			k,
			needed,
			likely: new Date(s0 + pctile(arr, 0.5) * DAY),
			safe: new Date(s0 + pctile(arr, safeF) * DAY)
		});
	}
	return { hist, mode, p90: pctile(sorted, 0.9), minK: sorted[0], maxK: sorted[sorted.length - 1], cycles, trials };
}

export interface WeatherPreset {
	pMajor: number;
	dur: [number, number][];
	lam: number;
	mdur: number;
}

export const WEATHER: Record<string, WeatherPreset> = {
	off: { pMajor: 0, dur: [], lam: 0, mdur: 0 },
	low: { pMajor: 0.07, dur: [[2, 1]], lam: 1.0, mdur: 0.25 },
	typical: {
		pMajor: 0.1,
		dur: [
			[2, 0.35],
			[3, 0.45],
			[4, 0.2]
		],
		lam: 1.5,
		mdur: 0.4
	},
	high: {
		pMajor: 0.15,
		dur: [
			[2, 0.3],
			[3, 0.4],
			[4, 0.3]
		],
		lam: 2.5,
		mdur: 0.75
	}
};

export function mcPoisson(rng: () => number, l: number): number {
	if (l <= 0) return 0;
	const L = Math.exp(-l);
	let k = 0,
		pp = 1;
	do {
		k++;
		pp *= rng();
	} while (pp > L);
	return k - 1;
}

export function mcDur(rng: () => number, dur: [number, number][]): number {
	if (!dur.length) return 0;
	const r = rng();
	let cc = 0;
	for (let i = 0; i < dur.length; i++) {
		cc += dur[i][1];
		if (r <= cc) return dur[i][0];
	}
	return dur[dur.length - 1][0];
}

export interface WeatherResult {
	overflowRate: number;
	worstFull: number;
}

export function weatherRisk(sim: Sim, cv: number, trials: number, w: WeatherPreset): WeatherResult {
	const DAY = 86400000,
		s0 = sim.start.getTime(),
		nights = sim.nights,
		gT = sim.grayTrig,
		bT = sim.blackTrig,
		gC = sim.grayCap,
		bC = sim.blackCap;
	const ranges = sim.ppl.map((p) => ({
		a: Math.round((p.arrD.getTime() - s0) / DAY),
		d: Math.round((p.depD.getTime() - s0) / DAY),
		g: p.grayPD,
		b: p.blackPD
	}));
	const rng = mulberry32(0xb5297a4d);
	let ovf = 0;
	const maxes: number[] = new Array(trials);
	for (let t = 0; t < trials; t++) {
		const blk = new Array(nights).fill(false);
		if (rng() < w.pMajor) {
			const d = mcDur(rng, w.dur),
				st = Math.floor(rng() * Math.max(1, nights));
			for (let i = st; i < st + d && i < nights; i++) blk[i] = true;
		}
		const m = mcPoisson(rng, w.lam);
		for (let j = 0; j < m; j++) {
			const day = Math.floor(rng() * Math.max(1, nights));
			if (rng() < w.mdur) blk[day] = true;
		}
		let gray = 0,
			black = 0,
			overflow = false,
			mx = 0;
		for (let di = 0; di < nights; di++) {
			let gA = 0,
				bA = 0;
			for (const r of ranges) {
				if (di >= r.a && di < r.d) {
					gA += mcLn(rng, r.g, cv);
					bA += mcLn(rng, r.b, cv);
				}
			}
			gray += gA;
			black += bA;
			if (!blk[di]) {
				if (gray >= gT || black >= bT) {
					gray = 0;
					black = 0;
				}
			} else {
				if ((gC > 0 && gray >= gC) || (bC > 0 && black >= bC)) overflow = true;
			}
			if (gC > 0) mx = Math.max(mx, gray / gC);
		}
		if (overflow) ovf++;
		maxes[t] = mx;
	}
	maxes.sort((a, b) => a - b);
	return { overflowRate: ovf / trials, worstFull: pctile(maxes, 0.95) };
}
