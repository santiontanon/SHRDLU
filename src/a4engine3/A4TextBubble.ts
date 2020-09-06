class A4TextBubble {
    constructor(text:string, maxWidth:number, font:string, fontWidth:number, fontHeight:number, game:A4Game, speaker:A4Character)
    {
        let buffer:string = "";
        let last_space = 0;
        let longestLine = 0;

        this.text = text;
        this.speaker = speaker;

  //      console.log("Creating a text bubble for " + text);

        for(let i:number = 0;i<text.length;i++) {
            buffer += text.charAt(i);
            if (text.charAt(i) == ' ') last_space = i;
            if (buffer.length>=maxWidth) {
                if (last_space==0) {
                    // a single word doesn't fit, just split it!
                    this.lines.push(buffer);
                    if (buffer.length>longestLine) longestLine = buffer.length;
                    buffer = "";
                } else {
//                    console.log("i: " + i + ", buffer: " + buffer + ", last_space: " + last_space);
                    let backspaces:number = i - last_space;
                    buffer = buffer.substring(0,buffer.length-backspaces);
                    i-=backspaces;
                    this.lines.push(buffer);
                    if (buffer.length>longestLine) longestLine = buffer.length;
                    buffer = "";
                    last_space = 0;
                }
            }
        }

        if (buffer != "") {
            this.lines.push(buffer);
            if (buffer.length>longestLine) longestLine = buffer.length;
        }
        
        this.font = font;

        this.width = 16 + longestLine * fontWidth;
        if ((this.width%8)!=0) this.width += 8 - (this.width%8);
        this.height = Math.floor(8 + this.lines.length * fontHeight);
        if ((this.height%8)!=0) this.height += 8 - (this.height%8);
        this.fontHeight = fontHeight;
        this.fontWidth = fontWidth;

        if (A4TextBubble.tiles == null) {
            A4TextBubble.tiles = [];
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",0,16,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",8,16,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",16,16,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",0,24,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",8,24,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",16,24,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",0,32,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",8,32,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",16,32,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",24,16,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",24,24,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",32,16,8,8));
            A4TextBubble.tiles.push(game.GLTM.getPiece("data/GUI.png",32,24,8,8));
            A4TextBubble.tiles2 = [];
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",40,16,8,8));            
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",48,16,8,8));            
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",56,16,8,8));            
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",40,24,8,8));            
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",48,24,8,8));            
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",56,24,8,8));            
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",40,32,8,8));            
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",48,32,8,8));            
            A4TextBubble.tiles2.push(game.GLTM.getPiece("data/GUI.png",56,32,8,8));            
            A4TextBubble.tiles3 = [];
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",0,16,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",16,40,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",16,16,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",0,40,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",8,24,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",8,40,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",0,32,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",24,40,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",16,32,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",32,32,8,8));
            A4TextBubble.tiles3.push(game.GLTM.getPiece("data/GUI.png",24,32,8,8));
        }
    }
    

    draw(x:number, y:number, pointx:number, pointy:number, thought:boolean, alpha:number)
    {
        // draw the bubble:
        if (thought) {
            // draw bubble:
            A4TextBubble.tiles3[0].draw(x, y);
            let i:number;
            for(i = 8;i<=this.width-16;i+=8) {
                if ((i/8)%2 == 0) A4TextBubble.tiles3[1].draw(x+i, y);
                             else A4TextBubble.tiles[1].draw(x+i, y);
            }
            A4TextBubble.tiles3[2].draw(x+this.width-8, y);

            for(let j:number = 8;j<=this.height-16;j+=8) {
                if ((i/8)%2 == 0) A4TextBubble.tiles3[3].draw(x, y+j);
                             else A4TextBubble.tiles[3].draw(x, y+j);
                for(let i:number = 8;i<=this.width-16;i+=8) A4TextBubble.tiles3[4].draw(x+i, y+j);
                if ((i/8)%2 == 0) A4TextBubble.tiles3[5].draw(x+this.width-8, y+j);
                             else A4TextBubble.tiles[5].draw(x+this.width-8, y+j);
            }

            A4TextBubble.tiles3[6].draw(x, y+this.height-8);
            for(let i:number = 8;i<=this.width-16;i+=8) {
                if ((i/8)%2 == 0) A4TextBubble.tiles3[7].draw(x+i, y+this.height-8);
                             else A4TextBubble.tiles[7].draw(x+i, y+this.height-8);
            }
            A4TextBubble.tiles3[8].draw(x+this.width-8, y+this.height-8);

            // draw arrow:
            let arrowx:number = pointx-4;
            if (pointx < x+8) pointx = x+8;
            if (pointx > x+this.width-16) pointx = x+this.width-16;
            if (pointy>y) {
                A4TextBubble.tiles3[10].draw(arrowx, y+this.height);
            } else {
                A4TextBubble.tiles3[9].draw(arrowx, y-8);
            }
        } else {
            // draw bubble:
            A4TextBubble.tiles[0].draw(x, y);
            for(let i:number = 8;i<=this.width-16;i+=8) A4TextBubble.tiles[1].draw(x+i, y);
            A4TextBubble.tiles[2].draw(x+this.width-8, y);

            for(let j:number = 8;j<=this.height-16;j+=8) {
                A4TextBubble.tiles[3].draw(x, y+j);
                for(let i:number = 8;i<=this.width-16;i+=8) A4TextBubble.tiles[4].draw(x+i, y+j);
                A4TextBubble.tiles[5].draw(x+this.width-8, y+j);
            }

            A4TextBubble.tiles[6].draw(x, y+this.height-8);
            for(let i:number = 8;i<=this.width-16;i+=8) A4TextBubble.tiles[7].draw(x+i, y+this.height-8);
            A4TextBubble.tiles[8].draw(x+this.width-8, y+this.height-8);

            // draw arrow:
            let arrowx:number = pointx-4;
            if (pointx < x+8) pointx = x+8;
            if (pointx > x+this.width-16) pointx = x+this.width-16;
            if (pointy>y) {
                A4TextBubble.tiles[9].draw(arrowx, y+this.height-8);
                A4TextBubble.tiles[10].draw(arrowx, y+this.height);
            } else {
                A4TextBubble.tiles[11].draw(arrowx, y-8);
                A4TextBubble.tiles[12].draw(arrowx, y);
            }
        }

        y+=4;
        for(let line of this.lines) {
            let tx:number = x + Math.floor((this.width - line.length*this.fontWidth)/2);
            fillTextTopLeft(line, tx, y, this.font, MSX_COLOR_BLACK);
            y+= this.fontHeight;
        }        
    }


    drawNoArrow(x:number, y:number, thought:boolean, alpha:number)
    {
        // draw the bubble:
        // draw bubble:
        A4TextBubble.tiles2[0].draw(x, y);
        for(let i:number = 8;i<=this.width-16;i++) A4TextBubble.tiles2[1].draw(x+i, y);
        A4TextBubble.tiles2[2].draw(x+this.width-8, y);

        for(let j:number = 8;j<=this.height-16;j++) {
            A4TextBubble.tiles2[3].draw(x, y+j);
            for(let i:number = 8;i<=this.width-16;i++) A4TextBubble.tiles2[4].draw(x+i, y+j);
            A4TextBubble.tiles2[5].draw(x+this.width-8, y+j);
        }

        A4TextBubble.tiles2[6].draw(x, y+this.height-8);
        for(let i:number = 8;i<=this.width-16;i++) A4TextBubble.tiles2[7].draw(x+i, y+this.height-8);
        A4TextBubble.tiles2[8].draw(x+this.width-8, y+this.height-8);

        y+=4;
        for(let line of this.lines) {
            let tx:number = x + Math.floor((this.width - line.length*this.fontWidth)/2);
            fillTextTopLeft(line, tx, y, this.font, MSX_COLOR_BLACK);
            y+= this.fontHeight;
        }        
    }
    

    static tiles:GLTile[] = null;    // for regular speech bubbles
    static tiles2:GLTile[] = null;    // for speech that comes through speakers
    static tiles3:GLTile[] = null;    // for thought bubbles

    text:string = null;    // original text, before splitting it into lines
    lines:string[] = [];
    font:string;
    fontHeight:number;
    fontWidth:number;

    width:number;
    height:number;

    speaker:A4Character = null;
}
