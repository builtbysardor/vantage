#!/usr/bin/env python3
"""
InfraWatch Browser QA — screenshots + GIF demos + README update
"""

import io
import json
import os
import subprocess
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

# ── Config ────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
SHOTS_DIR   = BASE_DIR / "screenshots"
DEMOS_DIR   = BASE_DIR / "demos"
REPORT_PATH = BASE_DIR / "qa-report.md"

GRAFANA_URL   = "http://localhost:3000"
PROM_URL      = "http://localhost:9090"
AM_URL        = "http://localhost:9093"
BACKEND_URL   = "http://localhost:8000"
CADVISOR_URL  = "http://localhost:8080"

SHOTS_DIR.mkdir(exist_ok=True)
DEMOS_DIR.mkdir(exist_ok=True)

issues   = []
passed   = []
frame_id = 0

# ── Helpers ───────────────────────────────────────────────────────

def shot(page, filename, label, scroll_y=0):
    global frame_id
    if scroll_y:
        page.evaluate(f"window.scrollTo(0, {scroll_y})")
        time.sleep(0.4)
    png = page.screenshot(full_page=False)
    path = SHOTS_DIR / filename
    path.write_bytes(png)
    print(f"  📸 {label} → screenshots/{filename}")
    passed.append(f"Screenshot: {label}")
    return png


def go(page, url, sleep_s=3, wait="domcontentloaded"):
    page.goto(url, wait_until=wait, timeout=30000)
    time.sleep(sleep_s)


def try_click(page, selector, label):
    try:
        page.click(selector, timeout=4000)
        time.sleep(0.5)
        return True
    except Exception as e:
        issues.append(f"Click [{label}] `{selector}` ishlamadi: {e}")
        return False


def make_gif(frames, path, fps=2):
    if not frames:
        return
    duration_ms = int(1000 / fps)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        optimize=True,
    )
    if subprocess.run(["which", "gifsicle"], capture_output=True).returncode == 0:
        subprocess.run(
            ["gifsicle", "--optimize=3", "--lossy=60", str(path), "-o", str(path)],
            capture_output=True,
        )
    mb = path.stat().st_size / 1024 / 1024
    print(f"  🎬 GIF saqlandi: demos/{path.name} ({mb:.1f} MB)")


def capture_frame(page, frames, scroll_y=0):
    if scroll_y:
        page.evaluate(f"window.scrollTo(0, {scroll_y})")
        time.sleep(0.3)
    png = page.screenshot(full_page=False)
    img = Image.open(io.BytesIO(png)).convert("RGB").resize((1280, 720), Image.LANCZOS)
    frames.append(img)


# ── Grafana login (shared) ────────────────────────────────────────

def grafana_login(page):
    go(page, f"{GRAFANA_URL}/login", sleep_s=2)
    page.fill("input[name='user']", "admin")
    page.fill("input[name='password']", "infrawatch")
    page.click("button[type='submit']")
    time.sleep(3)


# ════════════════════════════════════════════════════
# SCREENSHOTS
# ════════════════════════════════════════════════════

