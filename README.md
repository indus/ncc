<!-- ![logo](https://raw.githubusercontent.com/indus/ncc/master/footage/logo.png) -->

<p align="center">
  <img src="https://raw.githubusercontent.com/indus/ncc/master/footage/logo.png" alt="logo"/>
</p>

### About
**ncc** (or node-chrome-canvas) utilizes Googles [Chrome-Browser](https://www.google.com/chrome/browser/) and its [remote debugging protocol](https://developers.google.com/chrome-developer-tools/docs/debugger-protocol) to give [Node.js](http://nodejs.org/) access to a full-blown HTML5 Canvas-Element and its 2d-Context.  
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
ctx.fillRect(28, 28, 200, 200)();  // >>> function call is intentional!
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

**ncc** follows the native [Web API Interfaces](https://developer.mozilla.org/en-US/docs/Web/API)...  
[HTMLCanvasElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement),
[HTMLImageElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement),
[CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D),
[CanvasGradient](https://developer.mozilla.org/en-US/docs/Web/API/CanvasGradient),
[CanvasPattern](https://developer.mozilla.org/en-US/docs/Web/API/CanvasPattern)  
... as close as possible.

Differences are a result of the asynchronous nature of **ncc**. All object creations, method calls and property manipulations don't get processed directly, but get serialized and stored until a return value is necessary and a request is therefore unavoidable.  
Every 'Object' provided by **ncc* is (and also every of their methods returns) actually a function to trigger a synchronization. You can pass a error-first-callback ( 'function(error, result){...}' ) to such a function to receive the return value of the last action (see [examples](https://github.com/indus/ncc#examples)).
<p align="center">
  <img src="https://raw.githubusercontent.com/indus/ncc/master/footage/flow.png" alt="flowchart"/>
</p>
The **Canvas-** RenderingContext2D, -Gradient and -Pattern Proxys are fully implemented.  
The **HTML-** CanvasElement and -ImageElement Proxys only have properties and functions that are necessary. They both implmenet a 'with' and 'height' but no DOM functionality.  
Methods that go beyond the native API are marked with a leading underscore and hidden from console by default (e.g. 'image._toFs(filePath, &lt;callback&gt;)' to write a image to the filesystem)

#### poxy - creators

* **ncc(** &lt;options&gt; **,** &lt;callback&gt; **)** >>> **[canvas]**  
**ncc(** &lt;callback&gt; **)** >>> **[canvas]**

* **ncc.createCanvas()** >>> **[canvas]**

* **ncc.createImage(** &lt;src&gt; **,** &lt;onloadFn&gt; **,** &lt;onerrorFn&gt; **)** >>> **[image]**

* **nccCanvas.getContext(** *[nativeAPI](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement#Methods)* **)** >>> **[context2d]**

* **context2d.createLinearGradient(** *[nativeAPI](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D#createLinearGradient())* **)** >>> **[linearGradient]**  
**context2d.createRadialGradient(** *[nativeAPI](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D#createRadialGradient())* **)** >>> **[radialGradient]**  
**context2d.createPattern(** *[nativeAPI](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D#createPattern())* **)** >>> **[pattern]**

#### options (with defaults)
```javascript
{ verbose: false,
  port: 9222,
  spawn: {
    command: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    args: [ '--app=' + __dirname + '\\index.html',
            '--remote-debugging-port={PORT}',
            '--user-data-dir=' + os.tmpdir() + '\\nccanvas' ],
    options: {}
  },
  retry: 3,
  retryDelay: 1000 }
```

If you are faceing problems getting **ncc** started (especially on a none-windows system) you should make changes to the 'spawn'-options. Try to **[spawn](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options)** a blank chrome instance first...
```javascript
var spawn = require('child_process').spawn,
    args = [],
    chrome = spawn('path/to/chromeExecutable', args);

chrome.stdout.on('data', function (data) {
  console.log('stdout: ' + data);
});

chrome.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
});

chrome.on('close', function (code) {
  console.log('child process exited with code ' + code);
});
```
