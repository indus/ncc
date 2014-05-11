var spawn = require('child_process').spawn,
    http = require('http'),
    fs = require('fs'),
    ws = require('ws'),
    os = require('os');

var debug = false;

function NCC(opt, cb) {

    var canvas;

    if (typeof (opt) == 'function') {
        cb = opt;
        opt = null;
    }

    if (opt) for (var key in NCC.options)
        if (opt[key]) NCC.options[key] = opt[key];

    if (!NCC.options.spawn) NCC.chromePid = -1;

    if (NCC.options.spawn && !NCC.chromePid) {

        var command = NCC.options.spawn.command,
            args = NCC.options.spawn.args,
            options = NCC.options.spawn.options,
            regExp = new RegExp('{(.*?)}'),
            reg;

        for (var i = 0, l = args.length; i < l; i++) {
            reg = regExp.exec(args[i]);
            if (reg) args[i] = args[i].replace(reg[0], NCC.options[reg[1].toLocaleLowerCase()]);
        }

        var chrome = spawn(command, args, options);

        NCC.chromePid = chrome.pid;

        chrome.on('close', function (code) {
            if (code !== 0)
                NCC.log('[ncc cp] exited with code ' + code);
            NCC.chromePid = null;
        });

        chrome.stdout.on('data', function (data) {
            NCC.log('[ncc cp] stdout: ' + data);
        });

        chrome.stderr.on('data', function (data) {
            NCC.log('[ncc cp] stderr: ' + data);
        });

        chrome.on('error', function (err) {
            NCC.chromePid = null;
            throw new Error("[ncc cp] unable to start chrome with command: '" + command + "'");
        });
    }

    var url = "http://localhost:" + NCC.options.port + "/json";

    http.get(url, function (res) {
        NCC.log("[ncc rd] inspectables requested");
        var rdJson = '';

        res.on('data', function (chunk) {
            rdJson += chunk;
        });

        res.on('end', function () {

            NCC.log("[ncc rd] inspectables received");

            var list = JSON.parse(rdJson);
            for (var i = 0, l = list.length; i < l; i++) {

                if (list[i].title == "ncc" && list[i].webSocketDebuggerUrl) {
                    //setTimeout(NCC,1000,cb)

                    Object.defineProperties(ncc, {
                        _ws: {
                            value: new ws(list[i].webSocketDebuggerUrl)
                        }
                    });

                    ncc._ws.on('open', function () {
                        NCC.log("[ncc ws] remote debugging session established");

                        ncc(function (err, res) {
                            if (err) {
                                NCC.log("[nccanvas] ERROR: " + err.message);
                                if (cb) cb(err);
                                return;
                            }
                            if (cb) cb(null, canvas, ncc);
                        });
                    });

                    ncc._ws.on('close', function () {
                        NCC.log('[ncc ws] remote debugging session ended');
                    });
                } else {

                    NCC.log("[ncc rd] 'ncc' not found in inspectables" + ((NCC.options.retry) ? " - retry " + NCC.options.retry : ""));
                    if (NCC.options.retry--)
                        setTimeout(NCC, NCC.options.retryDelay, cb);
                    else
                        if (cb) cb("[ncc rd] 'ncc' not found in inspectables");
                }
            }
        });
    }).on('error', function (e) {
        if (cb) cb(e.message);
    });

    canvasProps._name.value = 'canvas';
    canvas = canvas || NCC.createCanvas(true);
    return canvas;
}