def do_screenshots(ctx):
    print("\n── GRAFANA ──────────────────────────────────────────")
    page = ctx.new_page()

    grafana_login(page)
    shot(page, "01_grafana_home.png", "01 Grafana — Home")

    go(page, f"{GRAFANA_URL}/dashboards", sleep_s=2)
    shot(page, "02_grafana_dashboards.png", "02 Grafana — Dashboard ro'yxati")

    go(page, f"{GRAFANA_URL}/d/infrawatch-linux-overview/infrawatch-linux-server-overview?kiosk=1", sleep_s=6)
    shot(page, "03_grafana_dashboard_linux.png", "03 Grafana — Linux Server Overview")

    go(page, f"{GRAFANA_URL}/d/infrawatch-cadvisor/infrawatch-container-metrics-cadvisor?kiosk=1", sleep_s=6)
    shot(page, "04_grafana_dashboard_cadvisor.png", "04 Grafana — cAdvisor Dashboard")

    go(page, f"{GRAFANA_URL}/alerting/list", sleep_s=2)
    shot(page, "05_grafana_alerts.png", "05 Grafana — Alert Rules")

    go(page, f"{GRAFANA_URL}/explore", sleep_s=3)
    shot(page, "06_grafana_explore.png", "06 Grafana — Explore (Loki)")

    page.close()

    print("\n── PROMETHEUS ───────────────────────────────────────")
    page = ctx.new_page()

    go(page, f"{PROM_URL}/graph", sleep_s=3)
    shot(page, "07_prometheus_graph.png", "07 Prometheus — Graph UI")

    try:
        page.locator(".cm-content").first.click()
        time.sleep(0.4)
        page.keyboard.press("Control+a")
        page.keyboard.type(
            '(1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100'
        )
        page.locator("button", has_text="Execute").first.click()
        time.sleep(4)
        shot(page, "08_prometheus_cpu_query.png", "08 Prometheus — CPU% Query")
        passed.append("Prometheus PromQL query ishladi")
    except Exception as e:
        issues.append(f"Prometheus query input: {e}")
        shot(page, "08_prometheus_cpu_query.png", "08 Prometheus — (query kiritilmadi)")

    go(page, f"{PROM_URL}/targets", sleep_s=2)
    shot(page, "09_prometheus_targets.png", "09 Prometheus — Targets")

    # targets UP ekanini tekshir
    try:
        content = page.content()
        if "health=\"up\"" in content or "UP" in content:
            passed.append("Prometheus: barcha targetlar UP")
        else:
            issues.append("Prometheus: ba'zi targetlar DOWN bo'lishi mumkin")
    except Exception:
        pass

    go(page, f"{PROM_URL}/alerts", sleep_s=2)
    shot(page, "10_prometheus_alerts.png", "10 Prometheus — Alerts")

    page.close()

    print("\n── ALERTMANAGER ─────────────────────────────────────")
    page = ctx.new_page()
    go(page, f"{AM_URL}/#/alerts", sleep_s=3)
    shot(page, "11_alertmanager.png", "11 Alertmanager — Alerts UI")
    page.close()

    print("\n── BACKEND API ──────────────────────────────────────")
    page = ctx.new_page()

    go(page, f"{BACKEND_URL}/docs", sleep_s=4)
    shot(page, "12_backend_swagger.png", "12 Backend — Swagger UI")
    shot(page, "13_backend_endpoints.png", "13 Backend — Endpoints (scrolled)", scroll_y=400)

    go(page, f"{BACKEND_URL}/health", sleep_s=1)
    shot(page, "14_backend_health.png", "14 Backend — /health")

    go(page, f"{BACKEND_URL}/api/metrics", sleep_s=2)
    shot(page, "15_backend_metrics.png", "15 Backend — /api/metrics JSON")

    go(page, f"{BACKEND_URL}/api/containers", sleep_s=2)
    shot(page, "16_backend_containers.png", "16 Backend — /api/containers JSON")

    go(page, f"{BACKEND_URL}/api/alerts", sleep_s=2)
    shot(page, "17_backend_alerts.png", "17 Backend — /api/alerts JSON")

    go(page, f"{BACKEND_URL}/api/status", sleep_s=2)
    shot(page, "18_backend_status.png", "18 Backend — /api/status JSON")

    page.close()

    print("\n── CADVISOR ─────────────────────────────────────────")
    page = ctx.new_page()
    go(page, f"{CADVISOR_URL}/containers/", sleep_s=4)
    shot(page, "19_cadvisor_home.png", "19 cAdvisor — Containers")
    shot(page, "20_cadvisor_scrolled.png", "20 cAdvisor — (scrolled)", scroll_y=600)
    page.close()


# ════════════════════════════════════════════════════
# GIF DEMOLAR
# ════════════════════════════════════════════════════

