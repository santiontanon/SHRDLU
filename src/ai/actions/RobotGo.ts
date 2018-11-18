class RobotGo_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.go")) ||
			intention.functor.is_a(ai.o.getSort("verb.move"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		var ai:RobotAI = <RobotAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		if (intention.attributes.length==0 ||
			!(intention.attributes[0] instanceof ConstantTermAttribute)) {
			// we should never get here:
			if (requester != null) {
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}

		var destinationMap:A4Map = null;
		var destinationX:number = 0;
		var destinationY:number = 0;
		var hasPermission:boolean = true;

		// find the target destination:
		if (intention.functor.name == "verb.come-back" ||
			intention.functor.name == "verb.come" &&
			(intention.attributes.length == 1 ||
			 intention.attributes.length == 2 &&
			 (intention.attributes[1] instanceof VariableTermAttribute) &&
			 intention.attributes[1].sort.is_a(ai.o.getSort("space.here"))) &&
			requester != null &&
			requester instanceof ConstantTermAttribute) {
			// destination is the position of the speaker:
			var requesterID:string = (<ConstantTermAttribute>requester).value;
			var targetObject:A4Object = ai.game.findObjectByIDJustObject(requesterID);
			if (targetObject != null) {
				destinationMap = targetObject.map;
				destinationX = targetObject.x;
				destinationY = targetObject.y;
			}
			if (targetObject == null) {
				// we should never get here:
				if (requester != null) {
					var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
					var term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				return true;
			}
		} else if (intention.attributes.length == 2 && 
			       (intention.attributes[1] instanceof VariableTermAttribute) &&
			       intention.attributes[1].sort.name == "space.away") {
			// Find a nearby location and go there:
			var requesterID:string = (<ConstantTermAttribute>requester).value;
			var targetObject:A4Object = ai.game.findObjectByIDJustObject(requesterID);
			if (targetObject != null) {
				var bestD:number = null;
				var bestX:number = null;
				var bestY:number = null;
				for(let location of ai.game.locations) {
					if (ai.locationsWherePlayerIsNotPermitted.indexOf(location.id) == -1) {
						// candidate location to go to:
						var coords:[number,number] = location.centerCoordinatesInMap(targetObject.map);
						if (coords!=null) {
							var d:number = Math.abs(targetObject.x - coords[0]) + Math.abs(targetObject.y - coords[1]);
							console.log("location distance: " + d + " (" + location.id + ")");
							if (d > 128) {	// some arbitrary definition of "away"
								if (bestD == null || d<bestD) {
									bestD = d;
									bestX = coords[0];
									bestY = coords[1];
								}
							}
						}
					}
				}
				if (bestX != null) {
					destinationMap = targetObject.map;
					destinationX = bestX;
					destinationY = bestY;
				} else {
					targetObject = null;	// to triger the denyrequest message
				}
			}
			if (targetObject == null) {
				// we should never get here:
				if (requester != null) {
					var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
					var term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				return true;
			}

		} else if (intention.attributes.length == 2 && 
			       intention.attributes[1] instanceof ConstantTermAttribute) {
			// destination is the second attribute:
			var targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
			var targetObject:A4Object = ai.game.findObjectByIDJustObject(targetID);
			if (targetObject != null) {
				destinationMap = targetObject.map;
				destinationX = targetObject.x;
				destinationY = (targetObject.y+targetObject.tallness);// - ai.robot.tallness;
			} else {
				var targetLocation:AILocation = ai.game.getAILocationByID(targetID);
				if (targetLocation != null) {
					if (ai.locationsWherePlayerIsNotPermitted.indexOf(targetID) == -1) {
//						var tmp2:[number,number] = targetLocation.centerCoordinatesInMap(ai.robot.map);
						var tmp2:[number,number] = targetLocation.centerWalkableCoordinatesInMap(ai.robot.map, ai.robot);
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
					} else {
						hasPermission = false;
					}
				}
			}
		} else {
			// we should never get here:
			if (requester != null) {
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
			return true;
		}
		if (destinationMap == null || destinationMap != ai.robot.map) {
			if (requester != null) {
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))";
				var cause:Term;
				if (destinationMap == null) {
					cause = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
				} else {
					cause = Term.fromString("#not(verb.can(ME:'"+ai.selfID+"'[#id], verb.go(ME, [space.outside])))", ai.o);
				}
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
				if (!hasPermission) {
					// say "you do not have access to that location":
					var term2:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.have("+requester+",[permission-to-access]))))", ai.o);
					ai.intentions.push(new IntentionRecord(term2, null, null, null, ai.time_in_seconds));
				}
			}
			return true;
		}

		// go to destination:
        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
        var s:A4Script = new A4Script(A4_SCRIPT_GOTO, ai.robot.map.name, null, 0, false, false);
        s.x = destinationX;
        s.y = destinationY;
        q.scripts.push(s);
		ai.currentAction_scriptQueue = q;
		ai.currentActionHandler = null;
		ai.currentAction = intention;
		ai.currentAction_requester = requester;
		ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
									  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
									   new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
		ai.intentionsCausedByRequest.push(ir);
		if (requester != null) {
			var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
			var term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}
		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotGo_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotGo_IntentionAction();
	}
}
