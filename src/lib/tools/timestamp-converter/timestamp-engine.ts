import { ToolError, assertTextLimit } from '../tool-errors';
export type TimestampMode = 'seconds' | 'milliseconds' | 'iso';
export type TimestampResult = {
	epochSeconds: string;
	epochMilliseconds: string;
	utc: string;
	browserLocal: string;
	browserTimeZone: string;
	zoned: string;
	timeZone: string;
};
function epoch(input: string, mode: 'seconds' | 'milliseconds'): number {
	const match = /^(-?)(\d+)(?:\.(\d{1,3}))?$/.exec(input);
	if (!match || (mode === 'milliseconds' && match[3]))
		throw new ToolError(
			'Enter decimal epoch seconds (up to 3 fractional digits) or integer milliseconds; no exponent notation.'
		);
	let value = BigInt(match[2]) * (mode === 'seconds' ? 1000n : 1n);
	if (mode === 'seconds') value += BigInt((match[3] ?? '').padEnd(3, '0'));
	if (match[1]) value = -value;
	if (value < -8640000000000000n || value > 8640000000000000n)
		throw new ToolError('Timestamp exceeds the JavaScript Date range (±8.64e15 milliseconds).');
	return Number(value);
}
function iso(input: string): number {
	const match =
		/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(
			input
		);
	if (!match)
		throw new ToolError(
			'Use YYYY-MM-DDTHH:mm:ss[.SSS]Z or an explicit ±HH:mm offset. Offset-free local times are ambiguous and not accepted.'
		);
	const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
	const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > days[month - 1] ||
		hour > 23 ||
		minute > 59 ||
		second > 59
	)
		throw new ToolError('Invalid calendar date or time. Leap seconds and 24:00 are not supported.');
	const zone = match[8];
	let offset = 0;
	if (zone !== 'Z') {
		const hours = Number(zone.slice(1, 3)),
			minutes = Number(zone.slice(4, 6));
		if (hours > 23 || minutes > 59) throw new ToolError('Invalid ISO UTC offset.');
		offset = (hours * 60 + minutes) * (zone[0] === '-' ? -1 : 1);
	}
	const date = new Date(0);
	date.setUTCFullYear(year, month - 1, day);
	date.setUTCHours(hour, minute, second, Number((match[7] ?? '').padEnd(3, '0')));
	return date.getTime() - offset * 60000;
}
function secondsString(milliseconds: number): string {
	const value = BigInt(milliseconds);
	const absolute = value < 0 ? -value : value;
	const fraction = (absolute % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
	return (value < 0 ? '-' : '') + (absolute / 1000n).toString() + (fraction ? '.' + fraction : '');
}
export function convertTimestamp(
	input: string,
	mode: TimestampMode,
	timeZone = 'UTC'
): TimestampResult {
	assertTextLimit(input, 1024);
	assertTextLimit(timeZone, 128);
	if (!['seconds', 'milliseconds', 'iso'].includes(mode))
		throw new ToolError('Choose an explicit input format.');
	if (!input.trim()) throw new ToolError('Enter a timestamp.');
	const milliseconds = mode === 'iso' ? iso(input.trim()) : epoch(input.trim(), mode);
	const date = new Date(milliseconds);
	try {
		if (!timeZone || /^[+-]/.test(timeZone)) throw new Error();
		const options: Intl.DateTimeFormatOptions = {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3,
			hourCycle: 'h23',
			timeZoneName: 'longOffset'
		};
		const formatter = new Intl.DateTimeFormat('en-GB', options);
		const browserTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
		return {
			epochSeconds: secondsString(milliseconds),
			epochMilliseconds: String(milliseconds),
			utc: date.toISOString(),
			browserLocal: new Intl.DateTimeFormat('en-GB', {
				...options,
				timeZone: browserTimeZone
			}).format(date),
			browserTimeZone,
			zoned: formatter.format(date),
			timeZone: formatter.resolvedOptions().timeZone
		};
	} catch {
		throw new ToolError(
			'Invalid or unsupported IANA timezone. Use UTC or a name such as Europe/Madrid.'
		);
	}
}
