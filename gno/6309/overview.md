# `scroll-margin-top` for h5 and h6 in `.c-realm-view` and `.c-readme-view`
PR: [gnolang/gno#6309](https://github.com/gnolang/gno/pull/6309)

## TLDR

Before, the `scroll-margin-top` rule in `05-composition.css` covered `h1` to
`h4`, `sup` and `.footnote-backref`, so an h5 or h6 anchor target scrolled to
the top of the viewport, behind the sticky `.b-header`. After, `h5` and `h6`
sit in the same `:is()` list and land 108px down like the other levels. The
change exists because the table of contents links every level from h2 to h6.

## Before and after

| Where the jump starts | Before | After |
| --- | --- | --- |
| A table of contents entry for an h5 or h6, through the `#<id>` link `TocInspect` emits | heading top at -0.5px, under the 57px header | heading top at 107.5px |
| A URL ending in an h5 or h6 `#<id>`, through the browser's fragment scroll | same as above | same as above |
| Any h2 to h4 target | 108px | 108px, unchanged |

Measured at 1024px wide in a gnoweb fixture serving one markdown page through
the real templates and the built `main.css`.

## Read the code in this order

1. [`05-composition.css#L537-L539`](https://github.com/davd-gzl/gno/blob/e29ad299877d12fbd52008d26e5150a2baf4e555/gno.land/pkg/gnoweb/frontend/css/05-composition.css#L537-L539),
   inside the `.c-realm-view, .c-readme-view` block. It decides how far below
   the top an anchor target stops; a level missing from the list stops at 0.
   The after side:
   ```css
   :is(h1, h2, h3, h4, h5, h6, sup, .footnote-backref) {
   	scroll-margin-top: var(--cr-space-24);
   }
   ```
2. [`render.go#L140`](https://github.com/davd-gzl/gno/blob/e29ad299877d12fbd52008d26e5150a2baf4e555/gno.land/pkg/gnoweb/render.go#L140), which builds the
   table of contents. It decides which levels get a link, h2 to h6.
3. `public/main.css`, the bundle the Go binary embeds, rebuilt by
   `make -C gno.land/pkg/gnoweb generate`. An edit to `frontend/css/` that
   skips it ships nothing.

## What a user notices

A jump to an h5 or h6 heading on a realm page or a package README shows the
heading below the header for every visitor: the stylesheet decides it, not the
account.

## Words used here

| Name | What it is |
| --- | --- |
| `scroll-margin-top` | Space the browser keeps above an element when it scrolls that element into view, here `--cr-space-24`, which scales with the element's font size and computed to 108px on the h4, h5 and h6 of the fixture. |
| `.b-header` | The site header, `position: sticky` at the top of the viewport, 57px tall at 1024px wide. |
| `TocInspect` | The function that walks the rendered markdown and lists headings for the table of contents, between `MinDepth` 2 and `MaxDepth` 6. |
