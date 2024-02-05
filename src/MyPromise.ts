type PromiseLike<T> = {
  then: ThenCallback<T, unknown, unknown>;
}

type AllSettledReturnType<T> = { -readonly [K in keyof T]: PromiseSettled<Awaited<T[K]>> };
type PromiseSettled<T> = ResolvedPayload<T> | RejectedPayload;
type ResolvedPayload<T> = {
  status: 'fulfilled';
  value: T;
}
type RejectedPayload = {
  status: 'rejected'
  reason: any;
}

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

type PromiseState = 'fulfilled' | 'rejected' | 'pending';

export class MyPromise<T> {
  private state: PromiseState = 'pending';
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

  static allSettled<T extends readonly unknown[] | []>(iterables: T): MyPromise<AllSettledReturnType<T>> {
    const values: PromiseSettled<Awaited<T[number]>>[] = [];
    let totalSettled = 0;
    let totalPending = 0;
    let total = 0;

    return new MyPromise<AllSettledReturnType<T>>((resolve, reject) => {
      for (const item of iterables) {
        total += 1;

        if (!this.isPromise(item)) {
          totalSettled += 1;
          values.push({
            status: 'fulfilled',
            value: item as Awaited<T>
          });
          continue;
        }

        // To be replaced later. Will preserve promise order.
        const updatedLength = values.push(null);
        totalPending += 1;

        item.then((value) => {
          totalSettled += 1;
          values[updatedLength - 1] = {
            status: 'fulfilled',
            value: value as Awaited<T>
          }

          if (totalSettled === total) {
            resolve(values as AllSettledReturnType<T>);
          }
        }, (err) => {
          totalSettled += 1;
          values[updatedLength - 1] = {
            status: 'rejected',
            reason: err
          }

          if (totalSettled === total) {
            resolve(values as AllSettledReturnType<T>);
          }
        });
      }

      if (totalPending == 0) {
        resolve(values as AllSettledReturnType<T>);
      }
    });
  }

  static all<T>(iterables: Iterable<T | PromiseLike<T>>): MyPromise<Awaited<T>[]> {
    const values = [];
    let totalResolved = 0;
    let totalPending = 0;
    let total = 0;

    return new MyPromise<Awaited<T>[]>((resolve, reject) => {
      for (const item of iterables) {
        total += 1;

        if (!this.isPromise(item)) {
          totalResolved += 1;
          values.push(item);
          continue;
        }

        // To be replaced later. Will preserve promise order.
        const updatedLength = values.push(null);
        totalPending++;

        item.then((value) => {
          values[updatedLength - 1] = value;
          totalResolved += 1;
          totalPending -= 1;

          // Will never be true unless all promises are fulfilled.
          // It's due to queueMicrotask() in resolve/reject
          if (total == totalResolved) {
            resolve(values);
          }
        }, reject);
      }

      if (totalPending == 0) {
        resolve(values);
      }
    });
  }

  static race<T extends unknown[]>(iterables: T): MyPromise<Awaited<T[number][]>> {
    return new MyPromise<Awaited<T[number][]>>((resolve, reject) => {
      for (const item of iterables) {
        if (!this.isPromise(item)) {
          resolve(item as Awaited<T>)
          return;
        }

        item
          .then((res) => {
            resolve(res as Awaited<T>);
          }, (err) => {
            reject(err)
          });
      }
    });
  }

  static any<T extends unknown[]>(iterables: T): MyPromise<Awaited<T>> {
    return new MyPromise((resolve, reject) => {
      let total = 0;
      let totalRejected = 0;


      for (const item of iterables) {
        total += 1;

        if (!this.isPromise(item)) {
          resolve(item as Awaited<T>);
          return;
        }

        item.then((res) => {
          resolve(res as Awaited<T>);
        }, (err) => {
          totalRejected += 1;
          if (totalRejected == total) {
            reject(new AggregatePromiseException(err));
          }
        });
      }

      if (total == 0) {
        reject(new AggregatePromiseException());
      }
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
    if (this.state == 'fulfilled') {
      // We assert here because we're sure the value type is known at this point.
      this.resolveCbs.forEach((cb) => cb(this.value as T));
      this.resolveCbs = [];
    }

    if (this.state == 'rejected') {
      this.rejectCbs.forEach((cb) => cb(this.value))
      this.rejectCbs = [];
    }
  }

  private resolve(value: T | PromiseLike<T>): void {
    queueMicrotask(() => {
      if (this.state !== 'pending') {
        return;
      }
      if (MyPromise.isPromise(value)) {
        value.then(this.resolve.bind(this), this.reject.bind(this));
        return;
      }

      this.value = value;
      this.state = 'fulfilled';
      this.run();
    });
  }

  private reject(value: T | PromiseLike<T>): void {
    queueMicrotask(() => {
      if (this.state !== 'pending') {
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
      this.state = 'rejected';
      this.run();
    });
  }

  static isPromise<T>(o?: unknown): o is PromiseLike<T> {
    return !!o && typeof o === 'object' && 'then' in o;
  }
}

export class UncaughtPromiseException extends Error {
  constructor(message: Error) {
    super(message.message);

    this.stack = message.stack;
  }

}

export class AggregatePromiseException extends Error {
  constructor(err?: any) {
    super('All promises were rejected');
    this.cause = err;
  }
}