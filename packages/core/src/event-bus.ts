import { EventEmitter } from "node:events";

type EventKey<TEvents> = Extract<keyof TEvents, string>;

export class TypedEventBus<TEvents extends object> {
  private readonly emitter = new EventEmitter();

  on<TKey extends EventKey<TEvents>>(event: TKey, listener: (payload: TEvents[TKey]) => void): void {
    this.emitter.on(event, listener as (payload: object) => void);
  }

  off<TKey extends EventKey<TEvents>>(event: TKey, listener: (payload: TEvents[TKey]) => void): void {
    this.emitter.off(event, listener as (payload: object) => void);
  }

  emit<TKey extends EventKey<TEvents>>(event: TKey, payload: TEvents[TKey]): void {
    this.emitter.emit(event, payload as object);
  }
}
