class A4Animation {
    static fromXML(xml:Element, game:A4Game) : A4Animation
    {
        // <animation name="curious" dx="1" dy="1" period="8" looping="true" file="graphics2x.png">74,-1</animation>
        var a:A4Animation = new A4Animation();

        var file:string = xml.getAttribute("file");
        a.gf = game.getGraphicFile(file);
        if (a.gf == null) console.log("A4Animation: cannot get graphic file " + file);
        a.widthInTiles = Number(xml.getAttribute("dx"));
        a.heightInTiles = Number(xml.getAttribute("dy"));
        a.period = Number(xml.getAttribute("period"));
        if (xml.getAttribute("looping") == "true") a.looping = true;

        var sequenceText:string = xml.firstChild.nodeValue;
        var sequenceFrames:string[] = sequenceText.split(",");
        a.length = sequenceFrames.length;
        a.sequence = [];
        for(let frame of sequenceFrames) {
            a.sequence.push(Number(frame));
        }
        return a;
    }


    static fromAnimation(a:A4Animation)
    {
        var a2:A4Animation = new A4Animation();

        a2.gf = a.gf;
        a2.widthInTiles = a.widthInTiles;
        a2.heightInTiles = a.heightInTiles;
        a2.period = a.period;
        a2.looping = a.looping;
        a2.length = a.length;
        a2.sequence = [];
        for(let i:number = 0;i<a2.length;i++) a2.sequence.push(a.sequence[i]);

        a2.cycle = a.cycle;
        a2.state = a.state;
        a2.completed = a.completed;

        return a2;
    }


    saveToXML(name:string) : string
    {
        var xmlString:string = "";
        xmlString += "<animation ";
        xmlString += "name=\"" + name + "\" ";
        xmlString += "dx=\"" + this.widthInTiles + "\" ";
        xmlString += "dy=\"" + this.heightInTiles + "\" ";
        xmlString += "period=\"" + this.period + "\" ";
        xmlString += "looping=\"" + this.looping + "\" ";
        xmlString += "file=\"" + this.gf.name + "\">";
        for(let i:number = 0;i<this.length;i++) {
            if (i==0) {
                xmlString += this.sequence[i];
            } else {
                xmlString += ","+this.sequence[i];
            }
        }
        xmlString += "</animation>";
        return xmlString;
    }


    reset()
    {
        this.cycle = 0;
        this.state = 0;
        this.completed = false;    
    }


    update() : boolean
    {
        if (this.completed) return true;
        this.cycle++;
        if (this.cycle>=this.period) {
            this.cycle-=this.period;
            this.state++;
            if (this.state>=this.length) {
                if (this.looping) {
                    this.state = 0;
                } else {
                     this.state = this.length-1;
                     this.completed = true;
                }
            }
        }
        return this.completed;
    }


    draw(x:number, y:number)
    {
        var t:number = this.getTile();
        if (t<0) return;
        for(let i:number = 0;i<this.heightInTiles;i++) {
            for(let j:number = 0;j<this.widthInTiles;j++) {
                var tile:GLTile = this.gf.getTile(t+j + i*this.gf.tilesPerRow);
                tile.draw(x+(j*tile.width), y+(i*tile.height));
            }
        }
    }


    drawDark(x:number, y:number)
    {
        var t:number = this.getTile();
        if (t<0) return;
        for(let i:number = 0;i<this.heightInTiles;i++) {
            for(let j:number = 0;j<this.widthInTiles;j++) {
                var tile:GLTile = this.gf.getTileDark(t+j + i*this.gf.tilesPerRow);
                if (tile!=null) tile.draw(x+(j*tile.width), y+(i*tile.height));
            }
        }
    }


    drawWithZoom(x:number, y:number, zoom:number)
    {
        var t:number = this.getTile();
        if (t<0) return;
        for(let i:number = 0;i<this.heightInTiles;i++) {
            for(let j:number = 0;j<this.widthInTiles;j++) {
                var tile:GLTile = this.gf.getTile(t+j + i*this.gf.tilesPerRow);
                if (tile!=null) tile.drawWithZoom(x+(j*tile.width), y+(i*tile.height), zoom);
            }
        }
    }

/*
    drawWithAlpha(x:number, y:number, alpha:number)
    {
        var t:number = this.getTile();
    //    output_debug_message("A4Animation::draw %i\n",t);
        if (t<0) return;
        for(let i:number = 0;i<this.heightInTiles;i++) {
            for(let j:number = 0;j<this.widthInTiles;j++) {
                var tile:GLTile = this.gf.getTile(t+j + i*this.gf.tilesPerRow);
    //            output_debug_message("A4Animation::draw(2) %p\n",tile);
                tile.drawWithAlpha(x+(j*tile.width), y+(i*tile.height), alpha);
            }
        }
    }
*/


/*
    bool isCompleted();
*/

    seeThrough() : boolean
    {
        var tile:number = this.getTile();
        if (tile<0) return true;

        if (this.gf.tileSeeThrough[tile]==1) return false;
        return true;   
    }


    getTile() : number
    {
        if (this.state>=0) return this.sequence[this.state];
        return -1;
    }


    getPixelWidth():number
    {
        return this.widthInTiles * this.gf.tileWidth;
    }


    getPixelHeight():number
    {
        return this.heightInTiles * this.gf.tileHeight;
    }


    gf:A4GraphicFile = null;
    widthInTiles:number = 1;
    heightInTiles:number = 1;

    period:number = 1;
    looping:boolean = false;
    length:number = 0;
    sequence:number[] = null;

    cycle:number = 0;
    state:number = 0;
    completed:boolean = false;
}

