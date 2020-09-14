class BFrame extends BInterfaceElement {
    constructor(x:number, y:number, width:number, height:number)
    {
        super(x, y, width, height);
    }


    drawAlpha(alpha:number)
    {
        ctx.save();
        // background:
        let color:string = generateRGBColor(40, 40, 40);
        ctx.globalAlpha = 0.8*alpha;
        ctx.fillStyle = color;
        ctx.fillRect(this.x+2, this.y, this.width-4, this.height);

        // top bar:
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "white";
        ctx.fillRect(this.x, this.y, this.width, 6);

        // bottom bar:
        ctx.fillRect(this.x, this.y + this.height-6, this.width, 6);
        ctx.restore();
    }
}


class BTextFrame extends BFrame {
    constructor(initial_text:string[], centered:boolean, font:string, fontHeight:number, x:number, y:number, width:number, height:number)
    {
        super(x, y, width, height);

        this.centered = centered;
        this.font = font;
        this.fontHeight = fontHeight;
        this.text = initial_text;
    }


    drawAlpha(alpha:number)
    {
        super.drawAlpha(alpha);

        let x:number = this.x + 10;
        let y:number = this.y + 10 + this.fontHeight;
        if (this.centered) {
            x = this.x + this.width/2;
            ctx.textAlign = "center";
        } else {            
            ctx.textAlign = "left";
        }
        ctx.fillStyle = "white";
        ctx.font = this.font;
        ctx.textBaseline = "bottom"; 
        for(let line of this.text) { 
            ctx.fillText(line, x, y);
            y += this.fontHeight + 4;
        }        
    }


    centered:boolean = false;
    font:string = null;
    fontHeight:number = 8;
    text:string[] = null;
}
