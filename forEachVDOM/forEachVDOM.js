/**
 * fiber 之前是什么样的，为什么需要 fiber？
 *  - 因为 fiber 之前是使用的 递归调用，而递归调用不能中断。
 *  - 执行栈越来越深，会影响性能，造成卡顿等不良影响。
 * 以下代码这种遍历是递归调用，执行栈会越来越深，而且不能中断，因为中断后再想恢复就非常难了
 */

let root = {
  key: 'A1',
  children: [
    {
      key: 'B1',
      children: [
        { key: 'C1', children: [] },
        { key: 'C2', children: [] }
      ]
    },
    {
      key: 'B2',
      children: []
    }
  ]
}

function walk(vdom) {
  doWork(vdom);
  vdom.children.forEach((child) => {
    walk(child);
  })
}

function doWork(vdom) {
  console.log(vdom.key);  // A1 => B1 => C1 => C2 => B2
}

walk(root);