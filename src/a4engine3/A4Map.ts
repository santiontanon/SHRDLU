var SHRDLUMAP_MAX_ALTITUDE:number = 3;


class PerceptionBufferRecord {
    constructor(action:string, subjectID:string, subjectSort:Sort, 
                objectID:string, objectSort:Sort, objectSymbol:string,
                indirectID:string, indirectSort:Sort, 
                x0:number, y0:number, x1:number, y1:number)
    {
//        console.log(action.length);
        this.action = action;
        this.subjectID = subjectID;
        this.subjectSort = subjectSort;

        this.directObjectID = objectID;
        this.directObjectSort = objectSort;
        this.directObjectSymbol = objectSymbol;

        this.indirectObjectID = indirectID;
        this.indirectObjectSort = indirectSort;

        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
    }

    action:string;
    subjectID:string;
    directObjectID:string = null;
    indirectObjectID:string = null;
    subjectSort:Sort = null;
    directObjectSort:Sort = null;
    indirectObjectSort:Sort = null;
    directObjectSymbol:string = null;
    x0:number;
    y0:number;
    x1:number;
    y1:number;
    time:number;
}



class PerceptionBufferObjectWarpedRecord {
    constructor(ID:string, sort:Sort, map:string, x0:number, y0:number, x1:number, y1:number) {
        this.ID = ID;
        this.sort = sort;
        this.targetMap = map;
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
    }

    ID:string;
    sort:Sort;
    targetMap:string;
    x0:number;
    y0:number;
    x1:number;
    y1:number;
    time:number;
};



class A4Map {

    constructor(xml:Element, game:A4Game, 
                objectsToRevisit_xml:Element[], 
                objectsToRevisit_object:A4Object[])
    {
        this.xml = xml;
        this.width = Number(xml.getAttribute("width"));
        this.height = Number(xml.getAttribute("height"));

        var properties_xml:Element = getFirstElementChildByTag(xml, "properties");
        var properties_xmls:Element[] = getElementChildrenByTag(properties_xml, "property");
        for(let i:number = 0;i<properties_xmls.length;i++) {
            var property:Element = properties_xmls[i];
            if (property.getAttribute("name") == "name") {
                this.name = property.getAttribute("value");
//                console.log("Map name is: " + this.name);
            }
        }

        this.visibilityRegions = [];
        for(let i:number = 0;i<this.width*this.height;i++) this.visibilityRegions.push(0);
        this.lightOnStatus = [];
        for(let i:number = 0;i<this.width*this.height;i++) this.lightOnStatus.push(1);

        // load tilesets:
        var gfs:A4GraphicFile[] = [];
        var tilesets_xmls:Element[] = getElementChildrenByTag(xml, "tileset");
        for(let i:number = 0;i<tilesets_xmls.length;i++) {
            var source_xmls:Element[] = getElementChildrenByTag(tilesets_xmls[i], "image");
            for(let j:number = 0;j<source_xmls.length;j++) {
                var gf:A4GraphicFile = game.getGraphicFile(source_xmls[j].getAttribute("source"));
                // console.log("Loaded tileset: " + source_xmls[j].getAttribute("source") + " -> " + gf);
                gfs.push(gf);
            }
        }
        this.tileWidth = gfs[0].tileWidth;
        this.tileHeight = gfs[0].tileHeight;

        // load tile layers:
        var layers_xmls:Element[] = getElementChildrenByTag(xml, "layer");
        this.layers = [];
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers.push(new A4MapLayer(this.width, this.height, gfs));
            if (i<layers_xmls.length) {
                var layer_properties_xml:Element = getFirstElementChildByTag(layers_xmls[i], "properties");
                var layer_properties_xmls:Element[] = getElementChildrenByTag(layer_properties_xml, "property");
                for(let j:number = 0;j<layer_properties_xmls.length;j++) {
                    var property:Element = layer_properties_xmls[j];
                    if (property.getAttribute("name") == "elevation") {
                        this.layers[i].elevation = Number(property.getAttribute("value"));
                    }
                }

                var data_xml:Element = getFirstElementChildByTag(layers_xmls[i], "data");
                var encoding:string = data_xml.getAttribute("encoding");
                if (encoding == "csv") {
                    var values:string[] = data_xml.firstChild.nodeValue.split(new RegExp(",| |\n|\t|\r"));
                    var idx:number = 0;
                    for(let j:number = 0;j<values.length;j++) {
                        if (values[j]!="") {
                            this.layers[i].tiles[idx] = Number(values[j]) - 1;
                            idx++;
                        }
                    }
                } else {
                    var tile_xmls:Element[] = getElementChildrenByTag(data_xml, "tile");
                    for(let j:number = 0;j<tile_xmls.length;j++) {
                        this.layers[i].tiles[j] = Number(tile_xmls[j].getAttribute("gid")) - 1;
                    }
                }
                // console.log("Map layer loaded with " + tile_xmls.length + " tiles (out of " + (this.width * this.height) + ")");
            }
        }

        // load object layers:
        var objectgroups_xml:Element[] = getElementChildrenByTag(xml, "objectgroup");
        for(let i:number = 0;i<objectgroups_xml.length;i++) {
            var object_xml_l:Element[] = getElementChildrenByTag(objectgroups_xml[i], "object");
            for(let j:number = 0;j<object_xml_l.length;j++) {
                var object_xml:Element = object_xml_l[j];
                var o:A4Object = this.loadObjectFromXML(object_xml, game, objectsToRevisit_xml, objectsToRevisit_object);
                if (o!=null) {
                    o.x = Number(object_xml.getAttribute("x"));
                    o.y = Number(object_xml.getAttribute("y"));
                    this.addObject(o);//, o.layer);
                    //console.log("Added object " + o.name + " at " + o.x + "," + o.y + " to map " + this.name);
                }
            }
        }

