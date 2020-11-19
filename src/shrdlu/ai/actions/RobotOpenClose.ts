class RobotOpenClose_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.open")) ||
			intention.functor.is_a(ai.o.getSort("action.close"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;
		let open:boolean = true;

		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			return true;
		}

		if (ir.action.functor.is_a(ai.o.getSort("action.close"))) open = false;

		let closestDoorIntention:Term = null;
		let closestDoor:A4Door = null;
		let closestContainerIntention:Term = null;
		let closestContainer:A4ObstacleContainer = null;

		for(let intention of alternative_actions) {
			let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			let door:A4Door = null;
			let container:A4ObstacleContainer = null;

			// check if it's a door:
			let object_tmp:A4Object = ai.game.findObjectByIDJustObject(targetID);
			if (object_tmp != null) {
				if (object_tmp instanceof A4Door) {
					door = object_tmp;
				} else if (object_tmp instanceof A4ObstacleContainer) {
					container = object_tmp;
				} else {
					denyrequestCause = Term.fromString("#not(door('"+targetID+"'[#id]))", ai.o);
				}
			} else if (object_tmp == null) {
	        	// see if it's a location with a door (e.g., a bedroom):
	        	// We don't launch a whole inference here, as these facts are directly on the knowledge base:
	        	let belong_l:Sentence[] = ai.longTermMemory.allSingleTermMatches(ai.o.getSort("verb.belong"), 2, ai.o);
	        	for(let belong of belong_l) {
	    			let t:Term = belong.terms[0];
	    			if ((t.attributes[0] instanceof ConstantTermAttribute) &&
	    				(t.attributes[1] instanceof ConstantTermAttribute)) {
	    				if ((<ConstantTermAttribute>t.attributes[1]).value == targetID) {
	    					let door2:A4Object = ai.game.findObjectByIDJustObject((<ConstantTermAttribute>t.attributes[0]).value);
	    					if (door2 != null && (door2 instanceof A4Door)) {
	    						door = door2;
	    						break;
	    					}
	    				}
	    			}
	        	}
			}

			if (door != null) {
	            if (door.closed == open) {
					// see if player has permission:
	            	if (ai.doorsPlayerIsNotPermittedToOpen.indexOf(door.doorID) == -1) {
		            	if (door.checkForBlockages(true, null, ai.robot.map, ai.game, [])) {
							if (closestDoor == null ||
								closestDoor.pixelDistance(ai.robot) > door.pixelDistance(ai.robot)) {
								closestDoorIntention = intention;
								closestDoor = door;
							}
						}
	            	} else {
						denyrequestCause = Term.fromString("#not(verb.have("+requester+",[permission-to]))", ai.o);
	            	}
	            } else {
	            	if (door.closed) {
	            		denyrequestCause = Term.fromString("property.closed('"+door.ID+"'[#id])", ai.o);
	            	} else {
	            		denyrequestCause = Term.fromString("property.opened('"+door.ID+"'[#id])", ai.o);
	            	}
	            }
			}	

			if (container != null) {
				if (container.closeable) {
		            if (container.closed == open) {
		            	let containerLocation:AILocation = ai.game.getAILocation(container);
		            	if (containerLocation == null || ai.locationsWherePlayerIsNotPermitted.indexOf(containerLocation.id) == -1) {

							if (closestContainer == null ||
								closestContainer.pixelDistance(ai.robot) > container.pixelDistance(ai.robot)) {
								closestContainerIntention = intention;
								closestContainer = container;
							}		            		
						} else {
							denyrequestCause = Term.fromString("#not(verb.have("+requester+",[permission-to]))", ai.o);
						}

		            } else {
		            	if (container.closed) {
		            		denyrequestCause = Term.fromString("property.closed('"+container.ID+"'[#id])", ai.o);
		            	} else {
		            		denyrequestCause = Term.fromString("property.opened('"+container.ID+"'[#id])", ai.o);
		            	}
		            }
				}
			}
		}

		if (closestDoor != null) {
			app.achievement_nlp_all_robot_actions[(open ? 7:8)] = true;
			app.trigger_achievement_complete_alert();

			// If the object was not mentioned explicitly in the performative, add it to the natural language context:
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(closestDoor.ID, ai.o);

    		// do it!
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = new A4Script(A4_SCRIPT_INTERACT_WITH_OBJECT, closestDoor.ID, null, 0, false, false);
	        q.scripts.push(s);
	        ai.setNewAction(closestDoorIntention, ir.requester, q, null);
			ai.addLongTermTerm(new Term(closestDoorIntention.functor,
										  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
										   new TermTermAttribute(closestDoorIntention)]), PERCEPTION_PROVENANCE);
			ai.intentionsCausedByRequest.push(ir);
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+ir.requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			return true;
		}
		if (closestContainer != null) {
			app.achievement_nlp_all_robot_actions[(open ? 7:8)] = true;
			app.trigger_achievement_complete_alert();

			// If the object was not mentioned explicitly in the performative, add it to the natural language context:
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(closestContainer.ID, ai.o);

    		// do it!
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = new A4Script(A4_SCRIPT_INTERACT_WITH_OBJECT, closestContainer.ID, null, 0, false, false);
	        q.scripts.push(s);
	        ai.setNewAction(closestContainerIntention, ir.requester, q, null);
			ai.addLongTermTerm(new Term(closestContainerIntention.functor,
										  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
										   new TermTermAttribute(closestContainerIntention)]), PERCEPTION_PROVENANCE);
			ai.intentionsCausedByRequest.push(ir);
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+ir.requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			return true;

		}

		let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
		if (denyrequestCause == null) {
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		} else {
			ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.timeStamp), ai.timeStamp));
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotOpenClose_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotOpenClose_IntentionAction();
	}
}
