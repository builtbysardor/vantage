#!/usr/bin/env python3
"""
Record demo_04_alerting.gif and demo_05_loki_logs.gif + patch README.
"""
import io, subprocess, time
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

BASE_DIR   = Path(__file__).parent.parent
DEMOS_DIR  = BASE_DIR / "demos"
README     = BASE_DIR / "README.md"

GRAFANA_URL = "http://localhost:3000"
PROM_URL    = "http://localhost:9090"
AM_URL      = "http://localhost:9093"


def go(page, url, sleep_s=3):
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(sleep_s)


def frame(page, frames, scroll_y=0):
    if scroll_y:
        page.evaluate(f"window.scrollTo(0, {scroll_y})")
        time.sleep(0.3)
    png = page.screenshot(full_page=False)
    img = Image.open(io.BytesIO(png)).convert("RGB").resize((1280, 720), Image.LANCZOS)
    frames.append(img)


def save_gif(frames, path, fps=2):
    if not frames:
        print(f"  ⚠ No frames for {path.name}")
        return
    ms = int(1000 / fps)
    frames[0].save(path, save_all=True, append_images=frames[1:],
                   duration=ms, loop=0, optimize=True)
    if subprocess.run(["which", "gifsicle"], capture_output=True).returncode == 0:
        subprocess.run(["gifsicle", "--optimize=3", "--lossy=60",
                        str(path), "-o", str(path)], capture_output=True)
    mb = path.stat().st_size / 1024 / 1024
    print(f"  ✅ {path.name}  ({mb:.1f} MB,  {len(frames)} frames)")


def grafana_login(page):
    go(page, f"{GRAFANA_URL}/login", sleep_s=2)
    # If already logged in Grafana redirects away from /login
    if "login" not in page.url:
        return
    try:
        page.fill("input[name='user']", "admin", timeout=5000)
        page.fill("input[name='password']", "infrawatch")
        page.click("button[type='submit']")
        time.sleep(3)
    except Exception:
        pass  # already logged in


# ── Demo 4: Alerting ──────────────────────────────────────────────
def demo_alerting(ctx):
    print("\n🎬  Demo 4: Alerting flow (Prometheus → Alertmanager → Grafana)...")
    frames = []
    page = ctx.new_page()

    # Prometheus alert rules
    go(page, f"{PROM_URL}/alerts", sleep_s=3)
    for _ in range(5):
        frame(page, frames)
        time.sleep(0.6)

    # Alertmanager
    go(page, f"{AM_URL}/#/alerts", sleep_s=3)
    for _ in range(5):
        frame(page, frames)
        time.sleep(0.6)

    # scroll down in Alertmanager
    for scroll in [200, 400, 0]:
        frame(page, frames, scroll_y=scroll)
        time.sleep(0.5)

    # Grafana alert rules
    grafana_login(page)
    go(page, f"{GRAFANA_URL}/alerting/list", sleep_s=3)
    for _ in range(6):
        frame(page, frames)
        time.sleep(0.6)

    # Grafana contact points
    try:
        go(page, f"{GRAFANA_URL}/alerting/notifications", sleep_s=2)
        for _ in range(4):
            frame(page, frames)
            time.sleep(0.5)
    except Exception:
        pass

    page.close()
    save_gif(frames, DEMOS_DIR / "demo_04_alerting.gif", fps=2)


# ── Demo 5: Loki Logs ─────────────────────────────────────────────
LOKI_UID = "P8E80F9AEF21F6940"

