import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
export class JsonFileStore {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    load() {
        const absolute = resolve(this.filePath);
        if (!existsSync(absolute))
            return [];
        const raw = readFileSync(absolute, "utf8");
        if (!raw.trim())
            return [];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                // Backup corrupt/non-array data instead of silently discarding
                const bak = absolute + ".bak";
                renameSync(absolute, bak);
                return [];
            }
            return parsed;
        }
        catch {
            // Backup malformed JSON
            const bak = absolute + ".bak";
            try {
                renameSync(absolute, bak);
            }
            catch { /* ignore */ }
            return [];
        }
    }
    save(records) {
        const absolute = resolve(this.filePath);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, JSON.stringify(records, null, 2));
    }
}
//# sourceMappingURL=json-file-store.js.map