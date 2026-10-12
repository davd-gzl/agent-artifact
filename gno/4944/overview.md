# `ProposeAddMember`: a non-member proposes a govDAO member for a fee
PR: [gnolang/gno#4944](https://github.com/gnolang/gno/pull/4944)

## TLDR

Before, `PreCreateProposal` in `r/gov/dao/impl/v0` refused every proposal whose
author was not a govDAO member, so nobody outside the DAO could put a candidate
to a vote. After, `impl.ProposeAddMember` lets a non-member open one kind of
proposal, adding a member to T1 or T2, by sending `ProposalFeeAmount`, 1 GNOT,
with the same msg call. The fee goes to the govDAO treasury. Every other
proposal stays members-only. The change exists for
[#2520](https://github.com/gnolang/gno/issues/2520).

## What `ProposeAddMember` is

A msg call on `gno.land/r/gov/dao/impl/v0` that opens a "New T2 Member
Proposal" in one transaction. A non-member pays the fee with `-send`; a member
calls it for free and spends an invitation point when it executes, as with
`NewAddMemberRequest`. The members then vote it exactly as they vote any
add-member proposal.

```bash
gnokey maketx call -pkgpath gno.land/r/gov/dao/impl/v0 -func ProposeAddMember \
  -send 1000000ugnot -args g1rfznvu6qfa0sc76cplk5wpqexvefqccjunady0 -args T2 \
  -args 'My portfolio' ... nonmember
```

## How it works, in 4 steps

The example is the call above, from the non-member
`g1rfznvu6qfa0sc76cplk5wpqexvefqccjunady0`, on the head of the branch.

1. `ProposeAddMember` checks that its caller is a user's msg call,
   `cur.Previous().IsUserCall()`. A `maketx run` script is refused here.
2. `newAddMemberRequest` validates the address, tier and portfolio, looks up
   the caller in the member store and finds no member. With `feePaid` true it
   builds the request anyway.
3. Because the caller is not a member and the fee is not 0, the call must carry
   exactly `1000000ugnot` and nothing else. Those coins already sit at the
   `impl/v0` address, and a realm-send banker forwards them to
   `r/gov/dao/treasury/v0`.
4. `dao.MustCreateProposal` sends the request to the proxy, which calls
   `PreCreateProposal`. The proxy was entered from `impl/v0`, so
   `PreCreateProposal` admits the author, the origin caller, and the proposal
   gets an id. The call prints `(0 gno.land/r/gov/dao.ProposalID)` for the
   first proposal on a fresh chain.

## The parts, at a glance

| Part | File | Job |
| --- | --- | --- |
| `ProposeAddMember` | [`impl.gno#L65-L90`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/impl/v0/impl.gno#L65-L90) | The only route for a non-member: checks the caller, takes the fee, creates the proposal |
| The route check | [`govdao.gno#L45-L49`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/impl/v0/govdao.gno#L45-L49) | Admits a non-member only when the proxy was entered from `impl/v0` |
| `newAddMemberRequest` | [`prop_requests.gno#L88-L113`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/impl/v0/prop_requests.gno#L88-L113) | Builds the request; refuses a non-member unless `feePaid` |
| `ProposalFeeAmount` | [`govdao.gno#L17`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/impl/v0/govdao.gno#L17) | The fee in ugnot, 1000000 by default |
| `NewProposalFeeAmountRequest` | [`prop_requests.gno#L325`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/impl/v0/prop_requests.gno#L325) | A members-only proposal that sets a new fee; 0 makes it free |
| `govdao_proposal_nonmember_fee.txtar` | [`testdata`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/gno.land/pkg/integration/testdata/govdao_proposal_nonmember_fee.txtar) | The whole flow on a node, the refused routes included |

## Read the code in this order

1. [`impl.gno#L68-L89`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/impl/v0/impl.gno#L68-L89),
   `ProposeAddMember`. It decides who pays: if the direct-call check went,
   a `maketx run` could claim to pay, because a run's `-send` goes back to the
   signer, per [`keeper.go#L1518`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/gno.land/pkg/sdk/vm/keeper.go#L1518)
   and [`#L1557`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/gno.land/pkg/sdk/vm/keeper.go#L1557).
2. [`govdao.gno#L45-L60`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/impl/v0/govdao.gno#L45-L60),
   `PreCreateProposal`. It decides what a non-member can open. The after side:
   ```go
   if rlm.IsCurrent() && rlm.PkgPath() == "gno.land/r/gov/dao" && rlm.Previous().PkgPath() == "gno.land/r/gov/dao/impl/v0" {
   	return unsafe.OriginCaller(), nil
   }
   ```
   It checks where the call came from, not what the request is: a request's
   executor is unexported in the proxy, and its tier filter can be copied onto
   another executor, so nothing on the request marks its kind unforgeably.
   If another function in `impl/v0` ever created a proposal, it would inherit
   this pass.
3. [`prop_requests.gno#L80-L113`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/impl/v0/prop_requests.gno#L80-L113),
   `NewAddMemberRequest` and `newAddMemberRequest`. The exported one stays
   members-only, so a non-member's request never exists outside
   `ProposeAddMember`; otherwise a member could submit one without spending an
   invitation point. The after side:
   ```go
   if member == nil && !feePaid {
   	panic("proposer is not a member")
   }
   ```
4. [`treasury.gno#L38`](https://github.com/davd-gzl/gno/blob/0a6a5d7c475014c78c327cf3bc54369e926c7cbd/examples/gno.land/r/gov/dao/treasury/v0/treasury.gno#L38),
   the treasury's coins banker, which spends from the treasury's own address.
   That is why the fee is forwarded there rather than left at `impl/v0`, which
   has no way to spend it.

## What a user notices

What each caller gets, after the change:

| Caller | Through | Result |
| --- | --- | --- |
| Non-member, sending exactly `1000000ugnot` | `ProposeAddMember`, msg call | Add-member proposal opened, fee moved to the treasury |
| Non-member, any other amount or denom | `ProposeAddMember`, msg call | `send exactly 1000000ugnot to pay the proposal fee` |
| Non-member | a `maketx run` calling `ProposeAddMember` | `ProposeAddMember must be called directly with a msg call` |
| Non-member | `dao.CreateProposal` from a script, any request but adding a member | `only members can create new proposals; a non-member can propose a member with ProposeAddMember` |
| Non-member | `NewAddMemberRequest` from a script | `proposer is not a member` |
| Member, sending nothing | `ProposeAddMember`, or `NewAddMemberRequest` as before | Proposal opened; one invitation point spent once it executes |
| Member, sending coins | `ProposeAddMember` | `no proposal fee is due, send nothing` |

Whether a caller pays is decided per account, by membership in the member store
at the moment of the call. While `ugnot` is a restricted denom no non-member can
pay: one outside the whitelist cannot send the fee, and for one inside it the
forward to the treasury is a restricted transfer.

## Upgrading

A realm's code cannot change once deployed, so the `impl/v0` already on a chain
keeps the members-only rule. This reaches a chain that deploys `impl/v0` from
this tree at genesis, or a later implementation carrying it, installed through
`NewUpgradeDaoImplRequest`.

## Words used here

| Name | What it is |
| --- | --- |
| `ProposeAddMember` | The msg call on `impl/v0` through which a non-member opens an add-member proposal, paying `ProposalFeeAmount` with the call. |
| `ProposalFeeAmount` | The fee in ugnot, a package variable of `impl/v0`, 1000000 by default, changed only by an executed `NewProposalFeeAmountRequest`. |
| `PreCreateProposal` | The `impl/v0` hook the `r/gov/dao` proxy calls before storing any proposal; an error from it refuses the proposal. |
| `IsUserCall` | True when the realm that called is a user's msg call, with no package path; false for a `maketx run` script and for any code realm. |
| `feePaid` | The flag `ProposeAddMember` passes to `newAddMemberRequest` so it builds a request for a non-member; every other caller passes false. |
| restricted denom | A denom listed in the bank parameter `restricted_denoms`, which only whitelisted addresses can transfer. |
