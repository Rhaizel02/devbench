import { listedTools } from './tool-registry';
import { boundedJson } from './json-query/query-engine';
import { importCurl, buildRequest } from './http-request/http-engine';
import { validateJson } from './json-studio/json-engine';
export function handoffTargets(source: string, text: string) {
	const size = new TextEncoder().encode(text).length;
	if (size > 1024 * 1024) return [];
	let ids: string[] = [];
	if (source === 'DATA-07') {
		const parsed = validateJson(text);
		if (parsed.status !== 'valid') return [];
		ids = ['DATA-01'];
		const stack = [{ value: parsed.value, depth: 0 }];
		let count = 0,
			diff = true;
		while (stack.length) {
			const item = stack.pop()!;
			if (++count > 100000 || item.depth > 128) {
				diff = false;
				break;
			}
			if (item.value && typeof item.value === 'object')
				for (const value of Object.values(item.value)) stack.push({ value, depth: item.depth + 1 });
		}
		if (diff) ids.push('DATA-02');
		try {
			boundedJson(text);
			ids.push('DATA-05');
		} catch {
			/* Other targets have their own larger structural budgets. */
		}
	}
	if (source === 'BACK-08' && size <= 128 * 1024) ids = ['TEXT-01'];
	if (source === 'BACK-06' && size <= 128 * 1024) ids = ['BACK-03'];
	if (['BACK-03', 'BACK-10'].includes(source) && size <= 128 * 1024) ids = ['BACK-06'];
	if (ids.some((id) => id === 'BACK-03' || id === 'BACK-06')) {
		try {
			const request = importCurl(text);
			buildRequest(
				request.method,
				request.url,
				request.headers.map((header) => header.name + ': ' + header.value).join('\n'),
				'',
				request.body ?? '',
				request.body === null ? 'none' : 'text'
			);
		} catch {
			return [];
		}
	}
	if (['DATA-01', 'DATA-05', 'DATA-06', 'ENC-01', 'DATA-03'].includes(source)) {
		try {
			const value = boundedJson(text);
			ids =
				source === 'DATA-01'
					? ['DATA-05']
					: source === 'DATA-05'
						? ['DATA-01', 'DATA-06']
						: ['DATA-01'];
			if (
				source === 'DATA-05' &&
				Array.isArray(value) &&
				value.length > 0 &&
				value.length <= 5000 &&
				value.every(
					(row) =>
						row !== null &&
						typeof row === 'object' &&
						!Array.isArray(row) &&
						Object.keys(row).length > 0 &&
						Object.values(row).every((cell) => cell === null || typeof cell !== 'object')
				)
			) {
				const keys = new Set(value.flatMap((row) => Object.keys(row!)));
				if (
					keys.size <= 200 &&
					[...keys].every(
						(key) => key.length > 0 && new TextEncoder().encode(key).length <= 65536
					) &&
					value.every((row) =>
						Object.values(row!).every(
							(cell) => new TextEncoder().encode(String(cell ?? '')).length <= 65536
						)
					)
				)
					ids.push('DATA-04');
			}
		} catch {
			return [];
		}
	}
	return listedTools.filter((tool) => ids.includes(tool.id));
}
