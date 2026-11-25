import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {analyze} from '../auditor.mjs';
const make = entries => ({packages: entries.map(([name, dependencies]) => ({name, dependencies}))});

test('dependency-first order with deterministic independent ties', () => {
  assert.deepEqual(analyze(make([['app',['ui','db']],['ui',['core']],['db',['core']],['core',[]]])).dependencyOrder, ['core','db','ui','app']);
});
test('SCC detects separate cycles and a self-loop without treating downstream nodes as cyclic', () => {
  const report = analyze(make([['a',['b']],['b',['a']],['downstream',['a']],['self',['self']],['leaf',[]]]));
  assert.deepEqual(report.cycles, [['a','b'],['self']]);
  assert.equal(report.dependencyOrder, null);
});
test('externals remain explicit and do not create internal nodes', () => {
  const report = analyze(make([['app',['third-party','third-party']]]));
  assert.deepEqual(report.externalDependencies, [{package:'app',dependency:'third-party'}]);
  assert.deepEqual(report.dependencyOrder, ['app']);
  assert.equal(report.internalEdges, 0);
});
test('focus traverses dependencies and excludes unrelated cycles', () => {
  const graph = make([['app',['core']],['core',[]],['cycle',['cycle']]]);
  assert.deepEqual(analyze(graph,'app').dependencyOrder, ['core','app']);
  assert.throws(() => analyze(graph,'unknown'), /unknown focus/);
});
test('input declaration ordering does not change the result', () => {
  assert.deepEqual(analyze(make([['z',['a','b']],['a',[]],['b',[]]])), analyze(make([['b',[]],['z',['b','a']],['a',[]]])));
});
test('invalid graph and duplicate names fail before analysis', () => {
  for (const graph of [null, {}, {packages:[null]}, make([['a',[]],['a',[]]]), {packages:[{name:'a',dependencies:[1]}]}]) assert.throws(() => analyze(graph));
});
test('prototype-like names are ordinary Map keys', () => {
  assert.deepEqual(analyze(make([['__proto__',[]],['constructor',['__proto__']]])).dependencyOrder, ['__proto__','constructor']);
});
test('deep graph does not depend on recursive stack size', () => {
  const entries = Array.from({length:6000}, (_, i) => [String(i), i ? [String(i-1)] : []]);
  const report = analyze(make(entries));
  assert.equal(report.dependencyOrder.length,6000);
  assert.equal(report.dependencyOrder.at(-1),'5999');
});
test('CLI returns a machine-readable report and documented cycle exit', () => {
  const result = spawnSync(process.execPath,['cli.mjs','fixtures/workspace.json'],{encoding:'utf8'});
  assert.equal(result.status,1);
  assert.deepEqual(JSON.parse(result.stdout).cycles,[['legacy-api','legacy-storage']]);
  assert.equal(spawnSync(process.execPath,['cli.mjs','--help']).status,0);
});
