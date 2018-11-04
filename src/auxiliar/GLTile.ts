class GLTile {
    constructor(src:HTMLImageElement, x1:number, y1:number, width:number, height:number)
    {
        this.src = src;
        this.x1 = x1;
        this.y1 = y1;
        this.width = width;
        this.height = height;
    }

    draw(x:number, y:number)
    {
        ctx.drawImage(this.src, this.x1, this.y1, this.width, this.height,
                                x, y, this.width, this.height);
    }


    drawWithZoom(x:number, y:number, zoom:number)
    {
        ctx.drawImage(this.src, this.x1, this.y1, this.width, this.height,
                                x, y, this.width*zoom, this.height*zoom);
    }


    drawWithAlpha(x:number, y:number, alpha:number)
    {
        var tmp:number = ctx.globalAlpha;
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.src, this.x1, this.y1, this.width, this.height,
                                x, y, this.width, this.height);
        ctx.globalAlpha = tmp;
    }


    drawCentered(x:number, y:number)
    {
        ctx.drawImage(this.src, this.x1, this.y1, this.width, this.height,
                                x-this.width/2, y-this.height/2, this.width, this.height);
    }


    src:HTMLImageElement;
    x1:number;
    y1:number;
    width:number;
    height:number;
}
