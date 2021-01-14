/**
 * 从根节点开始渲染和调度，有两个阶段：diff阶段、commit阶段。
 * 1，diff阶段：对比新旧的虚拟DOM，进行增量更新或创建，render阶段，这个阶段可能比较花时间，
 * 我们可以对任务进行拆分，拆分的纬度就是虚拟DOM节点，此阶段可以暂停。
 * - render阶段成果是 effect list，从中可以知道哪些节点更新了，哪些节点删除了，哪些节点增加了。
 * - render阶段有两个任务：
 *   - 根据虚拟DOM生成fiber树，
 *   - 收集 effect list。
 * 2，commit阶段：进行DOM更新创建阶段，此阶段不能暂停，要一气呵成。
 */

import { TAG_ROOT, ELEMENT_TEXT, TAG_TEXT, TAG_HOST, PLACEMENT, DELETION, UPDATE } from './constants';
import { setProps } from './utils';

// 下一个工作单元
let nextUnitOfWork = null;
// 正在渲染的根Root Fiber
let workInProgressRoot = null;
// 渲染成功后，当前根Root Fiber（表示最近一次（最新）渲染成功的根Root Fiber）
let currentRoot = null;
// 删除的节点我们并不放在effect list里，所以需要单独记录并执行
let deletions = []

// {tag: TAG_ROOT, stateNode: container, props: {children: [element]}} 
export function scheduleRoot(rootFiber) {
  // 如果currentRoot有值，说明至少渲染过一次了，否则就是第一次渲染
  if (currentRoot) {
    rootFiber.alternate = currentRoot;
    workInProgressRoot = rootFiber;
  } else {
    workInProgressRoot = rootFiber;
  }
  nextUnitOfWork = workInProgressRoot;
}

// 循环执行工作
function workLoop(deadline) {
  // 是否要让出时间片或者说控制权
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    // A1(元素) => A1(文本节点) => B1(元素) => B1(文本节点) => C1(文本节点) => C2(文本节点) => B2(元素) => B1(文本节点)
    // console.log(nextUnitOfWork, 'nextUnitOfWork');
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 执行完一个任务后，没有时间的话就要让出控制权
    shouldYield = deadline.timeRemaining() < 1;
  }
  // 如果时间片段到期后还有任务没有完成，就需要请求浏览器再次调度
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log('render阶段结束');
    commitRoot();
  }
  // 不管有没有任务，都请求再次调度，每一帧都要执行一次workLoop
  requestIdleCallback(workLoop, { timeout: 500 });
}

// 递归遍历element中的所有节点，创建Fiber树
/**
 * performUnitOfWork中currentFiber：依次进入顺序
 * element => A1（元素）=> A1（文本）=> B1（元素）=> B1（文本）
 * => C1（元素）=> C1（文本）=> C2（元素）=> C2（文本）=> B2（元素）=> B2（文本）
 */
function performUnitOfWork(currentFiber) {
  beginWork(currentFiber);
  if (currentFiber.child) {
    return currentFiber.child;
  }
  // 如果该Fiber没有儿子了，则表示当前Fiber已经完成了
  while (currentFiber) {
    completeUnitOfWork(currentFiber);
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    // 找到父亲，让父亲完成，再找到叔叔
    currentFiber = currentFiber.return; // A1首先完成，返回element根节点
    // return currentFiber;
  }
}

/**
* beginWork：创建fiber（开始收下线的钱）
* completeUnitOfWork：收集effect list（把下线的钱收完了）
* 
* 1，创建真实DOM元素
* 2，创建子fiber
*/

// 循环调用beginWork，为每个Fiber添加tag，type，props，stateNode，父Fiber，副作用表示及标识出每个fiber的nextEffent
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
  // 先处理自己，如果是一个原生节点，创建真实DOM。再创建子fiber
  // currentFiber：当前所处理的fiber。newChildren：当前所处理的fiber的子节点
  let newChildren = currentFiber.props.children;  // [element] => B1（元素的子元素）
  reconcileChildren(currentFiber, newChildren);
}

/**
 * 最先进入的为B1（元素）
 * => C1（元素）
 */
function updateHost(currentFiber) {
  // 如果此fiber的stateNode为空，则说明还没有创建DOM节点
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  // 处理当前currentFiber的子节点 
  const newChildren = currentFiber.props.children;  // B1（文本）=> C1（元素）=> C2（元素）
  reconcileChildren(currentFiber, newChildren);
}

