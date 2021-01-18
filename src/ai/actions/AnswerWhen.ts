class AnswerWhen_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.when"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let intention:Term = ir.action;

		console.log(ai.selfID + " answer when: " + intention);	
		let resolution:Sort = null;
		let target:TermAttribute = null;

		if (intention.attributes.length == 4 &&
			(intention.attributes[3] instanceof VariableTermAttribute || intention.attributes[3] instanceof ConstantTermAttribute)) {
			target = intention.attributes[2];
			resolution = intention.attributes[3].sort;
		} else if (intention.attributes.length == 3) {
			target = intention.attributes[2];
		}

		if (target instanceof VariableTermAttribute || target instanceof ConstantTermAttribute) {
			// asking about the time of some time pronoun ("now", "today", etc.):
			if (intention.attributes[2].sort.is_a(ai.o.getSort("time.now"))) {
				let resolution:Sort = intention.attributes[3].sort;
				console.log("executeIntention answer when: answering what time is it now at resolution " + resolution);	
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",time.date('"+ai.timeStamp+"'[number],"+intention.attributes[3]+")))", ai.o);
				ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.timeStamp));
				ir.succeeded = true;
			} else {
				console.error("executeIntention answer when: unsupported when question!");	
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",'unknown'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.timeStamp));
				ir.succeeded = false;
			}
		} else if (target instanceof TermTermAttribute) {
			// asking about the time of some event:
			let time:number = this.timeOfEvent(target, ai);
			console.log("executeIntention answer when: answering what time is event " + target + " -> " + time);
			if (time == null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",'unknown'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				ir.succeeded = false;
			} else {
				if (resolution == null) {
					// if it's the same day, report minutes, otherwise, report date:
					if (getCurrentYear(ai.timeStamp) == getCurrentYear(time) &&
						getCurrentYearDay(ai.timeStamp) == getCurrentYearDay(time)) {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",time.date('"+time+"'[number], [time.minute])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
						ir.succeeded = true;
					} else {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",time.date('"+time+"'[number], [time.day])))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
						ir.succeeded = true;
					}
				} else {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",time.date('"+time+"'[number], ["+resolution.name+"])))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					ir.succeeded = true;
				}
			}
		} else {
			console.error("executeIntention answer when: unsupported case: " + intention);
			ir.succeeded = false;
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
