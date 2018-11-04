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
		var ai:RobotAI = <RobotAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		// execute the memorize action:
		console.log(ai.selfID + " take-to: " + intention);	

		var destinationMap:A4Map = null;
		var hasPermission:boolean = true;

		// find the target destination:
		// destination is the third attribute:
		var targetID:string = (<ConstantTermAttribute>(intention.attributes[2])).value;
		var targetObject:A4Object = ai.game.findObjectByIDJustObject(targetID);
		if (targetObject != null) {
			destinationMap = targetObject.map;
			this.destinationX = targetObject.x;
			this.destinationY = (targetObject.y+targetObject.tallness);// - ai.robot.tallness;
		} else {
			var targetLocation:AILocation = ai.game.getAILocationByID(targetID);
			if (targetLocation != null) {
				if (ai.locationsWherePlayerIsNotPermitted.indexOf(targetID) == -1) {
//						var tmp2:[number,number] = targetLocation.centerCoordinatesInMap(ai.robot.map);
					var tmp2:[number,number] = targetLocation.centerWalkableCoordinatesInMap(ai.robot.map, ai.robot);
					if (tmp2 != null) {
						destinationMap = ai.robot.map;
						this.destinationX = tmp2[0];
						this.destinationY = tmp2[1];
					} else {
						if (targetLocation.maps.length > 0 && 
							targetLocation.maps.indexOf(ai.robot.map) == -1) {
							// we set this so that we can later give the proper reason for why we cannot go
							destinationMap = targetLocation.maps[0];
						}
					}
				} else {
					hasPermission = false;
				}
			}
		}

		let guideeID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		this.guideeObject = ai.game.findObjectByIDJustObject(guideeID);
		if (this.guideeObject == null) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		if (destinationMap == null || destinationMap != ai.robot.map || this.guideeObject.map != ai.robot.map) {
			if (requester != null) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				let cause:Term;
				if (destinationMap == null) {
					cause = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
				} else {
					cause = Term.fromString("#not(verb.can(ME:'"+ai.selfID+"'[#id], verb.go(ME, [space.outside])))", ai.o);
				}
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				if (!hasPermission) {
					// say "you do not have access to that location":
					let term2:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.have("+requester+",[permission-to-access]))))", ai.o);
					ai.intentions.push(new IntentionRecord(term2, null, null, null, ai.time_in_seconds));
				}
			}
			return true;
		}

		ai.currentActionHandler = this;
		ai.currentAction = intention;
		ai.currentAction_requester = requester;
		ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
									  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
									   new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
		ai.intentionsCausedByRequest.push(ir);
		ai.currentAction_scriptQueue = null;

		if (requester != null) {
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
			let term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}

		this.executeContinuous(ai);
		return true;
	}


	executeContinuous(ai_raw:RuleBasedAI) : boolean
	{
		var ai:RobotAI = <RobotAI>ai_raw;

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
				// too far! stop
				ai.currentAction_scriptQueue = null;
				return false;
			}

			// go to destination:
	        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
	        var s:A4Script = new A4Script(A4_SCRIPT_GOTO, ai.robot.map.name, null, 0, false, false);
	        s.x = this.destinationX;
	        s.y = this.destinationY;
	        q.scripts.push(s);
			ai.currentAction_scriptQueue = q;

		} else if (this.guideeObject instanceof A4Item) {
			if (ai.robot.inventory.indexOf(this.guideeObject) == -1) {
				// we don't have the item, go pick it up!
				var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
				var s:A4Script = new A4Script(A4_SCRIPT_TAKE, ai.robot.map.name, null, 0, false, false);
				s.x = this.guideeObject.x;
				s.y = (this.guideeObject.y+this.guideeObject.tallness)// - ai.robot.tallness;;
				q.scripts.push(s);
				ai.currentAction_scriptQueue = q;

			} else {
				// we have it, good!
				if (ai.robot.x == this.destinationX && ai.robot.y == this.destinationY) {
					// drop the item, and we are gone!
			        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
			        var s:A4Script = new A4Script(A4_SCRIPT_DROP, this.guideeObject.ID, null, 0, false, false);
			        q.scripts.push(s);
					ai.currentAction_scriptQueue = q;

					return true;
				} else {
					// go to destination:
			        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
			        var s:A4Script = new A4Script(A4_SCRIPT_GOTO, ai.robot.map.name, null, 0, false, false);
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
		}
		return a;
	}


	guideeObject:A4Object = null;
	destinationX:number = 0;
	destinationY:number = 0;

	static distanceThreshold:number = 64;
}
