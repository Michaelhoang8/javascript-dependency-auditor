# Dependency Auditor

Analyze a local workspace dependency graph before splitting packages or changing build order. Reports strongly connected components, cyclic groups, dependency-first ordering, and references to packages outside the supplied graph. No registry requests or package installation occurs.

```sh
node cli.mjs --help
node cli.mjs fixtures/workspace.json
node cli.mjs fixtures/workspace.json --focus web
npm test
```

Requires Node.js 20 or later. There are no dependencies. Input is an explicit JSON graph with a `packages` array; each package has `name` and `dependencies` (an array of names). The fixture is an authored example. Its `legacy-api` and `legacy-storage` packages form a cycle; the focused `web` report is acyclic and lists `react` as external.

Edges mean **package depends on dependency**. For acyclic graphs the order places dependencies first. Independent ready packages are selected by JavaScript code-unit ordering, so input ordering and machine locale do not affect output. SCCs are maximal mutually reachable groups, not enumerations of every simple cycle. A self-dependency is a cycle. A cyclic graph returns a null dependency order rather than a misleading partial order.

Repeated dependency declarations are deduplicated. Duplicate package names and malformed declarations fail. Limits: 10,000 packages and 100,000 dependency declarations. Iterative graph traversals avoid recursion limits. Graph analysis is O(V+E), apart from deterministic sorting and the simple sorted ready queue, which can take quadratic time for wide graphs. Input is loaded into memory.

Exit codes: **0** acyclic; **1** cycles; **2** malformed input or file error; **3** external references when `--strict-external` is enabled. A cycle takes precedence over strict external-reference failure. `--focus NAME` includes the package and all its transitive internal dependencies.

This is structural dependency analysis. It does not resolve semver, inspect lockfiles, detect vulnerable packages, execute install scripts, or prove a build will succeed. External references are reported as unresolved by this input, not as missing from the machine.
