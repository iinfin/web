import type { FC, ReactNode } from 'react';

import Link from 'next/link';

/**
 * Props for the ContactLink component.
 */
interface ContactLinkProps {
	href: string;
	children: ReactNode;
}

/**
 * Reusable styled link component for contact details.
 */
export const ContactLink: FC<ContactLinkProps> = ({ href, children }): JSX.Element => (
	<Link href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gray-400">
		{children}
	</Link>
);

export default ContactLink;
