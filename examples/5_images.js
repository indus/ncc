// NCC Example 5 - images

var ncc = require('ncc');

var canvas = ncc(function (err, canvas) {
    if (err) {
        console.error("ncc startup Error:", err);
        return;
    }

    var img = ncc.createImage();

    img.onerror = function (err) {
        console.error("img Error:", err);
    }

    img.onload = function (img) {

        // --- INFO ---
        //  after loaded the img has 'width' and 'height' attributes

        canvas.width = img.width+20;
        canvas.height = img.height+20;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 10, 10)(function (err,res) {
            if (err) {
                console.error("drawImage Error:", err);
                return;
            }

            console.log("\n\033[46m\t" + "Hi! My name is Stefan, but you can call me 'indus'!" + "\033[49m\n");
        });
    }

    // --- INFO ---
    //  setting 'src' triggers image loading:
    //
    //    from the filesystem:  'img.src = "path/to/image.png"'
    //    from a url:           'img.src = "http://www.yourSite.com/image.png"' ('https://...' and 'ftp://..' is not supported)
    //    from a dataURL:       'img.src = "data:image/png;base64, ..."'

    img.src = __dirname + "/dummy.jpg"


    //  --- ALTERNATIVES ---
    //  'createImage' allows to pass all necessary arguments directly:
    //
    //    'ncc.createImage(<srcString>,<onloadFn>,<onerrorFn>)'


    // --- INFO ---
    //  an image-proxy-object has a hidden property to access its data as 'base64' encoded dataURL
    //
    //    'var dataURL = img._base64'
    //
    //  and also it has a hidden function to write it to the filesystem
    //
    //    'img._toFile('path/to/newImg.png',<callback>)'

})
