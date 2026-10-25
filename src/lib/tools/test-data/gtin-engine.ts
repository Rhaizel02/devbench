import { ToolError } from '../tool-errors';
import { choose, type RandomIndex } from './random';
export type GtinKind = 'ean13' | 'gtin14';
export const GTIN_BATCH_LIMIT = 1000;
function bodyLength(kind: GtinKind) {
	if (kind !== 'ean13' && kind !== 'gtin14') throw new ToolError('Choose EAN-13 or GTIN-14.');
	return kind === 'ean13' ? 12 : 13;
}
export function gs1CheckDigit(body: string): string {
	if ((body.length !== 12 && body.length !== 13) || /[^0-9]/.test(body))
		throw new ToolError('Enter exactly 12 or 13 ASCII digits for the check digit.');
	let sum = 0;
	for (let offset = 0; offset < body.length; offset++)
		sum += Number(body[body.length - 1 - offset]) * (offset % 2 === 0 ? 3 : 1);
	return String((10 - (sum % 10)) % 10);
}
export function completeGTIN(body: string, kind: GtinKind): string {
	const length = bodyLength(kind);
	if (body.length !== length || /[^0-9]/.test(body))
		throw new ToolError('Enter exactly ' + length + ' ASCII digits without spaces.');
	return body + gs1CheckDigit(body);
}
export function validateGTIN(value: string, kind: GtinKind) {
	const length = bodyLength(kind) + 1;
	if (value.length !== length || /[^0-9]/.test(value))
		return {
			valid: false,
			message: 'Expected exactly ' + length + ' ASCII digits without spaces.'
		};
	if (value.at(-1) !== gs1CheckDigit(value.slice(0, -1)))
		return { valid: false, message: 'Invalid GS1 modulo 10 check digit.' };
	return {
		valid: true,
		message: 'Valid length and GS1 modulo 10 checksum. Assignment is not checked.'
	};
}
export function generateGTINBatch(
	kind: GtinKind,
	quantity: number,
	prefix: string,
	random: RandomIndex
): string[] {
	const length = bodyLength(kind);
	if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > GTIN_BATCH_LIMIT)
		throw new ToolError('Quantity must be a whole number from 1 to 1,000.');
	if (prefix.length > length || /[^0-9]/.test(prefix))
		throw new ToolError('Prefix must contain 0 to ' + length + ' ASCII digits.');
	const digits = length - prefix.length;
	const space = 10 ** digits;
	if (quantity > space)
		throw new ToolError(
			'Not enough distinct identifiers for this prefix. Shorten the prefix or reduce the quantity.'
		);
	// Floyd sampling: exactly quantity draws, without retrying collisions near a full space.
	const selected = new Set<number>();
	for (let index = space - quantity; index < space; index++) {
		const sample = choose(random, index + 1);
		selected.add(selected.has(sample) ? index : sample);
	}
	return [...selected].map((suffix) =>
		completeGTIN(prefix + (digits ? String(suffix).padStart(digits, '0') : ''), kind)
	);
}
export function exportGTINs(values: string[], format: 'txt' | 'csv'): string {
	return format === 'csv'
		? '"gtin"\n' + values.map((value) => '"' + value + '"').join('\n')
		: values.join('\n');
}
