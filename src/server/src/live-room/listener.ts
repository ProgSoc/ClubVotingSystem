export type ListenerNotifyFn<T> = (val: T) => Promise<void>;

/**
 * A class to broadcast a state to a group of listeners. For example, broadcast
 * the question state to anyone who's watching the board page, or broadcast a
 * user's state to all tabs the user has open if they have multiple tabs open
 * with the same waiting room user
 */
export class Listeners<T> {
  listeners: ListenerNotifyFn<T>[] = [];

  private previousPromise?: Promise<any>;

  private lastStateInner?: T;
  get lastState() {
    return this.lastStateInner;
  }

  /** Run a promise in with previous promises so that events aren't sent out of order */
  private async runInSync(fn: () => Promise<void>) {
    if (this.previousPromise) {
      this.previousPromise = this.previousPromise.then(fn);
    } else {
      this.previousPromise = fn();
    }
    await this.previousPromise;
  }

  /**
   *  Notifies all listeners of an event. Waits for the event to
   *  be sent to all listeners, and also waits for the previous event
   *  to finish sending too.
   */
  async notify(update: T) {
    await this.runInSync(async () => {
      this.lastStateInner = update;
      await Promise.all(this.listeners.map((listener) => listener(update)));
    });
  }

  /** Adds a listener and returns the unsubscribe function */
  async listen(listener: ListenerNotifyFn<T>) {
    this.listeners.push(listener);

    const removeFn = () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };

    // If there's a last event, send it to the new listener
    await this.runInSync(async () => {
      if (this.lastStateInner) {
        await listener(this.lastStateInner);
      }
    });

    return removeFn;
  }
}

export class WithListener<Val, Event> {
  val: Val;
  private listeners: Listeners<Event> = new Listeners();

  get lastState() {
    return this.listeners.lastState;
  }

  constructor(val: Val) {
    this.val = val;
  }

  async send(event: Event) {
    return this.listeners.notify(event);
  }

  async listen(listener: ListenerNotifyFn<Event>) {
    return this.listeners.listen(listener);
  }
}
