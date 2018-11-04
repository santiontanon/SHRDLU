class RobotGive_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.give"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		var ai:RobotAI = <RobotAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		var targetID:string = (<ConstantTermAttribute>(intention.attributes[2])).value;
		var itemToGive:TermAttribute = intention.attributes[1];

		if (itemToGive instanceof ConstantTermAttribute) {
			var itemToGiveID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
			var item:A4Object = null;
			for(let item2 of ai.robot.inventory) {
				if (item2.ID == itemToGiveID) {
					item = item2;
					break;
				}
			}

			if (item != null) {
				if (ai.objectsNotAllowedToGive.indexOf(itemToGiveID) != -1) {
					// state that it cannot give this item:
					var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+targetID+"'[#id]))";
					var term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

				} else {
					// give the item:
					var targetCharacter:A4Character = <A4Character>ai.game.findObjectByIDJustObject(targetID);
					if (targetCharacter == null) {
						if (requester != null) {
							var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
							var cause:Term = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], '"+targetID+"'[#id]))", ai.o);
							ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
						}				
						return false;
					} else {
						var destinationMap:A4Map = targetCharacter.map;
						if (destinationMap == null || destinationMap != ai.robot.map) {
							if (requester != null) {
								var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
								var cause:Term = Term.fromString("#not(verb.know('"+ai.selfID+"'[#id], #and(the(P:'path'[path], N:[singular]), noun(P, N))))", ai.o);
								ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
							}				
							return false;							
						} else {
							var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))";
							var term:Term = Term.fromString(tmp, ai.o);
							ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

					        var q:A4ScriptExecutionQueue = new A4ScriptExecutionQueue(ai.robot, ai.robot.map, ai.game, targetCharacter);
					        var s:A4Script = new A4Script(A4_SCRIPT_GOTO_CHARACTER, targetID, null, 0, false, false);
		//			        s.x = targetCharacter.x;
		//			        s.y = targetCharacter.y;
					        q.scripts.push(s);
					        var s2:A4Script = new A4Script(A4_SCRIPT_GIVE, itemToGiveID, null, 0, false, false);
					        q.scripts.push(s2);
							ai.currentAction_scriptQueue = q;
							ai.currentAction = intention;
							ai.currentAction_requester = requester;
							ai.addLongTermTerm(new Term(ai.o.getSort("verb.do"),
														  [new ConstantTermAttribute(ai.selfID,ai.cache_sort_id),
														   new TermTermAttribute(intention)]), PERCEPTION_PROVENANCE);
							ai.intentionsCausedByRequest.push(ir);
						}
					}
				}
			} else {
				// we do not have such item:
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.have('"+ai.selfID+"'[#id], '"+itemToGiveID+"'[#id]))))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		} else {
			// we do not have such item:
			var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.have('"+ai.selfID+"'[#id],"+intention.attributes[2].toString()+"))))";
			var term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotGive_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotGive_IntentionAction();
	}
}
