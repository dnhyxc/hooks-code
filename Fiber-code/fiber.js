let A1 = { type: 'div', key: 'A1' }
let B1 = { type: 'div', key: 'B1', return: A1 }
let B2 = { type: 'div', key: 'B2', return: A1 }
let C1 = { type: 'div', key: 'C1', return: B1 }
let C2 = { type: 'div', key: 'C2', return: B1 }

A1.child = B1;
B1.sibling = B2;
B1.child = C1;
C1.sibling = C2;

function sleep(delay) {
  /**
   * 在 JS 里实现睡眠功能：
   * 如果 Date.now() - start 小于等于 delay 则什么都不做，即不会跳出 for 循环，该函数执行就不会结束。
   * 如果 Date.now() - start 大于 delay，则会跳出 for 循环，该函数也就执行结束了，会继续依次执行下面的代码。
   */
  for (var start = Date.now(); Date.now() - start <= delay;) { }
}

let startTime = Date.now();

// nextUnitOfWork表示下一个执行单元
let nextUnitOfWork = null;
function workLoop(deadline) {
  // 如果浏览器剩余时间大于0或者已经超时，并且有待执行的执行单元，就执行，然后会返回下一个执行单元
  while ((deadline.timeRemaining() > 0 || deadline.didTimeOut) && nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  // 如果没有下一个执行单元，则表示render结束了
  if (!nextUnitOfWork) {
    console.log('render阶段结束了');
    console.log(Date.now() - startTime);
  } else {
    requestIdleCallback(workLoop, { timeout: 1000 });
  }
}

function performUnitOfWork(fiber) {
  // 处理此fiber
  beginWork(fiber);
  // 如果有儿子，则返回大儿子
  if (fiber.child) {
    return fiber.child;
  }
  // 如果没有儿子，则说明此fiber已经完成了。
  while (fiber) {
    completeUnitOfWork(fiber);
    if (fiber.sibling) {
      return fiber.sibling;
    }
    fiber = fiber.return;
  }
}

function completeUnitOfWork(fiber) {
  console.log('结束：' + fiber.key);  // A1 => B1 => C1 => C2 => B2
}

function beginWork(fiber) {
  sleep(20);
  console.log("开始：" + fiber.key);  // A1 => B1 => C1 => C2 => B2
}

nextUnitOfWork = A1;
requestIdleCallback(workLoop, { timeout: 1000 });

