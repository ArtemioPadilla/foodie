#!/usr/bin/env bash
# create-issues.sh — bootstrap labels, milestones and the roadmap issues on GitHub.
#
# Parses the canonical migration plan
#   docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md
# (every `### Issue NNN — Title` block with its **Phase** / **Milestone** /
# **Labels** / **Branch** / **Depends on** / **Effort** lines, Description,
# Acceptance criteria and Validation sections) and emits one `gh issue create`
# per issue, plus the `gh label create` / milestone calls they need.
#
# DRY RUN BY DEFAULT: prints every issue header (`### Issue NNN — Title`) and
# the exact commands it would run, writes each issue body to a temp dir for
# inspection, and touches nothing on GitHub. `--apply` runs the commands
# (idempotent: existing labels, milestones and issues — matched by title — are
# skipped).
#
# Requirements (only for --apply): gh CLI authenticated (`gh auth login`),
# run from the repo root so `gh` resolves the repo.
#
# Usage:
#   bash scripts/create-issues.sh                    # dry run (default)
#   bash scripts/create-issues.sh --apply            # create labels, milestones, issues
#   bash scripts/create-issues.sh --apply --issues-only
#   bash scripts/create-issues.sh --spec path/to/plan.md
#   bash scripts/create-issues.sh --only 005,006     # limit to some roadmap ids
#
# Validation (roadmap Issue 007): `bash scripts/create-issues.sh | grep -c '^### Issue'` → 48

set -euo pipefail

SPEC="docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md"
APPLY=false
SKIP_META=false
ONLY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true ;;
    --issues-only) SKIP_META=true ;;
    --spec) shift; SPEC="$1" ;;
    --only) shift; ONLY="$1" ;;
    -h|--help) sed -n '2,27p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

if [[ ! -f "$SPEC" ]]; then
  echo "ERROR: spec not found: $SPEC (run from the repo root or pass --spec)" >&2
  exit 1
fi

REPO_SLUG="${PUBLIC_REPO_SLUG:-ArtemioPadilla/foodie}"
SPEC_BRANCH="${SPEC_BRANCH:-inceptor}"   # the plan lives on the integration branch until the cutover

if $APPLY; then
  command -v gh >/dev/null || { echo "ERROR: gh CLI not found. Install: https://cli.github.com" >&2; exit 1; }
  gh auth status >/dev/null 2>&1 || { echo "ERROR: gh not authenticated. Run: gh auth login" >&2; exit 1; }
  REPO_SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner)
fi

OUT=$(mktemp -d "${TMPDIR:-/tmp}/foodie-issues.XXXXXX")
echo "Spec:        $SPEC"
echo "Target repo: $REPO_SLUG"
echo "Bodies:      $OUT/"
$APPLY || echo "[DRY RUN — pass --apply to actually create things]"
echo

