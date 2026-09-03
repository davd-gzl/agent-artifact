# Verdict: samourai-visio [#63](https://github.com/samouraiworld/samourai-visio/pull/63), breakout rooms

Head `5ea17d60`, base `develop`, 68 files, +5898 -9. Links below pin that sha
rather than the branch, because the branch is force-pushed often and a branch
link would drift off the lines these claims are about.

## REQUEST CHANGES

No meeting renders on this head. `useLocalParticipant()` is called above the
provider it needs, so the conference component throws and the page is blank,
with or without breakout rooms. Behind that, the two supervision controls the
description leads with are the ones that break the session.

5 critical, 8 warnings, 8 nits, 2 suggestions, 5 missing tests. Each was
reproduced against the branch's own backend and a live media server.

## Critical

- [`useBreakoutRoomSwap.ts:42`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L42): `useLocalParticipant()` runs above `<LiveKitRoom>`, so every meeting page is blank. `tsc -b` is clean through it.
- [`services.py:303`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/backend/core/breakout/services.py#L303): reassigning one person replaces the whole breakout metadata object, dropping the `status` every browser reads, so that control makes the feature inert for the rest of the session and answers 200.
- [`services.py:286`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/backend/core/breakout/services.py#L286): an assignment payload naming one room id from another session wipes every assignment and answers 200.
- [`BreakoutPanel.tsx:24`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/frontend/src/features/breakout/components/BreakoutPanel.tsx#L24): session state is held in memory and nothing refetches it, so a host who reloads the tab gets the create form over a live session and the create answers 409 into an unhandled rejection.
- [`useBreakoutDataMessages.ts:27`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/frontend/src/features/breakout/hooks/useBreakoutDataMessages.ts#L27): the handler never reads the publishing participant, and every token carries data publishing, so any guest can forge the host's announcement, the help alert, and the recall.

## Warnings

- [`viewsets.py:408`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/backend/core/breakout/viewsets.py#L408): the join mints a media token without consulting the parent meeting's access level, so it answers where the meeting's own endpoint refuses.
- [`useRequestBreakoutHelp.ts:29-32`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/frontend/src/features/breakout/api/useRequestBreakoutHelp.ts#L29-L32): the body omits the field the permission check reads, so Ask for Help is 403 for every guest.
- [`livekit_events.py:306`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/backend/core/services/livekit_events.py#L306): an empty parent meeting tears down the live session under it, and the parent is empty by design once the host visits a room.
- [`useBreakoutRoomSwap.ts:152`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/frontend/src/features/breakout/hooks/useBreakoutRoomSwap.ts#L152): the return path clears session state unconditionally, so a host who visits a room loses the panel and Close All Rooms.
- [`services.py:116`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/backend/core/breakout/services.py#L116): a write transaction is held open across up to ten network calls, each capped only by the HTTP client's 300 second default, on three sync workers.
- [`serializers.py:95`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/backend/core/breakout/serializers.py#L95): no length bound on an identity that reaches a 255 character column, so an oversized value is a 500.
- [`services.py:81`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/backend/core/breakout/services.py#L81): two concurrent creates both pass the existence check and the second surfaces as a 500 where the code intends 409.
- [`BreakoutHelpAlertBanner.tsx:75`](https://github.com/samouraiworld/samourai-visio/blob/5ea17d60123be0c4106f401c0a01666393214cb7/src/frontend/src/features/breakout/components/BreakoutHelpAlertBanner.tsx#L75): the translation key is doubled by a prefix, so every host reads English whatever their language.

## What holds

The backend suite is 37 passed under the configuration CI uses. `ruff`,
`ruff format`, `pylint`, `prettier` and `eslint` are all clean on the added
code, and `tsc -b` reports nothing. The two locales carry the same 54 keys.
The database side of the N+1 claim is constant. Nine findings from an earlier
round are fixed on this head.

## The feature working

Recorded on this branch with three people, a real media server and a real
database: the host creates two rooms with a timer, assigns everyone with one
click, opens the rooms, watches the roster fill, broadcasts an announcement,
and closes everything back.

![Breakout rooms, end to end](https://raw.githubusercontent.com/davd-gzl/agent-artifact/main/samourai-visio/63/breakout-63.gif)

---

Produced by an AI agent that ran the branch and reviewed it autonomously.
