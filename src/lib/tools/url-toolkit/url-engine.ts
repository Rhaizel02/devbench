import { ToolError, assertTextLimit } from '../tool-errors';
export type QueryPair = { key: string; value: string };
export type UrlInspection = {
	original: string;
	protocol: string;
	hostname: string;
	host: string;
	port: string;
	username: string;
	password: string;
	pathname: string;
	fragment: string;
	query: QueryPair[];
};
export function encodeComponent(input: string): string {
	assertTextLimit(input);
	try {
		return encodeURIComponent(input);
	} catch {
		throw new ToolError('Input contains an invalid Unicode sequence.');
	}
}
export function decodeComponent(input: string): string {
	assertTextLimit(input);
	try {
		return decodeURIComponent(input);
	} catch {
		throw new ToolError('Malformed percent escape or invalid UTF-8 sequence.');
	}
}
export function inspectUrl(input: string): UrlInspection {
	assertTextLimit(input);
	const value = input.trim();
	if (!value || !/^[a-z][a-z\d+.-]*:/i.test(value))
		throw new ToolError('Enter an absolute URL with a protocol, such as https://example.com/.');
	decodeComponent(value);
	try {
		const url = new URL(value);
		const query: QueryPair[] = [];
		for (const [key, value] of url.searchParams) {
			if (query.length >= 2000) throw new ToolError('Query parameters exceed the 2,000-row limit.');
			query.push({ key, value });
		}
		return {
			original: value,
			protocol: url.protocol,
			hostname: url.hostname,
			host: url.host,
			port: url.port,
			username: url.username,
			password: url.password,
			pathname: url.pathname,
			fragment: url.hash,
			query
		};
	} catch (error) {
		if (error instanceof ToolError) throw error;
		throw new ToolError('Invalid absolute URL. Check the protocol, host and port.');
	}
}
export function rebuildUrl(
	original: string,
	query: QueryPair[],
	revealCredentials = false
): string {
	const inspection = inspectUrl(original);
	const url = new URL(inspection.original);
	const params = new URLSearchParams();
	if (query.length > 2000) throw new ToolError('Query parameters exceed the 2,000-row limit.');
	for (const pair of query) {
		assertTextLimit(pair.key);
		assertTextLimit(pair.value);
		params.append(pair.key, pair.value);
	}
	url.search = params.toString();
	if (!revealCredentials) {
		if (url.username) url.username = 'REDACTED';
		if (url.password) url.password = 'REDACTED';
	}
	return url.href;
}
