<!-- ![logo](https://raw.githubusercontent.com/indus/ncc/master/footage/logo.png) -->

<p align="center">
  <img src="https://raw.githubusercontent.com/indus/ncc/master/footage/logo.png" alt="logo"/>
</p>

### About
**ncc** (or node-chrome-canvas) utilizes Googles [Chrome-Browser](https://www.google.com/chrome/browser/) and its [remote debugging protocol](https://developers.google.com/chrome-developer-tools/docs/debugger-protocol) to give [Node.js](http://nodejs.org/) access to a full-blown HTML5 Canvas-Element and its 2d-Context.

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