# connect4: a staked Connect 4 realm

Written by claude-opus-5-5.
PR: [samouraiworld/gnoland-packages#15](https://github.com/samouraiworld/gnoland-packages/pull/15)

## TLDR

The pull request adds `gno.land/r/samcrew/connect4`, a new realm where two players stake the same amount of ugnot on a game of Connect 4. The winner receives both stakes minus a flat house fee that the owner sets with `SetFee` and collects with `WithdrawFees`. A two-sided commit-reveal decides who moves first, and a 90-second move clock, settled by anyone through `ClaimTimeout`, keeps an absent player from locking the stakes. The realm also serves a lobby, an offer form and a game page through `Render`, and JSON views for clients.

## What the realm is

A player posts an offer with a stake, an optional named opponent and a validity of 1 to 60 minutes. Another player accepts it by sending the same stake. The acceptor commits to a seed as it accepts. The creator then reveals its passphrase, the acceptor its seed, and the two secrets together pick the first mover; the two play by clicking columns on the game page.

## How it works, in 5 steps

1. `Offer(opponent, validFor, commitment)` takes the stake from the sent coins, for example 10 GNOT with `validFor` 15 and `commitment` the sha256 of a passphrase, and snapshots the current fee into `Game.Fee`.
2. `Accept(id, seedCommitment)` takes an equal stake and the sha256 of the acceptor's seed, and starts the 90s clock.
3. `Reveal(id, passphrase)` stores the creator's passphrase once it matches the commitment; `RevealSeed(id, seed)` then sets `Turn` from one bit of `sha256(passphrase|seed|id|creator|acceptor)`.
4. `Play(id, column, move)` drops a piece; a line of four pays the pot minus `Game.Fee` to the winner, a full board refunds both stakes.
5. `ClaimTimeout(id)` settles an expired clock: a missing reveal forfeits to the other player, a game whose first mover never moved is void, otherwise the player who ran out loses.

## The parts, at a glance

| Part | File | Job |
| --- | --- | --- |
| Game state and money | [connect4.gno](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/connect4.gno) | offers, accepts, both reveals, moves, settlement, fee and two-step owner calls |
| Board | [board.gno](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/board.gno) | `drop`, `wins` and `winLine` on a 7 by 6 grid |
| Pages | [render.gno](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/render.gno) | lobby with leaderboards, offer form, game page with txlink actions |
| Client views | [json.gno](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/json.gno) | `GameJSON`, `ActiveJSON`, `LeadersJSON` |
| Design record | [README.md](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/README.md) | why commit-reveal, the move clock and the session-key rules |

## Read the code in this order

1. [`received` and `noSession`](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/connect4.gno#L414-L441) decide which calls may move coins: only a direct `maketx call` pays a stake, and a session key may only Play, Reveal, RevealSeed, ClaimTimeout and Cancel.
2. [`RevealSeed`](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/connect4.gno#L227-L252) decides the first mover, the one random choice in a game.

   ```go
   h := sha256.Sum256([]byte(strings.Join([]string{
   	passphrase, seed, strconv.Itoa(g.ID), g.Creator.String(), g.Acceptor.String(),
   }, "|")))
   return 1 + h[0]&1
   ```

3. [`ClaimTimeout`](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/connect4.gno#L295-L318) decides who is paid when someone stops playing.
4. [`settleWin`](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/connect4.gno#L460-L477) moves the money and the leaderboards; `SetFee` decides the fee a new offer snapshots, capped at 0.5 GNOT.
5. [`renderLobby`](https://github.com/samouraiworld/gnoland-packages/blob/ae5eb87e7081615b242539f713dced9007de87df/gno/r/connect4/render.gno#L71-L118) is what most players read before they accept: at most 50 unexpired rows of `active`, each with its own fee.

## What a user notices

- A new realm page with a lobby, an offer form and a page per game, the same for every viewer.
- Every action is a txlink that opens the wallet with its arguments and coins prefilled.
- An offer that nobody accepts stays until its creator cancels it, or anyone does once it expired.

## Words used here

| Name | What it is |
| --- | --- |
| `Offer` | crossing call that opens a game; takes one `ugnot` coin of at least 1 GNOT, above the fee |
| `Accept` | crossing call that joins an open, unexpired offer with exactly its stake and a seed commitment |
| `Reveal` | the creator's call within 90s of `Accept` that discloses and stores the passphrase |
| `RevealSeed` | the acceptor's call within 90s of `Reveal` that discloses the seed and sets `Turn` |
| `ClaimTimeout` | anyone's call that settles a game once 90s of block time passed since `LastMove` |
| `Game.Fee` | the house fee fixed at `Offer`, 100,000 ugnot by default |
| `SetFee` | owner call that changes the fee for later offers, at most 0.5 GNOT; the owner is the deployer and hands over in two steps |
| `active` | avl tree of games still Open or Playing, the lobby's source |
| session key | an account key with limited paths, used by Quick play; `runtime.GetSessionInfo` reports it |
