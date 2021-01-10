/**
 * 从根节点开始渲染和调度，有两个阶段：diff 阶段、commit 阶段。
 * 1，diff 阶段：对比新旧的虚拟 DOM，进行增量更新或创建，render 阶段，这个阶段可能比较花时间，
 * 我们可以对任务进行拆分，拆分的纬度就是虚拟 DOM 节点，此阶段可以暂停。
 * - render 阶段成果是 effect list，从中可以知道哪些节点更新了，哪些节点删除了，哪些节点增加了。
 * - render 阶段有两个任务：
 *   - 根据虚拟 DOM 生成 fiber 树，
 *   - 收集 effect list。
 * 2，commit 阶段：进行 DOM 更新创建阶段，此阶段不能暂停，要一气呵成。
 */

import { TAG_ROOT, ELEMENT_TEXT, TAG_TEXT, TAG_HOST, PLACEMENT } from './constants';
import { setProps } from './utils';

// 下一个工作单元
let nextUnitOfWork = null;
// RootFiber 应用的根
let workProgressRoot = null;

// {tag: TAG_ROOT, stateNode: container, props: {children: [element]}} 
export function scheduleRoot(rootFiber) {
  workProgressRoot = rootFiber;
  nextUnitOfWork = rootFiber;
}

// 循环执行工作
function workLoop(deadline) {
  // 是否要让出时间片或者说控制权
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 执行完一个任务后，没有时间的话就要让出控制权
    shouldYield = deadline.timeRemaining() < 1;
  }
  // 如果时间片段到期后还有任务没有完成，就需要请求浏览器再次调度
  if (!nextUnitOfWork) {
    console.log('render阶段结束');
  }
  // 不管有没有任务，都请求再次调度，每一帧都要执行一次 workLoop
  requestIdleCallback(workLoop, { timeout: 500 });
}

function performUnitOfWork(currentFiber) {
  beginWork(currentFiber);
  if (currentFiber.child) {
    return currentFiber.child;
  }
  // 如果该 Fiber 没有儿子了，则表示当前 Fiber 已经完成了
  while (currentFiber) {
    completeUnitOfWork(currentFiber);
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    // 找到父亲，让父亲完成，再找到叔叔
    currentFiber = currentFiber.return;
  }
}


/**
 * beginWork：创建 fiber（开始收下线的钱）
 * completeUnitOfWork：收集 effect list（把下线的钱收完了）
 * 
 * 1，创建真实 DOM 元素
 * 2，创建子 fiber
 */

// 创建 fiber
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    updateHost(currentFiber);
  }
}

function updateHostRoot(currentFiber) {
  // 先处理自己，如果是一个原生节点，创建真实 DOM。再创建子 fiber
  // currentFiber：当前所处理的 fiber。newChildren：当前所处理的 fiber 的子节点
  let newChildren = currentFiber.props.children;  // [element]
  reconcileChildren(currentFiber, newChildren);
}

function reconcileChildren(currentFiber, newChildren) {
  // 新子节点的索引
  let newChildIndex = 0;
  // 上一个新的子 fiber
  let prevSibling;
  // 遍历子虚拟 DOM 元素数组，为每一个虚拟 DOM 元素创建子 Fiber
  while (newChildIndex < newChildren.length) {
    // 取出虚拟 DOM 节点
    let newChild = newChildren[newChildIndex];
    let tag;
    if (newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 如果是一个文本节点，则 tag 为 TAG_TEXT
    } else if (typeof newChild.type === 'string') {
      tag = TAG_HOST; // 如果 type 是一个字符串，那么就是一个原生的 DOM 节点
    }

    // 构建 Fiber
    let newFiber = {
      tag,
      type: newChild.type,  // div
      props: newChild.props,
      stateNode: null,  // div 还没创建 DOM 元素
      return: currentFiber, // 父 Fiber returnFiber
      effectTag: PLACEMENT, // 副作用标识，在 render 我们会收集副作用，其中包括：增加，删除，更新
      nextEffext: null, // effectlist 也是一个单链表
      // effect list 的顺序和节点遍历完成顺序是一样的，但是节点只放那些有变化的 fiber 节点（出钱的人），没有变化的将会绕过
    }

    // 遍历构建的 Fiber，其中最小的儿子是没有弟弟的，此时遍历也就结束了
    if (newFiber) {
      // 如果当前索引为 0，则说明是第一个儿子
      if (newChildIndex === 0) {
        // 将父 Fiber 的 child 指向第一个儿子
        currentFiber.child = newFiber;
      } else {
        // 将上一个子节点的 sibling 指向 它的弟弟（即将第一个儿子的 sibling 指向第二个儿子）
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }

    newChildIndex++;
  }
}

function updateHostText(currentFiber) {
  // 如果 此 fiber 的 stateNode 为空，则说明还没有创建 DOM 节点
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

function createDOM(currentFiber) {
  // 如果是一个文本节点
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  } else if (currentFiber.tag === TAG_HOST) { // span div
    // stateNode 为创建的 DOM 节点
    let stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  }
}

function updateHost(currentFiber) {
  // 如果 此 fiber 的 stateNode 为空，则说明还没有创建 DOM 节点
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  // 处理当前 currentFiber 的子节点 
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps);
}

/**
 * 在完成的时候要收集有副作用的 fiber，然后组成 effect list。
 * 
 * 每个 fiber 有两个属性，firstEffect：指向第一个副作用的子 fiber。lastEffect：指向最后一个有副作用的子 fiber。
 * 中间的则用 nextEffect 做成一个单链表：
 *  - firstEffect => 大儿子
 *  - nextEffect => 二儿子
 *  - nextEffect => 三儿子
 *  - lastEffect => 三儿子
 */
function completeUnitOfWork(currentFiber) {
  // 找出第一个完成的 currentFiber 的父元素
  let returnFiber = currentFiber.return;
  if (returnFiber) {
    // 获取父元素的 effectTag（副作用标识）
    const effectTag = currentFiber.effectTag;
    // 如果 effectTag 有值，说明有副作用
    if (effectTag) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffext = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.lastEffect = currentFiber;
    }
  }
}

/**
 * react 告诉浏览器，有任务需要浏览器在空闲的时候进行执行
 * 
 * 这其中有一个优先级的概念，expirationTime
 */
requestIdleCallback(workLoop, { timeout: 500 });