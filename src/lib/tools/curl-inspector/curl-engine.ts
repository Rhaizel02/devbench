import { ToolError, assertTextLimit } from '../tool-errors';
import { inspectUrl, type QueryPair } from '../url-toolkit/url-engine';
export type CurlHeader = { name: string; value: string; action: 'set' | 'remove' };
export type CurlInspection = {
	method: string;
	target: string;
	headers: CurlHeader[];
	query: QueryPair[];
	body: string | null;
	bodyBytes: number;
	notices: string[];
	redacted: boolean;
};
const sensitive = /authorization|cookie|api[-_]?key|token|secret|password|credential/i;
function tokenize(input: string): string[] {
	if (input.includes('`') || input.includes('$(') || input.includes('${'))
		throw new ToolError(
			'Command substitution, backticks and variable expansion are unsupported, including inside quoted examples. Paste one literal POSIX-style cURL command.'
		);
	const tokens: string[] = [];
	let token = '',
		started = false;
	let quote: "'" | '"' | null = null;
	for (let index = 0; index < input.length; index++) {
		const character = input[index];
		if (quote === "'") {
			if (character === "'") quote = null;
			else token += character;
			continue;
		}
		if (character === '\\') {
			const next = input[++index];
			if (next === undefined) throw new ToolError('A trailing backslash is incomplete.');
			if (next === '\n') continue;
			if (next === '\r' && input[index + 1] === '\n') {
				index++;
				continue;
			}
			if (quote === '"' && !['$', '"', '\\'].includes(next)) token += '\\';
			token += next;
			started = true;
			continue;
		}
		if (quote === '"') {
			if (character === '"') quote = null;
			else {
				if (character === '$')
					throw new ToolError('Shell variables are not expanded. Use literal values.');
				token += character;
			}
			continue;
		}
		if (character === "'" || character === '"') {
			quote = character;
			started = true;
			continue;
		}
		if (/[|&;<>()[\]{}]/.test(character))
			throw new ToolError(
				'Shell operators, redirects, glob/braces and multi-command constructs are unsupported. Quote literal URL query strings.'
			);
		if (character === '$' || character === '#')
			throw new ToolError('Shell variables/comments are unsupported. Quote literal values.');
		if (/\s/.test(character)) {
			if (started) {
				tokens.push(token);
				token = '';
				started = false;
			}
		} else {
			token += character;
			started = true;
		}
		if (tokens.length > 1000) throw new ToolError('cURL argument limit reached (1,000).');
	}
	if (quote) throw new ToolError('Unclosed POSIX quote. PowerShell syntax is not supported.');
	if (started) tokens.push(token);
	return tokens;
}
function header(input: string): CurlHeader {
	if (/[\r\n]/.test(input) || input.startsWith('@'))
		throw new ToolError('Header files and multiline headers are unsupported.');
	const separator = input.indexOf(':');
	const empty = separator < 0 && input.endsWith(';');
	if (separator < 0 && !empty)
		throw new ToolError('Use Header: value, Header: to remove, or Header; for an empty value.');
	const name = empty ? input.slice(0, -1) : input.slice(0, separator);
	if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new ToolError('Invalid HTTP header name.');
	const value = empty ? '' : input.slice(separator + 1).trim();
	return { name, value, action: !empty && !value ? 'remove' : 'set' };
}
export function inspectCurl(input: string, reveal = false): CurlInspection {
	assertTextLimit(input, 128 * 1024);
	const tokens = tokenize(input.trim());
	if (tokens.shift() !== 'curl')
		throw new ToolError(
			'Begin with curl. This inspector supports one POSIX-style literal command, not PowerShell Invoke-WebRequest.'
		);
	let url = '',
		method = '',
		get = false,
		optionsEnded = false;
	const headers: CurlHeader[] = [],
		data: string[] = [];
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (token === '--' && !optionsEnded) {
			optionsEnded = true;
			continue;
		}
		if (!optionsEnded && (token === '-G' || token === '--get')) {
			get = true;
			continue;
		}
		let option = token,
			attached: string | undefined;
		if (!optionsEnded && /^--[^=]+=/.test(token)) {
			const separator = token.indexOf('=');
			option = token.slice(0, separator);
			attached = token.slice(separator + 1);
		} else if (!optionsEnded && /^-[XHd].+/.test(token)) {
			option = token.slice(0, 2);
			attached = token.slice(2);
		}
		if (
			!optionsEnded &&
			[
				'-X',
				'--request',
				'-H',
				'--header',
				'-d',
				'--data',
				'--data-raw',
				'--data-binary',
				'--url'
			].includes(option)
		) {
			const value = attached ?? tokens[++index];
			if (value === undefined) throw new ToolError('An option is missing its literal value.');
			if (option === '-X' || option === '--request') {
				if (!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(value))
					throw new ToolError('Use a literal HTTP method name.');
				method = value;
			} else if (option === '-H' || option === '--header') headers.push(header(value));
			else if (option === '--url') {
				if (url) throw new ToolError('Only one target URL is supported.');
				url = value;
			} else {
				if (value.startsWith('@') && option !== '--data-raw')
					throw new ToolError(
						'File/stdin body references are unsupported. No file is read. Use a literal body.'
					);
				data.push(value);
			}
			continue;
		}
		if (!optionsEnded && token.startsWith('-'))
			throw new ToolError(
				'Unsupported cURL option. Supported: -X, -H, -d, --data, --data-raw, --data-binary, -G and --url.'
			);
		if (url) throw new ToolError('Only one URL and one command are supported.');
		url = token;
	}
	if (headers.length > 200) throw new ToolError('Header limit reached (200).');
	if (!url) throw new ToolError('The command needs an absolute HTTP(S) target URL.');
	const parsed = inspectUrl(url);
	if (!['http:', 'https:'].includes(parsed.protocol))
		throw new ToolError('Only HTTP(S) URLs are supported. No URL is opened or fetched.');
	const target = new URL(parsed.original);
	const bodyText = data.length ? data.join('&') : null;
	if (bodyText !== null) assertTextLimit(bodyText, 65536);
	if (get && bodyText !== null)
		target.search = target.search ? target.search.slice(1) + '&' + bodyText : bodyText;
	// Validate newly formed query escapes too; data is transferred literally as curl -G does.
	const query = inspectUrl(target.href).query;
	const body = get ? null : bodyText;
	if (data.length && !get && !headers.some((item) => item.name.toLowerCase() === 'content-type'))
		headers.push({
			name: 'Content-Type',
			value: 'application/x-www-form-urlencoded',
			action: 'set'
		});
	if (!reveal) {
		if (target.username) target.username = 'REDACTED';
		if (target.password) target.password = 'REDACTED';
		const redactedQuery = new URLSearchParams();
		for (const pair of query) {
			if (sensitive.test(pair.key)) pair.value = 'REDACTED';
			redactedQuery.append(pair.key, pair.value);
		}
		target.search = redactedQuery.toString();
		if (target.hash) target.hash = 'REDACTED';
		for (const item of headers)
			if (sensitive.test(item.name) && item.value) item.value = 'REDACTED';
	}
	return {
		method: method || (get || !data.length ? 'GET' : 'POST'),
		target: target.href,
		headers,
		query,
		body: body === null ? null : reveal ? body : '[REDACTED body — reveal to inspect]',
		bodyBytes: body === null ? 0 : new TextEncoder().encode(body).length,
		redacted: !reveal,
		notices: [
			'Parsed only. No command, file access or request is executed.',
			'POSIX literal subset; no PowerShell, shell expansion, URL globbing, redirects or multiple targets.',
			'Other implicit curl defaults depend on the curl version and are not reconstructed.',
			'Input above remains visible. Result redaction covers sensitive header/query names, URL credentials/fragments and all bodies; it cannot identify every secret in URL paths or custom names.'
		]
	};
}
