class Etaoin3DPrint_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if ((intention.functor.is_a(ai.o.getSort("action.print")) ||
			 intention.functor.is_a(ai.o.getSort("verb.make")) ||
			 intention.functor.is_a(ai.o.getSort("verb.create"))) &&
			intention.attributes.length == 2) return true;
		return false;
	}


	canHandleWithoutInference(perf:Term) : boolean
	{
		if (perf.attributes.length == 4 &&
			perf.attributes[1] instanceof TermTermAttribute &&
			perf.attributes[2] instanceof TermTermAttribute) {
			let action:Term = (<TermTermAttribute>(perf.attributes[1])).term;
			if (action.attributes.length == 2 && 
				(action.attributes[0] instanceof ConstantTermAttribute) &&
				(action.attributes[1] instanceof VariableTermAttribute)) {
				return true;
			}
		}
		return super.canHandleWithoutInference(perf);
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let ai:EtaoinAI = <EtaoinAI>ai_raw;
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;
		let toPrint:Sort = null;
		if (intention.attributes.length == 2) {
			let toPrintAttribute:TermAttribute = intention.attributes[1];
			if ((toPrintAttribute instanceof VariableTermAttribute) ||
				(toPrintAttribute instanceof ConstantTermAttribute)) {
				toPrint = toPrintAttribute.sort;
			}
			let perf:Term = ir.requestingPerformative.performative;
			if (perf.attributes.length == 4 &&
				(perf.attributes[2] instanceof TermTermAttribute) &&
				(toPrintAttribute instanceof VariableTermAttribute)) {
				let constraint:Term = (<TermTermAttribute>perf.attributes[2]).term;
				toPrint = constraint.functor;
			}
		}

		console.log("Etaoin3DPrint_IntentionAction, toPrint: " + toPrint);

		if (toPrint != null){
			let recipe_idx:number = -1;
			let recipe:string[] = null;

			if (toPrint.name == "power-cord") toPrint = ai.o.getSort("cable");

			// find a recipe that matches the request:
			for(let tmp of ai.game.three_d_printer_recipies) {
				let canPrint:string = tmp[0];
				if (ai.o.getSort(canPrint).is_a(toPrint)) {
					toPrint = ai.o.getSort(canPrint);
					recipe = tmp[1];
					recipe_idx = ai.game.three_d_printer_recipies.indexOf(tmp);
					break;
				}
			}

			if (recipe == null) {
				if (requester != null) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(X:verb.know-how(E:'"+ai.selfID+"'[#id], action.print(E, ["+toPrint.name+"])))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				ir.succeeded = false;
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
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+requester+", #not(X:verb.have('"+bestPrinter.ID+"'[#id], ["+bestMissingMaterials[0]+"]))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
				ir.succeeded = false;
				return true;								
			}

			// Materialize the object in front of it:
		    let obj:A4Object = ai.game.objectFactory.createObject(toPrint.name, ai.game, false, false);
		    obj.x = bestPrinter.x+ai.game.tileWidth;
		    obj.y = bestPrinter.y+bestPrinter.getPixelHeight();
		    map.addObject(obj);

			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok("+ir.requester+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform("+ir.requester+", space.at('"+obj.ID+"'[#id], 'location-maintenance'[#id])))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));

			// force a perception update on the maintenance room, to make sure we can talk about the newly printed object:
			ai.perceptionFocusedOnObject([obj], obj);
			// add the object existence to long term memory:
			ai.addLongTermTerm(Term.fromString(obj.sort.name+"('"+obj.ID+"'[#id])", ai.o), PERCEPTION_PROVENANCE);

			app.achievement_interact_3d_printed_one_of_each_kind[recipe_idx] = true;
			app.achievement_nlp_all_etaoin_actions[5] = true;
			app.trigger_achievement_complete_alert();
			ir.succeeded = true;
		} else {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest("+requester+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			ir.succeeded = false;
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
