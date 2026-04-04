import { EventEmitter } from "node:events";
export class TypedEventBus {
    emitter = new EventEmitter();
    on(event, listener) {
        this.emitter.on(event, listener);
    }
    off(event, listener) {
        this.emitter.off(event, listener);
    }
    emit(event, payload) {
        this.emitter.emit(event, payload);
    }
}
//# sourceMappingURL=event-bus.js.map