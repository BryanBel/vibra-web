**English** | [Español](README.es.md)

# Vibra

Storefront for **Vibra**, a Venezuelan brand of handmade hand chains — bracelets and rings
joined by a chain, worn across the back of the hand.

**Live at [vibracompany.netlify.app](https://vibracompany.netlify.app)**

![The Vibra storefront](docs/home.webp)

## Two branches, two stages

`main` holds the site that is live: a single-page Astro storefront with the brand's type
and colour system, built from the identity the client supplied.

[`feat/monorepo-api`](https://github.com/BryanBel/vibra-web/tree/feat/monorepo-api) holds
where it is going — a real shop with a catalogue, stock, orders and an admin panel, rather
than a page listing four products.

The starting point was the problem in miniature: those four products were written twice in
the same file, once in the HTML and once again in the JavaScript. Everything below follows
from not wanting to do that again.

## The monorepo

```
apps/
  web/          # public site + admin panel at /admin (Astro)
  api/          # NestJS backend
packages/
  contracts/    # oRPC contract in Zod — the single source of truth for the API
  db/           # Drizzle schema, migrations and seed
  config/       # shared base tsconfig
```

| Layer | Choice | Why |
| ----- | ------ | --- |
| Site | [Astro](https://astro.build) 7, SSR with per-route prerendering | Brand pages are prerendered; the catalogue is server-rendered because the bolívar price changes daily and stock changes with every order |
| Admin | React islands inside `apps/web/src/pages/admin` | A variant matrix, image uploads and drag-reordering get heavy in plain JavaScript. Astro loads islands per page, so public pages never download any of it |
| Backend | [NestJS](https://nestjs.com) 12 | Modules, role guards and lifecycle already solved, in a convention another developer would recognise |
| Database | [Drizzle](https://orm.drizzle.team) over PostgreSQL 18 | The domain is plainly relational. Schema in TypeScript, versioned migrations, and SQL you can read — which the checkout needs, since it depends on an atomic `UPDATE … WHERE stock >= n` that an opaque ORM hides |
| API | [oRPC](https://orpc.unnoq.com) with a Zod contract, OpenAPI generated | End-to-end types with no codegen step: drift between site and API is impossible by construction, and the URLs stay ordinary REST so the catalogue still caches on the CDN |
| Auth | Own JWT + argon2, httpOnly cookies, role guard | There are no customer accounts — only an admin login for one or two people. A full auth library is a large dependency for two users |
| Search | PostgreSQL full-text, `spanish_unaccent` | For a catalogue of dozens of pieces, Algolia or Meilisearch is infrastructure without a benefit |

[`ARCHITECTURE.md`](https://github.com/BryanBel/vibra-web/blob/feat/monorepo-api/ARCHITECTURE.md)
on that branch carries the reasoning in full, including the decisions still open.

## Running the site

```sh
pnpm install
pnpm dev        # http://localhost:4321
```

## A note on the brand material

The identity PDF, the raw photography and the client's source files are deliberately not
in this repository. They are roughly 54 MB the build never reads, and they are the client's
material rather than source. The photographs the site actually renders are committed,
optimized, under `public/`.

---

Built by Bryan Belandria — [github.com/BryanBel](https://github.com/BryanBel)
