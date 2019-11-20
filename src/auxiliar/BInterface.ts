function getTextTile(text:string, font:string, height:number, color:string) : HTMLImageElement
{
    var tmpCanvas:HTMLCanvasElement = <HTMLCanvasElement>document.createElement("canvas");
    var tmpCtx:CanvasRenderingContext2D = tmpCanvas.getContext("2d");
    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.font = font;
    tmpCanvas.width = tmpCtx.measureText(text).width;
    tmpCanvas.height = height;

    tmpCtx.font = font;    // not sure why, but after changing the size, I need to set the font again
    tmpCtx.textBaseline = "middle"; 
    tmpCtx.textAlign = "left";
    tmpCtx.fillStyle = color;
    tmpCtx.fillText(text, 0, height/2);

    var img:HTMLImageElement = document.createElement("img");
    img.src = tmpCanvas.toDataURL();

    return img;
}


function getTextTileWithOutline(text:string, font:string, height:number, color:string, outlineColor:string) : HTMLImageElement
{
    // Generate the text tile:
    var tmpCanvas:HTMLCanvasElement = <HTMLCanvasElement>document.createElement("canvas");
    var tmpCtx:CanvasRenderingContext2D = tmpCanvas.getContext("2d");
    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.font = font;
    tmpCanvas.width = tmpCtx.measureText(text).width+2;
    tmpCanvas.height = height+2;

    tmpCtx.font = font;    // not sure why, but after changing the size, I need to set the font again
    tmpCtx.textBaseline = "top"; 
    tmpCtx.textAlign = "left";
    tmpCtx.fillStyle = color;
    tmpCtx.fillText(text, 1, 1);

    // Draw an outline:
    var imageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
    var data = imageData.data;
    tmpCtx.fillStyle = outlineColor;
    
    for(let y:number = 1; y<tmpCanvas.height-1; y++) {
        for(let x:number = 1; x<tmpCanvas.width-1; x++) {
            var alpha = data[(x+y*tmpCanvas.width)*4 + 3];
            if (alpha > 200) {
                if (data[((x-1)+(y-1)*tmpCanvas.width)*4 + 3] < 200) tmpCtx.fillRect( x-1, y-1, 1, 1);
                if (data[( x   +(y-1)*tmpCanvas.width)*4 + 3] < 200) tmpCtx.fillRect( x,   y-1, 1, 1);
                if (data[((x+1)+(y-1)*tmpCanvas.width)*4 + 3] < 200) tmpCtx.fillRect( x+1, y-1, 1, 1);
                if (data[((x-1)+y*tmpCanvas.width)*4 + 3] < 200) tmpCtx.fillRect( x-1, y, 1, 1);
                if (data[((x+1)+y*tmpCanvas.width)*4 + 3] < 200) tmpCtx.fillRect( x+1, y, 1, 1);
                if (data[((x-1)+(y+1)*tmpCanvas.width)*4 + 3] < 200) tmpCtx.fillRect( x-1, y+1, 1, 1);
                if (data[( x   +(y+1)*tmpCanvas.width)*4 + 3] < 200) tmpCtx.fillRect( x,   y+1, 1, 1);
                if (data[((x+1)+(y+1)*tmpCanvas.width)*4 + 3] < 200) tmpCtx.fillRect( x+1, y+1, 1, 1);
            }                     
        }
    }

    var img:HTMLImageElement = document.createElement("img");
    img.src = tmpCanvas.toDataURL();

    return img;
}


class BInterface {

    static push() 
    {
//        console.log("BInterface.push");
//        console.log(new Error().stack);
        var enabled_since_last_push:boolean[] = [];
        for(let e of this.added_since_last_push) {
            enabled_since_last_push.push(e.getEnabled());
        }
        this.stack.push(this.added_since_last_push);
        this.enabledStack.push(enabled_since_last_push);

        this.added_since_last_push = [];
        for(let e of this.elements) e.enabled = false;

        BInterface.highlightedByKeyboard = -1;
    }


    static pop()
    {
//        console.log("BInterface.pop");
//        console.log(new Error().stack);
        if (this.stack.length == 0) return;
        this.elements.splice(this.elements.length - this.added_since_last_push.length, this.added_since_last_push.length);
        this.added_since_last_push = this.stack.pop();
        var enabled_since_last_push:boolean[] = this.enabledStack.pop();
        for(let i:number = 0; i<this.added_since_last_push.length; i++) {
            this.added_since_last_push[i].setEnabled(enabled_since_last_push[i]);
        }

        BInterface.highlightedByKeyboard = -1;
    }


