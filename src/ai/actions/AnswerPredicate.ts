class AnswerPredicate_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.predicate"))) return true;
		if (intention.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		this.ir = ir;		
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		let s_l:Sentence[] = Term.termToSentences((<TermTermAttribute>intention.attributes[2]).term, ai.o);
		let additional_sentences:Sentence[] = [];
		let forAlls:Term[] = [];
		let variablesPresent:boolean = false;

		if (intention.attributes.length == 5) {
			additional_sentences = Term.termToSentences((<TermTermAttribute>intention.attributes[3]).term, ai.o);
			forAlls = NLParser.termsInList((<TermTermAttribute>(intention.attributes[3])).term, "#and");
		} else if (intention.attributes.length == 4) {
			forAlls = NLParser.termsInList((<TermTermAttribute>(intention.attributes[3])).term, "#and");
			if (forAlls.length == 0 || forAlls[0].functor.name != "#forall") {
				forAlls = [];
				additional_sentences = Term.termToSentences((<TermTermAttribute>intention.attributes[3]).term, ai.o);
			}
		}
		console.log("forAlls: " + forAlls);

		console.log(ai.selfID + " answer predicate: " + intention.attributes[2]);	
		console.log("term to sentences: " + s_l);
		console.log("additional sentences: " + additional_sentences);

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
								  intention.functor.is_a(ai.o.getSort("action.answer.predicate-negated")))) {
			ir.succeeded = true;
			return true;
		}

		let negated_s:Sentence = new Sentence([],[]);
		for(let s of s_l) {
			if (s.getAllVariables().length > 0) variablesPresent = true;
			let tmp:Sentence[] = s.negate();
			if (tmp == null || tmp.length != 1) {
				console.error("executeIntention answer predicate: cannot negate query!: " + intention);		
				ir.succeeded = false;
				return true;
			}
			negated_s.terms = negated_s.terms.concat(tmp[0].terms);
			negated_s.sign = negated_s.sign.concat(tmp[0].sign);
		}
		console.log("executeIntention answer predicate: negated_s = " + negated_s);
		let targets:Sentence[][];
		if (variablesPresent) {
			// if there are variables in the query, we should only add the negated version, since otherwise, we get spurious results!
			targets = [[negated_s]];
		} else {
			targets = [s_l,[negated_s]];
		}
		// negate the forAlls:
		for(let forAll of forAlls) {
			if (forAll.attributes.length >= 2 && 
				forAll.attributes[1] instanceof TermTermAttribute) {
				let forAllTerm:Term = (<TermTermAttribute>(forAll.attributes[1])).term;
		        let negatedForAll:Sentence[] = Term.termToSentences(new Term(ai.o.getSort("#not"), [new TermTermAttribute(forAllTerm)]), ai.o);
		        targets.push(negatedForAll);
		    }
		}
		ai.queuedInferenceProcesses.push(new InferenceRecord(ai, additional_sentences, targets, 1, 0, false, timeTerm, new AnswerPredicate_InferenceEffect(intention)));
		// TODO: this should have some temporary value (in all actions that require inference or continuous execution)
		// that is then replaced with true/false after inference/continuous is done
		ir.succeeded = true;
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
			if (TimeInference.timeMatch(ai.timeStamp, kbTime0, kbTime1, timeTerm)) {
				if (sign == kbSign) {
					// answer yes
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'yes'[symbol]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
					return true;
				} else {
					// answer no
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'no'[symbol]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
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
