# Meeting capacity: `ROOM_MAX_PARTICIPANTS`

PR: [suitenumerique/meet#1781](https://github.com/suitenumerique/meet/pull/1781),
stacked on [#1780](https://github.com/suitenumerique/meet/pull/1780), whose
[overview](https://github.com/davd-gzl/agent-artifact/blob/main/meet/1780/overview.md)
covers the full-meeting screen. Code linked at this head, c1f0fb9f.

## TLDR

A meeting's participant limit lived only in the media server's configuration,
where nobody using meet could see it. Now an operator sets
`ROOM_MAX_PARTICIPANTS`, and meet writes it into every pass and into the phone
dispatch rule as the room's configuration, so the media server applies it to
every meeting meet opens. `/config/` carries it to the frontend, which names it
in the invite and scheduling dialogs and on #1780's full-meeting screen, and a
host gets a toast each time the meeting fills.

## What meeting capacity is

An operator caps how many people a meeting holds. A host planning a meeting
reads the cap in the dialog shown after creating it. Someone arriving once the
meeting is full is told so, with the number. The host learns the meeting is
full when it happens, and again only after it has dropped below the cap.

## How it works, in 4 steps

1. `ROOM_MAX_PARTICIPANTS=150` is set. `room_configuration()` returns
   `RoomConfiguration(max_participants=150)`.
2. `generate_token` puts that configuration into every pass, and
   `create_dispatch_rule` puts it on the rule a phone call joins through. The
   media server applies the cap to the meeting the first such pass or call
   opens: `"roomConfig": {"maxParticipants": 150}` in the pass.
3. `/config/` answers `"room_max_participants": 150`. `ParticipantLimit` reads
   it into "Up to 150 people can join this meeting.", and #1780's full-meeting
   screen into "The meeting has reached its limit of 150 participants."
4. In the meeting, `WarnHostWhenRoomFull` mounts its watcher for a host of a
   capped meeting only. The watcher counts the remote participants, agents and
   recorders left out, plus the host, and calls `notifyRoomFull(150)` when the
   count reaches 150.

## The parts, at a glance

| Part | File | Job |
| --- | --- | --- |
| `ROOM_MAX_PARTICIPANTS` | [`settings.py`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/backend/meet/settings.py#L774-L778) | the cap, unset by default |
| `room_configuration` | [`utils.py`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/backend/core/utils.py#L152-L156) | the room configuration meet gives the meetings it opens, or `None` |
| `generate_token` | [`utils.py`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/backend/core/utils.py#L145-L147) | puts it into every pass |
| `create_dispatch_rule` | [`sip_management.py`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/backend/core/services/sip_management.py#L49-L55) | puts it on the phone dispatch rule |
| `room_max_participants` | [`api/__init__.py`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/backend/core/api/__init__.py#L77) | carries it in `/config/` |
| `ParticipantLimit` | [`ParticipantLimit.tsx`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/frontend/src/features/rooms/components/ParticipantLimit.tsx#L5-L11) | the limit line in `InviteDialog` and `LaterMeetingDialog` |
| full-meeting screen | [`Conference.tsx`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/frontend/src/features/rooms/components/Conference.tsx#L214-L227) | names the limit on #1780's full-meeting screen |
| `WarnHostWhenRoomFull` | [`WarnHostWhenRoomFull.tsx`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/frontend/src/features/rooms/livekit/components/WarnHostWhenRoomFull.tsx#L15-L47) | the host's toast when the meeting fills |

## Read the code in this order

1. [`utils.py#L152-L156`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/backend/core/utils.py#L152-L156)
   is the one place the setting becomes a room configuration. A meeting opened
   by anything that skips it stays uncapped.
   ```python
   def room_configuration() -> Optional[RoomConfiguration]:
       if not settings.ROOM_MAX_PARTICIPANTS:
           return None
       return RoomConfiguration(max_participants=settings.ROOM_MAX_PARTICIPANTS)
   ```
2. [`utils.py#L145-L147`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/backend/core/utils.py#L145-L147)
   and [`sip_management.py#L49-L55`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/backend/core/services/sip_management.py#L49-L55)
   are its two callers: every pass, and the rule a phone call joins through,
   since a call can be the first to open the meeting.
3. [`WarnHostWhenRoomFull.tsx#L15-L47`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/frontend/src/features/rooms/livekit/components/WarnHostWhenRoomFull.tsx#L15-L47)
   counts from the participant list, which updates at once, rather than
   `room.numParticipants`, which trailed a join by one to three seconds in a
   measured run and fires no event. It skips every state but connected, since a
   full reconnect drops and re-adds everyone.
   ```tsx
   if (connectionState !== ConnectionState.Connected) return
   const count =
     remoteParticipants.filter(
       (p) =>
         p.kind !== ParticipantKind.AGENT && p.kind !== ParticipantKind.EGRESS
     ).length + 1
   ```
4. [`ParticipantLimit.tsx`](https://github.com/davd-gzl/meet/blob/c1f0fb9f6c9d16ae02d8f9e6b4dad848938f42ab/src/frontend/src/features/rooms/components/ParticipantLimit.tsx#L5-L11)
   renders nothing when the setting is unset, as do the full-meeting screen's limit
   text and the host's watcher.

## What a user notices

| Who | What they see | What decides it |
| --- | --- | --- |
| A host creating a meeting, now or for later | "Up to 150 people can join this meeting." | `/config/`, per deployment |
| Someone joining a full meeting | #1780's full-meeting screen, naming the limit | `/config/` for the number, #1780's capacity ask for the screen |
| A host or owner in the meeting | a toast each time the count reaches the limit | per browser, from the participant list |
| Anyone, with the setting unset | nothing new | the media server's own limit applies, as before |

## Upgrading

Unset, `ROOM_MAX_PARTICIPANTS` changes nothing. Once it is set, each meeting
takes the cap from the pass or the call that opens it. A meeting already open
when the setting changes keeps the limit it opened with until it empties, and a
phone dispatch rule created before the setting keeps opening meetings uncapped
until it is recreated. A deployment capping meetings in the media server's own
configuration moves the value to meet to get the dialogs, the number and the
toast.

## Words used here

| Name | What it is |
| --- | --- |
| `ROOM_MAX_PARTICIPANTS` | backend setting, a positive integer, unset by default, read from the environment with no prefix |
| `room_configuration()` | returns `RoomConfiguration(max_participants=…)` when the setting is set, `None` otherwise |
| `roomConfig.maxParticipants` | the pass claim setting the media server's limit for the meeting that pass opens |
| `room_max_participants` | the `/config/` key carrying the setting to the frontend, `null` when unset |
| `ParticipantLimit` | the "Up to N people" line in the dialogs shown after creating a meeting |
| `WarnHostWhenRoomFull` | mounts the host's watcher only for an owner or administrator of a capped meeting |
| `notifyRoomFull(limit)` | queues the host's toast, "The meeting is full: N participants." |
