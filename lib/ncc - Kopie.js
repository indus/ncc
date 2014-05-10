
var spawn = require('child_process').spawn
, http = require('http')
, ws = require('ws')
, os = require('os');

var verbose;


function ncc(cmd, cb) {
    if (cb === undefined) { // queue
        if (typeof cmd == 'string' || cmd instanceof String) {
            verbose && console.log(cmd);
            ncc._ += cmd + ";"
            return ncc;
        }

        if ((cb = cmd) !== null) {
            ncc._queue.push({ cmd: ncc._, cb: cb });
            ncc._ = "";
        }

        if (!ncc._queue[0] || ncc._req == ncc._queue[0]) return;

        ncc._req = ncc._queue[0];

        ncc(ncc._req.cmd, function (err, res) {
            ncc._req = ncc._queue.shift();
            ncc._req.cb && ncc._req.cb(err, res);
            ncc(null);
        })


    } else { // fire eval request
        ncc._ws.send('{"id":0,"method":"Runtime.evaluate","params":{"expression":"' + cmd + '"}}')

        cb && ncc._ws.once('message', function (data) {
            data = JSON.parse(data);
            var err = data.error || data.result.wasThrown ? data.result.result : null,
                res = (err) ? null : data.result.result;
            cb(err, res);
        });

    }

    return ncc;
}


function NCC(cb, options) {

    options = options || {};
    verbose = options.verbose;

    verbose && console.log("[nccanvas] started");
    verbose && console.time("[nccanvas] startup");


    // start child-process with nccanvas-app in chrome 
    var cmd = options.chrome || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

    var args = [
        '--app=' + __dirname + '\\index.html',
        '--remote-debugging-port=9221',
        '--user-data-dir=' + os.tmpdir() + '\\nccanvas'
    ];


    var chrome = spawn(cmd, args);

    chrome.on('close', function (code) {
        if (code !== 0) {
            verbose && console.log('[nccanvas cp] exited with code ' + code);
        }
    });

    chrome.stdout.on('data', function (data) {
        verbose && console.log('[nccanvas cp] stdout: ' + data);
    });

    chrome.stderr.on('data', function (data) {
        verbose && console.log('[nccanvas cp] stderr: ' + data);
    });

    chrome.on('error', function (err) {
        console.log(err);
        throw new Error("[nccanvas cp] unable to start chrome with path: '" + cmd + "'")
    });

    // get a JSON object with information about inspectable pages/apps
    http.get("http://localhost:9221/json", function (res) {
        verbose && console.log("[nccanvas cp] inspectables requested");
        var data = '';

        res.on('data', function (chunk) {
            data += chunk;
        });

        res.on('end', function () {

            verbose && console.log("[nccanvas cp] inspectables received");

            var list = JSON.parse(data);
            for (var i = 0, l = list.length; i < l; i++) {
                if (list[i].title == "ncc") {

                    var proto = { _: ncc }

                    Object.defineProperties(ncc, {
                        _canvas: {
                            value: Object.create(proto, canvasProps)
                        },
                        _ctx: {
                            value: Object.create(proto, ctxProps)
                        },
                        _ws: {
                            value: new ws(list[i].webSocketDebuggerUrl)
                        },
                        _queue: {
                            value: new Array()
                        },
                        _req: {
                            value: undefined,
                            writable: true
                        },
                        _: {
                            value: "",
                            writable: true
                        }
                    })

                    ncc._ws.on('open', function () {

                        verbose && console.log("[nccanvas ws] remote debugging session established");

                        /*ncc(function () {
                            console.log("test");
                        })*/

                        ncc("canvas.width+','+canvas.height",
                            function (err, res) {
                                if (err) {
                                    verbose && console.log("[nccanvas] ERROR: " + err.message);
                                    cb(err);
                                    return
                                }

                                var size = res.value.split(',');
                                ncc._canvas._width = size[0];
                                ncc._canvas._height = size[1];


                                verbose && console.timeEnd("[nccanvas] startup");

                                // return the CanvasProxyObject in callback
                                cb(null, ncc._canvas);

                            })


                    });

                    ncc._ws.on('close', function () {
                        verbose && console.log('[nccanvas ws] remote debugging session ended');
                    });

                } else {
                    verbose && console.log("[nccanvas cp] nccanvas not found in inspectables");
                    cb("[nccanvas cp] nccanvas not found in inspectables")
                }
            }
        })
    }).on('error', function (e) {
        console.log(e.message);
        cb(e.message)
    });

    // return the CanvasProxyObject for early access
    // return HTMLCanvasElement;
}



var fs = require('fs')

var typeMap = {
    png: 'image/png',
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg'
}


