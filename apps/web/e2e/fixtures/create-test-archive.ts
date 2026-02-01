/**
 * Script to create a test LinkedIn archive for E2E testing
 *
 * Run with: npx ts-node create-test-archive.ts
 */

import AdmZip from 'adm-zip';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const zip = new AdmZip();

// Create Connections.csv with test data
const connectionsContent = `First Name,Last Name,Email Address,Company,Position,Connected On
John,Smith,john.smith@acme.com,ACME Corporation,Software Engineer,15 Jan 2026
Jane,Doe,jane.doe@techcorp.com,TechCorp Inc,Product Manager,20 Jan 2026
Bob,Wilson,bob.wilson@startup.io,Startup.io,CTO,22 Jan 2026
Alice,Johnson,alice.j@bigco.com,BigCo,VP Engineering,25 Jan 2026
Charlie,Brown,charlie@example.com,Example LLC,Developer,28 Jan 2026
Diana,Prince,diana@wonder.tech,Wonder Tech,CEO,30 Jan 2026
Edward,Norton,ed.norton@movie.co,Movie Co,Director,01 Feb 2026
Fiona,Apple,,Music Inc,Artist,02 Feb 2026
George,Lucas,george@lucasfilm.com,Lucasfilm,Founder,03 Feb 2026
Helen,Troy,helen@troy.com,Troy Industries,Manager,04 Feb 2026`;

zip.addFile('Connections.csv', Buffer.from(connectionsContent));

// Create messages.csv with test data
const messagesContent = `CONVERSATION ID,FROM,TO,DATE,CONTENT
conv-001,Test User,John Smith,2026-01-16 10:00:00 UTC,Hey John, great connecting!
conv-001,John Smith,Test User,2026-01-16 10:30:00 UTC,Thanks! Looking forward to chatting.
conv-002,Test User,Jane Doe,2026-01-21 14:00:00 UTC,Hi Jane, saw your profile and wanted to connect.
conv-002,Jane Doe,Test User,2026-01-21 14:15:00 UTC,Hi! Happy to connect. What are you working on?
conv-003,Bob Wilson,Test User,2026-01-23 09:00:00 UTC,Would love to discuss our startup with you.
conv-003,Test User,Bob Wilson,2026-01-23 09:30:00 UTC,Sure! Let me know when works for you.`;

zip.addFile('messages.csv', Buffer.from(messagesContent));

// Write the ZIP file
const outputPath = path.join(__dirname, 'test-linkedin-archive.zip');
zip.writeZip(outputPath);

console.log(`Created test archive at: ${outputPath}`);
console.log('Contents:');
console.log('- Connections.csv: 10 test connections');
console.log('- messages.csv: 6 test messages in 3 conversations');
