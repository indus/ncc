<!-- ![logo](https://raw.githubusercontent.com/indus/ncc/master/footage/logo.png) -->

<p align="center">
  <img src="https://raw.githubusercontent.com/indus/ncc/master/footage/logo.png" alt="logo"/>
</p>

### About
**ncc** (or node-chrome-canvas) utilizes Googles [Chrome-Browser](https://www.google.com/chrome/browser/) and its [remote debugging protocol](https://developers.google.com/chrome-developer-tools/docs/debugger-protocol) to give [Node.js](http://nodejs.org/) access to a full-blown HTML5 Canvas-Element and its 2d-Context.
<br>
  In contrast to [canvas](https://www.npmjs.org/package/canvas) (that may satisfy your needs as well) which uses [Cairo](http://cairographics.org/) to sham a canvas, **ncc** works with a real [HTMLCanvasElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement) in a Browser-Context.

  Behind the curtains of the familiar Canvas-API, **ncc** uses a single WebSocket-Connection and some command-bundeling-logic to gain its performance.

  ### Quickstart
  ```
  npm install ncc
  ```
  ```javascript
  var ncc = require('ncc')

  var canvas = ncc();

  canvas.width = canvas.height = 256;

  var ctx = canvas.getContext('2d');

  ctx.fillStyle = "slateGray";
  ctx.fillRect(28, 28, 200, 200)();  // <<< function call is intentional!
```
### Examples
1. **[draw ncc logo](https://github.com/indus/ncc/blob/master/examples/1_draw_ncc_logo.js)**
>>> **learn** how to setup ncc and draw shapes to canvas
2. **[early access](https://github.com/indus/ncc/blob/master/examples/2_early_access.js)**
>>> **learn** how to start using ncc even before it is fully set up
3. **[get return values](https://github.com/indus/ncc/blob/master/examples/3_get_return_values.js)**
>>> **learn** how to get return values of non-void functions 
4. **[gardients/patterns](https://github.com/indus/ncc/blob/master/examples/4_gradients_and_patterns.js)**
>>> **learn** how to use gradients and patterns
5. **[images](https://github.com/indus/ncc/blob/master/examples/5_images.js)**
>>> **learn** how to apply images from urls or the filesystem
6. **[shadow canvas](https://github.com/indus/ncc/blob/master/examples/6_shadow_canvas.js)**
>>> **learn** how work with more than one canvas

### API

**ncc(** &lt;[Object] options&gt;,&lt;[function] callback&gt; **)** >>> **[nccCanvas]**

  **ncc.createCanvas()** >>> **[nccCanvas]**

  **ncc.createImage(** &lt;[String] src&gt;,&lt;[function] onloadFn&gt;,&lt;[String] onerror&gt; **)** >>> **[nccImage]**

    **nccCanvas.getContext(** *[nativeAPI]('http://msdn.microsoft.com/en-us/library/ie/ff975238(v=vs.85').aspx)* **)** >>> **[nccContext2d]**

    **nccContext2d.createLinearGradient(** *nativeAPI* **)** >>> **[nccLinearGradient]** <br>
    **nccContext2d.createRadialGradient(** *nativeAPI* **)** >>> **[nccRadialGradient]** <br>
**nccContext2d.createPattern(** *nativeAPI* **)** >>> **[nccPattern]**
  