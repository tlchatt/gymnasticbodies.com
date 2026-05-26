import { google } from 'googleapis';

const REDIRECT_URI = 'http://localhost:8080/callback';

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    REDIRECT_URI
  );
  client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return client;
}

export function getGmailClient() {
  return google.gmail({ version: 'v1', auth: getOAuthClient() });
}

// Returns all digest messages received after `sinceDate` (JS Date).
export async function fetchDigestsSince(sinceDate) {
  const gmail = getGmailClient();
  const afterEpoch = Math.floor(sinceDate.getTime() / 1000);
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `list:support@gymnasticbodies.com after:${afterEpoch}`,
    maxResults: 100,
  });
  const messages = res.data.messages ?? [];
  const full = await Promise.all(
    messages.map((m) =>
      gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' })
    )
  );
  return full.map((r) => r.data);
}

// Decodes a base64url-encoded Gmail part body.
function decodeBody(data) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

// Extracts the plain-text body from a Gmail message payload.
function extractPlainText(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain') return decodeBody(payload.body?.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }
  return '';
}

// Parses a Google Groups digest body into individual messages.
// Returns array of { fromName, fromEmail, subject, body, receivedAt }.
export function parseDigest(rawMessage) {
  const headers = Object.fromEntries(
    (rawMessage.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
  );
  const digestSubject = headers['subject'] ?? '';
  const internalDate = rawMessage.internalDate
    ? new Date(parseInt(rawMessage.internalDate))
    : new Date();

  const plainText = extractPlainText(rawMessage.payload);
  if (!plainText) return [];

  // Google Groups digest format: each message starts with a line like:
  //   "1. Message Subject (N messages)"
  // followed by "From: Name <email>" and the body, ending with "___"
  const messages = [];

  // Split on the separator line used in Google Groups digests
  const blocks = plainText.split(/\n_{3,}\n/);
  for (const block of blocks) {
    const fromMatch = block.match(/^From:\s*(.+?)\s*<([^>]+)>/m);
    if (!fromMatch) continue;

    const fromName = fromMatch[1].trim();
    const fromEmail = fromMatch[2].trim().toLowerCase();

    // Subject: try "Subject:" header in block, else fall back to digest subject
    const subjectMatch = block.match(/^Subject:\s*(.+)/m);
    const subject = subjectMatch ? subjectMatch[1].trim() : digestSubject;

    // Date: try "Date:" header in block
    const dateMatch = block.match(/^Date:\s*(.+)/m);
    const receivedAt = dateMatch ? new Date(dateMatch[1].trim()) : internalDate;

    // Body: everything after the headers (blank line separates headers from body)
    const bodyStart = block.indexOf('\n\n');
    const body = bodyStart >= 0 ? block.slice(bodyStart + 2).trim() : block.trim();

    if (fromEmail && subject && body) {
      messages.push({ fromName, fromEmail, subject, body, receivedAt });
    }
  }

  // If no digest blocks parsed (non-digest email, or a single forwarded message),
  // treat the whole message as a single support email.
  if (messages.length === 0) {
    const fromHeader = headers['from'] ?? '';
    const fromMatch2 = fromHeader.match(/^(.+?)\s*<([^>]+)>/);
    const fromName = fromMatch2 ? fromMatch2[1].trim() : fromHeader;
    const fromEmail = (fromMatch2 ? fromMatch2[2] : fromHeader).trim().toLowerCase();
    const subject = headers['subject'] ?? '(no subject)';
    const body = plainText.trim();
    if (fromEmail && body) {
      messages.push({ fromName, fromEmail, subject, body, receivedAt: internalDate });
    }
  }

  return messages;
}

// Sends an email from the Send As alias (support@gymnasticbodies.com).
export async function sendSupportEmail({ to, subject, body }) {
  const gmail = getGmailClient();
  const from = process.env.GMAIL_SEND_AS ?? 'support@gymnasticbodies.com';

  const raw = [
    `From: Gymnastic Bodies Support <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  const encoded = Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });
  return res.data;
}
