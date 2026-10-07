import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const USER_DATA = path.join(process.env.TEMP || "C:\\Temp", "edge_test_profile_" + Date.now());

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(new Error(JSON.stringify(data.error)));
          else resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log("Starting headless Edge...");
  const edgeProc = spawn(EDGE_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  edgeProc.on("error", (err) => console.error("Edge spawn error:", err));

  let versionInfo = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        versionInfo = await res.json();
        break;
      }
    } catch {}
  }

  if (!versionInfo) {
    console.error("Failed to connect to Edge remote debugging port");
    edgeProc.kill("SIGKILL");
    process.exit(1);
  }

  console.log("Connected to browser:", versionInfo.Browser);

  // Get existing page target or list
  const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === "page") || targets[0];
  console.log("Page target found:", pageTarget.id);

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("DOM.enable");
  await client.send("Runtime.enable");

  // Set viewport to 1280x900
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log("Navigating to http://localhost:81/ ...");
  await client.send("Page.navigate", { url: "http://localhost:81/" });

  // Wait for page to render
  await sleep(2000);

  // Evaluate page structure
  const evalHeader = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const links = Array.from(document.querySelectorAll('header nav a')).map(a => a.textContent.trim());
      const logo = document.querySelector('header')?.innerText || '';
      const buttons = Array.from(document.querySelectorAll('header button, header a')).map(b => b.textContent.trim());
      return { links, logo, buttons };
    })()`,
    returnByValue: true,
  });
  console.log("Header nav links:", evalHeader.result.value.links);

  // Save screenshot of desktop landing
  fs.mkdirSync("x:/EHR/care-consent/screenshots", { recursive: true });
  const shot1 = await client.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("x:/EHR/care-consent/screenshots/landing-desktop-en.png", Buffer.from(shot1.data, "base64"));
  console.log("Saved: landing-desktop-en.png");

  // Scroll to Care Circle
  await client.send("Runtime.evaluate", {
    expression: `document.getElementById('care-circle')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
  });
  await sleep(600);

  const evalCareCircle = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const section = document.getElementById('care-circle');
      if (!section) return null;
      const heading = section.querySelector('h2')?.textContent.trim();
      const hero = section.querySelector('h3')?.textContent.trim();
      const tabs = Array.from(section.querySelectorAll('button[aria-pressed]')).map(b => ({
        name: b.textContent.trim(),
        active: b.getAttribute('aria-pressed') === 'true'
      }));
      const roles = Array.from(section.querySelectorAll('h4')).map(h => h.textContent.trim());
      return { heading, hero, tabs, roles };
    })()`,
    returnByValue: true,
  });
  console.log("Care Circle section evaluation:", evalCareCircle.result.value);

  const shotCare = await client.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("x:/EHR/care-consent/screenshots/landing-care-circle.png", Buffer.from(shotCare.data, "base64"));
  console.log("Saved: landing-care-circle.png");

  // Test Flow Tab Switching
  console.log("Testing Care Circle flow tabs...");
  const tabClickRes = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const tabs = Array.from(document.querySelectorAll('#care-circle button[aria-pressed]'));
      if (tabs.length >= 2) {
        tabs[1].click();
        return { clicked: tabs[1].textContent.trim() };
      }
      return { error: 'Tabs not found' };
    })()`,
    returnByValue: true,
  });
  console.log("Tab click result:", tabClickRes.result.value);
  await sleep(400);

  // Click How It Works button to open video modal
  console.log("Opening How It Works video modal...");
  const openModalRes = await client.send("Runtime.evaluate", {
    expression: `(function() {
      // Find button containing 'How It Works'
      const btns = Array.from(document.querySelectorAll('button'));
      const howItWorksBtn = btns.find(b => b.textContent.includes('How It Works') || b.textContent.includes('કેવી રીતે કાર્ય કરે છે'));
      if (howItWorksBtn) {
        howItWorksBtn.click();
        return { clicked: true, text: howItWorksBtn.textContent.trim() };
      }
      return { clicked: false };
    })()`,
    returnByValue: true,
  });
  console.log("Open modal button click:", openModalRes.result.value);
  await sleep(800);

  // Evaluate modal state
  const evalModal = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const modal = document.querySelector('div[role="dialog"]');
      if (!modal) return { open: false };
      const video = modal.querySelector('video');
      const videoSource = video?.querySelector('source')?.getAttribute('src');
      const poster = video?.getAttribute('poster');
      const title = modal.querySelector('h2')?.textContent.trim();
      const steps = Array.from(modal.querySelectorAll('h4')).map(h => h.textContent.trim());
      const isPaused = video ? video.paused : null;
      return {
        open: true,
        title,
        hasVideo: !!video,
        videoSource,
        poster,
        isPaused,
        steps
      };
    })()`,
    returnByValue: true,
  });
  console.log("Modal state:", evalModal.result.value);

  const shotModal = await client.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("x:/EHR/care-consent/screenshots/landing-video-modal.png", Buffer.from(shotModal.data, "base64"));
  console.log("Saved: landing-video-modal.png");

  // Close modal with Escape key
  console.log("Testing closing modal via Escape key...");
  await client.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await sleep(400);

  const evalModalClosed = await client.send("Runtime.evaluate", {
    expression: `!!document.querySelector('div[role="dialog"]')`,
    returnByValue: true,
  });
  console.log("Modal still open after Escape?:", evalModalClosed.result.value);

  // Test Gujarati Language Toggle
  console.log("Testing Gujarati language toggle...");
  const langToggleRes = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('ગુજરાતી') || b.textContent.includes('English'));
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.textContent.trim() };
      }
      return { clicked: false };
    })()`,
    returnByValue: true,
  });
  console.log("Language toggle click:", langToggleRes.result.value);
  await sleep(600);

  // Evaluate Gujarati header & Care Circle
  const evalGu = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const links = Array.from(document.querySelectorAll('header nav a')).map(a => a.textContent.trim());
      const careHeading = document.querySelector('#care-circle h2')?.textContent.trim();
      const careHero = document.querySelector('#care-circle h3')?.textContent.trim();
      const roleTitles = Array.from(document.querySelectorAll('#care-circle h4')).map(h => h.textContent.trim());
      return { links, careHeading, careHero, roleTitles };
    })()`,
    returnByValue: true,
  });
  console.log("Gujarati strings evaluation:", evalGu.result.value);

  const shotGu = await client.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("x:/EHR/care-consent/screenshots/landing-gujarati.png", Buffer.from(shotGu.data, "base64"));
  console.log("Saved: landing-gujarati.png");

  // Test Mobile Viewport (375x812)
  console.log("Testing Mobile Viewport (375x812)...");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.send("Runtime.evaluate", {
    expression: `window.scrollTo(0, 0);`,
  });
  await sleep(500);

  const shotMobile = await client.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("x:/EHR/care-consent/screenshots/landing-mobile.png", Buffer.from(shotMobile.data, "base64"));
  console.log("Saved: landing-mobile.png");

  // Open mobile drawer
  console.log("Opening mobile drawer...");
  await client.send("Runtime.evaluate", {
    expression: `document.querySelector('header button[aria-label="Toggle navigation menu"]')?.click();`,
  });
  await sleep(400);

  const shotMobileDrawer = await client.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("x:/EHR/care-consent/screenshots/landing-mobile-drawer.png", Buffer.from(shotMobileDrawer.data, "base64"));
  console.log("Saved: landing-mobile-drawer.png");

  // Clean up
  client.close();
  edgeProc.kill("SIGKILL");
  console.log("Test finished successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
