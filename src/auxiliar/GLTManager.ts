class GLTManager {
    constructor()
    {
        console.log("GLTManager created.");
    }
    

    clear()
    {
        this.hash = {};
        this.image_hash = {};
    }


    // note: these functions are not supposed to be fast, so minimizing the number of times
    //          they are called is recommended.
    get(name:string):GLTile
    {
        var tile:GLTile = this.hash[name];
        if (tile!=null) return tile;

        var img:HTMLImageElement = this.getImage(name);

        if (img.width!=0) {
            tile = new GLTile(img, 0, 0, img.width, img.height);
            this.hash[name] = tile;
            return tile;
        }
        return null;
    }


    getPiece(name:string, x:number, y:number, width:number, height:number):GLTile
    {
        var tile:GLTile = this.hash[name+"-"+x+"-"+y+"-"+width+"-"+height];
        if (tile!=null) return tile;

        var img:HTMLImageElement = this.getImage(name);

        if (img.width!=0) {
            tile = new GLTile(img, x, y, width, height);
            this.hash[name] = tile;
            return tile;
        }
        return null;
    }


    getPieceDark(name:string, x:number, y:number, width:number, height:number):GLTile
    {
        var tile:GLTile = this.hash[name+"-"+x+"-"+y+"-"+width+"-"+height];
        if (tile!=null) return tile;

        var img:HTMLImageElement = this.getImageDark(name);

        if (img.width!=0) {
            tile = new GLTile(img, x, y, width, height);
            this.hash[name] = tile;
            return tile;
        }
        return null;
    }


    //GLTile *get(Symbol *name, int x, int y, int dx, int dy);

    getImage(name:string):HTMLImageElement
    {
        var img:HTMLImageElement = this.image_hash[name];
        if (img == null) {
            var img:HTMLImageElement = document.createElement("img");
            img.src = name;
            this.image_hash[name] = img;
            console.log("Loading image " + name + "...");
        }
        return img;
    }


    getImageDark(name:string):HTMLImageElement
    {
        var img:HTMLImageElement = this.darkimage_hash[name];
        if (img == null) {
            var img:HTMLImageElement = document.createElement("img");
            var imgOriginal:HTMLImageElement = this.getImage(name);

            // make it dark:
            var canvas2:HTMLCanvasElement = document.createElement('canvas');
            canvas2.width = imgOriginal.width;
            canvas2.height = imgOriginal.height;
            var context2 = canvas2.getContext("2d");
            context2.drawImage(imgOriginal, 0, 0);
            var imageData = context2.getImageData(0, 0, imgOriginal.width, imgOriginal.height);
            var data = imageData.data;
            for(let i:number = 0;i<imgOriginal.width*imgOriginal.height*4;i+=4) {
                var red = data[i];
                var green = data[i + 1];
                var blue = data[i + 2];
                var alpha = data[i + 3];
                if (alpha>128) {
                    if (red == 0 && green == 0 && blue == 0) {
                        context2.fillStyle = "#4f56f6";
                        context2.fillRect( (i/4)%imgOriginal.width, Math.floor((i/4)/imgOriginal.width), 1, 1 );                    
                        //data[i] = 79;
                        //data[i + 1] = 86;
                        //data[i + 2] = 246;
                    } else {
                        context2.fillStyle = "#000000";
                        context2.fillRect( (i/4)%imgOriginal.width, Math.floor((i/4)/imgOriginal.width), 1, 1 );                    
                        //data[i] = 0;
                        //data[i + 1] = 0;
                        //data[i + 2] = 0;
                    }
                }
            }
            //context2.putImageData(imageData, 0, 0, imgOriginal.width, imgOriginal.height);
            img.src = canvas2.toDataURL("image/png");
            this.darkimage_hash[name] = img;
            console.log("Loading dark image " + name + "...");
        }
        return img;
    }

//    char *get_name(GLTile *tile);


    hash: { [id: string] : GLTile; } = {};
    image_hash: { [id: string] : HTMLImageElement; } = {};
    darkimage_hash: { [id: string] : HTMLImageElement; } = {};
}