Object.defineProperties(NCC, {
    log: {
        value: function () {
            if (this.options.verbose) console.log.apply(this, arguments);
        }
    },
    options: {
        value: {
            verbose: false,
            port: 9222,
            spawn: {
                command: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                args: ['--app=' + __dirname + '\\index.html',
                    '--remote-debugging-port={PORT}',
                    '--user-data-dir=' + os.tmpdir() + '\\nccanvas'
                ],
                options: {}
            },
            retry: 3,
            retryDelay: 1000
        },
        enumerable: true
    },
    createCanvas: {
        value: function (name) {
            if (name !== true) {
                name = canvasProps._name.value = name || "canvas_" + Math.random().toString(36).slice(2);
                canvasProps._null = {
                    value: function () {

                        ncc(name + " = null");

                        if (this._ctx) {
                            this._ctx._null();
                            this._ctx = null;
                        }

                        return this;
                    },
                    enumerable: debug
                };

                ncc("var " + name + " = document.createElement('canvas')");
            }

            var canvas = function (cb) {
                ncc(cb ? function (err) {
                    cb(err, err ? null : canvas);
                } : undefined);
                return canvas;
            };

            Object.defineProperties(canvas, canvasProps);
            return canvas;
        }
    },
    createImage: {
        value: function (src, onload, onerror) {
            var name = imgProps._name.value = "img_" + Math.random().toString(36).slice(2);
            ncc("var " + name + " = new Image();");
            var img = function (cb) {
                ncc(cb ? function (err) {
                    cb(err, err ? null : img);
                } : undefined);
            };

            Object.defineProperties(img, imgProps);

            this.onload = onload;
            this.onerror = onerror;
            this.src = src;

            return img;
        }
    }
});

module.exports = NCC;

// magic

function ncc(cmd, cb) {
    if (cb === undefined) { // queue
        if (typeof cmd == 'string' || cmd instanceof String) {
            NCC.log(cmd);
            ncc._ += cmd + ";";
            return ncc;
        }

        if ((cb = cmd) !== null) {
            ncc._queue.push({
                cmd: ncc._,
                cb: cb
            });
            ncc._ = "";
        }

        if (!ncc._queue[0] || ncc._req == ncc._queue[0] || !ncc._ws) return;

        ncc._req = ncc._queue[0];

        ncc(ncc._req.cmd, function (err, res) {
            ncc._req = ncc._queue.shift();
            if (ncc._req.cb) ncc._req.cb(err, res);
            ncc(null);
        });

    } else if (ncc._ws) { // fire eval request

        ncc._ws.send('{"id":0,"method":"Runtime.evaluate","params":{"expression":"' + cmd + '"}}');

        if (cb) ncc._ws.once('message', function (data) {
            data = JSON.parse(data);
            var err = data.error || data.result.wasThrown ? data.result.result : null,
                res = (err) ? null : data.result.result;
            cb(err, res);
        });

    } else {
        ncc._ += cmd + ";";
        ncc._queue.push({
            cmd: ncc._,
            cb: cb
        });
        ncc._ = "";
    }

    return ncc;
}

Object.defineProperties(ncc, {
    _queue: {
        value: [],
        enumerable: debug
    },
    _req: {
        value: undefined,
        writable: true,
        enumerable: debug
    },
    _: {
        value: "",
        writable: true,
        enumerable: debug
    }
});

// helperFn for trivial properties

function defineProp(props, key, type, val) { //TODO: validate setter
    var key_;
    switch (type) {
        case 'string':
        case 'color':
            key_ = '"\'"+' + key + '+"\'"';
            break;
        default:
            key_ = key;

    }
    props['_' + key] = {
        value: val,
        writable: true,
        enumerable: debug
    };
    props[key] = {
        get: new Function('return this._' + key),
        set: new Function(key, 'this._(this._name + ".' + key + '="+' + key_ + ');return this._' + key + '=' + key_ + ';'),
        enumerable: true
    };
}

// helperFn for trivial functions

function defineVoidFn(props, key, parameters) { //TODO: validate parameters
    props[key] = {
        value: new Function('return this._(this._name + ".' + key + '(" + Array.prototype.slice.call(arguments) + ")");'),
        enumerable: true
    };
}

/// HTMLCanvasElement

var canvasProps = {
    _: {
        value: ncc,
        enumerable: debug
    },
    _name: {
        value: "canvas",
        enumerable: debug
    },
    _ctx: {
        value: null,
        writable: true,
        enumerable: debug
    },

    // HTMLCanvasElement complex functions
    getContext: {
        value: function (contextId, cb) {
            if (contextId == "2d") {
                ctxProps._name.value = "ctx_" + this._name;
                ncc("var " + ctxProps._name.value + " = " + this._name + ".getContext('2d')");

                var ctx = function (cb) {
                    ncc(cb ? function (err) {
                        cb(err, err ? null : ctx);
                    } : undefined);
                    return ctx;
                };

                this._ctx = Object.defineProperties(ctx, ctxProps);
                return this._ctx;
            } else {
                // wbgl is not implemented
                throw new Error(contextId + " is not implemented");
            }
        },
        enumerable: true
    },
    toDataURL: {
        value: function (type, args) {
            var ncc = this._(this._name + ".toDataURL(" + (type ? ("'" + type + "'") : "") + ")");
            return function (cb) {
                ncc(function (err, res) {
                    if (err) {
                        cb(err);
                        return;
                    }
                    cb(err, res.value);
                });
            };
        },
        enumerable: true
    }
};

