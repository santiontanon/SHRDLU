var SHRDLU_INVENTORY_DISPLAY_SIZE:number = 12;
var SHRDLU_HUD_STATE_MESSAGES:number = 0;
var SHRDLU_HUD_STATE_MESSAGES_INPUT:number = 1;
var SHRDLU_HUD_STATE_INVENTORY:number = 2;
var SHRDLU_HUD_STATE_SPLIT_INVENTORY:number = 3;

var SHRDLU_MAX_SPACESUIT_OXYGEN:number = 8*50*60;    // 8 minutes of game time
var COMMUNICATOR_CONNECTION_TIMEOUT:number = 50*60;    // 1 minute of game time

var SHRDLU_START_DATE:number = 45186163200;    // Thursday, October 21st, 2432
var SHRDLU_TILE_SIZE:number = 8;

var SPACE_NEAR_FAR_THRESHOLD:number = 12*SHRDLU_TILE_SIZE;


var A4_HASH_SIZE:number = 1000;

var A4_DIRECTION_NONE:number = -1;
var A4_DIRECTION_LEFT:number = 0;
var A4_DIRECTION_UP:number = 1;
var A4_DIRECTION_RIGHT:number = 2;
var A4_DIRECTION_DOWN:number = 3;
var A4_NDIRECTIONS:number = 4;

var A4_ANIMATION_IDLE:number = 0;
var A4_ANIMATION_IDLE_LEFT:number = 1;
var A4_ANIMATION_IDLE_UP:number = 2;
var A4_ANIMATION_IDLE_RIGHT:number = 3;
var A4_ANIMATION_IDLE_DOWN:number = 4;
var A4_ANIMATION_MOVING:number = 5;
var A4_ANIMATION_MOVING_LEFT:number = 6;
var A4_ANIMATION_MOVING_UP:number = 7;
var A4_ANIMATION_MOVING_RIGHT:number = 8;
var A4_ANIMATION_MOVING_DOWN:number = 9;
var A4_ANIMATION_INTERACTING:number = 10;
var A4_ANIMATION_INTERACTING_LEFT:number = 11;
var A4_ANIMATION_INTERACTING_UP:number = 12;
var A4_ANIMATION_INTERACTING_RIGHT:number = 13;
var A4_ANIMATION_INTERACTING_DOWN:number = 14;
var A4_ANIMATION_TALKING:number = 15;
var A4_ANIMATION_TALKING_LEFT:number = 16;
var A4_ANIMATION_TALKING_UP:number = 17;
var A4_ANIMATION_TALKING_RIGHT:number = 18;
var A4_ANIMATION_TALKING_DOWN:number = 19;
var A4_ANIMATION_DEATH:number = 32;
var A4_ANIMATION_DEATH_LEFT:number = 21;
var A4_ANIMATION_DEATH_UP:number = 22;
var A4_ANIMATION_DEATH_RIGHT:number = 23;
var A4_ANIMATION_DEATH_DOWN:number = 24;
var A4_ANIMATION_CLOSED:number = 25;
var A4_ANIMATION_IDLE_FULL:number = 26;
var A4_ANIMATION_CLOSED_FULL:number = 27;
var A4_N_ANIMATIONS:number = 28;

// aliases:
var A4_ANIMATION_OPEN:number = 0;
var A4_ANIMATION_IDLE_EMPTY:number = 0;
var A4_ANIMATION_OPEN_EMPTY:number = 0;
var A4_ANIMATION_OPEN_FULL:number = 36;
var A4_ANIMATION_CLOSED_EMPTY:number = 35;

//var A4_LAYER_BG:number = 0;
//var A4_LAYER_FG:number = 1;
//var A4_LAYER_CHARACTERS:number = 2;
var A4_N_LAYERS:number = 4;

var A4_TILE_WALKABLE:number = 0;
var A4_TILE_WALL:number = 1;
var A4_TILE_TREE:number = 2;
var A4_TILE_CHOPPABLE_TREE:number = 3;
var A4_TILE_WATER:number = 4;

//var A4_INVENTORY_SIZE:number = 8;
var A4_INVENTORY_SIZE:number = 256;    // some very large number

var A4_N_MESSAGES_IN_HUD:number = 5;
var A4_MAX_MESSAGE_LENGTH:number = 42;

var CYCLES_IN_PERCEPTION_BUFFER:number = 50;
var TEXT_INITIAL_DELAY:number = 60;
var TEXT_SPEED:number = 8;
var EYESOPEN_SPEED:number = 180;

var animationNames:string[] = [
    "idle",
    "idle-left",
    "idle-up",
    "idle-right",
    "idle-down",
    "moving",
    "moving-left",
    "moving-up",
    "moving-right",
    "moving-down",
    "interacting",
    "interacting-left",
    "interacting-up",
    "interacting-right",
    "interacting-down",
    "talking",
    "talking-left",
    "talking-up",
    "talking-right",
    "talking-down",
    "death",
    "death-left",
    "death-up",
    "death-right",
    "death-down",
    "closed",
    "full",
    "closed-full"
];


var direction_x_inc:number[] = [-1,0,1,0];
var direction_y_inc:number[] = [0,-1,0,1];


class WarpRequest {
    constructor(o:A4Object, map:A4Map, x:number, y:number) {//, layer:number) {
        this.o = o;
        this.map = map;
        this.x = x;
        this.y = y;
//        this.layer = layer;
    }

    o:A4Object;
    map:A4Map;
    x:number;
    y:number;
//    layer:number;
}


class A4Game {
    constructor(xml:Element, game_path:string, GLTM:GLTManager, SFXM:SFXManager, a_sfx_volume:number)
    {
        this.loadContentFromXML(xml, game_path, GLTM, SFXM);

//        console.log(xml.outerHTML);

        this.sfx_volume = a_sfx_volume;
    }


    loadContentFromXML(xml:Element, game_path:string, GLTM:GLTManager, SFXM:SFXManager)
    {
        A4Object.s_nextID = 10000;
        this.game_path = game_path;
        this.GLTM = GLTM;
        this.SFXM = SFXM;
        this.xml = xml;

        this.ontology = new Ontology();
        Sort.clear();
        let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
        xmlhttp.overrideMimeType("text/xml");
        xmlhttp.open("GET", "data/shrdluontology.xml", false); 
        xmlhttp.send();
        this.ontology.loadSortsFromXML(xmlhttp.responseXML.documentElement);

        this.gameName = xml.getAttribute("name");
        this.gameTitle = xml.getAttribute("title");
        this.gameSubtitle = xml.getAttribute("subtitle");

        console.log("game name: " + this.gameName);
        console.log("game title: " + this.gameTitle);
        console.log("game subtitle: " + this.gameSubtitle);

        let title_xml:Element = getFirstElementChildByTag(xml, "titleImage");
        if (title_xml!=null) {
            console.log("Title image:" + title_xml.firstChild.nodeValue);
            this.gameTitleImage = title_xml.firstChild.nodeValue;
        }

        let tmp:string = xml.getAttribute("allowSaveGames");
        if (tmp!=null) this.allowSaveGames = (tmp == "true");

        if (xml.getAttribute("cycle") != null) {
            this.cycle = Number(xml.getAttribute("cycle"));
        }

        let story_xml:Element = getFirstElementChildByTag(xml, "story");
        if (story_xml!=null) {
            let story_lines:Element[] = getElementChildrenByTag(story_xml,"line");
            this.storyText = [];
            for(let i:number = 0;i<story_lines.length;i++) {
                let line_xml:Element = story_lines[i];
                this.storyText.push(line_xml.firstChild.nodeValue);
            }
        }

        let ending_xmls:Element[] = getElementChildrenByTag(xml, "ending");
        for(let i:number = 0;i<ending_xmls.length;i++) {
            let ending_xml:Element = ending_xmls[i];
            let ID:string = ending_xml.getAttribute("id");
            if (ID == null) {
                console.log("Ending in game definition file does not specify an ID!");
                continue;
            }

            let ending_lines:Element[] = getElementChildrenByTag(ending_xml, "line");
            let endingText:string[] = [];
            for(let i:number = 0;i<ending_lines.length;i++) {
                let line_xml:Element = ending_lines[i];
                endingText.push(line_xml.firstChild.nodeValue);
            }

            this.addEnding(ID, endingText);
        }

        let tiles_xml:Element = getFirstElementChildByTag(xml, "tiles");
        
        let targetwidth:number = Number(tiles_xml.getAttribute("targetwidth"));
        this.tileWidth = Number(tiles_xml.getAttribute("sourcewidth"));
        this.tileHeight = Number(tiles_xml.getAttribute("sourceheight"));
        this.defaultZoom = targetwidth/this.tileWidth;
        this.zoom = this.targetZoom = this.defaultZoom;
        // In a first pass, we just trigger loading all the images (since browser games load them asynchronously)
        // later in finishLoadingGame, the rest of the game is loaded...
        for(let i:number = 0;i<tiles_xml.children.length;i++) {
            let c:Element = tiles_xml.children[i];
            let file:string = c.getAttribute("file");
            let gf:A4GraphicFile = this.getGraphicFile(file);
            if (gf == null) {
                gf = new A4GraphicFile(file, this.tileWidth, this.tileHeight, this.game_path, this.GLTM);
                this.graphicFiles.push(gf);
            }
        }

        this.rooms_with_lights = ["location-as4",    // bedroom 1
                                  "location-as5",
                                  "location-as6",
                                  "location-as7",
                                  "location-as8",
                                  "location-as9",
                                  "location-as10",
                                  "location-as11",
                                  "location-as12",
                                  "location-as13",
                                  "location-as14",
                                  "location-as15",    // bedroom 12
                                  "location-as16",    // mess hall
                                  "location-as17",
                                  "location-as18",
                                  "location-as19",
                                  "location-as20",
                                  "location-as21",
                                  "location-as22",
                                  "location-as23",
                                  "location-as24",
                                  "location-as25",
                                  "location-as26",
                                  "location-as27",
                                  "location-maintenance",
                                  "location-as29",
                                  "location-garage",
                                  "location-west-cave-dark",
                                  "location-east-cave-dark",
                                  "tardis8-bridge", 
                                  "tardis8-computer",
                                  "tardis8-corridor-east",
                                  "tardis8-corridor-west",
                                  "tardis8-stasis1",
                                  "tardis8-stasis2",
                                  "tardis8-engineering",
                                  ];

        this.rooms_with_lights_on = ["location-as4",    // bedroom 1
                                  "location-as5",
                                  "location-as6",
                                  "location-as7",
                                  "location-as8",
                                  "location-as9",
                                  "location-as10",
                                  "location-as11",
                                  "location-as12",
                                  "location-as13",
                                  "location-as14",
                                  "location-as15",    // bedroom 12
                                  "location-as16",    // mess hall
                                  "location-as17",
                                  "location-as18",
                                  "location-as19",
                                  "location-as20",
                                  "location-as21",
                                  //"location-as22",    // we start with all the storage rooms with the lights off
                                  //"location-as23",
                                  //"location-as24",
                                  "location-as25",
                                  "location-as26",
                                  "location-as27",
                                  //"location-maintenance",
                                  "location-as29",
                                  "location-garage",
                                  ];

        this.three_d_printer_recipies = [["plastic-cup", ["plastic"]],
                                         ["plastic-plate", ["plastic"]],
                                         ["plastic-fork", ["plastic"]],
                                         ["plastic-spoon", ["plastic"]],
                                         ["plastic-knife", ["plastic"]],
                                         ["plastic-chopstick", ["plastic"]],
                                         ["screwdriver", ["plastic", "iron"]],
                                         ["pliers", ["plastic", "iron"]],
                                         ["wrench", ["plastic", "iron"]],
                                         ["cable", ["plastic", "copper"]],
                                         ["extension-cord", ["plastic", "copper"]],
                                        ];
    }


    imagesLoaded():boolean
    {
        for(let gf of this.graphicFiles) {
            if (gf.img.width == 0) return false;
        }

        return true;
    }


