class AnswerWhoIs_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.whois.name")) ||
			intention.functor.is_a(ai.o.getSort("action.answer.whois.noname"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai_raw:RuleBasedAI) : boolean
	{
		var ai:A4RuleBasedAI = <A4RuleBasedAI>ai_raw;
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

    	app.achievement_nlp_all_types_of_questions[2] = true;
    	app.trigger_achievement_complete_alert();

		if (intention.functor.is_a(ai.o.getSort("action.answer.whois.name"))) {
			console.log(ai.selfID + " answer whois.name: " + intention.attributes[2]);	
			if (intention.attributes[1] instanceof ConstantTermAttribute &&
				intention.attributes[2] instanceof ConstantTermAttribute) {
				var listenerID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				// Don't do any inference for now (we'll see if I need it later on), 
				// directly call the same function that will be called after the inference in whois.noname:
				AnswerWho_InferenceEffect.AnswerWhois(null, (<ConstantTermAttribute>intention.attributes[2]).value, listenerID, true, ai);
			} else if (intention.attributes.length == 4 &&
					   intention.attributes[1] instanceof ConstantTermAttribute &&
					   intention.attributes[2] instanceof VariableTermAttribute &&
					   intention.attributes[3] instanceof TermTermAttribute) {
				var listenerID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				var variable:TermAttribute = intention.attributes[2];
				var query:Term = (<TermTermAttribute>(intention.attributes[3])).term;
				var query_l:Term[] = [query];
				if (query.functor.name == "#and") {
					query_l = NLParser.termsInList(query, "#and");
				}
				var query_l_signs:boolean[] = [];
				for(let i:number = 0;i<query_l.length;i++) {
					if (query_l[i].functor.name == "#not") {
						query_l[i] = (<TermTermAttribute>(query_l[i].attributes[0])).term;
						query_l_signs.push(true);
					} else {
						query_l_signs.push(false);
					}
				}
				var target1:Sentence[] = [new Sentence(query_l,query_l_signs)];
				ai.inferenceProcesses.push(new InferenceRecord(ai, [], [target1], 1, 0, false, null, new AnswerWho_InferenceEffect(intention), ai.o));
			} else {
				console.error("executeIntention answer whois.name: case not handled: " + intention);
			}
			return true;		


		} else if (intention.functor.is_a(ai.o.getSort("action.answer.whois.noname"))) {
			if (intention.attributes.length >= 3) {
				console.log(ai.selfID + " answer whois.noname: " + intention.attributes[2]);	
				if (intention.attributes[1] instanceof ConstantTermAttribute &&
					intention.attributes[2] instanceof ConstantTermAttribute) {
					// target 1: name of the entity:
					var target1:Sentence[] = [new Sentence([new Term(ai.o.getSort("name"),
																	[intention.attributes[2],
																	 new VariableTermAttribute(ai.o.getSort("symbol"), "NAME")])],[false])];
					ai.inferenceProcesses.push(new InferenceRecord(ai, [], [target1], 1, 0, false, null, new AnswerWho_InferenceEffect(intention), ai.o));
				} else {
					console.error("executeIntention answer whois.noname: attribute[1] or attribute[2] was not a ConstantTermAttribute: " + intention);
				}
			} else {
					console.error("executeIntention answer whois.noname: less attributes than expected!");
			}

			return true;
		}

		return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerWhoIs_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerWhoIs_IntentionAction();
	}
}


