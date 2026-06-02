# Elsewhere

An archive experience for Halou recordings, images, demos, video, and related
materials.

## Local development

Install dependencies and run the local site:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The private editor lives at
`/backroom`.

## Required environment variables

```bash
NEXT_PUBLIC_SITE_URL=https://your-live-domain.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
BACKROOM_USER=
BACKROOM_PASSWORD=
```

Keep `SUPABASE_SECRET_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`.
The older `SUPABASE_SERVICE_ROLE_KEY` variable remains supported for legacy
projects.

## Launch checklist

1. Apply the SQL migrations in `supabase/migrations/` to the production project.
2. Confirm the `artifact-media` storage bucket is public so published images,
   audio, and video can load for visitors.
3. Set every live release to public in the Backroom. Tracks and attached media
   follow the release publication state.
4. Add album or track Spotify links in each release editor.
5. Run `npm run build` with the production environment variables before launch.
6. Visit `/`, `/explore`, `/drift`, `/float`, `/robots.txt`, and `/sitemap.xml`
   while logged out.

## Rollback notes

Local pre-change snapshots live in `.codex-backups/`. The directory is ignored by
Git and should not be deployed.
