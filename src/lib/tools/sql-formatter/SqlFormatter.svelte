<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import { formatSql, type SqlOptions } from './sql-engine';
	let dialect = $state<SqlOptions['dialect']>('postgresql');
	let keywordCase = $state<SqlOptions['keywordCase']>('upper');
	let indent = $state<SqlOptions['indent']>('2');
	const settings = $derived({ dialect, keywordCase, indent });
	const sample = $derived(
		dialect === 'postgresql'
			? "-- Synthetic example\nselect id, profile->>'name' as name from users where active = true and id = $1 order by id;"
			: dialect === 'mysql'
				? '-- Synthetic example\nselect `id`, `name` from `users` where active = 1 and id = ? order by id;'
				: '-- Synthetic example\nselect id, name from users where active = 1 and id = :user_id order by id;'
	);
</script>

<TextWorkspace
	transform={(input) => formatSql(input, settings)}
	revision={JSON.stringify(settings)}
	action="Format SQL"
	inputLabel="SQL input"
	outputLabel="Formatted SQL"
	inputLanguage="sql"
	outputLanguage="sql"
	filename="devbench-formatted.sql"
	{sample}
	inputLimitLabel="128 KiB limit"
>
	{#snippet options()}<label
			>Dialect<select aria-label="SQL dialect" bind:value={dialect}
				><option value="postgresql">PostgreSQL</option><option value="mysql">MySQL</option><option
					value="sqlite">SQLite</option
				></select
			></label
		>
		<label
			>Keywords<select aria-label="Keyword case" bind:value={keywordCase}
				><option value="upper">UPPER</option><option value="lower">lower</option><option
					value="preserve">Preserve</option
				></select
			></label
		>
		<label
			>Indent<select aria-label="SQL indentation" bind:value={indent}
				><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab"
					>Tab</option
				></select
			></label
		>{/snippet}
	{#snippet help()}<p>
			Formats with sql-formatter; it does not validate, repair or execute SQL. Comments, quoted
			identifiers and placeholder values stay in the text. No parameter replacement or database
			connection. Dialect extensions and procedural SQL may not be supported; check formatted
			queries before use.
		</p>{/snippet}
</TextWorkspace>