        // loading scripts:
        {
            // on start:
            var onstarts_xml:Element[] = getElementChildrenByTag(xml, "onStart");
            for(let i:number = 0;i<onstarts_xml.length;i++) {
                var onstart_xml:Element = onstarts_xml[i];
                var tmp:A4ScriptExecutionQueue = null;
//                var script_xml_l:NodeListOf<Element> = onstart_xml.children;
                var script_xml_l:HTMLCollection = onstart_xml.children;
                for(let j:number = 0;j<script_xml_l.length;j++) {
                    var script_xml:Element = script_xml_l[j];
                    var s:A4Script = A4Script.fromXML(script_xml);
                    if (tmp == null) tmp = new A4ScriptExecutionQueue(null, this, game, null);
                    tmp.scripts.push(s);
                }
                if (tmp!=null) this.scriptQueues.push(tmp);
            }        

            // event rules:
            var eventrules_xml:Element[] = getElementChildrenByTag(xml, "eventRule");
            for(let i:number = 0;i<eventrules_xml.length;i++) {
                var rule_xml:Element = eventrules_xml[i];
                var r:A4EventRule = A4EventRule.fromXML(rule_xml);
                if (this.eventScripts[r.event] == null) this.eventScripts[r.event] = [];
                this.eventScripts[r.event].push(r);
            }        
        }
        
        this.reevaluateVisibilityRequest();
    }


    loadObjectFromXML(object_xml:Element, game:A4Game, 
                      objectsToRevisit_xml:Element[],
                      objectsToRevisit_object:A4Object[]) : A4Object
    {
        var o:A4Object = null;
        var of:A4ObjectFactory = game.objectFactory;
        //var layer:number = A4_LAYER_FG;
        var o_ID:string = object_xml.getAttribute("id");
        var o_class:string = object_xml.getAttribute("class");
        if (o_class == null) o_class = object_xml.getAttribute("type");
        var completeRedefinition:boolean = false;
        if (object_xml.getAttribute("completeRedefinition") == "true") completeRedefinition = true;

        if (o_class == "Bridge") {
            var mb:A4MapBridge = new A4MapBridge(object_xml, this);
            mb.loadObjectAdditionalContent(object_xml, game, of, objectsToRevisit_xml, objectsToRevisit_object);
            this.bridges.push(mb);
            if (o_ID != null) {
                mb.ID = o_ID;
                if (!isNaN(Number(o_ID)) &&
                    Number(o_ID) >= A4Object.s_nextID) A4Object.s_nextID = Number(o_ID)+1;
//                console.log("Map:" + mb.name + " -> " + mb.ID + " (" + A4Object.s_nextID + ")");
            }
            return null;
        } else if (o_class == "BridgeDestination") {
            var mb:A4MapBridge = new A4MapBridge(object_xml, this);
            mb.loadObjectAdditionalContent(object_xml, game, of, objectsToRevisit_xml, objectsToRevisit_object);
            this.bridgeDestinations.push(mb);
            if (o_ID != null) {
                mb.ID = o_ID;
                if (!isNaN(Number(o_ID)) &&
                    Number(o_ID) >= A4Object.s_nextID) A4Object.s_nextID = Number(o_ID)+1;
//                console.log("Map:" + mb.name + " -> " + mb.ID + " (" + A4Object.s_nextID + ")");
            }
            return null;
        } else if (o_class == "Trigger") {
            o = new A4Trigger(game.ontology.getSort("Trigger"),
                              Number(object_xml.getAttribute("width")),
                              Number(object_xml.getAttribute("height")));
            o.loadObjectAdditionalContent(object_xml, game, of, objectsToRevisit_xml, objectsToRevisit_object);
            var once:boolean = true;
            if (object_xml.getAttribute("repeat") == "true") once = false;
            var scripts_xmls:Element[] = getElementChildrenByTag(object_xml, "script");
            if (scripts_xmls != null && scripts_xmls.length>0) {
//                var tmp:NodeListOf<Element> = scripts_xmls[0].children;
                var tmp:HTMLCollection = scripts_xmls[0].children;
                for(let i:number = 0;i<tmp.length;i++) {
                    var s:A4Script = A4Script.fromXML(tmp[i]);
                    o.addEventRule(A4_EVENT_ACTIVATE, new A4EventRule(A4_EVENT_ACTIVATE, s, once, 0, 0));
                }
            }
        } else {
            o = of.createObject(o_class, game, false, completeRedefinition);
            if (o == null) {
                console.error("Unknown object class: " + o_class);
                return null;
            }
            o.loadObjectAdditionalContent(object_xml, game, of, objectsToRevisit_xml, objectsToRevisit_object);
            //if (o.isCharacter()) layer = A4_LAYER_CHARACTERS;
        }
        //o.layer = layer;
        if (o_ID != null) {
            o.ID = o_ID;
            if (!isNaN(Number(o_ID)) &&
                Number(o_ID) >= A4Object.s_nextID) A4Object.s_nextID = Number(o_ID)+1;
//            console.log("Map:" + o.name + " -> " + o.ID + " (" + A4Object.s_nextID + ")");
        }
        return o;    
    }
  

    saveToXML(game:A4Game) : string
    {
        var xmlString:string = "";
        xmlString += "<map version=\"1.0\" " + 
                     "orientation=\"orthogonal\" " + 
                     "width=\"" + this.width + "\" " +
                     "height=\"" + this.height + "\" " +
                     "tilewidth=\"" + this.tileWidth + "\" " +
                     "tileheight=\"" + this.tileHeight + "\">\n";

         xmlString += "<properties>\n";
         xmlString += "<property name=\"name\" value=\""+this.name+"\"/>\n";
         xmlString += "</properties>\n";
         var firstID:number = 1;
        for(let gf of game.graphicFiles) {
            xmlString += "<tileset";
            xmlString += " firstgid=\"" + firstID + "\"";
            xmlString += " name=\"graphics\"";
            xmlString += " tilewidth=\"" + gf.tileWidth + "\"";
            xmlString += " tileheight=\"" + gf.tileHeight + "\">\n";

            xmlString += "<image source=\"" + gf.name + "\""+
                               " width=\""+(gf.tilesPerRow*gf.tileWidth)+"\""+
                               " height=\""+(gf.tileHeight*Math.floor(gf.n_tiles/gf.tilesPerRow))+"\"/>\n";

            xmlString += "</tileset>\n";
            firstID += gf.n_tiles;
        }        

        // tile layers:
        for(let i:number = 0;i<this.layers.length;i++) {
            var ml:A4MapLayer = this.layers[i];
            xmlString += "<layer name=\"Tile Layer "+(i+1)+"\""+
                               " width=\""+this.width+"\""+
                               " height=\""+this.height+"\">\n";
            xmlString += "<properties>\n";
            xmlString += "<property name=\"elevation\" value=\""+ml.elevation+"\"/>\n";
            xmlString += "</properties>\n";
/*
            xmlString += "<data>\n";
            for(let y:number = 0;y<this.height;y++) {
                for(let x:number = 0;x<this.width;x++) {
                    xmlString += "<tile gid=\""+(ml.tiles[x+y*this.width]+1)+"\"/>\n";
                }
            }
*/
//              <data encoding="csv">
            xmlString += "<data encoding=\"csv\">\n";
            for(let y:number = 0;y<this.height;y++) {
                for(let x:number = 0;x<this.width;x++) {
                    xmlString += (ml.tiles[x+y*this.width]+1)+",";
                }
                xmlString += "\n";
            }
            xmlString += "</data>\n";
            xmlString += "</layer>\n";
        }
        
        // object layers:
        xmlString += "<objectgroup name=\"objects\" width=\""+this.width+"\" height=\""+this.height+"\">\n";
        for(let b of this.bridges) xmlString += b.saveToXML(game,1,true) + "\n";
        for(let b of this.bridgeDestinations) xmlString += b.saveToXML(game,2,true) + "\n";
        for(let o of this.objects) {
            if (!o.isPlayer())
                xmlString += o.saveToXML(game,0,true) + "\n";
        }
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            var ml:A4MapLayer = this.layers[i];
            for(let o of ml.objects) {
                if (!o.isPlayer())
                    xmlString += o.saveToXML(game,0,true) + "\n";
            }
        }
        */
        xmlString += "</objectgroup>\n";
        
        // save state:
        var onStarttagOpen:boolean = false;
        for(let v in this.storyState) {
            if (!onStarttagOpen) {
                xmlString += "<onStart>\n";
                onStarttagOpen = true;
            }
            xmlString+="<storyState variable=\""+v+"\"" + 
                                  " value=\""+this.storyState[v]+"\"" +
                                  " scope=\"map\"/>\n";
        }
        if (onStarttagOpen) xmlString += "</onStart>\n";
        
        // each execution queue goes to its own "onStart" block:
        for(let seq of this.scriptQueues) {
            xmlString += "<onStart>\n";
            for(let s of seq.scripts) xmlString += s.saveToXML() + "\n";
            xmlString += "</onStart>\n";
        }

        // rules:
        for(let i:number = 0;i<A4_NEVENTS;i++) {
            if (this.eventScripts[i]!=null) {
                for(let er of this.eventScripts[i]) {
                    xmlString += er.saveToXML() + "\n";
                }
            }
        }

        xmlString += "</map>";
        return xmlString;
    }


    update(game:A4Game)
    {
        if (this.cycle==0 && this.eventScripts[A4_EVENT_START] != null) {
            for(let rule of this.eventScripts[A4_EVENT_START]) {
                rule.executeEffects(null, this, game, null);
            }
        }

/*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].update(game);
        }
*/

        // objects:
        var toDelete:A4Object[] = [];
        for(let o of this.objects) {
//            if (this.cycle==0) console.log("Map "+this.name+" update cycle 0 of " + o.name);
            if (!o.update(game)) {
                game.requestDeletion(o);
                toDelete.push(o);
            }
        }
        for(let o of toDelete) {
            var idx:number = this.objects.indexOf(o);
            this.objects.splice(idx, 1);
        }

        // scripts:
        if (this.eventScripts[A4_EVENT_TIMER]!=null) {
            for(let r of this.eventScripts[A4_EVENT_TIMER]) r.execute(null,this,game,null);
        }
        if (this.eventScripts[A4_EVENT_STORYSTATE]!=null) {
            for(let r of this.eventScripts[A4_EVENT_STORYSTATE]) r.execute(null,this,game,null);
        }
        this.executeScriptQueues(game);

        {
            var toDeleteSB:[A4TextBubble,number][] = [];
            for(let sb of this.textBubbles) {
                sb[1]--;
                if (sb[1]<=0) toDeleteSB.push(sb);
            }
            for(let sb of toDeleteSB) {
                var idx:number = this.textBubbles.indexOf(sb);
                this.textBubbles.splice(idx,1);
            }
        }

        // perception buffers:
        {
            var toDelete2:PerceptionBufferRecord[] = [];
            for(let pbr of this.perceptionBuffer) {
                if ((pbr.time+CYCLES_IN_PERCEPTION_BUFFER)<this.cycle) toDelete2.push(pbr);
            }
            for(let dv of toDelete2) {
                var idx:number = this.perceptionBuffer.indexOf(dv);
                this.perceptionBuffer.splice(idx,1);
            }
        }
        {
            var toDelete3:PerceptionBufferObjectWarpedRecord[] = [];
            for(let wpbr of this.warpPerceptionBuffer) {
                if ((wpbr.time+CYCLES_IN_PERCEPTION_BUFFER)<this.cycle) toDelete3.push(wpbr);
            }
            for(let dv of toDelete3) {
                var idx:number = this.warpPerceptionBuffer.indexOf(dv);
                this.warpPerceptionBuffer.splice(idx,1);
            }
        }

        if (this.visibilityReevaluationRequested) this.reevaluateVisibility();

        this.cycle++;
    }

