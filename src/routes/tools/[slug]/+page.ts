import { error } from '@sveltejs/kit';
import { v1Tools } from '#lib/tools/tool-registry.js';
export const entries = () => v1Tools.map((tool) => ({ slug: tool.slug }));
export const load = ({ params }: { params: { slug: string } }) => {
	const tool = v1Tools.find((item) => item.slug === params.slug);
	if (!tool) error(404, 'Tool not found');
	return { tool };
};
