import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const USER_DATA = path.join(process.env.TEMP || "C:\\Temp", "edge_rec_full_" + Date.now());
const PORT = 9229;
const TARGET_FILE = 'x:/EHR/care-consent/frontend/public/media/how-it-works.mp4';
const TARGET_FILE_2 = 'x:/EHR/consent-care/frontend/public/media/how-it-works.mp4';

console.log("Starting headless Edge for video generation...");
const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DATA}`,
  '--disable-gpu',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const [page] = await res.json();
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    let idCounter = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        const handler = (m) => {
          const data = JSON.parse(m.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(new Error(JSON.stringify(data.error)));
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((r) => (ws.onopen = r));
    await send('Runtime.enable');

    console.log("Initializing 55-second 1280x720 video rendering in browser...");
    const evalPromise = send('Runtime.evaluate', {
      expression: `(async function() {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(25);
        const mimeType = 'video/mp4;codecs=avc1';
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2800000
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const DURATION_SEC = 55;
        const TOTAL_MS = DURATION_SEC * 1000;
        const startTime = Date.now();

        recorder.start(100);

        function drawFrame(elapsedSec) {
          // 1. Background
          ctx.fillStyle = '#0B1120';
          ctx.fillRect(0, 0, 1280, 720);

          // Subtle ambient grid pattern
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1;
          for (let x = 80; x < 1280; x += 120) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 720);
            ctx.stroke();
          }
          for (let y = 60; y < 720; y += 80) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1280, y);
            ctx.stroke();
          }

          // 2. Top Header Bar
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, 1280, 72);
          ctx.strokeStyle = '#1E293B';
          ctx.strokeRect(0, 0, 1280, 72);

          // ArogyaMitra Logo Emblem (medical shield)
          ctx.fillStyle = '#0F766E';
          ctx.beginPath();
          ctx.roundRect(40, 16, 40, 40, 10);
          ctx.fill();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(60, 32, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(60, 32, 4, 0, Math.PI * 2);
          ctx.fill();

          // Brand Wordmark
          ctx.font = 'bold 24px system-ui, sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText('Arogya', 92, 43);
          ctx.fillStyle = '#2DD4BF';
          ctx.fillText('Mitra', 170, 43);

          // EHR Badge
          ctx.fillStyle = '#134E4A';
          ctx.beginPath();
          ctx.roundRect(238, 24, 44, 22, 6);
          ctx.fill();
          ctx.strokeStyle = '#0D9488';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#5EEAD4';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillText('EHR', 249, 39);

          // Stage Navigation Tabs along top
          const stages = [
            { name: '1. Sign In', start: 0, end: 10 },
            { name: '2. Care Circle', start: 10, end: 22 },
            { name: '3. Consent', start: 22, end: 34 },
            { name: '4. Records', start: 34, end: 46 },
            { name: '5. Insights', start: 46, end: 55 },
          ];

          let curStageIdx = stages.findIndex(s => elapsedSec >= s.start && elapsedSec < s.end);
          if (curStageIdx === -1) curStageIdx = stages.length - 1;

          let tabX = 350;
          stages.forEach((st, idx) => {
            const isActive = idx === curStageIdx;
            ctx.fillStyle = isActive ? '#0D9488' : '#1E293B';
            ctx.beginPath();
            ctx.roundRect(tabX, 20, 130, 32, 8);
            ctx.fill();
            if (isActive) {
              ctx.strokeStyle = '#5EEAD4';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
            ctx.fillStyle = isActive ? '#FFFFFF' : '#94A3B8';
            ctx.font = isActive ? 'bold 12px system-ui, sans-serif' : '500 12px system-ui, sans-serif';
            ctx.fillText(st.name, tabX + 16, 40);
            tabX += 142;
          });

          // Live Progress Bar (0 to 55s)
          const progRatio = Math.min(1, elapsedSec / DURATION_SEC);
          ctx.fillStyle = '#334155';
          ctx.fillRect(0, 70, 1280, 4);
          ctx.fillStyle = '#2DD4BF';
          ctx.fillRect(0, 70, 1280 * progRatio, 4);

          // Timer readout Top Right
          const curMin = Math.floor(elapsedSec / 60);
          const curSec = Math.floor(elapsedSec % 60);
          const timeStr = \`\${curMin}:\${curSec < 10 ? '0' : ''}\${curSec} / 0:55\`;
          ctx.fillStyle = '#94A3B8';
          ctx.font = '600 13px monospace';
          ctx.fillText(timeStr, 1170, 42);

          // 3. Scene Content Canvas
          if (elapsedSec < 10) {
            // ================= SCENE 1: Sign In & Registration =================
            renderScene1(elapsedSec);
          } else if (elapsedSec < 22) {
            // ================= SCENE 2: Care Circle =================
            renderScene2(elapsedSec - 10);
          } else if (elapsedSec < 34) {
            // ================= SCENE 3: Permissions & Consent =================
            renderScene3(elapsedSec - 22);
          } else if (elapsedSec < 46) {
            // ================= SCENE 4: Medical Records =================
            renderScene4(elapsedSec - 34);
          } else {
            // ================= SCENE 5: Health Insights =================
            renderScene5(elapsedSec - 46);
          }
        }

        // Scene 1: Sign In & Patient Profile
        function renderScene1(t) {
          drawBadge('STEP 1: PATIENT REGISTRATION & SIGN IN', '#0D9488');
          drawHeading('Create Your Patient Account & Sign In', 'Create your patient account and sign in securely to manage your health records');

          // Center Card
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.roundRect(240, 200, 800, 440, 20);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Card Header
          ctx.fillStyle = '#0F766E';
          ctx.beginPath();
          ctx.roundRect(270, 230, 60, 60, 14);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 28px system-ui, sans-serif';
          ctx.fillText('P', 290, 272);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 22px system-ui, sans-serif';
          ctx.fillText('Rajesh Sharma (Patient Profile)', 350, 255);
          ctx.fillStyle = '#2DD4BF';
          ctx.font = '600 13px system-ui, sans-serif';
          ctx.fillText('Create your patient account and sign in securely', 350, 278);

          // Simulated Form Details
          const fields = [
            { label: 'Full Name', val: 'Rajesh Kumar Sharma' },
            { label: 'Date of Birth', val: '14 August 1978 (Age: 48)' },
            { label: 'Patient Access', val: 'Registered Patient Account • Secure Session' },
            { label: 'Preferred Language', val: 'ગુજરાતી / English' },
            { label: 'Emergency Contact', val: 'Sunita Sharma (Spouse) - Active' },
            { label: 'Consent Control', val: 'Patient-Governed Access' },
          ];

          let fy = 320;
          fields.forEach((f, idx) => {
            const col = idx % 2 === 0 ? 270 : 660;
            if (idx % 2 === 0 && idx > 0) fy += 65;

            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.roundRect(col, fy, 350, 52, 10);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#94A3B8';
            ctx.font = '500 11px system-ui, sans-serif';
            ctx.fillText(f.label, col + 16, fy + 20);
            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.fillText(f.val, col + 16, fy + 40);
          });

          // Active indicator pill
          ctx.fillStyle = '#064E3B';
          ctx.beginPath();
          ctx.roundRect(270, 540, 740, 56, 12);
          ctx.fill();
          ctx.strokeStyle = '#059669';
          ctx.stroke();

          ctx.fillStyle = '#34D399';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText('✓ Account Active: Manage your personal medical records and consent preferences', 290, 574);
        }

        // Scene 2: Care Circle
        function renderScene2(t) {
          drawBadge('STEP 2: COORDINATED CARE CIRCLE', '#2563EB');
          drawHeading('Patient-Centered Care Circle', 'Connected collaboration: Patient directs permissions, Doctor provides care, Nurse coordinates bedside tasks');

          // Draw 3 Role Columns / Nodes
          const roles = [
            {
              title: 'Patient',
              subtitle: 'Center of Care / Owns permissions',
              tag: 'Step 1',
              color: '#0D9488',
              bg: '#134E4A',
              x: 140,
              badge: 'P',
              points: [
                'Controls access to personal records',
                'Grants & revokes doctor access',
                'Inspects activity audit trail'
              ]
            },
            {
              title: 'Doctor',
              subtitle: 'Attending Physician / Clinical Lead',
              tag: 'Step 2',
              color: '#2563EB',
              bg: '#1E3A8A',
              x: 500,
              badge: 'MD',
              points: [
                'Requests consent for consultation',
                'Reviews verified lab history',
                'Delegates bedside tasks to nurses'
              ]
            },
            {
              title: 'Nurse',
              subtitle: 'Bedside Care & Vitals Execution',
              tag: 'Step 3',
              color: '#059669',
              bg: '#064E3B',
              x: 860,
              badge: 'RN',
              points: [
                'Executes prioritized care queue',
                'Documents vitals & medication doses',
                'Maintains continuous flowsheet'
              ]
            }
          ];

          roles.forEach((r) => {
            // Card
            ctx.fillStyle = '#1E293B';
            ctx.beginPath();
            ctx.roundRect(r.x, 210, 280, 380, 18);
            ctx.fill();
            ctx.strokeStyle = r.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Avatar badge
            ctx.fillStyle = r.bg;
            ctx.beginPath();
            ctx.roundRect(r.x + 20, 230, 48, 48, 12);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px system-ui, sans-serif';
            ctx.fillText(r.badge, r.x + 32, 262);

            // Title
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 18px system-ui, sans-serif';
            ctx.fillText(r.title, r.x + 80, 252);
            ctx.fillStyle = r.color;
            ctx.font = 'bold 10px system-ui, sans-serif';
            ctx.fillText(r.subtitle, r.x + 80, 268);

            // Divider
            ctx.strokeStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(r.x + 20, 295);
            ctx.lineTo(r.x + 260, 295);
            ctx.stroke();

            // Bullet points
            let by = 330;
            r.points.forEach((pt) => {
              ctx.fillStyle = r.color;
              ctx.font = 'bold 14px system-ui, sans-serif';
              ctx.fillText('✓', r.x + 24, by);
              ctx.fillStyle = '#E2E8F0';
              ctx.font = '500 12px system-ui, sans-serif';
              ctx.fillText(pt, r.x + 44, by);
              by += 44;
            });
          });

          // Connector Arrows
          drawConnectorArrow(425, 380);
          drawConnectorArrow(785, 380);

          // Bottom Banner
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.roundRect(140, 610, 1000, 50, 12);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.stroke();

          ctx.fillStyle = '#2DD4BF';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.fillText('Care Circle Loop:', 160, 640);
          ctx.fillStyle = '#F1F5F9';
          ctx.font = '500 13px system-ui, sans-serif';
          ctx.fillText('Clear clinical coordination with complete patient consent protection and active logging.', 290, 640);
        }

        // Scene 3: Permissions & Consent
        function renderScene3(t) {
          drawBadge('STEP 3: GRANULAR CONSENT & PRIVACY', '#D97706');
          drawHeading('Permissions & Time-Bound Consent', 'Patient controls who can view sensitive health information with time-limited access and instant revocation');

          // Center Card
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.roundRect(200, 200, 880, 440, 20);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Title in card
          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillText('Consent Authorization Request', 240, 240);

          ctx.fillStyle = '#94A3B8';
          ctx.font = '500 13px system-ui, sans-serif';
          ctx.fillText('Doctor: Dr. A. Mehta (Civil Hospital - Cardiology)', 240, 265);

          // 6 Category pills
          const cats = [
            { name: '✓ Clinical Encounters', sel: true },
            { name: '✓ Lab Reports & Tests', sel: true },
            { name: '✓ Active Prescriptions', sel: true },
            { name: '✓ Vital Signs History', sel: true },
            { name: '✗ Genetic Testing', sel: false },
            { name: '✗ Sensitive Notes', sel: false },
          ];

          let cx = 240;
          let cy = 300;
          cats.forEach((c, idx) => {
            if (idx === 3) { cx = 240; cy += 48; }
            ctx.fillStyle = c.sel ? '#134E4A' : '#0F172A';
            ctx.beginPath();
            ctx.roundRect(cx, cy, 250, 38, 8);
            ctx.fill();
            ctx.strokeStyle = c.sel ? '#0D9488' : '#334155';
            ctx.stroke();

            ctx.fillStyle = c.sel ? '#5EEAD4' : '#64748B';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillText(c.name, cx + 16, cy + 24);
            cx += 270;
          });

          // Duration window box
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.roundRect(240, 410, 800, 70, 10);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.stroke();

          ctx.fillStyle = '#94A3B8';
          ctx.font = '500 12px system-ui, sans-serif';
          ctx.fillText('Authorized Timeframe (Auto-Expires):', 260, 435);
          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.fillText('7 Days (Active until 10 October 2026, 18:00) — Can be revoked at any second', 260, 460);

          // Action buttons
          ctx.fillStyle = '#0D9488';
          ctx.beginPath();
          ctx.roundRect(240, 510, 240, 48, 12);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.fillText('✓ Grant Consent', 290, 540);

          ctx.fillStyle = '#991B1B';
          ctx.beginPath();
          ctx.roundRect(500, 510, 240, 48, 12);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.fillText('✕ Revoke Instantly', 545, 540);

          // Notice
          ctx.fillStyle = '#FDE68A';
          ctx.font = '600 12px system-ui, sans-serif';
          ctx.fillText('Patient Privacy: Clinicians access records only with active, unexpired patient consent.', 240, 595);
        }

        // Scene 4: Medical Records
        function renderScene4(t) {
          drawBadge('STEP 4: CLINICAL MEDICAL RECORDS', '#059669');
          drawHeading('Medical Records & Clinical Data Flow', 'Upload past hospital reports and review extracted clinical flowsheets');

          // Left Box: Document Upload
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.roundRect(140, 200, 460, 430, 20);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 17px system-ui, sans-serif';
          ctx.fillText('Uploaded Medical Reports', 170, 238);

          const docs = [
            { name: 'Discharge_Summary_Civil_Hospital.pdf', date: '28 Sep 2026', size: '1.2 MB' },
            { name: 'Lipid_Profile_Blood_Test.pdf', date: '15 Sep 2026', size: '480 KB' },
            { name: 'Cardiology_Consultation_Prescription.pdf', date: '02 Sep 2026', size: '210 KB' },
          ];

          let dy = 270;
          docs.forEach((d) => {
            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.roundRect(170, dy, 400, 75, 10);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.stroke();

            ctx.fillStyle = '#F1F5F9';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillText(d.name, 190, dy + 28);
            ctx.fillStyle = '#94A3B8';
            ctx.font = '500 11px system-ui, sans-serif';
            ctx.fillText('Uploaded: ' + d.date + ' • ' + d.size, 190, dy + 52);
            dy += 90;
          });

          // Right Box: Automated Quantitative Flowsheet
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.roundRect(640, 200, 500, 430, 20);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 17px system-ui, sans-serif';
          ctx.fillText('Extracted Clinical Flowsheet', 670, 238);

          const labs = [
            { test: 'Fasting Blood Glucose', val: '108 mg/dL', status: 'Normal', color: '#34D399' },
            { test: 'HbA1c (Glycated Hemoglobin)', val: '5.8 %', status: 'Normal', color: '#34D399' },
            { test: 'Total Cholesterol', val: '182 mg/dL', status: 'Optimal', color: '#34D399' },
            { test: 'Blood Pressure (Systolic/Diastolic)', val: '124/82 mmHg', status: 'Controlled', color: '#34D399' },
          ];

          let ly = 270;
          labs.forEach((l) => {
            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.roundRect(670, ly, 440, 68, 10);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.stroke();

            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.fillText(l.test, 690, ly + 28);
            ctx.fillStyle = '#5EEAD4';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(l.val, 690, ly + 50);

            ctx.fillStyle = l.color;
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.fillText(l.status, 1030, ly + 40);
            ly += 78;
          });

          // Bottom notice
          ctx.fillStyle = '#0D9488';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.fillText('✓ Document access and downloads are logged in the patient activity trail', 170, 610);
        }

        // Scene 5: Health Insights
        function renderScene5(t) {
          drawBadge('STEP 5: CLINICAL HEALTH INSIGHTS', '#8B5CF6');
          drawHeading('AI-Assisted Health Insights', 'AI-assisted clinical synthesis with clinician review');

          // Large Dashboard Box
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.roundRect(140, 200, 1000, 430, 20);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.stroke();

          // 4 Insight Quadrants
          const insights = [
            {
              title: 'Past Clinical Trajectory',
              color: '#38BDF8',
              body: 'Chronological timeline of documented clinical encounters, historical vitals, and previous care interactions.'
            },
            {
              title: 'Current Clinical Status',
              color: '#34D399',
              body: 'Documented vitals and active prescriptions reviewed with attending clinical staff.'
            },
            {
              title: 'Trend Progression Analysis',
              color: '#FBBF24',
              body: 'Longitudinal patterns across lab markers and vital readings documented over successive clinical consultations.'
            },
            {
              title: 'Future Risk Signals',
              color: '#A78BFA',
              body: 'Advisory indicators for follow-up scheduling to assist the care team during routine review.'
            }
          ];

          let ix = 170;
          let iy = 230;
          insights.forEach((item, idx) => {
            if (idx === 2) { ix = 170; iy = 380; }
            if (idx === 1 || idx === 3) { ix = 660; }

            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.roundRect(ix, iy, 450, 125, 12);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.stroke();

            ctx.fillStyle = item.color;
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.fillText(item.title, ix + 16, iy + 26);

            ctx.fillStyle = '#E2E8F0';
            ctx.font = '500 11px system-ui, sans-serif';
            wrapText(ctx, item.body, ix + 16, iy + 48, 418, 16);
          });

          // Safety Box
          ctx.fillStyle = '#78350F';
          ctx.beginPath();
          ctx.roundRect(170, 530, 940, 50, 10);
          ctx.fill();
          ctx.strokeStyle = '#D97706';
          ctx.stroke();

          ctx.fillStyle = '#FEF3C7';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.fillText('⚠️ Clinical Advisory: AI-assisted clinical synthesis with clinician review. Licensed clinicians make all clinical decisions.', 180, 560);

          // Outro Tagline
          ctx.fillStyle = '#2DD4BF';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.fillText('ArogyaMitra EHR — Healthcare You Govern. Records You Own.', 440, 610);
        }

        // Helper: Badge
        function drawBadge(text, color) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(80, 96, 320, 26, 8);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillText(text, 92, 113);
        }

        // Helper: Heading
        function drawHeading(title, subtitle) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 26px system-ui, sans-serif';
          ctx.fillText(title, 80, 155);
          ctx.fillStyle = '#94A3B8';
          ctx.font = '500 13px system-ui, sans-serif';
          ctx.fillText(subtitle, 80, 178);
        }

        // Helper: Connector Arrow
        function drawConnectorArrow(x, y) {
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(x, y, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#64748B';
          ctx.stroke();

          ctx.fillStyle = '#2DD4BF';
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.fillText('→', x - 6, y + 5);
        }

        // Helper: Text Wrapping
        function wrapText(context, text, x, y, maxWidth, lineHeight) {
          const words = text.split(' ');
          let line = '';
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              context.fillText(line, x, y);
              line = words[n] + ' ';
              y += lineHeight;
            } else {
              line = testLine;
            }
          }
          context.fillText(line, x, y);
        }

        // Animation Loop at 25 fps for 55 seconds
        const frameInterval = 40; // 25 fps
        const totalFrames = DURATION_SEC * 25; // 1375 frames
        let frameCount = 0;

        return new Promise((resolve) => {
          const timer = setInterval(() => {
            const elapsedMs = frameCount * frameInterval;
            const elapsedSec = elapsedMs / 1000;
            drawFrame(elapsedSec);
            frameCount++;

            if (frameCount >= totalFrames) {
              clearInterval(timer);
              recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64 = reader.result.split(',')[1];
                  resolve({
                    duration: DURATION_SEC,
                    size: blob.size,
                    mimeType: blob.type,
                    base64
                  });
                };
                reader.readAsDataURL(blob);
              };
              recorder.stop();
            }
          }, frameInterval);
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log("Recording in progress... (this will take ~55 seconds for a genuine 55s video)");
    const result = await evalPromise;
    console.log("Video generation completed!");
    console.log("Duration:", result.result.value.duration, "s");
    console.log("Size:", result.result.value.size, "bytes");
    console.log("MIME Type:", result.result.value.mimeType);

    const buf = Buffer.from(result.result.value.base64, 'base64');
    fs.writeFileSync(TARGET_FILE, buf);
    console.log("Wrote file to:", TARGET_FILE, "Size:", fs.statSync(TARGET_FILE).size);
    fs.writeFileSync(TARGET_FILE_2, buf);
    console.log("Wrote file to:", TARGET_FILE_2, "Size:", fs.statSync(TARGET_FILE_2).size);

    ws.close();
    edge.kill();
    process.exit(0);
  } catch (err) {
    console.error("Video generation failed:", err);
    edge.kill();
    process.exit(1);
  }
}, 1500);
