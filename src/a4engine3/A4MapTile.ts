class A4MapTile {
    static loadFromXML(object_xml:Element, game:A4Game) : A4MapTile
    {
    	let t:A4MapTile = new A4MapTile();

    	t.ID = Number(object_xml.getAttribute("ID"));
    	let tilesStr:string[] = object_xml.getAttribute("tiles").split(",");
    	t.tileIds = [];
    	for(let tileStr of tilesStr) {
    		t.tileIds.push(Number(tileStr));
    	}

        if (object_xml.getAttribute("walkable") == "false") {
            t.walkable = false;
        }

        if (object_xml.getAttribute("seeThrough") == "false") {
            t.seeThrough = false;
        }

    	return t;
	}


    saveToXML() : string
    {
        let xmlString:string = "<tile ID=\"" + this.ID + "\" tiles=\"";
        let first:boolean = true;
        for(let id of this.tileIds) {
            if (first) {
                first = false;
                xmlString += id;
            } else {
                xmlString += "," + id;
            }
        }
        xmlString += "\"";
        if (!this.walkable) xmlString += " walkable=\"false\"";
        if (!this.seeThrough) xmlString += " seeThrough=\"false\"";

        return xmlString + "/>\n";
    }


    cacheDrawTiles(graphicFiles:A4GraphicFile[], gfs_startTile:number[])
    {
        this.glTiles = new Array(this.tileIds.length);
        this.glTilesDark = new Array(this.tileIds.length);
        for(let i:number = 0; i<this.tileIds.length;i++) {
            if (this.tileIds[i]>=0) {
                for(let j:number = 0;j<graphicFiles.length;j++) {
                    if (j<graphicFiles.length-1 && this.tileIds[i]>=gfs_startTile[j+1]) continue;
                    this.glTiles[i] = graphicFiles[j].getTile(this.tileIds[i]-gfs_startTile[j]);
                    this.glTilesDark[i] = graphicFiles[j].getTileDark(this.tileIds[i]-gfs_startTile[j]);
                    // if images are not yet loaded, wait!
                    if (this.glTiles[i] == null || this.glTilesDark[i] == null) {
                        this.glTiles = null;
                        this.glTilesDark = null;
                        return;
                    }
                    break;
                }
            } else {
                this.glTiles[i] = null;
                this.glTilesDark[i] = null;
            }
        }        
    }


	draw(x:number, y:number, stride:number)
	{
		for(let glTile of this.glTiles) {
			if (glTile != null) glTile.draw(x, y);
			y -= stride;
		}
	}


	drawDark(x: number, y:number, stride:number)
	{
		for(let glTile of this.glTilesDark) {
			if (glTile != null) glTile.draw(x, y);
			y -= stride;
		}
	}



	// the number used to identify this tile in Tiled:
	ID:number = -1;
	// Each of the entries in these lists will be drawn one after another vertically, when this tile has to be drawn:
	tileIds:number[] = null;
    walkable:boolean = true;
    seeThrough:boolean = true;

    glTiles:GLTile[] = null;
    glTilesDark:GLTile[] = null;	
}
