type EventKey<TEvents> = Extract<keyof TEvents, string>;
export declare class TypedEventBus<TEvents extends object> {
    private readonly emitter;
    on<TKey extends EventKey<TEvents>>(event: TKey, listener: (payload: TEvents[TKey]) => void): void;
    off<TKey extends EventKey<TEvents>>(event: TKey, listener: (payload: TEvents[TKey]) => void): void;
    emit<TKey extends EventKey<TEvents>>(event: TKey, payload: TEvents[TKey]): void;
}
export {};
//# sourceMappingURL=event-bus.d.ts.map