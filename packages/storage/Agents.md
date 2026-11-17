# @devflow/storage

File storage on an S3-compatible service (Cloudflare R2), using the AWS SDK. It creates signed upload and download links and deletes files. The browser uploads straight to the storage service, and the API only signs the link.

**Must not:** decide who may upload or read a file. The API checks permissions first, then asks this package for a link. It must not load `.env` files either.

## Commands

```
pnpm --filter @devflow/storage run lint
pnpm --filter @devflow/storage run check-types
pnpm --filter @devflow/storage run format
```

## Folder map

- `src/client.ts`: the S3 client, the two bucket names and the public URL.
- `src/storage.helpers.ts`: `createUploadTarget`, `generatePresignedDownloadUrl`, `deleteFile`, `keyFromUrl`, `isPublicUrlIn`.
- `src/index.ts`: re-exports them.

## How files are stored

- Two buckets: a **private** one for attachments, and a **public** one for avatars and logos.
- A file key starts with its folder: `attachments/`, `avatars/` or `logos/`. The key alone tells which bucket it is in.
- Public files store their **URL**. Private files store the **key**, and a fresh signed link is made every time the file is read.

## Rules

- An upload link is a signed `PUT`: it names one key, one content type and one size, and it expires.
- Avatars and logos accept png, jpeg and webp, up to 2 MB. Attachment types and the 10 MB limit are enforced by the API's validators before a link is made.
- Download links for the file list last 1 hour. The Download button asks for a fresh 5-minute link.
- The download file name is cleaned before it goes into the response header.
- A deleted attachment, issue or project does not remove its file by itself. Deletes go through the file-cleanup queue, and a worker calls `deleteFile`.
- A file that was uploaded but never saved stays in the bucket. Cleaning those up is a planned job.

## Env variables it reads

`STORAGE_ENDPOINT`, `STORAGE_REGION` (default `auto`), `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET_PRIVATE`, `STORAGE_BUCKET_PUBLIC`, `STORAGE_PUBLIC_URL`, `STORAGE_FORCE_PATH_STYLE` (default `false`). The public URL is required: the client fails at start-up without it.

## Links

The browser needs a CORS rule on both buckets, listed in `DEPLOY.md`. Shared rules: the root `AGENTS.md`.