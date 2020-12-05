class RobotAI extends A4RuleBasedAI {
	constructor(o:Ontology, nlp:NLParser, robot:A4AICharacter, game:ShrdluA4Game,
				rulesFileNames:string[])
	{
		super(o, nlp, game, 12, 4, DEFAULT_QUESTION_PATIENCE_TIMER);
		console.log("RobotAI.constructor Start...");

		this.robot = robot;
		this.intentionActionFactory = new A4IntentionActionFactory();

		this.intentionHandlers.push(new RobotFollow_IntentionAction());
		this.intentionHandlers.push(new RobotTalk_IntentionAction());
		this.intentionHandlers.push(new RobotEnter_IntentionAction());
		this.intentionHandlers.push(new RobotExit_IntentionAction());
		this.intentionHandlers.push(new RobotGo_IntentionAction());
		this.intentionHandlers.push(new RobotTakeTo_IntentionAction());
		this.intentionHandlers.push(new RobotStay_IntentionAction());
		this.intentionHandlers.push(new RobotStop_IntentionAction());
		this.intentionHandlers.push(new RobotTake_IntentionAction());
		this.intentionHandlers.push(new RobotPutIn_IntentionAction());
		this.intentionHandlers.push(new RobotDrop_IntentionAction());
		this.intentionHandlers.push(new RobotGive_IntentionAction());
		this.intentionHandlers.push(new RobotOpenClose_IntentionAction());
		this.intentionHandlers.push(new RobotHelp_IntentionAction());
		this.intentionHandlers.push(new RobotTurn_IntentionAction());
		this.intentionHandlers.push(new RobotPushPull_IntentionAction());
		this.intentionHandlers.push(new RobotReboot_IntentionAction());

		// load specific knowledge:
		for(let rulesFileName of rulesFileNames) {
			let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
			xmlhttp.overrideMimeType("text/xml");
			xmlhttp.open("GET", rulesFileName, false); 
			xmlhttp.send();
			this.loadLongTermRulesFromXML(xmlhttp.responseXML.documentElement);
		}

		this.precalculateLocationKnowledge(game, o);
		this.add3DPrintingKnowledge(game, o, "etaoin");

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
        		if (this.currentGoal == null) {
					this.addLongTermTerm(new Term(this.o.getSort("verb.do"),
												  [new ConstantTermAttribute(this.selfID,this.cache_sort_id),
												   new ConstantTermAttribute("nothing",this.o.getSort("nothing"))]), PERCEPTION_PROVENANCE);
				}
				this.clearCurrentAction();
        	}
        }

        // actions waiting to be executed:
        if (this.intentionsToExecuteAfterTheCurrentAction.length > 0 && 
        	this.intentions.length == 0 &&
        	this.queuedIntentions.length == 0 &&
        	this.currentAction == null &&
        	this.timeStamp > this.lastActionRequestTime) {
        	this.queueIntentionRecord(this.intentionsToExecuteAfterTheCurrentAction[0]);
        	this.intentionsToExecuteAfterTheCurrentAction.splice(0, 1);
        }

        // get out of the way of the player:
        if (this.robot.map == this.game.currentPlayer.map && this.robot.scriptQueues.length == 0 && this.visionActive) {
        	let d:number = this.robot.pixelDistance(this.game.currentPlayer);
        	if (d == 0) {
        		// see if the player were to advance in its current facing will collide with us, and in this case, move way:

        		if (this.game.currentPlayer.collisionObjectOffset(direction_x_inc[this.game.currentPlayer.direction], 
        														  direction_y_inc[this.game.currentPlayer.direction], 
        														  this.robot)) {
	        		// find a nearby position further from from the player and move there to get out of the way of the player:
	        		d = this.game.currentPlayer.pixelDistanceBetweenCentersOffset(this.robot, 0, 0);
	        		let targetx:number = null;
	        		let targety:number = null;
	        		for(let offy:number = -1; offy<=1; offy+=1) {
		        		for(let offx:number = -1; offx<=1; offx+=1) {
		        			let d2:number = this.game.currentPlayer.pixelDistanceBetweenCentersOffset(this.robot, offx*this.robot.map.tileWidth, offy*this.robot.map.tileHeight);
		        			if (d2 > d) {
		        				if (this.robot.map.walkable(this.robot.x+offx*this.robot.map.tileWidth, 
		        											this.robot.y+offy*this.robot.map.tileHeight, 
		        											this.robot.getPixelWidth(),
		        											this.robot.getPixelHeight(),
		        											this.robot)) {
		        					targetx = this.robot.x+offx*this.robot.map.tileWidth;
		        					targety = this.robot.y+offy*this.robot.map.tileHeight;
		        					d = d2;
		        				}
		        			}
						}
	        		}
	        		if (targetx != null) {
				        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(this.robot, this.robot.map, this.game, null);
				        let s:A4Script = new A4Script(A4_SCRIPT_GOTO, this.robot.map.name, null, 0, false, false);
				        s.x = targetx;
				        s.y = targety;
				        s.timeOut = 4;	// just try it for a little bit of time, otherwise, give up
				        q.scripts.push(s);			
	        			this.robot.addScriptQueue(q);
	        		}
	        	}
	        }
        }

		this.executeScriptQueues();
	}


	reactToRepeatActionPerformative(perf:Term, speaker:TermAttribute, context:NLContext) : boolean
	{
		if (super.reactToRepeatActionPerformative(perf, speaker, context)) return true;
		if (!(speaker instanceof ConstantTermAttribute)) return false;
		let speakerID:string = (<ConstantTermAttribute>speaker).value;

		// find what was the last action that was requested:
		for(let i:number = 0;i<context.performatives.length;i++) {
			if (context.performatives[i].speaker == speakerID) {
				let request:Term = context.performatives[i].performative;
				if (request.functor.is_a_string("perf.request.action") ||
					request.functor.is_a_string("perf.q.action")) {
					//  we have the action request!
					this.reactToRequestActionPerformative(request, speaker, context);
					return true;
				} else if (request.functor.is_a_string("perf.request.repeataction")) {
					// see if there was an action request before this
				} else {
					return false;
				}
			}
		}

		return false;
	}	


	attentionAndPerception()
	{
		this.clearPerception();

		// just perceive an area around the robot:
		let attention_map:A4Map = this.robot.map;
		let attention_x:number = this.robot.x + this.robot.getPixelWidth()/2;
		let attention_y:number = this.robot.y + this.robot.getPixelHeight()/2;

		// find the AILocation:
		let location:AILocation = null;
		let location_idx:number = -1;
		let occupancyMap:boolean[] = null;
		let tile_x:number = Math.floor(attention_x/attention_map.tileWidth);
		let tile_y:number = Math.floor(attention_y/attention_map.tileHeight);
		let offset:number = tile_x + tile_y*attention_map.width;
		for(let location_idx2:number = 0;location_idx2<this.game.locations.length;location_idx2++) {
			let l:AILocation = this.game.locations[location_idx2];
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

		// this is for some edge cases while transitioning map:
		if (location == null) return;

		let visibilityRegion:number = attention_map.visibilityRegion(tile_x,tile_y);

		// perception:
		for(let o of this.robot.inventory) {
			// perceived an object!
			let term1:Term = new Term(o.sort, [new ConstantTermAttribute(o.ID, this.cache_sort_id)]);
			let term2:Term = new Term(this.cache_sort_space_at, 
									  [new ConstantTermAttribute(o.ID, this.cache_sort_id),
									   new ConstantTermAttribute(location.id, this.cache_sort_id)
									   ]);
			this.addTermToPerception(term1);
			this.addTermToPerception(term2);
			for(let property of this.getBaseObjectProperties(o)) {
				this.addTermToPerception(property);
			}
			this.addTermToPerception(new Term(this.cache_sort_verb_have, 
											  [new ConstantTermAttribute(this.selfID, this.cache_sort_id),
											   new ConstantTermAttribute(o.ID, this.cache_sort_id)]
					  						  ));
		}

		if (this.visionActive) {
			this.perception((tile_x-this.perceptionRadius)*attention_map.tileWidth, 
							(tile_y-this.perceptionRadius)*attention_map.tileHeight, 
							(tile_x+this.perceptionRadius)*attention_map.tileWidth, 
							(tile_y+this.perceptionRadius)*attention_map.tileHeight, 
						    location, attention_map, visibilityRegion, occupancyMap, null);
		} else {
			this.perception((tile_x-this.perceptionRadius)*attention_map.tileWidth, 
							(tile_y-this.perceptionRadius)*attention_map.tileHeight, 
							(tile_x+this.perceptionRadius)*attention_map.tileWidth, 
							(tile_y+this.perceptionRadius)*attention_map.tileHeight, 
						    location, attention_map, visibilityRegion, occupancyMap, 
						    [(tile_x-2)*attention_map.tileWidth, 
							 (tile_y-2)*attention_map.tileHeight, 
							 (tile_x+2)*attention_map.tileWidth, 
							 (tile_y+2)*attention_map.tileHeight]);
		}

		if (this.canSee("etaoin")) {
			if (this.etaoin_perception_term == null) {
				this.etaoin_perception_term = Term.fromString("disembodied-ai('etaoin'[#id])", this.o);
			}
			this.addTermToPerception(this.etaoin_perception_term)
		}

		if (location != null) {
			if (attention_map.name == "Aurora Station") {
				this.addTermToPerception(Term.fromString("temperature('"+location.id+"'[#id],'"+this.game.aurora_station_temperature_sensor_indoors+"'[temperature.unit.celsius])", this.o));				
			} else {
				this.addTermToPerception(Term.fromString("temperature('"+location.id+"'[#id],'"+this.game.aurora_station_temperature_sensor_outdoors+"'[temperature.unit.celsius])", this.o));
			}
		}
	}


	/* safely clear the current script queues, without erasing certain scripts that should never be removed from there! */
	clearScriptQueues()
	{
		let newQueues:A4ScriptExecutionQueue[] = [];
		for(let q of this.robot.scriptQueues) {
			let q2:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(q.object, q.map, q.game, q.otherCharacter);
			for(let s of q.scripts) {
				if (s.type == A4_SCRIPT_FAMILIARWITHMAP) {
					q2.scripts.push(s);
				}
			}
			if (q2.scripts.length > 0) newQueues.push(q2);
		}
		this.robot.scriptQueues = newQueues;
	}


	stopAction(actionRequest:Term, requester:string) : boolean
	{
		if (super.stopAction(actionRequest, requester)) {
			this.clearScriptQueues();
			return true;
		}

		if (this.currentAction != null && 
			this.currentAction.equalsNoBindings(actionRequest) == 1) {
			this.clearCurrentAction();
			this.intentionsToExecuteAfterTheCurrentAction = [];
			return true;
		}

		return false;
	}


	clearCurrentAction()
	{
		this.clearScriptQueues();
		this.currentAction = null;
		this.currentAction_requester = null;
		this.currentAction_scriptQueue = null;
		this.currentActionHandler = null;
	}


	setNewAction(action:Term, requester:TermAttribute, scriptQueue:A4ScriptExecutionQueue, handler:IntentionAction)
	{
		this.clearScriptQueues();
		this.currentAction = action;
		this.currentAction_requester = requester;
		this.currentAction_scriptQueue = scriptQueue;
		this.currentActionHandler = handler;	
	}
	

    executeScriptQueues()
    {

        while(this.currentAction_scriptQueue != null) {
            let s:A4Script = this.currentAction_scriptQueue.scripts[0];
            let retval:number = s.execute((this.currentAction_scriptQueue.object == null ? this.robot:this.currentAction_scriptQueue.object),
                                          (this.currentAction_scriptQueue.map == null ? this.robot.map:this.currentAction_scriptQueue.map),
                                          (this.currentAction_scriptQueue.game == null ? this.game:this.currentAction_scriptQueue.game),
                                          this.currentAction_scriptQueue.otherCharacter);
            if (retval == SCRIPT_FINISHED) {
                this.currentAction_scriptQueue.scripts.splice(0,1);
                if (this.currentAction_scriptQueue.scripts.length == 0) {
                	this.currentAction_scriptQueue = null;
                	if (this.currentGoal == null &&
                		(this.currentActionHandler == null || 
                		 !this.currentActionHandler.needsContinuousExecution)) {
                		this.clearCurrentAction();
                    	this.addLongTermTerm(Term.fromString("verb.do('"+this.selfID+"'[#id], 'nothing'[nothing])", this.o), PERCEPTION_PROVENANCE);
                    }
                }
            } else if (retval == SCRIPT_NOT_FINISHED) {
            	// see if we are stuck in front of a door (and we will not accidentally let the player into a forbidden area):
                let collisions:A4Object[] = this.robot.map.getAllObjectCollisionsWithOffset(this.robot, direction_x_inc[this.robot.direction], direction_y_inc[this.robot.direction]);
                for(let o of collisions) {
                    if ((o instanceof A4Door) &&
                    	(<A4Door>o).closed &&
                    	(<A4Door>o).canOpen(this.robot, this.game) &&
                    	this.doorsPlayerIsNotPermittedToOpen.indexOf((<A4Door>o).doorID) == -1) {
                    	// try to open it!
                    	let cmd:A4CharacterCommand = new A4CharacterCommand(A4CHARACTER_COMMAND_INTERACT, 0, this.robot.direction, null, null, 10);
                    	this.robot.issueCommand(cmd, this.game);
                    }
                }
                break;
            } else if (retval == SCRIPT_FAILED) {
            	if (this.currentActionHandler != null) this.currentActionHandler.actionScriptsFailed(this, this.currentAction_requester);
            	this.clearCurrentAction();
            	if (this.currentGoal == null) {
                	this.addLongTermTerm(Term.fromString("verb.do('"+this.selfID+"'[#id], 'nothing'[nothing])", this.o), PERCEPTION_PROVENANCE);
                }
            }
        }        
    }


	canSatisfyActionRequest(ir:IntentionRecord) : number
	{
		let tmp:number = super.canSatisfyActionRequest(ir);
		if (tmp == ACTION_REQUEST_CAN_BE_SATISFIED) {
			if (this.timeStamp == this.lastActionRequestTime) {
				// multiple requests in the same performative, just queue them:
				this.intentionsToExecuteAfterTheCurrentAction.push(ir);
				return ACTION_REQUEST_WILL_BE_HANDLED_EXTERNALLY;
			} else {
				// clear the queue, as there will be a new request, that overwrites the previous requests:
				this.intentionsToExecuteAfterTheCurrentAction = [];
			}
			this.lastActionRequestTime = this.timeStamp;
		}
		return tmp;
	}


	canSee(characterID:string)
	{
		if (!this.visionActive) return false;
		if (characterID == "etaoin") {
			if (this.robot.map.name == "Aurora Station" ||
				this.robot.map.name == "Aurora Station Outdoors") return true;
		}
		return super.canSee(characterID);
	}    


	canHear(objectID:string)
	{
		let map:A4Map = this.robot.map;
		// etaoin exception:
		if (objectID == "etaoin") {
			if (this.game.comm_tower_repaired) return true;
			if (map.name == "Aurora Station" ||
				map.name == "Aurora Station Outdoors" ||
				map.name == "Spacer Valley South") return true;
		}

		// exception of the player through the communicator:
		if (objectID == "communicator" || objectID == "player") {
			if (this.game.communicatorConnectedTo == this.selfID) return true;
		}

		let o:A4Object = this.game.findObjectByIDJustObject(objectID);
		if (o == null) return false;
		if (map != o.map) return false;
		let dx:number = this.robot.x - o.x;
		let dy:number = this.robot.y - o.y;

		if (dx > this.perceptionRadius*map.tileWidth) return false;
		if (dy > this.perceptionRadius*map.tileHeight) return false;
		return true;
	}


	/*
	- If it returns "null", it means the robot can go
	- If it returns a Term, it means the robot cannot go, and the Term is the intention the robot 
	*/
	canGoTo(map:A4Map, locationID:string, requester:TermAttribute) : Term
	{
		if (this.locationsWherePlayerIsNotPermitted.indexOf(locationID) >= 0) {
			let cause:Term = Term.fromString("#not(verb.have('player'[#id],[permission-to]))", this.o);
			return cause;
		}

		// if the robot does not know the path:
		if (this.robot.AI.map2mapPaths != null) {
			let map1idx:number = this.robot.AI.map2mapNames.indexOf(this.robot.map.name);
			let map2idx:number = this.robot.AI.map2mapNames.indexOf(map.name);
			if (map1idx >= 0 && map2idx >= 0 && map1idx != map2idx) {
				if (this.robot.AI.map2mapPaths[map1idx][map2idx] == null) {
					let cause:Term = Term.fromString("#not(verb.know('"+this.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", this.o);
					return cause;					
				}
			}
		}
		return null;
	}


	// Returns "true" if the AI is still trying to execute "ir"
	IRpendingCompletion(ir:IntentionRecord) : boolean
	{
		if (this.currentActionHandler != null &&
			this.currentActionHandler.ir == ir) return true;
		return super.IRpendingCompletion(ir);
	}


	considerGoals() : boolean
	{
		// If the robot is doing something for the player, then ignore the goals:
		if (this.currentAction != null && this.currentAction_requester != null) return false;
		return super.considerGoals();
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
        let casq_xml:Element = getFirstElementChildByTag(xml, "currentAction_scriptQueue");
        if (casq_xml != null) {
            let tmpq:A4ScriptExecutionQueue = null;
            let casq_xml_l:HTMLCollection = casq_xml.children;
            for(let j:number = 0;j<casq_xml_l.length;j++) {
                let script_xml:Element = casq_xml_l[j];
                let s:A4Script = A4Script.fromXML(script_xml);
                if (tmpq==null) tmpq = new A4ScriptExecutionQueue(this.robot, this.robot.map, this.game, null);
                tmpq.scripts.push(s);
            }
            this.currentAction_scriptQueue = tmpq;
        }
        this.currentActionHandler = null;
        let cah_xml:Element = getFirstElementChildByTag(xml, "currentActionHandler");
        if (cah_xml != null) {
        	let ah_xml:Element = getFirstElementChildByTag(cah_xml, "IntentionAction");
        	if (ah_xml != null) {
	        	this.currentActionHandler = this.intentionActionFactory.loadFromXML(ah_xml, this);
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
	intentionActionFactory:IntentionActionFactory = null;

	lastActionRequestTime:number = -1;

	// In addition to the script queues directly in the robot, these are script queues that are managed directly by the AI. 
	// Specifically, scripts responsible for making the robot perform the current action the robot is trying to accomplish,
	// are placed here. Each time the robot is given a new task, this script is cleared.
    currentAction:Term = null;
    currentAction_requester:TermAttribute = null;
    currentAction_scriptQueue: A4ScriptExecutionQueue = null;
    currentActionHandler:IntentionAction = null;

    intentionsToExecuteAfterTheCurrentAction:IntentionRecord[] = [];	// some times the player requests more than one action at a time in the same
    																	// performative (e.g., "give me all the keys"). These have to be handled one by
    																	// one. This list stores those that are waiting to be executed

	// the IDs of the objects we do not want to give to the player:
	objectsNotAllowedToGive:string[] = [];

	etaoin_perception_term:Term = null;

	perceptionRadius:number = 16;
}