# ----------------------------------------------------------------------
# Parse the spec → one file set per issue in $OUT
#   NNN.title  NNN.phase  NNN.milestone  NNN.labels  NNN.branch
#   NNN.depends  NNN.effort  NNN.desc  NNN.accept  NNN.valid
# plus phases.tsv (phase number ⇥ phase title) and ids.txt (ordered ids)
# ----------------------------------------------------------------------
awk -v out="$OUT" '
  function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
  function put(name, text) { f = out "/" cur "." name; printf "%s", text > f; close(f) }
  function app(name, line) { f = out "/" cur "." name; print line >> f; close(f) }

  /^## Phase [0-9]+ — / {
    n = $0; sub(/^## Phase /, "", n); split(n, parts, " — ")
    printf "%s\t%s\n", parts[1], parts[2] >> (out "/phases.tsv"); close(out "/phases.tsv")
    cur = ""; section = ""
    next
  }
  /^### Issue [0-9]{3} — / {
    cur = substr($0, 11, 3)
    title = $0; sub(/^### Issue [0-9]{3} — /, "", title)
    put("title", trim(title))
    print cur >> (out "/ids.txt"); close(out "/ids.txt")
    section = "head"
    next
  }
  /^## / { cur = ""; section = ""; next }   # any other h2 ends the current block
  cur == "" { next }

  section == "head" && /^\*\*Phase\*\*:/ {
    line = $0
    n = split(line, cells, /\|/)
    for (i = 1; i <= n; i++) {
      c = trim(cells[i])
      if (c ~ /^\*\*Phase\*\*:/)     { sub(/^\*\*Phase\*\*:[ \t]*/, "", c);     put("phase", trim(c)) }
      if (c ~ /^\*\*Milestone\*\*:/) { sub(/^\*\*Milestone\*\*:[ \t]*/, "", c); put("milestone", trim(c)) }
      if (c ~ /^\*\*Labels\*\*:/)    { sub(/^\*\*Labels\*\*:[ \t]*/, "", c);    gsub(/[ \t]/, "", c); put("labels", c) }
    }
    next
  }
  section == "head" && /^\*\*Branch\*\*:/     { s = $0; sub(/^\*\*Branch\*\*:[ \t]*/, "", s);     put("branch", trim(s)); next }
  section == "head" && /^\*\*Depends on\*\*:/ { s = $0; sub(/^\*\*Depends on\*\*:[ \t]*/, "", s); put("depends", trim(s)); next }
  section == "head" && /^\*\*Effort\*\*:/     { s = $0; sub(/^\*\*Effort\*\*:[ \t]*/, "", s);     put("effort", trim(s)); next }

  /^\*\*Description\*\*/         { section = "desc";   next }
  /^\*\*Acceptance criteria\*\*/ { section = "accept"; next }
  /^\*\*Validation\*\*/          { section = "valid";  next }

  section == "desc"   { app("desc", $0) }
  section == "accept" { app("accept", $0) }
  section == "valid"  { app("valid", $0) }
' "$SPEC"

