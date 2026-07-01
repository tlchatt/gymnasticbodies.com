import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index';
import { outbound_emails, user } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function firstName(fullName) {
  if (!fullName || fullName === 'N/A') return null;
  return fullName.trim().split(/\s+/)[0];
}

function render(template, vars) {
  return template
    .replace(/\{\{name\}\}/g, vars.name || '')
    .replace(/\{\{email\}\}/g, vars.email || '')
    .replace(/\{\{renewalLink\}\}/g, vars.renewalLink || '');
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { emails, subject, body, campaign, type = 'support', dryRun = false } = await request.json();

  if (!emails?.length || !subject || !body) {
    return NextResponse.json({ error: 'emails, subject, and body are required' }, { status: 400 });
  }

  const results = [];

  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || !email.includes('@')) continue;

    const [u] = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    const name = firstName(u?.name);
    const renewalLink = `https://app.gymnasticbodies.com/renew?email=${encodeURIComponent(email)}`;
    const renderedBody = render(body, { name: name || '', email, renewalLink });

    if (dryRun) {
      results.push({ email, name, renderedBody, status: 'preview' });
      continue;
    }

    try {
      const fromEmail = type === 'marketing' ? 'marketing@gymnasticbodies.com' : 'support@gymnasticbodies.com';
      await sgMail.send({
        to: email,
        from: fromEmail,
        replyTo: 'support@gymnasticbodies.com',
        subject,
        text: renderedBody,
      });

      await db.insert(outbound_emails).values({
        userId: u?.id ?? null,
        toEmail: email,
        subject,
        body: renderedBody,
        campaign: campaign || null,
        type,
        sentAt: new Date(),
      });

      results.push({ email, name, status: 'sent' });
    } catch (err) {
      results.push({ email, status: 'failed', error: err.message });
    }
  }

  return NextResponse.json({
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    dryRun,
    results,
  });
}