/*
	draw(offsetx:number, offsety:number, zoom:number, SCREEN_X:number, SCREEN_Y:number, game:A4Game)
    {
        this.sortObjectByYCoordinate();

        ctx.save();
        ctx.scale(zoom, zoom);

        var object_idx:number = 0;
        var y:number = -offsety;
        var ZSY:number = Math.floor(SCREEN_Y/zoom) + SHRDLUMAP_MAX_ALTITUDE*8;
        for(let row:number = 0;row<this.layers[0].height+SHRDLUMAP_MAX_ALTITUDE && y<ZSY;y+=this.tileHeight, row++) {
            if (y+this.tileHeight<0) continue;
//            console.log("draw: " + row + " -> " + y);
//            if (row<8) {
                for(let i:number = 0;i<this.layers.length;i++) {
                    this.layers[i].drawRow(offsetx, offsety, row, zoom, SCREEN_X, SCREEN_Y, game);
                }
//            }

            // objects:
            for(;object_idx<this.objects.length;object_idx++) {
                var o:A4Object = this.objects[object_idx];
                if (o.burrowed) continue;
                if ((o.y + o.getPixelHeight()) < (row-1)*this.tileHeight) continue;
                if ((o.y + o.getPixelHeight()) > (row+1)*this.tileHeight) break;
                var tx:number = Math.floor(o.x/this.tileWidth);
                var ty:number = Math.floor(o.y/this.tileHeight);
                var draw:boolean = false;
                for(let i:number = 0;i<Math.floor(o.getPixelHeight()/this.tileHeight) && !draw;i++) {
                    for(let j:number = 0;j<Math.floor(o.getPixelWidth()/this.tileWidth) && !draw;j++) {
                        if (tx+j>=0 && tx+j<this.width &&
                            ty+i>=0 && ty+i<this.height) {
                            draw = true;
                        }
                    }
                }
                if (draw) o.draw(-offsetx,-offsety, game);
            }    
        }
        ctx.restore();
    }
*/

    drawRegion(offsetx:number, offsety:number, zoom:number, SCREEN_X:number, SCREEN_Y:number, visibilityRegion:number, game:A4Game)
    {
        this.sortObjectByYCoordinate();

        ctx.save();
        ctx.scale(zoom, zoom);

        var object_idx:number = 0;
        var y:number = -offsety;
        var ZSY:number = Math.floor(SCREEN_Y/zoom) + SHRDLUMAP_MAX_ALTITUDE*8;
        for(let row:number = 0;row<this.layers[0].height+SHRDLUMAP_MAX_ALTITUDE && y<ZSY;y+=this.tileHeight, row++) {
            if (y+this.tileHeight<0) continue;
//            console.log("drawRegion: " + row + " -> " + y);
//            if (row<8) {
                for(let i:number = 0;i<this.layers.length;i++) {
                    this.layers[i].drawRegionRow(offsetx, offsety, row, zoom, SCREEN_X, SCREEN_Y, this.visibilityRegions, visibilityRegion, game, this);
                }
//            }

            // objects:
            var xx:number;
            var yy:number;
            var offset:number;
            for(;object_idx<this.objects.length;object_idx++) {
                var o:A4Object = this.objects[object_idx];
                if (o.burrowed) continue;
                if ((o.y + o.getPixelHeight()) < (row-1)*this.tileHeight) continue;
                if ((o.y + o.getPixelHeight()) > (row+1)*this.tileHeight) break;
                //console.log("drawRegion(object): " + y + " vs " + (o.y + o.getPixelHeight()));
//                var tx:number = Math.floor(o.x/this.tileWidth);
//                var ty:number = Math.floor(o.y/this.tileHeight);
                var tx:number = Math.floor(o.x/this.tileWidth);
                var ty:number = Math.floor((o.y + o.tallness)/this.tileHeight);

                var draw:boolean = false;
                var dark:boolean = true;
                for(let i:number = 0;i<Math.floor((o.getPixelHeight()-o.tallness)/this.tileHeight) && !draw;i++) {
                    for(let j:number = 0;j<Math.floor(o.getPixelWidth()/this.tileWidth) && !draw;j++) {
                        xx = tx+j;
                        yy = ty+i;
                        offset = xx + yy*this.width;
                        if (xx>=0 && xx<this.width &&
                            yy>=0 && yy<this.height) {
                            if (this.visibilityRegions[offset] == visibilityRegion) {
                                draw = true;
                                if (this.lightOnStatus[offset] == 1) dark = false;
                            } else if (this.visibilityRegions[offset]==0 &&
                                       ((xx>0 && this.visibilityRegions[offset-1]==visibilityRegion) ||
                                        (xx<this.width-1 && this.visibilityRegions[offset+1]==visibilityRegion) ||
                                        (yy>0 && this.visibilityRegions[offset-this.width]==visibilityRegion) ||
                                        (yy<this.height-1 && this.visibilityRegions[offset+this.width]==visibilityRegion) ||
                                        
                                        (xx>0 && yy>0 && this.visibilityRegions[offset-(1+this.width)]==visibilityRegion) ||
                                        (xx>0 && yy<this.height-1 && this.visibilityRegions[offset+this.width-1]==visibilityRegion) ||
                                        (xx<this.width-1 && yy>0 && this.visibilityRegions[offset+1-this.width]==visibilityRegion) ||
                                        (xx<this.width-1 && yy<this.height-1 && this.visibilityRegions[offset+1+this.width]==visibilityRegion)
                                       )) {
                                draw = true;
                                if (this.lightOnStatus[offset] == 1) dark = false;
                            }
                        }
                    }
                }
                if (draw) {
                    if (dark) {
                        o.drawDark(-offsetx, -offsety, game);
                    } else {
                        o.draw(-offsetx, -offsety, game);
                    }
                }
            }    
        }
        ctx.restore();
    }


    drawTextBubbles(offsetx:number, offsety:number, zoom:number, SCREEN_X:number, SCREEN_Y:number, game:A4Game)
    {
        ctx.save();
        ctx.scale(zoom, zoom);

        for(let o of this.objects) {
            if (o.burrowed) continue;
            if (!o.isCharacter()) continue;
            var tx:number = Math.floor(o.x/this.tileWidth);
            var ty:number = Math.floor(o.y/this.tileHeight);
            var draw:boolean = false;
            for(let i:number = 0;i<Math.floor(o.getPixelHeight()/this.tileHeight) && !draw;i++) {
                for(let j:number = 0;j<Math.floor(o.getPixelWidth()/this.tileWidth) && !draw;j++) {
                    if (tx+j>=0 && tx+j<this.width &&
                        ty+i>=0 && ty+i<this.height) {
                        draw = true;
                    }
                }
            }
            if (draw && game.drawTextBubbles) (<A4Character>o).drawTextBubbles(-offsetx,-offsety, SCREEN_X/zoom, SCREEN_Y/zoom, game);
        }

        var y:number = 0;
        for(let sb of this.textBubbles) {
            sb[0].drawNoArrow(Math.floor(SCREEN_X/zoom/2) - (sb[0].width)/2, y, false, 1);
            y += sb[0].height;
        }

        ctx.restore();        
    }


    drawTextBubblesRegion(offsetx:number, offsety:number, zoom:number, SCREEN_X:number, SCREEN_Y:number, visibilityRegion:number, game:A4Game)
    {
        ctx.save();
        ctx.scale(zoom, zoom);
        
        var xx:number;
        var yy:number;
        var offset:number;
        for(let o of this.objects) {
            if (o.burrowed) continue;
            if (!o.isCharacter()) continue;
            var tx:number = Math.floor(o.x/this.tileWidth);
            var ty:number = Math.floor(o.y/this.tileHeight);
            var draw:boolean = false;
            for(let i:number = 0;i<Math.floor(o.getPixelHeight()/this.tileHeight) && !draw;i++) {
                for(let j:number = 0;j<Math.floor(o.getPixelWidth()/this.tileWidth) && !draw;j++) {
                    xx = tx+j;
                    yy = ty+i;
                    offset = xx + yy*this.width;
                    if (xx>=0 && xx<this.width &&
                        yy>=0 && yy<this.height) {
                        if (this.visibilityRegions[offset]==visibilityRegion) {
                            draw = true;
                        } else if (this.visibilityRegions[offset]==0 &&
                                   ((xx>0 && this.visibilityRegions[offset-1]==visibilityRegion) ||
                                    (xx<this.width-1 && this.visibilityRegions[offset+1]==visibilityRegion) ||
                                    (yy>0 && this.visibilityRegions[offset-this.width]==visibilityRegion) ||
                                    (yy<this.height-1 && this.visibilityRegions[offset+this.width]==visibilityRegion) ||
                                    
                                    (xx>0 && yy>0 && this.visibilityRegions[offset-(1+this.width)]==visibilityRegion) ||
                                    (xx>0 && yy<this.height-1 && this.visibilityRegions[offset+this.width-1]==visibilityRegion) ||
                                    (xx<this.width-1 && yy>0 && this.visibilityRegions[offset+1-this.width]==visibilityRegion) ||
                                    (xx<this.width-1 && yy<this.height-1 && this.visibilityRegions[offset+1+this.width]==visibilityRegion)
                                   )) {
                            draw = true;
                        }
                    }
                }
            }
            if (draw && game.drawTextBubbles) (<A4Character>o).drawTextBubbles(-offsetx,-offsety, SCREEN_X/zoom, SCREEN_Y/zoom, game);
        }      

        var y:number = 0;
        for(let sb of this.textBubbles) {
            sb[0].drawNoArrow(Math.floor(SCREEN_X/zoom/2) - (sb[0].width)/2, y, false, 1);
            y += sb[0].height;
        }

        ctx.restore();        
    }


    getNeighborMaps() : A4Map[]
    {
        var l:A4Map[] = [];

        for(let mb of this.bridges) {
            if (mb.linkedTo != null) {
                if (l.indexOf(mb.linkedTo.map)==-1) {
                    l.push(mb.linkedTo.map);
                }
            }
        }

        return l;
    }


    executeScriptQueues(game:A4Game)
    {
        var toDelete:A4ScriptExecutionQueue[] = [];
        for(let seb of this.scriptQueues) {
            while(true) {
                var s:A4Script = seb.scripts[0];
                var retval:number = s.execute(seb.object,
                                              (seb.map == null ? this:seb.map),
                                              (seb.game == null ? game:seb.game),
                                              seb.otherCharacter);
                if (retval==SCRIPT_FINISHED) {
                    seb.scripts.splice(0,1);
                    if (seb.scripts.length == 0) {
                        toDelete.push(seb);
                        break;
                    }
                } else if (retval==SCRIPT_NOT_FINISHED) {
                    break;
                } else if (retval==SCRIPT_FAILED) {
                    toDelete.push(seb);
                    break;
                }
            }
        }
        for(let seb of toDelete) {
            var idx:number = this.scriptQueues.indexOf(seb);
            this.scriptQueues.splice(idx, 1);
        }
    }


    addScriptQueue(seq: A4ScriptExecutionQueue) {
        this.scriptQueues.push(seq);
    }


    setStoryStateVariable(variable:string, value:string, game:A4Game)
    {
        this.storyState[variable] = value;
        this.lastTimeStoryStateChanged = game.cycle;
    }


    getStoryStateVariable(variable:string) : string
    {
        return this.storyState[variable];
    }


	removeObject(o:A4Object)
    {
        /*
        if (o.layer >= 0 && o.layer < A4_N_LAYERS) {
            this.layers[o.layer].removeObject(o);
        }
        */
        var idx:number = this.objects.indexOf(o);
        if (idx>=0) this.objects.splice(idx, 1);        
    }

