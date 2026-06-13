import { hashPasswordArgon2 } from "../services/auth-service";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const knownPasswords: Record<string, string> = {
  "admin@saubara.com": "admin2024",
};

const allUsers = await db.select({ id: users.id, email: users.email }).from(users).all();
console.log(`Total usuários: ${allUsers.length}`);

let rehashed = 0;
let skipped = 0;

for (const u of allUsers) {
  const pw = knownPasswords[u.email];
  if (!pw) {
    console.log(`  ⚠️  ${u.email} — pulado (reset necessário)`);
    skipped++;
    continue;
  }
  const newHash = await hashPasswordArgon2(pw);
  await db.update(users).set({ password_hash: newHash }).where(eq(users.id, u.id));
  console.log(`  ✅ ${u.email} — re-hashed`);
  rehashed++;
}

console.log(`\n✅ Concluído: ${rehashed} re-hashed, ${skipped} precisam resetar senha.`);
