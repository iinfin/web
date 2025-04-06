import type { Variants } from 'framer-motion';

/**
 * Configuration, static data, and animation variants
 * for the Foundation content section.
 */

// ==================================
// SECTION: Animation Configuration
// ==================================

// --- Animation Constants ---
export const durationPrimary = 1.0; // Duration for main description and titles
export const durationSecondary = 0.5; // Duration for list items and links
export const staggerFast = 0.1; // Stagger for items within lists
export const staggerMedium = 0.2; // Stagger for lists within columns or link groups
export const staggerSlow = 0.5; // Stagger for main columns
// -------------------------

// --- Animation Variants ---

// Stagger Variants for the top details section container
export const detailsContainerVariants: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: staggerSlow, // Stagger the columns
		},
	},
};

// Variants for individual columns within the details section
export const columnVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: staggerSlow, // Stagger items within columns
		},
	},
};

// Variants for individual items (text, links) within columns
export const itemVariants: Variants = {
	hidden: { opacity: 0, y: 10 }, // Start invisible and slightly down
	visible: {
		opacity: 1,
		y: 0, // Animate to original position
		transition: {
			duration: durationSecondary, // Use secondary duration for items
			ease: [0.22, 1, 0.36, 1], // easeOutCirc
		},
	},
};

// Variants for staggering lists (like services or contact links)
export const listStaggerVariants: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: staggerMedium } },
};

// Variants for staggering items within a list (faster than list staggering)
export const listItemStaggerVariants: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: staggerFast } },
};

// ==================================
// SECTION: Static Content Data
// ==================================

// --- Description Text ---

// Array of alternative paragraphs for random selection in DescriptionSection
export const paragraphs = [
	'In the fertile void between disciplines, Incomplete Infinity cultivates living frameworks rather than final artifacts.',
	'We exist in the deliberate pause between completion and becoming. Incomplete Infinity navigates the territories where technology becomes language, where sustainability becomes conversation, and where creativity transmutes the abstract into the experiential. Our work inhabits the fertile tensions between disorder and pattern, between revelation and concealment, between finite expression and infinite interpretation.',
	'We dwell in the territory of incompleteness—where unfinished becomes invitation rather than flaw.',
	'At the intersection of imperfection, mystery, and openness, Incomplete Infinity crafts experiences that resist finite closure. We navigate liminal spaces where technology functions as collaborative language rather than mere tool, where sustainability manifests as regenerative dialogue with natural systems, and where creativity transforms abstract potential into tangible yet unresolved encounters. Our work exists not as static artifact but as living ecosystem—adapting, evolving, and completing itself anew with each engagement.',
	'Incomplete Infinity occupies the tension between definition and possibility.',
	'We architect the unfinished—creating systems and experiences that evolve beyond their origins through engagement.',
	'Between conception and completion lies a fertile territory of possibility. We transform apparent limitations into portals of potential, crafting experiences that gain strength through vulnerability and resonance through ambiguity. Each project exists as structured emergence: deliberately unresolved systems that invite completion without dictating conclusion.',
];

// Function to select two unique paragraphs for dynamic content in DescriptionSection
export const selectRandomParagraphs = (sourceArray: string[]): [string | undefined, string | undefined] => {
	let paragraph1: string | undefined;
	let paragraph2: string | undefined;

	if (sourceArray.length >= 2) {
		const index1 = Math.floor(Math.random() * sourceArray.length);
		paragraph1 = sourceArray[index1];

		let index2 = Math.floor(Math.random() * sourceArray.length);
		// Ensure the second index is different from the first
		while (index2 === index1) {
			index2 = Math.floor(Math.random() * sourceArray.length);
		}
		paragraph2 = sourceArray[index2];
	} else if (sourceArray.length === 1) {
		// If only one paragraph available, use it for the first slot
		paragraph1 = sourceArray[0];
	}
	// If fewer than 2 paragraphs, the second slot will remain undefined
	return [paragraph1, paragraph2];
};

// --- Lists Data ---

// Array for client list items displayed in the third column (desktop)
export const clientList = [
	{ text: '1', bold: false },
	{ text: 'Porsche' },
	{ text: 'Lotus Cars' },
	{ text: '2', bold: false },
	{ text: 'Coca-Cola' },
	{ text: 'Calvin-Klein' },
	{ text: 'Meta' },
	{ text: 'Nohlab' },
	{ text: 'Salon Architects' },
	{ text: '3', bold: false },
	{ text: 'Taiwan Nat. Museum of Fine Arts' },
	{ text: 'Outernet London' },
	{ text: 'Saasfee Pavillon' },
	{ text: 'Atelier Des Lumieres' },
	{ text: 'Sonar Istanbul' },
	{ text: 'Eglise De La Madeleine' },
];

// Arrays for services list displayed in the services column
export const servicesList1 = ['Creative Strategy', 'Direction', 'Production'];
// Second part of the services list
export const servicesList2 = ['& Art Exhibitions'];

// Array for contact links displayed in the contact column
export const contactLinks = [
	{ href: 'mailto:hey@u29dc.com', text: 'hey@u29dc.com' },
	{ href: 'https://cal.com/u29dc', text: 'cal.com/u29dc' },
	{ href: 'https://instagram.com/u29dc/', text: 'Instagram@u29dc' },
	{ href: 'https://linkedin.com/in/u29dc/', text: 'LinkedIn@u29dc' },
];
