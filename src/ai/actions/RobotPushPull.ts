class RobotPushPull_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.push")) ||
			intention.functor.is_a(ai.o.getSort("action.pull"))) return true;
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

		if (targetObject == null) {
			// check if there is an object in front:
            let collisions:A4Object[] = ai.robot.map.getAllObjectCollisionsWithOffset(ai.robot, direction_x_inc[ai.robot.direction], direction_y_inc[ai.robot.direction]);
            for(let o of collisions) {
                if (o.isPushable()) {
                	targetObject = o;
                	break;
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


		let direction:number = -1;
		let destinationMap:A4Map = targetObject.map;
		let destinationX:number = targetObject.x;
		let destinationY:number = (targetObject.y+targetObject.tallness);

		// Check if the robot can go:
		let destinationLocation:AILocation = ai.game.getAILocation(targetObject);
		let destinationLocationID:string = null;
		if (destinationLocation != null) destinationLocationID = destinationLocation.id;
		let cannotGoCause:Term = ai.canGoTo(destinationMap, destinationLocationID);
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

		if (adverbSort != null) {
			if (adverbSort.name == "north") direction = A4_DIRECTION_UP;
			if (adverbSort.name == "east") direction = A4_DIRECTION_RIGHT;
			if (adverbSort.name == "south") direction = A4_DIRECTION_DOWN;
			if (adverbSort.name == "west") direction = A4_DIRECTION_LEFT;
			if (adverbSort.name == "forward") direction = ai.robot.direction;
			if (adverbSort.name == "backward") direction = (ai.robot.direction+2)%A4_NDIRECTIONS;
			if (adverbSort.name == "direction.right") direction = (ai.robot.direction+1)%A4_NDIRECTIONS;
			if (adverbSort.name == "direction.left") direction = (ai.robot.direction+3)%A4_NDIRECTIONS;
		}

		// perform the action:
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
        let s:A4Script = null
        
        if (intention.functor.is_a(ai.o.getSort("action.push"))) {
        	s = new A4Script(A4_SCRIPT_PUSH, targetObject.ID, null, direction, false, false);
        } else {
			s = new A4Script(A4_SCRIPT_PULL, targetObject.ID, null, direction, false, false);
        }
        q.scripts.push(s);
		ai.currentAction_scriptQueue = q;
		ai.currentActionHandler = null;
		ai.currentAction = intention;
		ai.currentAction_requester = requester;
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


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotPushPull_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotPushPull_IntentionAction();
	}
}