    static addElement(b:BInterfaceElement)
    {
        this.elements.push(b);
        this.added_since_last_push.push(b);

        BInterface.highlightedByKeyboard = -1;
    }


    static getElementByID(ID:number) : BInterfaceElement
    {
        for(let e of this.elements) {
            if (e.ID == ID) return e;
        }
        return null;
    }


    static reset()
    {
        this.elements = [];
        this.added_since_last_push = [];
        this.stack = [];
        this.enabledStack = [];

        BInterface.highlightedByKeyboard = -1;
    }


    static mouseOverElement(mouse_x:number, mouse_y:number):boolean
    {
        for(let e of this.elements) {
            if (e.getEnabled() && e.mouseOver(mouse_x, mouse_y)) return true;
        }
    }


    static update(mouse_x:number, mouse_y:number, k:KeyboardState, arg:any)
    {
        var modal:BInterfaceElement = null;
        var to_delete:BInterfaceElement[] = [];
        

        if (BInterface.elements.length > 0) {
            if (k.key_press(KEY_CODE_DOWN)) {
                let maxCycles:number = BInterface.elements.length;
                do{
                    BInterface.highlightedByKeyboard++;
                    if (BInterface.highlightedByKeyboard >= BInterface.elements.length) BInterface.highlightedByKeyboard = 0;
                    if (BInterface.elements[BInterface.highlightedByKeyboard].enabled &&
                        BInterface.elements[BInterface.highlightedByKeyboard].active &&
                        BInterface.elements[BInterface.highlightedByKeyboard] instanceof BButton) break;
                    maxCycles--;
                } while(maxCycles > 0)
            }
            if (k.key_press(KEY_CODE_UP)) {
                let maxCycles:number = BInterface.elements.length;
                do{
                    BInterface.highlightedByKeyboard--;
                    if (BInterface.highlightedByKeyboard < 0) BInterface.highlightedByKeyboard = BInterface.elements.length-1;
                    if (BInterface.elements[BInterface.highlightedByKeyboard].enabled &&
                        BInterface.elements[BInterface.highlightedByKeyboard].active &&
                        BInterface.elements[BInterface.highlightedByKeyboard] instanceof BButton) break;
                    maxCycles--;
                } while(maxCycles > 0)
            }
        } else {
            BInterface.highlightedByKeyboard = -1;
        }


        for(let e of this.elements) {
            if (e.modal && e.active && e.enabled) {
                modal = e;
                break;
            }
        }
        
        if (modal!=null) {
            modal.update(mouse_x, mouse_y, k, arg);
            if (modal.to_be_deleted) to_delete.push(modal);
        } else {
            for(let e of this.elements) {
                e.update(mouse_x, mouse_y, k, arg);
                if (e.to_be_deleted) to_delete.push(e);
            }
        } // if
        
        for(let e of to_delete) {
            var idx:number = this.elements.indexOf(e);
            this.elements.splice(idx,1);
        } // while
    }
        

    static mouseClick(mouse_x: number, mouse_y: number, button: number, arg:any)
    {
        // we need this intermediate list, just in case mouseclick calls cause the creation of more elements
        var l:BInterfaceElement[] = [];
        for(let e of this.elements) {
            if (e.getEnabled() && e.mouseOver(mouse_x, mouse_y)) l.push(e);
        }
        for(let e of l) e.mouseClick(mouse_x, mouse_y, button, arg);
    }


    static mouseMove(mouse_x: number, mouse_y: number)
    {
        BInterface.highlightedByKeyboard = -1;
    }


    static draw()
    {
        BInterface.drawAlpha(1.0);
    }


    static drawAlpha(alpha:number)
    {
        for(let e of this.elements) {
            e.drawAlpha(alpha);
        }
    }


    static createMenu(lines:string[], callbacks:((any, number) => void)[], 
                      font:string, font_heigth:number, x:number, y:number, width:number, height:number, interline_space:number, starting_ID:number)
    {
        BInterface.addElement(new BFrame(x,y,width,height));
        var by:number = y + 10;
        for(let i = 0;i<lines.length;i++) {
            BInterface.addElement(new BButtonTransparent(lines[i], font, x, by, width, font_heigth, starting_ID, "white", callbacks[i]));
            starting_ID++;
            by += font_heigth + interline_space;
        }
    }


    static disable(ID:number) {
        for(let e of BInterface.elements) {
            if (e.getID() == ID) e.setEnabled(false);
        }
    }


    static elements:BInterfaceElement[] = [];
    static added_since_last_push:BInterfaceElement[] = [];
    static stack:BInterfaceElement[][] = [];
    static enabledStack:boolean[][] = [];

    static highlightedByKeyboard:number = -1;
}