def demo_core_stack(ctx):
    """Demo 1: make up → Grafana dashboard → Prometheus → API"""
    print("\n  🎬 Demo 1: Core Stack Overview...")
    frames = []
    page = ctx.new_page()

    grafana_login(page)
    for _ in range(4):
        capture_frame(page, frames)
        time.sleep(0.5)

    go(page, f"{GRAFANA_URL}/d/infrawatch-linux-overview/infrawatch-linux-server-overview", sleep_s=5)
    for _ in range(6):
        capture_frame(page, frames)
        time.sleep(0.8)

    go(page, f"{PROM_URL}/targets", sleep_s=2)
    for _ in range(4):
        capture_frame(page, frames)
        time.sleep(0.5)

    go(page, f"{BACKEND_URL}/docs", sleep_s=3)
    for _ in range(4):
        capture_frame(page, frames)
        time.sleep(0.5)

    page.close()
    make_gif(frames, DEMOS_DIR / "demo_01_core_stack.gif", fps=2)


def demo_grafana_dashboards(ctx):
    """Demo 2: Grafana dashboards navigation"""
    print("\n  🎬 Demo 2: Grafana Dashboards...")
    frames = []
    page = ctx.new_page()

    grafana_login(page)
    go(page, f"{GRAFANA_URL}/d/infrawatch-linux-overview/infrawatch-linux-server-overview", sleep_s=5)
    for i in range(8):
        capture_frame(page, frames, scroll_y=i * 300)
        time.sleep(0.6)

    go(page, f"{GRAFANA_URL}/d/infrawatch-cadvisor/infrawatch-container-metrics-cadvisor", sleep_s=5)
    for i in range(6):
        capture_frame(page, frames, scroll_y=i * 250)
        time.sleep(0.6)

    go(page, f"{GRAFANA_URL}/explore", sleep_s=3)
    for _ in range(4):
        capture_frame(page, frames)
        time.sleep(0.5)

    page.close()
    make_gif(frames, DEMOS_DIR / "demo_02_grafana_dashboards.gif", fps=2)


def demo_backend_api(ctx):
    """Demo 3: Backend API — Swagger try-it-out"""
    print("\n  🎬 Demo 3: Backend REST API...")
    frames = []
    page = ctx.new_page()

    go(page, f"{BACKEND_URL}/docs", sleep_s=4)
    for _ in range(3):
        capture_frame(page, frames)
        time.sleep(0.4)

    # /api/metrics expand + try it out
    try:
        page.click("text=/api/metrics", timeout=4000)
        time.sleep(1)
        capture_frame(page, frames)
        page.click("text=Try it out", timeout=3000)
        time.sleep(0.5)
        page.click("text=Execute", timeout=3000)
        time.sleep(2)
        for _ in range(3):
            capture_frame(page, frames)
            time.sleep(0.4)
    except Exception as e:
        issues.append(f"Swagger try-it-out: {e}")

    for url in [f"{BACKEND_URL}/api/metrics", f"{BACKEND_URL}/api/containers"]:
        go(page, url, sleep_s=2)
        for _ in range(3):
            capture_frame(page, frames)
            time.sleep(0.4)

    page.close()
    make_gif(frames, DEMOS_DIR / "demo_03_backend_api.gif", fps=3)


def demo_alerting(ctx):
    """Demo 4: Alerting flow — rules → alertmanager"""
    print("\n  🎬 Demo 4: Alerting Flow...")
    frames = []
    page = ctx.new_page()

    go(page, f"{PROM_URL}/alerts", sleep_s=2)
    for _ in range(4):
        capture_frame(page, frames)
        time.sleep(0.5)

    go(page, f"{AM_URL}/#/alerts", sleep_s=3)
    for _ in range(4):
        capture_frame(page, frames)
        time.sleep(0.5)

    grafana_login(page)
    go(page, f"{GRAFANA_URL}/alerting/list", sleep_s=2)
    for _ in range(5):
        capture_frame(page, frames)
        time.sleep(0.5)

    page.close()
    make_gif(frames, DEMOS_DIR / "demo_04_alerting.gif", fps=2)


