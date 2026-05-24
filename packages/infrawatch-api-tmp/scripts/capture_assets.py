#!/usr/bin/env python3
"""
InfraWatch Automated Asset Generator.
Captures all 17 high-resolution screenshots (1400x900) and records the 5 walkthrough GIFs (1280x720, 10-15 fps).
Uses Playwright for automation and OpenCV + Pillow to convert recorded videos to optimized GIFs.
"""

import os
import time
import shutil
import urllib.request
import urllib.parse
import json
import cv2
from PIL import Image
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = "/home/mrit/Downloads/infrawatch/screenshots"
DEMOS_DIR = "/home/mrit/Downloads/infrawatch/demos"
TEMP_VIDEO_DIR = "/home/mrit/Downloads/infrawatch/demos/temp_videos"

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
os.makedirs(DEMOS_DIR, exist_ok=True)
os.makedirs(TEMP_VIDEO_DIR, exist_ok=True)


def convert_webm_to_gif(webm_path, gif_path, fps=12):
    print(f"  🎬 Converting WebM video to GIF: {gif_path} at {fps} FPS...")
    if not os.path.exists(webm_path):
        print(f"    ❌ WebM file not found: {webm_path}")
        return False
        
    cap = cv2.VideoCapture(webm_path)
    if not cap.isOpened():
        print(f"    ❌ Failed to open video file: {webm_path}")
        return False
        
    frames = []
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if not video_fps or video_fps <= 0:
        video_fps = 30.0
        
    sample_interval = max(1, int(round(video_fps / fps)))
    print(f"    Source FPS: {video_fps:.2f}, target FPS: {fps}, sample interval: every {sample_interval} frame(s)")
    
    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % sample_interval == 0:
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(frame_rgb)
            # Ensure it is exactly 1280x720
            if img.size != (1280, 720):
                img = img.resize((1280, 720), Image.Resampling.LANCZOS)
            frames.append(img)
        frame_count += 1
        
    cap.release()
    
    if not frames:
        print("    ❌ No frames extracted from video.")
        return False
        
    duration = int(1000 / fps)
    print(f"    Extracted {len(frames)} frames. Saving GIF...")
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True
    )
    print(f"    ✓ GIF saved successfully! Size: {os.path.getsize(gif_path) / 1024:.2f} KB")
    return True


def login_grafana(page):
    print("  Logging in to Grafana...")
    page.goto("http://localhost:3000/login", wait_until="domcontentloaded")
    time.sleep(2)
    # Check if we are already logged in
    if "/login" in page.url:
        page.fill("input[name='user']", "admin")
        page.fill("input[name='password']", "infrawatch")
        page.click("button[type='submit']")
        time.sleep(4)
        print("  Logged in successfully.")
    else:
        print("  Already logged in.")


