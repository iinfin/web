'use client';

/**
 * Minimal error boundary component
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<button onClick={reset} className="text-4xl transition-transform hover:scale-110" aria-label="Try again">
				&#8629;
			</button>
		</div>
	);
}
