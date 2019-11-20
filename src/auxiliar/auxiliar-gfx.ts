function generateRGBColor(r:number, g:number, b:number)
{
    return "rgb(" + r + "," + g + "," + b + ")"
}


function fillTextTopLeft(text:string, x:number, y:number, font:string, color:string)
{
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textBaseline = "top"; 
    ctx.textAlign = "left";
    ctx.fillText(text, x, y);
}


function fillTextTopCenter(text:string, x:number, y:number, font:string, color:string)
{
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textBaseline = "top"; 
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
}


function fillTextTopRight(text:string, x:number, y:number, font:string, color:string)
{
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textBaseline = "top"; 
    ctx.textAlign = "right";
    ctx.fillText(text, x, y);
}



// Code adapted from here: http://fabiensanglard.net/fizzlefade/index.php
class FizzleFade {

    constructor(w:number, h:number)
    {
        this.width = w;
        this.height = h;
    }


    done() : boolean
    {
        return this.rndval == 1;
    }


    nextPixelToFizzle() : [number,number]
    {
        do {
            var y:number = this.rndval & 0x000FF;
            var x:number = (this.rndval & 0x1FF00) >> 8;
            var lsb:number = this.rndval & 1;
            this.rndval >>= 1;
            if (lsb != 0) {
                this.rndval ^= 0x00012000;
            }
            if (x < this.width && y<= this.height) return [x,y];
        } while(!this.done());
        return null;
    }


    rndval:number = 1;    
    width:number = 256;
    height:number = 192;
}


// Cache to prevent generating them again and again!
// note: we do not store colors not font, since for this particular game, they are always the same
var textTilesWithOutline: { [text: string] : HTMLImageElement; } = {};

function fillTextTopLeftWithOutline(text:string, x:number, y:number, font:string, color:string, outlineColor:string)
{   
    var img:HTMLImageElement;

    if (textTilesWithOutline[text] != null) {
        img = textTilesWithOutline[text];
    } else {
        img = getTextTileWithOutline(text, font, 8, color, outlineColor);
        textTilesWithOutline[text] = img;
    }
    // draw it:
    ctx.drawImage(img, 0, 0, img.width, img.height, 
                       x, y, img.width, img.height);
}
