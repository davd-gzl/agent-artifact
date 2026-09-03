# samouraiworld/samourai-visio [#63](https://github.com/samouraiworld/samourai-visio/pull/63): feat(breakout): Breakout Rooms Sovereign Implementation

URL: https://github.com/samouraiworld/samourai-visio/pull/63
Author: zxxma | Base: develop | Files: 68 | +5898 -9
Reviewed by: davd-gzl | Model: claude-opus-5 (high, deep) | Commit: 5ea17d60 (latest)
Verify: [5ea17d60123be0c4106f401c0a01666393214cb7](https://github.com/samouraiworld/samourai-visio/commit/5ea17d60123be0c4106f401c0a01666393214cb7)
Local checkout: `git clone https://github.com/samouraiworld/samourai-visio.git && git fetch origin pull/63/head:pr63 && git checkout pr63`
Open the code: [github.dev](https://github.dev/samouraiworld/samourai-visio/blob/feat/breakout-rooms) · [vscode.dev](https://vscode.dev/github/samouraiworld/samourai-visio/blob/feat/breakout-rooms)
Overview: [overview](overview.md)

Round 2, deep mode: red team, blue team and correctness lenses over one target, then synthesis. The head moved from 28bbd98d to 5ea17d60 by force push while the round was running, and the patch ids differ, so this is a full round rather than a re-anchoring. Nine findings from round 1 are resolved on this head and are listed under *Resolved since round 1* rather than repeated. Six survive, two are new, and one of the two was introduced by a fix. The verdict is unchanged.

## Overview

The branch splits a meeting into as many as ten smaller meetings and puts it back together. A host picks the count and a duration, assigns people by hand or at random, watches who is where, sends one announcement into every smaller meeting at once, and recalls everybody. The backend adds a `core.breakout` package whose service drives the media server directly, and creates one ephemeral media room per smaller meeting with no database row of the usual kind behind it. The browser learns where it belongs by reading a JSON blob the backend writes onto the main meeting's media-server metadata, then swaps connection by remounting one React component under a new key, so nothing navigates and the camera permission survives. Everything sits behind `MEET_BREAKOUT_ROOMS_ENABLED`, off by default outside development and tests. The full explainer is in [overview.md](overview.md).

**Verdict: REQUEST CHANGES** — no meeting renders on this head, because a hook needing the room provider is called above it, and behind that the supervision controls the description leads with are the ones that break the feature (5 critical, 8 warnings, 7 nits, 2 suggestions, 5 missing tests).

## Verify first

- [`useBreakoutRoomSwap.ts:42`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L42) — this must not run above `<LiveKitRoom>`. Join a meeting on this branch and confirm a video tile appears at all before reading anything else in this review.
- [`services.py:303`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L303): the metadata push after a reassignment must still carry `status`. Activate a session, reassign one participant, then read the main meeting's metadata back with `list_rooms` and confirm the `breakout` object still has six keys rather than one.
- [`services.py:286`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L286): assignments are deleted before the room ids are resolved. Send an assignment payload holding one room id that belongs to another session and confirm the response is not 200 with an empty table.
- [`useBreakoutDataMessages.ts:27`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutDataMessages.ts#L27): this handler now acts on `breakout:recall`. Confirm a packet published by a participant rather than by the server cannot reach it.

## Summary

The author fixed nine findings between the two shas, and the change that threaded the participant identity through reintroduced the failure the previous head opened with: `useLocalParticipant()` is called above the provider it needs, so `<Conference>` throws and the page is blank. That is one line, and it hides everything behind it. Behind it, the two controls the description sells hardest are the ones that break the session. Reassigning somebody pushes an assignments-only object into a merge that is one level deep, which replaces the whole `breakout` key and deletes the `status` every branch of the watcher gates on, so the first use of that control makes the feature inert for the rest of the session while answering 200. A well-formed room id belonging to no room of the session takes the delete-then-rebuild path with nothing to rebuild into, and every assignment is gone with a 200 and a log line. Both were found independently by all three lenses, and no job in CI reaches any of it.

Reading order: [`services.py`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py), [`viewsets.py`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/viewsets.py), then [`useBreakoutDataMessages.ts`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutDataMessages.ts) and [`useBreakoutRoomSwap.ts`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts).

## Resolved since round 1

| Round 1 finding | State on 5ea17d60 |
| --- | --- |
| `useSnapshot` used without an import, no meeting renders | Import added, `tsc -b` clean |
| `_can_manage` returns true whenever `DEBUG` | Branch deleted |
| `list` answers 200 with the roster to anyone | Gated, measured 403 |
| `request-help` needs no permission | Gated, measured 403 for an unassigned caller |
| The help cooldown keys on a caller-supplied field | Keyed on room, caller and client address, measured 200 then 429 |
| `makemigrations` wants to delete the tables | `core/models.py` imports the three models |
| The countdown is white on the white side panel | `panel` and `overlay` variants with a colour each |
| Nothing handles `breakout:recall` | Handler added, see F3 for what it now trusts |
| The help beacon posts the slug where the route wants a UUID | Sends `mainRoomId` |

## Critical (must fix)

- **[every meeting page is blank]** [`useBreakoutRoomSwap.ts:42`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L42) — `useLocalParticipant()` is called outside the room provider, so the whole conference component throws.
  <details><summary>details</summary>

  The hook is invoked at [`Conference.tsx:69`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/rooms/components/Conference.tsx#L69) and [`:172`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/rooms/components/Conference.tsx#L172), and `<LiveKitRoom>` opens at [`:292`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/rooms/components/Conference.tsx#L292), so both call sites sit above the provider `useLocalParticipant` requires. Measured with one participant joining a public meeting: `No room provided, make sure you are inside a Room context or pass the room explicitly`, the error attributed to `<Conference>` itself, and a document body of zero characters. This is the same class of failure the previously reviewed sha shipped, reintroduced by the change that threaded the identity through. A typecheck does not see it. Fix: read the identity through `useMaybeRoomContext()`, which returns null outside a provider, or move the call inside `<LiveKitRoom>`.

  **Repro:**

  ```
  PAGEERROR: No room provided, make sure you are inside a Room context or pass the room explicitly
  CONSOLE: The above error occurred in the <Conference> component
  room never rendered, document.body.innerText empty
  ```
  </details>

- **[the supervision control disables the feature]** [`services.py:303`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L303) — reassigning a participant replaces the whole `breakout` metadata object with just its assignments, deleting the `status` every browser reads.
  <details><summary>details</summary>

  `_update_assignment_metadata` pushes `metadata={"breakout": {"assignments": ...}}`, and the merge behind it is one level deep: [`room_management.py:67`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/services/room_management.py#L67) is `updated_metadata = {**existing_metadata, **(metadata or {})}`. So the six keys `activate_session` writes become one, and `session_id`, `status`, `started_at`, `duration_seconds` and `rooms` are gone. All three branches of [`useBreakoutMetadataWatcher`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutMetadataWatcher.ts#L58) gate on `breakout.status`, so after the first reassignment nobody still in the main meeting is ever moved and no recall can reach anybody. The trigger is the shipped host control at [`BreakoutActiveView.tsx:116`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutActiveView.tsx#L116), and randomising while the session runs takes the same path. Nothing surfaces it: the endpoint answers 200 and the service logs a success line. Fix: build the full block in one place and republish all of it from `_update_assignment_metadata`, the way `activate_session` does.

  **Repro:** activate then reassign, reading the metadata back between the two.

  ```
  C activate keys: ['assignments', 'duration_seconds', 'rooms', 'session_id', 'started_at', 'status']
  C reassign keys: ['assignments']
  ```
  </details>

- **[silent total data loss]** [`services.py:286`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L286) — an assignment payload naming a room id from another session empties the whole session's assignments and answers 200.
  <details><summary>details</summary>

  `assign_participants` deletes every assignment for the session first, then resolves each key; a well-formed id that belongs to no room of this session lands on `except BreakoutRoom.DoesNotExist`, logs a warning and continues to the next key. The host sees 200 and a serialised session, and everybody who was assigned a moment earlier is unassigned. The browser builds those keys from `snap.session.breakout_rooms`, which is cached client state, so a panel left open across a session the `room_finished` webhook already closed sends exactly such ids. Fix: resolve every key before the delete, and answer 400 naming the unknown id.

  **Repro:** one assignment in the session, one unknown room id in the payload.

  ```
  D unknown room key: before 1 status 200 after 0
  ```
  </details>

- **[any participant can drive the room]** [`useBreakoutDataMessages.ts:27`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutDataMessages.ts#L27) — the handler never reads the `participant` argument, so a packet published by a guest is treated as one published by the server.
  <details><summary>details</summary>

  `RoomEvent.DataReceived` supplies the publishing participant and `handleData` takes `payload` alone, so nothing distinguishes a server message from a peer's. Every participant's token carries `canPublishData: true`, measured by decoding an ordinary anonymous member token. A guest can therefore raise the host's announcement banner, raise a help alert naming any session and room id, and since this head added the `breakout:recall` branch, pull every participant out of their room. The help alert is worse than cosmetic: [`Conference.tsx:398`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/rooms/components/Conference.tsx#L398) wires its *Join room* button straight into `moveToBreakoutRoom` with the ids from the packet. The two neighbouring handlers in this tree do read the argument. Fix: ignore any packet whose `participant` argument is defined, since every genuine breakout message is server-published.

  ```
  anonymous member video grants = {"roomAdmin": false, "roomJoin": true, "canPublish": true,
    "canSubscribe": true, "canPublishData": true, "canPublishSources": [...]}
  ```
  </details>

- **[the host loses a running session on any refresh]** [`BreakoutPanel.tsx:24`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutPanel.tsx#L24) — session state lives only in memory, and nothing refetches it.
  <details><summary>details</summary>

  the panel reads session state from `breakoutStore.session` or a `useState` beside it, neither persisted among the five keys written to sessionStorage at [`stores/breakout.ts:12`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/stores/breakout.ts#L12). The one hook that could refetch it, [`useBreakoutSession.ts:13`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/api/useBreakoutSession.ts#L13), is imported nowhere: a grep of the whole frontend tree returns its own definition and nothing else. The metadata watcher does set the field, but only inside `if (myAssignment)`, and a host is never assigned because [`BreakoutSetup.tsx:78`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutSetup.tsx#L78) filters `!p.isLocal`. So a host who reloads the tab gets the create form over a live session, pressing it answers 409, and [`handleCreate`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutSetup.tsx#L82) awaits the mutation with no catch, so the rejection is unhandled and the button reads as dead. They can no longer reassign, broadcast or close, and the session outlives them. Fix: call the list endpoint on mount, which already answers with the live session.

  **Repro:**

  ```
  first create: 201
  second create: 409 {'detail': 'This room already has an active or configuring breakout session.'}
  list endpoint works: 200 1
  ```
  </details>

## Warnings (should fix)

- **[a restricted meeting has one unguarded door]** [`viewsets.py:408`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/viewsets.py#L408) — the join mints a media token without consulting the parent meeting's access level.
  <details><summary>details</summary>

  For an anonymous caller the identity is `participant_id or username or "guest"`, taken from the request body, and the only check is whether some assignment carries that string. The parent meeting's own endpoint refuses an anonymous caller a token on a `trusted` or `restricted` meeting; this one does not consult the access level at all. Measured across the three levels, unauthenticated, with `DEBUG` off. Gating `list` on this head removed the easy way to learn an identity, which is why this is a Warning rather than the Critical it was, but the missing check is the finding and the identity is guessable wherever a display name was used as one. Fix: run `_get_room` through the same access-level check the parent endpoint uses, and mint only for an identity the server issued.

  ```
  B public      anon join, identity known -> 200
  B trusted     anon join, identity known -> 200
  B restricted  anon join, identity known -> 200
  ```
  </details>

- **[a host who visits a room loses the panel]** [`useBreakoutRoomSwap.ts:152`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L152) — the return path clears session state unconditionally.
  <details><summary>details</summary>

  `returnToMainRoom` schedules `clearBreakoutState()` on every return, and that function nulls `breakoutStore.session` along with the participant's placement. A host who uses *Visit* and comes back is not leaving the session, but the panel loses the only session state it has and renders the create form over a live session, so reassignment, broadcast and *Close All Rooms* all go with it. This shares its root with the refresh Critical above: the session is held in memory and nothing refetches it. Fix: clear the placement fields and keep `session` for the managing user.
  </details>

- **[a network call inside an open transaction]** [`services.py:116`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L116) — the fix for round 1 moved up to ten media-server calls inside `transaction.atomic()`.
  <details><summary>details</summary>

  Round 1 asked for the media-server creation to stop leaving orphaned rows behind. Moving it inside the block trades that for holding a write transaction open across network calls. Measured here: `create_livekit_client` sets no timeout, so each call inherits aiohttp 3.14.3's session default of `ClientTimeout(total=300)`, and the session is opened per call. Ten rooms is therefore up to fifty minutes of open transaction against a wedged media server, on a deployment running [`workers = 3`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/docker/files/usr/local/etc/gunicorn/meet.py#L9) with no `worker_class`. Fix: keep the call outside the block and mark the session failed when it does not succeed, which releases `one_active_session_per_room` for the retry the host will make.
  </details>


- **[unvalidated input reaches the column]** [`serializers.py:95`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/serializers.py#L95) — the innermost `CharField` carries no `max_length` and the column is 255.
  <details><summary>details</summary>

  `bulk_create` raises `DataError` out of `assign_participants` with nothing catching it, so the caller gets a 500. `randomize` has no input serializer at all: `request.data.get("participants", [])` goes straight into the same path. Both are manager-gated on this head, so it is a maintainer-facing 500 rather than an anonymous one. Fix: bound `identity` and `name` at 255, and put `randomize`'s payload behind a serializer.

  ```
  E identity 300 chars -> 500
  ```
  </details>

- **[two hosts clicking at once get a 500]** [`services.py:81`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L81) — the existence check and the insert share a transaction with no row lock.
  <details><summary>details</summary>

  Under READ COMMITTED neither transaction sees the other's uncommitted row, both pass the check, and the second insert trips `one_active_session_per_room`. The view catches `SessionAlreadyActiveError` and `BreakoutServiceError`; `IntegrityError` is neither, so the 409 the code means to return is a 500. One host double-clicking is the same race. This region is byte-identical to the sha the probe ran on. Fix: catch `IntegrityError` around the insert and re-raise it as `SessionAlreadyActiveError`.

  ```
  results  = ['created', 'IntegrityError: duplicate key value violates unique constraint
             "one_active_session_per_room"']
  sessions = 1
  ```
  </details>

- **[the help beacon is a guaranteed 403 for every guest]** [`useRequestBreakoutHelp.ts:29-32`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/api/useRequestBreakoutHelp.ts#L29-L32) — the client never sends the field the new permission check reads.
  <details><summary>details</summary>

  The request body carries `breakout_room_id` and `participant_name` only. For an anonymous caller [`viewsets.py:329`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/viewsets.py#L329) derives the identity from `request.data["participant_id"]`, so it is the empty string, the assignment lookup is skipped, `_can_manage` is false, and the endpoint answers 403. Round 1 reported this beacon answering 404 because it posted the slug; the URL was fixed and a permission check added, and it is still broken end to end for the majority of participants in a public meeting. The suite stays green because [`test_api.py:336`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tests/test_api.py#L336) sends `participant_id`, which no client does. Fix: send the identity the join call already resolves, and add a test whose payload is the one the client actually sends.

  **Repro:** the exact wire payload.

  ```
  REQUEST-HELP status: 403 {'detail': 'You are not a participant in this breakout room.'}
  notify_participants called: False
  ```
  </details>

- **[an empty main meeting tears down a live session]** [`livekit_events.py:306`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/services/livekit_events.py#L306) — `room_finished` on the parent closes every breakout session under it.
  <details><summary>details</summary>

  During an active session the parent meeting is empty by design once the host uses the *Visit* button, because everybody else is in a smaller meeting. Breakout rooms are given an explicit `empty_timeout` of 300 seconds at [`services.py:508`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L508); the parent is left on the media server's own default, and `docker/livekit/config/livekit-server.yaml` carries no `room:` block and no `CreateRoomRequest` outside the breakout service touches a parent meeting. So the parent finishes, the handler closes the session, and every breakout room is deleted with everyone inside. Fix: skip the teardown while a session is active, or give the parent an `empty_timeout` that outlasts the session.

  **Repro:** driving the handler with the parent's own name.

  ```
  session status after main-room room_finished: closed
  breakout LiveKit rooms deleted: call(['breakout_838d5261-..._0', 'breakout_838d5261-..._1'])
  ```
  </details>

- **[every host on a non-English interface gets an English alert]** [`BreakoutHelpAlertBanner.tsx:75`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutHelpAlertBanner.tsx#L75) — `i18nKey` repeats a prefix the `t` already carries.
  <details><summary>details</summary>

  The component's `t` is built with `keyPrefix: 'breakout.helpAlert'` and `<Trans>` is given `i18nKey="breakout.helpAlert.body"`, so the lookup is `breakout.helpAlert.breakout.helpAlert.body`. It misses, and `<Trans>` falls back to its hardcoded English children in every language. Run against the branch's own locale files: `t("body")` returns the French string, `t("breakout.helpAlert.body")` returns the literal key. The French translation exists and is unreachable. Fix: `i18nKey="body"`.
  </details>

## Nits


- **[a fallback that can never fire]** [`BreakoutParticipantOverlay.tsx:103`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutParticipantOverlay.tsx#L103) — 19 uses of `t('key') ?? 'English literal'` across the feature.
  <details><summary>details</summary>

  i18next returns the key string when a key is missing, never null or undefined, so the right-hand side is unreachable and a missing key puts `breakout.setup.create` on screen rather than the literal beside it. Two `aria-label`s are hardcoded English as well, at [`BreakoutSetup.tsx:365`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutSetup.tsx#L365) and [`BreakoutActiveView.tsx:270`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutActiveView.tsx#L270). Fix: drop the fallbacks and translate the two labels.
  </details>

- **[a fallback the router cannot reach]** [`viewsets.py:64`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/viewsets.py#L64) — `_get_room` falls back to a slug lookup behind a route that only matches a UUID.
  <details><summary>details</summary>

  [`core/urls.py:62`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/urls.py#L62) nests everything under `rooms/<uuid:room_id>/`, so a slug never reaches the view and the `except` branch is unreachable. It reads as a fix for round 1's help-beacon 404, which was already fixed on the caller's side. Fix: delete it.
  </details>

- **[the polled endpoint is the expensive one]** [`services.py:348`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L348) — `get_live_status` awaits one media-server call per room in sequence, and the panel polls it every five seconds.
  <details><summary>details</summary>

  [`useBreakoutStatus.ts:29`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/api/useBreakoutStatus.ts#L29) sets `refetchInterval` to 5000, so a ten-room session is ten serial calls every five seconds per open panel, against three sync workers and a client that cannot be given a timeout. The database side of the description's N+1 claim does hold, measured at five queries for five rooms with four assignments each. Fix: `asyncio.gather` the per-room calls, which needs no new dependency.
  </details>

- **[an untimed session mints a six-hour pass]** [`services.py:398`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L398) — `ttl` stays null when there is no duration, so the SDK default applies.
  <details><summary>details</summary>

  Measured: a 600 second session mints a 900 second token and an untimed one mints 21600 seconds. Closing the session deletes the media rooms, which disconnects whoever is inside, but a pass already handed out stays valid. Fix: give untimed sessions an explicit ceiling.
  </details>

- **[two files the description lists and nothing imports]** [`permissions.py:20`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/permissions.py#L20) — `CanManageBreakout` and `IsAssignedToBreakoutRoom` are referenced nowhere, and [`tasks.py:10`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tasks.py#L10) carries no task decorator and is in no schedule.
  <details><summary>details</summary>

  Authorisation is inlined in `_can_manage`, so the permission classes are dead. `cleanup_stale_breakout_sessions` is a plain function nothing calls, which is what keeps the untimed-session warning above latent. Fix: wire them up or delete them, and say in the description which.
  </details>

- **[three ceilings for one duration]** [`constants.ts:17`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/utils/constants.ts#L17) — `MAX_DURATION: 7200` is referenced nowhere, the select offers 14400, the serializer allows 28800.
  <details><summary>details</summary>

  Nothing enforces the 2 hours the constant names, [`BreakoutSetup.tsx:49`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutSetup.tsx#L49) runs to 4 hours, and [`serializers.py:56`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/serializers.py#L56) caps at 8. Fix: pick one and derive the others.
  </details>

- [`docs/PR_DESCRIPTION.md`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/docs/PR_DESCRIPTION.md) is a copy of the pull request description committed to the repository, with its JSON escaping intact, and this head adds nine screenshots and grows the demo GIF to 327 KB, none of them referenced from any tracked markdown file. Review media belongs outside the repository or in a real feature doc.

## Missing Tests

- **[the case that breaks the feature]** [`tests/test_services.py`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tests/test_services.py) — no test reassigns a participant while the session is active.
  <details><summary>details</summary>

  `test_bulk_assignments`, `test_randomize_endpoint`, `test_assign_participants_idempotent` and `test_randomize_assignments` all build a session in `configuring`, which is the branch where `if session.is_active` is false and the metadata push never happens. A test asserting the pushed block still carries `status`, `session_id` and `rooms` after a reassignment fails now with `KeyError: 'status'` and passes once the push is fixed. The case is in [`tests/`](tests/).
  </details>

- **[the untimed cell of the grid]** [`tests/test_services.py`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tests/test_services.py) — `test_cleanup_stale_sessions` only builds sessions with a duration.
  <details><summary>details</summary>

  The grid is timer set or not, against expired or not, and the untimed cell is the live one. A test asserting `cleanup_stale_sessions() == 0` for a null-duration session started past the grace period fails now with `assert 1 == 0`.
  </details>

- **[the wire strings nothing pins]** [`tests/test_services.py`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tests/test_services.py) — `test_activate_session_success` and `test_close_session_success` assert only the call count of the data-message mock.
  <details><summary>details</summary>

  `breakout:activate`, `breakout:recall`, `breakout:broadcast` and `breakout:help_request` are the contract with the browser, and renaming any of them leaves all 37 tests green while every client breaks. There is no frontend typecheck job to catch it either. The two mocks already capture the payload; asserting its `type` costs one line each.
  </details>

- **[the access levels]** [`tests/test_api.py:212`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tests/test_api.py#L212) — every join test uses a default meeting.
  <details><summary>details</summary>

  Nothing exercises a `trusted` or `restricted` parent, which is where the missing access-level check shows. A parametrised test over the three levels asserting an anonymous join is refused on the latter two fails now with 200.
  </details>

- **[a test that passes on a payload no client sends]** [`tests/test_api.py:336`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tests/test_api.py#L336) — both help-beacon tests supply `participant_id`.
  <details><summary>details</summary>

  [`useRequestBreakoutHelp.ts:29-32`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/api/useRequestBreakoutHelp.ts#L29-L32) sends `breakout_room_id` and `participant_name` and nothing else, so the green test and the shipped client disagree about the request body. A test built from the client's own payload answers 403 today and 200 once the identity is threaded through. The same shape covers every endpoint whose permission check reads a body field: build the payload from the hook, not from the view.
  </details>

## Suggestions

- **[a guard that only works by accident]** [`BreakoutActiveView.tsx:77`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutActiveView.tsx#L77) — `snap.mainRoomSlug || ''` would disable the host's own *Leave* button if the slug were ever unset.
  <details><summary>details</summary>

  `''` is not nullish, so [`useBreakoutRoomSwap.ts:87`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L87) stores the empty string through `?? null`, and [`:123`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L123) then returns silently on `if (!mainSlug)`. Nothing breaks today: [`Conference.tsx:168`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/rooms/components/Conference.tsx#L168) writes the slug into the store as soon as the room query resolves, and the panel cannot render its active view before that. The defect is that the fallback exists at all, so any reordering of those effects turns *Leave* and *Close All Rooms* into silent no-ops. Fix: pass the slug the component already has rather than reading it back out of the store.
  </details>

- **[an untimed session is killed five minutes in]** [`services.py:435`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L435) — `duration = session.duration_seconds or 0` turns "no timer" into "zero-second timer".
  <details><summary>details</summary>

  The deadline for an untimed session becomes `started_at + GRACE_PERIOD_SECONDS`, so 300 seconds. No timer is a supported choice: the field is nullable, its help text calls it optional, the serializer marks it not required, and [`BreakoutSetup.tsx:37`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutSetup.tsx#L37) offers it first in the list. This is latent only because nothing calls the cleanup task yet, so wiring the task up is what arms it. Fix: skip sessions whose `duration_seconds` is null, or give them a ceiling of their own.

  ```
  F untimed reaped -> 1 close called: True
  ```
  </details>

## Verified

- Every measurement above was reproduced against this branch's own backend on its own database, with the feature flag on and `DEBUG` off, which is the deployed-like configuration. The probes ran at 5ea17d60, except the concurrent-create one, whose region is byte-identical between the two shas.
- The feature was driven end to end with three live participants against a real media server: create, randomise, open, roster, announcement, close. The clip is [breakout-63.gif](https://raw.githubusercontent.com/davd-gzl/agent-artifact/main/samourai-visio/63/breakout-63.gif) and the scripts are in [`tests/`](tests/).
- Description claims that hold on this head: `pytest core/breakout` is 37 passed under `DJANGO_CONFIGURATION=Test`; `ruff check` and `ruff format --check` are clean and `pylint core.breakout` is 10.00/10 at exit 0; `prettier` and `eslint` are clean on the added frontend; `tsc -b` is now clean; the two locales carry the same 54 `breakout.*` keys; the stepper carries `aria-pressed` and `aria-label`; the empty-state badge renders; the database side of the N+1 claim is constant at five queries.
- Claims that do not: the transaction now covers the media-server call but by holding it open rather than by excluding it; `empty_timeout` is 300 seconds and not 30 minutes; `permissions.py` and `tasks.py` are listed as components and are dead; the design-token claim is inverted, with 47 colour literals and no Panda token reference in the ten new components; refresh resilience rests on [`identity.ts:17`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/utils/identity.ts#L17), which nothing imports.

## Open questions

- The whole feature keys off media-server identity, which for an anonymous participant is minted fresh per token. A stable per-browser identity threaded through the main meeting's own token would settle the join, the refresh case and the rate limit together. Not posted: it is a direction rather than a defect the author can act on line by line.
