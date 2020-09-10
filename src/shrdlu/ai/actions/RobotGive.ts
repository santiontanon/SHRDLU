class RobotGive_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.give")) &&
			intention.attributes.length>=2) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;
		let numberConstraint:number = ir.resolveNumberConstraint(ir.numberConstraint, alternative_actions.length);
		let itemID_l:string[] = [];
		let targetID_l:string[] = [];

		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}			

		for(let intention of alternative_actions) {		
			let id:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			if (id != null && itemID_l.indexOf(id) == -1) itemID_l.push(id);
			if (intention.attributes.length>=3) {
				id = (<ConstantTermAttribute>(intention.attributes[2])).value;
				if (id != null && targetID_l.indexOf(id) == -1) targetID_l.push(id);
			}
		}

		if (targetID_l.length == 0) {
			if (requester != null && (requester instanceof ConstantTermAttribute)) {
				targetID_l.push((<ConstantTermAttribute>requester).value);
			}
		}
		if (targetID_l.length != 1) {
			if (requester != null) {
				// state that it cannot give this item:
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+requester+"'[#id]))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));			
			}
			return true;
		}

		let item_l:A4Object[] = [];
		for(let o of ai.robot.inventory) {
			if (itemID_l.indexOf(o.ID) != -1) {
				if (ai.objectsNotAllowedToGive.indexOf(o.ID) == -1) {
					item_l.push(o);
				} else {
					denyrequestCause = Term.fromString("#not(verb.can('"+ai.selfID+"'[#id], action.give('"+ai.selfID+"'[#id], '"+o.ID+"'[#id], "+requester+")))", ai.o);
				}
			}
		}
		if (item_l.length == 0) {
			if (requester != null) {
				if (denyrequestCause != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.time_in_seconds), ai.time_in_seconds));
				} else {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let cause:Term = Term.fromString("#not(verb.have('"+ai.selfID+"'[#id], '"+itemID_l[0]+"'[#id]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				}
			}
			return true;
		}

		let targetCharacter:A4Character = <A4Character>ai.game.findObjectByIDJustObject(targetID_l[0]);
		if (targetCharacter == null) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], '"+targetID_l[0]+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}				
			return false;
		} else {
			let destinationMap:A4Map = targetCharacter.map;

			// Check if the robot can go:
			let destinationLocation:AILocation = ai.game.getAILocation(targetCharacter);
			let destinationLocationID:string = null;
			if (destinationLocation != null) destinationLocationID = destinationLocation.id;
			let cannotGoCause:Term = ai.canGoTo(destinationMap, destinationLocationID, requester);
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
			
			if (destinationMap == null) {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				}				
				return false;							
			} else {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

				app.achievement_nlp_all_robot_actions[6] = true;
				app.trigger_achievement_complete_alert();

		        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, targetCharacter);
		        q.scripts.push(new A4Script(A4_SCRIPT_GOTO_CHARACTER, targetCharacter.ID, null, 0, false, false));

		        for(let item of item_l) {
		        	q.scripts.push(new A4Script(A4_SCRIPT_GIVE, item.ID, null, 0, false, false));

					// If the object was not mentioned explicitly in the performative, add it to the natural language context:
					if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(item.ID, ai.o);
					if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(targetCharacter.ID, ai.o);

		        	numberConstraint--;
        			if (numberConstraint <= 0) break;
		        }
    	        ai.setNewAction(alternative_actions[0], requester, q, this);
				ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
											  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
											   new TermTermAttribute(alternative_actions[0])]), PERCEPTION_PROVENANCE);
				ai.intentionsCausedByRequest.push(ir);
			}
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotGive_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotGive_IntentionAction();
	}
}
