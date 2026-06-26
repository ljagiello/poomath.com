// Shared SEO constants + programmatic-page data (RV model specs + guides).
// Used by the home page, the /rv and /guides routes, and the dynamic sitemap.
import { PRESETS } from '$lib/model';

export const SITE_URL = 'https://poomath.com';
export const SITE_NAME = 'Poo Math';
export const OG_IMAGE = `${SITE_URL}/og.png`;
// Freshness signal — bump when the planner is reviewed for a new year.
export const UPDATED_ISO = '2026-06-25';
export const UPDATED_LABEL = 'Burning Man 2026';

/** Wrap a JSON-LD object as a ready-to-inject <script> string (for {@html}). */
export const ldScript = (obj: unknown): string =>
	`<script type="application/ld+json">${JSON.stringify(obj)}<\/script>`;

export interface RvPage {
	key: string; // PRESETS key, used for the ?rv= deep link
	slug: string; // URL slug
	name: string;
	fresh: number;
	gray: number;
	black: number;
	grayTanks: number;
	blackTanks: number;
	amp: string;
	grayDays: number; // rough pump-out cadence for a 2-3 person crew
	freshDays: number; // rough fresh-tank duration for that crew
}

// ~14 gal gray and ~17.5 gal fresh per day for a typical 2-3 person crew.
const cadence = (gal: number, perDay: number) => Math.max(1, Math.round((gal * 0.95) / perDay));

export const RV_PAGES: RvPage[] = Object.entries(PRESETS)
	.filter(([key, p]) => key !== 'custom' && p.f != null)
	.map(([key, p]) => ({
		key,
		slug: key.replaceAll('_', '-'),
		name: p.label,
		fresh: p.f ?? 0,
		gray: p.g ?? 0,
		black: p.b ?? 0,
		grayTanks: p.gt ?? 1,
		blackTanks: p.bt ?? 0,
		amp: p.a ?? '30',
		grayDays: cadence(p.g ?? 0, 14),
		freshDays: cadence(p.f ?? 0, 17.5)
	}));

export const rvBySlug = (slug: string): RvPage | undefined => RV_PAGES.find((r) => r.slug === slug);

export interface Guide {
	slug: string;
	title: string; // <title> text
	h1: string; // page heading / question
	description: string; // meta description
	body: string[]; // paragraphs
	related: string[]; // related guide slugs
}

