import { format } from 'sql-formatter';
import { ToolError, assertTextLimit } from '../tool-errors';
export type SqlOptions = {
	dialect: 'postgresql' | 'mysql' | 'sqlite';
	keywordCase: 'upper' | 'lower' | 'preserve';
	indent: '2' | '4' | 'tab';
};
export function formatSql(input: string, options: SqlOptions): string {
	assertTextLimit(input, 128 * 1024);
	if (!input.trim()) throw new ToolError('Enter SQL to format.');
	if (!['postgresql', 'mysql', 'sqlite'].includes(options.dialect))
		throw new ToolError('Unsupported SQL dialect.');
	try {
		return format(input, {
			language: options.dialect,
			keywordCase: options.keywordCase,
			tabWidth: options.indent === '4' ? 4 : 2,
			useTabs: options.indent === 'tab',
			paramTypes: { named: [':', '@', '$'], numbered: ['$', '?'], positional: true }
		});
	} catch {
		throw new ToolError(
			'SQL could not be formatted in this dialect. Check quoting and dialect-specific syntax. Formatting does not validate or repair SQL.'
		);
	}
}
