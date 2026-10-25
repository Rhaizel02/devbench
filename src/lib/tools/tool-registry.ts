export type Category = 'Data' | 'Encoding' | 'Security' | 'Backend' | 'Text' | 'Utilities' | 'Code';
export type Tool = {
	id: string;
	slug: string;
	name: string;
	category: Category;
	description: string;
	keywords: string;
	status: 'available' | 'planned';
	version: 'V1' | 'V1.1' | 'V1.2';
	icon: string;
};
export const tools: Tool[] = [
	{
		id: 'DATA-05',
		slug: 'json-query',
		name: 'JSON Query Explorer',
		category: 'Data',
		description: 'Query JSON with safe, bounded JSONPath.',
		keywords: 'jsonpath extract filter pointer',
		status: 'available',
		version: 'V1.2',
		icon: 'braces'
	},
	{
		id: 'DATA-06',
		slug: 'json-schema',
		name: 'JSON Schema Lab',
		category: 'Data',
		description: 'Validate documents and infer editable schemas.',
		keywords: 'draft 2020 schema validate infer',
		status: 'available',
		version: 'V1.2',
		icon: 'braces'
	},
	{
		id: 'DATA-01',
		slug: 'json-studio',
		name: 'JSON Studio',
		category: 'Data',
		description: 'Validate, format, minify and explore JSON.',
		keywords: 'pretty print tree pointer',
		status: 'available',
		version: 'V1',
		icon: 'braces'
	},
	{
		id: 'DATA-02',
		slug: 'json-diff',
		name: 'JSON Diff',
		category: 'Data',
		description: 'Compare JSON structures and find changes.',
		keywords: 'compare difference',
		status: 'available',
		version: 'V1',
		icon: 'diff'
	},
	{
		id: 'DATA-03',
		slug: 'json-yaml',
		name: 'JSON ↔ YAML',
		category: 'Data',
		description: 'Convert between JSON and YAML.',
		keywords: 'convert yaml',
		status: 'available',
		version: 'V1',
		icon: 'swap'
	},
	{
		id: 'ENC-01',
		slug: 'base64-toolkit',
		name: 'Base64 Toolkit',
		category: 'Encoding',
		description: 'Encode and decode UTF-8 and Base64.',
		keywords: 'encode decode utf8',
		status: 'available',
		version: 'V1',
		icon: 'binary'
	},
	{
		id: 'ENC-02',
		slug: 'url-toolkit',
		name: 'URL Toolkit',
		category: 'Encoding',
		description: 'Inspect URLs and work with query parameters.',
		keywords: 'uri percent encode decode query',
		status: 'available',
		version: 'V1',
		icon: 'link'
	},
	{
		id: 'SEC-01',
		slug: 'jwt-inspector',
		name: 'JWT Inspector',
		category: 'Security',
		description: 'Decode token headers and claims. Signature not verified.',
		keywords: 'token decode claims',
		status: 'available',
		version: 'V1',
		icon: 'shield'
	},
	{
		id: 'SEC-02',
		slug: 'hash-generator',
		name: 'Hash Generator',
		category: 'Security',
		description: 'Calculate SHA-256, SHA-384 and SHA-512 hashes.',
		keywords: 'sha digest crypto',
		status: 'available',
		version: 'V1',
		icon: 'hash'
	},
	{
		id: 'BACK-01',
		slug: 'sql-formatter',
		name: 'SQL Formatter',
		category: 'Backend',
		description: 'Format PostgreSQL, MySQL and SQLite queries.',
		keywords: 'database query postgres mysql sqlite',
		status: 'available',
		version: 'V1',
		icon: 'database'
	},
	{
		id: 'BACK-02',
		slug: 'regex-tester',
		name: 'Regex Tester',
		category: 'Backend',
		description: 'Explore matches, ranges and captured groups.',
		keywords: 'regular expression pattern',
		status: 'available',
		version: 'V1',
		icon: 'regex'
	},
	{
		id: 'TEXT-01',
		slug: 'text-diff',
		name: 'Text Diff',
		category: 'Text',
		description: 'Compare text and see line-by-line differences.',
		keywords: 'compare lines',
		status: 'available',
		version: 'V1',
		icon: 'diff'
	},
	{
		id: 'UTIL-01',
		slug: 'id-generator',
		name: 'ID Generator',
		category: 'Utilities',
		description: 'Generate UUID v4, UUID v7 and ULID identifiers.',
		keywords: 'uuid ulid random',
		status: 'available',
		version: 'V1',
		icon: 'fingerprint'
	},
	{
		id: 'UTIL-02',
		slug: 'timestamp-converter',
		name: 'Timestamp Converter',
		category: 'Utilities',
		description: 'Translate epoch timestamps, ISO dates and time zones.',
		keywords: 'date epoch unix time',
		status: 'available',
		version: 'V1',
		icon: 'clock'
	},
	{
		id: 'DATA-04',
		slug: 'json-csv',
		name: 'JSON ↔ CSV',
		category: 'Data',
		description: 'Convert records and delimited tables.',
		keywords: 'csv',
		status: 'available',
		version: 'V1.1',
		icon: 'braces'
	},
	{
		id: 'CODE-01',
		slug: 'json-code',
		name: 'JSON → Code',
		category: 'Code',
		description: 'Infer Java records and TypeScript interfaces.',
		keywords: 'types java',
		status: 'available',
		version: 'V1.1',
		icon: 'braces'
	},
	{
		id: 'BACK-03',
		slug: 'curl-inspector',
		name: 'cURL Inspector',
		category: 'Backend',
		description: 'Inspect a command without executing it.',
		keywords: 'http',
		status: 'available',
		version: 'V1.1',
		icon: 'terminal'
	},
	{
		id: 'BACK-04',
		slug: 'cron-explorer',
		name: 'Cron Explorer',
		category: 'Backend',
		description: 'Understand schedules and upcoming runs.',
		keywords: 'schedule',
		status: 'available',
		version: 'V1.1',
		icon: 'clock'
	},
	{
		id: 'TEXT-02',
		slug: 'string-toolkit',
		name: 'String Toolkit',
		category: 'Text',
		description: 'Transform casing and separators.',
		keywords: 'case slug',
		status: 'available',
		version: 'V1.1',
		icon: 'text'
	},
	{
		id: 'BACK-05',
		slug: 'sql-in-builder',
		name: 'SQL IN Builder',
		category: 'Backend',
		description: 'Build parameterized lists for SQL.',
		keywords: 'query list',
		status: 'available',
		version: 'V1.1',
		icon: 'database'
	}
];
export const v1Tools = tools.filter((tool) => tool.version === 'V1');
export const listedTools = tools.filter(
	(tool) => tool.version === 'V1' || tool.status === 'available'
);
export const categories: Category[] = [
	'Data',
	'Encoding',
	'Security',
	'Backend',
	'Text',
	'Utilities',
	'Code'
].filter((category) => listedTools.some((tool) => tool.category === category)) as Category[];
export const toolHref = (tool: Tool) => `/tools/${tool.slug}/`;
export function searchTools(query: string) {
	const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
	return listedTools.filter((tool) =>
		terms.every((term) =>
			`${tool.name} ${tool.category} ${tool.keywords}`.toLowerCase().includes(term)
		)
	);
}
