class EtaoinOpen_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.open"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;
		let anySuccessful:boolean = false;
		let doors:A4Door[] = [];
		let lights:A4Object[] = [];

		for(let intention of alternative_actions) {
			let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;

			// check if it's a door:
			let door_tmp:A4Object = ai.game.findObjectByIDJustObject(targetID);
			if (door_tmp != null) {
				if (door_tmp instanceof A4Door) {
					doors.push(door_tmp);
				} else if (door_tmp.sort.is_a(ai.o.getSort("light"))) {
					lights.push(door_tmp);
				} else {
					denyrequestCause = Term.fromString("#not(door('"+targetID+"'[#id]))", ai.o);
				}
			} else if (door_tmp == null) {
	        	// see if it's a location with a door (e.g., a bedroom):
	        	// We don't launch a whole inference here, as these facts are directly on the knowledge base:
	        	let belong_l:Sentence[] = ai.longTermMemory.allSingleTermMatches(ai.o.getSort("verb.belong"), 2, ai.o);
	        	for(let belong of belong_l) {
	    			let t:Term = belong.terms[0];
	    			if ((t.attributes[0] instanceof ConstantTermAttribute) &&
	    				(t.attributes[1] instanceof ConstantTermAttribute)) {
	    				if ((<ConstantTermAttribute>t.attributes[1]).value == targetID) {
	    					let door:A4Object = ai.game.findObjectByIDJustObject((<ConstantTermAttribute>t.attributes[0]).value);
	    					if (door != null && (door instanceof A4Door)) {
	    						doors.push(door);
	    					}
	    				}
	    			}
	        	}
			}
		}

		let numberConstraint:number = this.resolveNumberConstraint(ir.numberConstraint, doors.length + lights.length);

		if (lights.length > 0) {
			for(let light of lights) {
				let room:AILocation = ai.game.getAILocation(light);
				if (ai.game.turnLightOn(room.id)) {

					// If the object was not mentioned explicitly in the performative, add it to the natural language context:
					if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(light.ID, ai.o);

            		anySuccessful = true;
            		numberConstraint --;
            		if (numberConstraint <= 0) break;
				} else {
					denyrequestCause = Term.fromString("powered.state('"+light.ID+"'[#id], 'powered.on'[powered.on])", ai.o);
				}
			}
		}
		if (doors.length > 0) {
    		// we have found at least a door!
    		for(let door of doors) {
	            if (door.closed) {
					// see if player has permission:
	            	if (ai.doorsPlayerIsNotPermittedToOpen.indexOf(door.doorID) == -1) {
	            		door.eventWithID(A4_EVENT_OPEN, door.doorID, null, door.map, ai.game);

						// If the object was not mentioned explicitly in the performative, add it to the natural language context:
						if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(door.ID, ai.o);
	            		
	            		anySuccessful = true;
	            		numberConstraint --;
	            		if (numberConstraint <= 0) break;
					} else {
						denyrequestCause = Term.fromString("#not(verb.have("+requester+",[permission-to]))", ai.o);
					}
	            } else {
	            	denyrequestCause = Term.fromString("property.opened('"+door.ID+"'[#id])", ai.o);
	            }
	        }
	    }

	    if (anySuccessful) {
        	if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));        			        		
        	}

        	app.achievement_nlp_all_etaoin_actions[1] = true;
        	app.trigger_achievement_complete_alert();

	    } else {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
			if (denyrequestCause == null) {
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			} else {
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
		}
		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"EtaoinOpen_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new EtaoinOpen_IntentionAction();
	}
}
