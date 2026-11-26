# scraped_data (Docmost staging)

Parent page for **stage 2** gathered scrape records. One child page per business `slug`.

## Stage flow

1. **Facebook** via OpenClaw `facebook-scraper` skill → runner `scripts/scrape-facebook-business.py` (`~/projects/tools/facebook_page_scraper`)
2. Tripadvisor (stub) → reviews JSON
3. Instagram (stub) → photo URLs + local files
4. Assemble one JSON record → child page under this catalog

## Rules

- Interchange format: **JSON objects** (Facebook / Tripadvisor / Instagram merged).
- Images: **local only** under `data/scraped/{slug}/images/` — temporary; JSON stores `url` + `local_path`.
- Do not invent fields the scrapers did not return; omit or null.
- Supabase export comes later from these pages.

## Local run (Facebook only)

```bash
python3 scripts/scrape-facebook-business.py \
  --facebook-url 'https://www.facebook.com/PAGE' \
  --business-name 'Business Name'
# writes data/scraped/{slug}/record.json + scraped_data.md
```

## Record shape

```json
{
  "slug": "example-cafe",
  "business_name": "Example Cafe",
  "gathered_at": "2026-08-08T22:00:00Z",
  "sources": ["facebook", "tripadvisor", "instagram"],
  "facebook": {},
  "tripadvisor": { "rating": null, "review_count": 0, "reviews": [] },
  "instagram": { "profile": {}, "photos": [{ "url": "", "local_path": "" }] },
  "local_media_root": "data/scraped/example-cafe/"
}
```

## Child pages

| slug | gathered_at | sources | local_media |
|------|-------------|---------|-------------|
| *(none yet)* | | | |
