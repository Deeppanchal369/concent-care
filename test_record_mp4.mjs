import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const USER_DATA = path.join(process.env.TEMP || "C:\\Temp", "edge_rec_test2_" + Date.now());
const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new',
  '--remote-debugging-port=9226',
  `--user-data-dir=${USER_DATA}`,
  'about:blank'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9226/json/list');
    const [page] = await res.json();
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    let idCounter = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = idCounter++;
        const handler = (m) => {
          const data = JSON.parse(m.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((r) => (ws.onopen = r));
    await send('Runtime.enable');

    console.log('Running test recorder in browser context...');
    const recordResult = await send('Runtime.evaluate', {
      expression: `(async function() {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(30);
        const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ? 'video/mp4;codecs=avc1' : 'video/mp4';
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

        recorder.start(100);

        let frame = 0;
        const interval = setInterval(() => {
          frame++;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, 1280, 720);
          ctx.fillStyle = '#14B8A6';
          ctx.font = 'bold 48px sans-serif';
          ctx.fillText('ArogyaMitra EHR Test Frame ' + frame, 100, 360);
        }, 33);

        await new Promise(r => setTimeout(r, 2000));
        clearInterval(interval);

        const stopPromise = new Promise(r => recorder.onstop = r);
        recorder.stop();
        await stopPromise;

        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve({ size: blob.size, mimeType: blob.type, base64 });
          };
          reader.readAsDataURL(blob);
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Record output size:', recordResult.result.value.size, 'MIME:', recordResult.result.value.mimeType);
    const buf = Buffer.from(recordResult.result.value.base64, 'base64');
    fs.writeFileSync('x:/EHR/care-consent/test_output.mp4', buf);
    console.log('Saved test_output.mp4 with size:', fs.statSync('x:/EHR/care-consent/test_output.mp4').size);

    ws.close();
    edge.kill();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e);
    edge.kill();
    process.exit(1);
  }
}, 1500);

