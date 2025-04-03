/**
 * Static data arrays for the Foundation content section.
 */

// Combine description text for AnimatedText
export const descriptionText = [
	'Incomplete Infinity is an evolving, multifaceted creative practice working with companies and institutions in pursuit of a better future. Embracing an enigmatic style, we create work that is completed by the viewer and lives on in their minds.',
	'', // Add a blank line for spacing equivalent to the original <p> margin
	'At the intersection of imperfection, mystery, and openness, Incomplete Infinity crafts experiences that resist finite closure. We navigate liminal spaces where technology functions as collaborative language rather than mere tool, where sustainability manifests as regenerative dialogue with natural systems, and where creativity transforms abstract potential into tangible yet unresolved encounters. Our work exists not as static artifact but as living ecosystem—adapting, evolving, and completing itself anew with each engagement.',
	'', // Add a blank line for spacing
	'We exist in the deliberate pause between completion and becoming. Incomplete Infinity navigates the territories where technology becomes language, where sustainability becomes conversation, and where creativity transmutes the abstract into the experiential. Our work inhabits the fertile tensions between disorder and pattern, between revelation and concealment, between finite expression and finite interpretation.',
];

// Array of alternative paragraphs for random selection
export const paragraphs = [
	'In the fertile void between disciplines, Incomplete Infinity cultivates living frameworks rather than final artifacts.',
	'We exist in the deliberate pause between completion and becoming. Incomplete Infinity navigates the territories where technology becomes language, where sustainability becomes conversation, and where creativity transmutes the abstract into the experiential. Our work inhabits the fertile tensions between disorder and pattern, between revelation and concealment, between finite expression and infinite interpretation.',
	'We dwell in the territory of incompleteness—where unfinished becomes invitation rather than flaw.',
	'At the intersection of imperfection, mystery, and openness, Incomplete Infinity crafts experiences that resist finite closure. We navigate liminal spaces where technology functions as collaborative language rather than mere tool, where sustainability manifests as regenerative dialogue with natural systems, and where creativity transforms abstract potential into tangible yet unresolved encounters. Our work exists not as static artifact but as living ecosystem—adapting, evolving, and completing itself anew with each engagement.',
	'Incomplete Infinity occupies the tension between definition and possibility.',
	'We architect the unfinished—creating systems and experiences that evolve beyond their origins through engagement.',
	'Between conception and completion lies a fertile territory of possibility. We transform apparent limitations into portals of potential, crafting experiences that gain strength through vulnerability and resonance through ambiguity. Each project exists as structured emergence: deliberately unresolved systems that invite completion without dictating conclusion.',
];

// Function to select two unique paragraphs for dynamic content
export const selectRandomParagraphs = (sourceArray: string[]): [string | undefined, string | undefined] => {
	let paragraph1: string | undefined;
	let paragraph2: string | undefined;

	if (sourceArray.length >= 2) {
		const index1 = Math.floor(Math.random() * sourceArray.length);
		paragraph1 = sourceArray[index1];

		let index2 = Math.floor(Math.random() * sourceArray.length);
		while (index2 === index1) {
			index2 = Math.floor(Math.random() * sourceArray.length);
		}
		paragraph2 = sourceArray[index2];
	} else if (sourceArray.length === 1) {
		paragraph1 = sourceArray[0];
	}
	return [paragraph1, paragraph2];
};

// Array for client list items to easily map over
export const clientList = [
	{ text: '1', bold: true },
	{ text: 'Porsche' },
	{ text: 'Lotus Cars' },
	{ text: '2', bold: true },
	{ text: 'Coca-Cola' },
	{ text: 'Calvin-Klein' },
	{ text: 'Meta' },
	{ text: 'Nohlab' },
	{ text: 'Salon Architects' },
	{ text: '3', bold: true },
	{ text: 'Taiwan Nat. Museum of Fine Arts' },
	{ text: 'Outernet London' },
	{ text: 'Saasfee Pavillon' },
	{ text: 'Atelier Des Lumieres' },
	{ text: 'Sonar Istanbul' },
	{ text: 'Eglise De La Madeleine' },
];

// Arrays for services list
export const servicesList1 = ['Creative Strategy', 'Direction', 'Production'];
export const servicesList2 = ['& Art Exhibitions']; // Keep & static with Art Exhibitions

// Array for contact links
export const contactLinks = [
	{ href: 'mailto:hey@u29dc.com', text: 'hey@u29dc.com' },
	{ href: 'https://cal.com/u29dc', text: 'cal.com/u29dc' },
	{ href: 'https://instagram.com/u29dc/', text: 'Instagram@u29dc' },
	{ href: 'https://linkedin.com/in/u29dc/', text: 'LinkedIn@u29dc' },
];
