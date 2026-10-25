import { assertTextLimit, ToolError } from '../tool-errors';
export type LogEntry = {
	line: number;
	level: string;
	timestamp: string | null;
	thread: string | null;
	logger: string | null;
	message: string;
	raw: string;
};
export type JavaException = {
	kind: 'main' | 'caused-by' | 'suppressed';
	name: string;
	message: string;
	frames: string[];
	elided: number;
};
export function inspectLogs(input: string) {
	assertTextLimit(input, 1024 * 1024);
	const lines = input.split(/\r?\n/);
	if (lines.length > 10000 || lines.some((line) => line.length > 16384))
		throw new ToolError('Log limit: 10,000 lines and 16,384 characters per line.');
	const entries: LogEntry[] = [];
	const exceptions: JavaException[] = [];
	const dated =
		/^(?:(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})?)\s+)?(TRACE|DEBUG|INFO|WARN|ERROR)\s+(.*)$/;
	const logback =
		/^(\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s+\[([^\]]+)\]\s+(TRACE|DEBUG|INFO|WARN|ERROR)\s+(.*)$/;
	for (const [index, line] of lines.entries()) {
		const first = dated.exec(line);
		const second = first ? null : logback.exec(line);
		if (first || second) {
			const timestamp = first?.[1] ?? second?.[1] ?? null;
			const level = first?.[2] ?? second![3];
			let rest = (first?.[3] ?? second![4]).replace(/^\d+\s+---\s*/, '');
			let thread: string | null = second?.[2] ?? null;
			for (let group = 0; group < 4; group++) {
				const bracket = /^\[([^\]]{1,200})\]\s*/.exec(rest);
				if (!bracket) break;
				thread = bracket[1];
				rest = rest.slice(bracket[0].length);
			}
			const loggerMatch = /^([\w.$/-]+)\s*(?::| -)\s*(.*)$/.exec(rest);
			entries.push({
				line: index + 1,
				timestamp,
				level,
				thread,
				logger: loggerMatch?.[1] ?? null,
				message: loggerMatch?.[2] ?? rest,
				raw: line
			});
		} else if (entries.length) {
			entries[entries.length - 1].raw += '\n' + line;
			entries[entries.length - 1].message += '\n' + line;
		} else
			entries.push({
				line: index + 1,
				level: 'UNKNOWN',
				timestamp: null,
				thread: null,
				logger: null,
				message: line,
				raw: line
			});
		const exception =
			/(?:^|\s)(?:(Caused by:|Suppressed:)\s*)?((?:[A-Za-z_$][\w$]*\.)*(?:[A-Za-z_$][\w$]*)?(?:Exception|Error|Throwable))(?::\s*(.*))?$/.exec(
				line
			);
		if (exception)
			exceptions.push({
				kind:
					exception[1] === 'Caused by:'
						? 'caused-by'
						: exception[1] === 'Suppressed:'
							? 'suppressed'
							: 'main',
				name: exception[2],
				message: exception[3] ?? '',
				frames: [],
				elided: 0
			});
		else if (exceptions.length) {
			const frame = /^\s*at\s+(\S+\([^)]*\))\s*$/.exec(line);
			const elided = /^\s*\.\.\.\s+(\d+)\s+more\s*$/.exec(line);
			if (frame) exceptions[exceptions.length - 1].frames.push(frame[1]);
			if (elided) exceptions[exceptions.length - 1].elided = Number(elided[1]);
		}
	}
	const counts: Record<string, number> = {
		TRACE: 0,
		DEBUG: 0,
		INFO: 0,
		WARN: 0,
		ERROR: 0,
		UNKNOWN: 0
	};
	for (const entry of entries) counts[entry.level]++;
	const cause =
		exceptions.filter((e) => e.kind === 'caused-by').at(-1) ??
		exceptions.find((e) => e.kind === 'main');
	return {
		entries,
		counts,
		total: entries.length,
		exceptions,
		possibleDeepestCause: cause?.name ?? null,
		note: 'The deepest reported exception is only a candidate cause. Functional root cause cannot be established from this text alone. Unrecognized continuation lines are retained with the preceding entry.'
	};
}
export function filterLogs(
	entries: LogEntry[],
	level: string,
	text: string,
	thread: string,
	logger: string
) {
	const query = text.toLowerCase();
	return entries.filter(
		(entry) =>
			(level === 'ALL' || entry.level === level) &&
			entry.raw.toLowerCase().includes(query) &&
			(!thread || (entry.thread ?? '').includes(thread)) &&
			(!logger || (entry.logger ?? '').includes(logger))
	);
}
