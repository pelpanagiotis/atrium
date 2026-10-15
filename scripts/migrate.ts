import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL_MIGRATE;
if (!url) {
  throw new Error("DATABASE_URL_MIGRATE is required");
}
const migrateUrl: string = url;

async function main(): Promise<void> {
  const sql = postgres(migrateUrl, { max: 1, onnotice: () => undefined });
  await sql`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const directory = path.join(process.cwd(), "db", "migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const applied = await sql`select id from schema_migrations where id = ${file}`;
    if (applied.length > 0) {
      console.log(`skip ${file}`);
      continue;
    }
    const body = await readFile(path.join(directory, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (id) values (${file})`;
    });
    console.log(`applied ${file}`);
  }

  await sql.end();
}

void main();
