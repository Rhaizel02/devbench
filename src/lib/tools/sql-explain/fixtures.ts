export const smallPlan = JSON.stringify(
	[
		{
			Plan: {
				'Node Type': 'Seq Scan',
				'Relation Name': 'synthetic_orders',
				'Startup Cost': 0,
				'Total Cost': 42,
				'Plan Rows': 100,
				'Plan Width': 32,
				'Actual Startup Time': 0.02,
				'Actual Total Time': 1.8,
				'Actual Rows': 110,
				'Actual Loops': 1,
				'Shared Hit Blocks': 12,
				Filter: '(status = paid)'
			},
			'Planning Time': 0.4,
			'Execution Time': 2.1
		}
	],
	null,
	2
);
export const complexPlan = JSON.stringify(
	[
		{
			Plan: {
				'Node Type': 'Sort',
				'Startup Cost': 1100,
				'Total Cost': 1200,
				'Plan Rows': 20,
				'Plan Width': 96,
				'Actual Startup Time': 18,
				'Actual Total Time': 20,
				'Actual Rows': 4200,
				'Actual Loops': 1,
				'Sort Key': ['created_at'],
				'Sort Method': 'external merge',
				'Sort Space Used': 1024,
				'Sort Space Type': 'Disk',
				'Shared Hit Blocks': 800,
				'Shared Read Blocks': 400,
				'Temp Read Blocks': 40,
				'Temp Written Blocks': 48,
				Plans: [
					{
						'Node Type': 'Hash Join',
						'Join Type': 'Inner',
						'Startup Cost': 100,
						'Total Cost': 950,
						'Plan Rows': 20,
						'Plan Width': 96,
						'Actual Startup Time': 2,
						'Actual Total Time': 15,
						'Actual Rows': 4200,
						'Actual Loops': 1,
						'Hash Cond': '(o.customer_id = c.id)',
						'Shared Hit Blocks': 800,
						'Shared Read Blocks': 400,
						Plans: [
							{
								'Node Type': 'Seq Scan',
								'Relation Name': 'orders',
								Alias: 'o',
								'Startup Cost': 0,
								'Total Cost': 700,
								'Plan Rows': 20,
								'Plan Width': 64,
								'Actual Startup Time': 0.03,
								'Actual Total Time': 10,
								'Actual Rows': 4200,
								'Actual Loops': 1,
								'Rows Removed by Filter': 42000,
								Filter: '(status = paid)',
								'Shared Hit Blocks': 600,
								'Shared Read Blocks': 350
							},
							{
								'Node Type': 'Hash',
								'Startup Cost': 70,
								'Total Cost': 70,
								'Plan Rows': 2000,
								'Plan Width': 32,
								'Actual Startup Time': 1,
								'Actual Total Time': 1.5,
								'Actual Rows': 2000,
								'Actual Loops': 1,
								'Hash Batches': 1,
								'Hash Buckets': 2048,
								Plans: [
									{
										'Node Type': 'Index Scan',
										'Relation Name': 'customers',
										'Index Name': 'synthetic_customers_active',
										'Startup Cost': 0.3,
										'Total Cost': 70,
										'Plan Rows': 2000,
										'Plan Width': 32,
										'Actual Startup Time': 0.01,
										'Actual Total Time': 1,
										'Actual Rows': 2000,
										'Actual Loops': 1,
										'Shared Hit Blocks': 200,
										'Shared Read Blocks': 50
									}
								]
							}
						]
					}
				]
			},
			'Planning Time': 0.8,
			'Execution Time': 21.3,
			Settings: { work_mem: '4MB' }
		}
	],
	null,
	2
);
