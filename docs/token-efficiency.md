# Token efficiency

One row per ticket, written before CHECKPOINT B as described in `docs/token-policy.md`
("Measurement"). Tokens/cost come only from the user's `/cost` paste; "files read" is the agent's own
count (est.). DEV-18 (DEV-1015) adds the formal baseline vs graph-assisted comparison.

| Ticket | Model | Tokens / cost (`/cost`) | Files read (est.) | Fix rounds | Policy violations |
| --- | --- | --- | --- | --- | --- |
| DEV-6 (DEV-1003) | Opus 5.5 (session started before the policy) | not provided | ~45 (est.) | 1 review round; 3 lint fix loops | before the policy (16:33 IST): whole reads of the DEV-5 proposal and part of the guard; after: none noted. `/agents` menu not confirmed by the human. |