Object.defineProperties(NCC, {
    canvasToFile: {
        value: function (filename, cb, options) {
            ncc._canvas.toDataURL(typeMap[filename.split('.').pop()])(function (err, res) {
                if (err) {
                    cb(err);
                    return;
                }
                fs.writeFile(filename, new Buffer(res.replace(/^data:image\/\w+;base64,/, ""), 'base64'), {}, cb);
            })
        }
    },
    fileToImage: {
        value: function (filename, cb, options) {
            fs.readFile(filename, 'base64', function (err, img) {
                if (err) {
                    cb(err);
                    return;
                }
                cb(null, 'data:' + typeMap[filename.split('.').pop()] + ';base64,' + img)
            });
        }
    }
})

module.exports = NCC;


// helperFn for trivial properties
function defineProp(props, key, type, val) { //TODO: validate setter
    var name = props._name.value;

    var key_;
    switch (type) {
        case 'string':
        case 'color':
            key_ = '"\'"+' + key + '+"\'"'
            break;
        default:
            key_ = key;

    }
    props['_' + key] = { value: val, writable: true }
    props[key] = {
        get: new Function('return this._' + key),
        set: new Function(key, 'this._("' + name + '.' + key + '="+' + key_ + ');return this._' + key + '=' + key_ + ';'),
        enumerable: true
    }
}

// helperFn for trivial functions
function defineVoidFn(props, key, parameters) { //TODO: validate parameters
    var name = props._name.value;
    props[key] = {
        value: new Function('return this._("' + name + '.' + key + '(" + Array.prototype.slice.call(arguments) + ")");'),
        enumerable: true
    }
}


/// HTMLCanvasElement

var canvasProps = {
    _name: {
        value: "canvas"
    },

    // HTMLCanvasElement complex functions
    getContext: {
        value: function (contextId) {
            if (contextId == "2d") {
                return this._._ctx;
            } else {

            }
        },
        enumerable: true
    },
    toDataURL: {
        value: function (type, args) {
            var ncc = this._(this._name + ".toDataURL(" + (type ? ("'" + type + "'") : "") + ")");
            return function (cb) {
                ncc(function (err, res) {
                    if (err) { cb(err); return; }
                    cb(err, res.value);
                })
            }
        },
        enumerable: true
    }
}

// HTMLCanvasElement trivial properties
defineProp(canvasProps, 'width', 'number', 300);
defineProp(canvasProps, 'height', 'number', 150);


/// CanvasRenderingContext2D

