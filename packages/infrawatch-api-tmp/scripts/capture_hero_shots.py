#!/usr/bin/env python3
"""Hero screenshot capture for README demo section."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent.parent
SHOTS_DIR = BASE_DIR / "screenshots"
SHOTS_DIR.mkdir(exist_ok=True)


def shot(page, name, scroll=0):
    if scroll:
        page.evaluate(f"window.scrollTo(0, {scroll})")
        time.sleep(0.4)
    out = SHOTS_DIR / name
    page.screenshot(path=str(out), full_page=False)
    kb = out.stat().st_size / 1024
    print(f"  📸 {name}  ({kb:.0f} KB)")


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = b.new_context(viewport={"width": 1600, "height": 1000},
                            device_scale_factor=1)

        # 1. Backend Command Center (flagship dashboard)
        print("\n── Backend Command Center ────────────────────────")
        page = ctx.new_page()
        page.goto("http://localhost:8000/dashboard", wait_until="networkidle", timeout=20000)
        time.sleep(6)  # let SVG gauges + sparklines render
        shot(page, "00_hero_command_center.png")
        # also a scrolled-down view to show the lower panels
        shot(page, "00_hero_command_center_scrolled.png", scroll=500)
        page.close()

        # 2. Grafana Linux Dashboard (full kiosk)
        print("\n── Grafana Linux Dashboard ───────────────────────")
        page = ctx.new_page()
        page.goto("http://localhost:3000/login", wait_until="domcontentloaded")
        time.sleep(2)
        try:
            page.fill("input[name='user']", "admin")
            page.fill("input[name='password']", "infrawatch")
            page.click("button[type='submit']")
            time.sleep(3)
        except Exception:
            pass
        page.goto(
            "http://localhost:3000/d/infrawatch-linux-overview/"
            "infrawatch-linux-server-overview?kiosk=1&from=now-15m&to=now",
            wait_until="networkidle", timeout=20000)
        time.sleep(8)  # let panels render
        shot(page, "00_hero_grafana_linux.png")

        # 3. Grafana cAdvisor Dashboard
        print("\n── Grafana cAdvisor Dashboard ────────────────────")
        page.goto(
            "http://localhost:3000/d/infrawatch-cadvisor/"
            "infrawatch-container-metrics-cadvisor?kiosk=1",
            wait_until="networkidle", timeout=20000)
        time.sleep(8)
        shot(page, "00_hero_grafana_cadvisor.png")
        page.close()

        b.close()
    print("\n✅ Done")


if __name__ == "__main__":
    main()
