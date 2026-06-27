/**
 * One-off admin password reset — does NOT send email.
 *
 * Usage (from repo root):
 *   set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 *   npx tsx scripts/admin-set-password.ts your@email.com "NewSecurePassword123"
 *
 * Get the service role key: Supabase Dashboard → Project Settings → API → service_role (secret).
 * Never commit that key. Remove it from .env.local when done.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.argv[2]?.trim();
const newPassword = process.argv[3];

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!email || !newPassword) {
  console.error('Usage: npx tsx scripts/admin-set-password.ts "you@example.com" "NewPassword123"');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error("Could not list users:", listError.message);
    process.exit(1);
  }

  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error("Could not update password:", updateError.message);
    process.exit(1);
  }

  console.log(`Password updated for ${email} (user id: ${user.id}).`);
  console.log("Sign in at /auth/login with Password tab.");
}

main();
