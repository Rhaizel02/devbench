export class ToolError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ToolError';
	}
}
export const TEXT_LIMIT = 1024 * 1024;
export function assertTextLimit(input: string, maximum = TEXT_LIMIT) {
	if (new TextEncoder().encode(input).length > maximum)
		throw new ToolError(
			'Input exceeds the ' +
				(maximum / 1024).toLocaleString('en-US') +
				' KiB limit. Reduce it before processing.'
		);
}
export function errorMessage(error: unknown) {
	return error instanceof ToolError
		? error.message
		: 'This operation could not be completed. Check the input and try again.';
}
export function previewJson(value: unknown, limit = 2000): string {
	try {
		const text = JSON.stringify(value, null, 2) ?? 'undefined';
		return text.length > limit ? text.slice(0, limit) + '\n… (preview truncated)' : text;
	} catch {
		return '(value too deeply nested to preview)';
	}
}
