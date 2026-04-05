import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Atomically write data to a file.
 *
 * Writes to a temporary file first, then renames to the target path.
 * On most filesystems, rename is atomic when source and target are on
 * the same volume, so a crash mid-write never leaves a partial file.
 *
 * On Windows, renameSync fails if the target already exists, so we
 * fall back to a direct write when rename fails.
 */
export function atomicWrite(filePath: string, data: string): void {
  const absolute = resolve(filePath);
  mkdirSync(dirname(absolute), { recursive: true });

  const tmp = `${absolute}.tmp`;

  try {
    writeFileSync(tmp, data);
    renameSync(tmp, absolute);
  } catch {
    // Windows: renameSync fails if target exists.
    // Fall back to direct write (still better than nothing).
    writeFileSync(absolute, data);
  }
}
