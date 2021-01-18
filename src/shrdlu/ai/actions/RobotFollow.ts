class RobotFollow_IntentionAction extends IntentionAction {

	constructor()
	{
		super();
		this.needsContinuousExecution = true;
	}


	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.follow"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		/*
		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			return true;
		}
		*/		

		if (!ai.visionActive) {
			if (requester != null) {
				let term1:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("property.blind('"+ai.selfID+"'[#id])", ai.o);
				let term2:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", property.blind('"+ai.selfID+"'[#id])))", ai.o);
				ai.intentions.push(new IntentionRecord(term1, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
				ai.intentions.push(new IntentionRecord(term2, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
			}
			ir.succeeded = false;
			return true;
		}

		if (intention.attributes.length==0 ||
			!(intention.attributes[0] instanceof ConstantTermAttribute)) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}			
			ir.succeeded = false;	
			return true;
		}
		let targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		this.targetObject = ai.game.findObjectByIDJustObject(targetID);
		if (this.targetObject == null) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], '"+targetID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
			}				
			ir.succeeded = false;
			return true;
		}

		let destinationMap:A4Map = this.targetObject.map;

		if (destinationMap == null || destinationMap != ai.robot.map) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				let cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
			}				
			ir.succeeded = false;
			return true;
		}

		if (requester != null) {
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
			let term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		}

		app.achievement_nlp_all_robot_actions[0] = true;
		app.trigger_achievement_complete_alert();

		ai.intentionsCausedByRequest.push(ir);
        ai.setNewAction(intention, requester, null, this);
        ai.addCurrentActionLongTermTerm(intention);

		this.executeContinuous(ai);
		ir.succeeded = true;
		return true;
	}


	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;

		// Check if we need to leave a vehicle:
		if (ai.robot.isInVehicle()) {
			if ((this.targetObject instanceof A4Character)) {
				let target_c:A4Character = <A4Character>this.targetObject;
				if (target_c.isInVehicle() &&
					ai.robot.vehicle == target_c.vehicle) {
					return false;
				} else {
					ai.robot.disembark();
				}
			} else {
				ai.robot.disembark();
			}
			return false;
		}

		let destinationX:number = this.targetObject.x;
		let destinationY:number = this.targetObject.y;

		// go to destination:
        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
        let s:A4Script = new A4Script(A4_SCRIPT_GOTO_OPENING_DOORS, this.targetObject.map.name, null, 0, false, false);
        s.x = destinationX;
        s.y = destinationY;
        q.scripts.push(s);
		ai.currentAction_scriptQueue = q;

		return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"RobotFollow_IntentionAction\"";
		if (this.targetObject == null) {
			return str + "/>";
		} else {
			return str + " targetObject=\""+this.targetObject.ID+"\"/>";
		}
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:RobotFollow_IntentionAction = new RobotFollow_IntentionAction();
		if (xml.getAttribute("targetObject") != null) {
			let game:A4Game = (<A4RuleBasedAI>ai).game;
			let o:A4Object = game.findObjectByIDJustObject(xml.getAttribute("targetObject"));
			a.targetObject = o;
		}
		return a;
	}


	targetObject:A4Object = null;
}
