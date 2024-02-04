import { MyPromise } from "./MyPromise.js";

const myPromise = new MyPromise((resolve) => {
  setTimeout(() => {
    resolve('I love my mom!');
  }, 100)
});

myPromise
  .then((res) => {
    console.log(res);
    return 'changed response 1'
  })
  .then((res) => {
    console.log(res)
  })

MyPromise.resolve(1).then(res => {
  console.log('Resolved with:', res);
});


MyPromise.reject(new Error('Big Biba & Boba')).catch(err => {
  console.log('Hey, I have caught an error', err);
});

MyPromise.all([1, 2, 3, MyPromise.resolve(4)]).then(res => {
  console.log('Should return arr of awaited:', res);
});

MyPromise.all([1, 2, 3, MyPromise.reject(1)]).then(res => {
  console.log('Caught reject in .all()', res);
});

