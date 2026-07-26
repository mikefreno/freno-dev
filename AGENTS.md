# Agent Guidelines for freno-dev

### Tech Stack

- **Framework**: SolidJS with SolidStart (Vinxi)
- **Routing**: @solidjs/router
- **API**: tRPC v10 with Zod validation
- **Database**: libSQL/Turso with SQL queries
- **Styling**: TailwindCSS v4
- **Runtime**: Bun (Node >=22)
- **Deployment**: Vercel preset

## Content Rules

### No Competitor Mentions

- **Never mention a competitor's product by name** in any user-facing content (landing pages, marketing copy, comparison tables, meta descriptions, emails, FAQs, etc.).
  - This includes but is not limited to products like Strava, Garmin, etc.
  - Describe the product's own merits and positioning on its own terms. Use generic descriptions instead of naming competitors.
  - This applies to ALL products (Nessa, Lineage, Gaze, InputHalo) and the main site.
  - If existing content already names a competitor, remove or generalize it when working in that file.

## Code Style

### Naming Conventions

- **Files/Components**: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
- **Variables/Functions**: camelCase (e.g., `getUserID`, `displayName`)
- **Types/Interfaces**: PascalCase (e.g., `User`, `ButtonProps`)
- **Constants**: camelCase or UPPER_SNAKE_CASE for true constants

### Imports

- Prefer named imports from solid-js: `import { createSignal, Show, For } from "solid-js"`
- Use `~/*` path alias for src imports: `import { api } from "~/lib/api"`
- Group imports: external deps → solid-js → local (~/)

### SolidJS Patterns (NOT React!)

- **State**: Use `createSignal()` not `useState`. Always call signals: `count()` to read
- **Effects**: Use `createEffect()` not `useEffect`. Auto-tracks dependencies (no array)
- **Conditionals**: Prefer `<Show when={condition()}>` over `&&` or ternary
- **Lists**: Prefer `<For each={items()}>` over `.map()`
- **Forms**: Use `onInput` (not `onChange`), access `e.currentTarget.value`
- **Refs**: Use `let ref` binding or `createSignal()` for reactive refs

### TypeScript

- **Strict mode enabled** - always type function params and returns
- Use interfaces for props: `export interface ButtonProps extends JSX.HTMLAttributes<T>`
- Use `splitProps()` for component prop destructuring
- Prefer explicit types over `any` - use `unknown` if type truly unknown
- Database types: Cast with `as unknown as User` for SQL results

### API/Server Patterns

- **tRPC routers**: Export from `src/server/api/routers/*.ts`
- **Procedures**: Use `.query()` for reads, `.mutation()` for writes
- **Validation**: Use Zod schemas in `.input()` - validate all user input
- **Auth**: Extract userId with `await getUserID(ctx.event.nativeEvent)`
- **Errors**: Throw `TRPCError` with proper codes (UNAUTHORIZED, NOT_FOUND, BAD_REQUEST)
- **Database**: Use `ConnectionFactory()` singleton, parameterized queries only

### Error Handling

- Use TRPCError with semantic codes on server
- Validate inputs with Zod schemas before processing
- Check auth state before mutations: throw UNAUTHORIZED if missing userId
- Return structured responses: `{ success: boolean, message?: string }`

### Comments

- **Minimal comments** - prefer self-documenting code
- JSDoc for exported functions/components only
- Inline comments for non-obvious logic only

### File Organization

- Routes in `src/routes/` (file-based routing)
- Components in `src/components/` (reusable) or co-located with routes
- API routers in `src/server/api/routers/`
- Types in `src/types/` (shared types) or co-located
- Utils in `src/lib/` or `src/server/utils.ts`

## Subdomain Routing

This project serves four product subdomains (`nessa.freno.me`, `lineage.freno.me`, `gaze.freno.me`, `inputhalo.freno.me`) plus the personal site on `freno.me`. See `docs/subdomain-setup.md` for DNS/Vercel configuration.

- **Route placement:** Subdomain pages live under `src/routes/<prefix>/*` (e.g. `src/routes/nessa/...`). An in-app middleware (`src/middleware.ts`, registered via `app.config.ts` → `middleware`) rewrites the request path based on the `Host` header so `lineage.freno.me/privacy` resolves to the `/lineage/privacy` file route. (The `vercel.json` host `rewrites` are declared but **not applied** by Vercel — the Nitro `vercel` preset emits a Build Output API `config.json` whose `routes` array fully replaces `vercel.json` rewrites/redirects/headers, so the in-app middleware is what actually does the work.)
- **Site context:** Use `useSite()` (SolidJS) or `getSiteFromEvent`/`getSiteFromRequest` (server) from `src/lib/site-context.ts` to detect the current site. Never host-snoop in route files — SolidStart's router can't match on host.
- **API routes:** `/api/*` is a shared pool — subdomain API requests pass through to existing routes via vercel.json pass-through rewrites (ordering matters).
- **Auth:** Host-scoped only — no cookie domain broadening.

## Key Differences from React

See `src/lib/SOLID-PATTERNS.md` for comprehensive React→Solid conversion guide. Key gotchas:

- Signals must be called with `()` to read value
- `onChange` → `onInput` for real-time input updates
- `useEffect` → `createEffect` (auto-tracking, no deps array)
- `Link` → `A` component from @solidjs/router
- Server actions → tRPC procedures
