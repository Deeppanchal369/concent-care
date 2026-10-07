import { spawn } from 'child_process';
import path from 'path';

const USER_DATA = path.join(process.env.TEMP || "C:\\Temp", "edge_rec_test_" + Date.now());
const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new',
  '--remote-debugging-port=9225',
  `--user-data-dir=${USER_DATA}`,
  'about:blank'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9225/json/list');
    const [page] = await res.json();
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `JSON.stringify({
            mp4: MediaRecorder.isTypeSupported('video/mp4'),
            mp4_avc: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1'),
            mp4_h264: MediaRecorder.isTypeSupported('video/mp4;codecs=h264'),
            webm: MediaRecorder.isTypeSupported('video/webm'),
            webm_vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
            webm_vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          })`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (m) => {
      console.log('Result:', JSON.parse(m.data).result.result.value);
      edge.kill();
      process.exit(0);
    };
  } catch(e) {
    console.error(e);
    edge.kill();
    process.exit(1);
  }
}, 1500);

