/**
 * Setup script for Vercel Blob Storage
 * Run this with: VERCEL_TOKEN=your_token node setup-blob-store.js
 */

const https = require('https');

const PROJECT_ID = 'prj_iYSNGECXM2X6BX2UtCQ0kDEkmSfg';
const TEAM_ID = 'team_tH7hAdgoBHOptn2QYF0cNye7';

async function createBlobStore() {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    console.error('ERROR: VERCEL_TOKEN environment variable not set');
    console.error('\nTo get your token:');
    console.error('1. Go to https://vercel.com/account/tokens');
    console.error('2. Create a new token');
    console.error('3. Run: set VERCEL_TOKEN=your_token && node setup-blob-store.js');
    process.exit(1);
  }

  console.log('Creating Vercel Blob store...');

  const data = JSON.stringify({
    name: 'calculator-app-uploads',
    stores: [{
      type: 'blob'
    }]
  });

  const options = {
    hostname: 'api.vercel.com',
    path: `/v1/storage/stores?teamId=${TEAM_ID}`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const result = JSON.parse(body);
          console.log('✓ Blob store created:', result);
          resolve(result);
        } else {
          console.error('✗ Failed to create blob store:', res.statusCode, body);
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function linkStoreToProject(storeId) {
  const token = process.env.VERCEL_TOKEN;

  console.log('Linking store to project...');

  const data = JSON.stringify({
    storeId: storeId
  });

  const options = {
    hostname: 'api.vercel.com',
    path: `/v1/projects/${PROJECT_ID}/link?teamId=${TEAM_ID}`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✓ Store linked to project');
          const result = JSON.parse(body);
          console.log('✓ Environment variable BLOB_READ_WRITE_TOKEN added automatically');
          resolve(result);
        } else {
          console.error('✗ Failed to link store:', res.statusCode, body);
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    const store = await createBlobStore();
    if (store && store.id) {
      await linkStoreToProject(store.id);
      console.log('\n✓ Vercel Blob Storage setup complete!');
      console.log('✓ BLOB_READ_WRITE_TOKEN added to environment variables');
      console.log('\nNext: Redeploy your project');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
