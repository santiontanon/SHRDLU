class AnswerWhen_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.when"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		var intention:Term = ir.action;

		console.log(ai.selfID + " answer when: " + intention);	
		var resolution:Sort = null;
		var target:TermAttribute = null;

		if (intention.attributes.length == 4 &&
			(intention.attributes[2] instanceof VariableTermAttribute || intention.attributes[2] instanceof ConstantTermAttribute)) {
			resolution = intention.attributes[2].sort;
			target = intention.attributes[3];
		} else if (intention.attributes.length == 3) {
			target = intention.attributes[2];
		}

		if (target instanceof VariableTermAttribute || target instanceof ConstantTermAttribute) {
			// asking about the time of some time pronoun ("now", "today", etc.):
			if (intention.attributes[3].sort.is_a(ai.o.getSort("time.now"))) {
				var resolution:Sort = intention.attributes[2].sort;
				console.log("executeIntention answer when: answering what time is it now at resolution " + resolution);	
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",time.date('"+ai.time_in_seconds+"'[number],"+intention.attributes[2]+")))", ai.o);
				ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
			} else {
				console.error("executeIntention answer when: unsupported when question!");	
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",'unknown'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
			}
		} else if (target instanceof TermTermAttribute) {
			// asking about the time of some event:
			var time:number = this.timeOfEvent(target, ai);
			console.log("executeIntention answer when: answering what time is event " + target + " -> " + time);
			if (time == null) {
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",'unknown'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			} else {
				if (resolution == null) {
					// if it's the same day, report minutes, otherwise, report date:
					if (getCurrentYear(ai.time_in_seconds) == getCurrentYear(time) &&
						getCurrentYearDay(ai.time_in_seconds) == getCurrentYearDay(time)) {
						var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",time.date('"+time+"'[number], [time.minute])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					} else {
						var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",time.date('"+time+"'[number], [time.day])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					}
				} else {
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",time.date('"+time+"'[number], ["+resolution.name+"])))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			}
		} else {
			console.error("executeIntention answer when: unsupported case: " + intention);
		}
		return true;
	}


	timeOfEvent(eventAtt:TermAttribute, ai:RuleBasedAI) : number
	{
		if (!(eventAtt instanceof TermTermAttribute)) return null;
		let event:Term = (<TermTermAttribute>eventAtt).term;

		// search for it in the knowledge base:
		let entry:SentenceEntry = ai.longTermMemory.containsUnifyingTerm(event);
		if (entry != null) return entry.time;

		// try in the previous memory:
		for(let se of ai.longTermMemory.plainPreviousSentenceList) {
			if (se.sentence.terms.length == 1 &&
				se.sentence.sign[0]) {
				let bindings:Bindings = new Bindings();
				if (event.unify(se.sentence.terms[0], OCCURS_CHECK, bindings)) return se.time;
			}
		}
		for(let se of ai.longTermMemory.previousSentencesWithNoCurrentSentence) {
			if (se.sentence.terms.length == 1 &&
				se.sentence.sign[0]) {
				let bindings:Bindings = new Bindings();
				if (event.unify(se.sentence.terms[0], OCCURS_CHECK, bindings)) return se.time;
			}
		}

		return null;
	}	


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerWhen_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerWhen_IntentionAction();
	}
}
