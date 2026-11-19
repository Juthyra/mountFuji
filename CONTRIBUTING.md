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

## Enforcement
Configured in GitHub repository rulesets: `main` requires a PR, blocks force-push and deletion;
the branch-name ruleset rejects any branch that is not `main`, `feature/*` or `bug/*`.
