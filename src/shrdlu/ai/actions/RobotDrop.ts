class RobotDrop_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.drop"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:RobotAI = <RobotAI>ai_raw;
		let requester:TermAttribute = ir.requester;
		let alternative_actions:Term[] = ir.alternative_actions;
		if (alternative_actions == null) alternative_actions = [ir.action];
		let denyrequestCause:Term = null;
		let numberConstraint:number = ir.resolveNumberConstraint(ir.numberConstraint, alternative_actions.length);
		let itemID_l:string[] = [];
		let locationID_l:string[] = [];

		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			ir.succeeded = false;
			return true;
		}			

		for(let intention of alternative_actions) {
			if (intention.attributes.length == 2 && 
				(intention.attributes[0] instanceof ConstantTermAttribute) &&
				(intention.attributes[1] instanceof ConstantTermAttribute)) {
				let id:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
				if (id != null && itemID_l.indexOf(id) == -1) itemID_l.push(id);
			}
			if (intention.attributes.length == 3 && 
				(intention.attributes[0] instanceof ConstantTermAttribute) &&
				(intention.attributes[1] instanceof ConstantTermAttribute) &&
				(intention.attributes[2] instanceof ConstantTermAttribute)) {
				let id:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
				let id2:string = (<ConstantTermAttribute>(intention.attributes[2])).value;
				if (id != null && itemID_l.indexOf(id) == -1) itemID_l.push(id);
				if (id2 != null && locationID_l.indexOf(id2) == -1) locationID_l.push(id2);
			}
			if (intention.attributes.length == 3 && 
				(intention.attributes[0] instanceof ConstantTermAttribute) &&
				(intention.attributes[1] instanceof ConstantTermAttribute) &&
				(intention.attributes[2] instanceof VariableTermAttribute) &&
				intention.attributes[2].sort.is_a(ai.o.getSort("space.here"))) {
				let id:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
				if (id != null && itemID_l.indexOf(id) == -1) itemID_l.push(id);
			}
		}

		if (itemID_l.length == 0 || locationID_l.length > 1) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			ir.succeeded = false;
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
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(denyrequestCause, null, ai.timeStamp), ai.timeStamp));
				} else {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					let cause:Term = Term.fromString("#not(verb.have('"+ai.selfID+"'[#id], '"+itemID_l[0]+"'[#id]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
				}
			}
			ir.succeeded = false;
			return true;
		}

		if (locationID_l.length == 0) {
			// just drop the objects:
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        for(let item of item_l) {
	    		let s:A4Script = new A4Script(A4_SCRIPT_DROP, item.ID, null, 0, false, false);
	        	q.scripts.push(s);
	        	ai.addCurrentActionLongTermTerm(alternative_actions[0]);

				// If the object was not mentioned explicitly in the performative, add it to the natural language context:
				if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(item.ID, ai.o);

	        	numberConstraint--;
	        	if (numberConstraint <= 0) break;
	        }
	        ai.setNewAction(alternative_actions[0], requester, q, null);
			ai.intentionsCausedByRequest.push(ir);

			app.achievement_nlp_all_robot_actions[5] = true;
			app.trigger_achievement_complete_alert();
			
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			ir.succeeded = true;
		} else {
			let targetLocation:AILocation = ai.game.getAILocationByID(locationID_l[0]);
			let destinationMap:A4Map = null;
			let destinationX:number;
			let destinationY:number;
			if (targetLocation == null) {
				// check if it's an object, and redirect to put-in!
				let containerObjectL:A4Object[] = ai.game.findObjectByID(locationID_l[0]);
				if (containerObjectL != null && containerObjectL.length > 0) {
					let term2:Term = alternative_actions[0].clone([]);
					term2.functor = ai.o.getSort("action.put-in");
					let ir2:IntentionRecord = new IntentionRecord(term2, null, null, null, ai.timeStamp);
					ir2.alternative_actions = [];
					for(let aa of ir.alternative_actions) {
						let aa2:Term = aa.clone([]);
						aa2.functor = ai.o.getSort("action.put-in");
						ir2.alternative_actions.push(aa2);
					}
					ir2.numberConstraint = ir.numberConstraint;
					ai.intentions.push(ir2);
					ir.succeeded = true;
					return true;
				}
			} else {
				let tmp2:[number,number] = targetLocation.centerWalkableCoordinatesInMap(ai.robot.map, ai.robot);
				if (tmp2 != null) {
					destinationMap = ai.robot.map;
					destinationX = tmp2[0];
					destinationY = tmp2[1];
				} else {
					if (targetLocation.maps.length > 0 && 
						targetLocation.maps.indexOf(ai.robot.map) == -1) {
						// we set this so that we can later give the proper reason for why we cannot go
						destinationMap = targetLocation.maps[0];
					}
				}
			}

			// Check if the robot can go:
			let cannotGoCause:Term = ai.canGoTo(destinationMap, locationID_l[0], requester);
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

			if (destinationMap == null) {
				if (requester != null) {
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
					let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
					let term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
				}
				ir.succeeded = false;
				return true;
			}

			app.achievement_nlp_all_robot_actions[5] = true;
			app.trigger_achievement_complete_alert();

			// go to destination:
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = null
	        s = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, destinationMap.name, null, 0, false, false);
	        s.x = destinationX;
	        s.y = destinationY;
	        q.scripts.push(s);
	        for(let item of item_l) {
	    		s = new A4Script(A4_SCRIPT_DROP, item.ID, null, 0, false, false);
	        	q.scripts.push(s);

				// If the object was not mentioned explicitly in the performative, add it to the natural language context:
				if (ir.requestingPerformative != null) ir.requestingPerformative.addMentionToPerformative(item.ID, ai.o);	        	

	        	numberConstraint--;
	        	if (numberConstraint <= 0) break;
	        }
			ai.setNewAction(alternative_actions[0], requester, q, null);
			ai.addCurrentActionLongTermTerm(alternative_actions[0]);
			ai.intentionsCausedByRequest.push(ir);
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}

		}
		ir.succeeded = true;
		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotDrop_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotDrop_IntentionAction();
	}
}
