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
// This assumes 
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

