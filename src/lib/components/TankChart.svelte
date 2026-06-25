<script lang="ts">
	import { fmt, PH_COL, PH_DOT, type Phase, type Sim } from '$lib/model';
	import type { Attachment } from 'svelte/attachments';

	let { sim }: { sim: Sim | null } = $props();

	function draw(cv: HTMLCanvasElement, s: Sim) {
		const ctx = cv.getContext('2d');
		if (!ctx) return;
		const DPR = window.devicePixelRatio || 1,
			W = cv.clientWidth,
			H = 280;
		cv.width = W * DPR;
		cv.height = H * DPR;
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const padL = 34,
			padR = 12,
			padT = 20,
			padB = 24,
			pw = W - padL - padR,
			ph = H - padT - padB;
		const n = s.series.length;
		if (!n) return;
		const maxCap = Math.max(s.freshCap, s.grayCap, s.blackCap, 1);
		const x = (i: number) => padL + (n <= 1 ? pw / 2 : (pw * i) / (n - 1));
		const y = (v: number) => padT + ph * (1 - v / maxCap);
		const phaseOf = (d: Date): Phase => (d < s.gates ? 'Build' : d < s.close ? 'Event' : 'Strike');

		let segStart = 0;
		const drawBand = (a: number, b: number, p: Phase) => {
			const xa = x(Math.max(0, a - 0.5)),
				xb = x(Math.min(n - 1, b - 0.5));
			ctx.fillStyle = PH_COL[p];
			ctx.fillRect(xa, padT, Math.max(1, xb - xa), ph);
			ctx.fillStyle = PH_DOT[p];
			ctx.font = '9px sans-serif';
			ctx.textAlign = 'center';
			if (xb - xa > 26) ctx.fillText(p.toUpperCase(), (xa + xb) / 2, padT - 7);
		};
		for (let i = 1; i <= n; i++) {
			if (i === n || phaseOf(s.series[i].date) !== phaseOf(s.series[segStart].date)) {
				drawBand(segStart, i, phaseOf(s.series[segStart].date));
				segStart = i;
			}
		}
		ctx.strokeStyle = 'rgba(150,130,200,.16)';
		ctx.fillStyle = '#8a7caa';
		ctx.font = '10px sans-serif';
		ctx.textAlign = 'right';
		const tick = Math.max(10, Math.ceil(maxCap / 4 / 10) * 10);
		for (let g = 0; g <= maxCap; g += tick) {
			ctx.beginPath();
			ctx.moveTo(padL, y(g));
			ctx.lineTo(W - padR, y(g));
			ctx.stroke();
			ctx.fillText(String(g), padL - 5, y(g) + 3);
		}
		ctx.textAlign = 'center';
		const step = Math.max(1, Math.floor(n / 6));
		for (let i = 0; i < n; i += step) ctx.fillText(fmt(s.series[i].date), x(i), H - 7);
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = 'rgba(185,166,200,.5)';
		ctx.beginPath();
		ctx.moveTo(padL, y(s.grayCap));
		ctx.lineTo(W - padR, y(s.grayCap));
		ctx.stroke();
		ctx.setLineDash([]);

		const idxOf = (date: Date) => s.series.findIndex((p) => p.date.getTime() === date.getTime());
		s.markers.forEach((m) => {
			const i = idxOf(m.date);
			if (i < 0) return;
			const X = x(i);
			ctx.strokeStyle = m.imp ? 'rgba(255,122,60,.9)' : 'rgba(160,145,205,.3)';
			ctx.lineWidth = m.imp ? 2 : 1;
			ctx.setLineDash(m.imp ? [] : [3, 3]);
			ctx.beginPath();
			ctx.moveTo(X, padT);
			ctx.lineTo(X, padT + ph);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.save();
			ctx.translate(X, padT + ph - 6);
			ctx.rotate(-Math.PI / 2);
			ctx.fillStyle = m.imp ? '#ff7a3c' : '#9384b8';
			ctx.font = (m.imp ? 'bold ' : '') + '10px sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(m.label.replace(/[^\x00-\x7F]/g, '').trim() || m.label, 0, -3);
			ctx.restore();
		});

		const area = (k: 'fresh' | 'gray' | 'black', c1: string, c2: string) => {
			const g = ctx.createLinearGradient(0, padT, 0, padT + ph);
			g.addColorStop(0, c1);
			g.addColorStop(1, c2);
			ctx.fillStyle = g;
			ctx.beginPath();
			s.series.forEach((p, i) => {
				const X = x(i),
					Y = y(p[k]);
				i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
			});
			ctx.lineTo(x(n - 1), padT + ph);
			ctx.lineTo(x(0), padT + ph);
			ctx.closePath();
			ctx.fill();
		};
		const line = (k: 'fresh' | 'gray' | 'black', c: string, w: number) => {
			ctx.save();
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.shadowColor = c;
			ctx.shadowBlur = 8;
			ctx.strokeStyle = c;
			ctx.lineWidth = w;
			ctx.beginPath();
			s.series.forEach((p, i) => {
				const X = x(i),
					Y = y(p[k]);
				i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
			});
			ctx.stroke();
			ctx.restore();
		};
		area('fresh', 'rgba(63,208,224,.22)', 'rgba(63,208,224,0)');
		line('fresh', '#3fd0e0', 2.4);
		line('gray', '#b9a6c8', 2);
		line('black', '#c79a5e', 1.8);
		s.events.forEach((e) => {
			let i = idxOf(e.date);
			if (i < 0) i = n - 1;
			const col = e.type === 'p' ? '#ff6a2e' : '#7fe8ff';
			ctx.save();
			ctx.shadowColor = col;
			ctx.shadowBlur = 8;
			ctx.fillStyle = col;
			ctx.beginPath();
			ctx.arc(x(i), e.type === 'p' ? padT + 6 : H - padB - 6, 4, 0, 7);
			ctx.fill();
			ctx.restore();
		});
	}

	// Attachment: the outer function runs once on mount; the nested $effect
	// redraws whenever `sim` changes, and we also redraw on viewport resize
	// (the canvas width is fluid). Cleanup removes the resize listener.
	const chart: Attachment<HTMLCanvasElement> = (node) => {
		$effect(() => {
			if (sim) draw(node, sim);
		});
		const onResize = () => {
			if (sim) draw(node, sim);
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	};
</script>

<canvas {@attach chart} width="900" height="280"></canvas>