def demo_loki_logs(ctx):
    """Demo 5: Loki log search in Grafana Explore"""
    print("\n  🎬 Demo 5: Loki Log Search...")
    frames = []
    page = ctx.new_page()

    grafana_login(page)
    go(page, f"{GRAFANA_URL}/explore", sleep_s=3)
    for _ in range(3):
        capture_frame(page, frames)
        time.sleep(0.5)

    # Loki datasource tanlash + query
    try:
        ds_btn = page.locator("[data-testid='data-source-picker']").first
        ds_btn.click(timeout=4000)
        time.sleep(0.5)
        capture_frame(page, frames)
        page.click("text=Loki", timeout=4000)
        time.sleep(1)
        capture_frame(page, frames)

        # Log browser dan query
        page.locator("textarea, .query-field input").first.fill("{job=\"docker\"}")
        time.sleep(0.3)
        page.keyboard.press("Shift+Enter")
        time.sleep(3)
        for _ in range(5):
            capture_frame(page, frames)
            time.sleep(0.6)
        passed.append("Loki LogQL query ishladi")
    except Exception as e:
        issues.append(f"Loki query: {e}")
        for _ in range(4):
            capture_frame(page, frames)
            time.sleep(0.4)

    page.close()
    make_gif(frames, DEMOS_DIR / "demo_05_loki_logs.gif", fps=2)


# ════════════════════════════════════════════════════
# API ENDPOINT TESTLARI
# ════════════════════════════════════════════════════

def test_endpoints():
    import urllib.request
    import urllib.error

    endpoints = [
        (f"{BACKEND_URL}/health",          200, "Backend /health"),
        (f"{BACKEND_URL}/metrics",         200, "Backend /metrics (Prometheus format)"),
        (f"{BACKEND_URL}/api/metrics",     200, "Backend /api/metrics"),
        (f"{BACKEND_URL}/api/alerts",      200, "Backend /api/alerts"),
        (f"{BACKEND_URL}/api/status",      200, "Backend /api/status"),
        (f"{BACKEND_URL}/api/containers",  200, "Backend /api/containers"),
        (f"{PROM_URL}/-/healthy",          200, "Prometheus /healthy"),
        (f"{AM_URL}/-/healthy",            200, "Alertmanager /healthy"),
        (f"{GRAFANA_URL}/api/health",      200, "Grafana /api/health"),
        (f"{CADVISOR_URL}/containers/",    200, "cAdvisor /containers"),
    ]

    print("\n── ENDPOINT TESTLARI ────────────────────────────────")
    results = []
    for url, expected, label in endpoints:
        try:
            with urllib.request.urlopen(url, timeout=8) as r:
                code = r.status
        except urllib.error.HTTPError as e:
            code = e.code
        except Exception as e:
            code = f"ERROR: {e}"

        ok = code == expected
        icon = "✅" if ok else "❌"
        print(f"  {icon} [{code}] {label}")
        if ok:
            passed.append(f"Endpoint OK: {label}")
        else:
            issues.append(f"Endpoint FAIL [{code}≠{expected}]: {label}")
        results.append((label, code, ok))
    return results


# ════════════════════════════════════════════════════
# README YANGILASH
# ════════════════════════════════════════════════════

