class RobotHelp_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("verb.help")) &&
			intention.attributes.length >= 2) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		// execute the memorize action:
		console.log(ai.selfID + " help: " + intention);	

		if (intention.attributes.length == 2) {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.q.how("+requester+", verb.help('"+ai.selfID+"'[#id],"+intention.attributes[1]+")))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		} else if (intention.attributes.length == 3 && (intention.attributes[2] instanceof TermTermAttribute)) {
			let nestedIntention:Term = (<TermTermAttribute>intention.attributes[2]).term;
			if (nestedIntention.attributes.length > 0 &&
				(nestedIntention.attributes[0] instanceof ConstantTermAttribute)) {
				let handler:IntentionAction = null;
				let newNestedIntention:Term = nestedIntention.clone([]);
				newNestedIntention.attributes[0] = new ConstantTermAttribute(ai.selfID, ai.cache_sort_id);

				if (newNestedIntention.functor.is_a(ai.o.getSort("verb.go"))) {
					// Special case for verb "go":
					newNestedIntention = new Term(ai.o.getSort("verb.take-to"),
										 		 [intention.attributes[0],	// the AI ID
										 		  nestedIntention.attributes[0],	// the requester ID
										 		  nestedIntention.attributes[1]]);	// the target destination
				}
				console.log("RobotHelp_IntentionAction, newNestedIntention:" + newNestedIntention);
				for(let ih of ai.intentionHandlers) {
					if (ih.canHandle(newNestedIntention, ai)) {
						handler = ih;
						break;
					}
				}
				if (handler != null) {
					let newIr:IntentionRecord = new IntentionRecord(newNestedIntention, ir.requester, ir.requestingPerformative, ir.cause, ir.timeStamp);
					return handler.execute(newIr, ai);
				} else {
					if (requester != null) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					}
				}
			} else {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			}

		} else {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		}

		return true;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"RobotHelp_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new RobotHelp_IntentionAction();
	}
}

