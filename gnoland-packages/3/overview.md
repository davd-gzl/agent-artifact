# Mainnet gno tests and an attribution gate for gnoland-packages

Written by claude-opus-5-5.

## TLDR

Every pull request gets two new checks. One runs `gno test` on each package under `gno/` with the gno that mainnet `gnoland-1` runs, fetching every outside import from the live chain. The other refuses any file, commit message, branch name, title or body that names the assistant used to write the change. `payrolls` and `subscriptions` are listed as expected to fail, and the job goes red the day either passes.

## What it is for

The repository holds gno packages and realms deployed on the gno.land mainnet, `gnoland-1`. A package that builds against gno master can still fail there: an import path moved, or a test imports a realm that exists in the gno tree and is not deployed on mainnet.

## How it works today

Before the change, no workflow runs on a pull request. The README asks for a local `gno test ./gno/...` with whatever gno the reader has installed.

## What the change does

After the change, two workflows run on every pull request and on every push to `main`:

| Job | Workflow | Script | Passes when |
| --- | --- | --- | --- |
| gno test (mainnet gno) | `.github/workflows/gno-test.yml` | `ci/gno-test.sh` | every package with a `gnomod.toml` under `gno/` passes `gno test`, and every package in `ci/known-failing.txt` fails |
| Vendor attribution | `.github/workflows/attribution.yml` | `.github/scripts/check-vendor-attribution.py` | no tracked file carries the assistant's name, as text, as base64 or in a PNG chunk |
| Vendor attribution (the surfaces that are not files) | the same | the same, with `--text` | the branch name, the commit messages, the pull request title and body and the tag annotations carry no such name |

The gno job builds gno at the revision in `ci/gno-ref.env`, the one `gnoland-1` runs, with an empty `GNOHOME`, so every import from outside the repository is fetched from `rpc.gno.land`. After the change, two packages are listed as expected failures:

| Package | Why it fails on mainnet gno, after the change |
| --- | --- |
| `gno/r/payrolls` | it imports paths `gnoland-1` does not serve, `gno.land/p/demo/tokens/grc20` among them |
| `gno/r/subscriptions` | its tests import `gno.land/r/tests/vm/test20`, a test realm not deployed there |

The attribution checker and its self-test come from `samouraiworld/memba`, with one change: a submodule entry is skipped rather than opened as a file.

## Concepts

- **Known-failing list**: packages expected to fail. The script errors when one passes, so an entry has to leave the list in the pull request that fixes its package.
- **Gitlink**: a submodule appears in the parent tree as an entry of mode `160000` holding a commit id, not as a directory of files.
- **Surfaces that are not files**: text published with a change that `git ls-files` cannot see, read from git or from the event payload.
