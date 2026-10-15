# PR descriptions in the `### Universal` rules of `AGENTS.md`
PR: [gnolang/gno#6353](https://github.com/gnolang/gno/pull/6353)

## TLDR

Before, two bullets of `AGENTS.md` told an agent to list every category of
work in a PR description, and nothing else about its shape. After, the
description is written for a reviewer judging direction: its sections follow
the conventional type of the title, a vulnerability's trigger and cost stay
out of it, and a collapsed `Hot spots` block links the lines to read first,
straight into the PR's diff. The change exists because merged descriptions use
a different set of headings almost every time.

## Before and after

| The PR | Before | After |
| --- | --- | --- |
| A `fix` | any headings, a list of every category of work | `## Problem`, then `## Fix`, each kind of work in one line |
| A `feat`, `perf` or `refactor` | same as above | `## Direction`, then `## Changes`, each kind of work in one line, the ADR linked |
| Any other type, `docs` or `chore` for one | same as above | a few sentences |
| A vulnerability in merged code | no rule on what a public description says | how to trigger it and what it costs stay in a private channel `SECURITY.md` lists |
| A vulnerability the PR's own diff introduces | no rule | raised in that PR's review comments |
| Where a reviewer starts reading | the top of the diff | the `Hot spots` links, each with one sentence on why |

## Read the code in this order

1. [`AGENTS.md#L93-L100`](https://github.com/davd-gzl/gno/blob/5c353d38c623e8d84d845b97d1164846a2c8d1ab/AGENTS.md?plain=1#L93-L100),
   the after side, inside `### Universal`. It decides the sections and the
   `Hot spots` block. The ADR a description links is the one
   `## Architecture Decision Records (ADRs)`, in the same file, asks for.

## Words used here

| Name | What it is |
| --- | --- |
| conventional type | The prefix of the PR title, `fix`, `feat`, `docs` and the rest, which `meta-gh-title.yml` lints on every PR. |
| `Hot spots` | A `<details>` block closing the description, one link per place to read first, each into the PR's own diff at `/pull/<n>/files#diff-<hash>R<line>`, `<hash>` being `printf %s <path> \| sha256sum`. |