def capture_screenshots():
    print("\n--- STAGE 1: Capturing 17 Screenshots (1400x900) ---")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-web-security"]
        )
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()
        
        # 1. 01_dashboard_main.png
        print("1. Capturing 01_dashboard_main.png...")
        page.goto("http://localhost:8000/dashboard", wait_until="domcontentloaded")
        time.sleep(7) # wait for gauge and animations
        page.screenshot(path=f"{SCREENSHOTS_DIR}/01_dashboard_main.png")
        print("  ✓ Captured.")
        
        # Log in to Grafana for authenticated dashboards
        login_grafana(page)
        
        # 2. 02_grafana_home.png
        print("2. Capturing 02_grafana_home.png...")
        page.goto("http://localhost:3000/?orgId=1", wait_until="domcontentloaded")
        time.sleep(4)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/02_grafana_home.png")
        print("  ✓ Captured.")
        
        # 3. 03_grafana_dashboard_linux.png
        print("3. Capturing 03_grafana_dashboard_linux.png...")
        page.goto("http://localhost:3000/d/infrawatch-linux/", wait_until="domcontentloaded")
        time.sleep(10) # wait for all panels to load fully
        page.screenshot(path=f"{SCREENSHOTS_DIR}/03_grafana_dashboard_linux.png")
        print("  ✓ Captured.")
        
        # 4. 04_grafana_dashboard_cadvisor.png
        print("4. Capturing 04_grafana_dashboard_cadvisor.png...")
        page.goto("http://localhost:3000/d/infrawatch-cadvisor/", wait_until="domcontentloaded")
        time.sleep(10)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/04_grafana_dashboard_cadvisor.png")
        print("  ✓ Captured.")
        
        # 5. 05_grafana_alerts.png
        print("5. Capturing 05_grafana_alerts.png...")
        page.goto("http://localhost:3000/alerting/list", wait_until="domcontentloaded")
        time.sleep(5)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/05_grafana_alerts.png")
        print("  ✓ Captured.")
        
        # 6. 06_grafana_explore.png
        print("6. Capturing 06_grafana_explore.png (Loki Logs)...")
        # Direct URL with Loki explore query
        explore_url = "http://localhost:3000/explore?left=%5B%22now-1h%22,%22now%22,%22Loki%22,%7B%22expr%22:%22%7Bjob%3D%5C%22varlogs%5C%22%7D%22%7D%5D"
        page.goto(explore_url, wait_until="domcontentloaded")
        time.sleep(6)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/06_grafana_explore.png")
        print("  ✓ Captured.")
        
        # 7. 07_prometheus_graph.png
        print("7. Capturing 07_prometheus_graph.png...")
        page.goto("http://localhost:9090/graph", wait_until="domcontentloaded")
        time.sleep(3)
        try:
            page.locator(".cm-content").first.click()
            time.sleep(0.5)
            page.keyboard.press("Control+a")
            page.keyboard.type("node_cpu_seconds_total")
            page.locator("button:has-text('Execute')").first.click()
            time.sleep(3)
        except Exception as e:
            print(f"  Warning executing query: {e}")
        page.screenshot(path=f"{SCREENSHOTS_DIR}/07_prometheus_graph.png")
        print("  ✓ Captured.")
        
        # 8. 08_prometheus_cpu_query.png
        print("8. Capturing 08_prometheus_cpu_query.png (rate graph)...")
        page.goto("http://localhost:9090/graph", wait_until="domcontentloaded")
        time.sleep(3)
        try:
            page.locator(".cm-content").first.click()
            time.sleep(0.5)
            page.keyboard.press("Control+a")
            page.keyboard.type("rate(node_cpu_seconds_total[5m])")
            page.locator("button:has-text('Execute')").first.click()
            time.sleep(2)
            # Toggle Graph tab
            page.locator("button:has-text('Graph')").first.click()
            time.sleep(4)
        except Exception as e:
            print(f"  Warning executing query rate: {e}")
        page.screenshot(path=f"{SCREENSHOTS_DIR}/08_prometheus_cpu_query.png")
        print("  ✓ Captured.")
        
        # 9. 09_prometheus_targets.png
        print("9. Capturing 09_prometheus_targets.png...")
        page.goto("http://localhost:9090/targets", wait_until="domcontentloaded")
        time.sleep(4)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/09_prometheus_targets.png")
        print("  ✓ Captured.")
        
        # 10. 10_prometheus_alerts.png
        print("10. Capturing 10_prometheus_alerts.png...")
        page.goto("http://localhost:9090/alerts", wait_until="domcontentloaded")
        time.sleep(3)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/10_prometheus_alerts.png")
        print("  ✓ Captured.")
        
        # 11. 11_alertmanager.png
        print("11. Capturing 11_alertmanager.png...")
        page.goto("http://localhost:9093/#/alerts", wait_until="domcontentloaded")
        time.sleep(4)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/11_alertmanager.png")
        print("  ✓ Captured.")
        
        # 12. 12_backend_swagger.png
        print("12. Capturing 12_backend_swagger.png...")
        page.goto("http://localhost:8000/docs", wait_until="domcontentloaded")
        time.sleep(4)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/12_backend_swagger.png")
        print("  ✓ Captured.")
        
        # 13. 13_backend_health.png
        print("13. Capturing 13_backend_health.png...")
        page.goto("http://localhost:8000/health", wait_until="domcontentloaded")
        time.sleep(2)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/13_backend_health.png")
        print("  ✓ Captured.")
        
        # 14. 14_backend_metrics.png
        print("14. Capturing 14_backend_metrics.png...")
        page.goto("http://localhost:8000/api/metrics", wait_until="domcontentloaded")
        time.sleep(2)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/14_backend_metrics.png")
        print("  ✓ Captured.")
        
        # 15. 15_backend_containers.png
        print("15. Capturing 15_backend_containers.png...")
        page.goto("http://localhost:8000/api/containers", wait_until="domcontentloaded")
        time.sleep(2)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/15_backend_containers.png")
        print("  ✓ Captured.")
        
        # 16. 16_cadvisor_home.png
        print("16. Capturing 16_cadvisor_home.png...")
        page.goto("http://localhost:8080/containers/", wait_until="domcontentloaded")
        time.sleep(4)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/16_cadvisor_home.png")
        print("  ✓ Captured.")
        
        # 17. 17_anomaly_api.png (Authenticated anomalies list API)
        print("17. Capturing 17_anomaly_api.png (JWT Auth API response)...")
        try:
            # Login and get token in Python using urllib
            token_data = urllib.parse.urlencode({"username": "admin", "password": "infrawatch"}).encode("utf-8")
            token_req = urllib.request.Request("http://localhost:8000/auth/token", data=token_data, method="POST")
            with urllib.request.urlopen(token_req) as token_resp:
                if token_resp.status == 200:
                    resp_json = json.loads(token_resp.read().decode("utf-8"))
                    token = resp_json.get("access_token")
                    print("  Successfully obtained JWT token.")
                    # Go to a safe local page
                    page.goto("http://localhost:8000/health")
                    # Evaluate js fetch with header and render on page
                    page.evaluate(f"""async () => {{
                        const response = await fetch("http://localhost:8000/api/anomalies", {{
                            headers: {{ "Authorization": "Bearer {token}" }}
                        }});
                        const json = await response.json();
                        document.body.innerHTML = `<pre style="font-family: 'Courier New', Courier, monospace; padding: 25px; font-size: 14px; background: #0f172a; color: #f8fafc; border-radius: 8px; margin: 30px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3); border: 1px solid #334155; overflow: auto; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;">${{JSON.stringify(json, null, 2)}}</pre>`;
                        document.body.style.background = "#020617";
                    }}""")
                    time.sleep(3)
                    page.screenshot(path=f"{SCREENSHOTS_DIR}/17_anomaly_api.png")
                    print("  ✓ Captured 17_anomaly_api.png successfully.")
                else:
                    print(f"  ❌ JWT Auth token request failed: {token_resp.status}")
        except Exception as e:
            print(f"  ❌ Failed to capture 17_anomaly_api.png: {e}")
            
        browser.close()
    print("--- Screenshots capturing complete! ---\n")


