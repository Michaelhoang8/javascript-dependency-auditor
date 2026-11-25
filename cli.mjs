import {readFile} from 'node:fs/promises';
import {analyze} from './auditor.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node cli.mjs graph.json [--focus PACKAGE] [--strict-external]\nAnalyze local package dependencies, cycles and dependency-first order.\nExit: 0 acyclic, 1 cycles, 2 input error, 3 external dependencies in strict mode.');
} else {
  try {
    const file = args.shift();
    if (!file || file.startsWith('--')) throw new Error('provide a graph JSON file; use --help');
    let focus, strict = false;
    while (args.length) {
      const arg = args.shift();
      if (arg === '--focus' && args.length && focus === undefined) focus = args.shift();
      else if (arg === '--strict-external') strict = true;
      else throw new Error(`invalid option: ${arg}`);
    }
    const report = analyze(JSON.parse(await readFile(file, 'utf8')), focus);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.cycles.length ? 1 : strict && report.externalDependencies.length ? 3 : 0;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
