# Khaiju Studio Ledger — implementation status

## Already working
The existing application has shared browser-local project, client, payment, expense and activity state, local project editing/deletion, calculated local financial summaries, a profile menu, a browser-record export, and persistent light/dark preference. These are not database-backed business workflows.

## Confirmed problems
The active application had no database client or configured connection. New sessions generated sample business records; invalid local records were silently ignored and could be overwritten. Invoices point to an unfinished placeholder, Team management is absent, and profile details are fixed rather than authenticated. Database-related code in an artifact copy is not used by the active application and does not establish live schema availability.

## Implemented now
- Removed automatic sample-record generation and the unused sample reset path.
- Preserved valid existing browser records and unknown fields for a future explicit import.
- Validated local copies before use; unreadable originals remain untouched and editing pauses with a visible error, original-copy download, and retry.
- Made browser save failures visible while retaining unsaved in-memory records.
- Added an application-wide notice that records remain browser-local and labeled export accordingly.
- Added useful empty dashboard states, removed the empty payment chart, and fixed confirmed mobile dashboard overflow.
- Made dashboard display dates use an explicit studio time zone rather than differing server/browser time zones.

## Database, storage and migrations
No tables, relationships, buckets, authentication settings, grants or RLS policies were created or changed. No migration requires manual execution. No new database was created. Schema-dependent implementation is deliberately blocked until the existing external project is connected and inspected.

## Verification actually performed
All 11 tests passed across routing, theme preference, local-copy validation, preservation, blocked malformed-copy edits, and save errors. Preview build logs report build OK. Browser checks passed for a fresh empty workspace without automatic sample writes, theme persistence after refresh, export of exact current browser records, malformed-copy protection and retry, preservation of existing test records across refresh, and mobile navigation without horizontal page overflow. No runtime errors were observed in that check. Browser test records were isolated to the test browser, not inserted into a real workspace.

## Unfinished and exact blocker
Database CRUD, financial source-of-truth replacement, invoice/items persistence, Team availability and assignments, authenticated profiles/private avatars, database backup/validated restoration, and real database/RLS end-to-end tests require the existing external connection, schema, authentication and storage inspection. The requested comprehensive visual redesign remains deferred until real workflows and data integrity are implemented, as requested. Theme preference works, but eliminating the initial theme flash has not been implemented or verified. Security policies and hosted authentication settings remain unverified.

## Required next action
Connect the existing project in Lovable project Settings → General → External Supabase. Do not paste secret credentials into chat. Once the connection is available, inspect existing tables and access controls before implementing non-destructive changes or explicitly importing browser records.