// newChildren是一个虚拟DOM的数组，将每个虚拟DOM转成Fiber节点
function reconcileChildren(currentFiber, newChildren) {
  // 新子节点的索引
  let newChildIndex = 0;
  // 上一个新的子fiber
  let prevSibling;
  // 遍历子虚拟DOM元素数组，为每一个虚拟DOM元素创建子Fiber
  while (newChildIndex < newChildren.length) {
    // 取出虚拟DOM节点
    let newChild = newChildren[newChildIndex];
    let tag;
    if (newChild.type === ELEMENT_TEXT) {
      console.log('------------------dadasdad-----------------');
      tag = TAG_TEXT; // 如果是一个文本节点，则tag为TAG_TEXT
    } else if (typeof newChild.type === 'string') {
      tag = TAG_HOST; // 如果type是一个字符串，那么就是一个原生的DOM节点
    }

    // 构建 Fiber.
    let newFiber = {
      tag,
      type: newChild.type,  // div
      props: newChild.props,
      stateNode: null,  // div还没创建DOM元素
      return: currentFiber, // 父Fiber returnFiber
      effectTag: PLACEMENT, // 副作用标识，在render我们会收集副作用，其中包括：增加，删除，更新
      nextEffect: null, // effect list也是一个单链表
      // effect list的顺序和节点遍历完成顺序是一样的，但是节点只放那些有变化的fiber节点（出钱的人），没有变化的将会绕过
    }

    // 遍历构建的Fiber，其中最小的儿子是没有弟弟的，此时遍历也就结束了
    if (newFiber) {
      // 如果当前索引为 0，则说明是第一个儿子
      if (newChildIndex === 0) {
        // 将父Fiber的child指向第一个儿子
        currentFiber.child = newFiber;
      } else {
        // 将上一个子节点的sibling指向它的弟弟（即将第一个儿子的sibling指向第二个儿子）
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }

    newChildIndex++;
  }
}

function updateHostText(currentFiber) {
  // 如果此fiber的stateNode为空，则说明还没有创建DOM节点
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

// 创建DOM节点
function createDOM(currentFiber) {
  // 如果是一个文本节点
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  } else if (currentFiber.tag === TAG_HOST) { // span div
    // stateNode为创建的DOM节点
    let stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  }
}

function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps);
}

/**
 * 在完成的时候要收集有副作用的fiber，然后组成effect list。
 * 
 * 每个fiber有两个属性，firstEffect：指向第一个副作用的子fiber。lastEffect：指向最后一个有副作用的子fiber。
 * 中间的则用 nextEffect 做成一个单链表：
 *  - firstEffect => 大儿子
 *  - nextEffect => 二儿子
 *  - nextEffect => 三儿子
 *  - lastEffect => 三儿子
 */

// 创建副作用链，用于更新页面显示
/**
 * currentFiber:
 * A1（文本）=> B1（文本）=> C1（文本）=> C1（元素）=> C2（文本）=> C2（元素）
 */
function completeUnitOfWork(currentFiber) {
  // 找出第一个完成的currentFiber的父元素
  /**
   * A1（元素）=> B1（元素）=> C1（元素）=> B1（元素）=> C2（元素）=> B1（元素）
   */
  let returnFiber = currentFiber.return;
  if (returnFiber) {
    // 把自己挂到自己的父亲身上
    const effectTag = currentFiber.effectTag;
    // 判断自己是否有副作用，如果有就让父亲的first/lastEffect都指向自己
    if (effectTag) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.lastEffect = currentFiber;
    }

    // 将自己儿子的effect链挂载到父亲身上（即将儿子挂到儿子的爷爷身上）
    if (!returnFiber.firstEffect) {
      // 让父亲的firstEffect指向自己的firstEffect
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    if (currentFiber.lastEffect) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      returnFiber.lastEffect = currentFiber.lastEffect;
    }
  }
}

// 将虚拟DOM渲染到页面上
function commitRoot() {
  // 执行effect list之前先把该删除的元素删除
  deletions.forEach(commitWork);
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  // 提交之后要清空deletions数组
  deletions.length = 0;
  currentRoot = workInProgressRoot;
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) return;
  let returnFiber = currentFiber.return;
  let domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT && currentFiber.stateNode) { // 新增节点点
    domReturn.appendChild(currentFiber.stateNode);
  } else if (currentFiber.effectTag === DELETION) { // 删除节点
    domReturn.removeChild(currentFiber.stateNode);
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      // 如果上一个节点的text不等于当前节点text，则去更新文本节点
      if (currentFiber.alternate.props.text !== currentFiber.props.text) {
        currentFiber.stateNode.textContent = currentFiber.props.text;
      }
    } else {
      updateDOM(currentFiber.stateNode, currentFiber.alternate.props, currentFiber.props);
    }
  }
  currentFiber.effectTag = null;
}

/**
 * react 告诉浏览器，有任务需要浏览器在空闲的时候进行执行
 * 
 * 这其中有一个优先级的概念，expirationTime
 */
requestIdleCallback(workLoop, { timeout: 500 });

/**
 * Fiber 执行顺序：
 * beginWork()依次建立Fiber节点并建立DOM元素。
 * completeUnitOfWork()建立Fiber副作用链，收集副作用
 * commitRoot()按照effect链将虚拟DOM渲染到页面上
 */
