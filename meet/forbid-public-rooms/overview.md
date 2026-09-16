# An operator can forbid public rooms

## TLDR

A meeting in [meet](https://github.com/suitenumerique/meet) is open at one of
three levels, and the widest of them lets anyone holding the link walk in. Until
now the person who runs the server could pick which level new meetings start at,
and the owner of any meeting could then switch it to the widest one anyway. This
change adds one switch, `ALLOW_PUBLIC_ROOMS`, that takes the widest level away
from everybody, and moves the meetings already at it onto the next one the first
time the server starts without it. It ships on, so upgrading changes nothing.

## The three levels

| The setting says | Who gets in |
| --- | --- |
| `public` | anyone holding the link |
| `trusted` | anyone signed in |
| `restricted` | people invited to that meeting |

`trusted` and `restricted` both put a waiting room in front of the meeting.
`public` does not, which is why turning it off is the whole of this feature.

## Where a meeting's level is set

```mermaid
flowchart TD
    A["someone creates or edits a meeting"] --> B["the room API"]
    A --> C["the external room API"]
    A --> D["the Django admin,<br/>staff only"]
    B --> E["the level stored on the meeting"]
    C --> E
    D --> E
    E --> F["the waiting room"]
    E --> G["the pass the browser joins with"]
    E --> H["what the media server is told"]
```

Before this change, only the room API and the external room API had any say over
which levels were acceptable, and they disagreed: the external one had its own
pair of settings, and the room API had none at all.

## What the switch does when it is off

| | Before | After |
| --- | --- | --- |
| Setting a meeting to public | accepted | refused, on both APIs |
| The settings panel | offers three levels | offers two |
| A meeting already stored public | runs public | moved to `trusted` when the server starts, for good |
| A person whose new meetings default to public | creates public meetings | moved to `trusted` with them |
| A meeting code nobody registered | mints a public meeting | answers 404 |
| A server whose own default is public | starts, and ignores one of the two settings | refuses to start |

The third row is the one worth reading twice. The move is one way: turning the
switch back on does not reopen those meetings, so an operator cannot reopen by
accident what people have relied on being closed. The server writes one line to
its log saying how many rows it moved, and nothing else announces it.

## The one idea behind the code

The switch is enforced at the door, and the rows are made to agree with it once.

- Every way of setting a level, the two APIs and a person's default, refuses
  `public` while the switch is off.
- The server, as it starts, rewrites the rows that predate the switch. From then
  on what is stored is what every reader answers, so the waiting room, the media
  server, the API and the screens all read one column and none of them needs to
  know the switch exists.

> [!NOTE]
> This is why the change touches one frontend file for behaviour and three more
> only to share a list: a picker that drops one option, and a browser that reads
> a stale `public` out of the media server as `trusted` for a meeting live across
> the restart.

## Concepts

<details><summary>the waiting room</summary>

People who are not allowed straight in are held in a waiting room, and someone
already in the meeting admits them one at a time. A meeting open to anyone has
no waiting room at all, so the moment a server stops allowing that level, the
waiting room appears in front of meetings that never had one.
</details>

<details><summary>the external room API</summary>

A second, narrower API that lets another product create meetings on this server
without a person signing in. It has always had its own opinion about the widest
level, held in two settings of its own. The new switch overrules both, so an
operator does not have to find them.
</details>

<details><summary>a meeting code nobody registered</summary>

Typing an unused code into the address bar can create a meeting on the spot,
with no row in the database behind it. Such a meeting has nowhere to keep a
level and no waiting room in front of it, so it is a public meeting or it is
nothing.
</details>
