type MaybePromise<T> = T | Promise<T>;

type Subscriber<T> = {
  notify: (value: T) => void;
  stop: () => void;
};

function makeSubscriber<T>(initialValue: MaybePromise<T>, notify: (val: T) => void): Subscriber<T> {
  let queue: T[] | null = [];
  let stopped = false;

  void Promise.resolve(initialValue)
    .then((val) => {
      if (stopped) {
        return;
      }

      notify(val);
      queue?.forEach((val) => notify(val));
      queue = null;
    })
    .catch(() => {
      // If the initial promise errors then we ignore all events
      stopped = true;
      queue = null;
    });

  return {
    notify: (val) => {
      if (stopped) {
        return;
      }

      if (queue) {
        queue.push(val);
      } else {
        notify(val);
      }
    },
    stop: () => {
      stopped = true;
    },
  };
}

type ListenerGroup<T> = {
  notify: (value: T) => void;
  subscribe: (notify: (value: T) => void) => () => void;
  isEmpty(): boolean;
};

function makeListenerGroup<T>(getInitialValue: () => MaybePromise<T>) {
  const subscribers = new Set<Subscriber<T>>();
  let currentValue: MaybePromise<T> = getInitialValue();

  return {
    subscribe: (notify: (val: T) => void) => {
      const subscriber = makeSubscriber(currentValue, notify);
      subscribers.add(subscriber);
      const unsubscribe = () => {
        subscriber.stop();
        subscribers.delete(subscriber);
      };
      return unsubscribe;
    },

    notify: (val: T) => {
      currentValue = val;
      subscribers.forEach((subscriber) => subscriber.notify(val));
    },

    isEmpty: () => subscribers.size === 0,
  };
}

export function makeNotificationService<T>() {
  return {
    withKey: <KeyArgs>(makeKey: (args: KeyArgs) => string) => {
      const subscribers = new Map<string, ListenerGroup<T>>();

      return {
        subscribe: (keyArgs: KeyArgs, getInitialValue: () => MaybePromise<T>, notify: (val: T) => void) => {
          const key = makeKey(keyArgs);
          if (!subscribers.has(key)) {
            subscribers.set(key, makeListenerGroup(getInitialValue));
          }

          const subscriber = subscribers.get(key)!;
          const innerUnsubscribe = subscriber.subscribe(notify);

          const unsubscribe = () => {
            innerUnsubscribe();
            if (subscriber.isEmpty()) {
              subscribers.delete(key);
            }
          };

          return unsubscribe;
        },

        notify: (keyArgs: KeyArgs, val: T) => {
          const key = makeKey(keyArgs);
          const subscriber = subscribers.get(key);
          if (subscriber) {
            subscriber.notify(val);
          }
        },
      };
    },
  };
}
