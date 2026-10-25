import { Cron, type CronOptions } from 'croner';
import cronstrue from 'cronstrue';
import { convertTimestamp } from '../timestamp-converter/timestamp-engine';
import { ToolError, assertTextLimit } from '../tool-errors';
export type CronSyntax = 'unix' | 'spring';
export type CronResult = {
	description: string;
	dayRule: string;
	fields: { name: string; value: string }[];
	occurrences: { utc: string; zoned: string }[];
	timeZone: string;
	start: string;
	horizon: string;
	limited: boolean;
	dstPolicy: string;
};
export function exploreCron(
	expression: string,
	syntax: CronSyntax,
	timeZone: string,
	requested: number,
	start: string
): CronResult {
	assertTextLimit(expression, 512);
	assertTextLimit(timeZone, 128);
	if (!['unix', 'spring'].includes(syntax))
		throw new ToolError('Choose 5-field Unix or 6-field Spring syntax.');
	const fields = expression.trim().split(/\s+/);
	const spring = syntax === 'spring';
	if (fields.length !== (spring ? 6 : 5))
		throw new ToolError(
			spring
				? 'Spring requires exactly 6 fields: second minute hour day month weekday.'
				: 'Unix requires exactly 5 fields: minute hour day month weekday.'
		);
	const domIndex = spring ? 3 : 2,
		dowIndex = spring ? 5 : 4;
	for (let index = 0; index < fields.length; index++) {
		if (
			fields[index].includes('?') &&
			(!spring || ![domIndex, dowIndex].includes(index) || fields[index] !== '?')
		)
			throw new ToolError(
				'? is supported only as an entire Spring day-of-month or weekday wildcard.'
			);
		const normalized = fields[index].replace(
			/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|SUN|MON|TUE|WED|THU|FRI|SAT/gi,
			'1'
		);
		if (/[^\d*,?/-]/.test(normalized))
			throw new ToolError(
				'Unsupported modifier or name. L, W, #, +, macros and year fields are not supported; use numbers, names, lists, ranges and steps.'
			);
	}
	if (!Number.isFinite(requested)) throw new ToolError('Enter an occurrence count from 1 to 20.');
	const count = Math.max(1, Math.min(20, Math.trunc(requested)));
	const startDate = new Date(convertTimestamp(start, 'iso', timeZone).utc);
	if (startDate.getUTCFullYear() < 1970 || startDate.getUTCFullYear() > 9990)
		throw new ToolError('Cron start year must be between 1970 and 9990.');
	const horizon = new Date(startDate);
	horizon.setUTCFullYear(horizon.getUTCFullYear() + 5);
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
		timeZoneName: 'longOffset'
	});
	const partsFormatter = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const offsets = new Map<number, number>();
	function offsetAt(time: number): number {
		const second = Math.floor(time / 1000) * 1000;
		if (offsets.has(second)) return offsets.get(second)!;
		const parts = Object.fromEntries(
			partsFormatter
				.formatToParts(new Date(second))
				.filter((part) => part.type !== 'literal')
				.map((part) => [part.type, Number(part.value)])
		);
		const wall = new Date(0);
		wall.setUTCFullYear(parts.year, parts.month - 1, parts.day);
		wall.setUTCHours(parts.hour, parts.minute, parts.second, 0);
		const offset = wall.getTime() - second;
		offsets.set(second, offset);
		return offset;
	}
	const options: CronOptions = {
		timezone: timeZone,
		domAndDow: spring,
		alternativeWeekdays: false,
		mode: spring ? '6-part' : '5-part',
		paused: true,
		stopAt: horizon
	};
	let job: Cron | undefined;
	try {
		job = new Cron(fields.map((field) => (field === '?' ? '*' : field)).join(' '), options);
		const occurrences: CronResult['occurrences'] = [];
		let cursor = startDate.getTime();
		for (let index = 0; index < count; index++) {
			let next = job.nextRun(new Date(cursor));
			const probe = next?.getTime() ?? cursor;
			// Some library versions shift nonexistent times. Only exact field matches count.
			for (let skipped = 0; next && !job.match(next); skipped++) {
				if (skipped >= 64)
					throw new ToolError(
						'Cron exceeded the 64-candidate calendar correction budget. Narrow the schedule.'
					);
				next = job.nextRun(next);
			}
			// Enumerate the actual windows around gaps/overlaps through the same parser
			// at fixed offsets. Probe the cursor and candidate to cover distant transitions.
			for (const center of new Set([cursor, probe])) {
				let lo = Math.floor((center - 36 * 3600000) / 1000) * 1000,
					hi = Math.ceil((center + 36 * 3600000) / 1000) * 1000;
				const before = offsetAt(lo),
					after = offsetAt(hi);
				if (before !== after) {
					while (hi - lo > 1000) {
						const mid = Math.floor((lo + hi) / 2000) * 1000;
						if (offsetAt(mid) === before) lo = mid;
						else hi = mid;
					}
					const delta = Math.abs(before - after);
					const repeatEnd = hi + delta;
					if (next && next.getTime() <= cursor)
						next = job.nextRun(new Date(Math.max(cursor, repeatEnd - 1000)));
					if (cursor < repeatEnd) {
						const windows =
							before > after
								? [
										[hi - delta, hi, before],
										[hi, repeatEnd, after]
									]
								: [[hi, repeatEnd, after]];
						for (const [windowStart, windowEnd, offset] of windows) {
							const fixed = new Cron(
								fields.map((field) => (field === '?' ? '*' : field)).join(' '),
								{
									...options,
									timezone: undefined,
									utcOffset: offset / 60000
								}
							);
							try {
								const alternate = fixed.nextRun(new Date(Math.max(cursor, windowStart - 1000)));
								if (
									alternate &&
									alternate.getTime() >= windowStart &&
									alternate.getTime() < windowEnd &&
									alternate.getTime() > cursor &&
									job.match(alternate) &&
									(!next || alternate < next)
								)
									next = alternate;
							} finally {
								fixed.stop();
							}
						}
					}
				}
			}
			if (!next || next > horizon) break;
			if (next.getTime() <= cursor)
				throw new ToolError(
					'Cron iterator did not advance. Reduce the expression or change the starting instant.'
				);
			cursor = next.getTime();
			occurrences.push({ utc: next.toISOString(), zoned: formatter.format(next) });
		}
		const dayRule = spring
			? 'Spring: day-of-month AND weekday constraints must both match; ? means unrestricted. 0 and 7 are Sunday.'
			: 'Unix: when both day fields are restricted they combine with OR; otherwise the restricted field applies. 0 and 7 are Sunday.';
		let description = 'Matches the field constraints below.';
		try {
			description = cronstrue.toString(expression, {
				use24HourTimeFormat: true,
				dayOfWeekStartIndexZero: true,
				throwExceptionOnParseError: true
			});
		} catch {
			/* Field table remains authoritative. */
		}
		if (!spring && !['*', '?'].includes(fields[domIndex]) && !['*', '?'].includes(fields[dowIndex]))
			description = 'At the specified time when either the day of month OR the weekday matches.';
		return {
			description,
			dayRule,
			fields: (spring
				? ['Second', 'Minute', 'Hour', 'Day of month', 'Month', 'Weekday']
				: ['Minute', 'Hour', 'Day of month', 'Month', 'Weekday']
			).map((name, index) => ({ name, value: fields[index] })),
			occurrences,
			timeZone,
			start: startDate.toISOString(),
			horizon: horizon.toISOString(),
			limited: occurrences.length < count,
			dstPolicy:
				'Nonexistent wall times in DST gaps are skipped. Both matching instants in an overlap are listed with distinct UTC offsets. These are expression occurrences, not a guarantee of a daemon’s execution policy.'
		};
	} catch (error) {
		if (error instanceof ToolError) throw error;
		throw new ToolError(
			'Invalid cron fields or unsupported schedule. Check ranges, positive steps, field count and timezone.'
		);
	} finally {
		job?.stop();
	}
}
