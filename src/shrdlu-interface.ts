var SHRDLU_FADEIN_TIME:number = 30;


class BShrdluFrame extends BInterfaceElement {
    constructor(x:number, y:number, width:number, height:number, GLTM:GLTManager)
    {
        super(x, y, width, height);
        this.x = Math.floor(x - (x%(PIXEL_SIZE*8)));
        this.y = Math.floor(y - (y%(PIXEL_SIZE*8)));
        this.width = Math.floor(width - (width%(PIXEL_SIZE*8)));
        this.height = Math.floor(height - (height%(PIXEL_SIZE*8)));
        this.GLTM = GLTM;
    }

    drawAlpha(alpha:number)
    {
        // background:
        let color:string = generateRGBColor(40, 40, 40);
        ctx.fillStyle = color;
        ctx.fillRect(this.x+PIXEL_SIZE*4, this.y+PIXEL_SIZE*4, 
                     this.width-PIXEL_SIZE*8, this.height-PIXEL_SIZE*8);

        if (this.tile_tl == null) {
            this.tile_tl = this.GLTM.getPiece("data/GUI.png",32,0,8,8);
            this.tile_tr = this.GLTM.getPiece("data/GUI.png",40,0,8,8);
            this.tile_bl = this.GLTM.getPiece("data/GUI.png",32,8,8,8);
            this.tile_br = this.GLTM.getPiece("data/GUI.png",40,8,8,8);
            this.tile_h = this.GLTM.getPiece("data/GUI.png",0,0,8,8);
            this.tile_v = this.GLTM.getPiece("data/GUI.png",0,8,8,8);
        }
        if (this.tile_tl != null) {
            for(let i:number = 0;i<this.width;i+=8*PIXEL_SIZE) {
                if (i==0) {
                    this.tile_tl.drawWithZoom(this.x+i,this.y, PIXEL_SIZE);
                    this.tile_bl.drawWithZoom(this.x+i,this.y+this.height-8*PIXEL_SIZE, PIXEL_SIZE);
                } else if (i == this.width - 8*PIXEL_SIZE) {
                    this.tile_tr.drawWithZoom(this.x+i,this.y, PIXEL_SIZE);
                    this.tile_br.drawWithZoom(this.x+i,this.y+this.height-8*PIXEL_SIZE, PIXEL_SIZE);
                } else {
                    this.tile_h.drawWithZoom(this.x+i,this.y, PIXEL_SIZE);
                    this.tile_h.drawWithZoom(this.x+i,this.y+this.height-8*PIXEL_SIZE, PIXEL_SIZE);
                }
            }
            for(let i:number = 8*PIXEL_SIZE;i<this.height-8*PIXEL_SIZE;i+=8*PIXEL_SIZE) {
                this.tile_v.drawWithZoom(this.x, this.y+i, PIXEL_SIZE);
                this.tile_v.drawWithZoom(this.x+this.width-8*PIXEL_SIZE, this.y+i, PIXEL_SIZE);
            }
        }

    }

    GLTM:GLTManager = null;
    tile_tl:GLTile = null;
    tile_tr:GLTile = null;
    tile_bl:GLTile = null;
    tile_br:GLTile = null;
    tile_h:GLTile = null;
    tile_v:GLTile = null;
}


class BShrdluTextFrame extends BShrdluFrame {
    constructor(initial_text:string[], centered:boolean, font:string, fontHeight:number, x:number, y:number, width:number, height:number, GLTM:GLTManager)
    {
        super(x, y, width, height, GLTM);

        this.centered = centered;
        this.font = font;
        this.fontHeight = fontHeight;
        this.text = initial_text;
    }


    drawAlpha(alpha:number)
    {
        super.drawAlpha(alpha);

        let x:number = this.x + 8*PIXEL_SIZE;
        let y:number = this.y + 8*PIXEL_SIZE + this.fontHeight;
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
            y += this.fontHeight;
        }        
    }

    centered:boolean = false;
    font:string = null;
    fontHeight:number = 8;
    text:string[] = null;
}


class BShrdluButton extends BButton {
    constructor(text:string, font:string, x:number, y:number, width:number, height:number, ID:number, color:string, callback:((any, number) => void))
    {
        super(text, font, x, y, width, height, ID, callback);
        this.color = color;
    }

    drawAlpha(alpha:number)
    {
        ctx.fillStyle = MSX_COLOR_GREY;
        if (!this.enabled) ctx.fillStyle = MSX_COLOR_DARK_BLUE;
        switch(this.status) {
        case BBUTTON_STATE_MOUSEOVER: 
                ctx.fillStyle = MSX_COLOR_WHITE;
                break;                
        case BBUTTON_STATE_PRESSED: 
                ctx.fillStyle = MSX_COLOR_WHITE;
                break;
        default:
        } 

        ctx.font = this.font;
        ctx.textBaseline = "middle"; 
        ctx.textAlign = "center";
        ctx.fillText(this.text, this.x+this.width/2, this.y+this.height/2);
    }

