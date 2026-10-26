# Shrink

A Next.js app that resizes and compresses large images in the browser, with an optional Supabase library for saving results. Built to deploy on Vercel.

## How it works

- Compression runs client side with the canvas API (`src/lib/compress.ts`). Originals are never uploaded.
- Output formats: WebP, JPEG, PNG, or the same as the input. You can cap the longest edge and pick a quality level or a target file size (binary search on quality).
- Pressing Save calls `POST /api/uploads`, which records the image in the `compressions` table and returns a signed upload URL. The browser then uploads straight to Supabase Storage, so files never pass through a Vercel function and its 4.5 MB request limit does not apply.
- `/library` lists saved images through `GET /api/library`, which returns signed download links that expire after one hour.
- The library is scoped by an anonymous id stored in `localStorage`. There are no accounts. Anyone with that id can see its images, so add Supabase Auth before storing anything sensitive.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in values, or leave empty to run without the library
npm run dev
```

Without Supabase keys the compressor and downloads still work. The Save button is hidden and the library page explains how to turn it on.

## Supabase setup

1. Create a project at supabase.com.
2. Run `supabase/migrations/20261026000000_create_compressions.sql` in the SQL editor, or `supabase db push` with the CLI. It creates the `compressions` table (RLS on, no public policies) and a private `compressed-images` storage bucket.
3. Copy the project URL, anon key and service role key from Project Settings > API into `.env.local`.

The service role key is only read on the server (`src/lib/supabase-server.ts`). The anon key is used in the browser only to upload with a signed URL issued by the server.

## Deploy to Vercel

1. Import the repository in Vercel. The framework preset is detected as Next.js.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` under Settings > Environment Variables.
3. Deploy.

## Images

The illustrations in `public/illustrations` are custom SVGs drawn for this project. Swap them for your own photography by replacing the files or the paths in `src/app/page.tsx`.
