import { config } from "dotenv";

config({ path: ".env.test", override: true });
process.env.ALLOW_FAKE_PROVIDER = "true";
process.env.EMBEDDED_WORKER = "false";