def record_gifs():
    print("\n--- STAGE 2: Recording 5 Walkthrough Videos and Compiling GIFs (1280x720) ---")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-web-security"]
        )
        
        # ────────────────────────────────────────────────────────
        # 1. demo_01_core_stack.gif
        # ────────────────────────────────────────────────────────
        print("Recording demo_01_core_stack...")
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=TEMP_VIDEO_DIR,
            record_video_size={"width": 1280, "height": 720}
        )
        page = context.new_page()
        
        # 1. Custom dashboard
        page.goto("http://localhost:8000/dashboard", wait_until="domcontentloaded")
        time.sleep(4)
        # 2. Grafana login
        page.goto("http://localhost:3000/login", wait_until="domcontentloaded")
        time.sleep(2)
        page.fill("input[name='user']", "admin")
        page.fill("input[name='password']", "infrawatch")
        page.click("button[type='submit']")
        time.sleep(4)
        # 3. Linux dashboard
        page.goto("http://localhost:3000/d/infrawatch-linux/", wait_until="domcontentloaded")
        time.sleep(5)
        # Scroll slowly
        for i in range(1, 6):
            page.evaluate(f"window.scrollTo(0, {i * 150})")
            time.sleep(0.8)
        # 4. Prometheus targets
        page.goto("http://localhost:9090/targets", wait_until="domcontentloaded")
        time.sleep(3)
        # 5. Alertmanager
        page.goto("http://localhost:9093/#/alerts", wait_until="domcontentloaded")
        time.sleep(3)
        
        video_path = page.video.path()
        context.close()
        convert_webm_to_gif(video_path, f"{DEMOS_DIR}/demo_01_core_stack.gif", fps=10)
        
        # ────────────────────────────────────────────────────────
        # 2. demo_02_grafana_dashboards.gif
        # ────────────────────────────────────────────────────────
        print("Recording demo_02_grafana_dashboards...")
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=TEMP_VIDEO_DIR,
            record_video_size={"width": 1280, "height": 720}
        )
        page = context.new_page()
        login_grafana(page)
        
        # 1. Linux Dashboard
        page.goto("http://localhost:3000/d/infrawatch-linux/", wait_until="domcontentloaded")
        time.sleep(4)
        # Hover mouse to trigger tooltip
        page.mouse.move(600, 320)
        time.sleep(2)
        # 2. cAdvisor Container metrics
        page.goto("http://localhost:3000/d/infrawatch-cadvisor/", wait_until="domcontentloaded")
        time.sleep(4)
        page.mouse.move(600, 320)
        time.sleep(2)
        # 3. Alert rules list
        page.goto("http://localhost:3000/alerting/list", wait_until="domcontentloaded")
        time.sleep(3)
        # 4. Loki Explore
        explore_url = "http://localhost:3000/explore?left=%5B%22now-1h%22,%22now%22,%22Loki%22,%7B%22expr%22:%22%7Bjob%3D%5C%22varlogs%5C%22%7D%22%7D%5D"
        page.goto(explore_url, wait_until="domcontentloaded")
        time.sleep(5)
        
        video_path = page.video.path()
        context.close()
        convert_webm_to_gif(video_path, f"{DEMOS_DIR}/demo_02_grafana_dashboards.gif", fps=10)
        
        # ────────────────────────────────────────────────────────
        # 3. demo_03_backend_api.gif
        # ────────────────────────────────────────────────────────
        print("Recording demo_03_backend_api...")
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=TEMP_VIDEO_DIR,
            record_video_size={"width": 1280, "height": 720}
        )
        page = context.new_page()
        
        # 1. Swagger UI
        page.goto("http://localhost:8000/docs", wait_until="domcontentloaded")
        time.sleep(3)
        # Expand and execute /health
        try:
            # Click health endpoint
            page.click("span:has-text('/health')")
            time.sleep(1)
            page.click("button:has-text('Try it out')")
            time.sleep(0.5)
            page.click("button:has-text('Execute')")
            time.sleep(3)
            # Expand and execute /api/metrics
            page.click("span:has-text('/api/metrics')")
            time.sleep(1)
            page.click("button:has-text('Try it out')")
            time.sleep(0.5)
            page.click("button:has-text('Execute')")
            time.sleep(4)
        except Exception as e:
            print(f"    Warning navigating Swagger elements: {e}")
            time.sleep(5)
            
        # 2. Live custom dashboard
        page.goto("http://localhost:8000/dashboard", wait_until="domcontentloaded")
        time.sleep(6)
        
        video_path = page.video.path()
        context.close()
        convert_webm_to_gif(video_path, f"{DEMOS_DIR}/demo_03_backend_api.gif", fps=10)
        
        # ────────────────────────────────────────────────────────
        # 4. demo_04_alerting.gif
        # ────────────────────────────────────────────────────────
        print("Recording demo_04_alerting...")
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=TEMP_VIDEO_DIR,
            record_video_size={"width": 1280, "height": 720}
        )
        page = context.new_page()
        
        # 1. Prometheus Alerts page
        page.goto("http://localhost:9090/alerts", wait_until="domcontentloaded")
        time.sleep(3)
        # 2. Prometheus Targets page
        page.goto("http://localhost:9090/targets", wait_until="domcontentloaded")
        time.sleep(3)
        # 3. Prometheus Graph query
        page.goto("http://localhost:9090/graph", wait_until="domcontentloaded")
        time.sleep(2)
        try:
            page.locator(".cm-content").first.click()
            time.sleep(0.5)
            page.keyboard.press("Control+a")
            page.keyboard.type("rate(node_cpu_seconds_total{mode='user'}[5m])")
            page.locator("button:has-text('Execute')").first.click()
            time.sleep(1.5)
            page.locator("button:has-text('Graph')").first.click()
            time.sleep(4)
        except Exception as e:
            print(f"    Warning inside Prometheus alerting recording: {e}")
            time.sleep(4)
            
        # 4. Alertmanager UI
        page.goto("http://localhost:9093/#/alerts", wait_until="domcontentloaded")
        time.sleep(3)
        
        # 5. Grafana Alert rules
        login_grafana(page)
        page.goto("http://localhost:3000/alerting/list", wait_until="domcontentloaded")
        time.sleep(3)
        
        video_path = page.video.path()
        context.close()
        convert_webm_to_gif(video_path, f"{DEMOS_DIR}/demo_04_alerting.gif", fps=10)
        
        # ────────────────────────────────────────────────────────
        # 5. demo_05_loki_logs.gif
        # ────────────────────────────────────────────────────────
        print("Recording demo_05_loki_logs...")
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=TEMP_VIDEO_DIR,
            record_video_size={"width": 1280, "height": 720}
        )
        page = context.new_page()
        login_grafana(page)
        
        # 1. Grafana Explore with Loki logs query
        explore_url = "http://localhost:3000/explore?left=%5B%22now-1h%22,%22now%22,%22Loki%22,%7B%22expr%22:%22%7Bjob%3D%5C%22varlogs%5C%22%7D%22%7D%5D"
        page.goto(explore_url, wait_until="domcontentloaded")
        time.sleep(6)
        
        # Try to expand a log line
        try:
            # Click on first log row to expand it
            page.locator(".logs-row").first.click()
            time.sleep(3)
        except Exception as e:
            print(f"    Warning expanding log line: {e}")
            time.sleep(3)
            
        # 2. Direct Loki labels API
        page.goto("http://localhost:3100/loki/api/v1/labels", wait_until="domcontentloaded")
        time.sleep(3)
        
        video_path = page.video.path()
        context.close()
        convert_webm_to_gif(video_path, f"{DEMOS_DIR}/demo_05_loki_logs.gif", fps=10)
        
        browser.close()
        
    # Clean up temp folder
    try:
        shutil.rmtree(TEMP_VIDEO_DIR)
        print(f"  ✓ Cleaned up temporary video files in {TEMP_VIDEO_DIR}.")
    except Exception as e:
        print(f"  Warning cleaning up temp directory: {e}")
        
    print("--- Video walkthroughs and GIF conversions complete! ---\n")


if __name__ == "__main__":
    capture_screenshots()
    record_gifs()
    print("=== Finished ALL asset generations! ===")
