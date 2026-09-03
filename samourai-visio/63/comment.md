# Review: [#63](https://github.com/samouraiworld/samourai-visio/pull/63)
Event: REQUEST_CHANGES
Head reviewed: `5ea17d60123be0c4106f401c0a01666393214cb7`, base `develop`, 68 files, +5898 -9.
Every line number below is that commit's. The branch is force-pushed often, so a number read against the current head will not land where the claim is.

## Body
Driven end to end with three people against a live media server: create, assign, open, supervise, announce, close.

![Breakout rooms, end to end](https://raw.githubusercontent.com/davd-gzl/agent-artifact/main/samourai-visio/63/breakout-63.gif)

## src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts:42 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L42)
Critical: `useLocalParticipant()` needs the room provider and this hook is called from [`Conference.tsx:69`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/rooms/components/Conference.tsx#L69) and [`:172`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/rooms/components/Conference.tsx#L172), both above `<LiveKitRoom>` at [`:292`](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/rooms/components/Conference.tsx#L292), so `<Conference>` throws on first render and every meeting page is blank.

<details><summary>repro</summary>

One participant joining a public meeting on this branch:

```
PAGEERROR: No room provided, make sure you are inside a Room context or pass the room explicitly
CONSOLE: The above error occurred in the <Conference> component
room never rendered, document.body.innerText empty
```

`npx tsc -b` is clean, so nothing in CI reaches it. Either read the identity through `useMaybeRoomContext()`, which returns null outside a provider, or move the call inside `<LiveKitRoom>`.
</details>

## src/backend/core/breakout/services.py:303 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L303)
Critical: this push replaces the whole `breakout` object instead of merging into it, dropping the `status` that every branch of `useBreakoutMetadataWatcher` gates on, so one reassignment leaves nobody movable and no recall deliverable for the rest of the session.

<details><summary>repro</summary>

Activate a session, reassign one participant, read the room metadata back between the two.

```
after activate: ['assignments', 'duration_seconds', 'rooms', 'session_id', 'started_at', 'status']
after reassign: ['assignments']
```

The merge is `{**existing_metadata, **(metadata or {})}` in `RoomManagement.update_metadata`. A test that pins it, into `core/breakout/tests/test_services.py`, fails now with `KeyError: 'status'`:

```python
@mock.patch.object(BreakoutService, "_send_data_to_room")
@mock.patch("core.services.room_management.RoomManagement.update_metadata")
def test_reassign_while_active_republishes_full_metadata(mock_meta, mock_send, service):
    """Reassigning during an active session must republish the whole breakout blob."""
    session = BreakoutSessionFactory(status=BreakoutSession.Status.CONFIGURING, duration_seconds=600)
    br1 = BreakoutRoomFactory(session=session, order=0)
    br2 = BreakoutRoomFactory(session=session, order=1)

    service.activate_session(session)
    service.assign_participants(session, {str(br2.id): [{"identity": "p1", "name": "Alice"}]})

    breakout = mock_meta.call_args.kwargs["metadata"]["breakout"]
    assert breakout["status"] == "active"
    assert breakout["session_id"] == str(session.id)
    assert [r["id"] for r in breakout["rooms"]] == [str(br1.id), str(br2.id)]
```

A data message into each affected breakout room, the way `breakout:recall` already goes out, reaches participants the main meeting's metadata cannot.
</details>

## src/backend/core/breakout/services.py:286 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L286)
Critical: assignments are deleted for the whole session before any room id is resolved, so a payload carrying one well-formed id from another session wipes every assignment and still answers 200.

<details><summary>repro</summary>

One assignment in the session, one unknown room id in the payload.

```
before: 1   status: 200   after: 0
```

The browser builds these keys from cached client state, so a panel left open across a session the `room_finished` webhook already closed sends exactly such ids.
</details>

## src/frontend/src/features/breakout/components/BreakoutPanel.tsx:24 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutPanel.tsx#L24)
Critical: the panel holds session state in memory only, in `breakoutStore.session` or the `useState` beside it, and `useBreakoutSession` is imported nowhere, so a host who reloads the tab gets the create form over a live session and the create answers 409 into an unhandled rejection.

<details><summary>repro</summary>

```
first create:  201
second create: 409 {'detail': 'This room already has an active or configuring breakout session.'}
list endpoint: 200, returns the live session
```

The metadata watcher sets `session` only inside `if (myAssignment)`, and `BreakoutSetup` filters `!p.isLocal`, so a host never has an assignment to match. `handleCreate` awaits with no catch, so the button reads as dead. The list endpoint already returns what the panel needs.
</details>

## src/frontend/src/features/breakout/hooks/useBreakoutDataMessages.ts:27 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutDataMessages.ts#L27)
Critical: `handleData` never reads the `participant` argument, so a packet a guest publishes is indistinguishable from one the server sent, and the `breakout:recall` branch lets any guest pull everyone back into the meeting they started in.

<details><summary>repro</summary>

Every participant's token carries data publishing:

```
anonymous member grants = {"roomJoin": true, "canPublish": true, "canPublishData": true, ...}
```

The help-request branch is worse than the banner it draws: `Conference.tsx` wires that banner's *Join room* button into `moveToBreakoutRoom` with the session and room ids taken from the packet. Ignore any packet whose `participant` argument is defined; every genuine breakout message is server-published.
</details>

## src/backend/core/breakout/viewsets.py:408 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/viewsets.py#L408)
The identity comes from the request body and nothing consults the parent meeting's access level, so this endpoint mints a media token for a `trusted` or `restricted` meeting where the meeting's own endpoint refuses one.

<details><summary>repro</summary>

Anonymous, across the three access levels, with an assigned identity supplied in the body:

```
public      anon join -> 200
trusted     anon join -> 200
restricted  anon join -> 200
```

The media server broadcasts participant identities to everyone in a meeting, so the precondition is met by anyone who was ever in the parent.
</details>

## src/frontend/src/features/breakout/api/useRequestBreakoutHelp.ts:29-32 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/api/useRequestBreakoutHelp.ts#L29-L32)
The body carries `breakout_room_id` and `participant_name` only, while the view derives an anonymous caller's identity from `participant_id`, so *Ask for Help* answers 403 for every guest and the overlay swallows it into a console line.

<details><summary>repro</summary>

The exact wire payload:

```
REQUEST-HELP status: 403 {'detail': 'You are not a participant in this breakout room.'}
notify_participants called: False
```

Both help-beacon tests send `participant_id`, which no client does, so the suite is green. Build the test payload from the hook rather than from the view, and send the identity the join call already writes to `sessionStorage['meet_lk_participant_identity']`.
</details>

## src/backend/core/services/livekit_events.py:306 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/services/livekit_events.py#L306)
`room_finished` on the parent meeting closes every breakout session under it and deletes their rooms, and during an active session the parent is empty by design once the host uses *Visit*.

<details><summary>repro</summary>

Driving the handler with the parent's own name:

```
session status after parent room_finished: closed
breakout rooms deleted: ['breakout_838d5261-..._0', 'breakout_838d5261-..._1']
```

Breakout rooms get an explicit `empty_timeout` of 300 seconds; the parent is left on the media server's default, and no `CreateRoomRequest` outside this feature touches a parent meeting.
</details>

## src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts:152 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L152)
`clearBreakoutState()` runs on every return, including the host's own return from a *Visit*, and it nulls `breakoutStore.session`, so the panel falls back to the create form and the host loses reassignment, broadcast and *Close All Rooms* on a session that is still running.

<details><summary>repro</summary>

`clearBreakoutState` sets `session` to null alongside the participant fields. A host visiting a room is not leaving the session, so the return needs to clear the participant's own placement and keep the session for whoever is managing it.
</details>

## src/backend/core/breakout/services.py:116 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L116)
This holds a write transaction open across up to ten network calls, each capped only by aiohttp's 300 second default, on a deployment running three sync workers.

<details><summary>repro</summary>

```
aiohttp 3.14.3   default session timeout: ClientTimeout(total=300, sock_connect=30)
gunicorn: workers = 3, no worker_class
```

Keeping the call outside the block and marking the session failed when it does not succeed also releases `one_active_session_per_room` for the retry the host will make.
</details>

## src/backend/core/breakout/serializers.py:95 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/serializers.py#L95)
This `CharField` carries no `max_length` and `participant_identity` is `varchar(255)`, so an oversized identity reaches `bulk_create` and raises `DataError` as a 500; `randomize` has no input serializer at all.

<details><summary>repro</summary>

```
identity of 300 characters -> 500
```
</details>

## src/backend/core/breakout/services.py:81 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L81)
The existence check and the insert share a transaction with no row lock, so two concurrent creates both pass and the second's `IntegrityError` on `one_active_session_per_room` surfaces as a 500 where the code intends 409.

<details><summary>repro</summary>

Two threads on separate connections released by a barrier:

```
results  = ['created', 'IntegrityError: duplicate key value violates unique constraint
            "one_active_session_per_room"']
sessions = 1
```
</details>

## src/frontend/src/features/breakout/components/BreakoutHelpAlertBanner.tsx:75 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutHelpAlertBanner.tsx#L75)
This `Trans` passes a `t` already prefixed with `breakout.helpAlert`, so the lookup becomes `breakout.helpAlert.breakout.helpAlert.body`, misses, and every host reads the hardcoded English children whatever their language.

<details><summary>repro</summary>

Against the branch's own locale files, French active:

```
t("body")                    -> "{{participantName}} dans {{roomName}} demande de l'aide"
t("breakout.helpAlert.body") -> "breakout.helpAlert.breakout.helpAlert.body"
```

The banner's other three strings resolve, so it is this one key.
</details>

## src/backend/core/breakout/services.py:435 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L435)
Suggestion: `duration_seconds or 0` turns the no-timer choice into a zero-second timer, so an untimed session's deadline is the grace period alone and `cleanup_stale_sessions` closes that session five minutes in.

<details><summary>test case</summary>

Nothing calls `cleanup_stale_sessions` today, so this fires the moment the task is wired. Into `core/breakout/tests/test_services.py`, failing now with `assert 1 == 0`:

```python
@mock.patch.object(BreakoutService, "close_session")
def test_cleanup_leaves_untimed_sessions_open(mock_close, service):
    """A session created without a timer is never stale."""
    BreakoutSessionFactory(
        status=BreakoutSession.Status.ACTIVE,
        started_at=timezone.now() - timedelta(seconds=GRACE_PERIOD_SECONDS + 1),
        duration_seconds=None,
    )
    assert service.cleanup_stale_sessions() == 0
    mock_close.assert_not_called()
```
</details>

## src/backend/core/breakout/tests/test_services.py:1 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tests/test_services.py#L1)
Missing test: nothing pins the four wire strings `breakout:activate`, `breakout:recall`, `breakout:broadcast` and `breakout:help_request`, so a rename leaves the suite green while every client breaks.

<details><summary>test cases</summary>

`test_activate_session_success` and `test_close_session_success` already capture the payload in a mock and assert only its call count. Asserting the `type` costs one line in each:

```python
assert mock_send_data.call_args.kwargs["data"]["type"] == "breakout:activate"
```

There is no frontend typecheck job, so nothing else catches a rename.
</details>

## src/backend/core/breakout/tests/test_api.py:212 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/tests/test_api.py#L212)
Missing test: every join test uses a default meeting, so nothing exercises the `trusted` or `restricted` parent where the missing access-level check shows.

<details><summary>test cases</summary>

```python
@pytest.mark.parametrize("access_level", [RoomAccessLevel.TRUSTED, RoomAccessLevel.RESTRICTED])
def test_anonymous_join_refused_on_gated_room(access_level):
    """A breakout token is never minted where the parent meeting refuses one."""
    room = RoomFactory(access_level=access_level)
    session = BreakoutSessionFactory(room=room, status=BreakoutSession.Status.ACTIVE)
    br = BreakoutRoomFactory(session=session)
    BreakoutAssignmentFactory(breakout_room=br, participant_identity="known-identity")

    response = APIClient().post(
        f"/api/v1.0/rooms/{room.id}/breakout-sessions/{session.id}/rooms/{br.id}/join/",
        {"participant_id": "known-identity"}, format="json")

    assert response.status_code == 403
```

Fails now with 200.
</details>

## src/backend/core/breakout/viewsets.py:64 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/viewsets.py#L64)
Nit: the route nests everything under `rooms/<uuid:room_id>/`, so a slug never reaches this view and the `except` branch is unreachable.

## src/frontend/src/features/breakout/components/BreakoutParticipantOverlay.tsx:103 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutParticipantOverlay.tsx#L103)
Nit: i18next returns the key string rather than null when a key is missing, so this `??` fallback and the eighteen others like it can never fire, and a missing key puts `breakout.participant.askForHelp` on screen instead of the literal beside it.

## src/backend/core/breakout/services.py:348 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L348)
Nit: this awaits one media-server call per room in sequence, and the supervision panel refetches it every five seconds, so a ten-room session is ten serial round trips every five seconds per open panel; `asyncio.gather` needs no new dependency.

## src/backend/core/breakout/services.py:398 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/services.py#L398)
Nit: an untimed session leaves `ttl` null and inherits the SDK default, so its breakout passes live six hours and stay valid after the session closes.

<details><summary>repro</summary>

```
timed 600s session -> token lifetime  900 s
untimed session    -> token lifetime 21600 s
```
</details>

## src/backend/core/breakout/permissions.py:20 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/backend/core/breakout/permissions.py#L20)
Nit: `CanManageBreakout` and `IsAssignedToBreakoutRoom` are referenced nowhere, authorisation being inlined in `_can_manage`, and `tasks.py` carries no task decorator and sits in no schedule; the description lists the permission classes and the task as shipped.

## src/frontend/src/features/breakout/utils/constants.ts:17 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/utils/constants.ts#L17)
Nit: `MAX_DURATION` is referenced nowhere while the selector offers four hours and the serializer accepts eight, so three numbers disagree about the ceiling.

## SKIP src/frontend/src/features/breakout/components/BreakoutActiveView.tsx:77 [gh](https://github.com/samouraiworld/samourai-visio/blob/feat/breakout-rooms/src/frontend/src/features/breakout/components/BreakoutActiveView.tsx#L77)
Not posted: the set is empty today. `Conference.tsx` writes the slug as soon as the room query resolves, and the active view cannot render before that, so `|| ''` never yields an empty string. Kept in the review file as a Suggestion.
