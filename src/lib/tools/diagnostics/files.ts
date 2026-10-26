import { ToolError } from '../tool-errors';
export async function readDiagnosticFile(file: File | undefined, limit = 2 * 1024 * 1024) {
	if (!file) return undefined;
	if (file.size > limit) throw new ToolError('File exceeds the 2 MiB input limit.');
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
	} catch {
		throw new ToolError('Use a UTF-8 text file. Input has not been changed.');
	}
}
