## ADDED Requirements

### Requirement: Pinned installation
Code Review Graph and Graphify SHALL be installed with `uv` at exact versions recorded in `docs/versions.md`. Graph caches and databases SHALL be git-ignored.

#### Scenario: Versions recorded and caches ignored [NFR-OPS-001]
- **WHEN** `node scripts/check-graph-docs.mjs` runs
- **THEN** it exits 0 only if both tools have an exact version in `docs/versions.md` and the cache paths are in `.gitignore`

#### Scenario: Missing version fails [NFR-OPS-001]
- **WHEN** a tool has no version, `latest` or a range in `docs/versions.md`
- **THEN** the checker exits 1 and names the tool

### Requirement: Recorded graph build and queries
WHEN the graph is built, `docs/graph-tools.md` SHALL record the stats and at least 5 targeted queries, each with its result and a confirmation against source.

#### Scenario: Stats and queries present [NFR-MNT-001]
- **WHEN** the checker reads `docs/graph-tools.md`
- **THEN** it finds build stats and at least 5 queries, each with a "Confirmed against" line

#### Scenario: Fewer than 5 queries fails [NFR-MNT-001]
- **WHEN** the document lists fewer than 5 confirmed queries
- **THEN** the checker exits 1

### Requirement: Graph-assisted review
WHEN a change is reviewed with the graph, the Code Review Graph impact radius or detect-changes output SHALL be included in the review record.

#### Scenario: Impact output included [NFR-MNT-001]
- **WHEN** the review run in `docs/token-efficiency.md` is graph-assisted
- **THEN** the impact radius or detect-changes output is recorded

### Requirement: Measured token efficiency
`docs/token-efficiency.md` SHALL hold a comparison table with real measured values for four runs (task baseline, task graph-assisted, review baseline, review graph-assisted): tokens, files examined, time, findings, plus method and limitations. A reduction SHALL NOT be claimed without measured evidence.

#### Scenario: Four measured runs [NFR-MNT-001]
- **WHEN** the checker reads the comparison table
- **THEN** it finds four runs with numeric tokens, files and time, and a method and limitations section

#### Scenario: Placeholder or unmeasured value fails [NFR-MNT-001]
- **WHEN** a run has a placeholder (`TBD`, `~`, empty) or a reduction claim without both measured runs
- **THEN** the checker exits 1
