#!/usr/bin/env node
/**
 * One-time OAuth setup for Gmail API access.
 *
 * Before running:
 *   1. In Google Cloud Console → Credentials → your OAuth 2.0 Client ID
 *      → add  http://localhost:8080/callback  to "Authorized redirect URIs" and save.
 *   2. Ensure GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are set in .env.
 *
 * Run: node --env-file=.env scripts/gmail-auth.js
 *
 * A browser window will open. Log in as admin@gymnasticbodies.com and approve.
 * The refresh token is printed — copy it into .env as GMAIL_REFRESH_TOKEN.
 */

import { google } from 'googleapis';
import http from 'http';
import { exec } from 'child_process';

const CLIENT_ID     = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:8080/callback';
const PORT          = 8080;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') {
    res.end('Not found'); return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.end('No code in callback — try again.'); return;
  }

  res.end('<html><body><h2>✅ Authorized! Check your terminal.</h2></body></html>');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Authorization successful!\n');
    console.log('Add this to your .env file:\n');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nDone — you can close this terminal.');
  } catch (err) {
    console.error('Error exchanging code:', err.message);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`\nOpening browser for admin@gymnasticbodies.com authorization…`);
  console.log(`(If it doesn't open, visit: ${authUrl})\n`);
  // Try xdg-open, then fallback to printing the URL
  exec(`xdg-open "${authUrl}" 2>/dev/null || open "${authUrl}" 2>/dev/null || true`);
});
