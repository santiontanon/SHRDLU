/*
- This action is for when a robot as taking another character somewhere, like "take me to the kitchen"
*/

class RobotTakeTo_IntentionAction extends IntentionAction {

	constructor()
	{
		super();
		this.needsContinuousExecution = true;
	}


	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.take-to")) &&
			intention.attributes.length >= 3 &&
			(intention.attributes[1] instanceof ConstantTermAttribute) &&
			(intention.attributes[2] instanceof ConstantTermAttribute)) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:RobotAI = <RobotAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (ai.robot.isInVehicle()) {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			ir.succeeded = false;
			return true;
		}			

		// execute the take-to action:
		console.log(ai.selfID + " take-to: " + intention);	

		let destinationMap:A4Map = null;

		// find the target destination:
		let destinationLocation:AILocation = null;
		let destinationLocationID:string = null;

		// destination is the third attribute:
		let targetID:string = (<ConstantTermAttribute>(intention.attributes[2])).value;
		let targetObject:A4Object = ai.game.findObjectByIDJustObject(targetID);
		if (targetObject != null) {
			destinationMap = targetObject.map;
			if (destinationMap != null) {
				this.destinationMapName = destinationMap.name;
			} else {
				this.destinationMapName = ai.robot.map.name;
			}
			this.destinationX = targetObject.x;
			this.destinationY = targetObject.y;
			destinationLocation = ai.game.getAILocation(targetObject);
			if (destinationLocation != null) destinationLocationID = destinationLocation.id;
		} else {
			let targetLocation:AILocation = ai.game.getAILocationByID(targetID);
			if (targetLocation != null) {
				destinationLocationID = targetID;
				let tmp2:[number,number] = targetLocation.centerWalkableCoordinatesInMap(ai.robot.map, ai.robot);
				if (tmp2 != null) {
					destinationMap = ai.robot.map;
					this.destinationMapName = destinationMap.name;
					this.destinationX = tmp2[0];
					this.destinationY = tmp2[1];
				} else {
					if (targetLocation.maps.length > 0 && 
						targetLocation.maps.indexOf(ai.robot.map) == -1) {
						// we set this so that we can later give the proper reason for why we cannot go
						destinationMap = targetLocation.maps[0];
					}
				}
			}
		}

		let guideeID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		this.guideeObject = ai.game.findObjectByIDJustObject(guideeID);
		if (this.guideeObject == null) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			ir.succeeded = false;
			return true;
		}

		// Check if the robot can go:
		let cannotGoCause:Term = ai.canGoTo(destinationMap, destinationLocationID, requester);
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

		if (intention.functor.is_a(ai.o.getSort("verb.bring")) &&
			(this.guideeObject instanceof A4Character) &&
			(targetObject instanceof A4Item)) {
			// This is not a "take-to", but a "give", change intention:
			let term:Term = Term.fromString("action.give('"+ai.selfID+"'[#id], '"+targetObject.ID+"'[#id], '"+this.guideeObject.ID+"'[#id])", ai.o);
			ir.action = term;
			// ai.intentions.push(ir);
			// ai.intentions.push(new IntentionRecord(term, requester, ir.requestingPerformative, null, ai.timeStamp));
			return null;
		}
		if ((this.guideeObject instanceof A4Item) &&
 		    (targetObject instanceof A4Character)) {
			// This is not a "take-to", but a "give", change intention:
			let term:Term = Term.fromString("action.give('"+ai.selfID+"'[#id], '"+this.guideeObject.ID+"'[#id], '"+targetObject.ID+"'[#id])", ai.o);
			ir.action = term;
			// ai.intentions.push(ir);
			// ai.intentions.push(new IntentionRecord(term, requester, ir.requestingPerformative, null, ai.timeStamp));
			return null;
		} 

		ai.setNewAction(intention, requester, null, this);
		ai.addCurrentActionLongTermTerm(intention);
		ai.intentionsCausedByRequest.push(ir);

		if (requester != null) {
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
			let term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		}

		if (this.guideeObject instanceof A4Character) {
			app.achievement_nlp_all_robot_actions[2] = true;
			app.trigger_achievement_complete_alert();
		}

		this.ir.succeeded = true;	// temporarily set this to success
		return true;
	}


	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		let ai:RobotAI = <RobotAI>ai_raw;

		if (this.guideeObject instanceof A4Character) {			
			if (ai.robot.x == this.destinationX && ai.robot.y == this.destinationY) return true;
			// check if the character we are guiding is too far:
			if (this.guideeObject.map != ai.robot.map) {
				// too far! stop
				ai.currentAction_scriptQueue = null;
				return false;
			}
			let d:number = (this.guideeObject.x - ai.robot.x)*(this.guideeObject.x - ai.robot.x) + 
						   (this.guideeObject.y - ai.robot.y)*(this.guideeObject.y - ai.robot.y);
			if (d >= RobotTakeTo_IntentionAction.distanceThreshold*RobotTakeTo_IntentionAction.distanceThreshold) {
				// too far! stop to wait for the character
				ai.currentAction_scriptQueue = null;
				return false;
			}

			// go to destination:
	        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        let s:A4Script = new A4Script(A4_SCRIPT_GOTO, this.destinationMapName, null, 0, false, false);
	        s.x = this.destinationX;
	        s.y = this.destinationY;
	        q.scripts.push(s);
			ai.currentAction_scriptQueue = q;

		} else if (this.guideeObject instanceof A4Item) {
			if (ai.robot.inventory.indexOf(this.guideeObject) == -1) {
				let object_l:A4Object[] = ai.game.findObjectByID(this.guideeObject.ID);
				if (object_l.length == 1) {
					if (object_l[0].x == this.destinationX && 
						object_l[0].y == this.destinationY && 
						object_l[0].map.name == this.destinationMapName) {
						// object is at destination, we are done!
						return true;
					}
					// we don't have the item, go pick it up!
					let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
					let s:A4Script = new A4Script(A4_SCRIPT_TAKE, this.destinationMapName, null, 0, false, false);
					s.x = this.guideeObject.x;
					s.y = this.guideeObject.y;
					q.scripts.push(s);
					ai.currentAction_scriptQueue = q;
				} else {
					// the item is in a container or character, just fail:
					if (ai.currentAction_requester != null) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+ai.currentAction_requester+"))", ai.o);
						let cause:Term = Term.fromString("#not(verb.have('"+ai.selfID+"'[#id], '"+this.guideeObject.ID+"'[#id]))", ai.o);
						ai.queueIntentionRecord(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
						this.ir.succeeded = false;
						return true;
					}
				}

			} else {
				// we have it, good!
				if (ai.robot.x == this.destinationX && ai.robot.y == this.destinationY) {
					// drop the item, and we are gone!
			        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
			        let s:A4Script = new A4Script(A4_SCRIPT_DROP, this.guideeObject.ID, null, 0, false, false);
			        q.scripts.push(s);
					ai.currentAction_scriptQueue = q;
					return false;
				} else {
					// go to destination:
			        let q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
			        let s:A4Script = new A4Script(A4_SCRIPT_GOTO, ai.robot.map.name, null, 0, false, false);
			        s.x = this.destinationX;
			        s.y = this.destinationY;
			        q.scripts.push(s);
					ai.currentAction_scriptQueue = q;
				}
			}
		} else {
			// not sure what are we doing here anyway :)
			return true;
		}

		return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		let str = "<IntentionAction type=\"RobotTakeTo_IntentionAction\"";
		if (this.guideeObject == null) {
			return str + "/>";
		} else {
			return str + " guideeObject=\""+this.guideeObject.ID+"\" destinationX=\""+this.destinationX+"\" destinationY=\""+this.destinationY+"\"/>"
		}
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		let a:RobotTakeTo_IntentionAction = new RobotTakeTo_IntentionAction();
		if (xml.getAttribute("guideeObject") != null) {
			let game:A4Game = (<A4RuleBasedAI>ai).game;
			let o:A4Object = game.findObjectByIDJustObject(xml.getAttribute("guideeObject"));
			a.guideeObject = o;
			a.destinationX = Number(xml.getAttribute("destinationX"));
			a.destinationY = Number(xml.getAttribute("destinationY"));
			a.destinationMapName = xml.getAttribute("destinationMapName");
		}
		return a;
	}


	guideeObject:A4Object = null;
	destinationX:number = 0;
	destinationY:number = 0;
	destinationMapName:string = null;

	static distanceThreshold:number = 64;
}