def demo_loki_logs(ctx):
    print("\n🎬  Demo 5: Loki log aggregation in Grafana Explore...")
    frames = []
    page = ctx.new_page()

    grafana_login(page)

    # Navigate directly to Explore with Loki datasource pre-selected
    import urllib.parse
    left = urllib.parse.quote('{"datasource":"' + LOKI_UID + '","queries":[{"refId":"A","expr":"{job=\\"docker\\"}","queryType":"range"}],"range":{"from":"now-1h","to":"now"}}')
    explore_url = f"{GRAFANA_URL}/explore?orgId=1&left={left}"
    go(page, explore_url, sleep_s=6)
    for _ in range(4):
        frame(page, frames)
        time.sleep(0.7)

    # Run the query via keyboard shortcut (Shift+Enter on the query editor)
    ran = False
    for sel in [".cm-content", "textarea", ".query-editor-row textarea"]:
        try:
            el = page.locator(sel).first
            el.click(timeout=3000)
            time.sleep(0.3)
            page.keyboard.press("Shift+Enter")
            time.sleep(5)
            ran = True
            break
        except Exception:
            continue

    if not ran:
        # Try clicking the Run Query button
        try:
            page.locator("button", has_text="Run query").first.click(timeout=4000)
            time.sleep(5)
        except Exception:
            pass

    # Capture results
    for _ in range(6):
        frame(page, frames)
        time.sleep(0.8)

    # Scroll down to show log lines
    for scroll in [300, 600, 900, 600, 300, 0]:
        frame(page, frames, scroll_y=scroll)
        time.sleep(0.4)

    # Try expanding a log line
    try:
        page.locator(".log-row-message, .logs-row__message").first.click(timeout=3000)
        time.sleep(1)
        for _ in range(3):
            frame(page, frames)
            time.sleep(0.5)
    except Exception:
        pass

    page.close()
    save_gif(frames, DEMOS_DIR / "demo_05_loki_logs.gif", fps=2)


# ── README patches ────────────────────────────────────────────────
def patch_readme():
    print("\n📝  Patching README.md...")
    content = README.read_text()
    original = content

    # 1. Progress badge: Day 150 → Day 180
    content = content.replace(
        "Progress-Day_150_of_180",
        "Progress-Day_180_of_180"
    )

    # 2. WebSocket "Coming Soon" → Complete badge
    content = content.replace(
        "### Real-time WebSocket Feed (Day 11)\n"
        "[![Coming Soon](https://img.shields.io/badge/Coming_Soon-555555?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _Live metric streaming via WebSocket — dashboard updates without page refresh._",

        "### Real-time WebSocket Feed (Day 11)\n"
        "[![Complete](https://img.shields.io/badge/WebSocket_Streaming-Complete-3fb950?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _Live metric streaming via WebSocket — dashboard updates without page refresh._"
    )

    # 3. Celery "Coming Soon" → Complete badge
    content = content.replace(
        "[![Coming Soon](https://img.shields.io/badge/Coming_Soon-555555?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _Distributed task execution: scheduled health checks, periodic scrapes, Celery Beat._",

        "[![Complete](https://img.shields.io/badge/Celery_Task_Queue-Complete-3fb950?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _Distributed task execution: scheduled health checks, periodic scrapes, Celery Beat._"
    )

    # 4. Auto-Remediation "Coming Soon" → Complete badge
    content = content.replace(
        "[![Coming Soon](https://img.shields.io/badge/Coming_Soon-555555?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _When an alert fires, InfraWatch automatically restarts the unhealthy container._",

        "[![Complete](https://img.shields.io/badge/Auto_Remediation-Complete-3fb950?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _When an alert fires, InfraWatch automatically restarts the unhealthy container._"
    )

    if content != original:
        README.write_text(content)
        print("  ✅ README.md updated")
        # Show what changed
        for old, new in [
            ("Day_150_of_180", "Day_180_of_180"),
            ("Coming_Soon", "Complete"),
        ]:
            count = original.count(old)
            if count:
                print(f"     replaced {count}x: '{old}' → '{new}'")
    else:
        print("  ℹ  README unchanged (already up to date)")


# ── Main ──────────────────────────────────────────────────────────
def main():
    print("=" * 55)
    print("  InfraWatch — Missing GIFs Recorder")
    print("=" * 55)

    DEMOS_DIR.mkdir(exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})

        demo_alerting(ctx)
        demo_loki_logs(ctx)

        browser.close()

    patch_readme()

    # Summary
    print("\n" + "=" * 55)
    for gif in sorted(DEMOS_DIR.glob("*.gif")):
        mb = gif.stat().st_size / 1024 / 1024
        tag = "⚠ placeholder" if mb < 0.1 else "✅"
        print(f"  {tag}  {gif.name:40s}  {mb:.1f} MB")
    print("=" * 55)


if __name__ == "__main__":
    main()
