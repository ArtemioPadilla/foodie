# 0002 — Keep user data local-first in `localStorage`, under the user's control

## Status

`Accepted`

Date: 2026-09-27

> Second ADR of the _Foodie_ series (see the numbering note in
> [ADR 0001](./0001-foodie-inceptor-migration.md)). It is written **ahead** of
> the stores it governs so that `centinela`'s `risk:high` gate ("new
> `localStorage` writes of user data") is answered once, here, for Phases 1–4
> (Issues 012, 013, 020, 023–027, 031–034) instead of blocking each PR.

## Context

Foodie is offline-first and has no backend of its own. Every piece of user
state — the weekly meal plan, saved plans, the shopping list, the pantry, the
food diary, nutrition goals, favourites and preferences — lives in the
browser's `localStorage`. Firebase is used **only** for authentication;
Firestore and Storage were never enabled, so no user data has ever left the
device. The migration keeps this model (roadmap D5, D11, D14: cloud sync stays
deferred) and moves the writes from 11 React contexts to nanostores built on
`persistentAtom` (`src/lib/persist.ts`, Issue 012).

Inceptor's ethics rubric (`docs/ETHICS.md`, `.claude/checklists/ethics.json`)
treats _new persistent state_ as a tier-2 persuasive surface: it can nudge
behaviour (a diary that remembers what you ate, goals that colour your day
red/green) and it is a privacy surface even without a network. The roadmap
therefore requires an ADR with a stakeholder analysis before those stores are
written.

### What the legacy app stores today (12 `localStorage` keys)

Verified against `main` (`git show main:src/...`, contexts + `i18n.ts` +
`AuthContext`). Keys are kept verbatim so a user's existing data survives the
cutover (US-1.2, Issue 013).

| #   | Key                       | Written by (legacy)                                    | New owner                                                                   | Contents                                                                                                                            | Category                                      |
| --- | ------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `theme`                   | `ThemeContext`                                         | `$theme` (template)                                                         | `"light"` \| `"dark"`                                                                                                               | UI preference                                 |
| 2   | `i18nextLng`              | i18next language detector (`caches: ['localStorage']`) | read-once redirect script on `/` (Issue 004); superseded by `foodie:locale` | `"en"` \| `"es"` \| `"fr"`                                                                                                          | UI preference                                 |
| 3   | `favoriteRecipes`         | `RecipeContext`                                        | `$favorites`                                                                | `string[]` of recipe ids                                                                                                            | Behavioural (anonymous)                       |
| 4   | `currentMealPlan`         | `PlannerContext`                                       | `$planner`                                                                  | `MealPlan` — days × meal slots `{ recipeId, servings }`, servings, tags, cost estimate                                              | Behavioural (anonymous)                       |
| 5   | `savedMealPlans`          | `PlannerContext`, `PlanTemplates`                      | `$planner`                                                                  | `MealPlan[]` (user-named templates)                                                                                                 | Behavioural (anonymous)                       |
| 6   | `shoppingList`            | `ShoppingContext`                                      | `$shopping`                                                                 | `ShoppingListItem[]` `{ ingredientId, quantity, unit, checked, usedIn, notes?, category? }`                                         | Behavioural (anonymous)                       |
| 7   | `pantryItems`             | `PantryContext`                                        | `$pantry`                                                                   | `PantryItem[]` `{ ingredientId, quantity, unit, expirationDate?, location? }`                                                       | Behavioural (anonymous)                       |
| 8   | `trackingEntries`         | `TrackingContext`                                      | `$tracking`                                                                 | `TrackingEntry[]` — date, meal type, recipe/ingredient/beverage id or custom name, quantity, computed nutrition, free-text `notes?` | **Health-adjacent** (what the user ate, when) |
| 9   | `nutritionGoals`          | `TrackingContext`                                      | `$goals`                                                                    | daily targets: calories, protein, carbs, fat, fibre, sodium?, sugar?, water?                                                        | **Health-adjacent**                           |
| 10  | `user-preferences-${uid}` | `AuthContext`                                          | `$preferences` (Issue 037)                                                  | `UserPreferences`: language, theme, default servings, dietary restrictions, allergies, excluded ingredients, unit system            | **Health-adjacent** (allergies, diet)         |
| 11  | `user-favorites-${uid}`   | `AuthContext`                                          | `$favorites` (Issue 037)                                                    | `string[]` of recipe ids                                                                                                            | Behavioural (per account)                     |
| 12  | `github-access-token`     | `AuthContext` (GitHub OAuth for recipe PRs)            | **removed** (D10) — never written again; cleared on first run               | OAuth token                                                                                                                         | **Secret**                                    |

