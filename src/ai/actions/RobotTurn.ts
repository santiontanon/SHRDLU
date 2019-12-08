class RobotTurn_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.rotate")) ||
			intention.functor.is_a(ai.o.getSort("verb.face"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (ai.robot.isInVehicle() || 
			intention.attributes.length==0 ||
			!(intention.attributes[0] instanceof ConstantTermAttribute)) {
			// we should never get here:
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		let destinationMap:A4Map = null;
		let destinationX:number = 0;
		let destinationY:number = 0;

		if (intention.attributes.length == 2 && 
			       (intention.attributes[1] instanceof VariableTermAttribute)) {
			let requesterID:string = (<ConstantTermAttribute>requester).value;
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

			if (intention.attributes[1].sort.is_a_string("direction")) {
				let movementAmount:number = 1;
				let targetx:number = null;
				let targety:number = null;
				if (intention.attributes[1].sort.name == "west" &&
					ai.robot.direction != A4_DIRECTION_LEFT) {
					targetx = ai.robot.x - movementAmount*8;
					targety = ai.robot.y;
				}
				if (intention.attributes[1].sort.name == "north" &&
					ai.robot.direction != A4_DIRECTION_UP) {
					targetx = ai.robot.x;
					targety = ai.robot.y - movementAmount*8;
				}
				if (intention.attributes[1].sort.name == "east" &&
					ai.robot.direction != A4_DIRECTION_RIGHT) {
					targetx = ai.robot.x + movementAmount*8;
					targety = ai.robot.y;
				}
				if (intention.attributes[1].sort.name == "south" &&
					ai.robot.direction != A4_DIRECTION_DOWN) {
					targetx = ai.robot.x;
					targety = ai.robot.y + movementAmount*8;
				}
				if (intention.attributes[1].sort.name == "direction.right") {
					targetx = ai.robot.x + movementAmount*8*direction_x_inc[(ai.robot.direction+1)%A4_NDIRECTIONS];
					targety = ai.robot.y + movementAmount*8*direction_y_inc[(ai.robot.direction+1)%A4_NDIRECTIONS];
				}
				if (intention.attributes[1].sort.name == "direction.left") {
					let dir:number = ai.robot.direction - 1;
					if (dir<0) dir += A4_NDIRECTIONS;
					targetx = ai.robot.x + movementAmount*8*direction_x_inc[dir];
					targety = ai.robot.y + movementAmount*8*direction_y_inc[dir];
				}

				let x:number = Math.floor(ai.robot.x/8)*8;
				let y:number = Math.floor(ai.robot.y/8)*8;
				while(x != targetx || y != targety) {
					if (x<targetx) x += 8;
					if (x>targetx) x -= 8;
					if (y<targety) y += 8;
					if (y>targety) y -= 8;
			        if (ai.robot.map.walkableConsideringVehicles(x, y+ai.robot.tallness,
                                         ai.robot.getPixelWidth(),
                                         ai.robot.getPixelHeight()-ai.robot.tallness,ai.robot)) {
						destinationMap = ai.robot.map;
						destinationX = x;
						destinationY = y+ai.robot.tallness;
			        } else {
			        	// obstacle!
						let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #and(obstacle(X), space.at(X, [space.here]))))";					
						let term:Term = Term.fromString(tmp, ai.o);
						ai.queueIntention(term, requester, null);
			        	break;
			        }
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

		} else {
			// we should never get here:
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		if (destinationMap == null) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
			return true;
		}

		// Check if the robot can go:
		let destinationLocation:AILocation = ai.game.getAILocationTileCoordinate(destinationMap, destinationX/destinationMap.tileWidth, destinationY/destinationMap.tileHeight);
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

		app.achievement_nlp_all_robot_actions[9] = true;
		app.trigger_achievement_complete_alert();

		// go to destination (this is "turn", so it should just be moving one step):
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
        let s:A4Script = new A4Script(A4_SCRIPT_GOTO, ai.robot.map.name, null, 0, false, false);
        s.x = destinationX;
        s.y = destinationY;
        q.scripts.push(s);
        ai.setNewAction(intention, requester, q, null);
		ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
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
		return "<IntentionAction type=\"RobotTurn_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotTurn_IntentionAction();
	}
}