export const GUIDES: Guide[] = [
	{
		slug: 'how-much-water-per-person-burning-man',
		title: 'How much water per person per day at Burning Man?',
		h1: 'How much water do you need per person per day at Burning Man?',
		description:
			'Plan for roughly 6–8 gallons of water per person per day in an RV at Burning Man. Showers dominate — here is the breakdown and how to size your tanks.',
		body: [
			'Plan for roughly 6 to 8 gallons of water per person per day in an RV at Burning Man, and showers are the single biggest variable. At a typical 1.6 gallon-per-minute shower head running about three minutes, one person uses close to five gallons just rinsing off — before any water for drinking, cooking, dishes, or flushing.',
			'Most of that water comes straight back out as greywater, so your gray tank is what fills first. Cutting shower time, fitting a low-flow head, or taking “navy showers” (water off while you lather) is the fastest way to stretch both your fresh supply and your tank capacity. Women and men tend to use noticeably different amounts, which is why Poo Math models each person separately.',
			'To turn the per-person figure into a plan, multiply by your crew size and the number of nights, then compare it against your rig’s fresh, gray, and black capacities. Poo Math does that math for you and schedules water deliveries and pump-outs so you never run dry or overflow.'
		],
		related: ['how-much-fresh-water-rv-burning-man', 'how-often-pump-out-rv-tanks-burning-man']
	},
	{
		slug: 'how-often-pump-out-rv-tanks-burning-man',
		title: 'How often to pump out RV tanks at Burning Man?',
		h1: 'How often do you need to pump out RV tanks at Burning Man?',
		description:
			'Most RVs need a pump-out every 2–4 days at Burning Man, set by whichever holding tank fills first — usually the gray tank from showers.',
		body: [
			'Most RVs need a pump-out every two to four days at Burning Man. The exact interval is set by whichever holding tank fills first, and that is almost always the gray tank, because shower and sink water adds up fast. A 35-gallon gray tank shared by two or three people typically fills in about two to three days.',
			'Your black tank usually lasts longer than gray, so planning around the gray tank keeps you safe on both. There is no water or sewer hookup on the playa, so you cannot empty tanks yourself — you book a licensed pump-out truck, and during the busiest days trucks can run a day or two behind schedule. Build that buffer into your plan and service a little early rather than waiting until a tank is completely full.',
			'Poo Math triggers a service when a tank reaches about 95 percent and schedules pump-out trucks across your build, event, and strike days, with a Monte Carlo estimate of how likely you are to overflow before the truck arrives.'
		],
		related: ['can-you-dump-greywater-on-the-playa', 'how-much-water-per-person-burning-man']
	},
	{
		slug: 'can-you-dump-greywater-on-the-playa',
		title: 'Can you dump RV greywater on the playa?',
		h1: 'Can you dump RV greywater or blackwater on the playa?',
		description:
			'No. Burning Man’s Leave No Trace rules prohibit draining any greywater or blackwater onto the playa. Here is what to do instead.',
		body: [
			'No. Burning Man’s Leave No Trace ethic prohibits draining any greywater or blackwater onto the playa — that includes shower runoff, dishwater, and anything from your sinks or toilet. The desert is an alkali lakebed with no drainage, and liquids that hit the ground leave a lasting mark and damage the surface.',
			'Everything has to stay contained. Keep it in your RV’s holding tanks and have it removed by one of the licensed pump-out services that operate on-playa, or haul it out yourself if your setup allows. Dumping on the ground — even “just” greywater — is a serious violation that can get your camp in trouble and harms the environment everyone is there to protect.',
			'The practical takeaway is to size your tanks and your pump-out schedule so you never feel tempted to cut corners. Poo Math plans your gray and black capacity against your crew and trip length so you always have a legal place to put the water.'
		],
		related: ['how-often-pump-out-rv-tanks-burning-man', 'rv-holding-tank-sizes-explained']
	},
	{
		slug: 'rv-holding-tank-sizes-explained',
		title: 'RV holding tank sizes explained (fresh, gray, black)',
		h1: 'RV holding tank sizes explained: fresh, gray, and black',
		description:
			'RVs carry three tanks — fresh, gray, and black. Typical Burning Man rentals hold about 25–45 gallons of gray and black each. Here is what each one does.',
		body: [
			'An RV carries three separate tanks. The fresh tank holds clean water for showering, drinking, and washing. The gray tank collects used water from the shower and sinks. The black tank holds toilet waste. Knowing the size of each is the key to planning a self-contained trip to Burning Man, where there are no hookups.',
			'Most rentals and mid-size rigs hold roughly 25 to 45 gallons of gray and black each, while fresh tanks range from about 20 gallons on a small camper to 90-plus on a large motorhome. Gray almost always fills first because showers and dishes generate the most water; black fills more slowly. When a tank is full you are done until it is pumped out, so the smallest relevant tank sets your service schedule.',
			'Poo Math includes presets for common rental and trailer models — Cruise America, El Monte, Airstream, fifth wheels, and more — so you can start from real capacities instead of guessing. Pick your rig and it estimates pump-outs and water refills for your crew.'
		],
		related: ['how-often-pump-out-rv-tanks-burning-man', 'how-much-fresh-water-rv-burning-man']
	},
	{
		slug: 'how-much-fresh-water-rv-burning-man',
		title: 'How much fresh water to bring for an RV at Burning Man?',
		h1: 'How much fresh water should you bring for an RV at Burning Man?',
		description:
			'Your RV’s fresh tank rarely lasts the week. Plan refills around 6–8 gallons per person per day, or arrange water deliveries on-playa.',
		body: [
			'Your RV’s onboard fresh tank rarely lasts a full week at Burning Man, so plan to refill. A good rule of thumb is that fresh-water use roughly equals your gray plus black output — about six to eight gallons per person per day. A 45-gallon fresh tank serving two people lasts only around three days at that rate.',
			'You have two ways to keep topped up: carry extra water in jugs or a bladder, or arrange a water-delivery service that fills your tank on-playa (often the same operators who handle pump-outs). Either way, work out your total need before you arrive — running out of water in the desert is far more serious than running out at a campground.',
			'Poo Math projects your fresh-water consumption day by day and schedules refills before you run dry, using delivery voucher sizes you set. Enter your rig and crew to see exactly how much water to plan for.'
		],
		related: ['how-much-water-per-person-burning-man', 'rv-holding-tank-sizes-explained']
	}
];

export const guideBySlug = (slug: string): Guide | undefined => GUIDES.find((g) => g.slug === slug);
