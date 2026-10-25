import type { JsonValue } from '../json-studio/json-engine';
export type { JsonValue } from '../json-studio/json-engine';
export type JsonObject = { [key: string]: JsonValue };
export type InputFormat = 'auto' | 'json' | 'yaml';
export const OPENAPI_LIMITS = {
	bytes: 2 * 1024 * 1024,
	depth: 64,
	nodes: 100000,
	operations: 2000,
	schemas: 4000,
	references: 12000,
	issues: 200,
	string: 256 * 1024,
	resultBytes: 8 * 1024 * 1024,
	parseMs: 2000,
	diffMs: 3500,
	changes: 2000
} as const;
export const HTTP_METHODS = [
	'get',
	'put',
	'post',
	'delete',
	'options',
	'head',
	'patch',
	'trace'
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
export type Issue = { path: string; message: string; severity: 'warning' | 'error' };
export type Reference = {
	path: string;
	ref: string;
	status: 'internal' | 'external' | 'missing' | 'cycle' | 'unsupported';
	target?: string;
	resolvedTarget?: string;
	chain?: string[];
	message?: string;
};
export type Server = {
	url: string;
	description: string;
	variables: Record<string, { default: string; description: string; enum?: string[] }>;
};
export type SecurityRequirement = Record<string, string[]>;
export type SecurityScheme = {
	name: string;
	type: string;
	description: string;
	in?: string;
	parameterName?: string;
	scheme?: string;
	bearerFormat?: string;
	details: JsonObject;
};
export type Example = {
	name: string;
	source: 'example' | 'default';
	value?: JsonValue;
	unavailable?: string;
};
export type MediaType = {
	name: string;
	path: string;
	schemaPath?: string;
	examples: Example[];
	encoding: boolean;
};
export type Parameter = {
	key: string;
	path: string;
	name: string;
	in: 'path' | 'query' | 'header' | 'cookie';
	description: string;
	required: boolean;
	deprecated: boolean;
	style: string;
	explode: boolean;
	allowReserved: boolean;
	schemaPath?: string;
	examples: Example[];
	content: MediaType[];
};
export type ResponseHeader = {
	name: string;
	path: string;
	description: string;
	required: boolean;
	schemaPath?: string;
	examples: Example[];
};
export type Response = {
	status: string;
	path: string;
	description: string;
	content: MediaType[];
	headers: ResponseHeader[];
	unresolved?: string;
};
export type RequestBody = {
	path: string;
	description: string;
	required: boolean;
	content: MediaType[];
	unresolved?: string;
};
export type Operation = {
	id: string;
	pointer: string;
	method: HttpMethod;
	route: string;
	operationId: string;
	summary: string;
	description: string;
	deprecated: boolean;
	tags: string[];
	parameters: Parameter[];
	requestBody?: RequestBody;
	responses: Response[];
	servers: Server[];
	serverSource: 'operation' | 'path' | 'root' | 'default';
	security: SecurityRequirement[];
	securitySource: 'operation' | 'root' | 'none';
	unresolved: boolean;
};
export type Contract = {
	format: 'json' | 'yaml';
	openapi: string;
	family: '3.0' | '3.1';
	title: string;
	version: string;
	description: string;
	root: JsonObject;
	servers: Server[];
	tags: { name: string; description: string }[];
	operations: Operation[];
	schemas: { name: string; path: string }[];
	securitySchemes: SecurityScheme[];
	references: Reference[];
	issues: Issue[];
	statistics: {
		bytes: number;
		nodes: number;
		operations: number;
		schemas: number;
		references: number;
		externalReferences: number;
	};
};
export type SchemaEntry = {
	name: string;
	path: string;
	kind: string;
	required: boolean;
	value: JsonValue;
};
export type ChangeSeverity = 'breaking' | 'potential' | 'compatible-limited' | 'indeterminate';
export type ContractChange = {
	path: string;
	category:
		| 'endpoint'
		| 'parameter'
		| 'request'
		| 'response'
		| 'security'
		| 'schema'
		| 'documentation'
		| 'metadata';
	severity: ChangeSeverity;
	message: string;
};
export type ContractDiff = {
	before: { title: string; version: string; openapi: string };
	after: { title: string; version: string; openapi: string };
	changes: ContractChange[];
	counts: Record<ChangeSeverity, number>;
	limitations: string[];
};
