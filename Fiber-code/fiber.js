// 构建 VDOM 树
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
    console.log(nextUnitOfWork, 'nextUnitOfWork');  // B1 => C1 => C2 => B2
  }
  // 如果没有下一个执行单元，则表示render结束了
  if (!nextUnitOfWork) {
    console.log('render阶段结束了');
    console.log(Date.now() - startTime);
  } else {
    requestIdleCallback(workLoop, { timeout: 1000 });
  }
}

/**
 * fiber值的更替：
 *  - 有儿子的情况：A1 => B2 => C1（无儿子，C1执行完毕）
 *  - 无儿子有弟弟的情况：C1 => C2（无儿子，无弟弟，则表示C2执行完毕的同时，C2的父亲也执行完毕了）。
 *  此时返回当前fiber的父节点。
 */

function performUnitOfWork(fiber) {
  // 处理此fiber
  beginWork(fiber);
  // 如果有儿子，则返回大儿子
  if (fiber.child) {
    return fiber.child;
  }
  // 如果没有儿子，则说明当前fiber已经完成了。
  while (fiber) {
    completeUnitOfWork(fiber);
    // 如果有弟弟，则返回弟弟
    if (fiber.sibling) {
      return fiber.sibling;
    }
    // 如果当前fiber没有弟弟，也没有儿子，则说明当前fiber的父亲也执行完了，则返回当前fiber的父亲
    // 改变当前 while 中的 fiber 为当前 fiber 的父元素
    fiber = fiber.return;
  }
}

function completeUnitOfWork(fiber) {
  console.log('结束：' + fiber.key);  // C1 => C2 => B1 => B2 => A1
}

function beginWork(fiber) {
  sleep(20);
  console.log("开始：" + fiber.key);  // A1 => B1 => C1 => C2 => B2
}

nextUnitOfWork = A1;
requestIdleCallback(workLoop, { timeout: 1000 });

