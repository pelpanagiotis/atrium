<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI form controls

Never ship bare HTML form controls in the product UI. Use the shared components under `src/components/ui/`:

| Need | Use |
| --- | --- |
| Checkbox | `@/components/ui/checkbox` (`Checkbox`) |
| Radio | `@/components/ui/radio` (`Radio`) |
| Text / password / email | `@/components/ui/field` (`Input`) |
| Textarea | `@/components/ui/field` (`Textarea`) |
| Select / dropdown | `@/components/ui/menu-select` (`MenuSelect`) |
| Button | `@/components/ui/button` (`Button`) |

Hidden inputs (`type="hidden"`) are fine for form payloads. Do not use native `<input type="checkbox">`, `<input type="radio">`, or `<select>` for user-facing controls.
