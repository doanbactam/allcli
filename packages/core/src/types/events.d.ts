import type { SessionRecord, SessionStatus } from "./session.js";
export interface EventMap {
    "session.output": {
        sessionId: string;
        chunk: string;
    };
    "session.transition": {
        sessionId: string;
        from: SessionStatus;
        to: SessionStatus;
    };
    "session.updated": {
        record: SessionRecord;
    };
}
//# sourceMappingURL=events.d.ts.map