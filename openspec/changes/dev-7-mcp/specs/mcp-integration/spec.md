## ADDED Requirements

### Requirement: Context7 server pinned

The repository SHALL configure the Context7 MCP server in `.mcp.json` with an exact pinned version and no secret values, and `.claude/settings.json` SHALL allow only its read-only tools, and the settings check SHALL accept MCP tool names that contain hyphens as valid permission rules.

Traces: DEV-1004-AC-1, DEV-1004-AC-6

#### Scenario: Context7 server pinned with exact version [DEV-1004-AC-1]

- **WHEN** the MCP config check reads `.mcp.json`
- **THEN** a `context7` server exists whose package argument ends in `@<major>.<minor>.<patch>` and the check passes

#### Scenario: Floating Context7 version rejected [DEV-1004-AC-1]

- **WHEN** the config check reads a `context7` server whose package argument is `@upstash/context7-mcp`, `@latest` or a range
- **THEN** it reports a finding that names the unpinned version and exits 1

#### Scenario: Hyphenated MCP tool name accepted as permission rule [DEV-1004-AC-1]

- **WHEN** the settings check reads allow rules `mcp__context7__resolve-library-id` and `mcp__context7__query-docs`
- **THEN** it reports no finding for them

#### Scenario: Hyphen outside an MCP tool name rejected [DEV-1004-AC-1]

- **WHEN** the settings check reads a rule whose name is not an MCP tool name but contains a hyphen
- **THEN** it reports a malformed permission rule finding

### Requirement: Context7 lookup recorded

The repository SHALL record at least one Context7 lookup in `docs/mcp-setup.md` with library, library version, topic and date/time.

Traces: DEV-1004-AC-1, DEV-1004-AC-5

#### Scenario: Context7 lookup recorded with library, version and time [DEV-1004-AC-1]

- **WHEN** the evidence check reads the "Context7 lookups" table of `docs/mcp-setup.md`
- **THEN** it finds at least one row with library, version, topic and a `YYYY-MM-DD HH:MM` timestamp and passes

#### Scenario: Lookup row without version rejected [DEV-1004-AC-1]

- **WHEN** a lookup row has an empty version cell
- **THEN** the check reports that row and exits 1

### Requirement: Jira failure handling

Every command that reads or writes Jira SHALL state that it stops and reports on a missing ticket, a disabled or unauthenticated MCP, an unsupported operation and a malformed response, and SHALL NOT invent ticket data; the failure drills SHALL be logged in `docs/mcp-setup.md`.

Traces: DEV-1004-AC-2, DEV-1004-AC-3

#### Scenario: Jira commands state every failure case [DEV-1004-AC-3]

- **WHEN** the command check reads `/opsx:explore`, `/opsx:propose`, `/opsx:archive`, `/create-pr` and `/frs-ticket`
- **THEN** each contains the failure rule (stop, report, never invent ticket data) and the check passes

#### Scenario: Command without the failure rule rejected [DEV-1004-AC-3]

- **WHEN** a Jira-using command text lacks the phrase "never invent" ticket data
- **THEN** the check names the command and exits 1

#### Scenario: Missing ticket reported as not found [DEV-1004-AC-2]

- **WHEN** the failure log is read
- **THEN** it has a "missing ticket" row for `DEV-999` with result "not found" and "no data invented"

#### Scenario: Disabled MCP and cleared auth recorded as a stop [DEV-1004-AC-3]

- **WHEN** the failure log is read
- **THEN** it has a "MCP disabled" row and an "auth cleared" row, each with result "stopped and reported"

#### Scenario: Unsupported operation recorded [DEV-1004-AC-3]

- **WHEN** the failure log is read
- **THEN** it has an "unsupported operation" row with result "reported, not attempted by another route"

#### Scenario: Failure log missing a case rejected [DEV-1004-AC-2]

- **WHEN** the log lacks one of the four cases
- **THEN** the check names the missing case and exits 1

### Requirement: Write operations need approval

Jira write tools (create, edit, transition, comment, worklog, link) SHALL require explicit user approval: they SHALL be in the `ask` list of `.claude/settings.json` and the commands that use them SHALL ask before writing.

Traces: DEV-1004-AC-4

#### Scenario: Jira write tools require approval [DEV-1004-AC-4]

- **WHEN** the settings check reads `.claude/settings.json`
- **THEN** all six `mcp__atlassian__` write tools are in `ask` and none is in `allow`

#### Scenario: Write tool outside the ask list rejected [DEV-1004-AC-4]

- **WHEN** a Jira write tool appears in `allow`
- **THEN** the check names the tool and exits 1

#### Scenario: Commands ask before a Jira write [DEV-1004-AC-4]

- **WHEN** the command check reads the commands that transition, comment or create
- **THEN** each says the write happens only with the user's approval

### Requirement: MCP evidence and secrets

Failure-log entries SHALL carry date and time, and MCP files SHALL hold no tokens or credentials.

Traces: DEV-1004-AC-5, DEV-1004-AC-6

#### Scenario: Failure log entries carry date and time [DEV-1004-AC-5]

- **WHEN** the failure log rows are read
- **THEN** every row has a `YYYY-MM-DD HH:MM` timestamp

#### Scenario: Log entry without date rejected [DEV-1004-AC-5]

- **WHEN** a failure-log row has no timestamp
- **THEN** the check reports that row and exits 1

#### Scenario: MCP config holds no credentials [DEV-1004-AC-6]

- **WHEN** the check reads `.mcp.json`
- **THEN** it finds no environment-variable block, no `headers` or `Authorization` value and no token-shaped string and passes

#### Scenario: Credential in MCP config rejected [DEV-1004-AC-6]

- **WHEN** a server entry holds an environment-variable block, an `Authorization` header or a `ctx7sk-` style key
- **THEN** the check names the entry and exits 1
