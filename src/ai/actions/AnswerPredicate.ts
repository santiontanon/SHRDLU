class AnswerPredicate_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.predicate"))) return true;
		if (intention.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		console.log(ai.selfID + " answer predicate: " + intention.attributes[2]);	
		var s_l:Sentence[] = Term.termToSentences((<TermTermAttribute>intention.attributes[2]).term);
		console.log("term to sentences: " + s_l);	
		var variablesPresent:boolean = false;

		// search for time-related sentences (which just indicate the time at which this query must be performed):
		let toDelete:Sentence[] = [];
		let timeTerm:Term = null;
		for(let s of s_l) {
			if (s.terms.length == 1 && 
				(s.terms[0].functor.is_a(ai.o.getSort("time.past")) ||
				 s.terms[0].functor.is_a(ai.o.getSort("time.present")) ||
				 s.terms[0].functor.is_a(ai.o.getSort("time.future")))) {
				timeTerm = s.terms[0];	// TODO: for now, we assume there is only one
				toDelete.push(s);
			}
		}
		for(let s of toDelete) {
			s_l.splice(s_l.indexOf(s), 1);
		}

		// special cases:
		if (s_l.length == 1 && 
			s_l[0].terms.length == 1 &&
			this.specialCase1Term(s_l[0].terms[0], 
								  s_l[0].sign[0],
								  timeTerm, ai, requester, 
								  intention.functor.is_a(ai.o.getSort("action.answer.predicate-negated")))) return true;

		// negate the query:
		var negated_s:Sentence = new Sentence([],[]);
		for(let s of s_l) {
			if (s.getAllVariables().length > 0) variablesPresent = true;
			var tmp:Sentence[] = s.negate();
			if (tmp == null || tmp.length != 1) {
				console.error("executeIntention answer predicate: cannot negate query!: " + intention);		
				return true;
			}
			negated_s.terms = negated_s.terms.concat(tmp[0].terms);
			negated_s.sign = negated_s.sign.concat(tmp[0].sign);
		}
		console.log("executeIntention answer predicate: negated_s = " + negated_s);
		if (variablesPresent) {
			// if there are variables in the query, we should only add the negated version, since otherwise, we get spurious results!
			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [[negated_s]], 1, 0, false, timeTerm, new AnswerPredicate_InferenceEffect(intention), ai.o));
		} else {
			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [s_l,[negated_s]], 1, 0, false, timeTerm, new AnswerPredicate_InferenceEffect(intention), ai.o));				
		}
		
		return true;
	}


	// if we are just checking for the truth value of a single term, and we can find it or it's negation in the KB, then we are done!
	specialCase1Term(term:Term, sign:boolean, timeTerm:Term, ai:RuleBasedAI, requester:TermAttribute, negated:boolean) : boolean
	{
		if (negated) sign = !sign;
		if (timeTerm == null) timeTerm = new Term(ai.o.getSort("time.present"),[]);
		for(let t of ai.shortTermMemory.plainTermList) {
			if (this.specialCaseInternal(term, sign, timeTerm, t.term, true, t.time, null, ai, requester)) return true;
		}
		for(let s of ai.longTermMemory.plainSentenceList) {
			if (s.sentence.terms.length == 1) {
				if (this.specialCaseInternal(term, sign, timeTerm, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd, ai, requester)) return true;
			}
		}
		for(let s of ai.longTermMemory.plainPreviousSentenceList) {
			if (s.sentence.terms.length == 1) {
				if (this.specialCaseInternal(term, sign, timeTerm, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd, ai, requester)) return true;
			}
		}
		for(let s of ai.longTermMemory.previousSentencesWithNoCurrentSentence) {
			if (s.sentence.terms.length == 1) {
				if (this.specialCaseInternal(term, sign, timeTerm, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd, ai, requester)) return true;
			}
		}
		return false;
	}


	specialCaseInternal(term:Term, sign:boolean, timeTerm:Term, kbTerm:Term, kbSign:boolean, kbTime0:number, kbTime1:number, ai:RuleBasedAI, requester:TermAttribute) : boolean
	{
		if (kbTerm.equalsNoBindings(term) == 1) {
			if (TimeInference.timeMatch(ai.time_in_seconds, kbTime0, kbTime1, timeTerm)) {
				if (sign == kbSign) {
					// answer yes
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'yes'[symbol]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					return true;
				} else {
					// answer no
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'no'[symbol]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					return true;
				}
			}
		}
		return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerPredicate_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerPredicate_IntentionAction();
	}
}
