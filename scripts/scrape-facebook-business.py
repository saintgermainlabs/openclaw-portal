#!/usr/bin/env python3
"""Stage 1 Facebook scrape → stage 2 gather JSON (local + optional Docmost).

Uses projects/tools/facebook_page_scraper (same family as OpenClaw facebook-scraper skill).
Images/thumbnails stay under data/scraped/{slug}/images/ (temporary).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = Path.home() / "projects" / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))


def kebab(s: str) -> str:
    out = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return out[:64] or f"biz-{int(datetime.now(tz=timezone.utc).timestamp())}"


def page_name_from_url(url: str) -> str:
    u = (url or "").strip().rstrip("/")
    if "facebook.com/" in u:
        return u.split("facebook.com/", 1)[1].split("?", 1)[0].split("/")[0]
    return u.lstrip("/")


def extract_best_description(url: str) -> str | None:
    """Pull Facebook page `best_description.text` (About blurb) from HTML."""
    try:
        from facebook_page_scraper.page_info import PageInfo
    except ImportError:
        return None

    pi = PageInfo(url)
    html = pi.request_handler.fetch_html(pi.url)
    raw = html.html if hasattr(html, "html") else str(html)
    m = re.search(
        r'"best_description"\s*:\s*\{\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"',
        raw,
    )
    if not m:
        return None
    try:
        return json.loads(f'"{m.group(1)}"')
    except json.JSONDecodeError:
        return bytes(m.group(1), "utf-8").decode("unicode_escape", errors="replace")


def main() -> int:
    p = argparse.ArgumentParser(description="Scrape Facebook page business details")
    p.add_argument("--facebook-url", required=True, help="Page URL or username")
    p.add_argument("--business-name", default="", help="Display name override")
    p.add_argument("--slug", default="", help="Staging slug")
    p.add_argument(
        "--out-root",
        default=str(ROOT / "data" / "scraped"),
        help="Local staging root",
    )
    args = p.parse_args()

    try:
        from facebook_page_scraper import FacebookPageScraper
    except ModuleNotFoundError as e:
        print(
            "Missing deps. Install: pip install -r "
            f"{Path.home()}/Downloads/facebook-pages-scraper-master/requirements.txt\n"
            f"Import error: {e}",
            file=sys.stderr,
        )
        return 2

    page = page_name_from_url(args.facebook_url)
    fb = FacebookPageScraper.PageInfo(args.facebook_url)
    if not fb:
        print(json.dumps({"ok": False, "error": "scrape returned empty", "page": page}))
        return 1

    name = args.business_name or fb.get("name") or fb.get("page_name") or page
    slug = args.slug or kebab(str(name))
    out_dir = Path(args.out_root) / slug
    img_dir = out_dir / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    img_dir.mkdir(parents=True, exist_ok=True)

    # Move any local thumbnail paths into our temp media dir (refs only if remote)
    facebook = dict(fb)
    description = extract_best_description(args.facebook_url)
    if description:
        facebook["page_description"] = description
        facebook["about"] = description
    for key in ("profile_pic_local", "cover_photo_local", "profile_pic", "cover_photo"):
        val = facebook.get(key)
        if isinstance(val, str) and val.startswith("http"):
            facebook.setdefault("photos", []).append(
                {"url": val, "local_path": "", "role": key}
            )

    gathered_at = datetime.now(tz=timezone.utc).isoformat()
    record = {
        "slug": slug,
        "business_name": name,
        "gathered_at": gathered_at,
        "sources": ["facebook"],
        "facebook": facebook,
        "tripadvisor": {"rating": None, "review_count": 0, "reviews": []},
        "instagram": {"profile": {}, "photos": []},
        "local_media_root": str(out_dir.relative_to(ROOT))
        if out_dir.is_relative_to(ROOT)
        else str(out_dir),
    }

    (out_dir / "facebook.json").write_text(json.dumps(facebook, indent=2) + "\n")
    (out_dir / "record.json").write_text(json.dumps(record, indent=2) + "\n")

    # Markdown for Docmost scraped_data child page
    md = "\n".join(
        [
            "---",
            f"slug: {slug}",
            "workflow: business-enrichment",
            "stage: 2-gathered",
            f"gathered_at: {gathered_at}",
            f"local_media: {record['local_media_root']}",
            "sources: [facebook]",
            "---",
            "",
            f"# {name}",
            "",
            "JSON record (source of truth for stage 2):",
            "",
            "```json",
            json.dumps(record, indent=2),
            "```",
            "",
        ]
    )
    (out_dir / "scraped_data.md").write_text(md)

    print(
        json.dumps(
            {
                "ok": True,
                "slug": slug,
                "business_name": name,
                "local_dir": str(out_dir),
                "record_path": str(out_dir / "record.json"),
                "docmost_markdown": str(out_dir / "scraped_data.md"),
                "sources": ["facebook"],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
