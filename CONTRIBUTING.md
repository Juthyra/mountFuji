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

## Tests
Before opening a PR that touches `index.html`, run `npm install` (once) and `npm test`. `test:sim` must pass. `test:probe` must pass its node and animation budgets; a timing warning means "rerun, then look", not "broken". If you changed the scene on purpose, run `npm run test:probe -- --update` and commit `tests/baseline.json`. If you changed how anything looks on purpose, run `npm run test:shots -- --update`, look at the changed pictures in the diff (`git diff --stat tests/screenshots`), and commit only the ones you meant to change. See `README.md` → *Running the tests*.

## Automatic checks on GitHub
Every pull request runs `sim`, `probe` and `shots` (`.github/workflows/tests.yml`). Fix a red check before asking for a merge.
- **`shots` fails after a change you meant to make:** download the artifact `screenshot-diffs` from the failed run (Actions → the run → Artifacts). For each picture you accept, copy its `<name>.actual.png` to `tests/screenshots/linux-x64/<name>.png`, review it, and commit. Pictures that are missing entirely are in the artifact `screenshots-written-by-run`. Also run `npm run test:shots -- --update` locally for the macOS baselines.
- **Re-create every Linux baseline at once:** Actions → `tests` → Run workflow → tick *update_shots*, then download the `linux-baselines` artifact into `tests/screenshots/linux-x64/`. (Manual runs only work once the workflow is on `main`.)
- **`shots` fails with no code change:** the runner's Chrome was upgraded and anti-aliasing shifted. Re-create the Linux baselines as above.

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
