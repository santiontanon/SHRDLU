class RobotStay_IntentionAction extends IntentionAction {

	constructor()
	{
		super();
		this.needsContinuousExecution = true;
	}


	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.stay")) &&
		    (intention.attributes.length == 1 ||
	    	 intention.attributes.length == 5 ||
		     (intention.attributes.length == 2 &&
		 	  ((intention.attributes[1] instanceof VariableTermAttribute) ||
			   (intention.attributes[1] instanceof ConstantTermAttribute))))) {
			return true;
		}
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;
		let requesterID:string = null;
		if (requester instanceof ConstantTermAttribute) {
			requesterID = (<ConstantTermAttribute>requester).value;
		}
	
		let targetID:string = null;
		let targetLocation:AILocation = null;
		let targetObject:A4Object = null;
		let targetMap:A4Map = null;
		this.targetx = null;
		this.targety = null;
		this.targetMapName = null;

		// find the target destination:
		if ((intention.attributes.length == 1 ||
			 ((intention.attributes[1] instanceof VariableTermAttribute) &&
			   intention.attributes[1].sort.is_a(ai.o.getSort("space.here")))) &&
			requester != null &&
			requester instanceof ConstantTermAttribute) {
			let targetObject:A4Object = ai.game.findObjectByIDJustObject(requesterID);
			if (targetObject != null) {
				let requesterLocation:AILocation = ai.game.getAILocation(targetObject);
				let robotLocation:AILocation = ai.game.getAILocation(ai.robot);
				if (robotLocation == requesterLocation) {
					targetLocation = requesterLocation;
					targetMap = ai.robot.map;
					targetID = targetLocation.id;
					this.targetx = ai.robot.x;
					this.targety = ai.robot.y;
				} else if (ai.visionActive) {
					targetLocation = requesterLocation;
					targetMap = targetObject.map;
					targetID = targetLocation.id;
					this.targetx = targetObject.x;
					this.targety = targetObject.y;
				} else {
					if (requester != null) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
						term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.can('"+ai.selfID+"'[#id], verb.see('"+ai.selfID+"'[#id], "+requester+")))))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					}
					ir.succeeded = false;
					return true;
				}
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				ir.succeeded = false;
				return true;
			}
		} else if (intention.attributes.length == 2 && 
			       intention.attributes[1] instanceof ConstantTermAttribute) {
			targetID = (<ConstantTermAttribute>(intention.attributes[1])).value;
			targetObject = ai.game.findObjectByIDJustObject(targetID);
			if (ai.visionActive) {
				// destination is the second attribute:
				if (targetObject != null) {
					targetMap = targetObject.map;
					this.targetx = targetObject.x;
					this.targety = targetObject.y;
					targetLocation = ai.game.getAILocation(targetObject);
				} else {
					let targetLocation:AILocation = ai.game.getAILocationByID(targetID);
					if (targetLocation != null) {
						let tmp2:[number,number] = targetLocation.centerWalkableCoordinatesInMap(ai.robot.map, ai.robot);
						if (tmp2 != null) {
							targetMap = ai.robot.map;
							this.targetx = tmp2[0];
							this.targety = tmp2[1];
						} else {
							if (targetLocation.maps.length > 0) {
								// we set this so that we can later give the proper reason for why we cannot go
								let tmp3:[number,number] = targetLocation.centerWalkableCoordinatesInMap(targetLocation.maps[0], ai.robot);
								if (tmp3 != null) {
									targetMap = targetLocation.maps[0];
									this.targetx = tmp3[0];
									this.targety = tmp3[1];
								}
							}
						}
					}
				}
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.can('"+ai.selfID+"'[#id], verb.see('"+ai.selfID+"'[#id], '"+targetID+"'[#id])))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				ir.succeeded = false;
				return true;
			}

		} else if (intention.attributes.length >= 2 && 
			       (intention.attributes[1] instanceof VariableTermAttribute)) {
			let targetObject:A4Object = ai.game.findObjectByIDJustObject(requesterID);
			if (targetObject == null) {
				// we should never get here:
				if (requester != null) {
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
					let term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				ir.succeeded = false;
				return true;				
			}
			if (intention.attributes.length == 2 && intention.attributes[1].sort.name == "space.away") {
				if (ai.visionActive) {
					// Find a nearby location and go there:
					let bestD:number = null;
					let bestX:number = null;
					let bestY:number = null;
					for(let location of ai.game.locations) {
						if (ai.locationsWherePlayerIsNotPermitted.indexOf(location.id) == -1) {
							// candidate location to go to:
							let coords:[number,number] = location.centerCoordinatesInMap(targetObject.map);
							if (coords!=null) {
								let d:number = Math.abs(targetObject.x - coords[0]) + Math.abs(targetObject.y - coords[1]);
								console.log("location distance: " + d + " (" + location.id + ")");
								if (d > 128) {	// some arbitrary definition of "away"
									if (bestD == null || d<bestD) {
										bestD = d;
										bestX = coords[0];
										bestY = coords[1];
									}
								}
							}
						}
					}
					if (bestX != null) {
						targetMap = targetObject.map;
						this.targetx = bestX;
						this.targety = bestY;
						targetLocation = ai.game.getAILocationTileCoordinate(targetMap, this.targetx/targetMap.tileWidth, this.targety/targetMap.tileHeight);
					} else {
						targetObject = null;	// to triger the denyrequest message
					}
				} else {
					if (requester != null) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
						term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", property.blind('"+ai.selfID+"'[#id])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					}
					ir.succeeded = false;
					return true;
				}

			} else if (intention.attributes.length == 2 && intention.attributes[1].sort.name == "space.outside") {
				if (ai.visionActive) {
					// Find a nearby location and go there:
					let startLocation:AILocation = ai.game.getAILocation(ai.robot);
					if (startLocation != null) {
						targetLocation = ai.locationOutsideOf(startLocation);
						if (targetLocation != null) {
							let tmp2:[number,number] = targetLocation.centerWalkableCoordinatesInMap(ai.robot.map, ai.robot);
							// ensure that the target location is actually outside of the specified location:
							let tmp2location:AILocation = null;
							if (tmp2 != null) tmp2location = ai.game.getAILocationTileCoordinate(ai.robot.map, tmp2[0]/ai.robot.map.tileWidth, tmp2[1]/ai.robot.map.tileHeight);
							if (tmp2 != null && 
								tmp2location != startLocation &&									
								!ai.game.location_in[ai.game.locations.indexOf(tmp2location)][ai.game.locations.indexOf(startLocation)]) {
								targetMap = ai.robot.map;
								this.targetx = tmp2[0];
								this.targety = tmp2[1];
							} else {
								for(let mapidx:number = 0; mapidx<targetLocation.maps.length; mapidx++) {
									// we set this so that we can later give the proper reason for why we cannot go
									let tmp3:[number,number] = targetLocation.centerWalkableCoordinatesInMap(targetLocation.maps[mapidx], ai.robot);
									// ensure that the target location is actually outside of the specified location:
									let tmp3location:AILocation = null;
									if (tmp3 != null) tmp3location = ai.game.getAILocationTileCoordinate(targetLocation.maps[mapidx], tmp3[0]/targetLocation.maps[mapidx].tileWidth, tmp3[1]/targetLocation.maps[mapidx].tileHeight);
									if (tmp3 != null && 
										tmp3location != startLocation &&
										!ai.game.location_in[ai.game.locations.indexOf(tmp3location)][ai.game.locations.indexOf(startLocation)]) {
										targetMap = targetLocation.maps[mapidx];
										this.targetx = tmp3[0];
										this.targety = tmp3[1];
									}
								}
							}
						}
					}
				} else {
					if (requester != null) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
						term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", property.blind('"+ai.selfID+"'[#id])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					}
					ir.succeeded = false;
					return true;
				}

			} else {
				// we should never get here:
				if (requester != null) {
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
					let term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				ir.succeeded = false;
				return true;
			}

		} else if (intention.attributes.length >= 2 && 
			       (intention.attributes[1] instanceof TermTermAttribute) &&
			       intention.attributes[1].sort.is_a(ai.o.getSort("space.outside.of"))) {
			if (ai.visionActive) {
				// go outside of a specific location:
				let ooTerm:Term = (<TermTermAttribute>intention.attributes[1]).term;
				if (ooTerm.attributes.length == 1 && 
					ooTerm.attributes[0] instanceof ConstantTermAttribute) {
					// Find a nearby location and go there:
					let startLocation:AILocation = ai.game.getAILocationByID((<ConstantTermAttribute>ooTerm.attributes[0]).value);
					if (startLocation != null) {
						targetLocation = ai.locationOutsideOf(startLocation);
						if (targetLocation != null) {
							let tmp2:[number,number] = targetLocation.centerWalkableCoordinatesInMap(ai.robot.map, ai.robot);
							// ensure that the target location is actually outside of the specified location:
							let tmp2location:AILocation = ai.game.getAILocationTileCoordinate(ai.robot.map, tmp2[0]/ai.robot.map.tileWidth, tmp2[1]/ai.robot.map.tileHeight);
							if (tmp2 != null && 
								tmp2location != startLocation &&
								!ai.game.location_in[ai.game.locations.indexOf(tmp2location)][ai.game.locations.indexOf(startLocation)]) {
								targetMap = ai.robot.map;
								this.targetx = tmp2[0];
								this.targety = tmp2[1];
							} else {

								for(let mapidx:number = 0; mapidx<targetLocation.maps.length; mapidx++) {
									// we set this so that we can later give the proper reason for why we cannot go
									let tmp3:[number,number] = targetLocation.centerWalkableCoordinatesInMap(targetLocation.maps[mapidx], ai.robot);
									// ensure that the target location is actually outside of the specified location:
									let tmp3location:AILocation = ai.game.getAILocationTileCoordinate(targetLocation.maps[mapidx], tmp3[0]/targetLocation.maps[mapidx].tileWidth, tmp3[1]/targetLocation.maps[mapidx].tileHeight);
									if (tmp3 != null && 
										tmp3location != startLocation &&
										!ai.game.location_in[ai.game.locations.indexOf(tmp3location)][ai.game.locations.indexOf(startLocation)]) {
										targetMap = targetLocation.maps[mapidx];
										this.targetx = tmp3[0];
										this.targety = tmp3[1];
										break;
									}
								}
							}
						}
					}
				}
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", property.blind('"+ai.selfID+"'[#id])))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				ir.succeeded = false;
				return true;				
			}

		} else if (intention.attributes.length == 5 && 
			       (intention.attributes[1] instanceof ConstantTermAttribute) &&
			       (intention.attributes[2] instanceof ConstantTermAttribute) &&
			       (intention.attributes[3] instanceof ConstantTermAttribute) &&
			       (intention.attributes[4] instanceof ConstantTermAttribute) &&
			       intention.attributes[1].sort.name == "number") {
			// to to some specific coordinates:
			this.targetx = Number((<ConstantTermAttribute>(intention.attributes[1])).value);
			this.targety = Number((<ConstantTermAttribute>(intention.attributes[2])).value);
			this.targetMapName = (<ConstantTermAttribute>(intention.attributes[3])).value;
			this.stayUntil = ai.timeStamp + Number((<ConstantTermAttribute>(intention.attributes[4])).value);
			targetMap = ai.game.getMap(this.targetMapName);

		} else {
			// we should never get here:
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			ir.succeeded = false;
			return true;
		}

		// If we do not know the destination map:
		if (targetMap == null) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
				let causeRecord:CauseRecord = new CauseRecord(cause, null, ai.timeStamp)
				ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.timeStamp));
			}
			ir.succeeded = false;
			return true;
		}

		this.targetMapName = targetMap.name;

		// Check if the robot can go:
		let targetLocationID:string = null;
		if (targetLocation != null) targetLocationID = targetLocation.id;
		let cannotGoCause:Term = ai.canGoTo(targetMap, targetLocationID, requester);
		if (cannotGoCause != null) {
			if (requester != null) {
				// deny request:
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let causeRecord:CauseRecord = new CauseRecord(cannotGoCause, null, ai.timeStamp)
				ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.timeStamp));

				// explain cause:
				term = new Term(ai.o.getSort("action.talk"), 
								[new ConstantTermAttribute(ai.selfID, ai.o.getSort("#id")),
								 new TermTermAttribute(new Term(ai.o.getSort("perf.inform"),
								 		  			   [requester, new TermTermAttribute(cannotGoCause)]))]);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			ir.succeeded = false;
			return true;
		}

		ai.addCurrentActionLongTermTerm(intention);
		ai.intentionsCausedByRequest.push(ir);
		if (requester != null) {
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
			let term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		}

		app.achievement_nlp_all_robot_actions[13] = true;
		app.trigger_achievement_complete_alert();

        ai.setNewAction(intention, requester, null, this);
		this.executeContinuous(ai);
		this.ir.succeeded = true;	// temporarily set this to success
		return true;
	}


	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;

		if (ai.robot.isInVehicle()) {
			ai.robot.disembark();
			return false;
		}

		if (this.stayUntil != null && ai.timeStamp >= this.stayUntil) {
			if (this.ir != null) this.ir.succeeded = true;
			return true;
		}

		// go to destination:
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, this.targetMapName, null, 0, false, false);
        s.x = this.targetx;
        s.y = this.targety;
        s.stopAfterGoingThroughABridge = false;
        q.scripts.push(s);
        ai.currentAction_scriptQueue = q;
        return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let tmp:string = "<IntentionAction type=\"RobotStay_IntentionAction\" "+
								"targetx=\""+this.targetx+"\" targety=\""+this.targety+"\" targetMapName=\""+this.targetMapName+"\"";
		if (this.stayUntil != null) {
			tmp += " stayUntil=\""+this.stayUntil+"\""
		}								
		tmp += "/>";
		return tmp;
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:RobotStay_IntentionAction = new RobotStay_IntentionAction();
		a.targetx = Number(xml.getAttribute("targetx"));
		a.targety = Number(xml.getAttribute("targety"));
		a.targetMapName = xml.getAttribute("targetMapName");
		if (xml.getAttribute("stayUntil") != null) {
			a.stayUntil = Number(xml.getAttribute("stayUntil"));
		}
		return a;
	}

	targetx:number;
	targety:number;
	targetMapName:string;
	stayUntil:number = null;
}
