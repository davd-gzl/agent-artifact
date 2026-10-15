# PR descriptions in the `### Universal` rules of `AGENTS.md`
PR: [gnolang/gno#6353](https://github.com/gnolang/gno/pull/6353)

## TLDR

Before, two bullets of `AGENTS.md` told an agent to list every category of
work in a PR description, and nothing else about its shape. After, the
description is written for a reviewer judging direction: the problem first,
then the decisions and why, a vulnerability in merged code kept out of it,
and a collapsed `Hot spots` block linking the lines to read first, straight
into the PR's diff. The change exists because merged descriptions use a
different set of headings almost every time.

## Before and after

| The PR | Before | After |
| --- | --- | --- |
| A fix | any headings | the problem, then the fix and why; `## Problem` and `## Fix` offered as one shape |
| A feature | any headings | the problem, then the decisions and why, the ADR linked; `## Problem` and `## Design` offered as one shape |
| A docs or chore PR | any headings | a few sentences |
| Every PR | every category of work listed | each kind of work in one line |
| A vulnerability in merged code | no rule on what a public description says | how to trigger it and what it costs stay in a private channel `SECURITY.md` lists |
| A vulnerability the PR's own diff introduces | no rule | raised in that PR's review comments |
| Where a reviewer starts reading | the top of the diff | the `Hot spots` links, each with one sentence on why |

## Read the code in this order

1. [`AGENTS.md#L93-L97`](https://github.com/davd-gzl/gno/blob/80dbb4c5dfcaefbf9558eaf15b0b17d450fe78e7/AGENTS.md?plain=1#L93-L97),
   the after side, inside `### Universal`. It decides what a description
   leads with and the `Hot spots` block. The ADR a description links is the
   one `## Architecture Decision Records (ADRs)`, in the same file, asks for.

## Words used here

| Name | What it is |
| --- | --- |
| `Hot spots` | A `<details>` block closing the description, one link per place to read first, each into the PR's own diff at `/pull/<n>/files#diff-<hash>R<line>`, `<hash>` being `printf %s <path> \| sha256sum`. |
