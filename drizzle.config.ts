import { type Config } from "drizzle-kit";
export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    connectionString: "postgres://default:Bl7YLcj2qPsU@ep-lucky-mode-a1w9pk7b-pooler.ap-southeast-1.aws.neon.tech:5432/verceldb?sslmode=require",
  },
  tablesFilter: ["boklhong_*"],
} satisfies Config;
