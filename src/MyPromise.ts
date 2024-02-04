// type PromiseLike<T> = {
//   then: ThenCallback<T, unknown, unknown>;
// }

type ThenCallback<T, Resolved, Rejected> = (
  resolveCb?: ResolveCallback<T, Resolved | PromiseLike<Resolved>> | null,
  rejectCb?: RejectCallback<Rejected | PromiseLike<Rejected>> | null
) => void
type ResolveCallback<T, Resolved> = (value: T) => Resolved | PromiseLike<Resolved>
type RejectCallback<Rejected> = (err: any) => Rejected | PromiseLike<Rejected>;
type FinallyCallback<T> = () => T | PromiseLike<T>;

type PromiseExecutor<T> = (
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (err: any) => void
) => void

enum PromiseState {
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING'
}

export class MyPromise<T> {
  private state = PromiseState.PENDING;
  private value?: T | unknown;
  private resolveCbs: ((value: T) => void)[] = []
  private rejectCbs: ((err: unknown) => void)[] = [];

  constructor(executor: PromiseExecutor<T>) {
    try {
      executor(this.resolve.bind(this), this.reject.bind(this));
    } catch (e) {
      this.reject(e)
    }
  }

  static resolve<T>(value: T): MyPromise<Awaited<T>> {
    return new MyPromise<Awaited<T>>(resolve => {
      // If T is a Thenable we'll wait for it inside :)
      resolve(value as Awaited<T>)
    });
  }

  static reject<T = never>(value: T): MyPromise<Awaited<T>> {
    return new MyPromise<Awaited<T>>((resolve, reject) => {
      reject(value);
    });
  }

  static all<T>(iterables: Iterable<T | PromiseLike<T>>): MyPromise<Awaited<T>[]> {
    const values = [];

    return new MyPromise<Awaited<T>[]>((resolve, reject) => {
      for (const item of iterables) {
        if (!this.isPromise(item)) {
          values.push(item);
          continue;
        }

        item.then((value) => {
          console.log('here then', value)
          values.push(value);
        }, (err) => {
          console.log('here', err);
          reject(err);
        });

      }

      resolve(values);
    });
  }

  then<Resolved = T, Rejected = never>(
    resolveCb?: ResolveCallback<T, Resolved | PromiseLike<Resolved>> | null,
    rejectCb?: RejectCallback<Rejected | PromiseLike<Rejected>> | null,
  ): MyPromise<Resolved | Rejected> {
    return new MyPromise<Resolved | Rejected>((resolve, reject) => {
      this.resolveCbs.push((value) => {
        if (!resolveCb) {
          resolve(value as unknown as Resolved);
          return;
        }

        try {
          resolve(resolveCb(value) as Resolved);
        } catch (e) {
          reject(e);
        }
      })

      this.rejectCbs.push((value) => {
        if (!rejectCb) {
          reject(value);
          return;
        }

        try {
          resolve(rejectCb(value) as Rejected);
        } catch (e) {
          reject(e);
        }
      })

      this.run();
    })
  }

  catch<Reject = never>(rejectCb: RejectCallback<Reject>): MyPromise<T | Reject> {
    return this.then<T, Reject>(null, rejectCb);
  }

  finally(finallyCb: FinallyCallback<T>): MyPromise<T | PromiseLike<T>> {
    return this.then((value) => {
      finallyCb();
      return value;
    }, (err) => {
      finallyCb();
      throw err;
    })
  }

  private run(): void {
    if (this.state == PromiseState.FULFILLED) {
      // We assert here because we're sure the value type is known at this point.
      this.resolveCbs.forEach((cb) => cb(this.value as T));
      this.resolveCbs = [];
    }

    if (this.state == PromiseState.REJECTED) {
      this.rejectCbs.forEach((cb) => cb(this.value))
      this.rejectCbs = [];
    }
  }

  private resolve(value: T | PromiseLike<T>): void {
    queueMicrotask(() => {
      if (this.state !== PromiseState.PENDING) {
        return;
      }
      if (MyPromise.isPromise(value)) {
        value.then(this.resolve.bind(this), this.reject.bind(this));
        return;
      }

      this.value = value;
      this.state = PromiseState.FULFILLED;
      this.run();
    });
  }

  private reject(value: T | PromiseLike<T>): void {
    queueMicrotask(() => {
      if (this.state !== PromiseState.PENDING) {
        return;
      }
      if (MyPromise.isPromise(value)) {
        value.then(this.resolve.bind(this), this.reject.bind(this));
        return;
      }

      if (!this.rejectCbs.length) {
        throw new UncaughtPromiseException(value as Error)
      }

      this.value = value;
      this.state = PromiseState.REJECTED;
      this.run();
    });
  }

  static isPromise<T>(o?: unknown): o is PromiseLike<T> {
    return !!o && typeof o === 'object' && 'then' in o;
  }
}

class UncaughtPromiseException extends Error {
  constructor(message: Error) {
    super(message.message);

    this.stack = message.stack;
  }

}

// Promise.all([Promise.resolve(1), 2])