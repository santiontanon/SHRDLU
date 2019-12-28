class RobotPushPull_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.push")) ||
			intention.functor.is_a(ai.o.getSort("action.pull")) ||
			(intention.functor.is_a(ai.o.getSort("verb.move")) &&
			  intention.attributes.length >= 2 &&
			  (intention.attributes[1] instanceof ConstantTermAttribute))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}			

		if (intention.attributes.length < 1 ||
			!(intention.attributes[0] instanceof ConstantTermAttribute)) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		let targetObject:A4Object = null;
		let adverbSort:Sort = null;
		let targetDirection:number = -1;

		if (intention.attributes.length >= 2) {
			if ((intention.attributes[1] instanceof ConstantTermAttribute)) {
				let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
				let targetObjectL:A4Object[] = ai.game.findObjectByID(targetID);
				if (targetObjectL == null) {
					if (requester != null) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
						let cause:Term = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], '"+targetID+"'[#id]))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
					}
					return true;
				}
				if (targetObjectL.length != 1) {
					if (requester != null) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					}
					return true;
				}
				targetObject = targetObjectL[0];
			} else if ((intention.attributes[1] instanceof VariableTermAttribute)) {
				adverbSort = intention.attributes[1].sort;
			}
		}
		if (adverbSort == null &&
			intention.attributes.length >= 3 && 
			(intention.attributes[2] instanceof VariableTermAttribute)) {
			adverbSort = intention.attributes[2].sort;
		}

		if (adverbSort != null) {
			if (adverbSort.name == "north") targetDirection = A4_DIRECTION_UP;
			if (adverbSort.name == "east") targetDirection = A4_DIRECTION_RIGHT;
			if (adverbSort.name == "south") targetDirection = A4_DIRECTION_DOWN;
			if (adverbSort.name == "west") targetDirection = A4_DIRECTION_LEFT;
			if (adverbSort.name == "forward") targetDirection = ai.robot.direction;
			if (adverbSort.name == "backward") targetDirection = (ai.robot.direction+2)%A4_NDIRECTIONS;
			if (adverbSort.name == "direction.right") targetDirection = (ai.robot.direction+1)%A4_NDIRECTIONS;
			if (adverbSort.name == "direction.left") targetDirection = (ai.robot.direction+3)%A4_NDIRECTIONS;
		}		

		if (targetObject == null) {
			// check if there is an object next to the robot that can be pushed 
			// (preferring one that is in the direction of the push, and otherwise, the one in front):
			let bestDirection:number = -1;
			for(let direction:number = 0; direction<4; direction++) {
	            let collisions:A4Object[] = ai.robot.map.getAllObjectCollisionsWithOffset(ai.robot, direction_x_inc[direction], direction_y_inc[direction]);
	            for(let o of collisions) {
	                if (o.isPushable()) {
	                	if (targetObject == null) {
	                		targetObject = o;
	                		bestDirection = direction;
	                	} else {
	                		if (direction == targetDirection) {
	                			// overwrite:
		                		targetObject = o;
		                		bestDirection = direction;
	                		} else if (direction == ai.robot.direction &&
	                				   bestDirection != targetDirection) {
	                			// overwrite:
		                		targetObject = o;
		                		bestDirection = direction;	                			
	                		}
	                	}
	                	break;
	                }
	            }
	        }
		}
		if (targetObject == null) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		let destinationMap:A4Map = targetObject.map;

		// Check if the robot can go:
		let destinationLocation:AILocation = ai.game.getAILocation(targetObject);
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
		
		if (destinationMap == null || destinationMap != ai.robot.map) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
			return true;
		}

		app.achievement_nlp_all_robot_actions[10] = true;
		app.trigger_achievement_complete_alert();

		// perform the action:
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
        let s:A4Script = null
        
        if (intention.functor.is_a(ai.o.getSort("action.pull"))) {
			s = new A4Script(A4_SCRIPT_PULL, targetObject.ID, null, targetDirection, false, false);
        } else {
        	s = new A4Script(A4_SCRIPT_PUSH, targetObject.ID, null, targetDirection, false, false);
        }
        q.scripts.push(s);
        ai.setNewAction(intention, requester, q, this);
		ai.addLongTermTerm(new Term(intention.functor,
									[new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
									 new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
		ai.intentionsCausedByRequest.push(ir);
		
		if (requester != null) {
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
			let term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}

		return true;
	}


	actionScriptsFailed(ai:RuleBasedAI, requester:TermAttribute) 
	{
		let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.can('"+ai.selfID+"'[#id], verb.move('"+ai.selfID+"'[#id], object-personal-pronoun('object-personal-pronoun.it'[symbol], [singular], [gender-neutral], [third-person]))))))";
		let term:Term = Term.fromString(tmp, ai.o);
		ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));		
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotPushPull_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotPushPull_IntentionAction();
	}
}
