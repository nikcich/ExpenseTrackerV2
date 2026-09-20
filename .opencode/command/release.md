---
description: Bump the app version and trigger a release build. Optional argument: major, minor, or fix (default fix).
---

Release the Expense Tracker app. The bump type comes from $ARGUMENTS: `major`, `minor`, or `fix`/`patch`. If blank, use `fix` (plain +1 to the patch version, e.g. 1.1.0 → 1.1.1).

1. Read the current version from the `version` field in `package.json`. Also read `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`; if the three differ, use `package.json` and flag the mismatch.

2. Compute the next version:
   - `major`: bump the first number, zero the rest (1.2.3 → 2.0.0)
   - `minor`: bump the second number, zero the patch (1.2.3 → 1.3.0)
   - `fix`/`patch`: bump the third number (1.2.3 → 1.2.4)

3. Update the version in all three files, preserving each file's formatting (JSON stays 2-space indented in `package.json`/`tauri.conf.json`).

4. Run `npm run build` to verify TypeScript and the bundle still pass.

5. If a `rel-<next>` branch already exists or a `v<next>` tag exists on origin (check with `git ls-remote --heads origin rel-<next>` / `git ls-remote --tags origin v<next>`), stop and tell the user it's already released.

6. Commit on the current branch with message `Release v<next>`, then ask the user to confirm before pushing.

7. Once confirmed, create the branch and push it: `git checkout -b rel-<next> && git push -u origin rel-<next> && git checkout -`.

8. Do NOT create or push a tag. CI derives the version from the `rel-*` branch name, overwrites the Tauri/Cargo versions in the build, builds all platform installers, and creates the `v<next>` tag + GitHub release itself. Tell the user a release is running on the `rel-<next>` branch so they can watch the Actions run.