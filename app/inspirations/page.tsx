import Link from "next/link"
import { listInspirations } from "./actions"

const buildBookmarkletHref = () => {
  const js = `
(() => {
  const pinAnchors = Array.from(document.querySelectorAll('a[href*="/pin/"]'));
  const uniq = new Map();
  for (const a of pinAnchors) {
    const href = a.href;
    const img = a.querySelector('img');
    const src = img?.currentSrc || img?.src || '';
    if (!src) continue;
    const key = href + '|' + src;
    if (!uniq.has(key)) uniq.set(key, { sourceUrl: href, imageUrl: src, title: (img?.alt || '').slice(0, 180) });
  }

  const items = Array.from(uniq.values()).slice(0, 50);
  if (items.length === 0) { alert('No pins found. Scroll the board so pins are visible, then try again.'); return; }

  fetch('/api/inspirations/capture', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items })
  })
    .then(r => r.json())
    .then(data => {
      if (!data?.ok) throw new Error(data?.error || 'Import failed');
      alert('Imported ' + data.imported + ' inspirations (' + data.failed + ' failed).');
    })
    .catch(err => alert(String(err?.message || err)));
})();
  `.trim()

  return `javascript:${encodeURIComponent(js)}`
}

export default async function InspirationsPage() {
  const result = await listInspirations({ limit: 60 })

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inspiration Library</h1>
          <p className="text-sm text-neutral-600">
            Capture Pinterest inspiration in one click, then use it as style-only reference in your character workflow.
          </p>
        </div>

        <Link
          href="/characters"
          className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50"
        >
          Back to Characters
        </Link>
      </div>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold">Pinterest capture bookmarklet</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Drag this link to your bookmarks bar. Then open a Pinterest board, scroll until pins are visible, and click the
          bookmarklet. You must be signed in to this app in the same browser.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={buildBookmarkletHref()}
            className="inline-flex w-full items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 sm:w-auto"
            aria-label="Pinterest Capture bookmarklet"
          >
            Capture visible pins
          </a>

          <p className="text-xs text-neutral-500">
            Tip: scroll more, then click again to capture more pins. Captures up to 50 per click.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent inspirations</h2>
          <p className="text-xs text-neutral-500">Private to your account (Supabase RLS).</p>
        </div>

        {!result.ok ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{result.error}</div>
        ) : result.inspirations.length === 0 ? (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700">
            No inspirations yet. Use the bookmarklet above to import some.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.inspirations.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <div className="aspect-[4/3] w-full bg-neutral-100">
                  {item.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.public_url} alt={item.title ?? "Inspiration"} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-sm font-semibold">{item.title || "Untitled"}</h3>
                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                        aria-label="Open source pin"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                  <p className="text-xs text-neutral-500">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

