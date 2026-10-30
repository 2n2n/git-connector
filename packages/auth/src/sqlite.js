import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const globalForAuth = globalThis;

export function resolveSqlitePath(sqlitePath = "data/auth.sqlite") {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), sqlitePath);
}

export function createSqliteDatabase(sqlitePath = "data/auth.sqlite") {
  const dbPath = resolveSqlitePath(sqlitePath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (!globalForAuth.__gitConnectorAuthDb) {
    globalForAuth.__gitConnectorAuthDb = new Database(dbPath);
  }

  return globalForAuth.__gitConnectorAuthDb;
}

export function resetSqliteDatabaseCache() {
  const db = globalForAuth.__gitConnectorAuthDb;
  if (db) {
    db.close();
    globalForAuth.__gitConnectorAuthDb = undefined;
  }
}
