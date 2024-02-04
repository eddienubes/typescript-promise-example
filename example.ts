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
  console.log('Resolved with:', 1);
});