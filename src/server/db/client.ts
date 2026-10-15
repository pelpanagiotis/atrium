import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

type Sql = ReturnType<typeof postgres>;

let appSql: Sql | null = null;
let workerSql: Sql | null = null;
let appDb: Database | null = null;
let workerDb: Database | null = null;

function connect(url: string): Sql {
  return postgres(url, { max: 8, prepare: false, onnotice: () => undefined });
}

export function getDb(): Database {
  if (!appDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    appSql = connect(url);
    appDb = drizzle(appSql, { schema });
  }
  return appDb;
}

export function getWorkerDb(): Database {
  if (!workerDb) {
    const url = process.env.DATABASE_URL_WORKER;
    if (!url) throw new Error("DATABASE_URL_WORKER is required");
    workerSql = connect(url);
    workerDb = drizzle(workerSql, { schema });
  }
  return workerDb;
}

export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Invalid user id");
  }
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
    return fn(tx);
  });
}

export async function withWorker<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getWorkerDb().transaction(async (tx) => fn(tx));
}

export async function closeDb(): Promise<void> {
  await appSql?.end();
  await workerSql?.end();
  appSql = null;
  workerSql = null;
  appDb = null;
  workerDb = null;
}
