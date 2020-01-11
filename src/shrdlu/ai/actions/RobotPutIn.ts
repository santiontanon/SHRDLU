class RobotPutIn_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.put-in"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;
		let numberConstraint:number = this.resolveNumberConstraint(ir.numberConstraint, alternative_actions.length);
		let itemID_l:string[] = [];
		let containerID_l:string[] = [];

		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}			

		for(let intention of alternative_actions) {
			if (intention.attributes.length == 3 &&
				(intention.attributes[0] instanceof ConstantTermAttribute) &&
				(intention.attributes[1] instanceof ConstantTermAttribute) &&
				(intention.attributes[2] instanceof ConstantTermAttribute)) {
				let id:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
				let id2:string = (<ConstantTermAttribute>(intention.attributes[2])).value;
				if (id != null && itemID_l.indexOf(id) == -1) itemID_l.push(id);
				if (id2 != null && containerID_l.indexOf(id2) == -1) containerID_l.push(id2);
			}
		}

		if (itemID_l.length == 0 || containerID_l.length != 1) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
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

		let containerObjectL:A4Object[] = ai.game.findObjectByID(containerID_l[0]);
		if (containerObjectL == null) {
			// check if it's a location and redirect to drop:
			let targetLocation:AILocation = ai.game.getAILocationByID(containerID_l[0]);
			if (targetLocation != null) {
				let term2:Term = alternative_actions[0].clone([]);
				term2.functor = ai.o.getSort("action.drop");
				let ir2:IntentionRecord = new IntentionRecord(term2, null, null, null, ai.time_in_seconds);
				ir2.alternative_actions = [];
				for(let aa of ir.alternative_actions) {
					let aa2:Term = aa.clone([]);
					aa2.functor = ai.o.getSort("action.drop");
					ir2.alternative_actions.push(aa2);
				}
				ir2.numberConstraint = ir.numberConstraint;
				ai.intentions.push(ir2);
				return true;
			}

			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], '"+containerID_l[0]+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
			return true;
		}

		let destinationMap:A4Map = containerObjectL[0].map;

		// Check if the robot can go:
		let destinationLocation:AILocation = ai.game.getAILocation(containerObjectL[0]);
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
			return true;
		}
		if (containerObjectL[0] instanceof A4ObstacleContainer) {
			if ((<A4ObstacleContainer>containerObjectL[0]).closeable && (<A4ObstacleContainer>containerObjectL[0]).closed &&
				(<A4ObstacleContainer>containerObjectL[0]).doorID != null) {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let cause:Term = Term.fromString("property.closed('"+containerObjectL[0].ID+"'[#id])", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				}
				return true;
			}
		} else if (ai.selfID == "shrdlu" &&
				   containerObjectL[0].ID == "garage-shuttle" && 
				   itemID_l.length == 1 &&
				   itemID_l[0] == "shuttle-engine" &&
				   ai.game.gameScript.act_2_repair_shuttle_state == 0) {
			// special case of repairing the shuttle:
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			ai.game.gameScript.act_2_repair_shuttle_state = 1;
			ai.game.gameScript.act_2_repair_shuttle_state_timer = 0;
			return true;
		} else {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			return true;
		}

		app.achievement_nlp_all_robot_actions[4] = true;
		app.trigger_achievement_complete_alert();

		// go to destination:
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
        
        for(let item of item_l) {
	        let s:A4Script = new A4Script(A4_SCRIPT_PUT_IN_CONTAINER, containerObjectL[0].ID, null, 0, false, false);
	        s.ID2 = item.ID;	// the object we want to put in
	        q.scripts.push(s);

			// If the object was not mentioned explicitly in the performative, add it to the natural language context:
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(item.ID, ai.o);
			if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(containerObjectL[0].ID, ai.o);
	        
        	numberConstraint--;
        	if (numberConstraint <= 0) break;
	    }

        ai.setNewAction(alternative_actions[0], requester, q, null);
		ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
									  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
									   new TermTermAttribute(alternative_actions[0])]), PERCEPTION_PROVENANCE);
		ai.intentionsCausedByRequest.push(ir);
		if (requester != null) {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotPutIn_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotPutIn_IntentionAction();
	}
}
