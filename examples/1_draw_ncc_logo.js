// NCC Example 1 - draw ncc logo

var ncc = require('ncc');

console.time("ncc startup time");

// --- INFO ---
// ncc uses error-first callbacks

ncc(function (err, canvas) {

    // --- INFO ---
    // if you see errors you probably have to call 'ncc' with options
    //
    //    'ncc(<options>,<callback>)'

    if (err) {
        console.error("ncc startup Error:", err);
        return;
    }

    console.timeEnd("ncc startup time");
    console.time("ncc draw time");

    // --- INFO ---
    // all attributes are getters/setters and default to the initial values implemented in chrome

    canvas.width = 256;
    canvas.height = 256;

    var ctx = canvas.getContext("2d");

    ctx.fillStyle = "#a3195b";
    ctx.strokeStyle = "transparent";
    ctx.beginPath();
    ctx.moveTo(253, 186);
    ctx.lineTo(244.1, 186);
    ctx.bezierCurveTo(212.1, 186, 186.1, 160, 186.1, 128);
    ctx.bezierCurveTo(186.1, 96, 212.1, 70, 244.1, 70);
    ctx.lineTo(253, 70);
    ctx.lineTo(253, 105.7);
    ctx.lineTo(244.1, 105.7);
    ctx.bezierCurveTo(231.79999999999998, 105.7, 221.79999999999998, 115.7, 221.79999999999998, 128);
    ctx.bezierCurveTo(221.79999999999998, 140.3, 231.79999999999998, 150.3, 244.1, 150.3);
    ctx.lineTo(253, 150.3);
    ctx.lineTo(253, 186);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#4a4a49";
    ctx.beginPath();
    ctx.moveTo(244.1, 38.7);
    ctx.lineTo(253, 38.7);
    ctx.lineTo(253, 3);
    ctx.lineTo(244.1, 3);
    ctx.bezierCurveTo(202.6, 3, 165.8, 23.3, 143, 54.5);
    ctx.bezierCurveTo(134.4, 24.8, 106.9, 3, 74.4, 3);
    ctx.bezierCurveTo(61.400000000000006, 3, 49.2, 6.5, 38.7, 12.6);
    ctx.lineTo(38.7, 3);
    ctx.lineTo(3, 3);
    ctx.lineTo(3, 235.1);
    ctx.lineTo(38.7, 235.1);
    ctx.lineTo(38.7, 74.4);
    ctx.bezierCurveTo(38.7, 54.7, 54.7, 38.7, 74.4, 38.7);
    ctx.bezierCurveTo(94.10000000000001, 38.7, 110.10000000000001, 54.7, 110.10000000000001, 74.4);
    ctx.lineTo(110.10000000000001, 253);
    ctx.lineTo(145.8, 253);
    ctx.lineTo(145.8, 205.2);
    ctx.bezierCurveTo(168.70000000000002, 234.29999999999998, 204.20000000000002, 253, 244, 253);
    ctx.lineTo(252.9, 253);
    ctx.lineTo(252.9, 217.3);
    ctx.lineTo(244, 217.3);
    ctx.bezierCurveTo(194.8, 217.3, 154.7, 177.20000000000002, 154.7, 128);
    ctx.bezierCurveTo(154.8, 78.8, 194.8, 38.7, 244.1, 38.7);
    ctx.closePath();
    ctx.fill();

    // --- INFO ---
    // nothing of the above actually happend. You used a ncc-proxy-object
    // every property assignment and function call was serialized into a remote-debugging command
    // to actually trigger the action and see a result you have to call a function: 

    ctx(function (err, ctx) {
        if (err)
            console.error("ncc draw Error:", err);
        console.timeEnd("ncc draw time");
        console.log("\n\033[46m\t" + "Tataa!" + "\033[49m\n");
    })

    //  --- ALTERNATIVES ---
    //  this trigger-function is almost everywhere in ncc!
    //  you can call it directly on the last ctx method, somewhere in between,
    //  or on any other ncc-proy-object (e.g 'canvas') with an optinal callback:
    //
    //    "ctx.fill()(<callback>)"
    //    "canvas(<callback>)"
})
