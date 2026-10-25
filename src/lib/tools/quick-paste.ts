export function detectPaste(input: string): 'JSON' | 'JWT' | 'URL' | 'SQL' | null {
	const value = input.trim();
	if (!value) return null;
	if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(value)) return 'JWT';
	if (/^https?:\/\/\S+$/i.test(value)) return 'URL';
	if (/^(select|insert|update|delete|with|create|alter|drop)\b/i.test(value)) return 'SQL';
	if (/^[{["\d-]/.test(value) || /^(true|false|null)$/.test(value)) return 'JSON';
	return null;
}
