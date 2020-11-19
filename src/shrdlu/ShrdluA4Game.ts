var LOG_ACTIONS_IN_DEBUG_LOG:boolean = false;

var SHRDLU_INVENTORY_DISPLAY_SIZE:number = 12;
var SHRDLU_HUD_STATE_MESSAGES:number = 0;
var SHRDLU_HUD_STATE_MESSAGES_INPUT:number = 1;
var SHRDLU_HUD_STATE_INVENTORY:number = 2;
var SHRDLU_HUD_STATE_SPLIT_INVENTORY:number = 3;

var SHRDLU_MAX_SPACESUIT_OXYGEN:number = 8*50*60;    // 8 minutes of game time
var COMMUNICATOR_CONNECTION_TIMEOUT:number = 50*60;    // 1 minute of game time

var SHRDLU_START_DATE:number = 45186163200;    // Thursday, October 21st, 2432
var SHRDLU_TILE_SIZE:number = 8;

var SPACE_NEAR_FAR_THRESHOLD:number = 12;  // in meters

var EYESOPEN_SPEED:number = 180;


class ShrdluA4Game extends A4Game {

    constructor(xml:Element, game_path:string, ontology_path:string, GLTM:GLTManager, SFXM:SFXManager, a_sfx_volume:number, gender:string, app:ShrdluApp)
    {
        super(xml, game_path, ontology_path, GLTM, SFXM, new ShrdluA4ObjectFactory(), a_sfx_volume);
        this.playerGender = gender;
        this.in_game_seconds = SHRDLU_START_DATE;
        this.app = app;

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


    loadContentFromXML(xml:Element, game_path:string, ontology_path:string, GLTM:GLTManager, SFXM:SFXManager)
    {
        this.serverToken = xml.getAttribute("serverToken") || '';
    	  super.loadContentFromXML(xml, game_path, ontology_path, GLTM, SFXM);
    }


    // if "saveGameXml" is != null, this is a call to restore from a save state
    finishLoadingGame(saveGameXml:Element)
    {
        // overwrite spawned characters:
        if (this.playerGender == null) {
          // if no player gender specified, read it from the xml file:
          for(let variable_xml of getElementChildrenByTag(this.xml, "variable")) {
              let vname:string = variable_xml.getAttribute("name");
              if (vname == "playerGender") this.playerGender = variable_xml.getAttribute("value");
          }        
        }
        let players_xml:Element[] = getElementChildrenByTag(this.xml, "player");
        for(let i:number = 0;i<players_xml.length;i++) {
            let player_xml:Element = players_xml[i];
            if (this.playerGender == "female") player_xml.setAttribute("class", "susan");
            if (this.playerGender == "male") player_xml.setAttribute("class", "david");
		    }  

    	  super.finishLoadingGame(saveGameXml);

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
        this.naturalLanguageParser.talkingTargets = ["player", "shrdlu", "qwerty", "etaoin"];

        // load the AIs:
        this.etaoinAI = new EtaoinAI(this.ontology, this.naturalLanguageParser, [], this, 
                                      ["data/general-kb.xml","data/etaoin-kb.xml"]);
        this.qwertyAI = new QwertyAI(this.ontology, this.naturalLanguageParser, <A4AICharacter>(this.findObjectByName("Qwerty")[0]), this, 
                                      ["data/general-kb.xml","data/qwerty-kb.xml"]);
        this.shrdluAI = new ShrdluAI(this.ontology, this.naturalLanguageParser, <A4AICharacter>(this.findObjectByName("Shrdlu")[0]), this, 
                                      ["data/general-kb.xml","data/shrdlu-kb.xml"]);

        if (LOG_ACTIONS_IN_DEBUG_LOG) {
          this.debugActionLog = [];
          this.debugTextBubbleLog = [];
          this.etaoinAI.debugActionLog = this.debugActionLog;
          this.qwertyAI.debugActionLog = this.debugActionLog;
          this.shrdluAI.debugActionLog = this.debugActionLog;
        }

        if (saveGameXml) {
            let ais_xml:Element[] = getElementChildrenByTag(saveGameXml, "RuleBasedAI");
            this.etaoinAI.restoreFromXML(ais_xml[0]);
            this.qwertyAI.restoreFromXML(ais_xml[1]);
            this.shrdluAI.restoreFromXML(ais_xml[2]);
        }

        Sort.precomputeIsA();

        this.gameScript = new ShrdluGameScript(this, this.app);
        this.cutScenes = new ShrdluCutScenes(this, this.app);

        // preload the images:
        this.GLTM.get("data/cutscene-corpse1.png");
        this.GLTM.get("data/cutscene-diary1.png");
        this.GLTM.get("data/cutscene-poster1.png");
        this.GLTM.get("data/cutscene-death-oxygen.png");

        for(let variable_xml of getElementChildrenByTag(this.xml, "variable")) {
            let vname:string = variable_xml.getAttribute("name");
            if (vname == "serverToken") this.serverToken = variable_xml.getAttribute("value");
            if (vname == "communicatorConnectedTo") this.communicatorConnectedTo = variable_xml.getAttribute("value");
            if (vname == "communicatorConnectionTime") this.communicatorConnectionTime = Number(variable_xml.getAttribute("value"));
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
            if (vname == "errorMessagesForLog") {
                for(let tmp_xml of getElementChildrenByTag(variable_xml, "message")) {
                    let tmp_array:string[] = tmp_xml.firstChild.nodeValue.split("\t");
                    if (tmp_array[tmp_array.length-1] == "") tmp_array.splice(tmp_array.length-1, 1);
                    this.errorMessagesForLog.push(tmp_array);
                }
            }
            if (vname == "inGameActionsForLog") {
                for(let tmp_xml of getElementChildrenByTag(variable_xml, "action")) {
                    let tmp_array:string[] = tmp_xml.firstChild.nodeValue.split("\t");
                    if (tmp_array[tmp_array.length-1] == "") tmp_array.splice(tmp_array.length-1, 1);
                    this.inGameActionsForLog.push(tmp_array);
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
      	super.saveGame(saveName);
        let complete_xmlString:string = "<SHRDLU_savegame>\n";
        let xmlString:string = this.saveToXML();
        console.log("A4Game.saveGame: game xmlString length " + xmlString.length);

        complete_xmlString += xmlString;

        for(let i:number = 0;i<this.maps.length;i++) {
            xmlString = this.maps[i].saveToXML(this);
            complete_xmlString += "\n\n\n" + xmlString;
            console.log("A4Game.saveGame: map "+i+" xmlString length " + xmlString.length);

        }

        xmlString = this.etaoinAI.saveToXML();
        complete_xmlString += "\n\n\n" + xmlString;
        console.log("A4Game.saveGame: etaoin xmlString length " + xmlString.length);

        xmlString = this.qwertyAI.saveToXML();
        complete_xmlString += "\n\n\n" + xmlString;
        console.log("A4Game.saveGame: qwerty xmlString length " + xmlString.length);

        xmlString = this.shrdluAI.saveToXML();
        complete_xmlString += "\n\n\n" + xmlString;
        console.log("A4Game.saveGame: shrdlu xmlString length " + xmlString.length);

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



    saveToXMLInnerContent() : string
    {
      	let xmlString:string = super.saveToXMLInnerContent();

        xmlString += "<variable name=\"serverToken\" value=\"" + this.serverToken + "\"/>\n";

        if (this.communicatorConnectedTo != null) {
            xmlString += "<variable name=\"communicatorConnectedTo\" value=\"" + this.communicatorConnectedTo + "\"/>\n";
            xmlString += "<varuable name=\"communicatorConnectionTime\" value=\"" + this.communicatorConnectionTime + "\"/>\n";
        }

        // game variables
        xmlString += "<variable name=\"playerGender\" value=\""+this.playerGender+"\"/>\n";
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
        xmlString += "<variable name=\"errorMessagesForLog\">\n";
        for(let m of this.errorMessagesForLog) {
            xmlString += "<message>";
            for(let tmp of m) xmlString += tmp + "\t";
            xmlString += "</message>\n";
        }
        xmlString += "</variable>\n";
        xmlString += "<variable name=\"inGameActionsForLog\">\n";
        for(let m of this.inGameActionsForLog) {
            xmlString += "<action>";
            for(let tmp of m) xmlString += tmp + "\t";
            xmlString += "</action>\n";
        }
        xmlString += "</variable>\n";

        xmlString += this.gameScript.saveToXML();

        return xmlString;
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
        newRover.warp(336, 408+16, map);

        // 2) remove rover from the game
        rover.map.removeObject(rover);
        this.requestDeletion(rover);

        // 3) teleport the player, and any other robots that were inside, and embark
        player.warp(336, 408+16, map);
        player.embark(newRover);
        if (this.qwertyAI.robot.vehicle == rover) {
            this.qwertyAI.robot.disembark();
            this.qwertyAI.robot.warp(336, 408+16, map);
            this.qwertyAI.robot.embark(newRover);
        }
        if (this.shrdluAI.robot.vehicle == rover) {
            this.shrdluAI.robot.disembark();
            this.shrdluAI.robot.warp(336, 408+16, map);
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
        newShuttle.warp(57*8, 15*8+16, map);

        // 2) remove shuttle from the game
        shuttle.map.removeObject(shuttle);
        this.requestDeletion(shuttle);

        // 3) teleport the player, and any other robots that were inside, and embark
        player.warp(57*8, 15*8+16, map);
        player.embark(newShuttle);
        if (this.qwertyAI.robot.vehicle == shuttle) {
            this.qwertyAI.robot.disembark();
            this.qwertyAI.robot.warp(57*8, 15*8+16, map);
            this.qwertyAI.robot.embark(newShuttle);
        }
        if (this.shrdluAI.robot.vehicle == shuttle) {
            this.shrdluAI.robot.disembark();
            this.shrdluAI.robot.warp(57*8, 15*8+16, map);
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
        newRover.warp(848, 72+16, map);

        // 2) remove rover from the outside
        rover.disembark(this.currentPlayer);
        this.currentPlayer.state = A4CHARACTER_STATE_IDLE;
        this.currentPlayer.vehicle = null;
        rover.map.removeObject(rover);
        this.requestDeletion(rover);

        // 3) teleport the player, and any robots in the vehicle, and disembark
        this.currentPlayer.warp(848, 72+16, map);
        this.currentPlayer.embark(newRover);
        this.currentPlayer.disembark();

        if (this.qwertyAI.robot.vehicle == rover) {
            this.qwertyAI.robot.warp(848, 72+16, map);
            this.qwertyAI.robot.embark(newRover);
            this.qwertyAI.robot.disembark();
        }
        if (this.shrdluAI.robot.vehicle == rover) {
            this.shrdluAI.robot.warp(848, 72+16, map);
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
        newShuttle.warp(848, 192+16, map);

        // 2) remove shuttle from the outside
        shuttle.disembark(this.currentPlayer);
        this.currentPlayer.state = A4CHARACTER_STATE_IDLE;
        this.currentPlayer.vehicle = null;
        shuttle.map.removeObject(shuttle);
        this.requestDeletion(shuttle);

        // 3) teleport the player, and any robots in the vehicle, and disembark
        this.currentPlayer.warp(848, 192+16, map);
        this.currentPlayer.embark(newShuttle);
        this.currentPlayer.disembark();

        if (this.qwertyAI.robot.vehicle == shuttle) {
            this.qwertyAI.robot.warp(848, 192+16, map);
            this.qwertyAI.robot.embark(newShuttle);
            this.qwertyAI.robot.disembark();
        }
        if (this.shrdluAI.robot.vehicle == shuttle) {
            this.shrdluAI.robot.warp(848, 192+16, map);
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
        if (!super.checkPermissionToWarp(character, target)) return false;
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


    updateNoAIs(k:KeyboardState) : boolean
    {
        if (!this.updateInternal(k, [this.shrdluAI.robot.map])) return false;
        if (!this.updateInternalShrdlu(k, false)) return false;
        
        this.cycle++;
        this.in_game_seconds++;    // we keep a separate count from cycles, since in some game scenes, time might advance faster
        if (this.cycles_without_redrawing > 0) this.cycles_without_redrawing--;

        return true;
    }


    update(k:KeyboardState) : boolean
    {
        if (!this.updateInternalShrdlu(k, true)) return false;

        this.cycle++;
        this.in_game_seconds++;    // we keep a separate count from cycles, since in some game scenes, time might advance faster
        if (this.cycles_without_redrawing > 0) this.cycles_without_redrawing--;

        return true;
    }


    updateInternalShrdlu(k:KeyboardState, updateAIs:boolean) : boolean
    {
        if (this.cycle != 0) {
            // do not execute a story update on the first cycle, since that's when all the "onStart" methods are started,
            // which can mess up with the story
            this.gameScript.update();            
        }

        if (this.cutSceneActivated >= 0) {
            if (this.cutScenes.update(this.cutSceneActivated, k)) {
                this.cutSceneActivated = -1;
            } else {
              return true;
            }
        }

        if (!super.updateInternal(k, [this.shrdluAI.robot.map])) return false;

        if (updateAIs) {
          this.etaoinAI.update(this.in_game_seconds);
          this.qwertyAI.update(this.in_game_seconds);
          this.shrdluAI.update(this.in_game_seconds);
        }

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
            if ((this.etaoinAI.timeStamp - this.communicatorConnectionTime) > COMMUNICATOR_CONNECTION_TIMEOUT) {
                this.communicatorConnectedTo = null;
                this.communicatorConnectionTime = 0;
            }
        }

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

        super.draw(screen_width, screen_height);

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
            let ty:number = Math.floor(this.currentPlayer.y/this.tileHeight);
            map.drawRegion(mapx, mapy, this.zoom, screen_width, screen_height, map.visibilityRegion(tx,ty), this);
            this.drawEyesclosedCover(screen_width, screen_height);
            map.drawTextBubblesRegion(mapx, mapy, this.zoom, screen_width, screen_height, map.visibilityRegion(tx,ty), this);
        } else {
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
        super.drawHUD(screen_width, screen_height, split);

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
            if (this.etaoinAI.currentInferenceProcess != null) {
                // etaoin is thinking:
                ctx.fillStyle = MSX_COLOR_BLACK;
                ctx.fillRect(2*PIXEL_SIZE,thinkingY*PIXEL_SIZE,130*PIXEL_SIZE,10*PIXEL_SIZE);
                ctx.fillStyle = MSX_COLOR_WHITE;
                ctx.fillText("Etaoin is thinking...",2*PIXEL_SIZE,(thinkingY+1)*PIXEL_SIZE);
                thinkingY-=10;
            }
            if (this.qwertyAI.currentInferenceProcess != null) {
                // etaoin is thinking:
                ctx.fillStyle = MSX_COLOR_BLACK;
                ctx.fillRect(2*PIXEL_SIZE,thinkingY*PIXEL_SIZE,130*PIXEL_SIZE,10*PIXEL_SIZE);
                ctx.fillStyle = MSX_COLOR_WHITE;
                ctx.fillText("Qwerty is thinking...",2*PIXEL_SIZE,(thinkingY+1)*PIXEL_SIZE);
                thinkingY-=10;
            }
            if (this.shrdluAI.currentInferenceProcess != null) {
                // etaoin is thinking:
                ctx.fillStyle = MSX_COLOR_BLACK;
                ctx.fillRect(2*PIXEL_SIZE,thinkingY*PIXEL_SIZE,130*PIXEL_SIZE,10*PIXEL_SIZE);
                ctx.fillStyle = MSX_COLOR_WHITE;
                ctx.fillText("Shrdlu is thinking...",2*PIXEL_SIZE,(thinkingY+1)*PIXEL_SIZE);
                thinkingY-=10;
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
        let tile_y:number = Math.floor((o.y + o.getPixelHeight()/2)/map.tileHeight);
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


    skipSpeechBubble() : boolean
    {
        if (this.cutSceneActivated >= 0) {
            this.cutScenes.ESCPressed(this.cutSceneActivated);
            return true;
        }

        if (super.skipSpeechBubble()) return;

        for(let character of [this.qwertyAI.robot, this.shrdluAI.robot]) {
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
                                           this.currentPlayer.x, this.currentPlayer.y, this.currentPlayer.x+this.currentPlayer.getPixelWidth(), this.currentPlayer.y+this.currentPlayer.getPixelHeight()));

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


    checkCustomVehicleCollisionEvents(vehicle:A4Vehicle)
    {
        //  check if we have collided with the station, and get the rover into the garage:
        if (vehicle.map.name == "Spacer Valley South" &&
            ((vehicle.direction == A4_DIRECTION_LEFT && vehicle.x == 38*vehicle.map.tileWidth &&
              vehicle.y >= 47*vehicle.map.tileHeight && vehicle.y <= 60*vehicle.map.tileHeight) ||
             (vehicle.direction == A4_DIRECTION_RIGHT && vehicle.x == 28*vehicle.map.tileWidth &&
              vehicle.y >= 47*vehicle.map.tileHeight && vehicle.y <= 60*vehicle.map.tileHeight) ||

             (vehicle.direction == A4_DIRECTION_DOWN && vehicle.y == 47*vehicle.map.tileHeight &&
              vehicle.x >= 29*vehicle.map.tileWidth && vehicle.x <= 37*vehicle.map.tileWidth) ||
             (vehicle.direction == A4_DIRECTION_UP && vehicle.y == 54*vehicle.map.tileHeight &&
              vehicle.x >= 29*vehicle.map.tileWidth && vehicle.x <= 37*vehicle.map.tileWidth)
            )) {
            if (!this.putRoverBackInGarage(vehicle)) {
                this.addMessage("There is something in the garage blocking the parking spot!");
            }
        }

        // check if we need to go back to the station with the shuttle:
        if (vehicle.map.name == "Trantor Crater" &&
            vehicle.direction == A4_DIRECTION_RIGHT && vehicle.x == 59*vehicle.map.tileWidth) {

            // Make sure Shrdlu is in the shuttle, just in case:
            if (vehicle.load.indexOf(this.shrdluAI.robot) == -1) {
                this.currentPlayer.issueCommandWithString(A4CHARACTER_COMMAND_THOUGHT_BUBBLE, 
                                         "I cannot leave Shrdlu behind!", A4_DIRECTION_NONE, this);
            } else {
                if (!this.takeShuttleFromTrantorCrater(vehicle)) {
                    this.addMessage("There is something in the garage blocking the parking spot!");
                } else {
                    this.cutSceneActivated = CUTSCENE_SHUTTLE_LAND;
                }
            }
        }    
    }

    app:ShrdluApp = null;

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

    playerGender: string = null;
    suit_oxygen:number = SHRDLU_MAX_SPACESUIT_OXYGEN;
    comm_tower_repaired:boolean = false;
    rooms_with_lights:string[] = [];
    rooms_with_lights_on:string[] = [];

    aurora_station_temperature_sensor_indoors:number = 20;
    aurora_station_temperature_sensor_outdoors:number = 44;

    three_d_printer_recipies:[string, string[]][];

    // if these are != null, each time an AI executes an action, or a text bubble is created, it will be logged here:
    debugActionLog:IntentionRecord[] = null;
    // debugTextBubbleLog:[number,string,A4TextBubble][] = null;  // this is already defined in A4Game

    // serverToken is immutable after initialization
    serverToken: string = '';
 }

