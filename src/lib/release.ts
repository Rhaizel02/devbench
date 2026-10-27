/** Display versions are separate from each tool's historical introduction version. */
export const release = {
	app: 'V2.3 RC',
	canvas: '2.1',
	sha: typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'development'
} as const;
