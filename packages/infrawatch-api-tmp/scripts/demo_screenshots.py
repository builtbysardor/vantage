#!/usr/bin/env python3.10
"""
InfraWatch demo screenshot script.
Takes screenshots of every major page in the monitoring stack.
"""

import time
import os
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = "/home/mrit/Downloads/infrawatch/screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


def shot(page, path, description, scroll_y=0):
    if scroll_y:
        page.evaluate(f"window.scrollTo(0, {scroll_y})")
        time.sleep(0.5)
    page.screenshot(path=path, full_page=True)
    print(f"  ✓ {description}")


def go(page, url, sleep=3):
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(sleep)


def grafana_screenshots(page):
    # Login
    go(page, "http://localhost:3000/login", sleep=2)
    page.fill("input[name='user']", "admin")
    page.fill("input[name='password']", "infrawatch")
    page.click("button[type='submit']")
    time.sleep(4)
    shot(page, f"{SCREENSHOTS_DIR}/01_grafana_home.png", "01 Grafana Home")

    # Dashboards list
    go(page, "http://localhost:3000/dashboards", sleep=2)
    shot(page, f"{SCREENSHOTS_DIR}/02_grafana_dashboards.png", "02 Grafana Dashboard List")

    # Open first dashboard
    links = page.locator("a[href*='/d/']").all()
    if links:
        href = links[0].get_attribute("href")
        go(page, f"http://localhost:3000{href}", sleep=5)
        shot(page, f"{SCREENSHOTS_DIR}/03_grafana_dashboard1.png", "03 Grafana Dashboard 1")

    if len(links) > 1:
        href = links[1].get_attribute("href")
        go(page, f"http://localhost:3000{href}", sleep=5)
        shot(page, f"{SCREENSHOTS_DIR}/04_grafana_dashboard2.png", "04 Grafana Dashboard 2")

    # Alerting
    go(page, "http://localhost:3000/alerting/list", sleep=2)
    shot(page, f"{SCREENSHOTS_DIR}/05_grafana_alerts.png", "05 Grafana Alerting")

    # Explore
    go(page, "http://localhost:3000/explore", sleep=3)
    shot(page, f"{SCREENSHOTS_DIR}/06_grafana_explore.png", "06 Grafana Explore")


def prometheus_screenshots(page):
    go(page, "http://localhost:9090/graph", sleep=4)
    shot(page, f"{SCREENSHOTS_DIR}/07_prometheus_graph.png", "07 Prometheus Graph UI")

    # Type a query
    try:
        page.locator(".cm-content").first.click()
        time.sleep(0.5)
        page.keyboard.press("Control+a")
        page.keyboard.type("100 - (avg(rate(node_cpu_seconds_total{mode='idle'}[5m])) * 100)")
        page.locator("button", has_text="Execute").first.click()
        time.sleep(4)
        shot(page, f"{SCREENSHOTS_DIR}/08_prometheus_cpu_query.png", "08 Prometheus CPU% Query")
    except Exception as e:
        print(f"  ! query input failed: {e}")
        shot(page, f"{SCREENSHOTS_DIR}/08_prometheus_cpu_query.png", "08 Prometheus (no query)")

    go(page, "http://localhost:9090/targets", sleep=3)
    shot(page, f"{SCREENSHOTS_DIR}/09_prometheus_targets.png", "09 Prometheus Targets")

    go(page, "http://localhost:9090/alerts", sleep=2)
    shot(page, f"{SCREENSHOTS_DIR}/10_prometheus_alerts.png", "10 Prometheus Alerts")


def alertmanager_screenshots(page):
    go(page, "http://localhost:9093/#/alerts", sleep=3)
    shot(page, f"{SCREENSHOTS_DIR}/11_alertmanager.png", "11 Alertmanager")


def backend_screenshots(page):
    go(page, "http://localhost:8000/docs", sleep=4)
    shot(page, f"{SCREENSHOTS_DIR}/12_backend_swagger.png", "12 Backend Swagger UI")
    shot(page, f"{SCREENSHOTS_DIR}/13_backend_endpoints.png", "13 Backend Endpoints (scrolled)", scroll_y=400)

    go(page, "http://localhost:8000/health", sleep=1)
    shot(page, f"{SCREENSHOTS_DIR}/14_backend_health.png", "14 Backend /health JSON")


def cadvisor_screenshots(page):
    go(page, "http://localhost:8080/containers/", sleep=4)
    shot(page, f"{SCREENSHOTS_DIR}/15_cadvisor_home.png", "15 cAdvisor Containers")
    shot(page, f"{SCREENSHOTS_DIR}/16_cadvisor_scrolled.png", "16 cAdvisor (scrolled)", scroll_y=600)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-web-security"]
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("\n=== InfraWatch Demo Screenshots ===\n")

        steps = [
            ("Grafana", grafana_screenshots),
            ("Prometheus", prometheus_screenshots),
            ("Alertmanager", alertmanager_screenshots),
            ("Backend API", backend_screenshots),
            ("cAdvisor", cadvisor_screenshots),
        ]

        for i, (name, fn) in enumerate(steps, 1):
            print(f"[{i}/{len(steps)}] {name}...")
            try:
                fn(page)
            except Exception as e:
                print(f"  ! {name} error: {e}")

        browser.close()

    shots = sorted(f for f in os.listdir(SCREENSHOTS_DIR) if f.endswith(".png"))
    print(f"\n=== Done: {len(shots)} screenshots saved to screenshots/ ===")
    for f in shots:
        print(f"  {f}")


if __name__ == "__main__":
    main()
