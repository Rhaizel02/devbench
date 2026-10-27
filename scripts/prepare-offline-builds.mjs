import { cp, mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
const workspace = resolve('.');
const build = resolve('build');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const npm = process.env.npm_execpath ?? '';
if (!npm) throw new Error('Run this through npm run test:offline.');
/** @param {string} version */
function buildVersion(version) {
	const result = spawnSync(process.execPath, [npm, 'run', 'build'], {
		stdio: 'inherit',
		windowsHide: true,
		env: { ...process.env, DEVBENCH_BUILD_ID: version }
	});
	if (result.status !== 0) throw new Error('Offline artifact build failed.');
}
await mkdir('work', { recursive: true });
const directory = await mkdtemp(join(workspace, 'work', 'v23-builds-'));
const aRoot = join(directory, 'a'),
	bRoot = join(directory, 'b');
buildVersion(sourceSha);
await cp(build, aRoot, { recursive: true });
buildVersion(sourceSha + '-update');
// Verified absolute paths before moving our own temporary adapter output. No user folders/deletion.
for (const path of [build, directory, aRoot, bRoot])
	if (!path.startsWith(workspace + sep) || path === workspace)
		throw new Error('Artifact outside workspace.');
await rename(build, bRoot);
await cp(aRoot, build, { recursive: true });
const aVersion = JSON.parse(await readFile(join(aRoot, 'offline-build.json'), 'utf8')).version;
const bVersion = JSON.parse(await readFile(join(bRoot, 'offline-build.json'), 'utf8')).version;
await writeFile(
	'work/v23-offline-artifacts.json',
	JSON.stringify({ sourceSha, aRoot, bRoot, aVersion, bVersion }, null, 2)
);
console.log(
	`Two complete real production artifacts: ${aVersion} → ${bVersion}; default build restored.`
);