Two further identifiers appear in code but are not application keys: the
`'key'`/`'total'` strings are `useLocalStorage` examples in the legacy
`CLAUDE.md` files, and Firebase Auth keeps its own session under
`firebase:authUser:*` (IndexedDB/localStorage, managed by the SDK, not by us).

### New keys planned by the roadmap

All new keys use the `foodie:` prefix so they are distinguishable from the
inherited ones and from third-party libraries sharing the origin
(`artemiopadilla.github.io`).

| Key                       | Issue                         | Contents                                                                                                                                            | Category                              |
| ------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `foodie:locale`           | 004                           | explicit locale choice (`en`/`es`/`fr`) so the `/` redirect runs once                                                                               | UI preference                         |
| `foodie:privacy-ack`      | 007 (template `PrivacyToast`) | boolean, dismissed the privacy notice                                                                                                               | UI preference                         |
| `foodie:contribute-draft` | 038                           | in-progress recipe submission (the form's own fields; **the contributor's name is optional and never required**)                                    | Draft content                         |
| `foodie:custom-prices`    | 041                           | per-ingredient price overrides `{ [ingredientId]: number }` + currency                                                                              | Behavioural (anonymous)               |
| `foodie:preferences`      | 013                           | guest `UserPreferences` (unit system, dietary restrictions, allergies, theme choice); Issue 037 migrates it to `user-preferences-${uid}` on sign-in | **Health-adjacent** (allergies, diet) |

Template stores already present and unchanged: `theme` (shared with legacy
key 1), TanStack Query's IDB cache (`idb-keyval`, catalog JSON only — public
data, not user data), and the PWA's Workbox caches.

### Where else data can go

- **URL** — sharing a plan (D11, Issue 040) serialises the plan into the query
  string of `/plan/shared`. This is the only path by which user data leaves
  the device, and it happens **only** when the user presses "Share" and copies
  the link; the link contains recipe ids and servings, never diary entries,
  goals, allergies or identity.
- **GitHub** — recipe contribution (D10, Issue 038) produces a JSON download
  and a prefilled issue that the user reviews and submits on github.com under
  their own account. Nothing is posted on their behalf.
- **Firebase Auth** — identity only (email, display name, avatar URL, uid),
  stored by Google under the project's terms; Foodie never copies it into a
  key of its own beyond the opaque `uid` suffix in keys 10–11.

## Decision

1. **Local-first stays the default and the only tier.** User data is stored in
   the browser (`localStorage` via `persistentAtom`, IndexedDB only for the
   public catalog cache). No Foodie-owned server, no analytics on the content
   of plans, diary or pantry, no cloud sync (D14). If cloud sync is ever added
   it needs a new ADR that supersedes this one.

2. **Every key is validated on read and namespaced.** `persistentAtom` runs
   `schema.safeParse` on hydration; invalid or foreign data falls back to the
   default and is _reported_ (via `report-issue`, without the payload) rather
   than trusted. New keys are prefixed `foodie:`; the 11 legacy keys are kept
   verbatim only for data continuity and may gain a `migrate()` step
   (Issue 012) but never a rename that would strand existing users.

3. **No PII in key names, no secrets in storage.** Keys never embed an email,
   display name or free text. The only identifier ever used in a key is the
   Firebase `uid` (opaque, non-reversible, kept for compatibility with
   `user-preferences-${uid}` / `user-favorites-${uid}`). Key 12
   (`github-access-token`) is deleted, not ported; no OAuth or API token is
   ever written to web storage again (D10). Anything that would need a secret
   goes through a backend (deferred).

4. **Retention is user-controlled, not time-based.** Data persists until the
   user removes it. There is no server-side copy to expire. Concretely:
   - `Profile` (Issue 036, `/profile`, also reachable signed-out) exposes
     **"Export my data"** — a single JSON with every store's current value,
     keyed by storage key, downloadable — and **"Clear my data"** — an
     `alert-dialog` that wipes all Foodie keys (legacy and `foodie:*`) after
     explicit confirmation, with the export offered first.
   - Signing out never deletes anonymous data; signing in offers a one-time,
     reversible merge of anonymous favourites/preferences into the per-user
     keys (Issue 037, `toast` with undo).
   - Browser "clear site data" is always a complete wipe because nothing is
     mirrored elsewhere.

