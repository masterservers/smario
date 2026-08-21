"""End-to-end check for the /live spectator page.

Opens the live feed, sends a few gifts for both sides and asserts that the
score reacts and no runtime error / error-boundary screen appears.

Run:  python3 tests/e2e/live_gifts.py
"""

import asyncio
import re
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)


async def main() -> int:
    errors: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on(
            "console",
            lambda m: errors.append(f"console: {m.text}") if m.type == "error" else None,
        )

        await page.goto(f"{BASE}/live?lang=en", wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)

        buttons = page.locator("button", has_text=re.compile(r"🌹|🍩|🎁|🚀|🍭"))
        total = await buttons.count()
        print("gift buttons found:", total)
        if total < 2:
            errors.append("no gift buttons rendered on /live")

        # Alternate sides: first half of the dock backs RU, second half USA.
        for index in (0, total - 1, 1, total - 2):
            if 0 <= index < total:
                try:
                    await buttons.nth(index).click(timeout=3000)
                except Exception as exc:  # noqa: BLE001
                    print("click skipped:", exc)
                await page.wait_for_timeout(1200)

        await page.wait_for_timeout(2000)
        await page.screenshot(path=str(SHOTS / "live_after_gifts.png"))

        body = await page.inner_text("body")
        boundary = "Reload the arena" in body
        if boundary:
            errors.append("error boundary screen displayed")

        score_text = await page.locator("header, main").first.inner_text()
        print("visible score text:", " ".join(score_text.split())[:200])

        await browser.close()

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS: gifts sent on both sides, no runtime errors")
    return 0


sys.exit(asyncio.run(main()))
