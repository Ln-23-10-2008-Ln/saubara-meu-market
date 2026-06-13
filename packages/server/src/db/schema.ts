import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id:                        text("id").primaryKey(),
  cpf:                       text("cpf").unique().notNull(),
  name:                      text("name").notNull(),
  email:                     text("email").unique().notNull(),
  phone:                     text("phone"),
  role:                      text("role").notNull().default("client"),    // client | seller | admin
  password_hash:             text("password_hash").notNull(),
  email_verified:            integer("email_verified", { mode: "boolean" }).notNull().default(false),
  phone_verified:            integer("phone_verified", { mode: "boolean" }).notNull().default(false),
  verify_method:             text("verify_method").default("email"),      // email | phone
  verify_code:               text("verify_code"),
  verify_code_expires:       text("verify_code_expires"),
  reset_code:                text("reset_code"),
  reset_code_expires:        text("reset_code_expires"),
  approval_status:           text("approval_status"),                     // pending | approved | rejected | suspended
  approval_note:             text("approval_note"),
  avatar:                    text("avatar"),
  address_json:              text("address_json"),
  can_sell:                  integer("can_sell", { mode: "boolean" }).notNull().default(false),
  can_buy:                   integer("can_buy", { mode: "boolean" }).notNull().default(false),

  // Seller fields
  store_name:                text("store_name"),
  store_category:            text("store_category"),
  store_whatsapp:            text("store_whatsapp"),
  store_bio:                 text("store_bio"),
  store_logo:                text("store_logo"),
  store_cover:               text("store_cover"),
  store_hours:               text("store_hours"),
  store_localidade:          text("store_localidade"),
  store_address:             text("store_address"),
  service_area_json:         text("service_area_json"),
  delivery_config_json:      text("delivery_config_json"),
  delivery_rates_json:       text("delivery_rates_json"),

  // Subscription
  subscription_status:         text("subscription_status"),              // trial | active | expired | suspended
  subscription_registered_at:  text("subscription_registered_at"),
  subscription_trial_ends_at:  text("subscription_trial_ends_at"),
  subscription_expires_at:     text("subscription_expires_at"),

  // Photos (seller docs)
  photo_responsavel:         text("photo_responsavel"),
  logo_loja:                 text("logo_loja"),
  foto_fachada:              text("foto_fachada"),

  created_at:                text("created_at").notNull(),
  updated_at:                text("updated_at").notNull(),
});

// ─── sessions ─────────────────────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  id:         text("id").primaryKey(),
  user_id:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires_at: text("expires_at").notNull(),
  created_at: text("created_at").notNull(),
});

// ─── stores ───────────────────────────────────────────────────────────────────
export const stores = sqliteTable("stores", {
  id:              text("id").primaryKey(),
  owner_id:        text("owner_id").references(() => users.id, { onDelete: "cascade" }),
  name:            text("name").notNull(),
  category:        text("category"),
  whatsapp:        text("whatsapp"),
  bio:             text("bio"),
  logo:            text("logo"),
  cover:           text("cover"),
  hours:           text("hours"),
  localidade:      text("localidade"),
  address:         text("address"),
  service_area:    text("service_area"),
  delivery_config: text("delivery_config"),
  delivery_rates:  text("delivery_rates"),
  active:          integer("active", { mode: "boolean" }).notNull().default(true),
  suspended:       integer("suspended", { mode: "boolean" }).notNull().default(false),
  created_at:      text("created_at").notNull(),
  updated_at:      text("updated_at").notNull(),
});

export type User    = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Store   = typeof stores.$inferSelect;

// ─── products ─────────────────────────────────────────────────────────────────
export const products = sqliteTable("products", {
  id:          text("id").primaryKey(),
  store_id:    text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  owner_id:    text("owner_id").references(() => users.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  description: text("description"),
  price:       text("price").notNull(),        // decimal como texto para evitar float
  category:    text("category"),
  image_url:   text("image_url"),
  unit:        text("unit"),                   // "kg", "un", "L", etc.
  stock:       integer("stock").notNull().default(0),
  available:   integer("available", { mode: "boolean" }).notNull().default(true),
  featured:    integer("featured", { mode: "boolean" }).notNull().default(false),
  sales:       integer("sales").notNull().default(0),
  created_at:  text("created_at").notNull(),
  updated_at:  text("updated_at").notNull(),
});

// ─── orders ───────────────────────────────────────────────────────────────────
export const orders = sqliteTable("orders", {
  id:            text("id").primaryKey(),
  client_id:     text("client_id").references(() => users.id, { onDelete: "set null" }),
  client_name:   text("client_name"),
  store_id:      text("store_id").notNull(),
  store_name:    text("store_name"),
  store_whatsapp: text("store_whatsapp"),
  items_json:    text("items_json").notNull(),    // JSON serializado de OrderItem[]
  subtotal:      text("subtotal").notNull(),
  delivery_fee:  text("delivery_fee").notNull().default("0"),
  total:         text("total").notNull(),
  localidade:    text("localidade"),
  address:       text("address"),
  notes:         text("notes"),
  status:        text("status").notNull().default("pending"),
  created_at:    text("created_at").notNull(),
  updated_at:    text("updated_at").notNull(),
});

export type Product = typeof products.$inferSelect;
export type Order   = typeof orders.$inferSelect;
