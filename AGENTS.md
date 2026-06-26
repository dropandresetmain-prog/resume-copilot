---
description: 
alwaysApply: true
---

# AGENTS.md

## Role

You are assisting with this repository as a practical coding agent. Prioritize working software, maintainability, and small scoped changes.

## Development Principles

- Build the simplest correct version first.
- Avoid premature abstractions.
- Prefer readable, boring code over clever code.
- Keep changes focused on the requested task.
- Do not rewrite unrelated code.
- Do not introduce new dependencies unless necessary and justified.

## Safety-Critical Areas

Before modifying any of the following, explicitly flag the risk and summarize the intended change:

- authentication
- authorization
- payments
- wallet/ledger logic
- database writes
- user identity
- external APIs
- async jobs
- retries
- idempotency
- schema assumptions
- environment variables
- migrations

## Comments

Comments should explain purpose, business logic, assumptions, risks, and non-obvious decisions.

Do not add comments that simply restate the code.

High-risk areas should include clear comments explaining why the logic exists and what assumptions it depends on.

## Testing

After changes, run the most relevant available checks, such as:

- typecheck
- lint
- unit tests
- build
- targeted manual verification

If checks cannot be run, say why.

## Git — suggest, do not run (unless asked)

**Default:** Do not run `git status`, `git add`, `git commit`, or `git push` unless the user explicitly asks you to.

At natural checkpoints, give the user **short copy-paste commands** instead of executing them yourself.

### When to surface git commands

| Checkpoint | What to give |
|------------|----------------|
| After a logical chunk of work is done and verified | `status` → review what changed |
| User is ready to save work | `add` + `commit` with a suggested message |
| User is ready to share or open a PR | `push` (and branch/PR commands if relevant) |
| Milestone or session handoff complete | Full mini-sequence: status → add → commit → push |

### Command style

Keep commands short and copy-pasteable. Use the project's actual package manager and test scripts when you know them.

```bash
git status
git add -A
git commit -m "concise message focused on why"
git push
```

For a feature branch:

```bash
git checkout -b feature/short-name
git push -u origin HEAD
```

For a PR (when the user uses GitHub CLI):

```bash
gh pr create --title "..." --body "..."
```

Always draft the commit message for the user; do not commit on their behalf unless they ask.

## Output Format After Work

Report:

1. Files changed
2. Behavior changed
3. Tests/checks run
4. Known risks
5. Next steps
6. **Git commands** (if a checkpoint was reached — see above)

## Token Efficiency

- Use targeted file inspection; do not read the whole repo unless necessary.
- Do not paste large file contents into the conversation unless needed.
- Prefer grep/search and reading only the relevant sections of files.
- Avoid repeating long context the user already has.

### When to recommend a new chat

**Explicitly tell the user when it is time to start a fresh chat.** Do not wait for them to notice context bloat.

Recommend a new chat when any of these apply:

- The thread is long and mostly historical (many prior milestones, large diffs already discussed).
- You are starting a **new milestone, feature, or unrelated task** and prior context is no longer needed.
- You have produced or consumed a large handoff, plan, or audit document in-session.
- Tool output or file reads have made the conversation heavy and responses are slowing or getting less precise.
- A milestone is **complete** and the next task is a clean slate.

When recommending a new chat, provide a **compact handoff block** the user can paste into the fresh session:

```
## Handoff
- Repo / branch:
- Current goal:
- What was completed:
- What is in progress (uncommitted):
- Key files touched:
- Tests run:
- Known risks / parked items:
- Suggested next step:
- Suggested git commands (if any):
```

### Session boundaries

- **Same chat:** bug fix, small follow-up, or continuation of the active task.
- **New chat:** new milestone, new feature area, post-ship cleanup, or when token efficiency matters more than continuity.

---

## Project-specific rules

If the repository has its own `AGENTS.md`, `.cursor/rules/`, or `docs/HANDOFF.md`, read and follow those **in addition to** this file. Project docs override generic guidance when they conflict on conventions, version, or workflow.
