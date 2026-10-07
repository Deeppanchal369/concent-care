import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9245;
const USER_DATA = path.join(process.env.TEMP || "C:\\Temp", "edge_final_verif_" + Date.now());

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
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

async function run() {
  console.log("Launching Edge for Final Video Verification...");
  const edgeProc = spawn(EDGE_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    "--disable-gpu",
    "--autoplay-policy=no-user-gesture-required",
    "http://localhost:81/",
  ]);

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
    throw new Error("Could not connect to Edge on port " + PORT);
  }

  const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === "page") || targets[0];

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Runtime.enable");

  // TEST 1: Direct URL check http://localhost:81/media/how-it-works.mp4
  console.log("=== TEST 1: Direct Video URL Verification ===");
  await client.send("Page.enable");
  await client.send("Page.navigate", { url: "http://localhost:81/media/how-it-works.mp4" });
  await sleep(1500);

  const directTest = await client.send("Runtime.evaluate", {
    expression: `(async () => {
      const v = document.querySelector('video');
      if (!v) return { error: "No video found on direct page" };
      await new Promise((resolve) => {
        if (v.readyState >= 3) return resolve();
        v.onloadedmetadata = () => resolve();
        setTimeout(resolve, 2000);
      });
      const meta = {
        src: v.currentSrc,
        readyState: v.readyState,
        duration: v.duration,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight
      };
      await v.play();
      await new Promise(r => setTimeout(r, 2200));
      const playingCurrentTime = v.currentTime;
      const isPausedAfterPlay = v.paused;
      v.pause();
      const pausedTime = v.currentTime;
      return {
        ...meta,
        playingCurrentTime,
        isPausedAfterPlay,
        pausedTime
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Direct Video Test Result:", JSON.stringify(directTest.result.value, null, 2));

  // TEST 2: Landing Page Modal Interaction
  console.log("=== TEST 2: Landing Page Modal Interaction ===");
  await client.send("Page.navigate", { url: "http://localhost:81/" });
  await sleep(1500);

  // Click How It Works
  await client.send("Runtime.evaluate", {
    expression: `(function() {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('How It Works') || b.textContent.includes('કેવી રીતે કાર્ય કરે છે'));
      if (btn) btn.click();
    })()`
  });
  await sleep(1000);

  // Read Modal Video Properties
  const modalMeta = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const v = document.querySelector('div[role="dialog"] video');
      return {
        readyState: v?.readyState,
        duration: v?.duration,
        videoWidth: v?.videoWidth,
        videoHeight: v?.videoHeight,
        currentTime: v?.currentTime,
        paused: v?.paused
      };
    })()`,
    returnByValue: true
  });
  console.log("Modal Video Metadata:", JSON.stringify(modalMeta.result.value, null, 2));

  // Play Modal Video
  const modalPlay = await client.send("Runtime.evaluate", {
    expression: `(async function() {
      const v = document.querySelector('div[role="dialog"] video');
      try {
        await v.play();
        return { success: true };
      } catch(e) {
        return { success: false, error: e.toString() };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Modal Play Call:", JSON.stringify(modalPlay.result.value));

  // Wait 2.2 seconds and check time advancement >= 2.0s
  await sleep(2200);
  const modalPlaying = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const v = document.querySelector('div[role="dialog"] video');
      return {
        paused: v?.paused,
        currentTime: v?.currentTime
      };
    })()`,
    returnByValue: true
  });
  console.log("Modal Playing after 2.2s:", JSON.stringify(modalPlaying.result.value));

  // Pause
  await client.send("Runtime.evaluate", {
    expression: `document.querySelector('div[role="dialog"] video')?.pause()`
  });
  const modalPaused = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const v = document.querySelector('div[role="dialog"] video');
      return { paused: v?.paused, currentTime: v?.currentTime };
    })()`,
    returnByValue: true
  });
  console.log("Modal Paused State:", JSON.stringify(modalPaused.result.value));

  // Close modal
  await client.send("Runtime.evaluate", {
    expression: `document.querySelector('div[role="dialog"] button[aria-label]')?.click()`
  });
  await sleep(500);

  // Verify closed
  const isClosed = await client.send("Runtime.evaluate", {
    expression: `!document.querySelector('div[role="dialog"]')`,
    returnByValue: true
  });
  console.log("Modal Closed:", isClosed.result.value);

  // Reopen modal
  await client.send("Runtime.evaluate", {
    expression: `(function() {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('How It Works') || b.textContent.includes('કેવી રીતે કાર્ય કરે છે'));
      if (btn) btn.click();
    })()`
  });
  await sleep(800);

  const modalReopened = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const v = document.querySelector('div[role="dialog"] video');
      return {
        dialogPresent: !!document.querySelector('div[role="dialog"]'),
        hasVideo: !!v,
        currentTime: v?.currentTime,
        paused: v?.paused,
        readyState: v?.readyState
      };
    })()`,
    returnByValue: true
  });
  console.log("Modal Reopened State:", JSON.stringify(modalReopened.result.value));

  client.close();
  edgeProc.kill("SIGKILL");
}

run().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
