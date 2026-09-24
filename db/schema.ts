import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const competitions = sqliteTable("competitions", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  version: integer("version").notNull().default(1),
  ownerId: text("owner_id"),
});
