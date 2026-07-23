/**
 * /api/user/id — email -> Neon userId resolver.
 * Fallback for legacy-authed my.gymnasticbodies.com sessions whose registerWPass call
 * failed silently, leaving the frontend without a Neon UUID for the workout routes.
 *
 * GET ?email=  -> { id, name } | 404
 */
import { getUserWithEmail } from "@/lib/userSettings";
import { corsJson, corsOptions } from "@/lib/workout";

export async function OPTIONS() { return corsOptions(); }

export async function GET(request) {
    try {
        const email = request.nextUrl.searchParams.get('email');
        if (!email) return corsJson({ error: 'email required' }, 400);
        const u = await getUserWithEmail(String(email).trim().toLowerCase());
        if (!u) return corsJson({ error: 'not found' }, 404);
        return corsJson({ id: u.id, name: u.name });
    } catch (error) {
        console.log('user/id GET error:', error);
        return corsJson({ error: error.message }, 400);
    }
}
