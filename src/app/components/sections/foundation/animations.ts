import type { Variants } from 'framer-motion';

/**
 * Animation constants and Framer Motion variants for the Foundation content section.
 */

// --- Animation Constants ---
export const durationPrimary = 1.0; // Duration for main description and titles
export const durationSecondary = 0.5; // Duration for list items and links
export const staggerFast = 0.1; // Stagger for items within lists
export const staggerMedium = 0.2; // Stagger for lists within columns or link groups
export const staggerSlow = 0.5; // Stagger for main columns
// -------------------------

// Stagger Variants for details section
export const detailsContainerVariants: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: staggerSlow, // Stagger the columns
		},
	},
};

export const columnVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: staggerSlow, // Stagger items within columns
		},
	},
};

export const itemVariants: Variants = {
	hidden: { opacity: 0, y: 10 }, // Add slight upward animation
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: durationSecondary, // Use secondary duration for items
			ease: [0.22, 1, 0.36, 1], // easeOutCirc
		},
	},
};

export const listStaggerVariants: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: staggerMedium } },
};

export const listItemStaggerVariants: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: staggerFast } },
};