    color:string;
}



function createShrdluMenu(lines:string[], callbacks:((any, number) => void)[], 
                font:string, font_heigth:number, x:number, y:number, width:number, height:number, interline_space:number, starting_ID:number,
                GLTM:GLTManager)
{
    BInterface.addElement(new BShrdluFrame(x,y,width,height, GLTM));
    let by:number = y + 8*PIXEL_SIZE;
    for(let i = 0;i<lines.length;i++) {
        BInterface.addElement(new BShrdluButton(lines[i], font, x, by, width, font_heigth, starting_ID, "white", callbacks[i]));
        starting_ID++;
        by += font_heigth + interline_space;
    }
}


function getShrdluInstructionsString() : string[]
{
    let instructions:string[] = [];
    instructions.push("");
    instructions.push(" Controls:");
    instructions.push(" - Move with ARROW KEYS");
    instructions.push(" - ENTER or type to talk");
    instructions.push(" - SPACE to take/interact");
    instructions.push(" - SPACE + ARROW KEYS to push/pull");
    instructions.push(" - TAB to toogle inventory");
    instructions.push(" - O to drop items");
    instructions.push(" - U to use items in inventory");
    instructions.push(" - PGUP/PGDOWN to navigate messages");
    instructions.push("   and the inventory");
    instructions.push(" - Alternatively, use the MOUSE to");
    instructions.push("   interact with the UI");
    instructions.push(" - SHIFT to speed up walking");
    instructions.push(" - ESC to pause/load/save/quit");
/*
    instructions.push("- Levers open/close doors or trigger other secrets.");
    if (this.game.allowStats) {
        instructions.push("- You might lose hit points by fighting.");
        instructions.push("- Find potions to recover hit/magic points.");
    }
    if (this.game.allowInventory) {
        instructions.push("- Remember to equip the most powerful items.");
    }
    instructions.push("- Explore methodically, you might find some clues...");
    if (this.game.allowInventory) {
        instructions.push("- To fight while on a vehicle, first disembark.");
    }
*/
    return instructions;
}


function drawFadeInOverlay(f:number)
{
    let offset:number = 8 - Math.floor(8*f);
    let squareSize:number = 16 - offset*2;
    ctx.fillStyle = "black";
    for(let y:number = 0;y<192;y+=16) {
        for(let x:number = 0;x<256;x+=16) {
            ctx.fillRect((x+offset)*PIXEL_SIZE, (y+offset)*PIXEL_SIZE,
                         squareSize*PIXEL_SIZE, squareSize*PIXEL_SIZE);
        }
    }
}


function generateDebugLogForDownload(app:A4EngineApp)
{
   //let newline:string = "%0a";    // we need this, if we append the text to the page at the end
   let newline:string = "\n";
   let tab:string = "\t";
   let mailContent:string = "SHRDLU "+SHRDLU_VERSION+" log:" + newline;
   mailContent += "Please email this file to santi.ontanon@gmail.com to help improve this game!" + newline + newline;
   for(let m of app.game.messages) {
       mailContent += (Number(m[2])-SHRDLU_START_DATE) + tab + m[0] + newline;
   }
   mailContent += newline + "In-game Actions:" + newline;
   for(let m of app.game.in_game_actions_for_log) {
       mailContent += (Number(m[1])-SHRDLU_START_DATE) + tab + m[0] + newline;
   }
   mailContent += newline + "Error messages:" + newline;
   for(let m of app.game.error_messages_for_log) {
       mailContent += (Number(m[1])-SHRDLU_START_DATE) + tab + m[0] + newline;
   }
   
   /*
   // method 1: mailto
   let mail = "mailto:santi.ontanon@gmail.com?subject=SHRDLU DEMO 1 log&body=" + mailContent + "";
   let win = window.open(mail, 'emailWindow');
   if (win && win.open && !win.closed) win.close();

   // method 2: append to the page
   document.getElementById("log").innerHTML = mailContent.split("%0a").join("<br>");
   */

   // method 3: downloadable file
   downloadStringAsFile(mailContent, "debug-log.txt")
}


function downloadStringAsFile(s:string, fileName:string) 
{
   let blob:Blob = new Blob([s], {type: 'text/csv'});
   if (window.navigator.msSaveOrOpenBlob) {
       window.navigator.msSaveOrOpenBlob(blob, fileName);
   } else {
       let elem = window.document.createElement('a');
       elem.href = window.URL.createObjectURL(blob);
       elem.download = fileName;
       document.body.appendChild(elem);
       elem.click();
       document.body.removeChild(elem);
   }
}

