import fs from 'fs';

const content = fs.readFileSync('x:/EHR/care-consent/generate_how_it_works_video.mjs', 'utf8');

const forbidden = [
  'ABHA',
  'encryption guarantee',
  'encrypted upload',
  'HIPAA',
  'compliance guarantee',
  'autonomous diagnosis',
  'autonomous treatment'
];

console.log('--- FORBIDDEN CLAIMS CHECK ---');
let allForbiddenAbsent = true;
forbidden.forEach(term => {
  const regex = new RegExp(term, 'i');
  const found = regex.test(content);
  if (found) allForbiddenAbsent = false;
  console.log(`${term}: ${found ? 'FOUND (FAIL)' : 'ABSENT (PASS)'}`);
});

console.log('\n--- REQUIRED WORDING CHECK ---');
const req1 = 'Create your patient account and sign in securely';
const req2 = 'AI-assisted clinical synthesis with clinician review';

const hasReq1 = content.includes(req1);
const hasReq2 = content.includes(req2);

console.log(`"${req1}": ${hasReq1 ? 'PRESENT (PASS)' : 'MISSING (FAIL)'}`);
console.log(`"${req2}": ${hasReq2 ? 'PRESENT (PASS)' : 'MISSING (FAIL)'}`);

if (allForbiddenAbsent && hasReq1 && hasReq2) {
  console.log('\nOVERALL CONTENT CHECK: PASS');
} else {
  console.log('\nOVERALL CONTENT CHECK: FAIL');
  process.exit(1);
}
