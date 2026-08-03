import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require$1 = createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let db;
function initDatabase() {
  const Database = require$1("better-sqlite3");
  const dbPath = path.join(app.getPath("userData"), "finance.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name    TEXT    NOT NULL,
      type           TEXT    NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL')),
      amount_cents    BIGINT  NOT NULL,
      payment_method TEXT    NOT NULL DEFAULT 'نقداً',
      status         TEXT    NOT NULL DEFAULT 'COMPLETED',
      is_pinned      INTEGER NOT NULL DEFAULT 0,
      is_archived    INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const tableInfo = db.pragma("table_info(transactions)");
  const colNames = new Set(tableInfo.map((col) => col.name));
  if (!colNames.has("payment_method")) {
    try {
      db.exec(`ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'نقداً'`);
    } catch {
    }
  }
  if (!colNames.has("is_pinned")) {
    try {
      db.exec(`ALTER TABLE transactions ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0`);
    } catch {
    }
  }
  if (!colNames.has("is_archived")) {
    try {
      db.exec(`ALTER TABLE transactions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`);
    } catch {
    }
  }
  const count = db.prepare("SELECT COUNT(*) as c FROM transactions").get();
  if (count.c === 0) {
    const seed = db.prepare(`
      INSERT INTO transactions (client_name, type, amount_cents, payment_method, status, is_pinned, is_archived, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seedData = [
      ["الفندق", "WITHDRAWAL", 1e9, "نقداً", "COMPLETED", 1, 0, "2026-08-02 10:04:00"],
      ["ffff", "DEPOSIT", 5e6, "نقداً", "COMPLETED", 0, 0, "2026-08-02 09:51:00"],
      ["الفندق", "DEPOSIT", 5e5, "تحويل مصرفي", "COMPLETED", 0, 0, "2026-08-02 08:55:00"],
      ["شركة المدار الجديد", "DEPOSIT", 125e4, "تحويل مصرفي", "COMPLETED", 0, 0, "2026-07-28 09:15:00"],
      ["مصرف ليبيا المركزي", "DEPOSIT", 35e5, "تحويل مصرفي", "COMPLETED", 0, 0, "2026-07-28 11:30:00"],
      ["شركة ليبيانا للهاتف المحمول", "WITHDRAWAL", 5e5, "نقداً", "COMPLETED", 0, 0, "2026-07-29 08:45:00"],
      ["شركة الشرارة للخدمات النفطية", "DEPOSIT", 75e4, "بطاقة", "COMPLETED", 0, 0, "2026-07-29 14:20:00"],
      ["مصرف الجمهورية - طرابلس", "WITHDRAWAL", 2e5, "نقداً", "COMPLETED", 0, 0, "2026-07-30 10:05:00"],
      ["مؤسسة البناء والتعمير", "DEPOSIT", 2e6, "تحويل مصرفي", "COMPLETED", 0, 0, "2026-07-30 15:40:00"],
      ["مطبعة الاستقلال بنغازي", "DEPOSIT", 45e4, "بطاقة", "COMPLETED", 0, 0, "2026-07-31 09:00:00"],
      ["شركة السهم للنقل العام", "WITHDRAWAL", 125e3, "نقداً", "COMPLETED", 0, 0, "2026-07-31 12:30:00"],
      ["شركة الخليج العربي للنفت", "DEPOSIT", 45e5, "تحويل مصرفي", "COMPLETED", 0, 0, "2026-08-01 08:15:00"],
      ["مصرف التجارة والتنمية", "WITHDRAWAL", 6e5, "تحويل مصرفي", "COMPLETED", 0, 0, "2026-08-01 11:00:00"],
      ["شركة تاسيلي لتقنية المعلومات", "DEPOSIT", 9e5, "بطاقة", "COMPLETED", 0, 0, "2026-08-01 14:45:00"],
      ["حصة عبدالعزيز الفيفي", "WITHDRAWAL", 35e4, "نقداً", "COMPLETED", 0, 0, "2026-08-01 16:30:00"]
    ];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) seed.run(...row);
    });
    insertMany(seedData);
  }
}
function registerIpcHandlers() {
  ipcMain.handle("db:get-transactions", (_event, params) => {
    const page = (params == null ? void 0 : params.page) ?? 1;
    const pageSize = (params == null ? void 0 : params.pageSize) ?? 10;
    const search = (params == null ? void 0 : params.search) ?? "";
    const type = (params == null ? void 0 : params.type) ?? "ALL";
    const offset = (page - 1) * pageSize;
    let whereClause = "WHERE is_archived = 0";
    const args = [];
    if (search) {
      whereClause += " AND client_name LIKE ?";
      args.push(`%${search}%`);
    }
    if (type !== "ALL") {
      whereClause += " AND type = ?";
      args.push(type);
    }
    const total = db.prepare(
      `SELECT COUNT(*) as c FROM transactions ${whereClause}`
    ).get(...args).c;
    const data = db.prepare(
      `SELECT * FROM transactions ${whereClause} ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?`
    ).all(...args, pageSize, offset);
    return { data, total, page, pageSize };
  });
  ipcMain.handle("db:create-transaction", (_event, payload) => {
    const paymentMethod = payload.payment_method || "نقداً";
    const status = payload.status || "COMPLETED";
    const stmt = db.prepare(`
      INSERT INTO transactions (client_name, type, amount_cents, payment_method, status, is_pinned, is_archived)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `);
    const result = stmt.run(
      payload.client_name,
      payload.type,
      payload.amount_cents,
      paymentMethod,
      status
    );
    return db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid);
  });
  ipcMain.handle("db:toggle-pin", (_event, id) => {
    const current = db.prepare("SELECT is_pinned FROM transactions WHERE id = ?").get(id);
    const newStatus = current && current.is_pinned === 1 ? 0 : 1;
    db.prepare("UPDATE transactions SET is_pinned = ? WHERE id = ?").run(newStatus, id);
    return { success: true, is_pinned: newStatus };
  });
  ipcMain.handle("db:delete-transaction", (_event, id) => {
    db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
    return { success: true };
  });
  ipcMain.handle("db:archive-transaction", (_event, id) => {
    const current = db.prepare("SELECT is_archived FROM transactions WHERE id = ?").get(id);
    const newStatus = current && current.is_archived === 1 ? 0 : 1;
    db.prepare("UPDATE transactions SET is_archived = ? WHERE id = ?").run(newStatus, id);
    return { success: true, is_archived: newStatus };
  });
  ipcMain.handle("db:get-stats", () => {
    const deposits = db.prepare(
      `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
       FROM transactions WHERE type='DEPOSIT' AND is_archived=0`
    ).get();
    const withdrawals = db.prepare(
      `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
       FROM transactions WHERE type='WITHDRAWAL' AND is_archived=0`
    ).get();
    const activeAccounts = db.prepare(
      `SELECT COUNT(DISTINCT client_name) as cnt FROM transactions WHERE is_archived=0`
    ).get().cnt;
    return {
      total_balance_cents: deposits.total - withdrawals.total,
      total_deposits_cents: deposits.total,
      total_withdrawals_cents: withdrawals.total,
      active_accounts: activeAccounts,
      deposit_count: deposits.cnt,
      withdrawal_count: withdrawals.cnt
    };
  });
  ipcMain.handle("db:get-chart-data", (_event, params) => {
    const timeframe = (params == null ? void 0 : params.timeframe) ?? "3m";
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', created_at) as date_str,
        COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount_cents ELSE 0 END), 0) as deposits_cents,
        COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount_cents ELSE 0 END), 0) as withdrawals_cents
      FROM transactions
      WHERE created_at >= date('now', '-' || ? || ' days') AND is_archived = 0
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date_str ASC
    `).all(days);
    const dataMap = /* @__PURE__ */ new Map();
    for (const r of rows) {
      dataMap.set(r.date_str, {
        deposits_cents: r.deposits_cents,
        withdrawals_cents: r.withdrawals_cents
      });
    }
    const result = [];
    const now = /* @__PURE__ */ new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const entry = dataMap.get(dateKey);
      const deposits_cents = entry ? entry.deposits_cents : 0;
      const withdrawals_cents = entry ? entry.withdrawals_cents : 0;
      const dateLabel = new Intl.DateTimeFormat("ar-LY", {
        day: "numeric",
        month: "short"
      }).format(d);
      result.push({
        date: dateKey,
        dateLabel,
        deposits: deposits_cents / 100,
        withdrawals: withdrawals_cents / 100,
        deposits_cents,
        withdrawals_cents
      });
    }
    return result;
  });
}
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#ffffff",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