/*
	removeObjectFromLayer(o:A4Object, layer:number)
    {
        this.layers[layer].removeObject(o);
    }
*/

/*
    void removePerceptionBuffersForObject(A4Object *o, bool actions, bool warps);
*/

	addObject(o:A4Object)//, layer:number)
    {
//        this.layers[layer].addObject(o);
        this.objects.push(o);
//        o.layer = layer;
        o.map = this;
    }


    contains(o:A4Object) : boolean
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            if (this.layers[i].contains(o)) return true;
        }
        */
        if (this.objects.indexOf(o)!=-1) return true;        
        return false;
    }


    // This function returns a list with the hierarchy of objects necessary to find the desired object
    // For example, if an object is directly in a map, the list with be length 1, but if 
    // the obeject is in the inventory of a character, then we will get a list with the character and then the object 
    findObjectByName(name:string) : A4Object[]
    {
        for(let o of this.objects) {
            if (o.name == name) return [o];
            var o2:A4Object[] = o.findObjectByName(name);
            if (o2!=null) return [o].concat(o2);
        }
        return null;
    }


    // This function returns a list with the hierarchy of objects necessary to find the desired object
    // For example, if an object is directly in a map, the list with be length 1, but if 
    // the obeject is in the inventory of a character, then we will get a list with the character and then the object 
    findObjectByID(ID:string) : A4Object[]
    {
        for(let o of this.objects) {
            if (o.ID == ID) return [o];
            var o2:A4Object[] = o.findObjectByID(ID);
            if (o2!=null) return [o].concat(o2);
        }
        return null;
    }    


    objectRemoved(o:A4Object)
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].objectRemoved(o);
        }
        */
        for(let o2 of this.objects) {
            o2.objectRemoved(o);
        }        
    }


    checkIfDoorGroupStateCanBeChanged(doorGroup:string, state:boolean, character:A4Character, map:A4Map, game:A4Game)
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            if (!this.layers[i].checkIfDoorGroupStateCanBeChanged(doorGroup, state, character, map, game)) return false;
        }
        return true;
        */
        for(let o of this.objects) {
            if (o.isDoor()) {
                var d:A4Door = <A4Door>o;
                if (d.doorGroupID == doorGroup) {
                    if (!d.checkForBlockages(state, character, map, game, [])) return false;
                }
            }
        }
        return true;        
    }


    setDoorGroupState(doorGroup:string, state:boolean, character:A4Character, map:A4Map, game:A4Game)
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].setDoorGroupState(doorGroup, state, character, map, game);
        }
        */
        for(let o of this.objects) {
            if (o.isDoor()) {
                var d:A4Door = <A4Door>o;
                if (d.doorGroupID == doorGroup) {
                    d.changeStateRecursively(state, character, map, game);
                }
            }
        }        
    }


    getTileWidth() : number
    {
        return this.layers[0].tileWidth;
    }


    getTileHeight() : number
    {
        return this.layers[0].tileHeight;
    }


    addPerceptionBufferRecord(pbr:PerceptionBufferRecord) 
    {
        pbr.time = this.cycle;
        this.perceptionBuffer.push(pbr);
    }


    addPerceptionBufferObjectWarpedRecord(pbr:PerceptionBufferObjectWarpedRecord) 
    {
        pbr.time = this.cycle;
        this.warpPerceptionBuffer.push(pbr);
    }


    walkableOnlyBackground(x:number, y:number, dx:number, dy:number, subject:A4Object) : boolean
    {
        for(let i:number = 0;i<this.layers.length;i++) {
            if (!this.layers[i].walkableOnlyBackground(x,y,dx,dy, subject)) return false;
        }        
        return true;        
    }


    walkableOnlyObjects(x:number, y:number, dx:number, dy:number, subject:A4Object) : boolean
    {
        for(let o of this.objects) {
            if (o!=subject) {
                if (subject.isCharacter() && o.isVehicle()) {
                    // characters can always walk onto empty vehicles:
                    if ((<A4Vehicle>o).isEmpty()) continue;
                }
                if (!o.isWalkable()) {
                    if (o.collision(x,y,dx,dy)) return false;
                }
            }
        }

        return true;
    }


    walkableOnlyObjectsIgnoringObject(x:number, y:number, dx:number, dy:number, subject:A4Object, toIgnore:A4Object) : boolean
    {
        for(let o of this.objects) {
            if (o == toIgnore) continue;
            if (o != subject) {
                if (subject.isCharacter() && o.isVehicle()) {
                    // characters can always walk onto empty vehicles:
                    if ((<A4Vehicle>o).isEmpty()) continue;
                }
                if (!o.isWalkable()) {
                    if (o.collision(x,y,dx,dy)) return false;
                }
            }
        }

        return true;
    }


    walkable(x:number, y:number, dx:number, dy:number, subject:A4Object) : boolean
    {
        if (!this.walkableOnlyBackground(x, y, dx, dy, subject)) return false;
        return this.walkableOnlyObjects(x, y, dx, dy, subject);
    }


    walkableIgnoringObject(x:number, y:number, dx:number, dy:number, subject:A4Object, toIgnore:A4Object) : boolean
    {
        if (!this.walkableOnlyBackground(x,y,dx,dy,subject)) return false;
        return this.walkableOnlyObjectsIgnoringObject(x,y, dx, dy, subject, toIgnore);
    }    

    /*
	walkable(x:number, y:number, dx:number, dy:number, subject:A4Object) : boolean
    {
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            if (!this.layers[i].walkable(x,y,dx,dy, subject)) return false;
        }        
        return true;        
    }
    */

    walkableConsideringVehicles(x:number, y:number, dx:number, dy:number, subject:A4Object) : boolean
    {
        var granularityX:number = this.layers[0].tileWidth;
        var granularityY:number = this.layers[0].tileHeight;
        var rettiles:boolean = true;
        var retobjects:boolean = true;
        for(let i:number = 0;i<this.layers.length;i++) {
            if (rettiles && !this.layers[i].walkableOnlyBackground(x,y,dx,dy, subject)) rettiles = false;
//            if (retobjects && !this.layers[i].walkableOnlyObjects(x,y,dx,dy, subject)) retobjects = false;
        }
        if (retobjects && !this.walkableOnlyObjects(x,y,dx,dy, subject)) retobjects = false;

        // if there is a vehicle, characters can always walk on them (unless there is a collision with an object):
        if (!rettiles && retobjects && subject.isCharacter()) {
            var buffer:A4Object[] = this.getAllObjects(x, y, dx, dy);
            for(let o of buffer) {
                if (o!=subject && o.isVehicle() && (<A4Vehicle>o).isEmpty()) {
                    // see if the vehicle covers all the area that was not walkable:
                    for(let xoff:number = 0;xoff<dx;xoff+=granularityX) {
                        for(let yoff:number = 0;yoff<dy;yoff+=granularityY) {
                            if (!this.walkable(x+xoff,y+yoff,1,1,subject)) {
                                if (!o.collision(x+xoff, y+yoff, 1, 1)) {
                                    return false;
                                }
                            }
                        }
                    }
                    return true;
                }
            }
        }
//        console.log(x+","+y+" with "+dx+","+dy+": " + rettiles + " - " + retobjects);
        return rettiles && retobjects;        
    }


    getBridge(x:number, y:number) : A4MapBridge
    {
        for(let b of this.bridges) {
    //        output_debug_message("A4Map::getBridge: comparing %i,%i to %i,%i-%i,%i\n",x,y,b->m_x,b->m_y,b->m_dx,b->m_dy);
            if (b.x<=x && b.x+b.width>x &&
                b.y<=y && b.y+b.height>y) {
                return b;
            }
        }
        return null;
    }


	getTakeableObject(x:number, y:number, dx:number, dy:number) : A4Object
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            var o:A4Object = this.layers[i].getTakeableObject(x,y,dx,dy);
            if (o!=null) return o;
        }
        return null;
        */
        for(let o of this.objects) {
            if (o.takeable && !o.burrowed && o.collision(x,y,dx,dy)) return o;
        }
        return null;
    }


    getBurrowedObject(x:number, y:number, dx:number, dy:number) : A4Object
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            var o:A4Object = this.layers[i].getBurrowedObject(x,y,dx,dy);
            if (o!=null) return o;
        }
        return null;
        */
        for(let o of this.objects) {
            if (o.burrowed && o.collision(x,y,dx,dy)) return o;
        }
        return null;
    }


	getUsableObject(x:number, y:number, dx:number, dy:number) : A4Object
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            var o:A4Object = this.layers[i].getUsableObject(x,y,dx,dy);
            if (o!=null) return o;
        }
        return null;
        */
        for(let o of this.objects) {
            if (o.usable && !o.burrowed && o.collision(x,y,dx,dy)) return o;
        }
        return null;
    }


    getVehicleObject(x:number, y:number, dx:number, dy:number) : A4Object
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            var o:A4Object = this.layers[i].getVehicleObject(x,y,dx,dy);
            if (o!=null) return o;
        }
        return null;
        */
        for(let o of this.objects) {
            if (o.isVehicle() && o.collision(x,y,dx,dy)) return o;
        }
        return null;
    }


    getAllObjectCollisions(o:A4Object) : A4Object[]
    {
        return this.getAllObjectCollisionsWithOffset(o, 0, 0);
    }


    getAllObjectCollisionsWithOffset(o:A4Object, xoffs:number, yoffs:number) : A4Object[]
    {
        var l:A4Object[] = [];
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].getAllObjectCollisionsWithOffset(o, xoffs, yoffs, l);
        }
        return l;
        */
        for(let o2 of this.objects) {
            if (o2!=o && o.collisionObjectOffset(xoffs, yoffs, o2)) l.push(o2);
        }
        return l;
    }


    getAllObjects(x:number, y:number, dx:number, dy:number) : A4Object[]
    {
        var l:A4Object[] = [];
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].getAllObjects(x, y, dx, dy, l);
        }
        */
        for(let o of this.objects) {
            if (o.collision(x,y,dx,dy)) l.push(o);
        }                
        return l;
    }


    getAllObjectsInRegion(x:number, y:number, dx:number, dy:number, region:number) : A4Object[]
    {
        var l:A4Object[] = [];
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].getAllObjectsInRegion(x, y, dx, dy, this, region, l);
        }
        */
        for(let o of this.objects) {
            if (o.collision(x,y,dx,dy)) {
                var tx:number = Math.floor(o.x/this.tileWidth);
                var ty:number = Math.floor((o.y+o.tallness)/this.tileHeight);
                var region2:number = this.visibilityRegion(tx,ty);
                if (region == region2) l.push(o);
            }
        }        
        return l;
    }


    getAllObjectsInRegionPlusDoors(x:number, y:number, dx:number, dy:number, region:number) : A4Object[]
    {
        var l:A4Object[] = [];
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].getAllObjectsInRegion(x, y, dx, dy, this, region, l);
        }
        */
        for(let o of this.objects) {
            if (o.collision(x,y,dx,dy)) {
                var tx:number = Math.floor(o.x/this.tileWidth);
                var ty:number = Math.floor((o.y+o.tallness)/this.tileHeight);
                var region2:number = this.visibilityRegion(tx,ty);
                if (region == region2 || o instanceof A4Door) l.push(o);
            }
        }        
        return l;
    }


    chopTree(o:A4Character, tool:A4Object, game:A4Game, direction:number) : boolean
    {
        var x:number = o.x + direction_x_inc[direction];
        var y:number = o.y + direction_y_inc[direction];
        var dx:number = o.getPixelWidth();
        var dy:number = o.getPixelHeight();
        for(let i:number = 0;i<this.layers.length;i++) {
            if (this.layers[i].chopTree(x,y,dx,dy)) {
                tool.event(A4_EVENT_USE, o, this, game);
                return true;
            }
        }
        return false;
    }


