var BBUTTON_STATE_NORMAL:number = 0;
var BBUTTON_STATE_MOUSEOVER:number = 1;
var BBUTTON_STATE_PRESSED:number = 2;


class BButton extends BInterfaceElement {
    constructor(text:string, font:string, x:number, y:number, width:number, height:number, ID:number, callback:((any, number) => void))
    {
        super(x, y, width, height);
        this.text = text;
        this.font = font;
        this.ID = ID;
        this.callback = callback;

        this.active=true;
    }

    setText(text:string)
    {
        this.text = text;
    }


    update(mouse_x:number, mouse_y:number, k:KeyboardState, arg:any) : boolean
    {
        this.cycle++;
        this.status = BBUTTON_STATE_NORMAL;
        if (!this.enabled) return;
        if (this.highlighted(mouse_x, mouse_y)) {
            this.status = BBUTTON_STATE_MOUSEOVER;
            if (k.key_press(KEY_CODE_RETURN) || 
                k.key_press(KEY_CODE_SPACE)) {
                if (this.callback != null) this.callback(arg, this.ID);
            }
        }
        return false;
    }


    mouseClick(mouse_x: number, mouse_y: number, button: number, arg:any)
    {
        if (this.callback != null) this.callback(arg, this.ID);
    }


    drawAlpha(alpha:number)
    {
        ctx.save();
        if (!this.enabled) alpha /= 3;
        ctx.globalAlpha = alpha;
        switch(this.status) {
        case BBUTTON_STATE_MOUSEOVER: 
                ctx.fillStyle = generateRGBColor(80, 80, 160);
                break;                
        case BBUTTON_STATE_PRESSED: 
                ctx.fillStyle = generateRGBColor(160, 160, 224);
                break;
        default:
                ctx.fillStyle = generateRGBColor(40, 40, 80);
        } 
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = "white";
        ctx.font = this.font;
        ctx.textBaseline = "middle"; 
        ctx.textAlign = "center";
        ctx.fillText(this.text, this.x+this.width/2, this.y+this.height/2);
        ctx.restore();
    }


    text:string = null;
    font:string = null;
    status:number = BBUTTON_STATE_NORMAL;
    cycle:number = 0;
    callback:((any, number) => void);
 
}

class BButtonTransparent extends BButton {
    constructor(text:string, font:string, x:number, y:number, width:number, height:number, ID:number, color:string, callback:((any, number) => void))
    {
        super(text, font, x, y, width, height, ID, callback);
        this.color = color;
    }

    drawAlpha(alpha:number)
    {
        ctx.save();
        if (!this.enabled) alpha /= 3;
        var f:number = (0.5+0.3*Math.sin((this.cycle)*0.3));
        ctx.fillStyle = generateRGBColor(192, 192, 192);
        ctx.globalAlpha = alpha;
        switch(this.status) {
        case BBUTTON_STATE_MOUSEOVER: 
                ctx.fillStyle = generateRGBColor(f, f, f);
                ctx.globalAlpha = alpha*f;
                break;                
        case BBUTTON_STATE_PRESSED: 
                ctx.fillStyle = this.color;
                break;
        default:
        } 

        ctx.font = this.font;
        ctx.textBaseline = "middle"; 
        ctx.textAlign = "center";
        ctx.fillText(this.text, this.x+this.width/2, this.y+this.height/2);
        ctx.restore();
    }

    color:string;
}

