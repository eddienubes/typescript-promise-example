import { MyPromise } from "./MyPromise.js";

const getResolvingPromise = () => new MyPromise((resolve) => {
  setTimeout(() => {
    resolve('I love my mom!');
  }, 100)
});

const getRejectingPromise = () => new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error('Oh, no way!'));
  }, 100)
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
  });

  describe('allSettled', () => {


  });
});

// myPromise
//   .then((res) => {
//     console.log(res);
//     return 'changed response 1'
//   })
//   .then((res) => {
//     console.log(res)
//   })
//
// MyPromise.resolve(1).then(res => {
//   console.log('Resolved with:', res);
// });