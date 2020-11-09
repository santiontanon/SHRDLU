class AnswerQuery_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.query")) ||
			intention.functor.is_a(ai.o.getSort("action.answer.query-followup"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		let intention:Term = ir.action;

		if (intention.functor == ai.o.getSort("action.answer.query-followup")) {
	    	if (intention.attributes.length == 3) {
				// follow up query:
				console.log(ai.selfID + " answer query followup: " + intention.attributes[0] + " - " + intention.attributes[1] + " - "  + intention.attributes[2]);
				let targetID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				let context:NLContext = ai.contextForSpeakerWithoutCreatingANewOne(targetID);
				if (context != null) {
					// get the last sentence we said:
					let lastPerf:NLContextPerformative = null;
					// we don't use "lastPerformativeBy", since that would just return the "follow up question"
					for(let i:number = 1;i<context.performatives.length;i++) {
						if (context.performatives[i].speaker == targetID) {
							lastPerf = context.performatives[i];
							break;
						}
					}
					let newIntention:Term = null;
					if (lastPerf != null) newIntention = this.convertPerformativeToQueryfollowupQuestionAnswerIntention(lastPerf, intention.attributes[2].sort, ai);
					if (newIntention == null) {
						// this should never happen
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+intention.attributes[1]+",'unknown'[symbol]))", ai.o);
						ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
						return true;
					}
					intention = newIntention;
				} else {
					return true;
				}
			} else {
				console.error("executeIntention answer queryfollowup: wrong number of arguments: " + intention);					
				return true;
			}
		}

		console.log(ai.selfID + " answer query: " + intention.attributes[0] + " - " + intention.attributes[1] + " - "  + intention.attributes[2]);
		if (intention.attributes[2] instanceof TermTermAttribute) {
			let queryPerformative:Term = (<TermTermAttribute>intention.attributes[2]).term;
			let s_l:Sentence[] = Term.termToSentences((<TermTermAttribute>(queryPerformative.attributes[2])).term, ai.o);
			let forAlls:Term[] = [];
			if (queryPerformative.attributes.length >= 4) {
				forAlls = NLParser.termsInList((<TermTermAttribute>(queryPerformative.attributes[3])).term, "#and");
			}
			console.log("forAlls: " + forAlls);

			console.log("expression: " + (<TermTermAttribute>(queryPerformative.attributes[2])).term);
			console.log("expression to sentences: ");
			for(let s of s_l) {
				console.log("    " + s.toString())
			}

			// search for time-related sentences (which just indicate the time at which this query must be performed):
			// or terms that require KB updates (e.g., property.age):
			let toDelete:Sentence[] = [];
			let timeTerm:Term = null;
			for(let s of s_l) {
				if (s.terms.length == 1 && s.terms[0].functor.name == "time.past") {
					timeTerm = s.terms[0];	// TODO: for now, we assume there is only one
					toDelete.push(s);
				}
				if (s.terms.length == 1 && s.terms[0].functor.name == "property.age") {
					// recalculate the age of all the characters we know property.botn of:
					ai.recalculateCharacterAges();
				}
			}
			for(let s of toDelete) {
				s_l.splice(s_l.indexOf(s), 1);
			}

			// negate the query:
			let targets:Sentence[][] = [];
			let negatedExpression:Term = new Term(ai.o.getSort("#not"),
												  [new TermTermAttribute(Term.sentencesToTerm(s_l, ai.o))])
			if (toDelete.length == 0) {
				negatedExpression = new Term(ai.o.getSort("#not"),
											 [new TermTermAttribute((<TermTermAttribute>(queryPerformative.attributes[2])).term)])
			}
			console.log("negatedExpression: " + negatedExpression);
			let target:Sentence[] = Term.termToSentences(negatedExpression, ai.o);
			targets.push(target)

			// negate the forAlls:
			for(let forAll of forAlls) {
				if (forAll.attributes.length >= 2 && 
					forAll.attributes[1] instanceof TermTermAttribute) {
					let forAllTerm:Term = (<TermTermAttribute>(forAll.attributes[1])).term;
			        let negatedForAll:Sentence[] = Term.termToSentences(new Term(ai.o.getSort("#not"), [new TermTermAttribute(forAllTerm)]), ai.o);
			        targets.push(negatedForAll);
			    }
			}

			console.log("targets: ");
			for(let t of targets) {
				console.log("    " + t);
			}

			// 2) start the inference process:
			ai.queuedInferenceProcesses.push(new InferenceRecord(ai, [], targets, 1, 0, true, timeTerm, new AnswerQuery_InferenceEffect(intention, ir.requestingPerformative)));

// 			let  negated_s:Sentence = new Sentence([],[]);
// 			for(let s of s_l) {
// 				let  tmp:Sentence[] = s.negate();
// 				if (tmp == null || tmp.length != 1) {
// 					console.error("executeIntention answer query: cannot negate query!: " + intention);		
// 					return true;
// 				}
// 				negated_s.terms = negated_s.terms.concat(tmp[0].terms);
// 				negated_s.sign = negated_s.sign.concat(tmp[0].sign);
// 			}
// //				console.log("executeIntention answer query: negated_s = " + negated_s);
// 			ai.queuedInferenceProcesses.push(new InferenceRecord(ai, [], [[negated_s]], 1, 0, true, timeTerm, new AnswerQuery_InferenceEffect(intention, ir.requestingPerformative)));
		} else {
			console.error("executeIntention answer query: attribute[2] was not a TermTermAttribute: " + intention);	
		}
		return true;		
	}


	convertPerformativeToQueryfollowupQuestionAnswerIntention(nlcp:NLContextPerformative, sortToLookFor:Sort, ai:RuleBasedAI) : Term
	{
		if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.predicate")) &&
			nlcp.performative.attributes.length == 2 &&
			nlcp.performative.attributes[1] instanceof TermTermAttribute) {
			let predicate:Term = (<TermTermAttribute>nlcp.performative.attributes[1]).term;
			let predicateTerms:Term[] = NLParser.termsInList(predicate, "#and");

			let objectTerms:Term[] = []
			for(let t of predicateTerms) {
				if (t.functor.is_a(sortToLookFor) &&
					t.attributes.length == 1) {
					let queryVariable:TermAttribute = t.attributes[0];
					let newPerformative:Term = new Term(ai.o.getSort("perf.q.query"),
											  	        [nlcp.performative.attributes[0],
											       		 queryVariable,
											       		 nlcp.performative.attributes[1]]);
					let intention:Term = new Term(ai.o.getSort("action.answer.query"),
												  [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
												   new ConstantTermAttribute(nlcp.speaker, ai.cache_sort_id),
												   new TermTermAttribute(newPerformative)]);
					console.log("convertPerformativeToQueryfollowupQuestionAnswerIntention, newIntention: " + intention);
					return intention;
				}
				if (t.functor.is_a(ai.o.getSort("object")) && t.attributes.length == 1) {
					objectTerms.push(t);
				}
			}
			if (objectTerms.length == 1) {
				// If we have not found the desired term, but there is at least an "object", default to that:
				let t:Term = objectTerms[0];
				let queryVariable:TermAttribute = t.attributes[0];
				let newPerformative:Term = new Term(ai.o.getSort("perf.q.query"),
										  	        [nlcp.performative.attributes[0],
										       		 queryVariable,
										       		 nlcp.performative.attributes[1]]);
				let intention:Term = new Term(ai.o.getSort("action.answer.query"),
											  [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
											   new ConstantTermAttribute(nlcp.speaker, ai.cache_sort_id),
											   new TermTermAttribute(newPerformative)]);
				console.log("convertPerformativeToQueryfollowupQuestionAnswerIntention, newIntention: " + intention);
				return intention;
			}

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.query")) &&
				   nlcp.performative.attributes.length == 3 &&
				   (nlcp.performative.attributes[1] instanceof VariableTermAttribute) &&
				   (nlcp.performative.attributes[2] instanceof TermTermAttribute)) {
			let queryVariable:TermAttribute = nlcp.performative.attributes[1];
			let query:Term = (<TermTermAttribute>nlcp.performative.attributes[2]).term;
			let queryTerms:Term[] = NLParser.termsInList(query, "#and");

			let newQuery:Term = new Term(sortToLookFor,[queryVariable]);
			for(let t of queryTerms) {
				let remove:boolean = false;
				// remove all the terms that set the type of the entities to find, and leave only the new one
				if (t.attributes.length == 1) {
					for(let sName of POSParser.sortsToConsiderForTypes) {
						if (t.functor.is_a(ai.o.getSort(sName))) {
							remove = true;
							break;
						}
					}
				}
				if (!remove) {
					newQuery = new Term(ai.o.getSort("#and"), [new TermTermAttribute(t), 
															   new TermTermAttribute(newQuery)]);
				}
			}
			let newPerformative:Term = new Term(ai.o.getSort("perf.q.query"),
									  	        [nlcp.performative.attributes[0],
									       		 queryVariable,
									       		 new TermTermAttribute(newQuery)]);
			let intention:Term = new Term(ai.o.getSort("action.answer.query"),
										  [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
										   new ConstantTermAttribute(nlcp.speaker, ai.cache_sort_id),
										   new TermTermAttribute(newPerformative)]);
			console.log("convertPerformativeToQueryfollowupQuestionAnswerIntention, newIntention: " + intention);
			return intention;

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.howmany"))) {
			let attributes:TermAttribute[] = []
			for(let att of nlcp.performative.attributes) attributes.push(att);
			let newPerformative:Term = new Term(ai.o.getSort("perf.q.query"),attributes);			
			let intention:Term = new Term(ai.o.getSort("action.answer.query"),
										  [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
										   new ConstantTermAttribute(nlcp.speaker, ai.cache_sort_id),
										   new TermTermAttribute(newPerformative)]);
			console.log("convertPerformativeToQueryfollowupQuestionAnswerIntention, newIntention: " + intention);
			return intention;
		}

		return null;
	}	


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerQuery_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerQuery_IntentionAction();
	}
}