5. **Health-adjacent data gets the strictest handling.** Diary entries
   (`trackingEntries`), goals (`nutritionGoals`) and preferences with
   allergies/dietary restrictions (`user-preferences-*`) are: never included in
   a shared-plan URL, never sent with a bug report (`FeedbackFAB` /
   `report-issue` include no storage contents, and must stay that way), never used to gate or shame — the
   UI shows progress toward _the user's own_ goals with neutral colour
   semantics (see ethics item 6 below) and no streaks, reminders or
   notifications (D14).

6. **`risk:high` for local writes is discharged by this ADR.** A PR in Phases
   1–4 that adds or changes a `localStorage` key satisfies `centinela`'s gate
   if it (a) uses `persistentAtom` with a Zod schema in `src/schemas/`,
   (b) uses a key listed in the tables above (or adds it to this ADR in the
   same PR), and (c) keeps the export/clear coverage in `Profile` complete.
   Anything else — a new network destination, a new identifier, a new kind of
   personal data — reopens the ethics checklist at tier 2 and needs its own
   ADR (as `/auth` does with ADR 0004).

_Rejected alternatives._

- **Firestore sync now** (PR #28 direction): introduces a server copy, a
  retention policy, account-deletion flows and a real privacy policy for a
  product with no active users. Deferred (D14).
- **IndexedDB for everything**: more capacity, but the legacy data is in
  `localStorage`, the volumes are small (a year of diary entries is well under
  1 MB), and cross-tab sync is free with the `storage` event. IDB is kept for
  the catalog cache only.
- **Encrypting stored values**: without a server there is no key to keep away
  from the device; it would add complexity while protecting against nothing
  the browser's origin isolation does not already cover.

## Stakeholder analysis

| Stakeholder                                                                                                                                           | Interest                                                                                                        | How this decision serves it                                                                                                                                                                                                | Residual risk                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User (anonymous or signed in)** — including children using a family device, non-native readers, users with eating-disorder history or medical diets | Plan meals and track food without being watched, profiled or nagged; keep their data; leave with it; delete it  | Nothing leaves the device unless they act (share link, GitHub submission); export/clear in `Profile`; no reminders/streaks; goals are theirs to set, with neutral language; allergies never leave storage                  | Shared devices: another person with the same browser profile can read the diary. Mitigation: per-user keys after sign-in (Issue 037) and the clear-data action; a lock/PIN is out of scope and stated as such in the privacy copy |
| **Maintainer (Artemio, contributors, the IDD agents)**                                                                                                | Ship stores in Phases 1–4 without a compliance loop per PR; debug user issues; avoid becoming a data controller | Single ADR discharges the `risk:high` gate under explicit conditions (Decision 6); bug reports carry no storage contents so support never sees personal data; no server means no breach surface, no DPA, no retention jobs | Cannot help a user recover data lost with their browser profile — documented as a consequence of local-first; export is the mitigation                                                                                            |
| **Third parties** — Google (Firebase Auth), GitHub (issues, Pages hosting), font/asset CDNs, anyone who receives a shared-plan link                   | Receive only what their role requires                                                                           | Firebase gets identity for auth only; GitHub receives what the user pastes into an issue they submit themselves; a shared link exposes recipe ids and servings only; Pages serves static files and sees no storage         | A shared link can be forwarded beyond the intended recipient — the payload is by design harmless (public recipe ids), and the UI says what the link contains                                                                      |

## Consequences

**Positive**

- Zero server-side personal data: no breach surface, no retention schedule,
  no data-processing agreement, no account-deletion backlog.
- Existing users keep every plan, list, pantry item and diary entry through
  the cutover because the keys are unchanged.
- Users can leave with their data (JSON export) or erase it in one action.
- `centinela` has an explicit, checkable contract for Phase 1–4 store PRs
  instead of a subjective `risk:high` judgement per PR.
- Removing `github-access-token` closes the one real secret-in-storage
  finding from the legacy audit.

**Negative**

- No multi-device sync and no backup beyond the manual export; losing a
  browser profile loses the data. This is stated in the privacy copy.
- Shared devices leak the diary to whoever uses the same browser profile
  (see stakeholder table).
- `localStorage` quota (~5 MB/origin) bounds the diary; `persistentAtom`
  surfaces `QuotaExceededError` with a toast, and export/clear is the remedy.
- The per-user keys (`user-*-${uid}`) keep a Firebase identifier in the key
  for compatibility; it is opaque, but a future "no identifiers in keys" rule
  would need a migration.

**Neutral**

- Firebase Auth's own session storage is governed by Google's SDK and terms,
  not by this ADR.
- The TanStack Query IDB cache holds only the public catalog; clearing it
  costs a re-download, nothing more.
- Plan sharing by URL makes a plan public to whoever holds the link — the
  same model as pasting a recipe list into a chat.

## Ethics checklist — tier 2 (required items 1, 2, 6, 7, 8)

Completed here so the PR for Issue 009 (tier-0 by path, docs-only) carries
the tier-2 analysis the stores of Phases 1–4 will reference.

1. **Intent declared** — The persistent stores push the user toward planning
   meals ahead, keeping a pantry inventory and logging what they eat against
   goals _they_ set. The benefit is the user's (less food waste, informed
   eating); the maintainer gains nothing from the data because it never
   leaves the device.
