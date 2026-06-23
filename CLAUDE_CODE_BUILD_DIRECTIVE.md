# BUILD DIRECTIVE — Brothers Metal Roofing Lead Pipeline ("The Field")

## Purpose of this document

This is a directive for Claude Code. It describes a complete, scoped application
to be built in sequential phases. Each phase is self-contained, produces a
working increment, and should be completed and verified before moving to the
next. Do not skip ahead. Do not add scope not described here — if something
seems missing, flag it and ask rather than improvising.

---

## Project Summary

A lightweight, gamified, visual-first lead pipeline CRM for Brothers Metal
Roofing, delivered as a contracted service under StructTech LLC. This is
**not** a generic CRM — it is a single-purpose tool with a fixed five-stage
sales pipeline, built to be dead simple, fast on any device, and to make
salesmen want to use it because it feels like a personal scoreboard, not
paperwork.

**Explicitly out of scope for this build:** pipeline stage customization per
user. The five stages below are fixed for all users. Do not build a stage
editor or configuration UI for stages.

**Forward compatibility requirement:** this app will later be joined by a
sister project-management app that picks up a lead once it closes-won. The
schema and architecture must not block that — see Phase 0 schema notes.

---

## Tech Stack (fixed — do not substitute)

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend / DB:** Supabase (Postgres, Auth, Row Level Security, Realtime)
- **Hosting:** Vercel
- **Drag-and-drop:** dnd-kit
- **Deploy target:** must work cleanly on mobile browser and desktop browser
  — no native app, this is responsive web

---

## Core Concept — "The Field"

The UI metaphor is a sports field, not a dashboard. Reference the wireframe
mockup (field-wireframe.html) already approved for visual direction: turf
green pipeline area styled like yard lines, a Lead Box entry zone, a
Winner's Circle for closed-won deals, a Lost Zone for closed-lost deals
(framed as coaching data, not failure), and a Coach's Office for personal
stats. Keep that visual language. This is not a generic Kanban skin — the
field metaphor is a product requirement, not a nice-to-have.

**Gamification principle (important, do not deviate):** stats are personal,
not a public leaderboard. Every salesman is shown their own numbers against
their own past performance (this month vs last month, current cycle time
vs average, progress toward their own goal). Do not build team-vs-team
ranking displays. A manager-only team overview is fine (Phase 4) but the
salesman-facing experience is self-comparison only.

---

## Fixed Pipeline (five stages — do not make configurable)

1. **Lead Captured** — bare minimum info, often from webhook or quick manual entry
2. **Qualified** — confirmed real interest after first contact
3. **Proposal Sent** — value/estimate now exists on the lead
4. **Negotiating**
5. **Closed** — see status logic below

A lead also carries a **status** independent of stage:
- `active`
- `closed_won`
- `closed_lost`

A lead can be marked `closed_lost` from **any** stage, not just the last one.
Closed leads (won or lost) never disappear from the system — they move to
Winner's Circle or Lost Zone respectively and remain fully visible/reportable.

---

## Permissions Model (do not deviate)

- **Visibility:** every authenticated user sees every lead. Full transparency
  across the team is a deliberate design choice.
- **Editing leads (stage, status, value, contact info):** only the lead's
  `owner_id` or a user with role `manager`.
- **Notes:** any authenticated user can add a note to any lead, regardless
  of ownership. This is intentional — collaborative intel gathering.
- **Audit trail:** every stage change, status change, reassignment, and edit
  is logged with actor and timestamp in `lead_activity`. Notes are logged
  separately in `lead_notes`, also with author and timestamp. Never overwrite
  a note or activity record — always append.

---

## Database Schema

The full schema has already been designed and is provided as
`brothers_metal_roofing_schema.sql` alongside this directive. Use it
as-is for Phase 0. Do not redesign the schema — extend it only if a later
phase's requirements genuinely require a new column or table, and note the
change clearly when it happens.

Key tables: `profiles`, `leads`, `lead_notes`, `lead_activity`. Real-time
stats are computed live via RPC functions (`my_closes_this_month`,
`my_win_rate`, `my_avg_cycle_days`, `my_open_pipeline_value`,
`my_active_lead_count`) — no cached/snapshotted stats tables. Do not add
caching or scheduled stat rollups; the requirement is real-time calculation
on every load.

The `closed_won_project_created` boolean on `leads` is a hook for the future
project-management add-on. Leave it alone — don't build anything against it
yet, just don't remove it.

---

## PHASES

Each phase below should end in a working, demonstrable state. Stop and
confirm before proceeding to the next phase.

### Phase 0 — Foundation
- Initialize Next.js 14 + TypeScript + Tailwind project
- Set up Supabase project, run the provided schema SQL
- Configure Supabase Auth (email/password is sufficient for MVP)
- Set up environment variables and Vercel deployment pipeline (deploy a
  blank "hello world" page to confirm the pipeline works end to end)