// HTMLCanvasElement trivial properties
defineProp(canvasProps, 'width', 'number', 300);
defineProp(canvasProps, 'height', 'number', 150);

/// CanvasRenderingContext2D

var ctxProps = {
    _: {
        value: ncc,
        enumerable: debug
    },
    _name: {
        value: 'ctx',
        enumerable: debug
    },
    _null: {
        value: function (cb) {
            ncc(this._name + " = null");
            return this;
        },
        enumerable: debug
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
            throw new Error("'currentPath' not implemented yet");
        },
        set: function (currentPath) {
            throw new Error("'currentPath' not implemented yet");
        },
        enumerable: true
    },
    _fillStyle: {
        value: "#000000"
    },
    fillStyle: {

        get: function () {
            return this._fillStyle;
        },

        set: function (fillStyle) {
            this._(this._name + ".fillStyle = " + (fillStyle._name || ("'" + fillStyle + "'")));
            this._fillStyle = fillStyle;
            return this._fillStyle;
        },
        enumerable: true
    },
    _strokeStyle: {
        value: "#000000"
    },
    strokeStyle: {

        get: function () {
            return this._strokeStyle;
        },

        set: function (strokeStyle) {
            this._(this._name + ".strokeStyle = " + (strokeStyle._name || ("'" + strokeStyle + "'")));
            this._strokeStyle = strokeStyle;
            return this._strokeStyle;
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
                });
            };
        },
        enumerable: true
    },
    createLinearGradient: { // nsIDOMCanvasGradient
        value: function (x0, y0, x1, y1) { // "float" x0, "float" y0, "float" x1, "float" y1
            var name = "linearGradient" + Math.random().toString(36).slice(2);
            var ncc = this._("var " + name + " = " + this._name + ".createLinearGradient(" + x0 + "," + y0 + "," + x1 + "," + y1 + ")");

            var lg = function (cb) {
                ncc(cb ? function (err) {
                    cb(err, err ? null : lg);
                } : undefined);
                return lg;
            };

            return Object.defineProperties(lg, {
                _name: {
                    value: name,
                    enumerable: debug
                },
                _null: {
                    value: function (stop, color) {
                        ncc(name + " = null");
                        return lg;
                    },
                    enumerable: debug
                },
                addColorStop: {
                    value: function (stop, color) {
                        ncc(name + ".addColorStop(" + stop + ",'" + color + "')");
                        return ncc;
                    },
                    enumerable: true
                }
            });
        },
        enumerable: true
    },
    createPattern: { // nsIDOMCanvasPattern 
        value: function (image, repetition) { // "nsIDOMHTMLElement image, "DOMString repetition
            var name = "pattern" + Math.random().toString(36).slice(2);
            var ncc = this._("var " + name + "=" + this._name + ".createPattern(" + image._name + ",'" + repetition + "')");

            var p = function (cb) {
                ncc(cb ? function (err) {
                    cb(err, err ? null : p);
                } : undefined);
                return p;
            };

            return Object.defineProperties(p, {
                _name: {
                    value: name,
                    enumerable: debug
                },
                _null: {
                    value: function (stop, color) {
                        ncc(name + " = null");
                        return p;
                    },
                    enumerable: debug
                }
            });
        },
        enumerable: true
    },
    createRadialGradient: { // nsIDOMCanvasGradient
        value: function (x0, y0, r0, x1, y1, r1) { // "float" x0, "float" y0, "float" r0, "float" x1, "float" y1, "float" r1
            var name = "radialGradient" + Math.random().toString(36).slice(2);
            var ncc = this._("var " + name + " = " + this._name + ".createRadialGradient(" + x0 + "," + y0 + "," + r0 + "," + x1 + "," + y1 + "," + r1 + ")");

            var rg = function (cb) {
                ncc(cb ? function (err) {
                    cb(err, err ? null : rg);
                } : undefined);
                return rg;
            };

            return Object.defineProperties(rg, {
                _name: {
                    value: name,
                    enumerable: debug
                },
                _null: {
                    value: function (stop, color) {
                        ncc(name + " = null");
                        return rg;
                    },
                    enumerable: debug
                },
                addColorStop: {
                    value: function (stop, color) {
                        ncc(name + ".addColorStop(" + stop + ",'" + color + "')");
                        return ncc;
                    },
                    enumerable: true
                }
            });
        },
        enumerable: true
    },
    drawImage: { // void
        value: function (image, a1, a2, a3, a4, a5, a6, a7, a8) { // "nsIDOMElement image, "float" a1, "float" a2, "float" a3 Optional, "float" a4 Optional, "float" a5 Optional, "float" a6 Optional, "float" a7 Optional, "float" a8 Optional 
            return this._(this._name + ".drawImage(" + image._name + "," + (Array.prototype.slice.call(arguments, 1).join(',')) + ")");
        },
        enumerable: true
    },
    drawCustomFocusRing: { // boolean
        value: function (element) { // Element element
            throw new Error("'drawCustomFocusRing' not implemented yet");
        },
        enumerable: true
    },
    drawSystemFocusRing: { // void
        value: function (element) { // Element element
            throw new Error("'drawSystemFocusRing' not implemented yet");
        },
        enumerable: true
    },
    fillText: { // void
        value: function (text, x, y, maxWidth) { // "DOMString text, "float" x, "float" y, "float" maxWidth Optional
            var props = (maxWidth === undefined) ? ("'" + text + "'," + x + "," + y) : ("'" + text + "'," + x + "," + y + "," + maxWidth);
            return this._(this._name + ".fillText(" + props + ")");
        },
        enumerable: true
    },
    getImageData: { // ImageData
        value: function (x, y, width, height) { // "float" x, "float" y, "float" width, "float" height
            var ncc = this._("Array.prototype.slice.call(" + this._name + ".getImageData(" + x + "," + y + "," + width + "," + height + ").data).join(',')");
            return function (cb) {
                ncc(function (err, res) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    var imageData = {
                        data: new Uint8ClampedArray(res.value.split(',')),
                        width: width,
                        height: height
                    };

                    cb(err, imageData);
                });
            };
        },
        enumerable: true
    },
    getLineDash: { // sequence <unrestricted double> 
        value: function () { //
            var ncc = this._(this._name + ".getLineDash().join(',')");
            return function (cb) {
                ncc(function (err, res) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    res.value = res.value.split(',');
                    for (var i = 0, l = res.value.length; i < l; i++)
                        res.value[i] = +res.value[i];

                    cb(err, res.value);
                });
            };
        },
        enumerable: true
    },
    isPointInPath: { // boolean
        value: function (x, y) { // "float" x, "float" y
            var ncc = this._(this._name + ".isPointInPath(" + x + "," + y + ")");
            return function (cb) {
                ncc(function (err, res) {
                    cb(err, res.value);
                });
            };
        },
        enumerable: true
    },
    isPointInStroke: { // boolean
        value: function (x, y) { // "float" x, "float" y
            var ncc = this._(this._name + ".isPointInStroke(" + x + "," + y + ")");
            return function (cb) {
                ncc(function (err, res) {
                    cb(err, res.value);
                });
            };
        },
        enumerable: true
    },
    measureText: { // nsIDOMTextMetrics
        value: function (text) { // "DOMString text
            var ncc = this._(this._name + ".measureText('" + text + "').width");
            return function (cb) {
                ncc(function (err, res) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    cb(null, {
                        width: res.value
                    });
                });
            };
        },
        enumerable: true
    },
    putImageData: { // void
        value: function (imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) { // "ImageData imagedata, "float" dx, double dy, "float" dirtyX Optional, "float" dirtyY Optional, "float" dirtyWidth Optional, "float" dirtyHeight Optional
            return this._("var data = [" + Array.prototype.slice.call(imagedata.data).join(',') + "]; var iD = " + this._name + ".createImageData(" + imagedata.width + ", " + imagedata.height + "); for (var i = 0, l = iD.data.length; i < l; i++) iD.data[i] = +data[i]; " + this._name + ".putImageData(iD," + (Array.prototype.slice.call(arguments, 1).join(',')) + ")");
        },
        enumerable: true
    },
    setLineDash: { // void
        value: function (segments) { // "sequence <unrestricted double> segments
            return this._(this._name + ".setLineDash([" + segments.join(',') + "])");
        },
        enumerable: true
    },
    strokeText: { // void
        value: function (text, x, y, maxWidth) { // "DOMString text, "float" x, "float" y, "float" maxWidth Optional

            var props = (maxWidth === undefined) ? ("'" + text + "'," + x + "," + y) : ("'" + text + "'," + x + "," + y + "," + maxWidth);
            return this._(this._name + ".strokeText(" + props + ")");
        },
        enumerable: true
    }
};

