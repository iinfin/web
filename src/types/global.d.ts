declare namespace JSX {
	type Element = React.ReactElement<React.PropsWithChildren<unknown>, React.ElementType>;
	interface IntrinsicElements {
		[elemName: string]: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
	}
}

// Extends Three.js namespaces for better typing with R3F
declare namespace THREE {
	// Important shader material properties
	interface ShaderMaterial {
		uniforms: Record<string, { value: unknown }>;
	}

	// Common blending modes
	const AdditiveBlending: number;
}

// Fix empty interfaces and any types
declare namespace NodeJS {
	// Add meaningful properties instead of empty interface
	interface ProcessEnv {
		NODE_ENV: 'development' | 'production' | 'test';
		// Add other environment variables your app uses
		NEXT_PUBLIC_API_URL?: string;
		NEXT_PUBLIC_SITE_URL?: string;
	}
	// Fix the other empty interface
	interface Process {
		env: ProcessEnv;
		// Add at least one property to avoid the empty interface error
		browser: boolean;
	}
}

declare function createImage(width?: number, height?: number): HTMLCanvasElement;
