# Download attendance

## TLDR

The participants panel showed who is in the meeting and offered no way to keep
the list. A host or co-host now gets a `Download attendance` button under
`Mute all microphones`, rendered by `DownloadAttendanceButton`. It saves a CSV
built by `buildAttendanceCsv`: one row per person connected at the click, with
the name and `Signed in` or `Guest`. Everything happens in the browser; nothing
new is stored or sent. It carries no join time, since a rejoin restarts it.

## What the button is

A register for a lesson taken in a meeting. The host clicks it once the class
is in, and the browser saves `attendance-<room code>-<date>_<time>.csv`.
Someone who left before the click is not in the file.

## How it works, in 4 steps

1. The panel hands the button the same list it draws, the host first and the
   others by name, [`ParticipantsList.tsx#L73-L78`](https://github.com/davd-gzl/meet/blob/f699259c1f28177cb3a283369c405bd300df9c67/src/frontend/src/features/participants/components/ParticipantsList.tsx#L73-L78).
2. On click, each person becomes a row through the existing helpers,
   [`DownloadAttendanceButton.tsx#L27-L31`](https://github.com/davd-gzl/meet/blob/f699259c1f28177cb3a283369c405bd300df9c67/src/frontend/src/features/participants/components/DownloadAttendanceButton.tsx#L27-L31):
   `{ name: 'Léa', signedIn: false }`.
3. `buildAttendanceCsv` quotes every cell and prefixes a name a spreadsheet
   would run as a formula with `'`,
   [`downloadAttendance.ts#L18-L24`](https://github.com/davd-gzl/meet/blob/f699259c1f28177cb3a283369c405bd300df9c67/src/frontend/src/features/participants/utils/downloadAttendance.ts#L18-L24):
   `"Léa","Guest"`.
4. `downloadAttendance` adds a byte order mark and hands the file to
   `downloadBlob`, the anchor-click step the connection test report already
   used,
   [`downloadAttendance.ts#L40-L46`](https://github.com/davd-gzl/meet/blob/f699259c1f28177cb3a283369c405bd300df9c67/src/frontend/src/features/participants/utils/downloadAttendance.ts#L40-L46).

## The parts, at a glance

| Part | File | Job |
| --- | --- | --- |
| `DownloadAttendanceButton` | `features/participants/components/DownloadAttendanceButton.tsx` | the button, behind `AdminOrOwnerOnly` |
| `buildAttendanceCsv`, `downloadAttendance` | `features/participants/utils/downloadAttendance.ts` | the rows, the escaping, the file |
| `downloadBlob` | `utils/downloadBlob.ts` | saves a blob, moved out of `downloadConnectionTestReport.ts` |
| `participants.attendance` | `locales/*/rooms.json` | the label and the CSV headers in five languages |

## What a user notices

- A host or co-host sees the button whenever the panel is open; a guest never
  does, the same rule as `Mute all microphones`.
- The headers and the account values follow the language of whoever clicks.
- No time is in the file: someone who rejoined is listed once, like anyone else.

## Words used here

| Name | What it is |
| --- | --- |
| `AdminOrOwnerOnly` | renders its children only when the local person's room role is owner or administrator |
| `getParticipantIsAuthenticated` | true when the person's `is_authenticated` attribute reads `true`, set by the backend for a signed-in account |
