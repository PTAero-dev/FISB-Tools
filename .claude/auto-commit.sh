#!/usr/bin/env bash
# Stop hook: stage, commit and push whatever changed during the turn.
# Prints a JSON systemMessage so the result shows up in the Claude Code UI.

set -uo pipefail

# Resolve the repo from the hook's working directory, falling back to the
# project dir Claude Code exports. Avoids parsing Windows-style script paths.
repo="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$repo" ] && [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  cd "$CLAUDE_PROJECT_DIR" 2>/dev/null && repo="$(git rev-parse --show-toplevel 2>/dev/null)"
fi
[ -n "$repo" ] || exit 0
cd "$repo" || exit 0

# Emit a UI message and stop. Keep text free of quotes and backslashes.
say() {
  printf '{"systemMessage": "%s", "suppressOutput": true}\n' "$1"
  exit 0
}

git_dir="$(git rev-parse --git-dir)"
if [ -e "$git_dir/MERGE_HEAD" ] || [ -d "$git_dir/rebase-merge" ] || [ -d "$git_dir/rebase-apply" ]; then
  say "auto-commit skipped: merge or rebase in progress"
fi

branch="$(git symbolic-ref --short -q HEAD)" || say "auto-commit skipped: detached HEAD"

# Nothing changed this turn.
[ -z "$(git status --porcelain)" ] && exit 0

git add -A || say "auto-commit failed: git add error"

# Build the subject line from the staged file list.
count="$(git diff --cached --name-only | wc -l | tr -d ' ')"
names="$(git diff --cached --name-only | head -3 | xargs -I{} basename "{}" | paste -sd, - | sed 's/,/, /g')"
[ "$count" -gt 3 ] && names="$names and more"
stamp="$(date '+%Y-%m-%d %H:%M')"
if [ "$count" = "1" ]; then
  subject="auto: update $names ($stamp)"
else
  subject="auto: update $count files - $names ($stamp)"
fi

git commit -q -m "$subject" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" \
  || say "auto-commit failed: nothing committed"

short="$(git rev-parse --short HEAD)"

if git push -q origin "$branch" 2>/dev/null; then
  say "Committed $short and pushed $count file(s) to origin/$branch"
else
  say "Committed $short locally - push failed, run git push manually"
fi