var ctxProps = {
    _name: {
        value: "ctx"
    },


    // CanvasRenderingContext2D complex properties
    canvas: {
        get: function () {
            return this._._canvas;
        },
        enumerable: true
    },
    currentPath: { //sitts behind flag
        get: function () {
            throw new Error("'currentPath' not implemented yet")
            return
        },
        set: function (currentPath) {
            throw new Error("'currentPath' not implemented yet")
            return
        },
        enumerable: true
    },
    _fillStyle: {
        value: "#000000"
    },
    fillStyle: {

        get: function () { return this._fillStyle },

        set: function (fillStyle) {
            this._(this._name + ".fillStyle = " + (fillStyle._name || ("'" + fillStyle + "'"))); return this._fillStyle = fillStyle;
        },
        enumerable: true
    },
    _strokeStyle: {
        value: "#000000"
    },
    strokeStyle: {

        get: function () { return this._strokeStyle },

        set: function (strokeStyle) {
            this._(this._name + ".strokeStyle = " + (strokeStyle._name || ("'" + strokeStyle + "'"))); return this._strokeStyle = strokeStyle;
        },
        enumerable: true
    },

    // CanvasRenderingContext2D complex functions
    createImageData: { // ImageData
        value: function (width, height) { // "float" width, "float" height

            return function (cb) {
                cb(null, {
                    data: new Uint8ClampedArray(Array.apply(null, new Array(width * height * 4)).map(Number.prototype.valueOf, 0)),
                    width: width,
                    height: height
                })
            }

            /*
            // unnecessary >  build and return Object directly
            var ncc = this._("var imageData = " + this._name +".createImageData(" + width + ", " + height + "); Array.prototype.slice.call(imageData.data).join(',') + '_' + imageData.width + '_' + imageData.height");
            return function (cb) {
                ncc(function (err, res) {
                    if(err){cb(err);return;}

                    res.value = res.value.split('_');
                    res.value[0] = res.value[0].split(',');
                    
                    for (var i = 0, l = res.value[0].length; i < l; i++)
                        res.value[0][i] = +res.value[0][i];
                    res.value = {
                        data: res.value[0],
                        width: +res.value[1],
                        height: +res.value[2]
                    }

                    cb(err, res.value)
                })
            }*/
        }
    },
    createLinearGradient: { // nsIDOMCanvasGradient
        value: function (x0, y0, x1, y1) { // "float" x0, "float" y0, "float" x1, "float" y1
            var lgName = "linearGradient" + Math.random().toString(36).slice(2)
            var ncc = this._("var " + lgName + " = " + this._name + ".createLinearGradient(" + x0 + "," + y0 + "," + x1 + "," + y1 + ")");

            return function (cb) {
                cb(null, Object.create({}, {
                    _name: {
                        value: lgName
                    },
                    addColorStop: {
                        value: function (stop, color) {
                            ncc(lgName + ".addColorStop(" + stop + ",'" + color + "')")
                            return ncc
                        }
                    }
                }))
            }
        }
    },
    createPattern: { // nsIDOMCanvasPattern 
        value: function (image, repetition) { // "nsIDOMHTMLElement image, "DOMString repetition
            var pName = "pattern" + Math.random().toString(36).slice(2)
            var ncc = this._("var img = new Image(); img.src = '" + image + "'; var " + pName + "=" + this._name + ".createPattern(img,'" + repetition + "')");

            return function (cb) {
                cb(null, Object.create({}, {
                    _name: {
                        value: pName
                    }
                }))
            }
        }
    },
    createRadialGradient: { // nsIDOMCanvasGradient
        value: function (x0, y0, r0, x1, y1, r1) { // "float" x0, "float" y0, "float" r0, "float" x1, "float" y1, "float" r1
            var rgName = "radialGradient" + Math.random().toString(36).slice(2)
            var ncc = this._("var " + rgName + " = " + this._name + ".createRadialGradient(" + x0 + "," + y0 + "," + r0 + "," + x1 + "," + y1 + "," + r1 + ")");

            return function (cb) {
                cb(null, Object.create({}, {
                    _name: {
                        value: rgName
                    },
                    addColorStop: {
                        value: function (stop, color) {
                            ncc(rgName + ".addColorStop(" + stop + ",'" + color + "')")
                            return ncc
                        }
                    }
                }))
            }
        }
    },
    drawImage: { // void
        value: function (image, a1, a2, a3, a4, a5, a6, a7, a8) { // "nsIDOMElement image, "float" a1, "float" a2, "float" a3 Optional, "float" a4 Optional, "float" a5 Optional, "float" a6 Optional, "float" a7 Optional, "float" a8 Optional 
            return this._("var img = new Image(); img.src = '" + image + "'; " + this._name + ".drawImage(img," + (Array.prototype.slice.call(arguments, 1).join(',')) + ")");
        }
    },
    drawCustomFocusRing: { // boolean
        value: function (element) { // Element element
            throw new Error("'drawCustomFocusRing' not implemented yet")
        }
    },
    drawSystemFocusRing: { // void
        value: function (element) { // Element element
            throw new Error("'drawSystemFocusRing' not implemented yet")
        }
    },
    fillText: { // void
        value: function (text, x, y, maxWidth) { // "DOMString text, "float" x, "float" y, "float" maxWidth Optional
            var props = (maxWidth === undefined) ? ("'" + text + "'," + x + "," + y) : ("'" + text + "'," + x + "," + y + "," + maxWidth)
            return this._(this._name + ".fillText(" + props + ")");
        }
    },
    getImageData: { // ImageData
        value: function (x, y, width, height) { // "float" x, "float" y, "float" width, "float" height
            var ncc = this._("Array.prototype.slice.call(" + this._name + ".getImageData(" + x + "," + y + "," + width + "," + height + ").data).join(',')");
            return function (cb) {
                ncc(function (err, res) {
                    if (err) { cb(err); return; }

                    var imageData = {
                        data: new Uint8ClampedArray(res.value.split(',')),
                        width: width,
                        height: height
                    }

                    cb(err, imageData)
                })
            }
        }
    },
    getLineDash: { // sequence <unrestricted double> 
        value: function () { //
            var ncc = this._(this._name + ".getLineDash().join(',')");
            return function (cb) {
                ncc(function (err, res) {
                    if (err) { cb(err); return; }

                    res.value = res.value.split(',');
                    for (var i = 0, l = res.value.length; i < l; i++)
                        res.value[i] = +res.value[i];

                    cb(err, res.value)
                })
            }
        }
    },
    isPointInPath: { // boolean
        value: function (x, y) { // "float" x, "float" y
            var ncc = this._(this._name + ".isPointInPath(" + x + "," + y + ")");
            return function (cb) {
                ncc(function (err, res) {
                    cb(err, res.value)
                })
            }
        }
    },
    isPointInStroke: { // boolean
        value: function (x, y) { // "float" x, "float" y
            var ncc = this._(this._name + ".isPointInStroke(" + x + "," + y + ")");
            return function (cb) {
                ncc(function (err, res) {
                    cb(err, res.value)
                })
            }
        }
    },
    measureText: { // nsIDOMTextMetrics
        value: function (text) { // "DOMString text
            var ncc = this._(this._name + ".measureText('" + text + "').width");
            return function (cb) {
                ncc(function (err, res) {
                    if (err) { cb(err); return; }

                    cb(null, {
                        width: res.value
                    })
                })
            }
        }
    },
    putImageData: { // void
        value: function (imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) { // "ImageData imagedata, "float" dx, double dy, "float" dirtyX Optional, "float" dirtyY Optional, "float" dirtyWidth Optional, "float" dirtyHeight Optional
            return this._("var data = [" + Array.prototype.slice.call(imagedata.data).join(',') + "]; var iD = " + this._name + ".createImageData(" + imagedata.width + ", " + imagedata.height + "); for (var i = 0, l = iD.data.length; i < l; i++) iD.data[i] = +data[i]; " + this._name + ".putImageData(iD," + (Array.prototype.slice.call(arguments, 1).join(',')) + ")");
        }
    },
    setLineDash: { // void
        value: function (segments) { // "sequence <unrestricted double> segments
            return this._(this._name + ".setLineDash([" + segments.join(',') + "])");
        }
    },
    strokeText: { // void
        value: function (text, x, y, maxWidth) { // "DOMString text, "float" x, "float" y, "float" maxWidth Optional

            var props = (maxWidth === undefined) ? ("'" + text + "'," + x + "," + y) : ("'" + text + "'," + x + "," + y + "," + maxWidth)
            return this._(this._name + ".strokeText(" + props + ")");
        }
    }
}

