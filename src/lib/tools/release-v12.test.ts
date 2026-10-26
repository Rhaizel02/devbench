import { it, expect } from 'vitest';
import { tools, categories, searchTools } from './tool-registry';
import { toolWorkspaces } from './tool-workspaces';
it('retains the V1.2 routes alongside the V1.3 extension with unique lazy routes', () => {
	expect(tools).toHaveLength(30);
	expect(tools.filter((tool) => tool.version === 'V1')).toHaveLength(12);
	expect(tools.filter((tool) => tool.version === 'V1.1')).toHaveLength(6);
	expect(tools.filter((tool) => tool.version === 'V1.2')).toHaveLength(7);
	expect(tools.filter((tool) => tool.version === 'V1.3')).toHaveLength(1);
	expect(new Set(tools.map((tool) => tool.slug)).size).toBe(30);
	expect(new Set(tools.map((tool) => tool.id)).size).toBe(30);
	expect(Object.keys(toolWorkspaces).sort()).toEqual(tools.map((tool) => tool.slug).sort());
	expect(
		tools.every((tool) => tool.status === 'available' && categories.includes(tool.category))
	).toBe(true);
});
it('makes each V1.2 tool searchable by its name and unique ID metadata remains separate from payloads', () => {
	for (const tool of tools.filter((tool) => tool.version === 'V1.2'))
		expect(searchTools(tool.name)).toContain(tool);
	expect(tools.find((tool) => tool.id === 'FLOW-01')?.slug).toBe('pipeline-builder');
});
