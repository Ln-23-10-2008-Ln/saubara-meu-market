/**
 * RC1.2 — Re-hash de todos os usuários com novo PEPPER
 * Executar: bun run rehash-users.ts
 */
import { hashPasswordArgon2 } from "./src/services/auth-service";
import { db } from "./src/db";
import { users } from "./src/schema";

// Senhas conhecidas dos usuários de teste/produção
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
    console.log(`  ⚠️  ${u.email} — senha desconhecida, pulado (precisará resetar)`);
    skipped++;
    continue;
  }
  const newHash = await hashPasswordArgon2(pw);
  await db.update(users).set({ password_hash: newHash }).where((t) => t.id.equals(u.id));
  console.log(`  ✅ ${u.email} — re-hashed`);
  rehashed++;
}

console.log(`\nConcluído: ${rehashed} re-hashed, ${skipped} requerem reset de senha.`);
