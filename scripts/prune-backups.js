const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const backupDir = path.join(rootDir, "data", "backups");
const retentionLimit = Number(process.env.FF14CN_BACKUP_LIMIT || 20);
const backupNames = ["catalog", "user-progress", "settings"];
const dryRun = process.argv.includes("--dry-run");

async function main() {
  let removed = 0;

  for (const base of backupNames) {
    const backups = await listJsonBackups(base);
    const staleBackups = backups.slice(Math.max(0, retentionLimit));

    for (const backup of staleBackups) {
      if (!dryRun) {
        await fs.unlink(backup.path);
      }
      removed += 1;
    }

    console.log(`${base}: kept ${Math.min(backups.length, retentionLimit)}, ${dryRun ? "would remove" : "removed"} ${staleBackups.length}`);
  }

  console.log(`${dryRun ? "Would remove" : "Removed"} ${removed} old backup file(s).`);
}

async function listJsonBackups(base) {
  let entries;
  try {
    entries = await fs.readdir(backupDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const prefix = `${base}.`;
  const backups = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.startsWith(prefix) || !entry.name.endsWith(".json")) {
      continue;
    }

    const backupPath = path.join(backupDir, entry.name);
    const stat = await fs.stat(backupPath);
    backups.push({ name: entry.name, path: backupPath, mtimeMs: stat.mtimeMs });
  }

  backups.sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
  return backups;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