/*
    spellCollision(spell:A4Object, caster:A4Object) : boolean
    {
        for(let i:number = 0;i<this.layers.length;i++) {
            if (this.layers[i].spellCollision(spell, caster)) return true;
        }
        return false;
    }


    spellCollisionArea(x:number, y:number, w:number, h:number, caster:A4Object) : boolean
    {
        for(let i:number = 0;i<this.layers.length;i++) {
            if (this.layers[i].spellCollisionArea(x,y,w,h, caster)) return true;
        }
        return false;
    }
    */
    

/*
    getObject(ID:number) : A4Object
    {
        for(let o2 of this.objects) {
            if (o2.ID == ID) return o2;
        }        
        return null;
    }
*/

    triggerObjectsEvent(event:number, otherCharacter:A4Character, map:A4Map, game:A4Game)
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].triggerObjectsEvent(event,otherCharacter,map,game);
        }
        */
        for(let o of this.objects) {
            o.event(event,otherCharacter,map,game);
        }
    }


    triggerObjectsEventWithID(event:number, ID:string, otherCharacter:A4Character, map:A4Map, game:A4Game)
    {
        /*
        for(let i:number = 0;i<A4_N_LAYERS;i++) {
            this.layers[i].triggerObjectsEventWithID(event,ID,otherCharacter,map,game);
        }
        */
        for(let o of this.objects) {
            o.eventWithID(event,ID,otherCharacter,map,game);
        }
    }


    reevaluateVisibilityRequest()
    {
        this.visibilityReevaluationRequested = true;
    }


	reevaluateVisibility()
    {
        var x:number;
        var y:number;
        var nextRegion:number = 1;
        var inOpen:boolean[] = new Array(this.width * this.height);
        for(let i:number = 0;i<this.width * this.height;i++) {
            this.visibilityRegions[i] = 0;
            inOpen[i] = false;
        }

        for(let start_y:number = 0;start_y<this.height;start_y++) {
            for(let start_x:number = 0;start_x<this.width;start_x++) {
                if (this.visibilityRegions[start_x+start_y*this.width]==0 && this.seeThrough(start_x, start_y)) {
                    var stack:number[] = [];
                    stack.push(start_x+start_y*this.width);
                    inOpen[start_x+start_y*this.width] = true;
                    
                    while(stack.length>0) {
                        var tmp:number = stack[0];
                        stack.splice(0,1);
                        x = tmp%this.width;
                        y = Math.floor(tmp/this.width);
                        
                        if (this.seeThrough(x,y)) {
                            this.visibilityRegions[tmp] = nextRegion;
                            if (x>0 && this.visibilityRegions[x+y*this.width-1]==0 && !inOpen[x+y*this.width-1]) {
                                stack.push(x+y*this.width-1);
                                inOpen[x+y*this.width-1] = true;
                            }
                            if (y>0 && this.visibilityRegions[x+(y-1)*this.width]==0 && !inOpen[x+(y-1)*this.width]) {
                                stack.push(x+(y-1)*this.width);
                                inOpen[x+(y-1)*this.width] = true;
                            }
                            if (x<(this.width-1) && this.visibilityRegions[x+y*this.width+1]==0 && !inOpen[x+y*this.width+1]) {
                                stack.push(x+y*this.width+1);
                                inOpen[x+y*this.width+1] = true;
                            }
                            if (y<(this.height-1) && this.visibilityRegions[x+(y+1)*this.width]==0 && !inOpen[x+(y+1)*this.width]) {
                                stack.push(x+(y+1)*this.width);
                                inOpen[x+(y+1)*this.width] = true;
                            }
                            if (x>0 && y>0 && this.visibilityRegions[x+(y-1)*this.width-1]==0 && !inOpen[x+(y-1)*this.width-1]) {
                                stack.push(x+(y-1)*this.width-1);
                                inOpen[x+(y-1)*this.width-1] = true;
                            }
                            if (x<(this.width-1) && y>0 && this.visibilityRegions[x+(y-1)*this.width+1]==0 && !inOpen[x+(y-1)*this.width+1]) {
                                stack.push(x+(y-1)*this.width+1);
                                inOpen[x+(y-1)*this.width+1] = true;
                            }
                            if (x>0 && y<(this.height-1) && this.visibilityRegions[x+(y+1)*this.width-1]==0 && !inOpen[x+(y+1)*this.width-1]) {
                                stack.push(x+(y+1)*this.width-1);
                                inOpen[x+(y+1)*this.width-1] = true;
                            }
                            if (x<(this.width-1) && y<(this.height-1) && this.visibilityRegions[x+(y+1)*this.width+1]==0 && !inOpen[x+(y+1)*this.width+1]) {
                                stack.push(x+(y+1)*this.width+1);
                                inOpen[x+(y+1)*this.width+1] = true;
                            }
                        }
                    }
                    nextRegion++;
                }
            }
        }
        //console.log("ReevaluateVisibility called!");
        //console.log("Regions: " + this.visibilityRegions);

        this.visibilityReevaluationRequested = false;
    }


    // coordinates for these functions are in tiles:
	seeThrough(tilex:number, tiley:number) : boolean
    {
        for(let i:number = 0;i<this.layers.length;i++) {
            if (!this.layers[i].seeThrough(tilex,tiley)) return false;
        }

        for(let o of this.objects) {
            if (o.x<=tilex*this.tileWidth && o.x+o.getPixelWidth()>=(tilex+1)*this.tileWidth &&
                o.y+o.tallness<=tiley*this.tileHeight && o.y+o.getPixelHeight()>=(tiley+1)*this.tileHeight) {
                if (!o.seeThrough()) return false;
            }
        }

        return true;
    }


	visible(tilex:number, tiley:number, region:number) : boolean
    {
        return this.visibilityRegions[tilex + tiley*this.width] == region;
    }


    visibilityRegion(tilex:number, tiley:number) : number
    {
        return this.visibilityRegions[tilex + tiley*this.width];
    }


    recalculateLightsOnStatus(roomsWithLights:string[], roomsWithLightsOn:string[], regionNames:string[])
    {
        for(let i:number = 0;i<regionNames.length;i++) {
            if (roomsWithLights.indexOf(regionNames[i]) == -1) {
                this.lightOnStatus[i] = 1;    // by default, lights are on!
            } else {
                if (roomsWithLightsOn.lastIndexOf(regionNames[i]) == -1) {
                    this.lightOnStatus[i] = 0;
                } else {
                    this.lightOnStatus[i] = 1;
                }
            }
        }
    }


    // this function assumes they are already almost sorted, and thus uses simple shuffle sort:
    sortObjectByYCoordinate()
    {
//        var anychange:boolean = false;
        var change:boolean = true;
        var tmp:A4Object = null;

        while(change) {
            change = false;
            // going up:
            for(let i:number = 0;i<this.objects.length-1;i++) {
                var yi1:number = this.objects[i].y   + this.objects[i].getPixelHeight();
                var yi2:number = this.objects[i+1].y   + this.objects[i+1].getPixelHeight();
                if (yi1 > yi2 ||
                    // A4Characters have preference over other objects:
                    (yi1 == yi2 &&
                     this.objects[i] instanceof A4Character &&
                     !(this.objects[i+1] instanceof A4Character))) {
                    tmp = this.objects[i];
                    this.objects[i] = this.objects[i+1];
                    this.objects[i+1] = tmp;
                    change = true;
                }
            }
            // going down:
            if (change) {
//                anychange = true;
                change = false;
                for(let i:number = this.objects.length-2;i>=0;i--) {
                    var yi1:number = this.objects[i].y   + this.objects[i].getPixelHeight();
                    var yi2:number = this.objects[i+1].y   + this.objects[i+1].getPixelHeight();
                    if (yi1 > yi2 ||
                        // A4Characters have preference over other objects:
                        (yi1 == yi2 &&
                         this.objects[i] instanceof A4Character &&
                         !(this.objects[i+1] instanceof A4Character))) {
                        tmp = this.objects[i];
                        this.objects[i] = this.objects[i+1];
                        this.objects[i+1] = tmp;
                        change = true;
                    }
                }
            }
        }
/*
        if (anychange) 
        {
            var heights:string[] = [];
            for(let i:number = 0;i<this.objects.length;i++) {
                heights.push("("+this.objects[i].name+this.objects[i].y+"+"+this.objects[i].getPixelHeight()+")");
            }
            console.log("sorted: " + heights);
        }
*/
    }


    xml:Element = null;
    name:string = null;
    width:number;
    height:number;
    tileWidth:number = 16;
    tileHeight:number = 16;

    layers:A4MapLayer[] = [];
    bridges:A4MapBridge[] = [];
    bridgeDestinations:A4MapBridge[] = [];
    objects:A4Object[] = [];

    cycle:number = 0;

    visibilityReevaluationRequested:boolean = true;
    visibilityRegions:number[] = null;
    lightOnStatus:number[] = null;

    textBubbles:[A4TextBubble,number][] = [];    // the second number is the timer

    // scripts:
	eventScripts:A4EventRule[][] = new Array(A4_NEVENTS);

    // script excution queues (these contain scripts that are pending execution, will be executed in the next "cycle"):
    scriptQueues: A4ScriptExecutionQueue[] = [];

    // story state:
    storyState:{ [id: string] : string; } = {};
    lastTimeStoryStateChanged:number = 0;

    // perception buffers:
    perceptionBuffer:PerceptionBufferRecord[] = [];
    warpPerceptionBuffer:PerceptionBufferObjectWarpedRecord[] = [];
}
