class AnswerWhy_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.why"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		let intention:Term = ir.action;
		let requester:TermAttribute = ir.requester;

		if (intention.attributes.length == 2) {
			if (intention.attributes[1] instanceof ConstantTermAttribute) {
				let targetID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				console.log(ai.selfID + " answer followup why to " + targetID);
				// this is a follow up question! see if we can reconstruct the question...
				let context:NLContext = ai.contextForSpeakerWithoutCreatingANewOne(targetID);
				if (context != null) {
					// get the last sentence we said:
					let lastPerf:NLContextPerformative = context.lastPerformativeBy(ai.selfID);

					if (lastPerf.cause != null) {
						// we already know the cause!!
						let causeTerm:Term = lastPerf.cause.term;
						let causeTerms:Term[] = [];
						if (causeTerm.functor.name == "#and") {
							let tal:TermAttribute[] = NLParser.elementsInList(causeTerm,"#and");
							for(let ta of tal) {
								if (ta instanceof TermTermAttribute) {
									causeTerms.push((<TermTermAttribute>ta).term);
								}
							}
						} else {
							causeTerms = [causeTerm];
						}
						for(let causeTerm2 of causeTerms) {
							let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+context.speaker+"'[#id], relation.cause([any],"+causeTerm2+")))", ai.o);
							ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, lastPerf.cause.cause, ai.time_in_seconds));
						}
						return true;
					}

					let newIntention:Term = null;
					if (lastPerf != null) newIntention = this.convertPerformativeToWhyQuestionAnswerIntention(lastPerf, ai, context);
					if (newIntention != null) {
						intention = newIntention;
					} else {
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
						ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
						return true;
					}
				} else {
					// this should never happen
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+ai.selfID+"'[#id],#and(the(NOUN:'perf.question'[perf.question],S:[singular]),noun(NOUN,S))))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
					return true;
				}
			}
		}

		console.log(ai.selfID + " answer why: " + intention);	
		if (intention.attributes.length>=3 &&
			intention.attributes[2] instanceof TermTermAttribute) {
			let toExplain:Term = (<TermTermAttribute>(intention.attributes[2])).term;

			// STEP 1: check to see if the term is in the intentionsCausedByRequest list, so we don't need inference:
			for(let cl of ai.intentionsCausedByRequest) {
				let b:Bindings = new Bindings();
				if (cl.action.unify(toExplain, OCCURS_CHECK, b)) {
					// found!
					let term:Term = new Term(ai.o.getSort("verb.ask"),[cl.requester,new ConstantTermAttribute(ai.selfID, ai.cache_sort_id)]);
					let term2:Term = new Term(ai.o.getSort("relation.cause"), [new TermTermAttribute(toExplain), new TermTermAttribute(term)]);
					let term3:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+"))", ai.o);
					(<TermTermAttribute>(term3.attributes[1])).term.attributes.push(new TermTermAttribute(term2));
					ai.intentions.push(new IntentionRecord(term3, requester, null, null, ai.time_in_seconds));
					
					return true;	
				}
			}

			// STEP 2: otherwise, launch an inference process to find an explanation:
			let query:Term = new Term(ai.o.getSort("relation.cause"), 
									  [new TermTermAttribute(toExplain),
									   new VariableTermAttribute(ai.o.getSort("any"),"CAUSE")]);
			// negate the query:
			let negated_s:Sentence = new Sentence([query],[false]);
			let negated_toExplain:Sentence = new Sentence([],[]);

			// Second inference objective (negate "toExplain"):
			{
				let s_l:Sentence[] = Term.termToSentences(toExplain, ai.o);
				let toDelete:Sentence[] = [];
				//let timeTerm:Term = null;
				for(let s of s_l) {
					if (s.terms.length == 1 && 
						(s.terms[0].functor.is_a(ai.o.getSort("time.past")) ||
						 s.terms[0].functor.is_a(ai.o.getSort("time.present")) ||
						 s.terms[0].functor.is_a(ai.o.getSort("time.future")))) {
						//timeTerm = s.terms[0];	// TODO: for now, we assume there is only one
						toDelete.push(s);
					}
				}
				for(let s of toDelete) {
					s_l.splice(s_l.indexOf(s), 1);
				}
				
				for(let s of s_l) {
					let tmp:Sentence[] = s.negate();
					if (tmp == null || tmp.length != 1) {
						console.error("executeIntention answer predicate: cannot negate query!: " + intention);		
						return true;
					}
					negated_toExplain.terms = negated_toExplain.terms.concat(tmp[0].terms);
					negated_toExplain.sign = negated_toExplain.sign.concat(tmp[0].sign);
				}
				console.log("executeIntention answer why: negated_toExplain = " + negated_toExplain);
			}

			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [[negated_s],[negated_toExplain]], 1, 0, false, null, new AnswerWhy_InferenceEffect(intention), ai.o));
		} else {
			if (requester != null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
			}
		}			
		return true;

	}


	convertPerformativeToWhyQuestionAnswerIntention(nlcp:NLContextPerformative, ai:RuleBasedAI, context:NLContext) : Term
	{
		if (nlcp.performative.functor.is_a(ai.o.getSort("perf.inform")) &&
			(nlcp.performative.attributes[1] instanceof TermTermAttribute)) {
			console.log("convertPerformativeToWhyQuestionAnswerIntention: perf.inform");
			let predicate:Term = (<TermTermAttribute>nlcp.performative.attributes[1]).term;
			let newIntention:Term = new Term(ai.o.getSort("action.answer.why"),
									 		 [new ConstantTermAttribute(nlcp.speaker, ai.o.getSort("#id")),
											  nlcp.performative.attributes[0],
										 	  new TermTermAttribute(predicate)]);
			console.log("convertPerformativeToWhyQuestionAnswerIntention, newIntention: " + newIntention);
			return newIntention;
		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.ack.denyrequest")) &&
				   nlcp.performative.attributes.length >= 1 &&
				   nlcp.performative.attributes[0] instanceof ConstantTermAttribute) {
			// Look to see which was the request for action:
			let request:NLContextPerformative = null;
			for(let p of context.performatives) {
				if (p.speaker != nlcp.speaker && 
					(p.performative.functor.name == "perf.request.action" ||
					 p.performative.functor.name == "perf.q.action") &&
					 p.performative.attributes.length >= 2) {
					request = p;
				break;
				}
			}
			if (request == null) return null;
			console.log("convertPerformativeToWhyQuestionAnswerIntention: perf.ack.denyrequest with request: " + request.performative);
			let requestedAction:TermAttribute = request.performative.attributes[1];
			let term:Term = new Term(ai.o.getSort("#not"),[new TermTermAttribute(new Term(ai.o.getSort("verb.can"), 
																						  [new ConstantTermAttribute(nlcp.speaker, ai.o.getSort("#id")),
																						   requestedAction]))]);
			let newIntention:Term = new Term(ai.o.getSort("action.answer.why"),
											 [new ConstantTermAttribute(nlcp.speaker, ai.o.getSort("#id")),
											  nlcp.performative.attributes[0],
										 	  new TermTermAttribute(term)]);
			console.log("convertPerformativeToWhyQuestionAnswerIntention, newIntention: " + newIntention);
			return newIntention;			
		}

		return null;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerWhy_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerWhy_IntentionAction();
	}
}