- Establish the project's folder structure and base layout shell
- **Done when:** an authenticated user can log in and see an empty
  placeholder field page, deployed and reachable on Vercel, on both
  desktop and mobile browser

### Phase 1 — Lead Box + Manual Entry
- Build the Lead Box zone UI
- Build the "Add a Lead" form: name, phone, email, address, source
  (defaults to `manual`)
- Wire form submission to Supabase `leads` insert
- New leads default to stage `lead_captured`, status `active`
- **Done when:** a user can manually add a lead and see it appear

### Phase 2 — The Field (Pipeline View)
- Build the five-stage field UI per the wireframe's visual language
  (yard-line styled columns, turf background, card styling)
- Render all leads across all users (full visibility requirement)
- Visually distinguish the logged-in user's own leads (e.g. gold border)
  from teammates' leads (muted)
- Implement drag-and-drop to move a lead between stages, restricted to
  owner/manager per the permissions model — attempting to drag a lead you
  don't own and aren't a manager for should be blocked with a clear message,
  not a silent failure
- Every stage change writes a `lead_activity` row
- **Done when:** leads can be dragged across stages by authorized users,
  blocked correctly for unauthorized ones, and every move is logged

### Phase 3 — Notes & Activity Trail
- Add a note input on each lead card/detail view, open to any authenticated
  user
- Display the running note history per lead (author + timestamp, oldest or
  newest first — ask Jacob which he prefers if not already specified)
- Display the activity trail (stage changes, reassignments) per lead,
  separate from notes
- **Done when:** any user can add a note to any lead, and a full
  chronological history of notes + activity is visible per lead

### Phase 4 — Closing Logic: Winner's Circle & Lost Zone
- Implement "mark as closed-won" and "mark as closed-lost" actions,
  available from any stage, restricted to owner/manager
- Closed-lost requires a `lost_reason` (free text, required field)
- On close, set `closed_at`, set `status`, leave the lead's `stage` as
  wherever it was (do not force stage to change on loss; closing won
  leads should land stage = `closed`)
- Build Winner's Circle view (all-time closed-won, all users, visible to all)
- Build Lost Zone view (all-time closed-lost, framed visually as learning/
  coaching data, not failure — soft colors, not alarming red)
- **Done when:** leads can be closed won or lost from any stage and appear
  permanently in the correct zone, never deleted

### Phase 5 — Personal Scoreboard ("Coach's Office")
- Wire the scoreboard strip (top of app) to the real-time RPC functions:
  closes this month, win rate, avg cycle days, open pipeline value, active
  lead count
- Compare current month to prior month for the "closes this month" delta
  display (matches wireframe's "+2 vs last mo." treatment)
- Build the Coach's Office view: personal stats in more depth, plus a
  simple user-settable monthly goal (e.g. "10 closes this month") with
  progress shown as a percentage
- **No team leaderboard.** This view is single-user, self-referential only
- **Done when:** every number on the scoreboard reflects live data with no
  caching, and a user can set and track a personal monthly goal

### Phase 6 — Webhook Lead Intake
- Build a Supabase Edge Function (or Next.js API route, whichever fits the
  deploy model better — use judgment, note the choice) that accepts incoming
  lead data via POST and inserts into `leads` with `source = 'webhook'`
- Validate incoming payloads (reject malformed requests, don't silently drop)
- New webhook leads land in Lead Box / `lead_captured` exactly like manual
  entries, with `owner_id` unassigned until claimed
- Document the webhook URL and expected payload shape clearly for Jacob to
  wire up to the website's lead form
- **Done when:** a test POST request successfully creates a lead visible
  in the Lead Box

### Phase 7 — Manager View & Polish
- Build a manager-only team overview: aggregate pipeline health, total
  leads per stage across all users, who owns what — this is the one place
  team-wide numbers are visible, and only to `manager` role
- Mobile responsiveness pass across every view built so far
- Empty states, loading states, and error states across the app
- Final visual polish pass against the wireframe's design language
- **Done when:** the app is fully usable end-to-end on both mobile and
  desktop, by both salesman and manager roles, with no dead-end or broken
  states

---

## Notes for Claude Code

- Confirm completion of each phase with a brief summary before starting the
  next — don't silently chain all seven phases in one pass.
- If a requirement in a later phase reveals that an earlier phase's
  implementation needs to change, say so explicitly rather than quietly
  patching around it.
- If anything in this directive is ambiguous (e.g. note ordering in Phase 3),
  ask rather than assume.
- Keep the build lean. This is explicitly meant to be simpler than a CRM
  like HubSpot — resist the urge to add fields, views, or settings not
  called for above.
