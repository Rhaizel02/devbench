$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$nodeExecutable = if (Test-Path -LiteralPath $bundledNode) { $bundledNode } else { (Get-Command node -ErrorAction Stop).Source }
$majorVersion = [int]((& $nodeExecutable --version).TrimStart('v').Split('.')[0])
if ($majorVersion -lt 24) { throw 'DevBench requires Node 24 or later.' }
if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'))) { throw 'Run npm ci with Node 24 before starting DevBench.' }
& $nodeExecutable (Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js') dev --open
