export declare class JsonFileStore<T> {
    private readonly filePath;
    constructor(filePath: string);
    load(): T[];
    save(records: T[]): void;
}
//# sourceMappingURL=json-file-store.d.ts.map