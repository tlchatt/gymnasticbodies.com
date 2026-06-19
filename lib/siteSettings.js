import { db } from '@/Drizzle';
import { site_settings, pages } from '@/Drizzle/db/schema';
import { inArray, eq } from 'drizzle-orm';

// Fetch one or more site_settings keys in a single query.
// Returns a keyed object: { nav: value, footer: value, ... }
// Missing keys return null.
export async function getSiteSettings(...keys) {
  if (!keys.length) return {};
  const rows = await db
    .select()
    .from(site_settings)
    .where(inArray(site_settings.key, keys));

  const result = Object.fromEntries(keys.map(k => [k, null]));
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// Fetch a single page row from the pages table by slug.
export async function getPage(slug) {
  const rows = await db.select().from(pages).where(eq(pages.slug, slug));
  return rows[0] || null;
}
