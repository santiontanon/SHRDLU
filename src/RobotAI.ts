class RobotAI extends A4RuleBasedAI {
	constructor(o:Ontology, nlp:NLParser, robot:A4AICharacter, game:A4Game,
				rulesFileNames:string[])
	{
		super(o, nlp, game, 12, 4, DEFAULT_QUESTION_PATIENCE_TIMER);
		console.log("RobotAI.constructor Start...");

		this.robot = robot;

		this.intentionHandlers.push(new RobotFollow_IntentionAction());

		this.intentionHandlers.push(new RobotTalk_IntentionAction());
		this.intentionHandlers.push(new RobotGo_IntentionAction());
		this.intentionHandlers.push(new RobotTakeTo_IntentionAction());
		this.intentionHandlers.push(new RobotStop_IntentionAction());
		this.intentionHandlers.push(new RobotTake_IntentionAction());
		this.intentionHandlers.push(new RobotPutIn_IntentionAction());
		this.intentionHandlers.push(new RobotGive_IntentionAction());
		this.intentionHandlers.push(new RobotOpenClose_IntentionAction());

		// load specific knowledge:
		for(let rulesFileName of rulesFileNames) {
			var xmlhttp:XMLHttpRequest = new XMLHttpRequest();
			xmlhttp.overrideMimeType("text/xml");
			xmlhttp.open("GET", rulesFileName, false); 
			xmlhttp.send();
			this.loadLongTermRulesFromXML(xmlhttp.responseXML.documentElement);
		}

		this.precalculateLocationKnowledge(game, o);

		this.robot.AI.doorsNotToOpenWhileWalking = this.doorsPlayerIsNotPermittedToOpen;

		console.log("RobotAI.constructor end...");
	}


	update(timeStamp:number) 
	{
		super.update(timeStamp);

		// continuous actions:
        if (this.currentActionHandler != null &&
        	this.currentActionHandler.needsContinuousExecution) {
        	if (this.currentActionHandler.executeContinuous(this)) {
				this.addLongTermTerm(new Term(this.o.getSort("verb.do"),
											  [new ConstantTermAttribute(this.selfID,this.cache_sort_id),
											   new ConstantTermAttribute("nothing",this.o.getSort("nothing"))]), PERCEPTION_PROVENANCE);
        		this.currentAction = null;
        		this.currentActionHandler = null;
        		this.currentAction_requester = null;
        	}
        }

		this.executeScriptQueues();
	}


	attentionAndPerception()
	{
		this.clearPerception();

		// just perceive an area around the robot:
		var attention_map:A4Map = this.robot.map;
		var attention_x:number = this.robot.x + this.robot.getPixelWidth()/2;
		var attention_y:number = this.robot.y + this.robot.tallness + (this.robot.getPixelHeight() - this.robot.tallness)/2;

		// find the AILocation:
		var location:AILocation = null;
		var location_idx:number = -1;
		var occupancyMap:boolean[] = null;
		var tile_x:number = Math.floor(attention_x/attention_map.tileWidth);
		var tile_y:number = Math.floor(attention_y/attention_map.tileHeight);
		var offset:number = tile_x + tile_y*attention_map.width;
		for(let location_idx2:number = 0;location_idx2<this.game.locations.length;location_idx2++) {
			var l:AILocation = this.game.locations[location_idx2];
			for(let i:number = 0;i<l.maps.length;i++) {
				if (l.maps[i] == attention_map) {
					if (l.mapOccupancyMaps[i][offset]) {
						if (location == null) {
							location = l;
							location_idx = location_idx2;
							occupancyMap = l.mapOccupancyMaps[i];
						} else {
							if (this.game.location_in[location_idx2][location_idx]) {
								location = l;
								location_idx = location_idx2;
								occupancyMap = l.mapOccupancyMaps[i];
							}
						}
					}
				}
			}
		}
		//console.log("RobotAI: attention = " + attention_object.name + " at " + attention_map.name + ", " + location.name);

		var visibilityRegion:number = this.robot.map.visibilityRegion(tile_x,tile_y);

		// perception:
		for(let o of this.robot.inventory) {
			// perceived an object!
			var term1:Term = new Term(o.sort, [new ConstantTermAttribute(o.ID, this.cache_sort_id)]);
			var term2:Term = new Term(this.cache_sort_space_at, 
									  [new ConstantTermAttribute(o.ID, this.cache_sort_id),
									   new ConstantTermAttribute(location.id, this.cache_sort_id)
									   ]);
			this.addTermToPerception(term1);
			this.addTermToPerception(term2);
			for(let property of this.getBaseObjectProperties(o)) {
				this.addTermToPerception(property);
				this.addTermToPerception(new Term(this.cache_sort_verb_have, 
												  [new ConstantTermAttribute(this.selfID, this.cache_sort_id),
												   new ConstantTermAttribute(o.ID, this.cache_sort_id)]
						  						  ));
			}
		}

		var perceptionRadius = 10;
		this.perception((tile_x-perceptionRadius)*attention_map.tileWidth, 
						(tile_y-perceptionRadius)*attention_map.tileHeight, 
						(tile_x+perceptionRadius)*attention_map.tileWidth, 
						(tile_y+perceptionRadius)*attention_map.tileHeight, 
					    location, attention_map, visibilityRegion, occupancyMap);

		if (this.canSee("etaoin")) {
			if (this.etaoin_perception_term == null) {
				this.etaoin_perception_term = Term.fromString("disembodied-ai('etaoin'[#id])", this.o);
			}
			this.addTermToPerception(this.etaoin_perception_term)
		}

		if (location != null) {
			if (this.robot.map.name == "Aurora Station") {
				this.addTermToPerception(Term.fromString("temperature('"+location.id+"'[#id],'"+this.game.aurora_station_temperature_sensor_indoors+"'[temperature.unit.celsius])", this.o));				
			} else {
				this.addTermToPerception(Term.fromString("temperature('"+location.id+"'[#id],'"+this.game.aurora_station_temperature_sensor_outdoors+"'[temperature.unit.celsius])", this.o));
			}
		}
	}


	stopAction(actionRequest:Term) : boolean
	{
		if (super.stopAction(actionRequest)) return true;

		if (this.currentAction != null && 
			this.currentAction.equalsNoBindings(actionRequest) == 1) {
			this.currentAction = null;
			this.currentAction_requester = null;
			this.currentAction_scriptQueue = null;
			this.currentActionHandler = null;
			return true;
		}

		return false;
	}

    executeScriptQueues()
    {

        while(this.currentAction_scriptQueue != null) {
            var s:A4Script = this.currentAction_scriptQueue.scripts[0];
            var retval:number = s.execute((this.currentAction_scriptQueue.object == null ? this.robot:this.currentAction_scriptQueue.object),
                                          (this.currentAction_scriptQueue.map == null ? this.robot.map:this.currentAction_scriptQueue.map),
                                          (this.currentAction_scriptQueue.game == null ? this.game:this.currentAction_scriptQueue.game),
                                          this.currentAction_scriptQueue.otherCharacter);
            if (retval == SCRIPT_FINISHED) {
                this.currentAction_scriptQueue.scripts.splice(0,1);
                if (this.currentAction_scriptQueue.scripts.length == 0) {
                    this.currentAction_scriptQueue = null;
                    this.currentAction = null;
                    this.currentAction_requester = null;
                    this.addLongTermTerm(Term.fromString("verb.do('"+this.selfID+"'[#id], 'nothing'[nothing])", this.o), PERCEPTION_PROVENANCE);
                }
            } else if (retval == SCRIPT_NOT_FINISHED) {
            	// see if we are stuck in front of a door (and we will not accidentally let th eplayer into a forbidden area):
                var collisions:A4Object[] = this.robot.map.getAllObjectCollisionsWithOffset(this.robot, direction_x_inc[this.robot.direction], direction_y_inc[this.robot.direction]);
                for(let o of collisions) {
                    if ((o instanceof A4Door) &&
                    	(<A4Door>o).closed &&
                    	this.doorsPlayerIsNotPermittedToOpen.indexOf((<A4Door>o).doorID) == -1) {
                    	// try to open it!
                    	var cmd:A4CharacterCommand = new A4CharacterCommand(A4CHARACTER_COMMAND_INTERACT, 0, this.robot.direction, null, null, 10);
                    	this.robot.issueCommand(cmd, this.game);
                    }
                }
                break;
            } else if (retval == SCRIPT_FAILED) {
                this.currentAction_scriptQueue = null;
                this.currentAction = null;
                this.currentAction_requester = null;
                this.addLongTermTerm(Term.fromString("verb.do('"+this.selfID+"'[#id], 'nothing'[nothing])", this.o), PERCEPTION_PROVENANCE);
            }
        }
    }


	canSee(characterID:string)
	{
		if (characterID == "etaoin") {
			if (this.robot.map.name == "Aurora Station" ||
				this.robot.map.name == "Aurora Station Outdoors") return true;
		}
		return super.canSee(characterID);
	}    


	restoreFromXML(xml:Element)
	{
		super.restoreFromXML(xml);
		this.robot.AI.doorsNotToOpenWhileWalking = this.doorsPlayerIsNotPermittedToOpen;

		this.objectsNotAllowedToGive = [];
		for(let onatg_xml of getElementChildrenByTag(xml, "objectsNotAllowedToGive")) {
			this.objectsNotAllowedToGive.push(onatg_xml.getAttribute("value"));
		}
		let ca_xml:Element = getFirstElementChildByTag(xml, "currentAction");
		if (ca_xml == null) {
			this.currentAction = null;
		} else {
			this.currentAction = Term.fromString(ca_xml.getAttribute("value"), this.o);
		}
		let car_xml:Element = getFirstElementChildByTag(xml, "currentAction_requester");
		if (car_xml == null) {
			this.currentAction_requester = null;
		} else {
			this.currentAction_requester = Term.parseAttribute(car_xml.getAttribute("value"), this.o, [], []);
		}

		this.currentAction_scriptQueue = null;
        var casq_xml:Element = getFirstElementChildByTag(xml, "currentAction_scriptQueue");
        if (casq_xml != null) {
            var tmpq:A4ScriptExecutionQueue = null;
            var casq_xml_l:HTMLCollection = casq_xml.children;
            for(let j:number = 0;j<casq_xml_l.length;j++) {
                var script_xml:Element = casq_xml_l[j];
                var s:A4Script = A4Script.fromXML(script_xml);
                if (tmpq==null) tmpq = new A4ScriptExecutionQueue(this.robot, this.robot.map, this.game, null);
                tmpq.scripts.push(s);
            }
            this.currentAction_scriptQueue = tmpq;
        }
        this.currentActionHandler = null;
        var cah_xml:Element = getFirstElementChildByTag(xml, "currentActionHandler");
        if (cah_xml != null) {
        	var ah_xml:Element = getFirstElementChildByTag(cah_xml, "IntentionAction");
        	if (ah_xml != null) {
	        	this.currentActionHandler = IntentionActionFactory.loadFromXML(ah_xml, this);
	        }
        }
	}


	savePropertiesToXML() : string
	{
		let str:string = super.savePropertiesToXML();

		for(let o of this.objectsNotAllowedToGive) {
			str += "<objectsNotAllowedToGive value=\""+o+"\"/>\n"
		}

		if (this.currentAction != null) {
			str += "<currentAction value=\""+this.currentAction.toStringXML()+"\"/>\n";
		}
		if (this.currentAction_requester != null) {
			str += "<currentAction_requester value=\""+this.currentAction_requester.toStringXML()+"\"/>\n";
		}
		if (this.currentAction_scriptQueue != null) {
			str += "<currentAction_scriptQueue>\n";
			for(let s of this.currentAction_scriptQueue.scripts) str += s.saveToXML() + "\n";
			str += "</currentAction_scriptQueue>\n";
		}
		if (this.currentActionHandler != null) {
			str += "<currentActionHandler>\n";
			str += this.currentActionHandler.saveToXML(this) + "\n";
			str += "</currentActionHandler>\n";			
		}

		return str;
	}


	robot:A4AICharacter = null;

	// In addition to the script queues directly in the robot, these are script queues that are managed directly by the AI. 
	// Specifically, scripts responsible for making the robot perform the current action the robot is trying to accomplish,
	// are placed here. Each time the robot is given a new task, this script is cleared.
    currentAction:Term = null;
    currentAction_requester:TermAttribute = null;
    currentAction_scriptQueue: A4ScriptExecutionQueue = null;
    currentActionHandler:IntentionAction = null;

	// the IDs of the objects we do not want to give to the player:
	objectsNotAllowedToGive:string[] = [];

	etaoin_perception_term:Term = null;
}