// CanvasRenderingContext2D trivial properties

//defineProp(ctxProps, "fillStyle", "color", "#000000"); // complex because of possible gradients
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
//defineProp(ctxProps, "strokeStyle", "color", "#000000"); // complex because of possible gradients
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

/// HTMLImageElement

var mimeMap = {
    png: 'image/png',
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    svg: 'image/svg+xml',
    gif: 'image/gif'
};

var httpRegExp = new RegExp('^(http:\\/\\/.+)', 'i');
var dataRegExp = new RegExp('^(data:image\\/\\w+;base64,.+)');
var typeRegExp = new RegExp('^data:image\/(w+);base64,');

var imgProps = {
    _: {
        value: ncc,
        enumerable: debug
    },
    _name: {
        value: "img",
        enumerable: debug
    },
    _null: {
        value: function () {
            ncc(this._name + " = null");
            return this;
        },
        enumerable: debug
    },
    width: {
        value: undefined,
        writable: true,
        enumerable: true
    },
    height: {
        value: undefined,
        writable: true,
        enumerable: true
    },
    _base64_: {
        value: undefined,
        writable: true,
        enumerable: debug
    },
    _base64: {
        get: function () {
            return this._base64_;
        },
        set: function (base64) {
            var img = this;

            this._(this._name + ".src = " + "'" + base64 + "';" + this._name + ".width+'_'+" + this._name + ".height");
            this._(function (err, val) {

                if (err && img.onerror) {
                    img.onerror(err);
                    return;
                }

                var size = val.value.split('_');
                img.width = +size[0];
                img.height = +size[1];

                if (img.onload) img.onload(img);
            });

            this._base64_ = base64;
            return this._base64_;
        },
        enumerable: debug
    },
    _toFs: {
        value: function (path, cb) {
            var head = typeRegExp.exec(this._base64_),
                type = path.split('.').pop();

            if (!head || !head[1] || head[1] != type)
                if (cb) cb("type missmatch " + type + " <> " + head[1]);

            fs.writeFile(path, new Buffer(this._base64_.replace(/^data:image\/\w+;base64,/, ""), 'base64'), {}, cb);
        },
        enumerable: debug
    },
    _src: {
        value: "",
        writable: true
    },
    src: {
        get: function () {
            return this._src;
        },
        set: function (src) {
            var img = this;
            this._src = src;
            if (!src || src === "") return;

            if (dataRegExp.test(src)) img._base64 = src;
            else if (httpRegExp.test(src)) {
                http.get(src, function (res) {
                    var data = '';
                    res.setEncoding('base64');

                    if (res.statusCode != 200) {
                        if(img.onerror) img.onerror("loading image failed with status " + res.statusCode);
                        return;
                    }
                    res.on('data', function (chunk) {
                        data += chunk;
                    });

                    res.on('end', function () {
                        img._base64 = "data:" + (res.headers["content-type"] || mimeMap[src.split('.').pop()]) + ";base64," + data;
                    });
                }).on('error', this.onerror || function (e) {
                    throw e;
                });
            } else {
                fs.readFile(src, 'base64', function (err, data) {
                    if (err) {
                        if (this.onerror) this.onerror(err);
                        else throw err;
                        return;
                    }
                    img._base64 = "data:" + mimeMap[src.split('.').pop()] + ";base64," + data;
                });
            }

        },
        enumerable: true
    },
    onload: {
        value: null,
        enumerable: true,
        writable: true
    },
    onerror: {
        value: null,
        enumerable: true,
        writable: true
    }
};
