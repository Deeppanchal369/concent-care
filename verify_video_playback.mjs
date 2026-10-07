import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9223;
const USER_DATA = path.join(process.env.TEMP || "C:\\Temp", "edge_playback_profile_" + Date.now());

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
  console.log("Launching Edge for Video Playback Verification...");
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

  console.log("Waiting for page load...");
  await sleep(1500);

  // 1. Click "How It Works" button
  console.log("Step 1: Clicking How It Works button...");
  await client.send("Runtime.evaluate", {
    expression: `(function() {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('How It Works') || b.textContent.includes('કેવી રીતે કાર્ય કરે છે'));
      if (btn) btn.click();
    })()`,
  });

  // 2. Wait for video metadata to load
  console.log("Step 2: Waiting for video metadata to load...");
  await sleep(1000);

  // 3. Read readyState, duration, videoWidth, videoHeight
  console.log("Step 3: Reading video properties...");
  const meta = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const v = document.querySelector('div[role="dialog"] video');
      if (!v) return { error: "No video found" };
      return {
        src: v.currentSrc || v.querySelector('source')?.src,
        readyState: v.readyState,
        duration: v.duration,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        paused: v.paused,
        currentTime: v.currentTime,
        error: v.error ? { code: v.error.code, message: v.error.message } : null
      };
    })()`,
    returnByValue: true,
  });
  console.log("Video Metadata:", JSON.stringify(meta.result.value, null, 2));

  // 4. Call video.play()
  console.log("Step 4: Calling video.play()...");
  const playRes = await client.send("Runtime.evaluate", {
    expression: `(async function() {
      const v = document.querySelector('div[role="dialog"] video');
      if (!v) return { error: "No video" };
      try {
        await v.play();
        return { success: true };
      } catch (err) {
        return { success: false, error: err.toString() };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  console.log("Play Result:", playRes.result.value);

  // 5. Wait 2 seconds
  console.log("Step 5: Waiting 2 seconds...");
  await sleep(2000);

  // 6. Verify paused === false and currentTime > 0
  console.log("Step 6: Verifying playback and time advancement...");
  const playingState = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const v = document.querySelector('div[role="dialog"] video');
      return {
        paused: v?.paused,
        currentTime: v?.currentTime,
        ended: v?.ended,
        readyState: v?.readyState
      };
    })()`,
    returnByValue: true,
  });
  console.log("Playback State after 2s:", JSON.stringify(playingState.result.value, null, 2));

  // 7. Pause the video
  console.log("Step 7: Pausing video...");
  await client.send("Runtime.evaluate", {
    expression: `(function() {
      const v = document.querySelector('div[role="dialog"] video');
      if (v) v.pause();
    })()`,
  });

  const pausedTime = (await client.send("Runtime.evaluate", {
    expression: `document.querySelector('div[role="dialog"] video')?.currentTime`,
    returnByValue: true,
  })).result.value;

  // 8. Wait 1 second and verify currentTime stopped
  console.log("Step 8: Verifying currentTime stopped advancing...");
  await sleep(1000);
  const pausedTimeAfterWait = (await client.send("Runtime.evaluate", {
    expression: `document.querySelector('div[role="dialog"] video')?.currentTime`,
    returnByValue: true,
  })).result.value;
  console.log("Paused time 1:", pausedTime, "Paused time after 1s:", pausedTimeAfterWait);

  // 9. Close modal
  console.log("Step 9: Closing modal...");
  await client.send("Runtime.evaluate", {
    expression: `(function() {
      const closeBtn = document.querySelector('div[role="dialog"] button[aria-label]');
      if (closeBtn) closeBtn.click();
    })()`,
  });
  await sleep(500);

  // 10. Verify modal closed
  const isClosed = (await client.send("Runtime.evaluate", {
    expression: `!document.querySelector('div[role="dialog"]')`,
    returnByValue: true,
  })).result.value;
  console.log("Step 10: Modal closed?:", isClosed);

  // 11. Reopen modal and verify it loads again
  console.log("Step 11: Reopening modal...");
  await client.send("Runtime.evaluate", {
    expression: `(function() {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('How It Works') || b.textContent.includes('કેવી રીતે કાર્ય કરે છે'));
      if (btn) btn.click();
    })()`,
  });
  await sleep(800);

  const reopenedState = await client.send("Runtime.evaluate", {
    expression: `(function() {
      const v = document.querySelector('div[role="dialog"] video');
      return {
        open: !!document.querySelector('div[role="dialog"]'),
        hasVideo: !!v,
        paused: v?.paused,
        currentTime: v?.currentTime,
        readyState: v?.readyState
      };
    })()`,
    returnByValue: true,
  });
  console.log("Reopened State:", JSON.stringify(reopenedState.result.value, null, 2));

  client.close();
  edgeProc.kill("SIGKILL");
}

run().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
