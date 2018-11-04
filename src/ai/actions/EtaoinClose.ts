class EtaoinClose_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.close"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		var ai:EtaoinAI = <EtaoinAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		var targetID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		var door:A4Object = ai.game.findObjectByIDJustObject(targetID);
		if ((door instanceof A4Door) &&
			(<A4Door>door).checkForBlockages(true, null, door.map, ai.game, [])) {
            if (!(<A4Door>door).closed) {
				// see if player has permission:
            	if (ai.doorsPlayerIsNotPermittedToOpen.indexOf((<A4Door>door).doorID) == -1) {
            		// close!
            		(<A4Door>door).eventWithID(A4_EVENT_OPEN, (<A4Door>door).doorID, null, door.map, ai.game);

					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				} else {
					// no permission
					var term2:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(verb.have("+requester+",[permission-to-access]))))", ai.o);
					ai.intentions.push(new IntentionRecord(term2, null, null, null, ai.time_in_seconds));
				}
            } else {
            	// it's already open
				if (requester != null) {
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+",property.closed('"+targetID+"'[#id])))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
            }
		} else {
			if (requester != null) {
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				var cause:Term = Term.fromString("#not(door('"+targetID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
			}
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"EtaoinClose_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new EtaoinClose_IntentionAction();
	}
}
