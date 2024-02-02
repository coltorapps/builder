import { type SubscriptionEvent } from "@coltorapps/builder";

export type KeyofUnion<T> = T extends unknown ? keyof T : never;

export type EventsListeners<TEvent extends SubscriptionEvent> = {
  [K in `on${TEvent["name"]}`]?: K extends `on${infer REventName}`
    ? (payload: Extract<TEvent, { name: REventName }>["payload"]) => void
    : never;
};
