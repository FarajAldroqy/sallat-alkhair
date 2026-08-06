import { app as l, BrowserWindow as R, ipcMain as E } from "electron";
import { createRequire as C } from "node:module";
import { fileURLToPath as I } from "node:url";
import i from "node:path";
const f = C(import.meta.url), A = i.dirname(I(import.meta.url));
process.env.APP_ROOT = i.join(A, "..");
const O = process.env.VITE_DEV_SERVER_URL, v = i.join(process.env.APP_ROOT, "dist-electron"), N = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = O ? i.join(process.env.APP_ROOT, "public") : N;
let d, e;
function w() {
  const c = f("better-sqlite3"), t = i.join(l.getPath("userData"), "finance.db");
  e = new c(t), e.pragma("journal_mode = WAL"), e.pragma("foreign_keys = ON"), e.exec(`
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
  const s = e.pragma("table_info(transactions)"), n = new Set(s.map((o) => o.name));
  if (!n.has("payment_method"))
    try {
      e.exec("ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'نقداً'");
    } catch {
    }
  if (!n.has("is_pinned"))
    try {
      e.exec("ALTER TABLE transactions ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
    } catch {
    }
  if (!n.has("is_archived"))
    try {
      e.exec("ALTER TABLE transactions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0");
    } catch {
    }
  if (e.prepare("SELECT COUNT(*) as c FROM transactions").get().c === 0) {
    const o = e.prepare(`
      INSERT INTO transactions (client_name, type, amount_cents, payment_method, status, is_pinned, is_archived, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `), _ = [
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
    e.transaction((a) => {
      for (const r of a) o.run(...r);
    })(_);
  }
}
function P() {
  E.handle("db:get-transactions", (c, t) => {
    const s = (t == null ? void 0 : t.page) ?? 1, n = (t == null ? void 0 : t.pageSize) ?? 10, L = (t == null ? void 0 : t.search) ?? "", o = (t == null ? void 0 : t.type) ?? "ALL", _ = (s - 1) * n;
    let T = "WHERE is_archived = 0";
    const a = [];
    L && (T += " AND client_name LIKE ?", a.push(`%${L}%`)), o !== "ALL" && (T += " AND type = ?", a.push(o));
    const r = e.prepare(
      `SELECT COUNT(*) as c FROM transactions ${T}`
    ).get(...a).c;
    return { data: e.prepare(
      `SELECT * FROM transactions ${T} ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?`
    ).all(...a, n, _), total: r, page: s, pageSize: n };
  }), E.handle("db:create-transaction", (c, t) => {
    const s = t.payment_method || "نقداً", n = t.status || "COMPLETED", o = e.prepare(`
      INSERT INTO transactions (client_name, type, amount_cents, payment_method, status, is_pinned, is_archived)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `).run(
      t.client_name,
      t.type,
      t.amount_cents,
      s,
      n
    );
    return e.prepare("SELECT * FROM transactions WHERE id = ?").get(o.lastInsertRowid);
  }), E.handle("db:toggle-pin", (c, t) => {
    const s = e.prepare("SELECT is_pinned FROM transactions WHERE id = ?").get(t), n = s && s.is_pinned === 1 ? 0 : 1;
    return e.prepare("UPDATE transactions SET is_pinned = ? WHERE id = ?").run(n, t), { success: !0, is_pinned: n };
  }), E.handle("db:delete-transaction", (c, t) => (e.prepare("DELETE FROM transactions WHERE id = ?").run(t), { success: !0 })), E.handle("db:archive-transaction", (c, t) => {
    const s = e.prepare("SELECT is_archived FROM transactions WHERE id = ?").get(t), n = s && s.is_archived === 1 ? 0 : 1;
    return e.prepare("UPDATE transactions SET is_archived = ? WHERE id = ?").run(n, t), { success: !0, is_archived: n };
  }), E.handle("db:update-entity-name", (c, t) => !t.oldName || !t.newName ? { success: !1, message: "بيانات غير مكتملة" } : t.oldName.trim() === "سلة الخير" ? { success: !1, message: "لا يمكن تعديل اسم جهة سلة الخير" } : { success: !0, updatedCount: e.prepare("UPDATE transactions SET client_name = ? WHERE client_name = ?").run(t.newName.trim(), t.oldName.trim()).changes }), E.handle("db:get-stats", () => {
    const c = e.prepare(
      `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
       FROM transactions WHERE type='DEPOSIT' AND is_archived=0`
    ).get(), t = e.prepare(
      `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
       FROM transactions WHERE type='WITHDRAWAL' AND is_archived=0`
    ).get(), s = e.prepare(
      "SELECT COUNT(DISTINCT client_name) as cnt FROM transactions WHERE is_archived=0"
    ).get().cnt;
    return {
      total_balance_cents: c.total - t.total,
      total_deposits_cents: c.total,
      total_withdrawals_cents: t.total,
      active_accounts: s,
      deposit_count: c.cnt,
      withdrawal_count: t.cnt
    };
  }), E.handle("db:get-chart-data", (c, t) => {
    const s = (t == null ? void 0 : t.timeframe) ?? "3m", n = s === "7d" ? 7 : s === "30d" ? 30 : 90, L = e.prepare(`
      SELECT
        strftime('%Y-%m-%d', created_at) as date_str,
        COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount_cents ELSE 0 END), 0) as deposits_cents,
        COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount_cents ELSE 0 END), 0) as withdrawals_cents
      FROM transactions
      WHERE created_at >= date('now', '-' || ? || ' days') AND is_archived = 0
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date_str ASC
    `).all(n), o = /* @__PURE__ */ new Map();
    for (const a of L)
      o.set(a.date_str, {
        deposits_cents: a.deposits_cents,
        withdrawals_cents: a.withdrawals_cents
      });
    const _ = [], T = /* @__PURE__ */ new Date();
    for (let a = n - 1; a >= 0; a--) {
      const r = new Date(T);
      r.setDate(r.getDate() - a);
      const p = r.toISOString().slice(0, 10), D = o.get(p), u = D ? D.deposits_cents : 0, h = D ? D.withdrawals_cents : 0, m = new Intl.DateTimeFormat("ar-LY", {
        day: "numeric",
        month: "short"
      }).format(r);
      _.push({
        date: p,
        dateLabel: m,
        deposits: u / 100,
        withdrawals: h / 100,
        deposits_cents: u,
        withdrawals_cents: h
      });
    }
    return _;
  });
}
function S() {
  d = new R({
    title: "منظومة سلة الخير للمعاملات المالية",
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#ffffff",
    icon: i.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: i.join(A, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), d.webContents.on("did-finish-load", () => {
    d == null || d.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), O ? d.loadURL(O) : d.loadFile(i.join(N, "index.html"));
}
l.on("window-all-closed", () => {
  process.platform !== "darwin" && (l.quit(), d = null);
});
l.on("activate", () => {
  R.getAllWindows().length === 0 && S();
});
l.whenReady().then(() => {
  w(), P(), S();
});
export {
  v as MAIN_DIST,
  N as RENDERER_DIST,
  O as VITE_DEV_SERVER_URL
};
