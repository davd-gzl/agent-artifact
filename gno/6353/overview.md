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
| A `fix` | any headings, a list of every category of work | `## Problem`, then `## Fix` with the category list |
| A `feat`, `perf` or `refactor` | same as above | `## Direction`, linking the ADR, then `## Changes` with the category list |
| A `docs`, `chore`, `test` or any other type | same as above | a few sentences, the categories one sentence each |
| A security fix | no rule on what a public description says | the triggering input and the cost stay in a private channel `SECURITY.md` lists |
| Where a reviewer starts reading | the top of the diff | the `Hot spots` links, each with one sentence on why |

## Read the code in this order

1. [`AGENTS.md#L93-L100`](https://github.com/davd-gzl/gno/blob/e18770d54a5acb8e5da24bf42845c0691f64a055/AGENTS.md?plain=1#L93-L100),
   the after side, inside `### Universal`. It decides the sections and the
   `Hot spots` block. The ADR a description links is the one
   `## Architecture Decision Records (ADRs)`, in the same file, asks for.

## Words used here

| Name | What it is |
| --- | --- |
| conventional type | The prefix of the PR title, `fix`, `feat`, `docs` and the rest, which `meta-gh-title.yml` lints on every PR. |
| `Hot spots` | A `<details>` block closing the description, one link per place to read first, each into the PR's own diff at `/pull/<n>/files#diff-<sha256 of the path>R<line>`. |
