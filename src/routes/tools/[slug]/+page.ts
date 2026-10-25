import { error } from '@sveltejs/kit';
import { listedTools } from '#lib/tools/tool-registry.js';
export const entries = () => listedTools.map((tool) => ({ slug: tool.slug }));
export const load = ({ params }: { params: { slug: string } }) => {
	const tool = listedTools.find((item) => item.slug === params.slug);
	if (!tool) error(404, 'Tool not found');
	return { tool };
};
