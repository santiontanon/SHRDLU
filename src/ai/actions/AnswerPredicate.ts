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
		console.log("AnswerPredicate_IntentionAction: " + ai.selfID + " answer predicate: " + intention.attributes[2]);
		console.log("    forAlls: " + forAlls);

		// search for time-related sentences (which just indicate the time at which this query must be performed):
		let toDelete:Sentence[] = [];
		let timeTerms:Term[] = [];
		for(let s of s_l) {
			if (s.terms.length == 1 && 
				s.sign[0] &&	// TODO: consider negated time terms
				s.terms[0].functor.is_a(ai.o.getSort("time"))) {
				timeTerms.push(s.terms[0]);
				toDelete.push(s);
			}
		}
		for(let s of toDelete) {
			s_l.splice(s_l.indexOf(s), 1);
		}

		console.log("    term to sentences: " + s_l);
		console.log("    term to sentences (time terms): " + timeTerms);
		console.log("    additional sentences: " + additional_sentences);

		// special cases:
		let conjunction:boolean = true;
		let conjunction_terms:Term[] = [];
		let conjunction_signs:boolean[] = [];
		for(let sentence of s_l) {
			if (sentence.terms.length != 1) {
				conjunction = false;
			} else {
				conjunction_terms.push(sentence.terms[0]);
				conjunction_signs.push(sentence.sign[0]);
			}
		}
		if (conjunction &&
			this.specialCaseConjunction(conjunction_terms, 
						  				conjunction_signs,
									  	timeTerms, ai, requester, 
								  		intention.functor.is_a(ai.o.getSort("action.answer.predicate-negated")))) {
			ir.succeeded = true;
			return true;
		}

		let negated_s:Sentence = new Sentence([],[]);

		let mainTimeTerm:Term = null;
		if (timeTerms.length >= 0) mainTimeTerm = timeTerms[0];
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
		console.log("    executeIntention answer predicate: negated_s = " + negated_s);
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
		ai.queuedInferenceProcesses.push(new InferenceRecord(ai, additional_sentences, targets, 1, 0, false, mainTimeTerm, new AnswerPredicate_InferenceEffect(intention)));
		// TODO: this should have some temporary value (in all actions that require inference or continuous execution)
		// that is then replaced with true/false after inference/continuous is done
		ir.succeeded = true;
		return true;
	}

	/*
	// if we are just checking for the truth value of a single term, and we can find it or it's negation in the KB, then we are done!
	specialCase1Term(term:Term, sign:boolean, timeTerms:Term[], ai:RuleBasedAI, requester:TermAttribute, negated:boolean) : boolean
	{
		let timeRangeStart:number = ai.timeStamp;
		let timeRangeEnd:number = ai.timeStamp;
		let ignoreCurrentIfTheresPrevious:boolean = false;
		if (negated) sign = !sign;
		for(let timeTerm of timeTerms) {
			// add constraints to the time range:
			if (timeTerm.functor.is_a_string("time.past")) {
				if (timeTerm.functor.is_a_string("time.yesterday")) {
					timeRangeEnd = Math.floor(ai.timeStamp / (24*60*60)) * (24*60*60);
					timeRangeStart = timeRangeEnd - (24*60*60);
				} else {
					timeRangeStart = 0;
					timeRangeEnd = ai.timeStamp;
					ignoreCurrentIfTheresPrevious = true;
				}
			} else if (timeTerm.functor.is_a_string("time.future")) {
				timeRangeStart = ai.timeStamp;
				timeRangeEnd = Number.MAX_VALUE;
			}
		}	
		console.log("    specialCase1Term: " + timeRangeStart + " - " + timeRangeEnd);
		console.log("    memory: " + ai.shortTermMemory.plainTermList.length + "-" + ai.shortTermMemory.plainPreviousTermList.length + ", " +
								     ai.longTermMemory.plainSentenceList.length + "-" + ai.longTermMemory.plainPreviousSentenceList.length + "-" + ai.longTermMemory.previousSentencesWithNoCurrentSentence.length);
		for(let t of ai.shortTermMemory.plainTermList) {
			if (ignoreCurrentIfTheresPrevious && t.previousInTime != null) continue;
			if (this.specialCaseInternal(term, sign, timeRangeStart, timeRangeEnd, t.term, true, t.time, t.timeEnd, ai, requester)) return true;
		}
		for(let t of ai.shortTermMemory.plainPreviousTermList) {
			if (this.specialCaseInternal(term, sign, timeRangeStart, timeRangeEnd, t.term, true, t.time, t.timeEnd, ai, requester)) return true;
		}
		for(let s of ai.longTermMemory.plainSentenceList) {
			if (ignoreCurrentIfTheresPrevious && s.previousInTime != null) continue;
			if (s.sentence.terms.length == 1) {
				if (this.specialCaseInternal(term, sign, timeRangeStart, timeRangeEnd, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd, ai, requester)) return true;
			}
		}
		for(let s of ai.longTermMemory.plainPreviousSentenceList) {
			if (s.sentence.terms.length == 1) {
				if (this.specialCaseInternal(term, sign, timeRangeStart, timeRangeEnd, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd, ai, requester)) return true;
			}
		}
		for(let s of ai.longTermMemory.previousSentencesWithNoCurrentSentence) {
			if (s.sentence.terms.length == 1) {
				if (this.specialCaseInternal(term, sign, timeRangeStart, timeRangeEnd, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd, ai, requester)) return true;
			}
		}
		console.log("    specialCase1Term could not handle it...");
		return false;
	}


	specialCaseInternal(term:Term, sign:boolean, timeRangeStart:number, timeRangeEnd:number, kbTerm:Term, kbSign:boolean, kbTime0:number, kbTime1:number, ai:RuleBasedAI, requester:TermAttribute) : boolean
	{
		// console.log("    specialCaseInternal: " + kbTerm + "  [" + kbTime0 + " - " + kbTime1 + "]");
		if (kbTerm.equalsNoBindings(term) == 1) {
			// if (TimeInference.timeMatch(ai.timeStamp, kbTime0, kbTime1, timeTerm)) {
			if ((timeRangeEnd > kbTime0 || kbTime0 == undefined) && 
				(timeRangeStart < kbTime1 || kbTime1 == undefined)) {
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
	*/

	specialCaseConjunction(terms:Term[], sign:boolean[], timeTerms:Term[], ai:RuleBasedAI, requester:TermAttribute, negated:boolean) : boolean
	{
		let timeRangeStart:number = ai.timeStamp;
		let timeRangeEnd:number = ai.timeStamp;
		let ignoreCurrentIfTheresPrevious:boolean = false;
		for(let timeTerm of timeTerms) {
			// add constraints to the time range:
			if (timeTerm.functor.is_a_string("time.past")) {
				if (timeTerm.functor.is_a_string("time.yesterday")) {
					timeRangeEnd = Math.floor(ai.timeStamp / (24*60*60)) * (24*60*60);
					timeRangeStart = timeRangeEnd - (24*60*60);
				} else {
					timeRangeStart = 0;
					timeRangeEnd = ai.timeStamp;
					ignoreCurrentIfTheresPrevious = true;
				}
			} else if (timeTerm.functor.is_a_string("time.future")) {
				timeRangeStart = ai.timeStamp;
				timeRangeEnd = Number.MAX_VALUE;
			}
		}	
		console.log("    specialCaseConjunction: " + timeRangeStart + " - " + timeRangeEnd);
		console.log("    memory: " + ai.shortTermMemory.plainTermList.length + "-" + ai.shortTermMemory.plainPreviousTermList.length + ", " +
								     ai.longTermMemory.plainSentenceList.length + "-" + ai.longTermMemory.plainPreviousSentenceList.length + "-" + ai.longTermMemory.previousSentencesWithNoCurrentSentence.length);

		let ret:boolean = this.specialCaseConjunctionRecursive(0, terms, sign, new Bindings(), timeRangeStart, timeRangeEnd, ignoreCurrentIfTheresPrevious, ai);
		if (ret == null) {
			return false;
		} else {
			if (negated) ret = !ret;
			if (ret) {
				// answer no
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'yes'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			} else {
				// answer yes
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'no'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
			return true;
		}
	}


	/*
	Return values:
	- true: match! term is true
	- null: no match
	- false: we found a match with opposite sign and there were no variables, so, we know the inference result is negative
	*/
	specialCaseConjunctionRecursive(idx:number, terms:Term[], sign:boolean[], bindings:Bindings, timeRangeStart:number, timeRangeEnd:number, ignoreCurrentIfTheresPrevious:boolean, ai:RuleBasedAI) : boolean
	{
		// console.log("        specialCaseConjunctionRecursive: " + idx + ", bindings: " + bindings);
		if (idx >= terms.length) return true;
		
		let trail:number = bindings.l.length;
		for(let t of ai.shortTermMemory.plainTermList) {
			if (ignoreCurrentIfTheresPrevious && t.previousInTime != null) continue;
			let ret:boolean = this.specialCaseMatchTermInternal(terms[idx], sign[idx], bindings, timeRangeStart, timeRangeEnd, t.term, true, t.time, t.timeEnd);
			if (ret == true) {
				if (this.specialCaseConjunctionRecursive(idx+1, terms, sign, bindings, timeRangeStart, timeRangeEnd, ignoreCurrentIfTheresPrevious, ai)) return true;
				if (bindings.l.length > trail) bindings.l.splice(trail, bindings.l.length - trail);
			} else if (ret == false) {
				return false;
			}
		}
		for(let t of ai.shortTermMemory.plainPreviousTermList) {
			let ret:boolean = this.specialCaseMatchTermInternal(terms[idx], sign[idx], bindings, timeRangeStart, timeRangeEnd, t.term, true, t.time, t.timeEnd);
			if (ret == true) {
				if (this.specialCaseConjunctionRecursive(idx+1, terms, sign, bindings, timeRangeStart, timeRangeEnd, ignoreCurrentIfTheresPrevious, ai)) return true;
				if (bindings.l.length > trail) bindings.l.splice(trail, bindings.l.length - trail);
			} else if (ret == false) {
				return false;
			}
		}
		for(let s of ai.longTermMemory.plainSentenceList) {
			if (ignoreCurrentIfTheresPrevious && s.previousInTime != null) continue;
			if (s.sentence.terms.length == 1) {
				let ret:boolean = this.specialCaseMatchTermInternal(terms[idx], sign[idx], bindings, timeRangeStart, timeRangeEnd, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd);
				if (ret == true) {
					if (this.specialCaseConjunctionRecursive(idx+1, terms, sign, bindings, timeRangeStart, timeRangeEnd, ignoreCurrentIfTheresPrevious, ai)) return true;
					if (bindings.l.length > trail) bindings.l.splice(trail, bindings.l.length - trail);
				} else if (ret == false) {
					return false;
				}
			}
		}
		for(let s of ai.longTermMemory.plainPreviousSentenceList) {
			if (s.sentence.terms.length == 1) {
				let ret:boolean = this.specialCaseMatchTermInternal(terms[idx], sign[idx], bindings, timeRangeStart, timeRangeEnd, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd);
				if (ret == true) {				
					if (this.specialCaseConjunctionRecursive(idx+1, terms, sign, bindings, timeRangeStart, timeRangeEnd, ignoreCurrentIfTheresPrevious, ai)) return true;
					if (bindings.l.length > trail) bindings.l.splice(trail, bindings.l.length - trail);
				} else if (ret == false) {
					return false;
				}
			}
		}
		for(let s of ai.longTermMemory.previousSentencesWithNoCurrentSentence) {
			if (s.sentence.terms.length == 1) {
				let ret:boolean = this.specialCaseMatchTermInternal(terms[idx], sign[idx], bindings, timeRangeStart, timeRangeEnd, s.sentence.terms[0], s.sentence.sign[0], s.time, s.timeEnd);
				if (ret == true) {
					if (this.specialCaseConjunctionRecursive(idx+1, terms, sign, bindings, timeRangeStart, timeRangeEnd, ignoreCurrentIfTheresPrevious, ai)) return true;
					if (bindings.l.length > trail) bindings.l.splice(trail, bindings.l.length - trail);
				} else if (ret == false) {
					return false;
				}
			}
		}
		// console.log("        specialCaseConjunctionRecursive: " + idx + ", backtracking");
		return null;
	}


	/*
	Return values:
	- true: match! term is true
	- null: no match
	- false: we found a match with opposite sign and there were no variables, so, we know the inference result is negative
	*/
	specialCaseMatchTermInternal(term:Term, sign:boolean, bindings:Bindings, timeRangeStart:number, timeRangeEnd:number, kbTerm:Term, kbSign:boolean, kbTime0:number, kbTime1:number) : boolean
	{
		// console.log("    specialCaseInternal: " + kbTerm + "  [" + kbTime0 + " - " + kbTime1 + "]");
		if ((timeRangeEnd > kbTime0 || kbTime0 == undefined) && 
			(timeRangeStart < kbTime1 || kbTime1 == undefined)) {
			if (sign == kbSign) {
				if (term.subsumes(kbTerm, false, bindings)) {
					return true;
				}
			} else if (term.equalsNoBindings(kbTerm) == 1 &&
					   !term.containsAnyVariable()) {
				return false;
			}
		}
		return null;
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
