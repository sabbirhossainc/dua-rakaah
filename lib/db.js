// Read-only access to the dua content database (data/dua_main.sqlite).
// Server-only: better-sqlite3 is a native module and must never reach the client bundle.
import "server-only";
import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "dua_main.sqlite");

// One connection per server process. In dev, hot reload re-evaluates this module,
// so the connection is kept on globalThis to avoid opening a new one on every edit.
const db =
  globalThis.__duaContentDb ??
  new Database(DB_PATH, { readonly: true, fileMustExist: true });
if (process.env.NODE_ENV !== "production") globalThis.__duaContentDb = db;

const statements = {
  categories: db.prepare("SELECT * FROM category ORDER BY cat_id"),
  categoryById: db.prepare("SELECT * FROM category WHERE cat_id = ?"),
  subcategories: db.prepare(
    "SELECT * FROM sub_category WHERE cat_id = ? ORDER BY subcat_id"
  ),
  duasByCategory: db.prepare(
    "SELECT * FROM dua WHERE cat_id = ? ORDER BY subcat_id, dua_id"
  ),
  allDuas: db.prepare("SELECT * FROM dua ORDER BY cat_id, subcat_id, dua_id"),
  duaById: db.prepare("SELECT * FROM dua WHERE id = ?"),
};

export function getCategories() {
  return statements.categories.all();
}

export function getCategory(catId) {
  return statements.categoryById.get(Number(catId)) ?? null;
}

export function getSubcategories(catId) {
  return statements.subcategories.all(Number(catId));
}

export function getDuasByCategory(catId) {
  return statements.duasByCategory.all(Number(catId));
}

export function getAllDuas() {
  return statements.allDuas.all();
}

export function getDua(id) {
  return statements.duaById.get(Number(id)) ?? null;
}
