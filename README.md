# Comic Book Generator

Next.js app that turns a premise into a comic script, generates panel images, and exports a PDF.

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local — at minimum set OPENAI_API_KEY
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Copy values from [`.env.example`](.env.example) into `.env.local`. Never commit real keys.

### OpenAI (script + images)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for AI script and panel images. Without it, the app uses a fallback script and placeholder images. |
| `OPENAI_TEXT_MODEL` | Chat model for the comic script (default: `gpt-4.1-mini`). |
| `OPENAI_VISION_MODEL` | Vision model when you attach reference images (default: `gpt-4o-mini`). |
| `OPENAI_IMAGE_MODEL` | Image model for panels and character sheets (default: `dall-e-3`). GPT Image models (e.g. `gpt-image-1.5`) are supported. |
| `IMAGE_PROVIDER_ORDER` | Optional comma-separated provider fallback order for images (default: `openai,together`). |
| `TOGETHER_API_KEY` | Optional. If set and `IMAGE_PROVIDER_ORDER` includes `together`, the app can fall back to Together image generation. |
| `TOGETHER_IMAGE_MODEL` | Together image model id (default: `black-forest-labs/FLUX.1-schnell-Free`). |
| `TOGETHER_IMAGE_STEPS` | Together generation steps (default: `20`, clamped to 1–50). |

### Panel images: size, retries, and rate limits

| Variable | Purpose |
|----------|---------|
| `OPENAI_IMAGE_SIZE` | **DALL·E 3:** `1024x1024` \| `1792x1024` \| `1024x1792`. If unset, the app **defaults DALL·E 3 to `1792x1024`** (wide frames suit comic layouts). **GPT Image:** `auto` \| `1024x1024` \| `1536x1024` \| `1024x1536`. |
| `OPENAI_IMAGE_MAX_RETRIES` | Retries per panel request with backoff (default: `4`, max `8`). Helps when later panels hit rate limits or timeouts. |
| `OPENAI_IMAGE_RETRY_BASE_MS` | Base delay for backoff in ms (default: `900`). |
| `NEXT_PUBLIC_OPENAI_IMAGE_STAGGER_MS` | Pause between **sequential** panel requests in the UI (default: `450`). Set `0` to disable. Reduces OpenAI **429** bursts. |
| `OPENAI_IMAGE_BATCH_STAGGER_MS` | Pause between **batches** when generating all panels at once (default: `0`). Try `600`–`1200` if bulk runs still rate-limit. |
| `OPENAI_IMAGE_CONCURRENCY` | Concurrent panel jobs in bulk mode (default: `3`, clamped to `1`–`3`). |

Prompts include **framing** instructions (keep heads/faces inside the frame). Panel previews use **`object-contain`** so the browser does not crop generated art like `object-cover` would.

### Character Library (Supabase)

Character sheets and library data use Supabase (database + storage + auth).

1. Apply SQL in [`supabase/migrations/`](supabase/migrations/) (see [`supabase/README.md`](supabase/README.md)).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. For magic link sign-in and server actions, configure **Auth URL** settings and set:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin (e.g. `http://localhost:3000`). Must match **Site URL** / **Redirect URLs** in the Supabase dashboard so magic links return to the right place. |

Details: [Supabase setup & auth](supabase/README.md).

### Optional debugging

| Variable | Purpose |
|----------|---------|
| `OPENAI_IMAGE_PROMPT_DISTILL` | Distill very long panel prompts before image generation (`true` / `false`). |
| `PROMPT_DEBUG` | Log when image prompts are clipped to fit the model budget. |
| `NEXT_PUBLIC_LAYOUT_REVIEW_ENABLED` | Enable in-app layout review (dev). |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |

## Learn more

- [Panel template (high-quality storytelling)](docs/panels-template.md)
- [Next.js Documentation](https://nextjs.org/docs)