// CanvasRenderingContext2D trivial properties

//defineProp(ctxProps, "fillStyle", "color", "#000000"); // not trivial because of possible gradients
defineProp(ctxProps, "font", "string", "10px sans-serif");
defineProp(ctxProps, "globalAlpha", "number", 1);
defineProp(ctxProps, "globalCompositeOperation", "string", "source-over");
defineProp(ctxProps, "imageSmoothingEnabled", "boolean", true);
defineProp(ctxProps, "lineCap", "string", "butt");
defineProp(ctxProps, "lineDashOffset", "number", 0);
defineProp(ctxProps, "lineJoin", "string", "miter");
defineProp(ctxProps, "lineWidth", "number", 1);
defineProp(ctxProps, "miterLimit", "number", 10);
defineProp(ctxProps, "shadowBlur", "number", 0);
defineProp(ctxProps, "shadowColor", "color", "rgba(0, 0, 0, 0)");
defineProp(ctxProps, "shadowOffsetX", "number", 0);
defineProp(ctxProps, "shadowOffsetY", "number", 0);
//defineProp(ctxProps, "strokeStyle", "color", "#000000"); // not trivial because of possible gradients
defineProp(ctxProps, "textAlign", "string", "start");
defineProp(ctxProps, "textBaseline", "string", "alphabetic");
defineProp(ctxProps, "webkitBackingStorePixelRatio", "number", 1);
defineProp(ctxProps, "webkitImageSmoothingEnabled", "boolean", true);

// CanvasRenderingContext2D trivial functions
defineVoidFn(ctxProps, "arc", ["float", "float", "float", "float", "float", "boolean"]);
defineVoidFn(ctxProps, "arcTo", ["float", "float", "float", "float", "float"]);
defineVoidFn(ctxProps, "beginPath", []);
defineVoidFn(ctxProps, "bezierCurveTo", ["float", "float", "float", "float", "float", "float"]);
defineVoidFn(ctxProps, "clearRect", ["float", "float", "float", "float"]);
defineVoidFn(ctxProps, "clip", []);
defineVoidFn(ctxProps, "closePath", []);
defineVoidFn(ctxProps, "fill", []);
defineVoidFn(ctxProps, "fillRect", ["float", "float", "float", "float"]);
defineVoidFn(ctxProps, "lineTo", ["float", "float"]);
defineVoidFn(ctxProps, "moveTo", ["float", "float"]);
defineVoidFn(ctxProps, "quadraticCurveTo", ["float", "float", "float", "float"]);
defineVoidFn(ctxProps, "rect", ["float", "float", "float", "float"]);
defineVoidFn(ctxProps, "restore", []);
defineVoidFn(ctxProps, "rotate", ["float"]);
defineVoidFn(ctxProps, "save", []);
defineVoidFn(ctxProps, "scale", ["float", "float"]);
defineVoidFn(ctxProps, "scrollPathIntoView", []);
defineVoidFn(ctxProps, "setTransform", ["float", "float", "float", "float", "float", "float"]);
defineVoidFn(ctxProps, "stroke", []);
defineVoidFn(ctxProps, "strokeRect", ["float", "float", "float", "float"]);
defineVoidFn(ctxProps, "transform", ["float", "float", "float", "float", "float", "float"]);
defineVoidFn(ctxProps, "translate", ["float", "float"]);

