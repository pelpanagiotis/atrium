import { sql } from "drizzle-orm";
import { getDb } from "./db/client";

export async function allowRequest(key: string, limit: number, windowMs: number): Promise<boolean> {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  const result = await getDb().execute<{ count: number }>(sql`
    insert into rate_limit_buckets (bucket_key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${seconds}))
    on conflict (bucket_key) do update set
      count = case when rate_limit_buckets.reset_at <= now() then 1 else rate_limit_buckets.count + 1 end,
      reset_at = case
        when rate_limit_buckets.reset_at <= now() then now() + make_interval(secs => ${seconds})
        else rate_limit_buckets.reset_at
      end
    returning count
  `);
  return Number(result[0]?.count ?? 1) <= limit;
}
