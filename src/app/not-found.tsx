import Link from 'next/link';

/**
 * Minimal 404 page
 */
export default function NotFound() {
	return (
		<div className="min-h-real-screen flex h-full w-full items-center justify-center">
			<Link href="/" className="text-4xl hover:no-underline" aria-label="Back to home">
				&#8592;
			</Link>
		</div>
	);
}
