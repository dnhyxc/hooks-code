/**
 * render 是要把一个元素渲染到一个容器内部
 */
import { TAG_ROOT } from './constants';
import { scheduleRoot } from './scheduleRoot';

function render(element, container) {
  let rootFiber = {
    // 每个 fiber 会有一个 tag 标识此元素的类型
    tag: TAG_ROOT,
    // 一般情况下，如果这个元素是一个原生节点的话，stateNode 指向真实 DOM 元素
    stateNode: container,
    // props.children 是一个数组，里面放的是 React 元素（虚拟 DOM），后面会根据每个 React 元素创建对应的 Fiber
    props: { children: [element] }  // 这个 fiber 的属性对象 children 属性，里面放的是要渲染的元素
  }
  scheduleRoot(rootFiber);
}

const ReactDOM = {
  render
}

export default ReactDOM;