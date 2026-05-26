import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, serial, json, integer } from "drizzle-orm/pg-core";

export const app_logs = pgTable("app_logs", {
  id: serial("id").primaryKey(),
  ts: timestamp("ts").defaultNow().notNull(),
  level: text("level").notNull(),
  event: text("event").notNull(),
  email: text("email"),
  userId: text("user_id"),
  source: text("source").default('app.gymnasticbodies.com'),
  data: json("data"),
}, (table) => [
  index("app_logs_event_idx").on(table.event),
  index("app_logs_ts_idx").on(table.ts),
  index("app_logs_email_idx").on(table.email),
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role"),
  migrationType: text("migration_type"),
  banned: boolean("banned"),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const user_setting = pgTable("user_setting", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status:text("status"),
  postAWS:boolean("postAWS"),
  authorizeNextImport: boolean("autorize_next_import").default(false),
  authorizeCustomerId:text("autorize_customer_id"),
  awsCustomerId:text("aws_customer_id"),
  data: text("data"),
  woocommerceAuthorizeImport: boolean("woocommerce_authorize_import"),
  woocommerceSource: text("woocommerceSource"),
  trial: boolean("trial"),
  trialStartDate:timestamp("trial_start_date"),
  trialEndDate:timestamp("trial_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  subscriptionInAuthorize: boolean("subscription_in_authorize"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  authorizeSubscriptionId: text("authorize_subscription_id"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
export const user_logs = pgTable("user_logs", {
  id: serial("id").primaryKey(),  
  data: json("data"),
  progressions:json("progressions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  userScheduleDate: text("user_schedule_date"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const support_emails = pgTable("support_emails", {
  id: serial("id").primaryKey(),
  gmailMessageId: text("gmail_message_id").unique(),
  gmailThreadId: text("gmail_thread_id"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  receivedAt: timestamp("received_at").notNull(),
  status: text("status").default("open").notNull(),
  adminNotes: text("admin_notes"),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (t) => [
  index("support_emails_from_idx").on(t.fromEmail),
  index("support_emails_status_idx").on(t.status),
  index("support_emails_received_idx").on(t.receivedAt),
  index("support_emails_user_idx").on(t.userId),
]);

export const support_replies = pgTable("support_replies", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").notNull().references(() => support_emails.id, { onDelete: "cascade" }),
  adminUserId: text("admin_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  gmailMessageId: text("gmail_message_id"),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  user_settings: many(user_setting),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
export const userSettingRelations = relations(user_setting, ({ one }) => ({
  user: one(user, {
    fields: [user_setting.userId],
    references: [user.id],
  }),
}));
export const userLogsRelations = relations(user_logs, ({ one }) => ({
  user: one(user, {
    fields: [user_logs.userId],
    references: [user.id],
  }),
}));

export const supportEmailRelations = relations(support_emails, ({ one, many }) => ({
  user: one(user, {
    fields: [support_emails.userId],
    references: [user.id],
  }),
  replies: many(support_replies),
}));

export const supportReplyRelations = relations(support_replies, ({ one }) => ({
  email: one(support_emails, {
    fields: [support_replies.emailId],
    references: [support_emails.id],
  }),
  admin: one(user, {
    fields: [support_replies.adminUserId],
    references: [user.id],
  }),
}));