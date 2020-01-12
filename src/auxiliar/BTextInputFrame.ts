
class BTextInputFrame extends BFrame {
    constructor(question:string, initial_text:string, max_characters:number, font:string, fontWidth:number, fontHeight:number, x:number, y:number, dx:number, dy:number, ID:number, callback:((any, number) => void))
    {
        super(x, y, dx, dy);

        this.question = question;
        if (initial_text!=null) this.editing += initial_text;
        this.editing_position = this.editing.length;
        this.font = font;
        this.max_characters = max_characters;
        this.ID=ID;
        this.callback = callback;

        this.active=true;
        
        this.cursor_dx = 4;
        this.cursor_dy = fontHeight;
        this.fontWidth = fontWidth;
        this.fontHeight = fontHeight;
    }


    update(mouse_x:number, mouse_y:number, k:KeyboardState, arg:any) : boolean
    {
        this.cycle++;

        this.change_in_last_cycle=false;

        if (this.enabled) {
            if (this.focus) {
                let pep:number = this.editing_position;
                let el:number = this.editing.length;

                this.string_editor_cycle(k, arg);

                if (this.editing_position!=pep || this.editing.length!=el) {
                    this.change_in_last_cycle=true;
                }

                if (k.key_press(KEY_CODE_RETURN)) {
                    return true;
                }
            } // if 
        } // if

        return false;        
    }


    mouseClick(mousex: number, mousey: number, button: number, arg:any)
    {
        if (mousex>=this.x && mousex<this.x+this.width &&
            mousey>=this.y && mousey<this.y+this.height) this.focus=true;
                                                    else this.focus=false;        
    }


    drawAlpha(alpha:number)
    {
        // draw frame:
        super.drawAlpha(alpha);

        // draw question:
        let x:number = this.x + this.width/2;
        let y:number = this.y + 10 + this.fontHeight;
        ctx.fillStyle = "white";
        ctx.font = this.font;
        ctx.textBaseline = "bottom"; 
        if (this.question!=null) {
            ctx.textAlign = "center";
            ctx.fillText(this.question, x, y);
            y += this.fontHeight + 4;
        }

        // draw editing text:
        x = this.x + 8;
        ctx.textAlign = "left";
        ctx.fillText(this.editing, x, y);

        // draw cursor:
        let tdx:number = this.fontWidth*this.editing_position;
        let cursor_x:number = this.x+8+tdx;
        let cursor_y:number = y - this.fontHeight;

        ctx.fillStyle = generateRGBColor(Math.floor(140+80*Math.sin(this.cycle*0.3)), 0, 0);
        ctx.fillRect(cursor_x, cursor_y, this.cursor_dx, this.cursor_dy);
    }


    string_editor_cycle(k:KeyboardState, arg:any)
    {
        for(let ke of k.keyevents) {
            if (ke.keyCode==KEY_CODE_BACKSPACE) {
                if (this.editing_position>0) {
                    this.editing = this.editing.substring(0,this.editing_position-1) + 
                                   this.editing.substring(this.editing_position);
                    this.editing_position--;
                } // if
            } // if
            
            if (ke.keyCode==KEY_CODE_DELETE) {
                if (this.editing_position < this.editing.length) {
                    this.editing = this.editing.substring(0,this.editing_position) + 
                                   this.editing.substring(this.editing_position+1);
                } // if
            } // if

            if (ke.keyCode==KEY_CODE_LEFT) {
                if (this.editing_position>0) {
                    this.editing_position--;
                } // if
            } // if

            if (ke.keyCode==KEY_CODE_RIGHT) {
                if (this.editing_position<this.editing.length) {
                    this.editing_position++;
                } // if
            } // if

            if (ke.keyCode==KEY_CODE_HOME) this.editing_position = 0;
            if (ke.keyCode==KEY_CODE_END) this.editing_position = this.editing.length;

            if ((ke.keyCode >= KEY_CODE_0 && 
                 ke.keyCode <= KEY_CODE_9) ||
                (ke.keyCode >= KEY_CODE_A && 
                 ke.keyCode <= KEY_CODE_Z)) {
                if (this.editing.length < this.max_characters) {
                    if (this.editing_position < this.editing.length) {
                        this.editing = this.editing.substring(0,this.editing_position) + 
                                       KEYCODE_NAMES[ke.keyCode] + 
                                       this.editing.substring(this.editing_position);
                        this.editing_position++;
                    } else {
                        this.editing = this.editing + KEYCODE_NAMES[ke.keyCode];
                        this.editing_position++;
                    }
                }
            }

            if (ke.keyCode==KEY_CODE_RETURN) {
                // callback!
                this.callback(arg, this.ID);
            }
        } // while
        k.keyevents = [];        
    }


    font:string;
    question:string;
    editing:string = "";
    max_characters:number;
    editing_position:number;
    focus:boolean = false;
    cycle:number = 0;
    change_in_last_cycle:boolean = false;
    cursor_dx:number;
    cursor_dy:number;
    fontWidth:number;
    fontHeight:number = 8;
    callback:((any, number) => void);
}
