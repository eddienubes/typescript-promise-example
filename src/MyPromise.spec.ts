import { AggregatePromiseException, MyPromise } from "./MyPromise.js";

const getResolvingPromise = (timeout = 100, value = 'I love my mom!') => new MyPromise((resolve) => {
  setTimeout(() => {
    resolve(value);
  }, timeout);
});

const getRejectingPromise = (timeout = 100) => new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error('Oh, no way!'));
  }, timeout);
});

describe('My TypeScript Promise', () => {
  describe('then', () => {
    it('should work without chaining', async () => {
      const myPromise = getResolvingPromise();


      await new Promise((resolve) => {
        myPromise.then((res) => {
          expect(res).toEqual('I love my mom!');
          resolve(null);
        });
      });
    });

    it('should should work with chaining', async () => {
      const myPromise = getResolvingPromise();

      await new Promise((resolve) => {
        myPromise
          .then((res) => {
            expect(res).toEqual('I love my mom!');
            return 'I love my grandma!';
          })
          .then((res) => {
            expect(res).toEqual('I love my grandma!');
          })
          .then((res) => {
            expect(res).toBeUndefined();
            resolve(null);
          });
      })
    });

    it('should ignore subsequent resolve reject calls', async () => {
      const myPromise = new MyPromise((resolve, reject) => {
        resolve(1);
        resolve(2);
        reject(3);
        resolve(4);
      });


      await new Promise((resolve) => {
        myPromise
          .then((res) => {
            expect(res).toEqual(1);
          })
          .catch((err) => {
            expect(true).toEqual(false);
          })
          .then(res => {
            expect(res).toBeUndefined();
            resolve(null);
          });
      })
    });
  });

  describe('catch', () => {
    it('should catch rejections without chaining', async () => {
      const myPromise = getRejectingPromise();

      await new Promise((resolve) => {
        myPromise
          .then((res) => {
            expect(false).toEqual(true);
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(Error)
            resolve(null);
          });
      });
    });

    it('should catch rejections with chaining', async () => {
      const myPromise = getRejectingPromise();

      await new Promise((resolve) => {
        myPromise
          .then((res) => {
            expect(false).toEqual(true);
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(Error)
            resolve(null);
          })
          .catch((err) => {
            expect(false).toEqual(true);
          });
      });
    });

  });

  describe('all', () => {
    it('should handle iterable resolving collection when number is in the end', async () => {

      const myPromise = MyPromise.all([1, 2, MyPromise.resolve(3), 4]);

      await new Promise(resolve => {
        myPromise.then((res) => {
          expect(res).toEqual([1, 2, 3, 4]);
          resolve(null);
        });
      })
    });

    it('should handle iterable resolving collection', async () => {
      const myPromise = MyPromise.all([1, 2, 3, MyPromise.resolve(4)]);

      await new Promise(resolve => {
        myPromise.then((res) => {
          expect(res).toEqual([1, 2, 3, 4]);
          resolve(null);
        });
      })
    });

    it('should handle iterable rejecting collection', async () => {
      const myPromise = MyPromise.all([1, 2, 3, MyPromise.reject(4)]);

      await new Promise(resolve => {
        myPromise
          .then((res) => {
            expect(true).toEqual(false);
          })
          .catch(err => {
            expect(err).toEqual(4);
            resolve(null);
          });
      })
    });

    it('should handle collections without promises', async () => {
      const promise = Promise.all([1, 2, 3, 4]);

      await new Promise((resolve) => {
        promise.then(res => {
          expect(res).toEqual([1, 2, 3, 4]);
          resolve(null);
        });
      });
    });
  });

  describe('allSettled', () => {
    it('should settle all primitives', async () => {
      const myPromise = MyPromise.allSettled(['I love dogs!', 1])

      await new Promise((resolve) => {
        myPromise.then(res => {
          expect(res).toEqual([
            {
              status: 'fulfilled',
              value: 'I love dogs!'
            }, {
              status: 'fulfilled',
              value: 1
            }
          ])
          resolve(null);
        });
      });
    });

    it('should settle all promises with rejects', async () => {
      const myPromise = MyPromise.allSettled([1, Promise.reject(2)])

      await new Promise((resolve) => {
        myPromise.then(res => {
          expect(res).toEqual([
            {
              status: 'fulfilled',
              value: 1
            }, {
              status: 'rejected',
              reason: 2
            }
          ])
          resolve(null);
        });
      });
    });

    it('should settle all promises with resolves and rejects', async () => {
      const myPromise = MyPromise.allSettled([1, Promise.reject(2), Promise.resolve(3)]);

      await new Promise((resolve) => {
        myPromise.then(res => {
          expect(res).toEqual([
            {
              status: 'fulfilled',
              value: 1
            },
            {
              status: 'rejected',
              reason: 2
            },
            {
              status: 'fulfilled',
              value: 3
            }
          ]);
          resolve(null);
        });
      });
    });

  });

  describe('race', () => {
    it('should resolve with first resolve', async () => {
      const firstResolve = getResolvingPromise(100, 'test');
      const secondResolve = getResolvingPromise(1000);

      const myPromise = MyPromise.race([firstResolve, secondResolve])

      await new Promise((resolve) => {
        myPromise.then((res) => {
          expect(res).toEqual('test');
          resolve(null);
        });
      });
    });

    it('should reject with first reject', async () => {
      const firstResolve = getRejectingPromise(100);
      const secondResolve = getResolvingPromise(1000, 'test');

      const myPromise = MyPromise.race([firstResolve, secondResolve])

      await new Promise((resolve) => {
        myPromise.catch((err) => {
          expect(err).toBeInstanceOf(Error);
          resolve(null);
        });
      });
    });

    it('should resolve with a first non-promise value', async () => {
      const myPromise = MyPromise.race([1, '2', 3]);

      await new Promise((resolve) => {
        myPromise.then((res) => {
          expect(res).toEqual(1);
          resolve(null);
        });
      });
    });
  });

  describe('any', () => {
    it('should resolve with a first fulfilled promise', async () => {
      const promise = MyPromise.any([]);

      await new Promise((resolve) => {
        promise
          .then((res) => {
            expect(true).toEqual(false);
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(AggregatePromiseException);
            resolve(null);
          });
      });
    });

    it('should reject when passed empty collection', async () => {
      const promise = MyPromise.any([]);

      await new Promise((resolve) => {
        promise
          .then((res) => {
            expect(true).toEqual(false);
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(AggregatePromiseException);
            resolve(null);
          });
      });
    });

    it('should reject when all promises reject', async () => {
      const promise = MyPromise.any([MyPromise.reject(1)]);

      await new Promise((resolve) => {
        promise
          .then((res) => {
            expect(true).toEqual(false);
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(AggregatePromiseException);
            resolve(null);
          });
      });
    });

    it('should resolve when at least 1 promise resolved', async () => {
      const promise = MyPromise.any([MyPromise.reject(0), MyPromise.resolve(1), MyPromise.reject(2)]);

      await new Promise((resolve) => {
        promise
          .then((res) => {
            expect(res).toEqual(1);
            resolve(null);
          })
          .catch((err) => {
            expect(true).toEqual(false);
          });
      });
    });
  });
});
