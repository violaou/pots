# [pots.violaou.com](https://pots.violaou.com)

A personal website showcasing my pottery artwork and blog posts.

## Features

- Blog posts
- Artwork gallery
- About me

### Run

Install: `pnpm install`

Local: `pnpm dev`

Build: `pnpm run build -- --base=/dist/`

Deploy: `firebase deploy --only hosting`

### build production, mode development
`vite build --mode development`

https://vite.dev/guide/env-and-mode.html#modes


---

### Troubleshooting

- deploying to the wrong site: `firebase use pots`

- on deploy, I see:
  `     Error: Assertion failed: resolving hosting target of a site with no site name or target name. This should have caused an error earlier
  `
  Run: `firebase login --reauth`
  `
