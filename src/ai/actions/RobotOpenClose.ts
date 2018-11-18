class RobotOpenClose_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.open")) ||
			intention.functor.is_a(ai.o.getSort("action.close"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		var ai:RobotAI = <RobotAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;
		var targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		var door:A4Object = ai.game.findObjectByIDJustObject(targetID);
		var open:boolean = true;
		if (intention.functor.is_a(ai.o.getSort("action.close"))) {
			open = false;
		}
		if (door instanceof A4Door) {
            if ((<A4Door>door).closed == open &&
				(<A4Door>door).checkForBlockages(true, null, ai.robot.map, ai.game, [])) {
				// see if player has permission:
            	if (ai.doorsPlayerIsNotPermittedToOpen.indexOf((<A4Door>door).doorID) == -1) {
            		// do it!
			        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, null);
			        var s:A4Script = new A4Script(A4_SCRIPT_INTERACT_WITH_OBJECT, door.ID, null, 0, false, false);
//			        var s:A4Script = new A4Script(A4_SCRIPT_INTERACT, door.map.name, null, 0, false, false);
//					s.x = door.x;
//					s.y = (door.y+door.tallness)// - ai.robot.tallness;
			        q.scripts.push(s);
					ai.currentAction_scriptQueue = q;
					ai.currentActionHandler = null;
					ai.currentAction = intention;
					ai.currentAction_requester = ir.requester;
					ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
												  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
												   new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
					ai.intentionsCausedByRequest.push(ir);
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+ir.requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					return true;
				} else {
					// no permission
					var term2:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+ir.requester+", #not(verb.have("+ir.requester+",[permission-to-access]))))", ai.o);
					ai.intentions.push(new IntentionRecord(term2, null, null, null, ai.time_in_seconds));
					return true;
				}
            } else {
            	// it's already open
				if (ir.requester != null) {
					if ((<A4Door>door).closed) {
						var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+ir.requester+",property.closed('"+targetID+"'[#id])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					} else {
						var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+ir.requester+",property.opened('"+targetID+"'[#id])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					}
				}
				return true;
            }
		} else {
			if (ir.requester != null) {
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+ir.requester+"))", ai.o);
				var cause:Term = Term.fromString("#not(door('"+targetID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
			return true;
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotOpenClose_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotOpenClose_IntentionAction();
	}
}
