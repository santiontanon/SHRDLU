class BInterfaceElement {
    constructor(x:number, y:number, width:number, height:number) 
    {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }


    mouseOver(mousex:number, mousey:number) : boolean
    {   
        return mousex >= this.x && mousex < this.x+this.width &&
               mousey >= this.y && mousey < this.y+this.height;
    }


    highlighted(mousex:number, mousey:number) : boolean
    {   
        if (BInterface.highlightedByKeyboard == -1) {
            return this.mouseOver(mousex, mousey);
        } else {
            return BInterface.elements[BInterface.highlightedByKeyboard] == this;
        }
    }


    update(mouse_x:number, mouse_y:number, k:KeyboardState, arg:any) : boolean
    {
        return false;
    }


    mouseClick(mouse_x: number, mouse_y: number, button: number, arg:any)
    {
    }


    draw()
    {
        this.drawAlpha(1.0);
    }


    drawAlpha(alpha:number)
    {
    }


    getChildren() : BInterfaceElement[]
    {
        return this.children;
    }


    getEnabled() : boolean
    {
        return this.enabled;
    }


    setEnabled(enabled:boolean) {
        this.enabled = enabled;
    }


    getID() : number
    {
        return this.ID;
    }

    
    ID:number;
    modal:boolean = false;    // If any element is modal, only him has the control until it is destroyed (the rest of the interface is faded) 
    enabled:boolean = true;   // whether the element can b interacted with or not 
    active:boolean = true;    // This indicates whether the component is active or passive (passive elements are only decorative) 
                              // e.g.: BText and BFrame are passive                    
    to_be_deleted:boolean = false;

    x:number;
    y:number;
    width:number;
    height:number;
    children:BInterfaceElement[] = [];
}



class BText extends BInterfaceElement {
    constructor(text:string, font:string, textHeight:number, x:number, y:number, centered:boolean, ID:number)
    {
        super(x, y, 0, 0);
        ctx.font = font;
        this.width = ctx.measureText(text).width;
        this.height = textHeight;
        this.centered = centered;
        this.text = text;
        this.font = font;
        this.enabled = true;
        this.active = false;
    }


    drawAlpha(alpha:number)
    {
        let color:string = "white";
        if (!this.enabled) {
            color = generateRGBColor(80,80,80);
        }
        if (this.centered) {
            fillTextTopCenter(this.text, this.x, this.y, this.font, color);
        } else {
            fillTextTopLeft(this.text, this.x, this.y, this.font, color);
        }
    }

    centered:boolean;
    text:string;
    font:string;
}


class BQuad extends BInterfaceElement {
    constructor(x:number, y:number, dx:number, dy:number, color:string)
    {
        super(x, y, dx, dy);
        this.color = color;
        this.enabled = true;
        this.active = false;
    }
    
    drawAlpha(alpha:number)
    {
        if (this.enabled) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else {
            ctx.save();
            ctx.globalAlpha *= 0.5;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }
    
    color:string
}


/*
class BInterfaceAnimation extends BInterfaceElement {
    constructor(a:Animation, x:number, y:number)
    {
        super(x, y, a.getPixelWidth(), a.getPixelHeight());
        this.animation = a;
    }
    
    drawAlpha(alpha:number)
    {
        if (this.enabled) {
            this.animation.drawWithAlpha(this.x,this.y, alpha);
        } else {
            this.animation.drawWithAlpha(this.x,this.y, alpha*0.5);
        }
    }
    
    animation:Animation
}
*/