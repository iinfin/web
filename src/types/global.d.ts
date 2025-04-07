declare namespace JSX {
	type Element = React.ReactElement<React.PropsWithChildren<unknown>, React.ElementType>;
	interface IntrinsicElements {
		[elemName: string]: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
	}
}
