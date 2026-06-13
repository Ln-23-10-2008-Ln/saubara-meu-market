import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url   = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

if (!url)   throw new Error("TURSO_DATABASE_URL não definida");
if (!token) throw new Error("TURSO_AUTH_TOKEN não definida");

const libsql = createClient({ url, authToken: token });
export const db = drizzle(libsql, { schema });
export { libsql };