    // if "saveGameXml" is != null, this is a call to restore from a save state
    finishLoadingGame(saveGameXml:Element, app:A4EngineApp)
    {
        let tiles_xml:Element = getFirstElementChildByTag(this.xml, "tiles");
        for(let idx:number = 0;idx<tiles_xml.children.length;idx++) {
            let c:Element = tiles_xml.children[idx];
            let file:string = c.getAttribute("file");
            let gf:A4GraphicFile = this.getGraphicFile(file);
            if (gf.tiles == null) gf.updateAfterLoaded();

            if (c.tagName == "types") {
                let values:string[] = c.firstChild.nodeValue.split(new RegExp(",| |\n|\t|\r"));
                let j:number = 0;
                for(let i:number = 0;i<values.length;i++) {
                    if (values[i] != "") {
                        gf.tileTypes[j] = Number(values[i]);
                        j++;
                    }
                }
                console.log("Loaded " + j + " types for image " + gf.name);
            } else if (c.tagName == "seeThrough") {
                let values:string[] = c.firstChild.nodeValue.split(new RegExp(",| |\n|\t|\r"));
                let j:number = 0;
                for(let i:number = 0;i<values.length;i++) {
                    if (values[i] != "") {
                        gf.tileSeeThrough[j] = Number(values[i]);
                        j++;
                    }
                }
                console.log("Loaded " + j + " seeThroughs for image " + gf.name);
            } else if (c.tagName == "canDig") {
                let values:string[] = c.firstChild.nodeValue.split(new RegExp(",| |\n|\t|\r"));
                let j:number = 0;
                for(let i:number = 0;i<values.length;i++) {
                    if (values[i] != "") {
                        gf.tileCanDig[j] = Number(values[i]);
                        j++;
                    }
                }
                console.log("Loaded " + j + " canDigs for image " + gf.name);
            } else {
                console.log("undefined tag inside of the tile definition: " + c.tagName);
            }
        }

        // loading object types:
        {
            let files_xml:Element[] = getElementChildrenByTag(this.xml, "objectDefinition");
            for(let i:number = 0;i<files_xml.length;i++) {
                let file_xml:Element = files_xml[i];
                let objects_file:string = file_xml.getAttribute("file");
                this.objectDefinitionFiles.push(objects_file);

                console.log("Loading objects from file " + this.game_path + "/" + objects_file);
                let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
                xmlhttp.overrideMimeType("text/xml");
                xmlhttp.open("GET", this.game_path + "/" + objects_file, false); 
                xmlhttp.send();
                let obejcts_xml:Element = xmlhttp.responseXML.documentElement;
                this.objectFactory.addDefinitions(obejcts_xml, this, "ObjectClass");
            }
        }

        // loading character types:
        {
            let files_xml:Element[] = getElementChildrenByTag(this.xml, "characterDefinition");
            for(let i:number = 0;i<files_xml.length;i++) {
                let file_xml:Element = files_xml[i];
                let objects_file:string = file_xml.getAttribute("file");
                this.characterDefinitionFiles.push(objects_file);

                console.log("Loading characters from file " + this.game_path + "/" + objects_file);
                let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
                xmlhttp.overrideMimeType("text/xml");
                xmlhttp.open("GET", this.game_path + "/" + objects_file, false); 
                xmlhttp.send();
                let obejcts_xml:Element = xmlhttp.responseXML.documentElement;
                this.objectFactory.addDefinitions(obejcts_xml, this, "CharacterClass");
            }
        }
        
        // loading maps:
        let objectsToRevisit_xml:Element[] = [];
        let objectsToRevisit_object:A4Object[] = [];
        {
            if (saveGameXml != null) {
                let maps_xml:Element[] = getElementChildrenByTag(saveGameXml, "map");
                for(let i:number = 0;i<maps_xml.length;i++) {
                    let tmx:Element = maps_xml[i];
                    let map:A4Map = new A4Map(tmx, this, objectsToRevisit_xml, objectsToRevisit_object);
                    this.maps.push(map);
                }
            } else {
                let maps_xml:Element[] = getElementChildrenByTag(this.xml, "map");
                for(let i:number = 0;i<maps_xml.length;i++) {
                    let map_xml:Element = maps_xml[i];
                    let tmx_file:string = map_xml.getAttribute("file");

                    let tmx:Element = null;
                    console.log("loading A4Map from file... " + this.game_path + "/" + tmx_file);
                    let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
                    xmlhttp.overrideMimeType("text/xml");
                    xmlhttp.open("GET", this.game_path + "/" + tmx_file, false); 
                    xmlhttp.send();
                    tmx = xmlhttp.responseXML.documentElement;
                    let map:A4Map = new A4Map(tmx, this, objectsToRevisit_xml, objectsToRevisit_object);
                    this.maps.push(map);
                }
            }

            // link bridges/bridge destinations:
            for(let map1 of this.maps) {
                for(let map2 of this.maps) {
                    if (map1 != map2) {
                        for(let b of map1.bridges) {
                            for(let bd of map2.bridgeDestinations) {
                                if (b.name == bd.name) {
//                                    console.log("Map bridge " + b.name + " linked between " + map1.name + " and " + map2.name);
                                    b.link(bd);
                                }
                            }
                        }
                    }
                }
            }
        }

        // loading scripts:
        {
            // on start:
            let onstarts_xml:Element[] = getElementChildrenByTag(this.xml, "onStart");
            for(let i:number = 0;i<onstarts_xml.length;i++) {
                let onstart_xml:Element = onstarts_xml[i];
                let tmp:A4ScriptExecutionQueue = null;
//                let script_xml_l:NodeListOf<Element> = onstart_xml.children;
                let script_xml_l:HTMLCollection = onstart_xml.children;
                for(let j:number = 0;j<script_xml_l.length;j++) {
                    let script_xml:Element = script_xml_l[j];
                    let s:A4Script = A4Script.fromXML(script_xml);
                    if (tmp == null) tmp = new A4ScriptExecutionQueue(null, null, this, null);
                    tmp.scripts.push(s);
                }
                if (tmp!=null) this.scriptQueues.push(tmp);
            }        

            // event rules:
            let eventrules_xml:Element[] = getElementChildrenByTag(this.xml, "eventRule");
            for(let i:number = 0;i<eventrules_xml.length;i++) {
                let rule_xml:Element = eventrules_xml[i];
                let r:A4EventRule = A4EventRule.fromXML(rule_xml);
                if (this.eventScripts[r.event] == null) this.eventScripts[r.event] = [];
                this.eventScripts[r.event].push(r);
            }        
        }

        this.currentPlayer = null;

        // spawning player characters:
        {
            let players_xml:Element[] = getElementChildrenByTag(this.xml, "player");
            for(let i:number = 0;i<players_xml.length;i++) {
                let player_xml:Element = players_xml[i];
                let id:string = player_xml.getAttribute("id");
                let className:string = player_xml.getAttribute("class");
                if (className == null) className = player_xml.getAttribute("type");
                let x:number = Number(player_xml.getAttribute("x"));
                let y:number = Number(player_xml.getAttribute("y"));
                let mapIdx:number = Number(player_xml.getAttribute("map"));
                console.log("Spawning player "+className+" at "+x+","+y+" in map " + mapIdx);

                let completeRedefinition:boolean = false;
                if (player_xml.getAttribute("completeRedefinition") == "true") completeRedefinition = true;
                let p:A4Object = this.objectFactory.createObject(className, this, true, completeRedefinition);
                if (id != null) {
                    p.ID = id;
                    if (!isNaN(Number(id)) &&
                        Number(id) >= A4Object.s_nextID) A4Object.s_nextID = Number(id)+1;
                }
                p.loadObjectAdditionalContent(player_xml, this, this.objectFactory, objectsToRevisit_xml, objectsToRevisit_object);
                p.warp(x, y, this.maps[mapIdx]);//, A4_LAYER_CHARACTERS);
                this.players.push(<A4PlayerCharacter>p);
            }
        }

        // load messages:
        {
            let console_xml:Element = getFirstElementChildByTag(this.xml, "console");
            if (console_xml != null) {
                for(let message_xml of getElementChildrenByTag(console_xml, "message")) {
                    if (message_xml.getAttribute("timeStamp") != null) {
                        this.addMessageWithColorTime(message_xml.getAttribute("text"),
                                                     message_xml.getAttribute("color"),
                                                     Number(message_xml.getAttribute("timeStamp")));
                    } else {
                        this.addMessageWithColor(message_xml.getAttribute("text"),
                                                 message_xml.getAttribute("color"));
                    }
                }
            }
        }

        for(let i:number = 0;i<objectsToRevisit_xml.length;i++) {
            objectsToRevisit_object[i].revisitObject(objectsToRevisit_xml[i], this);
        }

        // load the location information
        let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
        xmlhttp.overrideMimeType("text/xml");
        xmlhttp.open("GET", "data/map-locations.xml", false); 
        xmlhttp.send();
        AILocation.loadLocationsFromXML(xmlhttp.responseXML.documentElement, this, this.ontology);

        // create the natural language parser:
        xmlhttp = new XMLHttpRequest();
        xmlhttp.overrideMimeType("text/xml");
        xmlhttp.open("GET", "data/nlpatternrules.xml", false); 
        xmlhttp.send();
        this.naturalLanguageParser = NLParser.fromXML(xmlhttp.responseXML.documentElement, this.ontology);
        this.naturalLanguageGenerator = new NLGenerator(this.ontology, this.naturalLanguageParser.posParser);

        // load the AIs:
        this.etaoinAI = new EtaoinAI(this.ontology, this.naturalLanguageParser, [], this, 
                                      ["data/general-kb.xml","data/etaoin-kb.xml"]);
        this.qwertyAI = new QwertyAI(this.ontology, this.naturalLanguageParser, <A4AICharacter>(this.findObjectByName("Qwerty")[0]), this, 
                                      ["data/general-kb.xml","data/qwerty-kb.xml"]);
        this.shrdluAI = new ShrdluAI(this.ontology, this.naturalLanguageParser, <A4AICharacter>(this.findObjectByName("Shrdlu")[0]), this, 
                                      ["data/general-kb.xml","data/shrdlu-kb.xml"]);
        if (saveGameXml) {
            let ais_xml:Element[] = getElementChildrenByTag(saveGameXml, "RuleBasedAI");
            this.etaoinAI.restoreFromXML(ais_xml[0]);
            this.qwertyAI.restoreFromXML(ais_xml[1]);
            this.shrdluAI.restoreFromXML(ais_xml[2]);
        }

        // set initial camera:
        if (this.players.length > 0) {
            this.currentPlayerIndex = 0;
            this.currentPlayer = this.players[this.currentPlayerIndex];
        }

        this.gameComplete = false;
        this.gameComplete_ending_ID = null;

        Sort.precomputeIsA();

        this.gameScript = new ShrdluGameScript(this, app);
        this.cutScenes = new ShrdluCutScenes(this, app);

        // preload the images:
        this.GLTM.get("data/cutscene-corpse1.png");
        this.GLTM.get("data/cutscene-diary1.png");
        this.GLTM.get("data/cutscene-poster1.png");
        this.GLTM.get("data/cutscene-death-oxygen.png");

        for(let variable_xml of getElementChildrenByTag(this.xml, "variable")) {
            let vname:string = variable_xml.getAttribute("name");
            if (vname == "textInputAllowed") this.textInputAllowed = variable_xml.getAttribute("value") == "true";
            if (vname == "eyesClosedState") this.eyesClosedState = Number(variable_xml.getAttribute("value"));
            if (vname == "eyesClosedTimer") this.eyesClosedTimer = Number(variable_xml.getAttribute("value"));
            if (vname == "cutSceneActivated") this.cutSceneActivated = Number(variable_xml.getAttribute("value"));
            if (vname == "introact_request") this.introact_request = Number(variable_xml.getAttribute("value"));
            if (vname == "gameover_request") this.gameover_request = Number(variable_xml.getAttribute("value"));
            if (vname == "in_game_seconds") this.in_game_seconds = Number(variable_xml.getAttribute("value"));
            if (vname == "suit_oxygen") this.suit_oxygen = Number(variable_xml.getAttribute("value"));
            if (vname == "comm_tower_repaired") this.comm_tower_repaired = variable_xml.getAttribute("value") == "true";
            if (vname == "narrationMessages") {
                for(let tmp_xml of getElementChildrenByTag(variable_xml, "message")) {
                    this.narrationMessages.push(tmp_xml.firstChild.nodeValue);
                }
            }
            if (vname == "rooms_with_lights_on") {
                this.rooms_with_lights_on = [];
                for(let tmp_xml of getElementChildrenByTag(variable_xml, "room")) {
                    this.rooms_with_lights_on.push(tmp_xml.firstChild.nodeValue);
                }
            }
            if (vname == "error_messages_for_log") {
                for(let tmp_xml of getElementChildrenByTag(variable_xml, "message")) {
                    let tmp_array:string[] = tmp_xml.firstChild.nodeValue.split("\t");
                    if (tmp_array[tmp_array.length-1] == "") tmp_array.splice(tmp_array.length-1, 1);
                    this.error_messages_for_log.push(tmp_array);
                }
            }
            if (vname == "in_game_actions_for_log") {
                for(let tmp_xml of getElementChildrenByTag(variable_xml, "action")) {
                    let tmp_array:string[] = tmp_xml.firstChild.nodeValue.split("\t");
                    if (tmp_array[tmp_array.length-1] == "") tmp_array.splice(tmp_array.length-1, 1);
                    this.in_game_actions_for_log.push(tmp_array);
                }
            }
        }

        for(let i:number = 0;i<this.maps.length;i++) {
            this.maps[i].recalculateLightsOnStatus(this.rooms_with_lights, this.rooms_with_lights_on, this.map_location_names[i]);
        }        

        let script_e:Element = getFirstElementChildByTag(this.xml,"ShrdluGameScript");
        if (script_e != null) this.gameScript.restoreFromXML(script_e);

        if (this.gameScript.act == "3") {
            this.loadTardis8LocationKnowledge();
        }

        // make sure SHRDLU knows how to go places for which it has to traverse multiple maps:
        this.shrdluAI.robot.AI.precomputeMap2mapPaths(this);

        this.ensureUniqueObjectIDs();

        console.log("A4Game created\n");
        console.log("currentPlayer = " + this.currentPlayer);
    }


    loadTardis8LocationKnowledge()
    {
        let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
        xmlhttp.overrideMimeType("text/xml");
        xmlhttp.open("GET", "data/map-locations-tardis.xml", false); 
        xmlhttp.send();
        AILocation.loadLocationsFromXML(xmlhttp.responseXML.documentElement, this, this.ontology);
        this.etaoinAI.precalculateLocationKnowledge(this, this.ontology);
        this.shrdluAI.precalculateLocationKnowledge(this, this.ontology);
        this.qwertyAI.precalculateLocationKnowledge(this, this.ontology);

        this.getMap("Tardis 8").reevaluateVisibility();
        this.getMap("Tardis 8").recalculateLightsOnStatus(this.rooms_with_lights, this.rooms_with_lights_on, 
                                                          this.map_location_names[this.getMapIndex("Tardis 8")]);

    }

    

    saveGame(saveName:string)
    {
        let complete_xmlString:string = "<SHRDLU_savegame>\n";
        let xmlString:string = this.saveToXML();
        console.log("A4Game.saveGame: game xmlString length " + xmlString.length);
        //localStorage.setItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName, xmlString);

        complete_xmlString += xmlString;

        for(let i:number = 0;i<this.maps.length;i++) {
            xmlString = this.maps[i].saveToXML(this);
            complete_xmlString += "\n\n\n" + xmlString;
            //localStorage.setItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName + "-map" + i, xmlString);
            console.log("A4Game.saveGame: map "+i+" xmlString length " + xmlString.length);

        }

        xmlString = this.etaoinAI.saveToXML();
        complete_xmlString += "\n\n\n" + xmlString;
        console.log("A4Game.saveGame: etaoin xmlString length " + xmlString.length);
        //console.log(xmlString);
        //localStorage.setItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName + "-etaoin", xmlString);

        xmlString = this.qwertyAI.saveToXML();
        complete_xmlString += "\n\n\n" + xmlString;
        console.log("A4Game.saveGame: qwerty xmlString length " + xmlString.length);
        //console.log(xmlString);
        //localStorage.setItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName + "-qwerty", xmlString);

        xmlString = this.shrdluAI.saveToXML();
        complete_xmlString += "\n\n\n" + xmlString;
        console.log("A4Game.saveGame: shrdlu xmlString length " + xmlString.length);
        //console.log(xmlString);
        //localStorage.setItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName + "-shrdlu", xmlString);

        complete_xmlString += "</SHRDLU_savegame>";

        // save it:
        console.log("Size of sample is: " + complete_xmlString.length);
        let compressed = LZString.compressToUTF16(complete_xmlString);
        console.log("Size of compressed sample is: " + compressed.length);
        localStorage.setItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName, compressed);
        // downloadStringAsFile(complete_xmlString, "A4Game-saveGame.xml");

