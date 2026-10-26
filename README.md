# Shrink

A Next.js app that resizes and compresses large images in the browser, with an optional Supabase library for saving results. Built to deploy on Vercel.

## How it works

- Compression runs client side with the canvas API (`src/lib/compress.ts`). Originals are never uploaded.
- Output formats: WebP, JPEG, PNG, or the same as the input. You can cap the longest edge and pick a quality level or a target file size (binary search on quality).
- Pressing Save calls `POST /api/uploads`, which records the image in the `compressions` table and returns a signed upload URL. The browser then uploads straight to Supabase Storage, so files never pass through a Vercel function and its 4.5 MB request limit does not apply.
- `/library` lists saved images through `GET /api/library`, which returns signed download links that expire after one hour.
- People can use the app without an account. Their saved images are tied to an anonymous id stored in `localStorage`. Signed-in people (email and password through Supabase Auth) see the images saved to their account on any device.

## Dashboard

`/admin` is for accounts with the `admin` role. It has four tabs:

- **Overview**: totals for images, data saved and users, a daily activity chart for 7, 30 or 90 days, a format breakdown and the newest accounts.
- **Users**: search and filter accounts, make or remove admins, suspend or reactivate (this bans the Supabase Auth user and blocks saving), delete an account with all of its images, and send email invites.
- **Content**: browse every saved image with filters for file name, format and owner, open or delete any of them.
- **Settings**: turn saving on or off, set the largest saved file, set a retention period, and delete old images on demand.

Access is checked in three places: the middleware sends signed-out visitors to `/login`, the admin layout checks the role on the server, and every server action checks it again. Admins can not demote, suspend or delete their own account, so there is always at least one admin left.

### Making the first admin

Create an account at `/login`, then run this in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

After that, promote other people from the Users tab.

### Retention

When a retention period is set, Vercel Cron calls `/api/cron/purge` once a day (see `vercel.json`) and deletes older images. Set `CRON_SECRET` in Vercel for this to run.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in values, or leave empty to run without the library
npm run dev
```

Without Supabase keys the compressor and downloads still work. The Save button is hidden and the library page explains how to turn it on.

## Supabase setup

1. Create a project at supabase.com.
2. Run both files in `supabase/migrations/` in order in the SQL editor, or `supabase db push` with the CLI. They create the `compressions`, `profiles` and `app_settings` tables (RLS on everywhere), a private `compressed-images` storage bucket, a trigger that creates a profile for each new user, and the `admin_stats` function used by the dashboard.
3. Copy the project URL, anon key and service role key from Project Settings > API into `.env.local`.
4. Under Authentication > URL Configuration, set the Site URL to your Vercel domain so confirmation and invite emails link back to the app.

The service role key is only read on the server (`src/lib/supabase-server.ts`). The anon key is used in the browser only to upload with a signed URL issued by the server.

## Deploy to Vercel

1. Import the repository in Vercel. The framework preset is detected as Next.js.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` under Settings > Environment Variables.
3. Deploy.

## Images

The illustrations in `public/illustrations` are custom SVGs drawn for this project. Swap them for your own photography by replacing the files or the paths in `src/app/page.tsx`.
