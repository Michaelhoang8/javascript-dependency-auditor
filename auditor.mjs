function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
const sorted = values => [...values].sort(compare);

export function parseGraph(value) {
  if (!value || !Array.isArray(value.packages)) throw new Error('packages must be an array');
  if (value.packages.length > 10000) throw new Error('maximum 10000 packages');
  const graph = new Map();
  let edges = 0;
  for (const entry of value.packages) {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 200) throw new Error('package name must contain 1-200 characters');
    if (graph.has(entry.name)) throw new Error(`duplicate package: ${entry.name}`);
    if (!Array.isArray(entry.dependencies) || entry.dependencies.some(x => typeof x !== 'string' || !x.trim() || x.length > 200)) throw new Error(`invalid dependencies for ${entry.name}`);
    edges += entry.dependencies.length;
    if (edges > 100000) throw new Error('maximum 100000 dependency declarations');
    graph.set(entry.name, sorted(new Set(entry.dependencies)));
  }
  return new Map(sorted(graph.keys()).map(name => [name, graph.get(name)]));
}

export function analyze(value, focus) {
  const all = parseGraph(value);
  if (focus !== undefined && !all.has(focus)) throw new Error(`unknown focus: ${focus}`);
  const included = new Set();
  const pending = focus === undefined ? [...all.keys()] : [focus];
  while (pending.length) {
    const node = pending.pop();
    if (included.has(node)) continue;
    included.add(node);
    for (const child of all.get(node)) if (all.has(child)) pending.push(child);
  }
  const nodes = sorted(included);
  const graph = new Map(nodes.map(node => [node, all.get(node).filter(x => included.has(x))]));
  const reverse = new Map(nodes.map(node => [node, []]));
  for (const [node, deps] of graph) for (const dep of deps) reverse.get(dep).push(node);
  const visited = new Set(), finished = [];
  // Iterative postorder traversal avoids call-stack failure on deep graphs.
  for (const start of nodes) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack = [[start, 0]];
    while (stack.length) {
      const top = stack[stack.length - 1], deps = graph.get(top[0]);
      if (top[1] < deps.length) {
        const next = deps[top[1]++];
        if (!visited.has(next)) { visited.add(next); stack.push([next, 0]); }
      } else { finished.push(top[0]); stack.pop(); }
    }
  }
  const assigned = new Set(), components = [];
  for (const start of finished.reverse()) {
    if (assigned.has(start)) continue;
    const component = [], stack = [start]; assigned.add(start);
    while (stack.length) {
      const node = stack.pop(); component.push(node);
      for (const next of reverse.get(node)) if (!assigned.has(next)) { assigned.add(next); stack.push(next); }
    }
    components.push(sorted(component));
  }
  components.sort((a, b) => compare(a[0], b[0]));
  const cycles = components.filter(c => c.length > 1 || graph.get(c[0]).includes(c[0]));
  // Edges point package -> dependency, so readiness counts dependencies.
  const counts = new Map(nodes.map(n => [n, graph.get(n).length]));
  let ready = nodes.filter(n => counts.get(n) === 0);
  const order = [];
  while (ready.length) {
    const node = ready.shift(); order.push(node);
    for (const dependent of reverse.get(node)) {
      counts.set(dependent, counts.get(dependent) - 1);
      if (counts.get(dependent) === 0) ready.push(dependent);
    }
    ready.sort(compare);
  }
  const externalDependencies = nodes.flatMap(name => all.get(name).filter(dep => !all.has(dep)).map(dependency => ({package: name, dependency})));
  return {packages: nodes.length, internalEdges: [...graph.values()].reduce((sum, deps) => sum + deps.length, 0), components, cycles, dependencyOrder: cycles.length ? null : order, externalDependencies};
}
