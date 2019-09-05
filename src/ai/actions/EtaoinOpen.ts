class EtaoinOpen_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.open"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		let doors:A4Door[] = [];

		// check if it's a door:
		let door_tmp:A4Object = ai.game.findObjectByIDJustObject(targetID);
		if (door_tmp != null && (door_tmp instanceof A4Door)) {
			doors.push(door_tmp);
		} else if (door_tmp == null) {
        	// see if it's a location with a door (e.g., a bedroom):
        	// We don't launch a whole inference here, as these facts are directly on the knowledge base:
        	let belong_l:Sentence[] = ai.longTermMemory.allMatches(ai.o.getSort("relation.belongs"), 2, ai.o);
        	for(let belong of belong_l) {
        		if (belong.terms.length == 1 && belong.sign[0] == true) {
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

		if (doors.length == 0) {
			// not a door!
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(door('"+targetID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
		} else {
    		// we have found at least a door!
    		let anyNotPermitted:boolean = false;
    		let doorsToOpen:A4Door[] = [];
    		for(let door of doors) {
	            if (door.closed) {
					// see if player has permission:
	            	if (ai.doorsPlayerIsNotPermittedToOpen.indexOf(door.doorID) == -1) {
	            		doorsToOpen.push(door);
					} else {
						anyNotPermitted = true;
					}
	            }
	        }

	        if (anyNotPermitted) {
				let term2:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.have("+requester+",[permission-to]))))", ai.o);
				ai.intentions.push(new IntentionRecord(term2, null, null, null, ai.time_in_seconds));
				return true;	        	
	        }

	        if (doorsToOpen.length > 0) {
	        	for(let door of doorsToOpen) {
	        		door.eventWithID(A4_EVENT_OPEN, door.doorID, null, door.map, ai.game);
	        	}
	        	if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));        			        		
	        	}
	        } else {
            	// it's already open
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+",property.opened('"+targetID+"'[#id])))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}

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