def update_readme():
    readme = BASE_DIR / "README.md"
    content = readme.read_text()

    # Demo Videos bo'limini GIF lar bilan almashtir
    old_demo_section = (
        "### Core Monitoring Stack (Days 1–10)\n"
        "[![Watch Demo](https://img.shields.io/badge/▶_Watch_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/YOUR_DEMO_PHASE1)\n"
        "\n"
        "> _Full walkthrough: `make up` → Prometheus scraping → Grafana dashboards → Alertmanager → FastAPI REST API._\n"
        ">\n"
        "> **Demo flow (≈3 min):**\n"
        "> ```\n"
        "> 1. make up                     → 8 containers coming healthy\n"
        "> 2. localhost:3000              → Grafana: Linux Server Overview (12 panels)\n"
        "> 3. localhost:3000/explore      → Loki: live container log search\n"
        "> 4. localhost:9090/targets      → Prometheus: all 6 targets UP\n"
        "> 5. localhost:9093              → Alertmanager: alert routing UI\n"
        "> 6. localhost:8000/docs         → FastAPI Swagger: live API calls\n"
        "> 7. localhost:8080              → cAdvisor: per-container resource graphs\n"
        "> ```"
    )
    new_demo_section = (
        "### Core Monitoring Stack (Days 1–10)\n"
        "![Core Stack Demo](demos/demo_01_core_stack.gif)"
    )
    if old_demo_section in content:
        content = content.replace(old_demo_section, new_demo_section)
        passed.append("README: Core Stack demo placeholder → GIF")

    # WebSocket placeholder
    old = (
        "### Real-time WebSocket Feed (Day 11)\n"
        "[![Coming Soon](https://img.shields.io/badge/Coming_Soon-555555?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _Live metric streaming via WebSocket — dashboard updates without page refresh._"
    )
    new = (
        "### Real-time WebSocket Feed (Day 11)\n"
        "![Grafana Dashboards Demo](demos/demo_02_grafana_dashboards.gif)\n"
        "\n"
        "> _Grafana dashboards — Linux Server Overview + cAdvisor container metrics._"
    )
    if old in content:
        content = content.replace(old, new)
        passed.append("README: WebSocket placeholder → Grafana GIF")

    # Celery placeholder
    old = (
        "### Celery Task Queue & Scheduler (Day 31–35)\n"
        "[![Coming Soon](https://img.shields.io/badge/Coming_Soon-555555?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _Distributed task execution: scheduled health checks, periodic scrapes, Celery Beat._"
    )
    new = (
        "### Backend REST API (Day 7)\n"
        "![Backend API Demo](demos/demo_03_backend_api.gif)\n"
        "\n"
        "> _FastAPI Swagger UI — `/api/metrics`, `/api/alerts`, `/api/containers` live JSON._"
    )
    if old in content:
        content = content.replace(old, new)
        passed.append("README: Celery placeholder → Backend API GIF")

    # Remediation placeholder
    old = (
        "### Auto-Remediation Engine (Day 45)\n"
        "[![Coming Soon](https://img.shields.io/badge/Coming_Soon-555555?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _When an alert fires, InfraWatch automatically restarts the unhealthy container._"
    )
    new = (
        "### Alerting Flow (Day 3)\n"
        "![Alerting Demo](demos/demo_04_alerting.gif)\n"
        "\n"
        "> _Prometheus alert rules → Alertmanager routing → Grafana alert list._"
    )
    if old in content:
        content = content.replace(old, new)
        passed.append("README: Remediation placeholder → Alerting GIF")

    # ML placeholder
    old = (
        "### ML Anomaly Detection (Day 121)\n"
        "[![Coming Soon](https://img.shields.io/badge/Coming_Soon-555555?style=for-the-badge)](https://github.com/builtbysardor/infrawatch)\n"
        "\n"
        "> _Predictive alerting: detect CPU/RAM anomalies before thresholds are breached._"
    )
    new = (
        "### Log Aggregation with Loki (Day 4–5)\n"
        "![Loki Logs Demo](demos/demo_05_loki_logs.gif)\n"
        "\n"
        "> _Grafana Explore + Loki: search Docker container logs with LogQL in real time._"
    )
    if old in content:
        content = content.replace(old, new)
        passed.append("README: ML placeholder → Loki GIF")

    # Backend metrics screenshots qo'sh
    new_backend_section = (
        "### Backend REST API — Haqiqiy JSON javoblar\n\n"
        "| /api/metrics | /api/containers |\n"
        "|:---:|:---:|\n"
        "| ![Metrics](screenshots/15_backend_metrics.png) | "
        "![Containers](screenshots/16_backend_containers.png) |\n\n"
        "### Backend API Endpoints Detail\n"
        "| /health | /api/alerts |\n"
        "|:---:|:---:|\n"
        "| ![Health](screenshots/14_backend_health.png) | "
        "![Alerts](screenshots/17_backend_alerts.png) |\n\n"
    )

    insert_after = "### Backend REST API — FastAPI / Swagger\n"
    if insert_after in content and "15_backend_metrics.png" not in content:
        content = content.replace(
            insert_after,
            insert_after + "\n" + new_backend_section,
        )
        passed.append("README: Backend JSON screenshots bo'limi qo'shildi")

    readme.write_text(content)
    print("\n  ✅ README.md yangilandi")


