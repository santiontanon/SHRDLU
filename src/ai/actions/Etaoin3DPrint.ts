class Etaoin3DPrint_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.print")) &&
			intention.attributes.length == 2) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;
		let toPrintAttribute:TermAttribute = intention.attributes[1];

		if (toPrintAttribute instanceof VariableTermAttribute) {
			let toPrint:Sort = toPrintAttribute.sort;
			let recipe:string[] = null;

			// find a recipe that matches the request:
			for(let canPrint in ai.game.three_d_printer_recipies) {
				if (ai.o.getSort(canPrint).is_a(toPrint)) {
					toPrint = ai.o.getSort(canPrint);
					recipe = ai.game.three_d_printer_recipies[canPrint];
					break;
				}
			}

			if (recipe == null) {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					// term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", ...))", ai.o);
					// ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				return true;				
			}

			// Find a 3d printer with enough materials:
			// ...

			// Materialize the object in front of it:
			// ...

			var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+ir.requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
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
		return "<IntentionAction type=\"Etaoin3DPrint_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new Etaoin3DPrint_IntentionAction();
	}
}
