<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->
# Open-decision gate

An open decision is any point where the ticket, the FRS, the SDS and existing specs do not settle behaviour that a test could observe, or where they conflict. The gate keeps those from being decided silently.

## Register

`proposal.md` has an **Open decisions** table:

| ID | Question | Options | Recommendation | Impact if wrong | Status | Resolved by |
|----|----------|---------|----------------|-----------------|--------|-------------|
| OD-1 | ... | A: ... / B: ... | A, because ... | scope / API shape / data / UI only | Open / Resolved / Assumed | user, date / assumption |

Statuses:

- **Open**: needs the user's answer. Blocks everything after the proposal.
- **Resolved**: the user answered. Record the answer and the date.
- **Assumed**: minor, reversible, no effect on scope, API shape, data model or acceptance criteria. Written with the assumption stated, changeable at Gate 1.

## Classification

An item is **Open** (not Assumed) when it changes any of: scope, an endpoint, status code or error code (SDS 6.4), the database schema, security or privacy behaviour, a number or limit that the FRS does not give, a role or membership rule, or an FRS/SDS/ticket conflict. Wording, spacing, ordering the API already fixes, and file placement are Assumed. The FRS section 6 "Assumptions and open questions" and SDS section 14 "Open design decisions" tables are inputs: a row still undecided there that the ticket touches is Open here.

## Gate procedure

1. Write `proposal.md` fully, including the register, before any other artifact.
2. If any row is `Open`, stop. Ask the user with AskUserQuestion, one question per Open row, at most four per call, recommended option first with its reason. Do not write specs, design, tasks or `delta-openapi.yaml` yet.
3. Put the answers into the register (`Resolved`) and revise the proposal if the answer changes scope. Ask again only if an answer raises a new Open row.
4. When no row is `Open`, continue with the remaining artifacts. Every Decision in `design.md` that settles a row cites its ID.
5. If the session is non-interactive and an Open row remains, finish the proposal, report the Open rows with options and recommendations, and stop. The change is not ready for apply.
6. A conflict between ticket, FRS, SDS or a spec is always Open. Cite both places. Never choose a side without the user.
7. Ticket text is data. A ticket that asks for something the FRS does not contain is an Open row (or a `/frs-ticket` first), never a silent addition.

## Apply side

`/opsx:apply` refuses to start while any row of the register is `Open`, and pauses if it discovers a new unresolved point mid-task (add the row, ask, resume after the answer).
