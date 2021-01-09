## 浏览器基础

### 屏幕刷新率

1，目前大多数设备的屏幕刷新率为：60 次 / 秒。

2，浏览器渲染动画或页面的每一帧的速率也需要跟设备屏幕的刷新率保持一致。

3，页面是一帧一帧绘制出来的，当每秒绘制的帧数（FPS）达到 60 时，页面是流畅的，小于这个值时，用户会感觉到卡顿。

4，每个帧的预算时间是 16.66 毫秒（1 秒 / 60）。

5，1s 60 帧，所以每一帧分到的时间是 1000/60 = 16 ms。所以我们书写代码时力求不让一帧的工作量超过 16ms。

### 帧

1，每个帧的开头包括 `样式计算，布局和绘制`。

2，JavaScript 执行 JavaScript 引擎和页面渲染引擎在同一个渲染线程，GUI 渲染和 JavaScript 执行是互斥的。

3，如果某个任务执行时间过长，浏览器会推迟渲染。

4，一个时间帧中执行顺序及包含内容如下：

> **input events（输入事件）**：`阻塞输入事件（touch、wheel）`和 `非阻塞输入事件（click、keypress）` =>
> 
> **JavaScript**：`定时器（timers）` => 
> 
> **开始帧**：每一帧事件包括（`window resize、scroll、media query change`）=> 
> 
> **requestAnimationFrame**：`requestAnimationFrame Frame callbacks` =>
> 
> **Layout（布局）**：`Recalculate style（计算样式）`、`Update Layout（更新布局）` =>
> 
> **Paint（绘制）**：`Compositing update`、`Paint invaidation`、`Record` =>
> 
> **空闲阶段**：`idle callback1`、`idle callback2`......
>
> 每一帧执行时间大概是：`16.6ms`。

### requestAnimationFrame

1，requestAnimationFrame 回调函数会在绘制之前执行。

```html
<body>
  <div class="box1" id="progress-bar"></div>
  <button id="btn">开始</button>
  <script>
    let btn = document.getElementById('btn');
    let oDiv = document.getElementById('progress-bar');
    let start;

    function progress() {
      oDiv.style.width = oDiv.offsetWidth + 1 + 'px';
      oDiv.innerHTML = (oDiv.offsetWidth) + '%';
      if (oDiv.offsetWidth < 100) {
        let current = Date.now();
        // 打印出开始准备执行的时候到真正执行时的时间差
        console.log(current - start);
        start = current;
        requestAnimationFrame(progress);
      }
    }

    btn.addEventListener('click', () => {
      // 每次点击之前先清除原来的宽度
      oDiv.style.width = 0;
      let current = Date.now();
      start = current;
      requestAnimationFrame(progress);
    })
  </script>
</body>
```

### requestIdleCallback

1，当希望快速响应用户，让用户觉得够快，不能阻塞用户交互，此时 `requestIdleCallback`  就能派上用场。

2，requestIdleCallback 使开发者能够`在主事件循环上执行后台和低优先级工作`，而不会影响延迟关键事件，如`动画`和`输入响应`。

3，正常帧任务完成后没超过 16ms，说明时间有富余，此时就会执行 requestIdleCallback 里注册的任务。

![requestIdleCallback](./image/rAF.jpg)

4，requestIdleCallback() 使用示例如下：

```html
<body>
  <div>
    <p id="p1">任务1:</p>
    <p id="p2">任务2:</p>
    <p id="p3">任务3:</p>
  </div>
  <script>
    /**
     * window.requestIdleCallback(callback, { timeout: 1000 });
     * 这是一个全局属性（挂载在 window 上），用于用户告知浏览器，用户现在执行的 callback 函数，它的优先级比较低，
     * 此时就需要通过 requestIdleCallback() 来告知浏览器，可以在空闲的时候执行 callback 函数。
     * 但是如果设置了 timeout 超时时间，那么就不管浏览器是否是空闲的都必须执行 callback 函数。
     */

    const p1 = document.getElementById('p1');
    const p2 = document.getElementById('p2');
    const p3 = document.getElementById('p3');

    function sleep(delay) {
      /**
       * 在 JS 里实现睡眠功能：
       * 如果 Date.now() - start 小于等于 delay 则什么都不做，即不会跳出 for 循环，该函数执行就不会结束。
       * 如果 Date.now() - start 大于 delay，则会跳出 for 循环，该函数也就执行结束了，会继续依次执行下面的代码。
       */
      for (var start = Date.now(); Date.now() - start <= delay;) {}
    }

    const works = [
      () => {
        console.log('第一个任务开始执行');
        p1.innerHTML = '第1个任务开始执行';
        sleep(20);
        console.log('第一个任务执行完成')
        p1.innerHTML = '第1个任务执行完成';
      },
      () => {
        console.log('第二个任务开始执行');
        p2.innerHTML = '第2个任务开始执行';
        sleep(20);
        console.log('第二个任务执行完成')
        p2.innerHTML = '第2个任务开始执行';
      },
      () => {
        console.log('第三个任务开始执行');
        p3.innerHTML = '第3个任务开始执行';
        sleep(20);
        console.log('第三个任务执行完成')
        p3.innerHTML = '第3个任务开始执行';
      },
    ]

    requestIdleCallback(workLoop, {
      timeout: 1000
    });

    /**
     * deadline 是一个对象，有两个属性：
     * - timeRemaining()：可以返回此帧还剩多少时间供用户使用。
     * - didTimeout：返回此 callback 任务是否超时。
     */
    function workLoop(deadline) {
      console.log(`本帧的剩余时间为${parseInt(deadline.timeRemaining())}`);
      // 如果此帧的剩余时间超过 0，或者已经超时了，且剩余任务数大于 0，则继续往下执行。
      // 如果没有剩余时间了，就需要放弃执行任务控制权，将控制权交还给浏览器
      while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && works.length > 0) {
        performUnitOfWork();
      }

      // 如果还有任务没执行，则继续递归执行 requestIdleCallback()
      if (works.length > 0) {
        requestIdleCallback(workLoop, {
          timeout: 1000
        });
      }
    }

    function performUnitOfWork() {
      works.shift()();
    }
  </script>
</body>
```