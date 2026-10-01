# A guest keeps one identity in each meeting

## TLDR

Someone who joins a [meet](https://github.com/suitenumerique/meet) meeting
without signing in had no name the server could recognise twice: opening a
public meeting gave them a new one every time. This change gives each browser
one secret, kept in a signed cookie, and works out the guest's name in each
meeting from that secret and the meeting. The same browser then has the same
name every time it comes back to a meeting, and a different one in every other
meeting. Splitting a meeting into smaller groups needs exactly that, to know
which group a guest belongs in.

## What it is for

The media server, the part that carries sound and video, knows every person in
a meeting by an identity: a name the screen never shows, one per connection. A
signed-in person's identity is their account, so it is the same every time. A
guest had nothing that stayed the same, so any feature that has to find the same
guest again, such as sending them to their breakout room, had nothing to look
them up by.

## How it works today

Before this change:

| Where the guest is | Their identity | Kept in the browser |
| --- | --- | --- |
| A meeting open to anyone | a new random one every time the page asks for the meeting | nothing |
| A meeting with a waiting room | the value of a cookie the server sets and never checks | that cookie, until the browser closes |
| A meeting code nobody registered | a new random one every time | nothing |

## What the change does

After this change:

| Where the guest is | Their identity | Kept in the browser |
| --- | --- | --- |
| A meeting open to anyone | worked out from the browser's secret and the meeting | one signed cookie, until the browser closes |
| A meeting with a waiting room | the same, and the waiting room knows them by it too | the same cookie |
| A meeting code nobody registered | a new random one every time, unchanged | nothing |

How the identity is worked out, after the change:

```mermaid
flowchart LR
    A["the browser's cookie"] -->|"signature checks out"| B["the browser's secret"]
    A -->|"missing, or signed by nobody"| C["a new secret"]
    C --> B
    B --> D["mixed with the meeting<br/>into a one-way hash"]
    D --> E["guest_ and 40 characters"]
    E --> F["the waiting room"]
    E --> G["the media server"]
```

The hash only goes one way, so seeing someone's identity tells nobody their
secret. It takes no server key, so changing that key while keeping the old one
as a fallback leaves every identity as it was.

The cookie behaves as the old one did in one respect: it ends when the browser
closes. Every visit signs it again, and a cookie nobody has used for
`SESSION_COOKIE_AGE`, 12 hours by default, stops being accepted.

| What happens | Before | After |
| --- | --- | --- |
| The same guest opens a public meeting twice | two identities | one |
| One browser opens forty meetings | forty identities, no cookie | forty identities, one cookie |
| A guest opens the same meeting in a second tab | two people in the meeting | one, and the older tab is dropped, as for a signed-in person |
| A host admits someone from the waiting room | the request names a UUID | the request names a `guest_` identity |

> [!NOTE]
> The cookie's name changes from `lobbyParticipantId` to `lobbyGuest`, so a
> server still on the previous version never reads the new value. A deployment
> that set its own name in `LOBBY_COOKIE_NAME` has to pick a new one for this
> release, which `UPGRADE.md` says. Guests waiting during the upgrade wait
> again, under their new identity.

## The code, by temperature

Every part of the change, ranked by what a mistake there would cost. Hot decides
who a guest is or who gets in, warm wires that into the rest of the server or
the rollout, cold is tests and documentation. All code below is after the
change, at 6bc6ccbc.

| Temperature | Where | What it decides |
| --- | --- | --- |
| hot | [`get_or_create_participant_id`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/services/lobby.py#L165-L183) | a guest's identity in one meeting |
| hot | [`read_guest_capability`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/services/lobby.py#L146-L162) | which cookies the server believes |
| hot | [`ParticipantEntrySerializer`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/api/serializers.py#L307-L309) | what a host's admit request may name |
| hot | [`prepare_response`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/services/lobby.py#L185-L198) | how the cookie is stored in the browser |
| warm | [`RoomSerializer`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/api/serializers.py#L201-L205) | a guest opening a public meeting gets the identity |
| warm | [`request_entry`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/services/lobby.py#L246) | the waiting room uses the same identity |
| warm | [`RequestEntryAnonRateThrottle`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/api/throttling.py#L88-L95) | the waiting room's rate limit counts per browser secret |
| warm | [`retrieve`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/api/viewsets.py#L230) and [`request_entry`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/core/api/viewsets.py#L445) views | both responses carry the cookie |
| warm | [`LOBBY_COOKIE_NAME`](https://github.com/davd-gzl/meet/blob/6bc6ccbc06d4a4bc9ce34320333e90b1aadc52fc/src/backend/meet/settings.py#L915) | the new cookie name, which keeps old and new servers apart |
| cold | four test files, 452 lines changed | the behaviour above, pinned |
| cold | `UPGRADE.md`, `CHANGELOG.md`, the Kubernetes settings table | what an operator reads |

### Hot: the identity

The secret comes from the request if this request already worked it out, then
from the cookie, then is made new. The identity mixes a fixed salt, the meeting
and the secret, so the same browser gets a different identity in every meeting.

```python
capability = getattr(request, cls._REQUEST_CAPABILITY_ATTRIBUTE, None)
if capability is None:
    capability = cls.read_guest_capability(request)
    if capability is None:
        capability = secrets.token_urlsafe(32)
    setattr(request, cls._REQUEST_CAPABILITY_ATTRIBUTE, capability)
digest = hashlib.sha256(
    f"{cls.GUEST_IDENTITY_SALT}:{room_id}:{capability}".encode()
).hexdigest()
return f"guest_{digest[:40]}"
```

### Hot: which cookies the server believes

A cookie counts only when its signature checks out and it is younger than
`SESSION_COOKIE_AGE`. Anything else, an old unsigned value included, reads as no
cookie, and the guest gets a new secret.

```python
try:
    return signing.loads(
        cookie_value,
        salt=cls.GUEST_COOKIE_SALT,
        max_age=settings.SESSION_COOKIE_AGE,
    )
except signing.BadSignature:
    return None
```

### Hot: what a host's admit request may name

Only `guest_` and 40 lowercase hex characters, with nothing around them.

```python
participant_id = serializers.RegexField(
    r"^guest_[0-9a-f]{40}\Z", required=True, trim_whitespace=False
)
```

### Hot: how the cookie is stored

Hidden from the page's scripts, sent only over HTTPS, and with no lifetime of
its own, so it ends when the browser closes. The response is never cached,
since it carries both the cookie and a pass to join.

```python
response["Cache-Control"] = "no-store"
response.set_cookie(
    key=settings.LOBBY_COOKIE_NAME,
    value=cls.sign_guest_capability(capability),
    httponly=True,
    secure=True,
    samesite="Lax",
)
```

## Concepts

<details><summary>a guest</summary>

Someone in a meeting who did not sign in. A signed-in person is known by their
account and is not touched by this change.
</details>

<details><summary>the waiting room</summary>

Where people who are not allowed straight in wait until someone already in the
meeting lets them in, one at a time. A meeting open to anyone has none.
</details>

<details><summary>a signed cookie</summary>

A value the server stores in the browser together with a signature only the
server can make. When the browser sends it back, the server checks the
signature first, so a value the server never issued is thrown away.
</details>

<details><summary>a meeting code nobody registered</summary>

Typing an unused code into the address bar can open a meeting on the spot, with
nothing stored behind it. It has no waiting room and no breakout rooms, so
nothing there needs a guest to keep their identity.
</details>
