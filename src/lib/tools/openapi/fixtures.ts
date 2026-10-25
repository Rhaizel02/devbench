import type { JsonObject } from './model';
/** Local synthetic Spring Boot-style contracts. Never fetched from an API. */
export function sampleContract(): JsonObject {
	return {
		openapi: '3.1.1',
		info: {
			title: 'Synthetic Orders API',
			version: '1.0.0',
			description: 'Local test contract. No requests are executed.'
		},
		servers: [
			{
				url: 'https://{environment}.example.test/v1',
				variables: { environment: { default: 'sandbox', enum: ['sandbox', 'staging'] } }
			}
		],
		tags: [{ name: 'Orders', description: 'Synthetic order lifecycle' }],
		security: [{ tenantKey: [] }],
		components: {
			securitySchemes: { tenantKey: { type: 'apiKey', in: 'header', name: 'X-Tenant-Credential' } },
			schemas: {
				Order: {
					type: 'object',
					required: ['id', 'status'],
					properties: {
						id: { type: 'string', example: 'order-42' },
						status: { type: 'string', enum: ['pending', 'complete'] },
						parent: { $ref: '#/components/schemas/Order' },
						note: { type: ['string', 'null'] }
					}
				},
				CreateOrder: {
					type: 'object',
					required: ['name'],
					properties: {
						name: { type: 'string', example: 'Synthetic notebook' },
						quantity: { type: 'integer', default: 1, minimum: 1 }
					}
				}
			}
		},
		paths: {
			'/orders': {
				get: {
					operationId: 'listOrders',
					summary: 'List orders',
					tags: ['Orders'],
					parameters: [
						{ name: 'status', in: 'query', schema: { type: 'string', default: 'pending' } },
						{
							name: 'labels',
							in: 'query',
							schema: { type: 'array', items: { type: 'string' } },
							example: ['new', 'priority']
						}
					],
					responses: {
						'200': {
							description: 'Order list',
							content: {
								'application/json': {
									schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } }
								}
							},
							headers: {
								'X-Total-Count': { description: 'Total orders', schema: { type: 'integer' } }
							}
						}
					}
				},
				post: {
					operationId: 'createOrder',
					summary: 'Create an order',
					tags: ['Orders'],
					requestBody: {
						required: true,
						content: {
							'application/json': { schema: { $ref: '#/components/schemas/CreateOrder' } }
						}
					},
					responses: {
						'201': {
							description: 'Created',
							content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } }
						},
						'400': { description: 'Invalid request' }
					}
				}
			},
			'/orders/{id}': {
				parameters: [
					{
						name: 'id',
						in: 'path',
						required: true,
						schema: { type: 'string', example: 'order-42' }
					}
				],
				get: {
					operationId: 'getOrder',
					summary: 'Find an order',
					tags: ['Orders'],
					responses: {
						'200': {
							description: 'Found',
							content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } }
						},
						'404': { description: 'Not found' }
					}
				}
			},
			'/health': {
				get: {
					operationId: 'health',
					summary: 'Health status',
					security: [],
					responses: { '200': { description: 'Healthy' } }
				}
			}
		}
	};
}
export function evolvedContract(): JsonObject {
	const value = sampleContract();
	value.info = {
		title: 'Synthetic Orders API',
		version: '2.0.0',
		description: 'Synthetic evolution for a Spring Boot consumer.'
	};
	const paths = value.paths as JsonObject;
	delete paths['/orders/{id}'];
	const list = (paths['/orders'] as JsonObject).get as JsonObject;
	(list.parameters as JsonObject[]).push({
		name: 'region',
		in: 'query',
		required: true,
		schema: { type: 'string' }
	});
	paths['/metrics'] = { get: { security: [], responses: { '200': { description: 'Metrics' } } } };
	const components = value.components as JsonObject,
		schemas = components.schemas as JsonObject,
		create = schemas.CreateOrder as JsonObject;
	(create.required as string[]).push('quantity');
	const order = schemas.Order as JsonObject;
	((order.properties as JsonObject).status as JsonObject).enum = [
		'pending',
		'complete',
		'cancelled'
	];
	return value;
}
