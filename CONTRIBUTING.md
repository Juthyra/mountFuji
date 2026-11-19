# Contributing

## Branch rules
- `main` is protected. **Never commit or push to it directly** — every change lands through a pull request.
- Branch names must be one of:
  - `feature/<action_name>` — new functionality (e.g. `feature/city-view`)
  - `bug/<action_name>` — fixes (e.g. `bug/sun-ray-flicker`)
- `<action_name>` is lowercase kebab-case: letters, digits and single hyphens only.
- Branch from an up-to-date `main`; keep one concern per branch.

## Pull requests
1. Push your branch and open a PR into `main` (fill in the template).
2. The repository owner (@Juthyra) reviews and merges it — nobody else.
3. Prefer squash merge; the branch is deleted after merging.

## Progress log (required)
**Every PR must update `PROGRESS.md`** — no exceptions, including small fixes and docs-only changes:
1. Add an entry at the top of the *Changelog* (date, branch, what changed and why; mark **Fixed / Added / Changed / Removed**).
2. Update *Current status*, *Next steps* and *Known issues* if they changed.
3. If the change fixes or adds a review finding, update its row in `IMPROVEMENTS.md`.

The `pre-push` hook refuses a push when `PROGRESS.md` is unchanged compared with `origin/main`. The PR template has a matching checkbox; the reviewer rejects PRs that skip it.

## Enforcement
Configured in GitHub repository rulesets: `main` requires a PR, blocks force-push and deletion;
the branch-name ruleset rejects any branch that is not `main`, `feature/*` or `bug/*`.

## Local guard (run once after cloning)
```
git config core.hooksPath .githooks
```
The `pre-push` hook refuses pushes to `main` and from badly named branches.
