import { ToolError, assertTextLimit } from '../tool-errors';
import { decodeBase64, encodeBase64 } from '../base64-toolkit/base64-engine';
import { validateJson, type JsonValue } from '../json-studio/json-engine';
export const JWT_NOTICE = 'Decoded only — signature NOT verified.';
export type JwtClaim = {
	name: string;
	value: JsonValue;
	note: string;
	utc?: string;
	local?: string;
};
export type JwtInspection = {
	header: Record<string, JsonValue>;
	payload: JsonValue;
	claims: JwtClaim[];
	warnings: string[];
	inspectedAt: string;
	notice: string;
};
function validateSegment(segment: string, allowEmpty = false) {
	if ((!segment && !allowEmpty) || !/^[A-Za-z0-9_-]*$/.test(segment) || segment.length % 4 === 1)
		throw new ToolError('JWT segments must use unpadded Base64url with valid lengths.');
	// The signature is binary, so validate canonical bits without interpreting it as UTF-8.
	const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
	try {
		if (
			btoa(atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4))).replace(/=+$/, '') !==
			normalized
		)
			throw new Error();
	} catch {
		throw new ToolError('JWT contains non-canonical Base64url encoding.');
	}
}
function parseSegment(segment: string, name: string): JsonValue {
	let decoded: string;
	try {
		decoded = decodeBase64(segment, { urlSafe: true, ignoreWhitespace: false });
	} catch {
		throw new ToolError(name + ' is not valid Base64url UTF-8.');
	}
	const result = validateJson(decoded);
	if (result.status !== 'valid') throw new ToolError(name + ' must contain strict JSON.');
	return result.value;
}
export function inspectJwt(input: string, now = Date.now()): JwtInspection {
	assertTextLimit(input, 64 * 1024);
	const segments = input.trim().split('.');
	if (segments.length !== 3)
		throw new ToolError(
			'Enter exactly three compact JWT segments separated by dots. JWE is not supported.'
		);
	segments.forEach((segment, index) => validateSegment(segment, index === 2));
	const header = parseSegment(segments[0], 'Header');
	const payload = parseSegment(segments[1], 'Payload');
	const stack = [
		{ value: payload, depth: 0 },
		{ value: header, depth: 0 }
	];
	let nodes = 0;
	while (stack.length) {
		const item = stack.pop()!;
		if (++nodes > 10000 || item.depth > 64)
			throw new ToolError('Decoded JWT exceeds 10,000 nodes or 64 levels.');
		if (item.value !== null && typeof item.value === 'object')
			for (const value of Object.values(item.value)) stack.push({ value, depth: item.depth + 1 });
	}
	if (header === null || typeof header !== 'object' || Array.isArray(header))
		throw new ToolError('JWT header must be a JSON object.');
	const warnings: string[] = [];
	if (typeof header.alg !== 'string') warnings.push('Algorithm is missing or has an unusual type.');
	if (header.alg === 'none')
		warnings.push('alg: none claims an unsecured token; no signature is verified.');
	if (!segments[2]) warnings.push('Signature segment is empty.');
	if (header.typ !== undefined && typeof header.typ !== 'string')
		warnings.push('typ should be a string.');
	const claims: JwtClaim[] = [];
	if (payload === null || typeof payload !== 'object' || Array.isArray(payload))
		warnings.push(
			'Payload is not a claims object; decoded JSON is shown without interpreting claims.'
		);
	else
		for (const name of ['iss', 'sub', 'aud', 'iat', 'nbf', 'exp']) {
			if (!Object.hasOwn(payload, name)) continue;
			const value = payload[name];
			let note = 'Unverified claim';
			let utc: string | undefined;
			let local: string | undefined;
			if (['iat', 'nbf', 'exp'].includes(name)) {
				if (
					typeof value !== 'number' ||
					!Number.isFinite(value) ||
					!Number.isFinite(new Date(value * 1000).getTime())
				)
					note = 'Unusual timestamp: expected representable numeric epoch seconds';
				else {
					const date = new Date(value * 1000);
					utc = date.toISOString();
					local = date.toLocaleString();
					note =
						name === 'exp'
							? now >= value * 1000
								? 'Claimed expiration has passed'
								: 'Claimed expiration is in the future'
							: name === 'nbf'
								? now < value * 1000
									? 'Claimed not-before is in the future'
									: 'Claimed not-before has passed'
								: now < value * 1000
									? 'Claimed issue time is in the future'
									: 'Claimed issue time has passed';
				}
			} else if (
				name === 'aud'
					? !(
							typeof value === 'string' ||
							(Array.isArray(value) && value.every((v) => typeof v === 'string'))
						)
					: typeof value !== 'string'
			)
				note = 'Unusual claim type';
			claims.push({ name, value, note, utc, local });
		}
	return {
		header,
		payload,
		claims,
		warnings,
		inspectedAt: new Date(now).toISOString(),
		notice: JWT_NOTICE
	};
}
export function syntheticJwt(): string {
	return (
		[
			JSON.stringify({ alg: 'none', typ: 'JWT' }),
			JSON.stringify({
				sub: 'synthetic-example',
				iss: 'local-example',
				aud: ['devbench'],
				iat: 1700000000,
				exp: 1700003600
			})
		]
			.map((value) => encodeBase64(value, { urlSafe: true, padding: false }))
			.join('.') + '.'
	);
}
