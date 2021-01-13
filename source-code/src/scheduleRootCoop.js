import { ELEMENT_TEXT, TAG_HOST, TAG_ROOT, TAG_TEXT, PLACEMENT } from "./constants";
import { setProps } from './util';

/**
 * 从根节点开始渲染和调度
 * 两个阶段:调度阶段：diff阶段，对比新旧虚拟DOM，进行增量，更新或者创建，也叫render阶段
 * 这个阶段可能比较耗时间，我们可以将任务进行拆分，拆分的维度是虚拟DOM，此阶段可以暂停
 * diff = render
 * render阶段的成果是副作用列表，render阶段有2个任务：根据虚拟DOM生成fiber树，收集副作用列表
 * 第二个阶段是提交阶段，进行DOM更新创建的阶段，此阶段不能暂停，要一气呵成。
 */

 
let nextUnitWork = null;
let workInProgressRoot = null; // RootFiber应用的根
function scheduleRoot(rootFiber)  { // {tag: TAG_ROOT, stateNode:container, props:{children:[element]}}
    workInProgressRoot = rootFiber;
    nextUnitWork = rootFiber; 
}
// 循环执行工作
function workLoop(deadline) {
    let shouldYield =  false; // 是否要让出时间片，默认不用
    while(nextUnitWork && !shouldYield) { // 如果还有任务，有控制权，去执行任务
        nextUnitWork = performUnitWork(nextUnitWork);  // 执行完一个任务后下面看还有没有时间
        shouldYield = deadline.timeRemaining() < 1; //没有时间就要让出控制权
    }
    if(!nextUnitWork && workInProgressRoot) { // 如果任务没有了
        console.log('rennder阶段结束')
        commitRoot();
    } 
      // 如果时间片到期后还有任务，就请求浏览器再次调度
     requestIdleCallback(workLoop, { timeout: 500 })
}

function performUnitWork(currentFiber) {
    beginWork(currentFiber);
    if(currentFiber.child) {
        return currentFiber.child
    }
    while(currentFiber) {
        complateUnitWork(currentFiber); // 没有儿子就让自己完成，看有没有弟弟，有弟弟返回弟弟，也没有弟弟就返回父亲
        if(currentFiber.sibling) { // 如果有兄弟，返回兄弟，没有兄弟先返回爸爸，让爸爸完成，
            return currentFiber.sibling;
        } 
         currentFiber = currentFiber.return; // 当前节点变成父亲，让父亲完成
         return currentFiber;
    }

}

function updateDOM(stateNode, oldProps, newProps) {
    setProps(stateNode, oldProps, newProps);
}

function createDOM(currentFiber) {
    if(currentFiber.tag === TAG_TEXT) {
        return document.createTextNode(currentFiber.props.text);
    } else if(currentFiber.tag  === TAG_HOST) {
        let stateNode = document.createElement(currentFiber.type);
        updateDOM(stateNode, {}, currentFiber.props);
        return stateNode;
    }
}

// 开始执行任务, 1:创建DOM元素, 2:创建子fiber
function beginWork(currentFiber) {
    if(currentFiber.tag === TAG_ROOT) {
        updateHostRoot(currentFiber);
    } else if(currentFiber.tag === TAG_TEXT) {
        updateHostText(currentFiber);
    } else if(currentFiber.tag === TAG_HOST) {
        updateHost(currentFiber);
    }
}
function updateHost(currentFiber) {
    if(!currentFiber.stateNode) {
        currentFiber.stateNode  =  createDOM(currentFiber);
    }
    const newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren);
}

function updateHostText(currentFiber) {
    if(!currentFiber.stateNode) { // 如果此fiber没有创建DOM节点
        currentFiber.stateNode = createDOM(currentFiber);
    }
}

function updateHostRoot(currentFiber) {
    // 先处理自己，如果是一个原生节点，创建真实DOM
    let newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren);
}

// 协调子节点
function reconcileChildren(currentFiber, newChildren) {
    let newChildIndex = 0; // 新子节点的索引
    let prevSiblinng; // 上一个子fiber
    while(newChildIndex  < newChildren.length) {
        let newChild  = newChildren[newChildIndex]; // 取出
        let tag;
        if(newChild.type == ELEMENT_TEXT) {
            tag = TAG_TEXT; // 文本节点
        } else if(typeof newChild.type === 'string') {
            tag = TAG_HOST; // 原生DOM节点
        }
        let newFiber = {
            tag,
            type: newChild.type,
            props: newChild.props,
            stateNode: null,
            return: currentFiber,
            effectTag: PLACEMENT, // 副作用标识，这是增加
            nextEffect: null, // 指向下一个节点, effect list是链表
        }
        if(newFiber) {
            if(newChildIndex === 0) {
                currentFiber.child = newFiber;
            } else {
                prevSiblinng.sibling = newFiber
            }
            prevSiblinng = newFiber;
        }
        newChildIndex++;
    }
}
// 任务执行完了 ,收集副作用，组成effect-list
function complateUnitWork(currentFiber) {
    let returnFiber = currentFiber.return;
    if(returnFiber) {
        if(!returnFiber.firestEffect) {
            returnFiber.firestEffect = currentFiber.firestEffect;
        }
        if(currentFiber.lastEffect) {
            if(returnFiber.lastEffect) {
                returnFiber.lastEffect.nextEffect = currentFiber.firestEffect;
            } else {
                returnFiber.lastEffect = currentFiber.lastEffect;
            }
        }
        const effectTag = currentFiber.effectTag;
        if(effectTag) { // 说明有副作用
            if(returnFiber.lastEffect) {
                returnFiber.lastEffect.nextEffect = currentFiber;
            } else {
                returnFiber.firestEffect = currentFiber;
            }
            returnFiber.lastEffect = currentFiber;
        }
    }
}

function commitRoot() {
    let currentFiber = workInProgressRoot.firestEffect;
    while(currentFiber) {
        console.log(currentFiber)
        commitWork(currentFiber);
        currentFiber = currentFiber.nextEffect;
    }
    workInProgressRoot = null;
}

function commitWork(currentFiber) {
    if(!currentFiber) return;
    let returnFiber = currentFiber.return;
    let returnDOM = returnFiber.stateNode;
    if(currentFiber.effectTag === PLACEMENT) {
        returnDOM.appendChild(currentFiber.stateNode);
    }
    returnFiber.effectTag = null;
}

requestIdleCallback(workLoop, { timeout: 500 });

export default scheduleRoot;