mapfile -t IDS < "$OUT/ids.txt"
if [[ -n "$ONLY" ]]; then
  IFS=',' read -r -a keep <<< "$ONLY"
  filtered=()
  for id in "${IDS[@]}"; do
    for k in "${keep[@]}"; do [[ "$id" == "$(printf '%03d' "$((10#$k))")" ]] && filtered+=("$id"); done
  done
  IDS=("${filtered[@]}")
fi

read_field() { local id="$1" name="$2"; [[ -f "$OUT/$id.$name" ]] && cat "$OUT/$id.$name" || true; }

# GitHub-style anchor for a heading: lowercase, drop punctuation, spaces → '-'.
slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^[:alnum:][:space:]_-]//g; s/[[:space:]]/-/g'
}

# ----------------------------------------------------------------------
# Run helper — prints the command in dry run, executes it with --apply
# ----------------------------------------------------------------------
run() {
  if $APPLY; then "$@"; else printf '  $'; printf ' %q' "$@"; printf '\n'; fi
}

# ----------------------------------------------------------------------
# Labels (phase-N from the spec, type:* and risk:high as used by it)
# ----------------------------------------------------------------------
declare -A LABEL_COLOR=(
  ["phase-0"]="6E6E6E" ["phase-1"]="0E8A16" ["phase-2"]="1D76DB" ["phase-3"]="5319E7"
  ["phase-4"]="B60205" ["phase-5"]="D93F0B" ["phase-6"]="FBCA04"
  ["type:chore"]="C5DEF5" ["type:feat"]="A2EEEF" ["type:docs"]="D4C5F9" ["type:test"]="BFD4F2"
  ["risk:high"]="E11D21"
)
declare -A LABELS_USED=()
for id in "${IDS[@]}"; do
  IFS=',' read -r -a ls <<< "$(read_field "$id" labels)"
  for l in "${ls[@]}"; do [[ -n "$l" ]] && LABELS_USED["$l"]=1; done
done

existing_labels=""
existing_milestones=""
if $APPLY; then
  existing_labels=$(gh label list --limit 200 --json name -q '.[].name')
  existing_milestones=$(gh api "repos/$REPO_SLUG/milestones?state=all&per_page=100" -q '.[].title')
fi

if ! $SKIP_META; then
  echo "==> Labels"
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    if grep -Fxq "$name" <<< "$existing_labels"; then
      echo "  · label exists: $name"
    else
      run gh label create "$name" --color "${LABEL_COLOR[$name]:-EDEDED}" --description "Foodie on Inceptor migration roadmap"
    fi
  done < <(printf '%s\n' "${!LABELS_USED[@]}" | sort)
  echo

  # --------------------------------------------------------------------
  # Milestones: one per distinct **Milestone**, described by its phase title
  # --------------------------------------------------------------------
  echo "==> Milestones"
  declare -A MS_PHASE=()
  for id in "${IDS[@]}"; do MS_PHASE["$(read_field "$id" milestone)"]="$(read_field "$id" phase)"; done
  # Milestone titles contain spaces ("v0.1 - Foundation"): iterate line by line,
  # never through word-splitting.
  while IFS= read -r ms; do
    [[ -z "$ms" ]] && continue
    phase="${MS_PHASE[$ms]}"
    phase_title=$(awk -F'\t' -v p="$phase" '$1 == p { print $2 }' "$OUT/phases.tsv" | head -1)
    if grep -Fxq "$ms" <<< "$existing_milestones"; then
      echo "  · milestone exists: $ms"
    else
      run gh api "repos/$REPO_SLUG/milestones" -f title="$ms" -f description="Phase $phase - $phase_title" -f state=open
    fi
  done < <(printf '%s\n' "${!MS_PHASE[@]}" | sort -V)
  echo
fi

# ----------------------------------------------------------------------
# Issues
# ----------------------------------------------------------------------
echo "==> Issues (${#IDS[@]})"
created=0
for id in "${IDS[@]}"; do
  title=$(read_field "$id" title)
  phase=$(read_field "$id" phase)
  milestone=$(read_field "$id" milestone)
  labels=$(read_field "$id" labels)
  branch=$(read_field "$id" branch)
  depends=$(read_field "$id" depends)
  effort=$(read_field "$id" effort)
  gh_title="$title (roadmap #$id)"
  anchor="issue-$(slugify "$id — $title")"
  # roadmap refs "#004, #011" → "roadmap #004, roadmap #011" (GitHub numbers differ)
  depends_text=$(sed -E 's/#([0-9]{3})/roadmap #\1/g' <<< "${depends:-none}")

  body="$OUT/$id.body.md"
  {
    echo "> Source of truth: [\`$(basename "$SPEC")\`](https://github.com/$REPO_SLUG/blob/$SPEC_BRANCH/$SPEC#$anchor) — roadmap **Issue $id**. The spec wins over this copy."
    echo
    echo "**Phase**: $phase · **Milestone**: $milestone · **Branch**: \`$branch\` · **Depends on**: $depends_text · **Effort**: $effort"
    echo
    echo "## Description"
    echo
    read_field "$id" desc
    echo
    echo "## Acceptance criteria"
    echo
    read_field "$id" accept
    echo
    echo "## Validation"
    echo
    read_field "$id" valid
    echo
    echo "## Workflow"
    echo
    echo "Branch \`$branch\` → PR to \`inceptor\` (to \`main\` after the cutover, roadmap #030). Dispatch: prometeo → forja → centinela (see \`CLAUDE.md\`). Commit summary suffix: \`(roadmap #$id)\`."
  } > "$body"

  echo "### Issue $id — $title"
  if $APPLY && gh issue list --state all --limit 200 --search "in:title \"roadmap #$id\"" --json title -q '.[].title' | grep -Fxq "$gh_title"; then
    echo "  · issue exists: $gh_title"
    continue
  fi
  run gh issue create --title "$gh_title" --label "$labels" --milestone "$milestone" --body-file "$body"
  created=$((created + 1))
done

echo
echo "Done: ${#IDS[@]} issues parsed, $created to create. Bodies in $OUT/"
$APPLY || echo "[That was a dry run. Re-run with --apply to actually create everything.]"