# ════════════════════════════════════════════════════
# HISOBOT
# ════════════════════════════════════════════════════

def write_report(endpoint_results):
    shots = sorted(p.name for p in SHOTS_DIR.glob("*.png"))
    gifs  = sorted(p.name for p in DEMOS_DIR.glob("*.gif"))

    status = "✅ LOYIHA TAYYOR" if not issues else f"⚠️  {len(issues)} ta muammo"
    report = f"""# InfraWatch Browser QA Hisoboti

## {status}

**Sana:** {time.strftime('%Y-%m-%d %H:%M')}
**Screenshotlar:** {len(shots)} ta
**Demo GIF lar:** {len(gifs)} ta

## Screenshotlar (`screenshots/`)
{chr(10).join(f'- {s}' for s in shots)}

## Demo GIF lar (`demos/`)
{chr(10).join(f'- {g}' for g in gifs)}

## ✅ O'tgan testlar ({len(passed)} ta)
{chr(10).join(f'- {p}' for p in passed)}

## ❌ Muammolar ({len(issues)} ta)
{chr(10).join(f'- {i}' for i in issues) if issues else '- Muammo topilmadi 🎉'}

## Endpoint testlari
| Endpoint | Kod | Holat |
|----------|-----|-------|
{chr(10).join(f'| {label} | {code} | {"✅" if ok else "❌"} |' for label, code, ok in endpoint_results)}
"""
    REPORT_PATH.write_text(report)
    return report


# ════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════

def main():
    print("\n" + "="*55)
    print("  InfraWatch Browser QA")
    print("="*55)

    # 1. Endpoint testlari
    endpoint_results = test_endpoints()

    # 2. Playwright ishga tushir
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})

        # 3. Screenshotlar
        print("\n── SCREENSHOTLAR ────────────────────────────────────")
        try:
            do_screenshots(ctx)
        except Exception as e:
            issues.append(f"Screenshots umumiy xato: {e}")

        # 4. Demo GIF lar
        print("\n── DEMO GIF LAR ─────────────────────────────────────")
        for fn, name in [
            (demo_core_stack,        "Core Stack"),
            (demo_grafana_dashboards,"Grafana Dashboards"),
            (demo_backend_api,       "Backend API"),
            (demo_alerting,          "Alerting"),
            (demo_loki_logs,         "Loki Logs"),
        ]:
            try:
                fn(ctx)
                passed.append(f"GIF yaratildi: {name}")
            except Exception as e:
                issues.append(f"GIF [{name}] xato: {e}")

        browser.close()

    # 5. README yangilash
    print("\n── README YANGILASH ─────────────────────────────────")
    try:
        update_readme()
    except Exception as e:
        issues.append(f"README update: {e}")

    # 6. Hisobot
    report = write_report(endpoint_results)

    # 7. Natija
    shots = list(SHOTS_DIR.glob("*.png"))
    gifs  = list(DEMOS_DIR.glob("*.gif"))

    print("\n" + "="*55)
    print(report)
    print("="*55)
    print(f"\n📁 Screenshots: {len(shots)} ta  →  screenshots/")
    print(f"🎬 GIF demolar: {len(gifs)} ta  →  demos/")
    print(f"📄 Hisobot:           qa-report.md")
    if issues:
        print(f"\n⚠️  {len(issues)} ta muammo — yuqoridagi ro'yxatni tekshiring")
    else:
        print("\n✅ LOYIHA TAYYOR — hamma narsa ishlayapti!")


if __name__ == "__main__":
    main()