        // savegame name:
        let seconds:number = Math.floor(this.cycle/60)%60;
        let minutes:number = Math.floor(this.cycle/(60*60))%60;
        let hours:number = Math.floor(this.cycle/(60*60*60));
        let name:string = hours+":";
        if (minutes<10) {
            name += "0" + minutes + ":";
        } else {
            name += minutes + ":";
        }
        if (seconds<10) {
            name += "0" + seconds;
        } else {
            name += seconds;
        }
        localStorage.setItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName + "-name", name);
    }


    saveToXML() : string
    {
        let xmlString:string = "";
        xmlString += "<A4Game";
        if (this.gameName != null) xmlString += " name=\"" + this.gameName + "\"";
        if (this.gameTitle != null) xmlString += " title=\"" + this.gameTitle + "\"";
        if (this.gameSubtitle != null) xmlString += " subtitle=\"" + this.gameSubtitle + "\"";
        xmlString += " allowSaveGames=\"" + this.allowSaveGames + "\"";
        xmlString += " cycle=\"" + this.cycle +"\"";
        xmlString += ">\n";

        if (this.gameTitleImage!=null) {
            xmlString += "<titleImage>" + this.gameTitleImage + "</titleImage>\n";
        }

        if (this.storyText != null) {
            xmlString += "<story>\n";
            for(let text of this.storyText) {
                xmlString += "<line>" + text + "</line>\n";
            }
            xmlString += "</story>\n";
        }

        for(let i:number = 0;i<this.endingIDs.length;i++) {
            xmlString += "<ending id=\""+this.endingIDs[i]+"\">\n";
            for(let text of this.endingTexts[i]) {
                xmlString += "<line>" + text + "</line>\n";
            }
            xmlString += "</ending>\n";
        }
        
        // tiles:
        xmlString+="<tiles sourcewidth=\""+this.tileWidth+"\"" + 
                          " sourceheight=\""+this.tileHeight+"\"" + 
                          " targetwidth=\""+this.tileWidth*this.defaultZoom+"\"" + 
                          " targetheight=\""+this.tileHeight*this.defaultZoom+"\">\n";
        for(let gf of this.graphicFiles) {
            xmlString += "<types file=\"" + gf.name + "\">\n"
            for(let i:number = 0;i<gf.n_tiles;i+=gf.tilesPerRow) {
                for(let j:number = 0;j<gf.tilesPerRow;j++) {
                    xmlString += gf.tileTypes[i+j] +",";
                }
                xmlString += "\n";
            }
            xmlString += "</types>\n";

            xmlString += "<seeThrough file=\"" + gf.name + "\">\n"
            for(let i:number = 0;i<gf.n_tiles;i+=gf.tilesPerRow) {
                for(let j:number = 0;j<gf.tilesPerRow;j++) {
                    xmlString += gf.tileSeeThrough[i+j] +",";
                }
                xmlString += "\n";
            }
            xmlString += "</seeThrough>\n";

            xmlString += "<canDig file=\"" + gf.name + "\">\n"
            for(let i:number = 0;i<gf.n_tiles;i+=gf.tilesPerRow) {
                for(let j:number = 0;j<gf.tilesPerRow;j++) {
                    xmlString += gf.tileCanDig[i+j] +",";
                }
                xmlString += "\n";
            }
            xmlString += "</canDig>\n";
        }
        
        xmlString+="</tiles>\n";

        // character and object definition files ...
        for(let tmp of this.characterDefinitionFiles) {
            xmlString+="<characterDefinition file=\""+tmp+"\"/>\n";
        }

        for(let tmp of this.objectDefinitionFiles) {
            xmlString+="<objectDefinition file=\""+tmp+"\"/>\n";
        }

        // maps
        for(let idx:number = 0;idx<this.maps.length;idx++) {
            xmlString+="<map file=\"map"+idx+".xml\"/>\n";
        }

        // players:
        for(let pc of this.players) {
            for(let idx:number = 0;idx<this.maps.length;idx++) {                
                if (pc.map == this.maps[idx]) {
                    xmlString += pc.saveToXMLForMainFile(this, "player", idx) + "\n";
                    break;
                }
            }
        }

        // save state:
        let onStarttagOpen:boolean = false;
        /*
        for(let sa of this.knownSpeechActs) {
            if (sa.performative==A4_TALK_PERFORMATIVE_ASK) {
                if (!onStarttagOpen) {
                    xmlString += "<onStart>\n";
                    onStarttagOpen = true;
                }
                xmlString+="<addTopic topic=\""+sa.keyword+"\" text=\""+sa.text+"\"/>\n";
            }
        }
        */
        for(let v in this.storyState) {
            if (!onStarttagOpen) {
                xmlString += "<onStart>\n";
                onStarttagOpen = true;
            }
            xmlString+="<storyState variable=\""+v+"\"" + 
                                  " value=\""+this.storyState[v]+"\"" +
                                  " scope=\"game\"/>\n";
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

        // console messages:
        xmlString += "<console>\n";
        for(let m of this.messages) {
            xmlString += "<message text=\""+m[0]+"\" color=\""+m[1]+"\" timeStamp=\""+m[2]+"\"/>\n";
        }        
        xmlString += "</console>\n";

        // game variables:
        xmlString += "<variable name=\"textInputAllowed\" value=\""+this.textInputAllowed+"\"/>\n";
        xmlString += "<variable name=\"eyesClosedState\" value=\""+this.eyesClosedState+"\"/>\n";
        xmlString += "<variable name=\"eyesClosedTimer\" value=\""+this.eyesClosedTimer+"\"/>\n";
        xmlString += "<variable name=\"cutSceneActivated\" value=\""+this.cutSceneActivated+"\"/>\n";
        xmlString += "<variable name=\"introact_request\" value=\""+this.introact_request+"\"/>\n";
        xmlString += "<variable name=\"gameover_request\" value=\""+this.gameover_request+"\"/>\n";
        xmlString += "<variable name=\"in_game_seconds\" value=\""+this.in_game_seconds+"\"/>\n";
        xmlString += "<variable name=\"suit_oxygen\" value=\""+this.suit_oxygen+"\"/>\n";
        xmlString += "<variable name=\"comm_tower_repaired\" value=\""+this.comm_tower_repaired+"\"/>\n";
        xmlString += "<variable name=\"narrationMessages\">\n";
        for(let nm of this.narrationMessages) {
            xmlString += "<message>" + nm + "</message>\n";
        }
        xmlString += "</variable>\n";
        xmlString += "<variable name=\"rooms_with_lights_on\">\n";
        for(let r of this.rooms_with_lights_on) {
            xmlString += "<room>" + r + "</room>\n";
        }
        xmlString += "</variable>\n";
        xmlString += "<variable name=\"error_messages_for_log\">\n";
        for(let m of this.error_messages_for_log) {
            xmlString += "<message>";
            for(let tmp of m) xmlString += tmp + "\t";
            xmlString += "</message>\n";
        }
        xmlString += "</variable>\n";
        xmlString += "<variable name=\"in_game_actions_for_log\">\n";
        for(let m of this.in_game_actions_for_log) {
            xmlString += "<action>";
            for(let tmp of m) xmlString += tmp + "\t";
            xmlString += "</action>\n";
        }
        xmlString += "</variable>\n";

        xmlString += this.gameScript.saveToXML();

        xmlString += "</A4Game>";
        return xmlString;
    }


    checkSaveGame(saveName:string) : string
    {
        return localStorage.getItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName + "-name");
    }


    deleteSaveGame(saveName:string)
    {
        localStorage.removeItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName + "-name");
        localStorage.removeItem(A4SAVEGAME_STORAGE_KEY + "-" + saveName);
    }


    getNEndings():number {return this.endingIDs.length;}
    
    getGameEnding(ID:string):string[]
    {
        for(let i:number = 0;i<this.endingIDs.length;i++) {
            if (ID == this.endingIDs[i]) return this.endingTexts[i];
        }
        return null;
    }
    
    getGameTitle():string {return this.gameTitle;}
    getGameTitleImage():string {return this.gameTitleImage;}
    getGameSubtitle():string {return this.gameSubtitle;}


    addEnding(ID:string, endingText:string[])
    {
        this.endingIDs.push(ID);
        this.endingTexts.push(endingText);
    }
    

	update(k:KeyboardState) : boolean
    {
        if (this.cycle==0) {
            if (this.eventScripts[A4_EVENT_START] != null) {
                for(let rule of this.eventScripts[A4_EVENT_START]) {
                    rule.executeEffects(null, null, this, null);
                }
            }
        } else {
            // do not execute a story update on the first cycle, since that's when all the "onStart" methods are started,
            // which can mess up with the story
            this.gameScript.update();            
        }

        if (this.cutSceneActivated >= 0) {
            if (this.cutScenes.update(this.cutSceneActivated, k)) {
                this.cutSceneActivated = -1;
            }
            return true;
        }

        this.zoom = (0.95*this.zoom + 0.05*this.targetZoom);

        // update all the objects in the game:
        // figure out which maps to update:
        let maps_to_update:A4Map[] = [];
        for(let m of this.currentPlayer.map.getNeighborMaps()) {
            if (maps_to_update.indexOf(m) == -1) maps_to_update.push(m);
        }
        if (maps_to_update.indexOf(this.shrdluAI.robot.map) == -1) maps_to_update.push(this.shrdluAI.robot.map);
       
        for(let player of this.players) {
            if (maps_to_update.indexOf(player.map)==-1) maps_to_update.push(player.map);
        }
        for(let map of maps_to_update) {
            map.update(this);
        }

        for(let wr of this.warpRequests) {
            let m:A4Map = wr.map;
            let createRecord:boolean = wr.o.isCharacter() || wr.o.isVehicle();
            let acceptWarp:boolean = true;
            if (createRecord &&
                m!=null &&
                !m.walkableConsideringVehicles(wr.x, wr.y+wr.o.tallness, wr.o.getPixelWidth(), wr.o.getPixelHeight()-wr.o.tallness, wr.o)) acceptWarp = false;
            
            if (acceptWarp) {
                if (m!=null && createRecord) {
                    wr.o.map.addPerceptionBufferObjectWarpedRecord(
                        new PerceptionBufferObjectWarpedRecord(wr.o.ID, wr.o.sort, m.name,
                                                               wr.o.x, wr.o.y,
                                                               wr.o.x+wr.o.getPixelWidth(),
                                                               wr.o.y+wr.o.getPixelHeight()));
                }
                /*
                if (isCurrentPlayer) {
                    if (m!=null) this.addMessage("Welcome to " + m.name);
                }
                */
                wr.o.warp(wr.x,wr.y,wr.map);//,wr.layer);
            } else {
                // can't warp, since there is a collision!
                if (wr.o == this.currentPlayer) this.addMessage("Something is blocking the way!");
            }
            
        }
        this.warpRequests = [];

        for(let o of this.deletionRequests) {
            o.event(A4_EVENT_END, null, o.map, this);
            this.objectRemoved(o);
        }
        this.deletionRequests = [];

        // rules:
        if (this.eventScripts[A4_EVENT_TIMER]!=null) {
            for(let r of this.eventScripts[A4_EVENT_TIMER]) r.execute(null,null,this,null);
        }
        if (this.eventScripts[A4_EVENT_STORYSTATE]!=null) {
            for(let r of this.eventScripts[A4_EVENT_STORYSTATE]) r.execute(null,null,this,null);
        }
        if (this.currentPlayer==null) return false;

        this.executeScriptQueues();

        this.etaoinAI.update(this.in_game_seconds);
        this.qwertyAI.update(this.in_game_seconds);
        this.shrdluAI.update(this.in_game_seconds);

        switch(this.eyesClosedState) {
        case 0:
            break;
        case 1:
            this.eyesClosedTimer++;
            if (this.eyesClosedTimer>EYESOPEN_SPEED) {
                this.eyesClosedState = 2;
                this.eyesClosedTimer = 0;
            }
            break;
        case 2:
            break;
        case 3:
            this.eyesClosedTimer++;
            if (this.eyesClosedTimer>EYESOPEN_SPEED) {
                this.eyesClosedState = 0;
                this.eyesClosedTimer = 0;
            }
            break;
        }    

        if (this.getStoryStateVariable("spacesuit")=="helmet") {
            if (this.currentPlayer.map.name == "Aurora Station" ||
                this.currentPlayer.isInVehicle()) {
                if (this.suit_oxygen < SHRDLU_MAX_SPACESUIT_OXYGEN) {
                    this.suit_oxygen += 16;
                    this.suit_oxygen = Math.min(this.suit_oxygen, SHRDLU_MAX_SPACESUIT_OXYGEN)
                }
            } else {
                if (this.suit_oxygen > 0) {
                    if (this.currentPlayer.map.name == "Spacer Valley South" ||
                        this.currentPlayer.map.name == "Spacer Valley North") {
                        this.suit_oxygen -= 4;
                        this.suit_oxygen = Math.max(this.suit_oxygen, 0)
                    } else {
                        this.suit_oxygen--;
                    }
                } else {
                    this.gameover_request = 1;    // OUT Of OXYGEN!
                }
            }
        } else {
            if (this.suit_oxygen < SHRDLU_MAX_SPACESUIT_OXYGEN) {
                this.suit_oxygen += 16;
                this.suit_oxygen = Math.min(this.suit_oxygen, SHRDLU_MAX_SPACESUIT_OXYGEN)
            }
        }

        if (this.communicatorConnectedTo != null) {
            if ((this.etaoinAI.time_in_seconds - this.communicatorConnectionTime) > COMMUNICATOR_CONNECTION_TIMEOUT) {
                this.communicatorConnectedTo = null;
                this.communicatorConnectionTime = 0;
            }
        }

        this.cycle++;
        this.in_game_seconds++;    // we keep a separate count from cycles, since in some game scenes, time might advance faster
        if (this.cycles_without_redrawing > 0) this.cycles_without_redrawing--;

        return true;
    }


	draw(screen_width:number, screen_height:number)
    {
        let tileSize:number = (screen_height/24);
        let split:number = Math.floor(tileSize*17);

        if (this.cutSceneActivated >= 0) {
            this.cutScenes.draw(this.cutSceneActivated, screen_width, split);
            return;
        }

        // do not draw anything unless we have already executed a cycle:
        if (this.cycle==0) return;
        if (this.cycles_without_redrawing>0) return;

        this.drawWorld(screen_width, split+tileSize);
        this.drawHUD(screen_width, screen_height, split);

        let y:number = 8;
        for(let i:number = 0;i<this.narrationMessages.length;i++) {
            let width:number = this.narrationMessages[i].length*6*PIXEL_SIZE;
            fillTextTopLeft(this.narrationMessages[i], screen_width/2 - width/2, y, fontFamily32px, MSX_COLOR_WHITE);
            y += 8;
        }
    }


    drawWorld(screen_width:number, screen_height:number)
    {
        if (this.currentPlayer!=null) {
            let map:A4Map = this.currentPlayer.map;
            let mapx:number = this.getCameraX(this.currentPlayer, map.width*this.tileWidth, screen_width);
            let mapy:number = this.getCameraY(this.currentPlayer, map.height*this.tileHeight, screen_height);
            let tx:number = Math.floor(this.currentPlayer.x/this.tileWidth);
            let ty:number = Math.floor((this.currentPlayer.y+this.currentPlayer.tallness)/this.tileHeight);
            map.drawRegion(mapx, mapy, this.zoom, screen_width, screen_height, map.visibilityRegion(tx,ty), this);
            this.drawEyesclosedCover(screen_width, screen_height);
            map.drawTextBubblesRegion(mapx, mapy, this.zoom, screen_width, screen_height, map.visibilityRegion(tx,ty), this);
        } else {
            // this part is not needed for SHRDLU (the character doesn't die like in other games)
            /*
            let map:A4Map = this.maps[0];
            map.draw(0, 0, this.zoom,screen_width, screen_height, this);
            this.drawEyesclosedCover(screen_width, screen_height);
            map.drawTextBubbles(0, 0, this.zoom, screen_width, screen_height, this);
            */
        }
    }


    drawEyesclosedCover(screen_width:number, screen_height:number)
    {
        switch(this.eyesClosedState) {
        case 0:
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, screen_width, screen_height);
            break;
        case 1:
            {
              let f:number = (EYESOPEN_SPEED - this.eyesClosedTimer)/EYESOPEN_SPEED;
              if (f<0) f = 0;
              if (f>1) f = 1;
              let x:number = 4*f - 1;
              f = 0.125 * (5 + x - 3*x*x + x*x*x);
              if (f<0) f = 0;
              if (f>1) f = 1;
              f = Math.sqrt(f)/2;
              let height:number = Math.floor((screen_height/PIXEL_SIZE)*f)*PIXEL_SIZE;
              ctx.fillStyle = "black";
              ctx.fillRect(0, 0, screen_width, height);
              ctx.fillRect(0, screen_height-height, screen_width, height);
            }
            break;
        case 2:
            break;
        case 3:
            {
              let f:number = this.eyesClosedTimer/EYESOPEN_SPEED;
              if (f<0) f = 0;
              if (f>1) f = 1;
              let x:number = 4*f - 1;
              f = 0.125 * (5 + x - 3*x*x + x*x*x);
              if (f<0) f = 0;
              if (f>1) f = 1;
              f = Math.sqrt(f)/2;
              let height:number = Math.floor((screen_height/PIXEL_SIZE)*f)*PIXEL_SIZE;
              ctx.fillStyle = "black";
              ctx.fillRect(0, 0, screen_width, height);
              ctx.fillRect(0, screen_height-height, screen_width, height);
            }
            break;
        }        
    }


    drawHUD(screen_width:number, screen_height:number, split:number)
    {
        ctx.fillStyle = "black";
        ctx.fillRect(0,split+PIXEL_SIZE,screen_width,(screen_height-split));

        if (this.HUD_hseparator==null) {
            this.HUD_hseparator = this.GLTM.getPiece("data/GUI.png",0,0,8,8);
            this.HUD_vseparator = this.GLTM.getPiece("data/GUI.png",0,8,8,8);
            this.HUD_tseparator = this.GLTM.getPiece("data/GUI.png",48,0,8,8);
            this.HUD_uparrow1 = this.GLTM.getPiece("data/GUI.png",8,0,8,8);
            this.HUD_uparrow2 = this.GLTM.getPiece("data/GUI.png",8,8,8,8);
            this.HUD_downarrow1 = this.GLTM.getPiece("data/GUI.png",16,0,8,8);
            this.HUD_downarrow2 = this.GLTM.getPiece("data/GUI.png",16,8,8,8);
            this.HUD_button1 = this.GLTM.getPiece("data/GUI.png",24,0,8,8);
            this.HUD_button2 = this.GLTM.getPiece("data/GUI.png",24,8,8,8);

            this.HUD_oxygen = this.GLTM.getPiece("data/GUI.png",0,48,40,8);
            this.HUD_oxygen_bar = this.GLTM.getPiece("data/GUI.png",32,40,32,8);
        }

        if (this.HUD_hseparator != null) {
            for(let i:number = 0;i<screen_width;i+=PIXEL_SIZE*8) {
                this.HUD_hseparator.drawWithZoom(i, split, PIXEL_SIZE);
            }
        }
        if (this.HUD_button1!=null && this.HUD_button2!=null) {
            if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY ||
                this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
                this.HUD_button2.drawWithZoom(27*8*PIXEL_SIZE, split, PIXEL_SIZE);
            } else {
                this.HUD_button1.drawWithZoom(27*8*PIXEL_SIZE, split, PIXEL_SIZE);
            }
        }

        // we can only show either the inventory or the messags (not both):
        if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY) {
            // inventory:
            let inventoryMaxSize:number = SHRDLU_INVENTORY_DISPLAY_SIZE;
            if (this.currentPlayer.inventory.length<=inventoryMaxSize) this.HUD_inventory_start = 0;
            if (this.currentPlayer.selectedItem>=0 &&
                this.currentPlayer.selectedItem < this.HUD_inventory_start) {
                this.HUD_inventory_start = this.currentPlayer.selectedItem - (this.currentPlayer.selectedItem%2);
                //console.log("selected: " + this.currentPlayer.selectedItem + ", start: " + this.HUD_inventory_start);
            }
            if (this.currentPlayer.selectedItem >= this.HUD_inventory_start+inventoryMaxSize) {
                this.HUD_inventory_start = this.currentPlayer.selectedItem-(inventoryMaxSize-1);
                this.HUD_inventory_start += (this.HUD_inventory_start%2);
                //console.log("selected: " + this.currentPlayer.selectedItem + ", start: " + this.HUD_inventory_start);
            }

            // draw the inventory UI:
            this.HUD_tseparator.drawWithZoom(26*8*PIXEL_SIZE, split, PIXEL_SIZE);
            for(let i:number = split+PIXEL_SIZE*8;i<screen_height;i+=PIXEL_SIZE*8) {
                this.HUD_vseparator.drawWithZoom(26*8*PIXEL_SIZE, i, PIXEL_SIZE);
            }
            if (!this.currentPlayer.isInVehicle()) {
                if (this.currentPlayer.selectedItem>=0) {
                    let item:A4Object = this.currentPlayer.inventory[this.currentPlayer.selectedItem];
                    if (item!=null) {
                        if ((<A4Item>item).droppable) {
                            fillTextTopLeft("  o ", 28*8*PIXEL_SIZE, split+4*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_LIGHT_GREEN);
                            fillTextTopLeft("Dr p", 28*8*PIXEL_SIZE, split+4*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_WHITE);
                        } else {
                            fillTextTopLeft("Drop", 28*8*PIXEL_SIZE, split+4*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_DARK_BLUE);
                        }
                        if (item.usable) {
                            fillTextTopLeft("U  ", 28*8*PIXEL_SIZE, split+2*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_LIGHT_GREEN);
                            fillTextTopLeft(" se", 28*8*PIXEL_SIZE, split+2*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_WHITE);
                        } else {
                            fillTextTopLeft("Use", 28*8*PIXEL_SIZE, split+2*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_DARK_BLUE);
                        }
                    } else {
                        fillTextTopLeft("Drop", 28*8*PIXEL_SIZE, split+4*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_DARK_BLUE);
                        fillTextTopLeft("Use", 28*8*PIXEL_SIZE, split+2*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_DARK_BLUE);
                    }
                } else {
                    fillTextTopLeft("Drop", 28*8*PIXEL_SIZE, split+4*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_DARK_BLUE);
                    fillTextTopLeft("Use", 28*8*PIXEL_SIZE, split+2*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_DARK_BLUE);
                }
            }
            if (this.HUD_uparrow1!=null && this.HUD_uparrow2!=null) {
                if (this.HUD_inventory_start>0) {
                    this.HUD_uparrow1.drawWithZoom(29*8*PIXEL_SIZE, split, PIXEL_SIZE);
                } else {
                    this.HUD_uparrow2.drawWithZoom(29*8*PIXEL_SIZE, split, PIXEL_SIZE);
                }
            }
            if (this.HUD_downarrow1!=null && this.HUD_downarrow2!=null) {
                if (this.HUD_inventory_start+inventoryMaxSize<this.currentPlayer.inventory.length) {
                    this.HUD_downarrow1.drawWithZoom(30*8*PIXEL_SIZE, split, PIXEL_SIZE);
                } else {
                    this.HUD_downarrow2.drawWithZoom(30*8*PIXEL_SIZE, split, PIXEL_SIZE);
                }
            }
            // draw the inventory:
            for(let i:number = 0;i<inventoryMaxSize &&
                                 i+this.HUD_inventory_start < this.currentPlayer.inventory.length;i++) {
                let x:number = (i%2)*8*14*PIXEL_SIZE;
                let y:number = split + (1+Math.floor(i/2))*8*PIXEL_SIZE;
                let item:A4Object = this.currentPlayer.inventory[i+this.HUD_inventory_start];

                if (i+this.HUD_inventory_start == this.currentPlayer.selectedItem) {
                    ctx.fillStyle = MSX_COLOR_DARK_BLUE;
                    ctx.fillRect(x, y, 12*8*PIXEL_SIZE, 8*PIXEL_SIZE);
                }

                // item icon:
                let anim:A4Animation = item.getCurrentAnimation();
                if (anim!=null) {
                    anim.drawWithZoom(x,y,this.zoom);
                }

                // item name:
                fillTextTopLeft(item.name, x+2*8*PIXEL_SIZE, y, fontFamily32px, MSX_COLOR_WHITE);
            }


        } else if (this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
            // inventory:
            let inventoryMaxSize:number = SHRDLU_INVENTORY_DISPLAY_SIZE/2;
            let inventoryRemoteMaxSize:number = (SHRDLU_INVENTORY_DISPLAY_SIZE/2)-1;
            // player inventory scroll:
            if (this.currentPlayer.inventory.length<=inventoryMaxSize) this.HUD_inventory_start = 0;
            if (this.currentPlayer.selectedItem>=0 &&
                this.currentPlayer.selectedItem < this.HUD_inventory_start) {
                //console.log("selected: " + this.currentPlayer.selectedItem + ", start: " + this.HUD_inventory_start);
            }
            if (this.currentPlayer.selectedItem >= this.HUD_inventory_start+inventoryMaxSize) {
                this.HUD_inventory_start = this.currentPlayer.selectedItem-(inventoryMaxSize-1);
                //console.log("selected: " + this.currentPlayer.selectedItem + ", start: " + this.HUD_inventory_start);
            }
            // remote inventory scroll:
            if (this.HUD_remote_inventory.content.length<=inventoryRemoteMaxSize) this.HUD_remote_inventory_start = 0;
            if (this.HUD_remote_inventory_selected>=0 &&
                this.HUD_remote_inventory_selected < this.HUD_remote_inventory_start) {
                this.HUD_remote_inventory_start = this.HUD_remote_inventory_selected;
                //console.log("selected: " + this.currentPlayer.selectedItem + ", start: " + this.HUD_inventory_start);
            }
            if (this.HUD_remote_inventory_selected >= this.HUD_remote_inventory_start+inventoryRemoteMaxSize) {
                this.HUD_remote_inventory_start = this.HUD_remote_inventory_selected-(inventoryRemoteMaxSize-1);
                //console.log("selected: " + this.currentPlayer.selectedItem + ", start: " + this.HUD_inventory_start);
            }

            // draw the split inventory UI:
            this.HUD_tseparator.drawWithZoom(13*8*PIXEL_SIZE, split, PIXEL_SIZE);
            this.HUD_tseparator.drawWithZoom(19*8*PIXEL_SIZE, split, PIXEL_SIZE);
            for(let i:number = split+PIXEL_SIZE*8;i<screen_height;i+=PIXEL_SIZE*8) {
                this.HUD_vseparator.drawWithZoom(13*8*PIXEL_SIZE, i, PIXEL_SIZE);
                this.HUD_vseparator.drawWithZoom(19*8*PIXEL_SIZE, i, PIXEL_SIZE);
            }
            if (this.HUD_remote_inventory_selected>=0 &&
                this.HUD_remote_inventory.content[this.HUD_remote_inventory_selected].takeable) {
                fillTextTopLeft(" U ",(15*8+3)*PIXEL_SIZE, split+2*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_LIGHT_GREEN);
                fillTextTopLeft("< <",(15*8+3)*PIXEL_SIZE, split+2*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_WHITE);
            } else {
                fillTextTopLeft("<U<",(15*8+3)*PIXEL_SIZE, split+2*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_DARK_BLUE);
            }
            if (this.currentPlayer.selectedItem>=0) {
                fillTextTopLeft(" O ",(15*8+3)*PIXEL_SIZE, split+4*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_LIGHT_GREEN);
                fillTextTopLeft("> >",(15*8+3)*PIXEL_SIZE, split+4*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_WHITE);
            } else {
                fillTextTopLeft(">O>",(15*8+3)*PIXEL_SIZE, split+4*8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_DARK_BLUE);
            }
            // draw the inventory:
            if (this.HUD_uparrow1!=null && this.HUD_uparrow2!=null) {
                if (this.HUD_inventory_start>0) {
                    this.HUD_uparrow1.drawWithZoom(10*8*PIXEL_SIZE, split, PIXEL_SIZE);
                } else {
                    this.HUD_uparrow2.drawWithZoom(10*8*PIXEL_SIZE, split, PIXEL_SIZE);
                }
            }
            if (this.HUD_downarrow1!=null && this.HUD_downarrow2!=null) {
                if (this.HUD_inventory_start+inventoryMaxSize<this.currentPlayer.inventory.length) {
                    this.HUD_downarrow1.drawWithZoom(11*8*PIXEL_SIZE, split, PIXEL_SIZE);
                } else {
                    this.HUD_downarrow2.drawWithZoom(11*8*PIXEL_SIZE, split, PIXEL_SIZE);
                }
            }
            for(let i:number = 0;i<inventoryMaxSize &&
                                 i+this.HUD_inventory_start < this.currentPlayer.inventory.length;i++) {
                let x:number = 0;
                let y:number = split + (1+i)*8*PIXEL_SIZE;
                let item:A4Object = this.currentPlayer.inventory[i+this.HUD_inventory_start];
                if (item==null) continue;
                if (i+this.HUD_inventory_start == this.currentPlayer.selectedItem) {
                    ctx.fillStyle = MSX_COLOR_DARK_BLUE;
                    ctx.fillRect(x, y, 12*8*PIXEL_SIZE, 8*PIXEL_SIZE);
                }
                // item icon:
                let anim:A4Animation = item.getCurrentAnimation();
                if (anim!=null) {
                    anim.drawWithZoom(x,y,this.zoom);
                }
                // item name:
                fillTextTopLeft(item.name, x+2*8*PIXEL_SIZE, y, fontFamily32px, MSX_COLOR_WHITE);
            }

            // draw the remote inventory:
            if (this.HUD_uparrow1!=null && this.HUD_uparrow2!=null) {
                if (this.HUD_remote_inventory_start>0) {
                    this.HUD_uparrow1.drawWithZoom(29*8*PIXEL_SIZE, split, PIXEL_SIZE);
                } else {
                    this.HUD_uparrow2.drawWithZoom(29*8*PIXEL_SIZE, split, PIXEL_SIZE);
                }
            }
            if (this.HUD_downarrow1!=null && this.HUD_downarrow2!=null) {
                if (this.HUD_remote_inventory_start+inventoryRemoteMaxSize<this.HUD_remote_inventory.content.length) {
                    this.HUD_downarrow1.drawWithZoom(30*8*PIXEL_SIZE, split, PIXEL_SIZE);
                } else {
                    this.HUD_downarrow2.drawWithZoom(30*8*PIXEL_SIZE, split, PIXEL_SIZE);
                }
            }
            // name of the remote container:
            fillTextTopLeft(this.HUD_remote_inventory.name + ":", 20*8*PIXEL_SIZE, split+8*PIXEL_SIZE, fontFamily32px, MSX_COLOR_WHITE);
            // inventory:
            for(let i:number = 0;i<inventoryRemoteMaxSize &&
                                 i+this.HUD_remote_inventory_start < this.HUD_remote_inventory.content.length;i++) {
                let x:number = 20*8*PIXEL_SIZE;
                let y:number = split + (2+i)*8*PIXEL_SIZE;
                let item:A4Object = this.HUD_remote_inventory.content[i+this.HUD_remote_inventory_start];
                if (item==null) continue;
                if (i+this.HUD_remote_inventory_start == this.HUD_remote_inventory_selected) {
                    ctx.fillStyle = MSX_COLOR_DARK_BLUE;
                    ctx.fillRect(x, y, 12*8*PIXEL_SIZE, 8*PIXEL_SIZE);
                }
                // item icon:
                let anim:A4Animation = item.getCurrentAnimation();
                if (anim!=null) {
                    anim.drawWithZoom(x,y,this.zoom);
                }
                // item name:
                fillTextTopLeft(item.name, x+2*8*PIXEL_SIZE, y, fontFamily32px, MSX_COLOR_WHITE);
            }
        } else { 
            // messages:
            let x:number = 0;
            let y:number = split+8*PIXEL_SIZE;

            let start:number = 0;
            if (this.console_first_message==-1) {
                start = this.messages.length - A4_N_MESSAGES_IN_HUD;
            } else {
                start = this.console_first_message;
            }
            if (start<0) start = 0;

            ctx.fillStyle = "white";
            ctx.font = fontFamily32px;
            ctx.textBaseline = "top"; 
            ctx.textAlign = "left";
            for(let i:number = 0;i<A4_N_MESSAGES_IN_HUD && start+i<this.messages.length;i++) {
                ctx.fillStyle = this.messages[start+i][1];
                ctx.fillText(this.messages[start+i][0], x, y);
                y+=8*PIXEL_SIZE;
            }            

            if (this.HUD_uparrow1!=null && this.HUD_uparrow2!=null) {
                if (start>0) {
                    this.HUD_uparrow1.drawWithZoom(29*8*PIXEL_SIZE, split, PIXEL_SIZE);
                } else {
                    this.HUD_uparrow2.drawWithZoom(29*8*PIXEL_SIZE, split, PIXEL_SIZE);
                }
            }
            if (this.HUD_downarrow1!=null && this.HUD_downarrow2!=null) {
                if (start+A4_N_MESSAGES_IN_HUD<this.messages.length) {
                    this.HUD_downarrow1.drawWithZoom(30*8*PIXEL_SIZE, split, PIXEL_SIZE);
                } else {
                    this.HUD_downarrow2.drawWithZoom(30*8*PIXEL_SIZE, split, PIXEL_SIZE);
                }
            }

            if (this.HUD_state == SHRDLU_HUD_STATE_MESSAGES_INPUT) {
                // draw cursor:
                if ((this.cycle%30)<15) {
                    if (this.textInputAllowed &&
                        !this.anyoneTalking()) {
//                        !this.currentPlayer.isTalking()) {
                        ctx.fillStyle = MSX_COLOR_DARK_GREEN;
                    } else {
                        ctx.fillStyle = MSX_COLOR_DARK_RED;
                    }
                    ctx.fillRect((this.HUD_text_input_cursor+1)*6*PIXEL_SIZE,184*PIXEL_SIZE,
                                 6*PIXEL_SIZE,8*PIXEL_SIZE);
                }
                ctx.fillStyle = MSX_COLOR_LIGHT_GREEN;
            } else {
                ctx.fillStyle = MSX_COLOR_DARK_BLUE;
            }
            ctx.fillText(">" + this.HUD_text_input_buffer,0,184*PIXEL_SIZE);
        }

        // oxygen bar:
        if (this.getStoryStateVariable("spacesuit")=="helmet") {
            // show oxygen bar:
            this.HUD_oxygen.drawWithZoom(23*8*PIXEL_SIZE, 0, PIXEL_SIZE);
            this.HUD_oxygen_bar.drawWithZoom(28*8*PIXEL_SIZE, 0, PIXEL_SIZE);

            let oxygen_bar_size:number = Math.floor((32-6)*(this.suit_oxygen/SHRDLU_MAX_SPACESUIT_OXYGEN));
            if (this.suit_oxygen < SHRDLU_MAX_SPACESUIT_OXYGEN*0.2) {
                ctx.fillStyle = MSX_COLOR_RED;
            } else {
                ctx.fillStyle = MSX_COLOR_DARK_BLUE;
            }
            ctx.fillRect((28*8+3)*PIXEL_SIZE,3*PIXEL_SIZE,oxygen_bar_size*PIXEL_SIZE,PIXEL_SIZE);
        }

        // when any of the AIs is thinking:
        if ((this.cycle%32) < 16) {
            let thinkingY:number = 128;
            if (this.etaoinAI.inferenceProcesses.length > 0) {
                // etaoin is thinking:
                ctx.fillStyle = MSX_COLOR_BLACK;
                ctx.fillRect(2*PIXEL_SIZE,thinkingY*PIXEL_SIZE,130*PIXEL_SIZE,10*PIXEL_SIZE);
                ctx.fillStyle = MSX_COLOR_WHITE;
                ctx.fillText("Etaoin is thinking...",2*PIXEL_SIZE,(thinkingY+1)*PIXEL_SIZE);
                thinkingY-=10;
            }
            if (this.qwertyAI.inferenceProcesses.length > 0) {
                // etaoin is thinking:
                ctx.fillStyle = MSX_COLOR_BLACK;
                ctx.fillRect(2*PIXEL_SIZE,thinkingY*PIXEL_SIZE,130*PIXEL_SIZE,10*PIXEL_SIZE);
                ctx.fillStyle = MSX_COLOR_WHITE;
                ctx.fillText("Qwerty is thinking...",2*PIXEL_SIZE,(thinkingY+1)*PIXEL_SIZE);
                thinkingY-=10;
            }
            if (this.shrdluAI.inferenceProcesses.length > 0) {
                // etaoin is thinking:
                ctx.fillStyle = MSX_COLOR_BLACK;
                ctx.fillRect(2*PIXEL_SIZE,thinkingY*PIXEL_SIZE,130*PIXEL_SIZE,10*PIXEL_SIZE);
                ctx.fillStyle = MSX_COLOR_WHITE;
                ctx.fillText("Shrdlu is thinking...",2*PIXEL_SIZE,(thinkingY+1)*PIXEL_SIZE);
                thinkingY-=10;
            }
        }
    }


    mouseClick(mouse_x: number, mouse_y: number, button: number) 
    {
        if (mouse_y < PIXEL_SIZE*8*17) {
            // click in the game screen: this should skip text bubbles, cutscenes, etc.
            this.skipSpeechBubble();
        }

        if (mouse_x >= PIXEL_SIZE*8*27 &&
            mouse_x < PIXEL_SIZE*8*28 &&
            mouse_y >= PIXEL_SIZE*8*17 &&
            mouse_y < PIXEL_SIZE*8*18) {
            this.playerInput_ToogleInventory();
        }

        if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY) {
            // inventory window:
            if (mouse_x >= PIXEL_SIZE*8*29 &&
                mouse_x < PIXEL_SIZE*8*30 &&
                mouse_y >= PIXEL_SIZE*8*17 &&
                mouse_y < PIXEL_SIZE*8*18) {
                this.HUD_inventory_start-=2;
                if (this.HUD_inventory_start<0) this.HUD_inventory_start = 0;
                if (this.currentPlayer.selectedItem>=0) {
                    while(this.currentPlayer.selectedItem >= this.HUD_inventory_start+SHRDLU_INVENTORY_DISPLAY_SIZE) {
                        this.currentPlayer.previousItem();
                    }
                }
            }
            if (mouse_x >= PIXEL_SIZE*8*30 &&
                mouse_x < PIXEL_SIZE*8*31 &&
                mouse_y >= PIXEL_SIZE*8*17 &&
                mouse_y < PIXEL_SIZE*8*18) {
                if (this.currentPlayer.inventory.length > this.HUD_inventory_start+SHRDLU_INVENTORY_DISPLAY_SIZE) {
                    this.HUD_inventory_start+=2;
                    if (this.currentPlayer.selectedItem>=0) {
                        while(this.currentPlayer.selectedItem < this.HUD_inventory_start) {
                            this.currentPlayer.nextItem();
                        }
                    }
                }
            }
            if (mouse_x < PIXEL_SIZE*8*12 && 
                mouse_y >= PIXEL_SIZE*8*18) {
                let y:number = Math.floor((mouse_y-PIXEL_SIZE*8*18)/(PIXEL_SIZE*8));
                let selected:number = this.HUD_inventory_start + y*2;
                if (selected < this.currentPlayer.inventory.length &&
                    this.currentPlayer.inventory[selected] != null) {
                    this.currentPlayer.selectedItem = selected;
                }
            }
            if (mouse_x >= PIXEL_SIZE*8*14 && 
                mouse_x < PIXEL_SIZE*8*26 && 
                mouse_y >= PIXEL_SIZE*8*18) {
                let y:number = Math.floor((mouse_y-PIXEL_SIZE*8*18)/(PIXEL_SIZE*8));
                let selected:number = this.HUD_inventory_start + 1 + y*2;
                if (selected < this.currentPlayer.inventory.length &&
                    this.currentPlayer.inventory[selected] != null) {
                    this.currentPlayer.selectedItem = selected;
                }
            }

            // Use
            if (mouse_x >= PIXEL_SIZE*8*27 &&
                mouse_y >= PIXEL_SIZE*8*19 &&
                mouse_y < PIXEL_SIZE*8*20) {
                this.playerInput_UseItem();
            }
            // Drop
            if (mouse_x >= PIXEL_SIZE*8*27 &&
                mouse_y >= PIXEL_SIZE*8*21 &&
                mouse_y < PIXEL_SIZE*8*22) {
                this.playerInput_DropItem();
            }


        } else if (this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
            if (mouse_x < PIXEL_SIZE*8*12 && 
                mouse_y >= PIXEL_SIZE*8*18) {
                let y:number = Math.floor((mouse_y-PIXEL_SIZE*8*18)/(PIXEL_SIZE*8));
                let selected:number = this.HUD_inventory_start + y;
                if (selected < this.currentPlayer.inventory.length &&
                    this.currentPlayer.inventory[selected] != null) {
                    this.currentPlayer.selectedItem = selected;
                    this.HUD_remote_inventory_selected = -1;
                }
            }
            // select on the other inventory:
            if (mouse_x >= PIXEL_SIZE*8*20 && 
                mouse_y >= PIXEL_SIZE*8*19) {
                let y:number = Math.floor((mouse_y-PIXEL_SIZE*8*19)/(PIXEL_SIZE*8));
                let selected:number = this.HUD_remote_inventory_start + y;
                if (selected < this.HUD_remote_inventory.content.length &&
                    this.HUD_remote_inventory.content[selected] != null) {
                    this.HUD_remote_inventory_selected = selected;
                    this.currentPlayer.selectedItem = -1;
                }
            }
            // arrows (inventory):
            if (mouse_x >= PIXEL_SIZE*8*10 &&
                mouse_x < PIXEL_SIZE*8*11 &&
                mouse_y >= PIXEL_SIZE*8*17 &&
                mouse_y < PIXEL_SIZE*8*18) {
                this.HUD_inventory_start--;
                if (this.HUD_inventory_start<0) this.HUD_inventory_start = 0;
                if (this.currentPlayer.selectedItem>=0) {
                    while(this.currentPlayer.selectedItem >= this.HUD_inventory_start+SHRDLU_INVENTORY_DISPLAY_SIZE/2) {
                        this.currentPlayer.previousItem();
                    }
                }
            }
            if (mouse_x >= PIXEL_SIZE*8*11 &&
                mouse_x < PIXEL_SIZE*8*12 &&
                mouse_y >= PIXEL_SIZE*8*17 &&
                mouse_y < PIXEL_SIZE*8*18) {
                if (this.currentPlayer.inventory.length > this.HUD_inventory_start+SHRDLU_INVENTORY_DISPLAY_SIZE/2) {
                    this.HUD_inventory_start++;
                    if (this.currentPlayer.selectedItem>=0) {
                        while(this.currentPlayer.selectedItem < this.HUD_inventory_start) {
                            this.currentPlayer.nextItem();
                        }
                    }
                }
            }
            // arrows (remote):
            if (mouse_x >= PIXEL_SIZE*8*29 &&
                mouse_x < PIXEL_SIZE*8*30 &&
                mouse_y >= PIXEL_SIZE*8*17 &&
                mouse_y < PIXEL_SIZE*8*18) {
                this.HUD_remote_inventory_start--;
                if (this.HUD_remote_inventory_start<0) this.HUD_remote_inventory_start = 0;
                if (this.HUD_remote_inventory_selected>=0) {
                    while(this.HUD_remote_inventory_selected >= this.HUD_remote_inventory_start+(SHRDLU_INVENTORY_DISPLAY_SIZE/2)-1) {
                        this.HUD_remote_inventory_selected--;
                    }
                }
            }
            if (mouse_x >= PIXEL_SIZE*8*30 &&
                mouse_x < PIXEL_SIZE*8*31 &&
                mouse_y >= PIXEL_SIZE*8*17 &&
                mouse_y < PIXEL_SIZE*8*18) {
                if (this.HUD_remote_inventory.content.length > this.HUD_remote_inventory_start+(SHRDLU_INVENTORY_DISPLAY_SIZE/2)-1) {
                    this.HUD_remote_inventory_start++;
                    if (this.HUD_remote_inventory_selected>=0) {
                        while(this.HUD_remote_inventory_selected < this.HUD_remote_inventory_start) {
                            this.HUD_remote_inventory_selected++;
                        }
                    }
                }
            }
            // buttons:
            // take
            if (mouse_x >= PIXEL_SIZE*8*14 &&
                mouse_x < PIXEL_SIZE*8*19 &&
                mouse_y >= PIXEL_SIZE*8*19 &&
                mouse_y < PIXEL_SIZE*8*20) {
                if (this.HUD_remote_inventory_selected>=0 &&
                    this.HUD_remote_inventory.content[this.HUD_remote_inventory_selected].takeable) {
                    let item:A4Object = this.HUD_remote_inventory.content[this.HUD_remote_inventory_selected];
                    let idx:number = this.HUD_remote_inventory.content.indexOf(item);
                    this.HUD_remote_inventory.content.splice(idx,1);
                    this.HUD_remote_inventory.objectRemoved(item);
                    this.currentPlayer.inventory.push(item);
                    this.HUD_remote_inventory_selected = -1;
                    this.playSound("data/sfx/itemPickup.wav");
                }
            }
            // put
            if (mouse_x >= PIXEL_SIZE*8*14 &&
                mouse_x < PIXEL_SIZE*8*19 &&
                mouse_y >= PIXEL_SIZE*8*21 &&
                mouse_y < PIXEL_SIZE*8*22) {
                if (this.currentPlayer.selectedItem>=0) {
                    let item:A4Object = this.currentPlayer.inventory[this.currentPlayer.selectedItem];
                    let idx:number = this.currentPlayer.inventory.indexOf(item);
                    this.currentPlayer.inventory.splice(idx,1);
                    this.HUD_remote_inventory.addContent(item);
                    this.currentPlayer.selectedItem = -1;
                    this.playSound("data/sfx/itemPickup.wav");
                }
            }


        } else {
            // message window:
            if (mouse_x >= PIXEL_SIZE*8*29 &&
                mouse_x < PIXEL_SIZE*8*30 &&
                mouse_y >= PIXEL_SIZE*8*17 &&
                mouse_y < PIXEL_SIZE*8*18) {
                this.messageConsoleUp();
            }
            if (mouse_x >= PIXEL_SIZE*8*30 &&
                mouse_x < PIXEL_SIZE*8*31 &&
                mouse_y >= PIXEL_SIZE*8*17 &&
                mouse_y < PIXEL_SIZE*8*18) {
                this.messageConsoleDown();
            }
        }
    }   


    anyoneTalking() : boolean
    {
        if (this.currentPlayer.isTalking()) return true;
        if (this.qwertyAI.robot.isTalking()) return true;
        if (this.shrdluAI.robot.isTalking()) return true;
        if (this.currentPlayer.map.textBubbles.length != 0) return true;
        return false;
    }


    setGameComplete(gc:boolean, ID:string) 
    {
        this.gameComplete = gc; 
        this.gameComplete_ending_ID = ID;
    }


    executeScriptQueues()
    {
        let toDelete:A4ScriptExecutionQueue[] = [];
        for(let seb of this.scriptQueues) {
            while(true) {
                let s:A4Script = seb.scripts[0];
                let retval:number = s.execute(seb.object,
                                              seb.map,
                                              (seb.game == null ? this:seb.game),
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
            let idx:number = this.scriptQueues.indexOf(seb);
            this.scriptQueues.splice(idx, 1);
        }
    }


    addScriptQueue(seq: A4ScriptExecutionQueue) {
        this.scriptQueues.push(seq);
    }


	// if an object is removed from a map, this needs to be called, to notify
	// the game that this happened.
	objectRemoved(o:A4Object)
    {
        let idx:number = this.players.indexOf(<A4PlayerCharacter>o);
        if (idx>=0) this.players.splice(idx,1);
        if (this.currentPlayer == o) {
            this.currentPlayerIndex = 0
            if (this.players.length>0) {
                this.currentPlayer = this.players[this.currentPlayerIndex];
            } else {
                this.currentPlayer = null;
            }
        }
        for(let map of this.maps) map.objectRemoved(o);    
        if (this.HUD_remote_inventory == o) {
            this.HUD_remote_inventory = null;
            if (this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) this.HUD_state = SHRDLU_HUD_STATE_INVENTORY;
        }    
    }


    contains(o:A4Object) : boolean
    {
        for(let o2 of this.deletionRequests) if (o2==o) return false;
        for(let map of this.maps) if (map.contains(o)) return true;
        return false;
    }


	// Teleports an object to a requested map and position. This queues up the request,
	// but it is not executed until at the end of a game cycle, to prevent this from 
	// happening while we are still looping through lists of objects (concurrent modification)
	// if "map" is 0, then the request is to remove the object from the maps (e.g., when an object is taken)
	requestWarp(o:A4Object, map:A4Map, x:number, y:number)//, layer:number)
  {
      this.warpRequests.push(new WarpRequest(o,map,x,y));
  }


  requestedWarp(o:A4Object)
  {
      for(let request of this.warpRequests) {
          if (request.o == o) return true;
      }
      return false;
  }


	// waits until the end of a cycle, and then deletes o
	requestDeletion(o:A4Object)
  {
      this.deletionRequests.push(o);
  }


  setStoryStateVariable(variable:string, value:string)
  {
      this.storyState[variable] = value;
      this.lastTimeStoryStateChanged = this.cycle;
  }


  getStoryStateVariable(variable:string) : string
  {
      return this.storyState[variable];
  }


  playSound(sound:string)
  {
      this.SFXM.play(sound);
  }


	getGraphicFile(file:string) : A4GraphicFile
    {
        for(let gf of this.graphicFiles) {
            if (file == gf.name) return gf;
        }
        return null;
    }

 
    getMap(name:string) : A4Map
    {
        for(let m of this.maps) {
            if (name == m.name) return m;
        }
        return null;
    }


    getMapIndex(name:string) : number
    {
        for(let m of this.maps) {
            if (name == m.name) return this.maps.indexOf(m);
        }
        return -1;
    }


	getCameraX(focus:A4Object, map_width:number, screen_width:number) : number
    {
        let target_x:number = 0;
        if (map_width<screen_width/this.zoom) {
            target_x = (map_width-screen_width/this.zoom)/2;
        } else {
            target_x = focus.x+this.tileWidth/2;
            target_x -= (screen_width/2)/this.zoom;

            if (target_x<0) target_x = 0;
            if (map_width - target_x < screen_width/this.zoom) target_x = map_width - screen_width/this.zoom;
        }
        target_x = Math.floor(target_x);
//        target_x  = (target_x - target_x%PIXEL_SIZE);
        return target_x;
    }


	getCameraY(focus:A4Object, map_height:number, screen_height:number) : number
    {
        let top_HUD:number = 40;
        let bottom_HUD:number = 56;
        let center_Y:number = (screen_height - (top_HUD + bottom_HUD))/2 + top_HUD;
        let target_y:number = 0;

        if (map_height<(screen_height-(top_HUD + bottom_HUD))/this.zoom) {
            target_y = (map_height - (center_Y*2)/this.zoom)/2;
        } else {
            target_y = focus.y+this.tileHeight/2;
            target_y -= (center_Y)/this.zoom;

            if (target_y < -top_HUD/this.zoom) target_y = -top_HUD/this.zoom; // 40 pixels to leave space for the HUD
            if (map_height - target_y < (screen_height-bottom_HUD)/this.zoom) target_y = map_height - (screen_height-bottom_HUD)/this.zoom;
        }
        target_y = Math.floor(target_y);
//        target_y  = (target_y - target_y%PIXEL_SIZE);
        return target_y;
    }


    setDoorGroupState(doorGroup:string, state:boolean, character:A4Character)
    {
        for(let map of this.maps) {
            map.setDoorGroupState(doorGroup, state, character, map, this);
        }
    }


    checkIfDoorGroupStateCanBeChanged(doorGroup:string, state:boolean, character:A4Character) : boolean
    {
        for(let map of this.maps) {
            if (!map.checkIfDoorGroupStateCanBeChanged(doorGroup, state, character, map, this)) return false;
        }
        return true;
    }
        

    addMessage(text:string)
    {
        this.addMessageWithColor(text, "white");
    }

    addMessageWithColor(text:string, color:string)
    {
        this.addMessageWithColorTime(text, color, this.in_game_seconds);
    }


	addMessageWithColorTime(text:string, color:string, timeStamp:number)
    {
        // split longer messages into different lines:
        let buffer:string = "";
        let last_space:number = 0;

        for(let i:number=0;i<text.length;i++) {
            buffer += text.charAt(i);
            if (text.charAt(i)==' ') last_space = i;
            if (buffer.length>=A4_MAX_MESSAGE_LENGTH) {
                if (last_space==0) {
                    // a single word doesn't fit, just split it!
                    this.messages.push([buffer,color,""+timeStamp]);
                    buffer = "";
                } else {
                    let backspaces:number = i - last_space;
                    let tmp:string = buffer.substring(0, buffer.length-backspaces);
                    this.messages.push([tmp,color,""+timeStamp]);
                    buffer = "  " + buffer.substring((buffer.length-backspaces));
                }
            }
        }
        if (buffer != "") this.messages.push([buffer,color,""+timeStamp]);
    }


    // message added only if the "originator" is in the same map as the "this.current_player"
    addMessageWithOriginator(originator:A4Object, msg:string) 
    {    
        if (this.currentPlayer.map != originator.map) return;
        this.addMessage(msg);
    }


    addMessageWithOriginatorAndColor(originator:A4Object, msg:string, color:string) 
    {    
        if (this.currentPlayer.map != originator.map) return;
        this.addMessageWithColor(msg, color);
    }


	// getting input form the player:
	playerInput_ToogleInventory() 
    {
        if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY ||
            this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
            this.HUD_state = SHRDLU_HUD_STATE_MESSAGES;
            this.HUD_remote_inventory = null;
        } else {
            this.HUD_state = SHRDLU_HUD_STATE_INVENTORY;
        }
    }

/*
    playerInput_RequestMessageMode()
    {
        if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY ||
            this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
            this.HUD_state = SHRDLU_HUD_STATE_MESSAGES;
            this.HUD_remote_inventory = null;
        }
    }
*/

    playerInput_UseItem() 
    {
        if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY) {
            if (!this.currentPlayer.isInVehicle() &&
                this.currentPlayer.selectedItem>=0) {
                this.playerInput_issueCommand(A4CHARACTER_COMMAND_USE,app.game.currentPlayer.selectedItem,A4_DIRECTION_NONE);
            }
        } else if (this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
            if (!this.currentPlayer.isInVehicle() &&
                this.HUD_remote_inventory_selected>=0 &&
                this.HUD_remote_inventory.content[this.HUD_remote_inventory_selected].takeable) {
                let item:A4Object = this.HUD_remote_inventory.content[this.HUD_remote_inventory_selected];
                let idx:number = this.HUD_remote_inventory.content.indexOf(item);
                this.HUD_remote_inventory.content.splice(idx,1);
                this.HUD_remote_inventory.objectRemoved(item);
                this.currentPlayer.inventory.push(item);
                this.HUD_remote_inventory_selected = -1;
                this.playSound("data/sfx/itemPickup.wav");
            }
        }
    }


    playerInput_DropItem() 
    {
        if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY) {
            if (!this.currentPlayer.isInVehicle() &&
                this.currentPlayer.selectedItem>=0) {
                let item:A4Object = this.currentPlayer.inventory[this.currentPlayer.selectedItem];
                if (item!=null && (<A4Item>item).droppable) {
                    this.playerInput_issueCommand(A4CHARACTER_COMMAND_DROP,app.game.currentPlayer.selectedItem,null);
                    this.currentPlayer.selectedItem = -1;
                }
            }
        } else if (this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
            if (!this.currentPlayer.isInVehicle() &&
                this.currentPlayer.selectedItem>=0) {
                let item:A4Object = this.currentPlayer.inventory[this.currentPlayer.selectedItem];
                if (item!=null && (<A4Item>item).droppable) {
                    let item:A4Object = this.currentPlayer.inventory[this.currentPlayer.selectedItem];
                    let idx:number = this.currentPlayer.inventory.indexOf(item);
                    this.currentPlayer.inventory.splice(idx,1);
                    this.HUD_remote_inventory.addContent(item);
                    this.currentPlayer.selectedItem = -1;
                    this.playSound("data/sfx/itemPickup.wav");
                }
            }
        }
    }
	

    playerInput_NextItem() 
    {
        this.currentPlayer.nextItem();
    }


    messageConsoleUp()
    {
        if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY) {
            this.currentPlayer.previousItem();


        } else if (this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
            if (this.currentPlayer.selectedItem == 0) {
                if (this.HUD_remote_inventory.content.length>0) {
                    this.currentPlayer.selectedItem =-1;
                    this.HUD_remote_inventory_selected = this.HUD_remote_inventory.content.length-1;
                } else {
                    this.currentPlayer.previousItem();
                }
            } else if (this.currentPlayer.selectedItem > 0) {
                this.currentPlayer.previousItem();
            } else if (this.HUD_remote_inventory_selected == 0) {
                this.HUD_remote_inventory_selected = -1;
                this.currentPlayer.previousItem();
            } else if (this.HUD_remote_inventory_selected > 0) {
                this.HUD_remote_inventory_selected--;
            } else {
                if (this.currentPlayer.inventory.length>0) {
                    this.currentPlayer.previousItem();
                } else {
                    if (this.HUD_remote_inventory.content.length>0) {
                        this.HUD_remote_inventory_selected = this.HUD_remote_inventory.content.length-1;
                    }
                }
            }


        } else {
            if (this.console_first_message>0) this.console_first_message--;
            if (this.console_first_message==-1 &&
                this.messages.length>A4_N_MESSAGES_IN_HUD) this.console_first_message = this.messages.length-(A4_N_MESSAGES_IN_HUD+1);
        }
    }


    messageConsoleDown()
    {
        if (this.HUD_state == SHRDLU_HUD_STATE_INVENTORY) {
            this.currentPlayer.nextItem();


        } else if (this.HUD_state == SHRDLU_HUD_STATE_SPLIT_INVENTORY) {
            if (this.currentPlayer.selectedItem>=0 &&
                this.currentPlayer.selectedItem == this.currentPlayer.inventory.length-1) {
                if (this.HUD_remote_inventory.content.length>0) {
                    this.currentPlayer.selectedItem =-1;
                    this.HUD_remote_inventory_selected = 0;
                } else {
                    this.currentPlayer.nextItem();
                }
            } else if (this.currentPlayer.selectedItem>=0 &&
                       this.currentPlayer.selectedItem < this.currentPlayer.inventory.length-1) {
                this.currentPlayer.nextItem();
            } else if (this.HUD_remote_inventory_selected>=0 &&
                       this.HUD_remote_inventory_selected == this.HUD_remote_inventory.content.length-1) {
                this.HUD_remote_inventory_selected = -1;
                this.currentPlayer.nextItem();
            } else if (this.HUD_remote_inventory_selected >= 0 &&
                       this.HUD_remote_inventory_selected < this.HUD_remote_inventory.content.length-1) {
                this.HUD_remote_inventory_selected++;
            } else {
                if (this.currentPlayer.inventory.length>0) {
                    this.currentPlayer.nextItem();
                } else {
                    if (this.HUD_remote_inventory.content.length>0) {
                        this.HUD_remote_inventory_selected = 0;
                    }
                }
            }


        } else {
            if (this.console_first_message!=-1) {
                if (this.console_first_message<this.messages.length-(A4_N_MESSAGES_IN_HUD+1)) {
                    this.console_first_message++;
                } else {
                    this.console_first_message = -1;
                }
            }
        }
    }


    playerInput_issueCommand(cmd:number, arg:number, direction:number) : number
    {
        /*
        if (cmd==A4CHARACTER_COMMAND_WALK) {
            // detect whether we should change "walk" to attack or talk if we walk against an enemy or npc:
            // only change action if there is an obstacle and we cannot walk around it:
            if (!this.currentPlayer.canMove(direction, false)) {
                let map:A4Map = this.currentPlayer.map;
                // detect whether we will collide with another character/object, and decide whether to change to another action:
                let collisions:A4Object[] = map.getAllObjectCollisionsWithOffset(this.currentPlayer, direction_x_inc[direction], direction_y_inc[direction]);
                for(let o of collisions) {
                    if (o.isCharacter()) {
                        // determine whether the character is friendly or unfriendly
                        if (o.isAICharacter()) {
                            let ai:A4AI = (<A4AICharacter>o).AI;
                            if (ai.isUnfriendly(this.currentPlayer.ID)) {
                                // attack!
                                this.currentPlayer.issueCommandWithArguments(A4CHARACTER_COMMAND_ATTACK, arg, direction, o, this);
                                return A4CHARACTER_COMMAND_ATTACK;
                            }
//                            if (ai.conversationGraph!=null) {
//                                // talk:
//                                // don't issue anything, the calling code will trigger the talk dialog
//                                return A4CHARACTER_COMMAND_TALK;
//                            }
                            this.currentPlayer.issueCommandWithArguments(cmd, arg, direction, null, this);
                            return cmd;
                        }
                    }
                }
            }
        }
        */
        this.currentPlayer.issueCommandWithArguments(cmd, arg, direction, null, this);
        return cmd;
    }


    playerInput_issueCommandWithOther(cmd:number, arg:number, target:A4Object)
    {
         this.currentPlayer.issueCommandWithArguments(cmd, arg, 0, target, this);
    }

    /*
    playerInput_issueCommandWithSpeechAct(cmd:number, sa:SpeechAct, direction:number)
    {
        this.currentPlayer.issueCommandWithSpeechAct(cmd, sa, direction, null, this);
    }
    */
    /*
	addSpeechAct(performative:number, keyword:string, text:string)
    {
        for(let sa of this.knownSpeechActs) {
            if (sa.performative == performative &&
                sa.keyword == keyword &&
                sa.text == text) return;
        }
        this.knownSpeechActs.push(new SpeechAct(performative, keyword, text));
    }
    */  

    // This function returns a list with the hierarchy of objects necessary to find the desired object
    // For example, if an object is directly in a map, the list with be length 1, but if 
    // the object is in the inventory of a character, then we will get a list with the character and then the object 
    findObjectByName(name:string) : A4Object[]
    {
        for(let m of this.maps) {
            let o2:A4Object[] = m.findObjectByName(name);
            if (o2!=null) return o2;
        }
        return null;
    }  


    findObjectByIDJustObject(ID:string) : A4Object
    {
        let tmp:A4Object[] = this.findObjectByID(ID);
        if (tmp == null) return null;
        return tmp[tmp.length-1];
    }


    // This function returns a list with the hierarchy of objects necessary to find the desired object
    // For example, if an object is directly in a map, the list with be length 1, but if 
    // the object is in the inventory of a character, then we will get a list with the character and then the object 
    findObjectByID(ID:string) : A4Object[]
    {
        for(let m of this.maps) {
            let o2:A4Object[] = m.findObjectByID(ID);
            if (o2!=null) return o2;
        }
        return null;
    }  


    getAILocation(o:A4Object) : AILocation
    {
        let map:A4Map = o.map;
        if (map==null) {
            let tmp:A4Object[] = this.findObjectByID(o.ID);
            if (tmp == null || tmp.length == 0) return null;
            if (tmp[0].map == null) return null;
            map = tmp[0].map;
            o = tmp[0];
        }
        let tile_x:number = Math.floor((o.x + o.getPixelWidth()/2)/map.tileWidth);
        let tile_y:number = Math.floor((o.y + o.tallness + (o.getPixelHeight() - o.tallness)/2)/map.tileHeight);
        return this.getAILocationTileCoordinate(map, tile_x, tile_y);
    }    


    getAILocationTileCoordinate(map:A4Map, tile_x:number, tile_y:number) : AILocation
    {
        let offset:number = tile_x + tile_y*map.width;
        let location:AILocation = null;
        let location_idx:number = -1;
        for(let location_idx2:number = 0;location_idx2<this.locations.length;location_idx2++) {
            let l:AILocation = this.locations[location_idx2];
            for(let i:number = 0;i<l.maps.length;i++) {
                if (l.maps[i] == map) {
                    if (l.mapOccupancyMaps[i][offset]) {
                        if (location == null) {
                            location = l;
                            location_idx = location_idx2;
                        } else {
                            if (this.location_in[location_idx2][location_idx]) {
                                location = l;
                                location_idx = location_idx2;
                            }
                        }
                    }
                }
            }
        }

        return location;
    }    


    getAILocationByID(id:string) : AILocation
    {
        for(let location of this.locations) {
            if (location.id == id) return location;
        }

        return null;
    }    


    turnLightOn(room:string) : boolean
    {
        if (this.rooms_with_lights_on.indexOf(room) == -1) {
            this.rooms_with_lights_on.push(room);
            for(let i:number = 0;i<this.maps.length;i++) {
                this.maps[i].recalculateLightsOnStatus(this.rooms_with_lights, this.rooms_with_lights_on, this.map_location_names[i]);
            }
            return true;
        } else {
            return false;
        }
    }


    turnLightOff(room:string) : boolean
    {
        if (this.rooms_with_lights_on.indexOf(room) != -1) {
            this.rooms_with_lights_on.splice(this.rooms_with_lights_on.indexOf(room), 1);
            for(let i:number = 0;i<this.maps.length;i++) {
                this.maps[i].recalculateLightsOnStatus(this.rooms_with_lights, this.rooms_with_lights_on, this.map_location_names[i]);
            }
            return true;
        } else {
            return false;
        }
    }


    takeRoverOutOfTheGarage(rover:A4Vehicle, player:A4Character) : boolean
    {
        // 1) spawn a new vehicle on the outside
        let newRover:A4Vehicle = <A4Vehicle>this.objectFactory.createObject("driveable-rover", this, true, false);
        if (newRover == null) return false;
        newRover.ID = rover.ID;
        newRover.direction = 2;
        let map:A4Map = this.getMap("Spacer Valley South")
        if (map == null) return false;
        if (!map.walkable(336, 408, 40, 40, newRover)) return false;
        newRover.warp(336, 408, map);

        // 2) remove rover from the game
        rover.map.removeObject(rover);
        this.requestDeletion(rover);

        // 3) teleport the player, and any other robots that were inside, and embark
        player.warp(336, 408, map);
        player.embark(newRover);
        if (this.qwertyAI.robot.vehicle == rover) {
            this.qwertyAI.robot.disembark();
            this.qwertyAI.robot.warp(336, 408, map);
            this.qwertyAI.robot.embark(newRover);
        }
        if (this.shrdluAI.robot.vehicle == rover) {
            this.shrdluAI.robot.disembark();
            this.shrdluAI.robot.warp(336, 408, map);
            this.shrdluAI.robot.embark(newRover);
        }

        return true;
    }


    takeShuttleToTrantorCrater(shuttle:A4Vehicle, player:A4Character) : boolean
    {
        // 1) spawn a new vehicle on the outside
        let newShuttle:A4Vehicle = <A4Vehicle>this.objectFactory.createObject("driveable-shuttle", this, true, false);
        if (newShuttle == null) return false;

        newShuttle.ID = shuttle.ID;
        newShuttle.direction = A4_DIRECTION_LEFT;
        let map:A4Map = this.getMap("Trantor Crater")
        if (map == null) return false;
        if (!map.walkable(57*8, 15*8, 40, 40, newShuttle)) return false;
        newShuttle.warp(57*8, 15*8, map);

        // 2) remove shuttle from the game
        shuttle.map.removeObject(shuttle);
        this.requestDeletion(shuttle);

        // 3) teleport the player, and any other robots that were inside, and embark
        player.warp(57*8, 15*8, map);
        player.embark(newShuttle);
        if (this.qwertyAI.robot.vehicle == shuttle) {
            this.qwertyAI.robot.disembark();
            this.qwertyAI.robot.warp(57*8, 15*8, map);
            this.qwertyAI.robot.embark(newShuttle);
        }
        if (this.shrdluAI.robot.vehicle == shuttle) {
            this.shrdluAI.robot.disembark();
            this.shrdluAI.robot.warp(57*8, 15*8, map);
            this.shrdluAI.robot.embark(newShuttle);
        }

        return true;
    }


    putRoverBackInGarage(rover:A4Vehicle) : boolean
    {
        // 1) spawn a new vehicle on the garage
        let newRover:A4Vehicle = <A4Vehicle>this.objectFactory.createObject("garage-rover", this, true, false);
        if (newRover == null) return false;
        newRover.ID = rover.ID;
        newRover.direction = 2;
        let map:A4Map = this.getMap("Aurora Station")
        if (map == null) return false;
        if (!map.walkable(848, 72, 40, 40, newRover)) return false;
        newRover.warp(848, 72, map);

        // 2) remove rover from the outside
        rover.disembark(this.currentPlayer);
        this.currentPlayer.state = A4CHARACTER_STATE_IDLE;
        this.currentPlayer.vehicle = null;
        rover.map.removeObject(rover);
        this.requestDeletion(rover);

        // 3) teleport the player, and any robots in the vehicle, and disembark
        this.currentPlayer.warp(848, 72, map);
        this.currentPlayer.embark(newRover);
        this.currentPlayer.disembark();

        if (this.qwertyAI.robot.vehicle == rover) {
            this.qwertyAI.robot.warp(848, 72, map);
            this.qwertyAI.robot.embark(newRover);
            this.qwertyAI.robot.disembark();
        }
        if (this.shrdluAI.robot.vehicle == rover) {
            this.shrdluAI.robot.warp(848, 72, map);
            this.shrdluAI.robot.embark(newRover);
            this.shrdluAI.robot.disembark();
        }

        return true;
    }


    takeShuttleFromTrantorCrater(shuttle:A4Vehicle) : boolean
    {
        // 1) spawn a new vehicle on the garage
        let newShuttle:A4Vehicle = <A4Vehicle>this.objectFactory.createObject("garage-shuttle", this, true, false);
        if (newShuttle == null) return false;
        newShuttle.ID = shuttle.ID;
        newShuttle.direction = 2;
        let map:A4Map = this.getMap("Aurora Station")
        if (map == null) return false;
        if (!map.walkable(848, 192, 40, 40, newShuttle)) return false;
        newShuttle.warp(848, 192, map);

        // 2) remove shuttle from the outside
        shuttle.disembark(this.currentPlayer);
        this.currentPlayer.state = A4CHARACTER_STATE_IDLE;
        this.currentPlayer.vehicle = null;
        shuttle.map.removeObject(shuttle);
        this.requestDeletion(shuttle);

        // 3) teleport the player, and any robots in the vehicle, and disembark
        this.currentPlayer.warp(848, 192, map);
        this.currentPlayer.embark(newShuttle);
        this.currentPlayer.disembark();

        if (this.qwertyAI.robot.vehicle == shuttle) {
            this.qwertyAI.robot.warp(848, 192, map);
            this.qwertyAI.robot.embark(newShuttle);
            this.qwertyAI.robot.disembark();
        }
        if (this.shrdluAI.robot.vehicle == shuttle) {
            this.shrdluAI.robot.warp(848, 192, map);
            this.shrdluAI.robot.embark(newShuttle);
            this.shrdluAI.robot.disembark();
        }

        return true;
    }


    /*
    - Prevents the robots from accidentally going to a map that they do not have permission to
    - This is to avoid edge cases where the player finds some unforeseen edge case to skip through important story plot points
    */
    checkPermissionToWarp(character:A4Character, target:A4Map) : boolean
    {
        if (character.ID == "qwerty") return false;
        if (character.ID == "shrdlu") {
            if (character.map.name == "Aurora Station" ||
                character.map.name == "Aurora Station Outdoors") {
                if (this.getStoryStateVariable("permission-to-take-shrdlu") == "false" &&
                    character.map.name != "Aurora Station" &&
                    character.map.name != "Aurora Station Outdoors") {
                    return false;
                }
            }
        }
        return true;
    }


    skipSpeechBubble() : boolean
    {
        if (this.cutSceneActivated >= 0) {
            this.cutScenes.ESCPressed(this.cutSceneActivated);
            return true;
        }

        if (this.currentPlayer.map.textBubbles.length > 0) {
            this.currentPlayer.map.textBubbles[0][1] = 0;
            return true;
        }
        for(let character of [this.currentPlayer, this.qwertyAI.robot, this.shrdluAI.robot]) {
            if (character.talkingBubble != null) {
                character.stateCycle = character.talkingBubbleDuration;
                return true;
            }
        }
        return false;
    }


    textInputRequest()
    {
        if (this.textInputAllowed) this.HUD_state = SHRDLU_HUD_STATE_MESSAGES_INPUT;
    }


    textInputExit()
    {
        this.HUD_state = SHRDLU_HUD_STATE_MESSAGES;
    }


    textInputSubmit(SFXM:SFXManager)
    {
        if (!this.textInputAllowed ||
            this.anyoneTalking()) {
//            SFXM.play("data/sfx/beep.wav");
            return;
        }
//        if (this.currentPlayer.isTalking()) return;
        this.HUD_state = SHRDLU_HUD_STATE_MESSAGES;
        if (this.HUD_text_input_buffer != "") {
            /*
            this.currentPlayer.map.addPerceptionBufferRecord(
                new PerceptionBufferRecord("talk", this.currentPlayer.ID, this.currentPlayer.sort, 
                                           null, null, this.HUD_text_input_buffer,
                                           null, null,
                                           this.currentPlayer.x, this.currentPlayer.y+this.currentPlayer.tallness, this.currentPlayer.x+this.currentPlayer.getPixelWidth(), this.currentPlayer.y+this.currentPlayer.getPixelHeight()));

            this.addMessageWithColor(">"+this.HUD_text_input_buffer, MSX_COLOR_LIGHT_GREEN);
            */
            this.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_TALK, this.HUD_text_input_buffer, A4_DIRECTION_NONE, this);
            this.inputBufferHistory.push(this.HUD_text_input_buffer);
            this.lastInputBufferBeforeBrowsingHistory = null;
            this.inputBufferHistory_position = -1;
            this.HUD_text_input_buffer = "";
            this.HUD_text_input_cursor = 0;
        }
    }


    textInputEvent(e:KeyboardEvent, SFXM:SFXManager)
    {
        let textInputLimit:number = 40;

//        console.log("key: " + e.key + ", keyCode:" + e.keyCode + ", modifiers: " + e.getModifierState("Shift") + " | " + e.getModifierState("CapsLock"));
        if (e.key.length == 1 && this.HUD_text_input_buffer.length <= textInputLimit) {
            if ((e.key >= 'a' && e.key <= 'z') ||
                (e.key >= 'A' && e.key <= 'Z') ||
                (e.key >= '0' && e.key <= '9') ||
                e.key == ' ' ||
                e.key == ',' ||
                e.key == '.' ||
                e.key == '\'' ||
                e.key == '?' ||
                e.key == '!' ||
                e.key == '-' ||
                // just for entering logic:
                e.key == '#' ||
                e.key == ':' ||
                e.key == '(' ||
                e.key == ')' ||
                e.key == '[' ||
                e.key == ']'
                ) {
                if (this.HUD_text_input_cursor == this.HUD_text_input_buffer.length) {
                    this.HUD_text_input_buffer += e.key;
                    this.HUD_text_input_cursor ++;
                } else {
                    this.HUD_text_input_buffer = this.HUD_text_input_buffer.substring(0,this.HUD_text_input_cursor) +
                                                  e.key +
                                                  this.HUD_text_input_buffer.substring(this.HUD_text_input_cursor);
                    this.HUD_text_input_cursor ++;
                }
            }
        } else if (e.key == "ArrowRight") {
            if (this.HUD_text_input_cursor<this.HUD_text_input_buffer.length) this.HUD_text_input_cursor++;
        } else if (e.key == "ArrowLeft") {
            if (this.HUD_text_input_cursor>0) this.HUD_text_input_cursor--;
        } else if (e.key == "ArrowUp") {
            if (this.inputBufferHistory_position == -1) {
                this.lastInputBufferBeforeBrowsingHistory = this.HUD_text_input_buffer;
                if (this.inputBufferHistory.length > 0) {
                    this.inputBufferHistory_position = this.inputBufferHistory.length-1;
                    this.HUD_text_input_buffer = this.inputBufferHistory[this.inputBufferHistory_position];
                    this.HUD_text_input_cursor = this.HUD_text_input_buffer.length;
                }
            } else {
                if (this.inputBufferHistory_position>0) {
                    this.inputBufferHistory_position--;
                    this.HUD_text_input_buffer = this.inputBufferHistory[this.inputBufferHistory_position];
                    this.HUD_text_input_cursor = this.HUD_text_input_buffer.length;
                }
            }
        } else if (e.key == "ArrowDown") {
            if (this.inputBufferHistory_position>=0 && this.inputBufferHistory_position<this.inputBufferHistory.length-1) {
                this.inputBufferHistory_position++;
                this.HUD_text_input_buffer = this.inputBufferHistory[this.inputBufferHistory_position];
                this.HUD_text_input_cursor = this.HUD_text_input_buffer.length;
            } else {
                if (this.inputBufferHistory_position>=0 && this.inputBufferHistory_position == this.inputBufferHistory.length-1) {
                    this.HUD_text_input_buffer = this.lastInputBufferBeforeBrowsingHistory;
                    this.lastInputBufferBeforeBrowsingHistory = null;
                    this.inputBufferHistory_position = -1;
                    this.HUD_text_input_cursor = this.HUD_text_input_buffer.length;
                }
            }
        } else if (e.key == "Backspace") {
            if (this.HUD_text_input_cursor>0) {
                if (this.HUD_text_input_cursor == this.HUD_text_input_buffer.length) {
                    this.HUD_text_input_cursor--;
                    this.HUD_text_input_buffer = this.HUD_text_input_buffer.substring(0,this.HUD_text_input_cursor);
                } else {
                    this.HUD_text_input_cursor--;
                    this.HUD_text_input_buffer = this.HUD_text_input_buffer.substring(0,this.HUD_text_input_cursor) +
                                                  this.HUD_text_input_buffer.substring(this.HUD_text_input_cursor+1);
                }                
            }
        } else if (e.key == "Delete") {
            if (this.HUD_text_input_cursor < this.HUD_text_input_buffer.length) {
                this.HUD_text_input_buffer = this.HUD_text_input_buffer.substring(0,this.HUD_text_input_cursor) +
                                              this.HUD_text_input_buffer.substring(this.HUD_text_input_cursor+1);
            }                
        }
        if (this.HUD_text_input_cursor > textInputLimit) {
            this.HUD_text_input_cursor = textInputLimit;
            SFXM.play("data/sfx/beep.wav");
        }
    }


    /*
    Checks to see if there is any repeated IDs, and returns false if there are any repeated, pringing info about them
    */
    ensureUniqueObjectIDs()
    {
        let IDs:string[] = [];

        for(let map of this.maps) {
            for(let object of map.objects) {
                let ID:string = object.ID;
                if (IDs.indexOf(ID) >= 0) {
                    console.error("Repeated ID: " + ID + " in map " + map.name);
                }
                IDs.push(ID);
                if (object instanceof A4Character) {
                    for(let o2 of (<A4Character>object).inventory) {
                        let ID2:string = o2.ID;
                        if (IDs.indexOf(ID2) >= 0) {
                            console.error("Repeated ID: " + ID2 + " in map " + map.name);
                        }
                        IDs.push(ID2);
                    }
                }
                if (object instanceof A4Container) {
                    for(let o2 of (<A4Container>object).content) {
                        let ID2:string = o2.ID;
                        if (IDs.indexOf(ID2) >= 0) {
                            console.error("Repeated ID: " + ID2 + " in map " + map.name);
                        }
                        IDs.push(ID2);
                    }
                }
            }
        }
        //console.log("IDs: " + IDs);
    }


    xml:Element = null;    // the XML definition of the game

	  sfx_volume:number;
    drawTextBubbles:boolean = true;
    
    gameName:string = null;
    gameTitle:string = null;
    gameSubtitle:string = null;
    gameTitleImage:string = null;
    storyText:string[] = null;
    endingIDs:string[] = [];
    endingTexts:string[][] = [];

    allowSaveGames:boolean = false;

    characterDefinitionFiles:string[] = [];
    objectDefinitionFiles:string[] = [];
    
	  cycle:number = 0;
    cycles_without_redrawing:number = 0;
    gameComplete:boolean = false;
    gameComplete_ending_ID:string = null;

  	game_path:string = null;
  	GLTM:GLTManager = null;
  	SFXM:SFXManager = null;
    graphicFiles:A4GraphicFile[] = [];
  	objectFactory:A4ObjectFactory = new A4ObjectFactory();
  	tileWidth:number = 16;
    tileHeight:number = 16;

    // AI:
    ontology:Ontology = new Ontology();

	  // HUD:
    HUD_state:number = SHRDLU_HUD_STATE_MESSAGES;
    messages:string[][] = [];    // [text, color, timestamp]
    trade_requested:A4Character = null;
    console_first_message:number = -1;
    HUD_hseparator:GLTile = null;
    HUD_vseparator:GLTile = null;
    HUD_tseparator:GLTile = null;
    HUD_uparrow1:GLTile = null;
    HUD_uparrow2:GLTile = null;
    HUD_downarrow1:GLTile = null;
    HUD_downarrow2:GLTile = null;
    HUD_button1:GLTile = null;
    HUD_button2:GLTile = null;
    HUD_oxygen:GLTile = null;
    HUD_oxygen_bar:GLTile = null;
    HUD_inventory_start:number = 0;
    HUD_remote_inventory_start:number = 0;
    HUD_remote_inventory:A4Container = null;
    HUD_remote_inventory_selected:number = -1;

    HUD_text_input_buffer:string = "";
    HUD_text_input_cursor:number = 0;
    inputBufferHistory:string[] = [];    // messages typed by the player, so that she can browse it quickly ussing up/down
    inputBufferHistory_position:number = -1;
    lastInputBufferBeforeBrowsingHistory:string = null;

    maps:A4Map[] = [];

    players:A4PlayerCharacter[] = [];
    currentPlayer:A4PlayerCharacter = null;
    currentPlayerIndex:number = 0;
    
  	warpRequests:WarpRequest[] = [];
  	deletionRequests:A4Object[] = [];
      
  	// camera:
    zoom:number = 1;
    targetZoom:number = 1;
    defaultZoom:number = 1;

  	// scripts:
    eventScripts:A4EventRule[][] = new Array(A4_NEVENTS);

    // script excution queues (these contain scripts that are pending execution, will be executed in the next "cycle"):
    scriptQueues: A4ScriptExecutionQueue[] = [];

    // story state:
    storyState: { [id: string] : string; } = {};
    lastTimeStoryStateChanged:number = 0;
    //    knownSpeechActs:SpeechAct[] = [];

    //<shrdlu-specific>
    naturalLanguageParser:NLParser = null;
    naturalLanguageGenerator:NLGenerator = null;
    etaoinAI:EtaoinAI = null;
    qwertyAI:QwertyAI = null;
    shrdluAI:ShrdluAI = null;

    communicatorConnectedTo:string = null;
    communicatorConnectionTime:number = 0;

    gameScript:ShrdluGameScript = null;
    cutScenes:ShrdluCutScenes = null;
    textInputAllowed:boolean = false;

    eyesClosedState:number = 0;    // 0: eyes closed, 1: opening, 2: open, 3: closing
    eyesClosedTimer:number = 0;

    narrationMessages:string[] = []

    cutSceneActivated:number = -1;
    introact_request:number = 0;    // to notify the A4GameApp that an act is over, and we need to introduce the next one
    gameover_request:number = 0;    // to notify the A4GameApp that player is dead, and we need to go to the game over state

    locations:AILocation[] = [];
    location_in:boolean[][];
    location_connects:boolean[][];
    map_location_names:string[][];
    additional_location_connects:[string,string][] = [];

    in_game_seconds:number = SHRDLU_START_DATE;
    suit_oxygen:number = SHRDLU_MAX_SPACESUIT_OXYGEN;
    comm_tower_repaired:boolean = false;
    rooms_with_lights:string[] = [];
    rooms_with_lights_on:string[] = [];

    aurora_station_temperature_sensor_indoors:number = 20;
    aurora_station_temperature_sensor_outdoors:number = 44;

    error_messages_for_log:string[][] = [];
    in_game_actions_for_log:string[][] = [];

    three_d_printer_recipies:[string, string[]][];
    //</shrdlu-specific>

}


