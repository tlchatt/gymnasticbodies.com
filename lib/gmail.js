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

// Strips HTML tags and decodes common entities, returning readable plain text.
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Finds the raw HTML body from a message payload (recursive).
function extractHtmlRaw(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/html') return decodeBody(payload.body?.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      const html = extractHtmlRaw(part);
      if (html) return html;
    }
  }
  return '';
}

// Extracts plain-text body from a Gmail message payload.
// First tries text/plain; falls back to stripping text/html if none found.
function extractPlainText(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain') return decodeBody(payload.body?.data);
  if (payload.parts) {
    // First pass: look for text/plain recursively
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
    // Second pass: fall back to text/html
    for (const part of payload.parts) {
      const html = extractHtmlRaw(part);
      if (html) return stripHtml(html);
    }
  }
  // Top-level HTML-only message
  if (payload.mimeType === 'text/html') return stripHtml(decodeBody(payload.body?.data));
  return '';
}

// Addresses that belong to the group infrastructure — not real customer senders.
const GROUP_ADDRESSES = [
  'gymnasticbodies.com',
  'googlegroups.com',
  'noreply',
];

function isGroupAddress(email) {
  if (!email) return true;
  const lower = email.toLowerCase();
  return GROUP_ADDRESSES.some((g) => lower.includes(g));
}

// Resolves the real sender from email headers, handling Google Groups DMARC rewriting.
// Priority: X-Original-Sender/X-Original-From → Reply-To (if not group addr) → From
function resolveSender(headers) {
  // 1. X-Original-Sender / X-Original-From (added by Google Groups when rewriting From for DMARC)
  const xOriginal = (
    headers['x-original-sender'] ??
    headers['x-original-from'] ??
    ''
  ).trim();
  const xOriginalEmail = xOriginal.match(/([^\s@<]+@[^\s>]+)/)?.[1]?.toLowerCase();
  if (xOriginalEmail && !isGroupAddress(xOriginalEmail)) {
    // These headers typically contain just an email address, no display name
    return { fromEmail: xOriginalEmail, fromName: xOriginalEmail };
  }

  // 2. Reply-To (Google Groups may set this to original sender when rewriting From)
  const replyTo = headers['reply-to'] ?? '';
  const rtFull = replyTo.match(/^(.+?)\s*<([^>]+)>/);
  const rtBare = !rtFull ? replyTo.match(/([^\s@<]+@[^\s>]+)/) : null;
  const rtEmail = (rtFull ? rtFull[2] : rtBare?.[1] ?? '').trim().toLowerCase();
  if (rtEmail && !isGroupAddress(rtEmail)) {
    const rtName = rtFull
      ? rtFull[1].trim().replace(/^["']|["']$/g, '')
      : rtEmail;
    return { fromEmail: rtEmail, fromName: rtName };
  }

  // 3. From header — when Google Groups rewrites it the format is:
  //    "Real Name via Group Name <group@address>"
  //    Extract the customer display name; email comes from step 1/2 so if we're
  //    here without an email the group address is the best we have.
  const fromHeader = headers['from'] ?? '';
  const viaMatch = fromHeader.match(/^["']?(.+?)["']?\s+via\s+/i);
  const fromMatch = fromHeader.match(/^(.+?)\s*<([^>]+)>/);
  const plainEmail = fromHeader.match(/([^\s@<]+@[^\s>]+)/)?.[1] ?? '';

  const fromName = viaMatch
    ? viaMatch[1].trim()
    : fromMatch
      ? fromMatch[1].trim().replace(/^["']|["']$/g, '')
      : fromHeader;
  const fromEmail = (fromMatch ? fromMatch[2] : plainEmail).trim().toLowerCase();

  return { fromName, fromEmail };
}

// Parses a contact form submission email (sent by SendGrid from contact@gymnasticbodies.com).
// The HTML body contains "Name: X", "Email: Y", "Message: Z" fields.
// Returns a single { fromName, fromEmail, subject, body, receivedAt } or null.
function parseContactFormEmail(rawMessage, headers, internalDate) {
  const htmlRaw = extractHtmlRaw(rawMessage.payload);
  const text = htmlRaw ? stripHtml(htmlRaw) : '';

  // Priority 1: "Email: addr" pattern in the HTML body (most reliable for contact forms)
  const emailMatch = text.match(/Email:\s*([^\s@]+@[^\s\n,]+)/i);
  let fromEmail = emailMatch ? emailMatch[1].trim().toLowerCase() : null;
  let fromName = null;

  if (!fromEmail) return null;

  // Extract customer name from HTML body
  const nameMatch = text.match(/Name:\s*([^\n]+)/i);
  fromName = nameMatch ? nameMatch[1].trim() : fromEmail;

  // Extract message body — look for content between the name/message line and "Sender Contact"
  const messageBodyMatch = text.match(/(?:Message|Comment)[:\s]+([^\n][\s\S]*?)(?:\n\nSender Contact|\nSender Contact|$)/i);
  const body = messageBodyMatch ? messageBodyMatch[1].trim() : text;

  const subject = headers['subject'] ?? 'Contact Form Submission';

  return { fromName, fromEmail, subject, body, receivedAt: internalDate };
}

// Parses a Google Groups digest or forwarded support email.
// Returns array of { fromName, fromEmail, subject, body, receivedAt }.
export function parseDigest(rawMessage) {
  const headers = Object.fromEntries(
    (rawMessage.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
  );
  const digestSubject = headers['subject'] ?? '';
  const internalDate = rawMessage.internalDate
    ? new Date(parseInt(rawMessage.internalDate))
    : new Date();

  // Detect contact form submissions from SendGrid (from: contact@gymnasticbodies.com)
  const fromHeader = headers['from'] ?? '';
  const isContactForm = fromHeader.toLowerCase().includes('contact@gymnasticbodies.com');
  if (isContactForm) {
    const parsed = parseContactFormEmail(rawMessage, headers, internalDate);
    return parsed ? [parsed] : [];
  }

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

  // If no digest blocks parsed, treat as a single support email.
  // Google Groups rewrites From: for DMARC compliance — real sender is in Reply-To or X-Original-Sender.
  if (messages.length === 0) {
    const { fromName, fromEmail } = resolveSender(headers);
    const subject = digestSubject || '(no subject)';
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
