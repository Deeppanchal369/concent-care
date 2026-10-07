import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = 9231;
const USER_DATA = path.join(process.env.TEMP || "C:\\Temp", "edge_probe_" + Date.now());
const edge = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DATA}`,
  "--disable-gpu",
  "about:blank"
]);

setTimeout(async () => {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const [page] = await res.json();
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const myId = id++;
        const h = (m) => {
          const d = JSON.parse(m.data);
          if (d.id === myId) {
            ws.removeEventListener("message", h);
            resolve(d.result);
          }
        };
        ws.addEventListener("message", h);
        ws.send(JSON.stringify({ id: myId, method, params }));
      });
    }
    await new Promise((r) => (ws.onopen = r));
    await send("Runtime.enable");

    const fileBase64 = fs.readFileSync("x:/EHR/care-consent/frontend/public/media/how-it-works.mp4").toString("base64");
    const result = await send("Runtime.evaluate", {
      expression: `(async () => {
        const blob = await fetch("data:video/mp4;base64,${fileBase64}").then(r => r.blob());
        const v = document.createElement("video");
        v.src = URL.createObjectURL(blob);
        await new Promise((r, j) => {
          v.onloadedmetadata = r;
          v.onerror = (e) => j(v.error);
        });
        return {
          duration: v.duration,
          videoWidth: v.videoWidth,
          videoHeight: v.videoHeight,
          readyState: v.readyState
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log("PROBE RESULT:", JSON.stringify(result.result.value, null, 2));
    ws.close();
    edge.kill();
    process.exit(0);
  } catch (e) {
    console.error(e);
    edge.kill();
    process.exit(1);
  }
}, 1500);
