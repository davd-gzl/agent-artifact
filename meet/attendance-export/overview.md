# Download attendance

## TLDR

The participants panel showed who is in the meeting and offered no way to keep
the list. A host or co-host now gets a `Download attendance` button under
`Mute all microphones`, rendered by `DownloadAttendanceButton`. It saves a CSV
built by `buildAttendanceCsv`: one row per person connected at the click, with
the name, `Signed in` or `Guest`, and the time they joined. Everything happens
in the browser; nothing new is stored or sent.

## What the button is

A register for a lesson taken in a meeting. The host clicks it once the class
is in, and the browser saves `attendance-<room code>-<date>_<time>.csv`.
Someone who left before the click is not in the file.

## How it works, in 4 steps

1. The panel hands the button the same list it draws, the host first and the
   others by name, [`ParticipantsList.tsx#L73-L78`](https://github.com/davd-gzl/meet/blob/67e21a973d1abd8dc89572b536ed0957e47d00c1/src/frontend/src/features/participants/components/ParticipantsList.tsx#L73-L78).
2. On click, each person becomes a row through the existing helpers,
   [`DownloadAttendanceButton.tsx#L27-L32`](https://github.com/davd-gzl/meet/blob/67e21a973d1abd8dc89572b536ed0957e47d00c1/src/frontend/src/features/participants/components/DownloadAttendanceButton.tsx#L27-L32):
   `{ name: 'Léa', signedIn: false, joinedAt: 2026-10-07 17:40 }`.
3. `buildAttendanceCsv` quotes every cell and prefixes a name a spreadsheet
   would run as a formula with `'`,
   [`downloadAttendance.ts#L20-L23`](https://github.com/davd-gzl/meet/blob/67e21a973d1abd8dc89572b536ed0957e47d00c1/src/frontend/src/features/participants/utils/downloadAttendance.ts#L20-L23):
   `"Léa","Guest","2026-10-07 17:40"`.
4. `downloadAttendance` adds a byte order mark and hands the file to
   `downloadBlob`, the anchor-click step the connection test report already
   used,
   [`downloadAttendance.ts#L41-L47`](https://github.com/davd-gzl/meet/blob/67e21a973d1abd8dc89572b536ed0957e47d00c1/src/frontend/src/features/participants/utils/downloadAttendance.ts#L41-L47).

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
- Times are in the clicking browser's local time.
- A person who left and came back shows the time of their latest join.

## Words used here

| Name | What it is |
| --- | --- |
| `AdminOrOwnerOnly` | renders its children only when the local person's room role is owner or administrator |
| `joinedAt` | the time the media server records for the current connection; a rejoin resets it |
| `getParticipantIsAuthenticated` | true when the person's `is_authenticated` attribute reads `true`, set by the backend for a signed-in account |
