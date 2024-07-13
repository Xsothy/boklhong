// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, sql } from "drizzle-orm";
import {
    pgTableCreator,
    serial,
    timestamp,
    varchar,
    numeric,
    text,
    primaryKey,
    integer,
} from "drizzle-orm/pg-core";
import type { AdapterAccount as AdapterAccountType } from "next-auth/adapters"

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */

export const timeStampColumns = {
    createdAt: timestamp("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at"),
    deleteAt: timestamp("delete_at"),
};

export const createTable = pgTableCreator((name) => `boklhong_${name}`);

export const posts = createTable("post", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }),
    ...timeStampColumns,
});

// -- Table: clothes
// CREATE TABLE clothes (
//     id SERIAL PRIMARY KEY,
//     title VARCHAR(255) NOT NULL,
//     slug VARCHAR(255) UNIQUE NOT NULL,
//     summary TEXT,
//     description TEXT,
//     price NUMERIC DEFAULT 0
// );

export const products = createTable("product", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull(),
    summary: text("summary"),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }),
    image: varchar("image", { length: 256 }),
    ...timeStampColumns,
});

export const productRelations = relations(products, ({ many }) => ({
    sizes: many(sizes),
    colors: many(colors),
    productStocks: many(productStocks),
}));

// -- Table: sizes
// CREATE TABLE sizes (
//     id SERIAL PRIMARY KEY,
//     name VARCHAR(50) NOT NULL
// );

export const sizes = createTable("size", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 10 }).notNull(),
});

export const sizeRelations = relations(sizes, ({ many }) => ({
    product: many(products),
}));

// -- Table: colors
// CREATE TABLE colors (
//     id SERIAL PRIMARY KEY,
//     name VARCHAR(50) NOT NULL,
//     code VARCHAR(10) NOT NULL
// );

export const colors = createTable("color", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    ...timeStampColumns,
});

export const colorRelations = relations(colors, ({ many }) => ({
    product: many(products),
}));

// -- Table: clothes_stock
// CREATE TABLE clothes_stock (
//     cloth_id INT REFERENCES clothes(id) ON DELETE CASCADE,
//     size_id INT REFERENCES sizes(id) ON DELETE CASCADE,
//     color_id INT REFERENCES colors(id) ON DELETE CASCADE,
//     stock INT,
//     PRIMARY KEY (cloth_id, size_id, color_id)
// );

export const productStocks = createTable(
    "product_stock",
    {
        productId: serial("product_id").references(() => products.id, {
            onDelete: "cascade",
        }),
        sizeId: serial("size_id").references(() => sizes.id, {
            onDelete: "cascade",
        }),
        colorId: serial("color_id").references(() => colors.id, {
            onDelete: "cascade",
        }),
        stock: numeric("stock", { precision: 10, scale: 2 }),
        ...timeStampColumns,
    },
    (table) => ({
        pk: primaryKey({
            columns: [table.productId, table.sizeId, table.colorId],
        }),
    }),
);

export const productStockRelations = relations(productStocks, ({ one }) => ({
    product: one(products, {
        fields: [productStocks.productId],
        references: [products.id],
    }),
    size: one(sizes, {
        fields: [productStocks.sizeId],
        references: [sizes.id],
    }),
    color: one(colors, {
        fields: [productStocks.colorId],
        references: [colors.id],
    }),
}));

// -- Table: clothes_rates
// CREATE TABLE clothes_rates (
//     cloth_id INT REFERENCES clothes(id) ON DELETE CASCADE,
//     user_id INT, -- Assuming there's a users table referencing this
// rates INT,
//     comments TEXT,
//     PRIMARY KEY (cloth_id, user_id)
// );

// export const productRates = createTable(
//     "product_rate",
//     {
//         productId: serial("product_id").references(products.id, {
//             onDelete: "CASCADE",
//         }),
//         userId: serial("user_id"),
//         rate: numeric("rate", { precision: 10, scale: 2 }),
//         comments: text("comments"),
//         ...timeStampColumns,
//     },
//     (example) => ({
//         productIndex: index("product_rate_idx").on(example.productId),
//     }),
// );

// ============AUTHENTICATION================
export const users = createTable("user", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
})

export const accounts = createTable(
    "account",
    {
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccountType>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
    })
)

export const sessions = createTable("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = createTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (vt) => ({
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    })
)
