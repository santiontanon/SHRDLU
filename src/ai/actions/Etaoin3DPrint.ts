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
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(X:verb.know-how(E:'"+ai.selfID+"'[#id], action.print(E, ["+toPrint.name+"])))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				return true;				
			}

			// Find a 3d printer with enough materials:
			let doWeNeedMetal:boolean = false;
			for(let material of recipe) {
				if (ai.o.getSort(material).is_a(ai.o.getSort("metal"))) {
					doWeNeedMetal = true;
					break;
				}
			}
			let printers:A4Object[] = [];
			let map:A4Map = ai.game.getMap("Aurora Station")
			for(let o of map.objects) {
				if (o.name == "plastic 3d printer" && !doWeNeedMetal) printers.push(o);
				if (o.name == "metal 3d printer") printers.push(o);
				
			}
			let bestPrinter:A4Object = null;
			let bestMissingMaterials:string[] = [];
			for(let printer of printers) {
				let missing:string[] = [];
				for(let material of recipe) {
					if (printer.getStoryStateVariable(material) != "true") {
						missing.push(material);
					}
				}
				if (bestPrinter == null || missing.length < bestMissingMaterials.length) {
					bestPrinter = printer;
					bestMissingMaterials = missing;
				} else {
					// change printer randomly, so that we don't always just use the left-most one!
					if (missing.length == 0 && Math.random()<0.5) {
						bestPrinter = printer;
						bestMissingMaterials = missing;
					}
				}
			}
			if (bestMissingMaterials.length > 0) {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(X:verb.have('"+bestPrinter.ID+"'[#id], ["+bestMissingMaterials[0]+"]))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				return true;								
			}

			// Materialize the object in front of it:
		    let obj:A4Object = ai.game.objectFactory.createObject(toPrint.name, ai.game, false, false);
		    obj.x = bestPrinter.x+ai.game.tileWidth;
		    obj.y = bestPrinter.y+bestPrinter.getPixelHeight();
		    map.addObject(obj);

			var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+ir.requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+ir.requester+", space.at('"+obj.ID+"'[#id], 'location-maintenance'[#id])))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

			// force a perception update on the maintenance room, to make sure we can talk about the newly printed object:
			ai.perceptionFocusedOnObject([obj], obj);

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
