# Sakina (سكينة) · web front end

Anonymous mental-health peer support. Website only. Arabic (RTL), French, English. Light and dark.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000 (redirects to /ar, /fr or /en)
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run check:i18n`.

### With Docker

```bash
docker compose up --build    # http://localhost:3000
```

The image is the Next.js standalone server (`output: 'standalone'`), runs as a non-root user with a read-only filesystem. `NEXT_PUBLIC_API_URL` is a **build** argument (baked into the browser bundle), set in `compose.yaml`. Day-to-day development stays on `npm run dev`; Docker is for running the production build. The backend and database get their own services in `compose.yaml` (placeholders are already there).

Living style guide: **/ar/design**, **/fr/design**, **/en/design**. Check every new component there in all three languages and both themes before using it in a screen.

## Branches and releases

| Branch | What it is | Gets changes from |
| --- | --- | --- |
| `main` | Exactly what is live in production | Release PRs from `dev`, hotfixes |
| `dev` | Integration and staging (default branch) | Feature PRs |
| `feat/…` `fix/…` `chore/…` | One topic each, short-lived | You |

- **New work:** branch from the latest `dev`, open a PR into `dev`, **squash merge** once CI passes and the other person has reviewed. Delete the branch.
- **Release:** open a PR from `dev` into `main` and merge it with a **merge commit** (never squash: it makes `dev` and `main` disagree and the next release conflicts). Tag it (`v0.2.0`).
- **Hotfix:** branch from `main`, PR into `main`, then merge `main` back into `dev`.
- Nobody pushes to `dev` or `main` directly. CI (`.github/workflows/ci.yml`: lint, translations, build, typecheck, audit, Docker image) runs on every PR into either.
- Working on two things at once? Use a separate folder per branch (`git worktree add ../sakina-<topic> -b feat/<topic> origin/dev`) instead of switching branches in one folder.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Radix primitives (`radix-ui`) · next-intl 4 · class-variance-authority.

## Structure

```
messages/            ar.json fr.json en.json  (all UI text; en is the typed reference)
src/
  app/
    globals.css      design tokens (colours, type, radii) + dark theme + Arabic type
    [locale]/        layout (lang/dir, fonts, theme, providers), pages
  components/
    ui/              generic, accessible building blocks (no product copy inside)
    sakina/          product components (header, crisis help, story card…) using ui/ + messages
  i18n/              locales, routing, request config, locale-aware Link/router
  lib/               cn(), fonts, theme store, password strength, avatars
  data/              MOCK data (conditions list, sample stories, crisis placeholders)
  services/          the only place the UI gets data from (mock today, API later)
  types/             domain types shared with the future API
  proxy.ts           locale detection and redirects (Next 16 "proxy" = old middleware)
```

## Component catalogue

All of these are live on `/[locale]/design` (sections 01 to 15).

**`components/ui`** (generic, no product text inside)
button (+ IconButton) · icons · field (Field, Input, Textarea, Select) · password-input (+ PasswordStrength) · choice (Checkbox, RadioCard, Switch) · chip · segmented · tabs · display (Badge, LiveDot, Tag, Avatar, Card, Notice, EmptyState, ErrorState, Skeleton, LoadingState) · dialog · confirm-dialog (optional required reason) · error-summary · toast (`useToast`) · menu (dropdown) · tooltip · search-input · steps · table · stat-tile · load-more · container

**`components/sakina`** (product widgets)
- shell: site-header (guest or member), site-footer, logo, crisis-help, preferences (language, theme), story-card, community-card
- `auth/`: AuthShell, SignUpForm, SignInForm, ForgotForm, VerifyEmail
- `account/`: nickname-field (live availability check), recovery-code (shown once, "I saved it"), join-gate, lockout-notice, user-widgets (NotificationBell, UserMenu)
- `story/`: content-veil, reaction-bar, story-actions (save, copy link, report), report-dialog, reply-thread (+ ReplyComposer)
- `composer/`: MoodPicker, PromptChips, VeilPicker, PiiWarning, DraftStatus, HeldForReview
- `chat/`: MessageBubble, MessageList, RoomHeader, MessageComposer, TypingIndicator, DmRequestDialog, GuidedMinute
- `panel/`: PanelLayout, RiskPill, QueueRow, AvailabilityGrid, AuditTable

Helpers: `lib/safety.ts` (identifying-details hints; the real safety check belongs on the server), `lib/use-countdown.ts`, `lib/password.ts`, `lib/recovery.ts` (codes, email masking), `lib/session.ts` (mock session), `lib/avatar.ts`, `lib/theme.tsx`.

## Account screens (mock)

`/[locale]/signup` (3 steps: communities, identity, security) · `/signin` (lockout after 5 tries, suspended accounts) · `/forgot` (recovery code or email link, then a new password) · `/verify-email`.

These run on `services/auth.ts` with a fake database in the browser's localStorage (`sakina-mock-db-v1`; clear it to reset). Test accounts, password `calm-river-22` for all:

| Nickname | Case |
| --- | --- |
| `amal_dawn` | regular member, recovery code `K7QM-4XPT-9HDA` |
| `leaf_demo` | recovers by email (`leaf.demo@example.com`) |
| `still_water` | suspended |

The mock answers the same way for unknown nicknames and wrong emails, as the real API must, so nobody can learn which accounts exist.

## Rules of the design system

- Colours only through tokens (`bg-surface`, `text-ink`, `bg-lav-soft`, `text-warm-ink`…), never raw hex in components. Tokens switch with `html[data-theme]`.
- Crisis and errors use terracotta (`warm`), never alarm red. One primary button per view. Touch targets ≥ 44px.
- Use logical properties (`ms-`, `me-`, `ps-`, `start-`, `end-`), never `left`/`right`, so Arabic mirrors for free. Directional icons use `directional`/`flip-rtl`.
- Member-written text gets `dir="auto"`: an Arabic story stays right-to-left inside the French UI.
- Every string goes in `messages/*.json`. Keys are type-checked against `en.json`; `npm run check:i18n` keeps ar/fr in sync.
- No emoji, no invented statistics (use `000`), no emergency numbers until verified with local partners.

## Connecting the backend later

Pages call `src/services` only. Set `NEXT_PUBLIC_API_URL` and replace each mock function body with `api<T>('/path')`; types in `src/types/domain.ts` become the API contract. Auth will use an httpOnly session cookie set by the API (no tokens in localStorage).

## Content to review

Arabic and French text (UI, community descriptions, sample content) was written by AI and needs native-speaker review. The conditions list in `src/data/conditions.ts` is a placeholder until the final list arrives.

## Local note (this machine)

`.env.local` points `SWC_NATIVE_BINDING_CACHE` at `./.cache/swc` because the default SWC cache folder in AppData had permissions SWC rejects. Other machines don't need it.
