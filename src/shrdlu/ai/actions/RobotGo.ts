class RobotGo_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if ((intention.functor.is_a(ai.o.getSort("verb.go")) ||
			intention.functor.is_a(ai.o.getSort("verb.move-to")) ||
			 (intention.functor.is_a(ai.o.getSort("verb.move")) &&
			  intention.attributes.length >= 2 &&
			  (intention.attributes[1] instanceof VariableTermAttribute))) && 
			!intention.functor.is_a(ai.o.getSort("verb.leave"))) {
			return true;
		}
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;
		let requesterID:string = null;
		if (requester instanceof ConstantTermAttribute) {
			requesterID = (<ConstantTermAttribute>requester).value;
		}

		if (ai.robot.isInVehicle()) {
			if (intention.attributes.length == 2 && 
				(intention.attributes[1].sort.name == "space.outside" ||
				 intention.attributes[1].sort.name == "space.away")) {
				// redirect to leave the vehicle:
				let term2:Term = new Term(ai.o.getSort("verb.leave"), [intention.attributes[0]]);
				ai.intentions.push(new IntentionRecord(term2, requester, null, null, ai.time_in_seconds));
				return true;				
			}
		}			

		if (intention.attributes.length==0 ||
			!(intention.attributes[0] instanceof ConstantTermAttribute)) {
			// we should never get here:
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		let stopAfterGoingThroughABridge:boolean = false;
		let stepByStepMovement:boolean = false;

		let targetLocation:AILocation = null;
		let targetLocationID:string = null;
		let targetMap:A4Map = null;
		this.targetx = null;
		this.targety = null;
		this.targetMapName = null;

		// process "direction.towards" (replace by a move-to(self, [cardinal direction]))
		if (intention.functor.name == "verb.move-to" &&
			intention.attributes.length == 2 && 
 	        (intention.attributes[1] instanceof TermTermAttribute) &&
 	        intention.attributes[1].sort.is_a_string("direction.towards")) {
			let towards:Term = (<TermTermAttribute>intention.attributes[1]).term;
			if (towards.attributes.length == 1 &&
				towards.attributes[0] instanceof ConstantTermAttribute) {
				let targetID:string = (<ConstantTermAttribute>towards.attributes[0]).value;
				let target_l:A4Object[] = ai.game.findObjectByID(targetID);
				if (target_l != null && target_l.length>0) {
					if (target_l[0].map.name == ai.robot.map.name) {
						if (requesterID == targetID || ai.canSee(targetID)) {
							let direction:Sort = ai.getDirectionTowardObject(ai.robot, target_l[0]);
							if (direction != null) {
								intention = new Term(intention.functor, [intention.attributes[0],
																		 new VariableTermAttribute(direction, null)]);
							}
						}
					}
				}
			}
		}


		// find the target destination:
		if (intention.functor.name == "verb.come-back" ||
			intention.functor.name == "verb.come" &&
			(intention.attributes.length == 1 ||
			 intention.attributes.length == 2 &&
			 (intention.attributes[1] instanceof VariableTermAttribute) &&
			 intention.attributes[1].sort.is_a(ai.o.getSort("space.here"))) &&
			requester != null &&
			requester instanceof ConstantTermAttribute) {
			if (ai.visionActive) {
				// destination is the position of the speaker:
				let targetObject:A4Object = ai.game.findObjectByIDJustObject(requesterID);
				if (targetObject != null) {
					targetMap = targetObject.map;
					this.targetx = targetObject.x;
					this.targety = targetObject.y+targetObject.tallness;
					targetLocation = ai.game.getAILocation(targetObject);
					if (targetLocation != null) targetLocationID = targetLocation.id;
				}
				if (targetObject == null) {
					// we should never get here:
					if (requester != null) {
						let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
						let term:Term = Term.fromString(tmp, ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					}
					return true;
				}
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.can('"+ai.selfID+"'[#id], verb.see('"+ai.selfID+"'[#id], "+requester+")))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				return true;
			}
		} else if (intention.attributes.length == 2 && 
			       intention.attributes[1] instanceof ConstantTermAttribute) {
			let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			let targetObject:A4Object = ai.game.findObjectByIDJustObject(targetID);
			if (ai.visionActive) {
				// destination is the second attribute:
				if (targetObject != null) {
					targetMap = targetObject.map;
					this.targetx = targetObject.x;
					this.targety = (targetObject.y+targetObject.tallness);// - ai.robot.tallness;
					targetLocation = ai.game.getAILocation(targetObject);
					if (targetLocation != null) targetLocationID = targetLocation.id;
				} else {
					let targetLocation:AILocation = ai.game.getAILocationByID(targetID);
					if (targetLocation != null) {
						targetLocationID = targetLocation.id;
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
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.can('"+ai.selfID+"'[#id], verb.see('"+ai.selfID+"'[#id], '"+targetID+"'[#id])))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
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
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
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
						if (targetLocation != null) targetLocationID = targetLocation.id;
					} else {
						targetObject = null;	// to triger the denyrequest message
					}
				} else {
					if (requester != null) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
						term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", property.blind('"+ai.selfID+"'[#id])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					}
					return true;
				}

			} else if (intention.attributes.length == 2 && intention.attributes[1].sort.name == "space.outside") {
				if (ai.visionActive) {
					// Find a nearby location and go there:
					let startLocation:AILocation = ai.game.getAILocation(ai.robot);
					if (startLocation != null) {
						targetLocation = ai.locationOutsideOf(startLocation);
						if (targetLocation != null) {
							targetLocationID = targetLocation.id;

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
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
						term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", property.blind('"+ai.selfID+"'[#id])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					}
					return true;
				}

			} else if (intention.attributes[1].sort.is_a_string("direction")) {
				let movementAmount:number = 4;
				if (intention.attributes.length == 3 && 
					(intention.attributes[2] instanceof VariableTermAttribute)) {
					if (intention.attributes[2].sort.is_a_string("small-amount")) movementAmount = 1;
					if (intention.attributes[2].sort.is_a_string("large-amount")) movementAmount = 8;
					if (intention.attributes[2].sort.is_a_string("space.far")) movementAmount = 8;
				} else if (intention.attributes.length == 3 && 
						   intention.attributes[2].sort.is_a_string("number") && 
						   intention.attributes[2] instanceof ConstantTermAttribute) {
					movementAmount = Number((<ConstantTermAttribute>intention.attributes[2]).value) * 4;
				}
				this.targetx = null;
				this.targety = null;
				if (intention.attributes[1].sort.name == "west") {
					this.targetx = ai.robot.x - movementAmount*8;
					this.targety = ai.robot.y;
				}
				if (intention.attributes[1].sort.name == "north") {
					this.targetx = ai.robot.x;
					this.targety = ai.robot.y - movementAmount*8;
				}
				if (intention.attributes[1].sort.name == "east") {
					this.targetx = ai.robot.x + movementAmount*8;
					this.targety = ai.robot.y;
				}
				if (intention.attributes[1].sort.name == "south") {
					this.targetx = ai.robot.x;
					this.targety = ai.robot.y + movementAmount*8;
				}
				if (intention.attributes[1].sort.name == "northeast") {
					this.targetx = ai.robot.x + movementAmount*8;
					this.targety = ai.robot.y - movementAmount*8;
				}
				if (intention.attributes[1].sort.name == "northwest") {
					this.targetx = ai.robot.x - movementAmount*8;
					this.targety = ai.robot.y - movementAmount*8;
				}
				if (intention.attributes[1].sort.name == "southeast") {
					this.targetx = ai.robot.x + movementAmount*8;
					this.targety = ai.robot.y + movementAmount*8;
				}
				if (intention.attributes[1].sort.name == "southwest") {
					this.targetx = ai.robot.x - movementAmount*8;
					this.targety = ai.robot.y + movementAmount*8;
				}
				if (intention.attributes[1].sort.name == "forward") {
					this.targetx = ai.robot.x + movementAmount*8*direction_x_inc[ai.robot.direction];
					this.targety = ai.robot.y + movementAmount*8*direction_y_inc[ai.robot.direction];
				}
				if (intention.attributes[1].sort.name == "backward") {
					this.targetx = ai.robot.x - movementAmount*8*direction_x_inc[ai.robot.direction];
					this.targety = ai.robot.y - movementAmount*8*direction_y_inc[ai.robot.direction];
				}
				if (intention.attributes[1].sort.name == "direction.right") {
					this.targetx = ai.robot.x + movementAmount*8*direction_x_inc[(ai.robot.direction+1)%A4_NDIRECTIONS];
					this.targety = ai.robot.y + movementAmount*8*direction_y_inc[(ai.robot.direction+1)%A4_NDIRECTIONS];
				}
				if (intention.attributes[1].sort.name == "direction.left") {
					let dir:number = ai.robot.direction - 1;
					if (dir<0) dir += A4_NDIRECTIONS;
					this.targetx = ai.robot.x + movementAmount*8*direction_x_inc[dir];
					this.targety = ai.robot.y + movementAmount*8*direction_y_inc[dir];
				}
				stepByStepMovement = true;
				targetMap = ai.robot.map;
				this.targetx = Math.floor(this.targetx/8)*8;
				this.targety = Math.floor(this.targety/8)*8;

				// calculate the first step of the path, to see the map/target location:
				let x:number = Math.floor(ai.robot.x/8)*8;
				let y:number = Math.floor(ai.robot.y/8)*8;
				if (x<this.targetx) x += 8;
				if (x>this.targetx) x -= 8;
				if (y<this.targety) y += 8;
				if (y>this.targety) y -= 8;
				y+=+ai.robot.tallness;

				if (targetMap != null) targetLocation = ai.game.getAILocationTileCoordinate(targetMap, x/targetMap.tileWidth, y/targetMap.tileHeight);
				if (targetLocation != null) targetLocationID = targetLocation.id;
			} else {
				// we should never get here:
				if (requester != null) {
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
					let term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
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
							targetLocationID = targetLocation.id;
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
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", property.blind('"+ai.selfID+"'[#id])))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				return true;				
			}

		} else {
			// we should never get here:
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		// If we do not know the destination map:
		if (targetMap == null) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
				let causeRecord:CauseRecord = new CauseRecord(cause, null, ai.time_in_seconds)
				ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.time_in_seconds));
			}
			return true;
		}

		this.targetMapName = targetMap.name;

		// Check if the robot can go:
		let cannotGoCause:Term = ai.canGoTo(targetMap, targetLocationID, requester);
		if (cannotGoCause != null) {
			if (requester != null) {
				// deny request:
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let causeRecord:CauseRecord = new CauseRecord(cannotGoCause, null, ai.time_in_seconds)
				ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.time_in_seconds));

				// explain cause:
				term = new Term(ai.o.getSort("action.talk"), 
								[new ConstantTermAttribute(ai.selfID, ai.o.getSort("#id")),
								 new TermTermAttribute(new Term(ai.o.getSort("perf.inform"),
								 		  			   [requester, new TermTermAttribute(cannotGoCause)]))]);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}


		ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
									  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
									   new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
		ai.intentionsCausedByRequest.push(ir);
		if (requester != null) {
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
			let term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}

		app.achievement_nlp_all_robot_actions[1] = true;
		app.trigger_achievement_complete_alert();

		ai.setNewAction(intention, requester, null, null);
		if (stepByStepMovement || ai.robot.isInVehicle()) {
	        ai.setNewAction(intention, requester, null, this);
			if (!this.executeContinuous(ai)) {
				this.needsContinuousExecution = true;
			} else {
				this.needsContinuousExecution = false;
			}
		} else {
			// go to destination:
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, targetMap.name, null, 0, false, false);
	        s.x = this.targetx;
	        s.y = this.targety+ai.robot.tallness;
	        s.stopAfterGoingThroughABridge = stopAfterGoingThroughABridge;
	        q.scripts.push(s);
			this.needsContinuousExecution = false;
	        ai.setNewAction(intention, requester, q, null);
		}
		return true;
	}


	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		var ai:RobotAI = <RobotAI>ai_raw;

		if (ai.robot.isInVehicle()) {
			ai.robot.disembark();
			return false;
		}

		let x:number = Math.floor(ai.robot.x/8)*8;
		let y:number = Math.floor(ai.robot.y/8)*8;
		if (x == this.targetx && y == this.targety && ai.robot.map.name == this.targetMapName) {
			// we almost made it, done!
			return true;
		} else if (ai.robot.map.name == this.targetMapName) {
			if (x<this.targetx) x += 8;
			if (x>this.targetx) x -= 8;
			if (y<this.targety) y += 8;
			if (y>this.targety) y -= 8;
	        if (ai.robot.map.walkableConsideringVehicles(x, y+ai.robot.tallness,
                                 ai.robot.getPixelWidth(),
                                 ai.robot.getPixelHeight()-ai.robot.tallness,ai.robot)) {
	        } else {
	        	// obstacle!
	        	let collisions:A4Object[] = ai.robot.map.getAllObjects(x, y+ai.robot.tallness,
                                 									   ai.robot.getPixelWidth(),
                                 									   ai.robot.getPixelHeight()-ai.robot.tallness);
	        	let collision:A4Object = null;
	        	for(let o of collisions) {
	        		if (o != ai.robot &&
	        			!o.isWalkable()) {
	        			// collision!
	        			collision = o;
	        			break;
	        		}
	        	}

	        	if (collision != null) {
					ai.addEpisodeTerm("verb.collide-with('"+ai.selfID+"'[#id],'"+collision.ID+"'[#id])", MEMORIZE_PROVENANCE);
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform("+ai.currentAction_requester+", verb.collide-with('"+ai.selfID+"'[#id],'"+collision.ID+"'[#id])))";					
					let term:Term = Term.fromString(tmp, ai.o);
					ai.queueIntention(term, ai.currentAction_requester, null);
				} else {
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform("+ai.currentAction_requester+", #and(obstacle(X), space.at(X, [space.here]))))";					
					let term:Term = Term.fromString(tmp, ai.o);
					ai.queueIntention(term, ai.currentAction_requester, null);					
				}

				return true;
	        }

			// go to destination:
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, ai.robot.map.name, null, 0, false, false);
	        s.x = x;
	        s.y = y+ai.robot.tallness;
	        s.stopAfterGoingThroughABridge = true;
	        q.scripts.push(s);
			ai.currentAction_scriptQueue = q;

	        return false;
		} else {
			// go to destination:
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, this.targetMapName, null, 0, false, false);
	        s.x = this.targetx;
	        s.y = this.targety+ai.robot.tallness;
	        s.stopAfterGoingThroughABridge = false;
	        q.scripts.push(s);
	        ai.currentAction_scriptQueue = q;
	        return false;
		}

	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let tmp:string = "<IntentionAction type=\"RobotGo_IntentionAction\" "+
								"targetx=\""+this.targetx+"\" targety=\""+this.targety+"\" targetMapName=\""+this.targetMapName+"\">";
		return tmp;
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:RobotGo_IntentionAction = new RobotGo_IntentionAction();
		a.targetx = Number(xml.getAttribute("targetx"));
		a.targety = Number(xml.getAttribute("targety"));
		a.targetMapName = xml.getAttribute("targetMapName");
		return a;
	}

	targetx:number;
	targety:number;
	targetMapName:string;
}
