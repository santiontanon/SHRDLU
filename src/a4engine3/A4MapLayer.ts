class A4MapLayer {
	constructor(width:number, height:number, gfs:A4GraphicFile[])
    {
        this.width = width;
        this.height = height;
        this.graphicFiles = gfs;
        let startTile:number = 0;
        for(let i:number = 0;i<gfs.length;i++) {
            this.gfs_startTile.push(startTile);
            startTile += gfs[i].n_tiles;
        }
        for(let i:number = 0;i<width*height;i++) {
            this.tiles.push(null);
            this.canDig.push(0);
        }
        this.tileWidth = gfs[0].tileWidth;
        this.tileHeight = gfs[0].tileHeight;
    }
    

    cacheDrawTiles()
    {
        for(let i:number = 0;i<this.width * this.height;i++) {
            if (this.tiles[i] != null) {
                this.tiles[i].cacheDrawTiles(this.graphicFiles, this.gfs_startTile);
            }
        }        
    }


	draw(offsetx:number, offsety:number, zoom:number, SCREEN_X:number, SCREEN_Y:number, game:A4Game)
    {
        ctx.save();
        ctx.scale(zoom, zoom);
        let y:number = -offsety;
        let ZSY:number = Math.floor(SCREEN_Y/zoom);
        let ZSX:number = Math.floor(SCREEN_X/zoom);
        for(let i:number = 0;i<this.height && y<ZSY;i++, y+=this.tileHeight) {
            if (y+this.tileHeight<0) continue;
            let offset:number = i*this.width;
            let x:number = -offsetx;
            for(let j:number = 0;j<this.width && x<ZSX;j++,x+=this.tileWidth,offset++) {
                if (x+this.tileWidth<0) continue;
                if (this.tiles[offset]!=null) {
                    this.tiles[offset].draw(x, y, this.tileHeight);
                }
            }
        }

        ctx.restore();
    }

  
    drawRegion(offsetx:number, offsety:number, zoom:number, SCREEN_X:number, SCREEN_Y:number, visibility:number[], visibilityRegion:number, game:A4Game, map:A4Map)
    {
        ctx.save();
        ctx.scale(zoom, zoom);
        let y:number = -offsety;
        let ZSY:number = Math.floor(SCREEN_Y/zoom);
        let ZSX:number = Math.floor(SCREEN_X/zoom);
        for(let i:number = 0;i<this.height && y<ZSY;i++, y+=this.tileHeight) {
            if (y+this.tileHeight<0) continue;
            let offset:number = i*this.width;
            let x:number = -offsetx;
            for(let j:number = 0;j<this.width && x<ZSX;j++,x+=this.tileWidth,offset++) {
                if (x+this.tileWidth<0) continue;
                if (this.tiles[offset] != null) {
                    if (visibility[offset]==visibilityRegion) {
                        if (map.lightOnStatus[offset]) {
                            this.tiles[offset].draw(x, y, this.tileHeight);
                        } else {
                            this.tiles[offset].drawDark(x, y, this.tileHeight);
                        }
                    } else if (visibility[offset]==0 &&
                               ((j>0 && visibility[offset-1]==visibilityRegion) ||
                                (j<this.width-1 && visibility[offset+1]==visibilityRegion) ||
                                (i>0 && visibility[offset-this.width]==visibilityRegion) ||
                                (i<this.height-1 && visibility[offset+this.width]==visibilityRegion) ||

                                (j>0 && i>0 && visibility[offset-(1+this.width)]==visibilityRegion) ||
                                (j>0 && i<this.height-1 && visibility[offset+this.width-1]==visibilityRegion) ||
                                (j<this.width-1 && i>0 && visibility[offset+1-this.width]==visibilityRegion) ||
                                (j<this.width-1 && i<this.height-1 && visibility[offset+1+this.width]==visibilityRegion)
                               )) {
                        if (map.lightOnStatus[offset]) {
                            this.tiles[offset].draw(x, y, this.tileHeight);
                        } else {
                            this.tiles[offset].drawDark(x, y, this.tileHeight);
                        }
                    }
                }
            }
        }
        
        ctx.restore();
    }


    drawRegionRow(offsetx:number, offsety:number, i:number, zoom:number, SCREEN_X:number, SCREEN_Y:number, visibility:number[], visibilityRegion:number, game:A4Game, map:A4Map)
    {
        i -= this.elevation;
        if (i<0) return;
        if (i>=this.height) return;
        let y:number = i*this.tileHeight - offsety;
        let offset:number = i*this.width;
        let offsetWithoutElevation:number = (i+this.elevation)*this.width;
        let visibilityOffset:number = (i+this.elevation)*this.width;
        let ZSX:number = Math.floor(SCREEN_X/zoom);
        let x:number = -offsetx;
        for(let j:number = 0;j<this.width && x<ZSX;j++,x+=this.tileWidth,offset++,offsetWithoutElevation++,visibilityOffset++) {
            if (x+this.tileWidth<0) continue;
            if (this.tiles[offset] != null) {
                if (visibility[visibilityOffset] == visibilityRegion) {
                    if (map.lightOnStatus[offsetWithoutElevation]) {
                        this.tiles[offset].draw(x, y, this.tileHeight);
                    } else {
                        this.tiles[offset].drawDark(x, y, this.tileHeight);
                    }
                } else if (visibility[visibilityOffset]==0 &&
                           ((j>0 && visibility[visibilityOffset-1]==visibilityRegion) ||
                            (j<this.width-1 && visibility[visibilityOffset+1]==visibilityRegion) ||
                            (i>0 && visibility[visibilityOffset-this.width]==visibilityRegion) ||
                            (i<this.height-1 && visibility[visibilityOffset+this.width]==visibilityRegion) ||

                            (j>0 && i>0 && visibility[visibilityOffset-(1+this.width)]==visibilityRegion) ||
                            (j>0 && i<this.height-1 && visibility[visibilityOffset+this.width-1]==visibilityRegion) ||
                            (j<this.width-1 && i>0 && visibility[visibilityOffset+1-this.width]==visibilityRegion) ||
                            (j<this.width-1 && i<this.height-1 && visibility[visibilityOffset+1+this.width]==visibilityRegion)
                           )) {
                    if (map.lightOnStatus[offsetWithoutElevation]) {
                        this.tiles[offset].draw(x, y, this.tileHeight);
                    } else {
                        this.tiles[offset].drawDark(x, y, this.tileHeight);
                    }
                }
            }
        }
    }


    walkableOnlyBackground(x:number, y:number, dx:number, dy:number, subject:A4Object):boolean
    {
        if (x<-this.tileWidth || y<-this.tileHeight) return false;
        if (x+dx>=(this.width+1)*this.tileWidth || 
            y+dy>=(this.height+1)*this.tileHeight) return false;
        let tile_x:number = Math.floor(x/this.tileWidth);
        let tile_y:number = Math.floor(y/this.tileHeight);
        let tile_x2:number = Math.floor((x+dx-1)/this.tileWidth);
        let tile_y2:number = Math.floor((y+dy-1)/this.tileHeight);
        let tile:A4MapTile = null;
        for(let i:number = tile_y;i<=tile_y2;i++) {
            if (i<0) continue;
            if (i>=this.height) continue;
            for(let j:number = tile_x;j<=tile_x2;j++) {
                //if (j>=this.width) return false;
                if (j>=this.width) continue;
                tile = this.tiles[j+i*this.width];
                if (tile != null && !tile.walkable) {
                    return false;
                } 
            }
        }          
        return true;
    }

	
    seeThrough(tilex:number, tiley:number) : boolean
    {
        let tile:A4MapTile = this.tiles[tilex+tiley*this.width];
        if (tile != null && !tile.seeThrough) {
            return false;
        } 
        return true;    
    }


	width:number;
    height:number;
    tileWidth:number;
    tileHeight:number;

    elevation:number = 0;    // this indicates the elevation offset of the tiles in this layer

    graphicFiles:A4GraphicFile[] = [];
    gfs_startTile:number[] = [];
    canDig:number[] = [];
    tiles:A4MapTile[] = [];
};
