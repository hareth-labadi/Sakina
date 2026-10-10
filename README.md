# Sakina (سكينة)

Anonymous mental-health peer support. Website only. Arabic (RTL), French, English. Light and dark.

The web front end (Next.js) is at the repo root; the API (Fastify + Postgres) is in [`backend/`](backend).

## Run it

The screens use the API for accounts, so run both. Once:

```bash
docker compose -f compose.dev.yaml up -d     # Postgres on 127.0.0.1:15432, Mailpit inbox on http://localhost:8025
cd backend
cp .env.example .env                         # then set DATA_ENCRYPTION_KEY (openssl rand -base64 32)
npm install
npm run db:migrate
npm run db:seed                              # the demo accounts below
cd ..
npm install
```

Then, in two terminals:

```bash
cd backend && npm run dev                    # API on http://localhost:4000
npm run dev                                  # site on http://localhost:3000 (redirects to /ar, /fr or /en)
```

The web dev server forwards `/api/*` to the API on port 4000 (override with `API_INTERNAL_URL` in `.env.local`). Every email the API sends lands in Mailpit (http://localhost:8025): open sign-up verification and password-reset links from there. Nothing leaves the machine.

Web scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (unit tests, vitest), `npm run check:i18n`. API scripts: `npm run lint`, `typecheck`, `test` (uses its own `sakina_test` database, created automatically), `build`, `db:generate` (new migration after a schema change), `db:migrate`, `db:seed` (resets the demo accounts, development and staging only).

Staff accounts (therapist, moderator, admin) never sign up on the site. Create them with the CLI; it prints a password and recovery code once:

```bash
npx tsx --env-file=.env src/cli/create-staff.ts <nickname> <therapist|moderator|admin>
```

### With Docker (full stack, production builds)

```bash
cp .env.compose.example .env     # then set POSTGRES_PASSWORD and DATA_ENCRYPTION_KEY
docker compose up --build        # http://localhost:3000
```

Four services: `db` (Postgres 17), `migrate` (applies migrations, then exits), `api` (starts only if migrations succeeded) and `web`. Only `web` publishes a port; it forwards `/api/*` to `api` over the internal network, so the browser sees one origin (first-party cookies, no CORS). The API and database are unreachable from outside. Both images run as a non-root user with a read-only filesystem. Staff CLI in the image: `docker compose run --rm api node dist/cli/create-staff.js <nickname> <role>`.

**Deployment requirement:** put a reverse proxy or load balancer in front of `web` that sets or appends the real client IP in `X-Forwarded-For` (Caddy, nginx, any cloud load balancer does). Rate limits use that IP; without such a proxy a client can fake it. HTTPS is required too: in production the session cookie is `__Host-` and `Secure`.

`NEXT_PUBLIC_API_URL` and `API_INTERNAL_URL` are **build** arguments of the web image (baked in by `next build`), set in `compose.yaml`. Day-to-day development stays on `npm run dev`.

Living style guide: **/ar/design**, **/fr/design**, **/en/design** (dev server only; it is not linked in the nav and returns 404 in production builds). Check every new component there in all three languages and both themes before using it in a screen.

### CI

`.github/workflows/ci.yml` runs on every pull request and every push to `dev` and `main`: lint, typecheck, unit tests, i18n check, production audit and build (Node 24, like the image), a Docker image build (not pushed), and a gitleaks scan of the full history for committed secrets. `.github/workflows/api.yml` does the same for `backend/`: lint, typecheck, audit, migrations applied to an empty Postgres, tests, build and image build. Run the same checks locally before pushing. Dependabot (`.github/dependabot.yml`) opens weekly update PRs into `dev` for npm and the Docker base images (web and API) and the Actions. Nothing deploys yet: that waits until hosting is chosen.

### Staging

`.github/workflows/staging.yml` deploys `dev` to a private staging site after every merge (password-protected, not indexed, demo accounts only, emails caught by Mailpit). It is **prepared but switched off** until a server exists: setup in [docs/staging.md](docs/staging.md). The stack it runs is `deploy/staging/` (Caddy in front, which also gives the API the real visitor IP).

## Branches and releases

| Branch | What it is | Gets changes from |
| --- | --- | --- |
| `main` | Exactly what is live in production | Release PRs from `dev`, hotfixes |
| `dev` | Integration and staging (default branch) | Feature PRs |
| `feat/…` `fix/…` `chore/…` | One topic each, short-lived | You |

- **New work:** branch from the latest `dev`, open a PR into `dev`, **squash merge** once CI passes and the other person has reviewed. Delete the branch.
- **Release:** open a PR from `dev` into `main` and merge it with a **merge commit** (never squash: it makes `dev` and `main` disagree and the next release conflicts). Tag it (`v0.2.0`).
- **Hotfix:** branch from `main`, PR into `main`, then merge `main` back into `dev`.
- Nobody pushes to `dev` or `main` directly; every change goes through a PR that passes CI (above).
- Working on two things at once? Use a separate folder per branch (`git worktree add ../sakina-<topic> -b feat/<topic> origin/dev`) instead of switching branches in one folder.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Radix primitives (`radix-ui`) · next-intl 4 · class-variance-authority.

Fonts are self-hosted (`src/lib/fonts.ts`, files from the Fontsource npm packages, OFL-1.1): Bricolage Grotesque, Instrument Sans and JetBrains Mono for Latin; Cairo, IBM Plex Sans Arabic and Reem Kufi for Arabic. Builds never download fonts and visitors' browsers never contact Google.

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
  services/          the only place the UI gets data from (api.ts: the one fetch wrapper)
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

Helpers: `lib/safety.ts` (identifying-details hints; the real safety check belongs on the server), `lib/use-countdown.ts`, `lib/password.ts`, `lib/recovery.ts` (codes, email masking), `lib/session.ts` (who is signed in, mirrored from the API), `lib/avatar.ts`, `lib/theme.tsx`.

## Account screens

`/[locale]/signup` (3 steps: communities, identity, security) · `/signin` (lockout after 5 tries, suspended accounts) · `/forgot` (recovery code or email link, then a new password) · `/verify-email`.

They run on the API (`services/auth.ts`). Demo accounts in development, created by `npm run db:seed` in `backend/` (run it again to reset them), password `calm-river-22` for all. The sign-in page lists them in development only.

| Nickname | Case |
| --- | --- |
| `amal_dawn` | regular member, recovery code `K7QM-4XPT-9HDA` |
| `leaf_demo` | recovers by email (`leaf.demo@example.com`, the link arrives in Mailpit) |
| `still_water` | suspended |

Emailed links open `/forgot?token=…` and `/verify-email?token=…`; the page checks the token once and removes it from the address bar.

## Rules of the design system

- Colours only through tokens (`bg-surface`, `text-ink`, `bg-lav-soft`, `text-warm-ink`…), never raw hex in components. Tokens switch with `html[data-theme]`.
- Crisis and errors use terracotta (`warm`), never alarm red. One primary button per view. Touch targets ≥ 44px.
- Use logical properties (`ms-`, `me-`, `ps-`, `start-`, `end-`), never `left`/`right`, so Arabic mirrors for free. Directional icons use `directional`/`flip-rtl`.
- Member-written text gets `dir="auto"`: an Arabic story stays right-to-left inside the French UI.
- Every string goes in `messages/*.json`. Keys are type-checked against `en.json`; `npm run check:i18n` keeps ar/fr in sync.
- No emoji, no invented statistics (use `000`), no emergency numbers until verified with local partners.

## Front end and API

Pages call `src/services` only, which call the API through `services/api.ts` at `/api` on the same origin. The session is an httpOnly cookie set by the API: no token is ever readable by JavaScript. `lib/session.ts` mirrors `GET /api/auth/me` for the screens and keeps only a non-secret hint (nickname, avatar) in localStorage so the header doesn't flash "Sign in" while it loads.

| Data | Where it comes from |
| --- | --- |
| Accounts, sessions, profile, memberships, stories, replies, reactions, saved, notifications, reports, blocks, live community numbers | The API |
| Community names, descriptions, tints | UI copy in `src/data/conditions.ts` (a unit test checks the ids and sensitivity match the API's) |
| `src/data/stories.ts` | Example cards for the style guide (`/design`) only |

**Rendering.** Pages with member content (home, communities, a community, a story) render on each request, as a guest, by calling the API directly (`API_INTERNAL_URL`, `http://localhost:4000` in development). Once a member is signed in, the story or feed is fetched again in the browser for what depends on them: members-only text, their reactions and saved state, their held posts. So builds never need the API, and nothing member-specific is ever cached on the server.

Types in `src/types/domain.ts` are the contract with the API.

API layout (`backend/src`): `config.ts` (environment, checked at startup), `server.ts` (app, security headers, rate limits, same-origin check, error handling), `db/` (Drizzle schema, client, migration runner), `modules/auth/` (routes, sessions, lockout, emails, cleanup), `modules/account/` (profile, memberships), `modules/content/` (communities, stories, replies, reactions, saved, notifications, reports, blocks, moderation), `lib/` (hashing, encryption, recovery codes, mailer, safety check, ids and excerpts), `cli/` (staff accounts); `db/seed.ts` (demo accounts, development and staging only). Migrations in `backend/drizzle/` (append-only: never edit a merged one). Logs never include cookies, auth headers or request bodies.

### API routes

All under `/api` in the browser. Requests that change something must come from the site's own origin (`Origin` header), or they get `403`.

| Route | Service function | Answers |
| --- | --- | --- |
| `POST /auth/signup` | `signUp` | `201 {user, emailToVerify}` (masked) + session cookie · `409 nickname_taken` · `400 invalid` / `weak_password` |
| `POST /auth/signin` `{nickname, password, remember}` | `signIn` | `200 {user}` + cookie · `401 {error:'invalid', attemptsLeft}` · `423 {error:'locked', until}` · `403 {error:'suspended', reason}` |
| `POST /auth/signout` · `GET /auth/me` | `signOut` · `me` | `204` · `200 {user}` (`{user: null}` for guests) |
| `POST /auth/recovery/code` `{nickname, code}` | `verifyRecoveryCode` | `200 {token}` · `400` · `423` |
| `POST /auth/recovery/email` `{nickname, email, locale}` | `requestEmailReset` | always `202 {}`; a matching address gets a link to `/<locale>/forgot?token=…` |
| `POST /auth/reset/check` `{token}` | `isResetTokenValid` | `{valid}` |
| `POST /auth/reset` `{token, password}` | `resetPassword` | `{newRecoveryCode}` (code accounts) or `{newRecoveryCode: null}`; signs out every device |
| `POST /auth/email/verify` `{token}` | `verifyEmail` | `204` · `400`; link goes to `/<locale>/verify-email?token=…` |
| `POST /auth/email/resend` · `POST /auth/recovery/switch-to-code` · `GET /auth/recovery` | `resendVerification` · `switchToRecoveryCode` · `getRecoveryInfo` | need a session; the email only leaves masked |
| `GET /accounts/nickname-availability?nickname=` | `checkNickname` | `{available, reason?, suggestions}` |
| `GET /me/profile` | `profile.get` | own profile, recovery email masked |
| `GET /me/communities` · `PUT`/`DELETE /me/communities/:id` | `memberships` | `{communities}` · `204` (join and leave are idempotent) |

Rules: 5 failed tries lock a nickname for 15 minutes, for unknown nicknames too, with the same answers and timing (no account enumeration). Sessions: 30 days with "remember me", otherwise a browser-session cookie limited to 12 hours on the server. Passwords and recovery codes are argon2id hashes; session and reset tokens are stored as SHA-256; the recovery email is AES-256-GCM encrypted. Expired sessions, tokens and old attempt counters are deleted hourly.

### Content API

Story shapes match `src/types/domain.ts` (`StorySummary`, `Story`, `Reply`, `AppNotification`).

| Route | Answers |
| --- | --- |
| `GET /communities` | active communities with `memberCount` and `storyCount` (names and descriptions are UI copy in `src/data/conditions.ts`) |
| `GET /stories?community=&type=&limit=&before=` | feed, newest first: `{stories, next}`; pass `next` as `before` for the following page |
| `GET /stories/:id` | the story with `body`, `reactions`, `replies` (two levels) and, when signed in, `viewer: {reactions, saved, isAuthor}`; guests get members-only stories as `locked` with no text |
| `POST /stories` `{communityId, type, title, body, visibility, veil, mood?}` | `201 {story}`; `story.status = 'held'` when held (below) |
| `DELETE /stories/:id` | the author deletes; a moderator removes |
| `PUT`/`DELETE /stories/:id/reactions/:kind` | `{reactions, mine}` |
| `POST /stories/:id/replies` `{text, parentId?}` | `201 {reply}` (one level of nesting) |
| `DELETE /replies/:id` · `PUT`/`DELETE /replies/:id/relate` | `204` · `{relateCount, related}` |
| `GET /me/saved` · `PUT`/`DELETE /me/saved/:id` | saved stories, newest first · `204` |
| `GET /me/notifications` · `POST /me/notifications/read` `{id?}` | `{notifications, unread}` · `{unread}`; `GET /auth/me` carries `unreadNotifications` |
| `POST /reports` `{storyId \| replyId, reason, note, block}` | `201 {blocked}` |
| `GET /me/blocks` · `PUT`/`DELETE /me/blocks/:nickname` | blocked authors disappear from feeds, story pages and notifications for the blocker; they aren't told |
| `GET /moderation/queue` · `POST /moderation/stories/:id` · `POST /moderation/replies/:id` `{action: 'approve' \| 'remove'}` | moderators and admins only |
| `GET /moderation/reports` · `POST /moderation/reports/:id/resolve` | open reports with their target; the reporter stays anonymous |

Rules (decided 2026-10-10):

- **Holds.** A story or reply from a member goes live at once, unless it contains identifying details (phone, email, @handle, social app, link, "my name is…", street address: `backend/src/lib/safety.ts`) or it is in a high-sensitivity community. Then it is held: only its author sees it, they get a `held` notification, and a moderator approves (`approved` notification) or removes it. Therapists, moderators and admins are never held.
- **Limits per account**, on top of per-IP limits: 5 stories a day, 30 replies an hour, 20 reports an hour (`429 {error: 'post_limit'}`).
- **Notifications** are only about the member's own content: `reply`, `therapist` (a therapist replied), `reaction` (grouped per story, the count grows until read), `held`, `approved`.
- **Sample content.** Migration `0003_sample_content` puts the six sample stories and their replies in every environment, with reaction counts at 0 (no invented numbers). Their authors are locked accounts nobody can sign in to; in development and staging `npm run db:seed` gives the demo ones the demo password, plus a therapist (`Huda`) and a moderator (`mod_noor`).

## Content to review

Arabic and French text (UI, community descriptions, sample content) was written by AI and needs native-speaker review. The conditions list in `src/data/conditions.ts` is a placeholder until the final list arrives.

## Local note (this machine)

`.env.local` points `SWC_NATIVE_BINDING_CACHE` at `./.cache/swc` because the default SWC cache folder in AppData had permissions SWC rejects. Other machines don't need it.