2. **No deception, no coercion** — Copy states plainly that data stays in this
   browser and is not backed up; the clear-data dialog names exactly what is
   deleted and offers export first; there is no default that opts the user
   into sharing, sync or telemetry; the share link tells the user what it
   contains before it is copied.
3. **Asymmetric persistence justified** — N/A: no nagging, retries,
   reminders or auto-reopening dialogs exist (D14 defers notifications).
4. **Borrowed credibility honest** — N/A for storage; nutrition figures are
   labelled as estimates from the catalog, not medical advice (owned by the
   tracking issues, 031–034).
5. **Emotional cues reciprocal or disclosed** — N/A: progress rings use
   neutral "under / at / over goal" semantics, no praise/shame language.
6. **Surveillance overt and supportive** — There is no telemetry on plans,
   diary or pantry at all. Everything the app "remembers" is visible in the UI
   that wrote it and in the JSON export; it is used only to render the user's
   own views, never to score, rank or report them.
7. **Vulnerable-group impact considered** — Children/family devices: no
   account required, no social features, clear-data is one action. Users with
   disordered-eating history: goals are optional, no streaks, no red/green
   moralising, calories can be hidden (tracking issues must honour this).
   Non-native readers: all copy is in EN/ES/FR with the same meaning.
   Low-vision / motor-impaired: export/clear are keyboard-reachable Base UI
   dialogs with visible focus.
8. **Unintended-but-predictable outcomes** — (a) A shared computer exposes a
   diary → mitigated by per-user keys and clear-data, disclosed in copy.
   (b) A forwarded share link exposes a plan → payload limited to public
   recipe ids. (c) A malformed or hostile value in storage → Zod validation
   falls back safely and reports without the payload. (d) Someone uses the
   diary to police another person's eating → no multi-user views, no export
   of anything but the current browser's own data.

## Supersedes

None. Must be superseded by a new ADR before any user data is stored outside
the device (cloud sync, server-side sharing, analytics on content).

## References

- [ADR 0001 — Rebuild Foodie template-first on Inceptor](./0001-foodie-inceptor-migration.md)
  (D5 stores, D10 no client secrets, D11 share by URL, D14 deferred sync)
- Roadmap §2 "Contextos → stores" (key map) and Issues 004 (`foodie:locale`),
  012 (`persistentAtom`), 013 (domain stores), 020 (favourites), 036
  (`Profile` export/clear), 037 (per-user keys), 038
  (`foodie:contribute-draft`), 040 (shared plan URL), 041
  (`foodie:custom-prices`); §"Riesgos" row "`centinela` bloquea por
  `risk:high` en cada store"
- `docs/ETHICS.md` (tier rubric, §risk-high-triggers) and
  `.claude/checklists/ethics.json` (canonical 8-item checklist)
- Legacy sources on `main`: `src/contexts/{Theme,Auth,Recipe,Planner,Shopping,Pantry,Tracking}Context.tsx`,
  `src/i18n.ts`, `src/types/index.ts`
- Future: ADR 0004 — `/auth` and Firebase Auth stakeholders (Issue 035)
