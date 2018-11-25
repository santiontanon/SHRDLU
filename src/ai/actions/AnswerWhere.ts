class AnswerWhere_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.whereis")) ||
			intention.functor.is_a(ai.o.getSort("action.answer.whereto"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

//		var where_answer:number = INFERENCE_RECORD_EFFECT_ANSWER_WHEREIS;
//		if (intention.functor == ai.o.getSort("action.answer.whereto")) where_answer = INFERENCE_RECORD_EFFECT_ANSWER_WHERETO;

		if (intention.attributes.length == 2) {
			if (intention.attributes[1] instanceof ConstantTermAttribute) {
				var targetID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				console.log(ai.selfID + " answer followup where to " + targetID);
				// this is a follow up question! see if we can reconstruct the question...
				var context:NLContext = ai.contextForSpeakerWithoutCreatingANewOne(targetID);
				if (context != null) {
					// get the last sentence we said:
					var lastPerf:NLContextPerformative = null;
					// we don't use "lastPerformativeBy", since that would just return the "where?"
					for(let i:number = 1;i<context.performatives.length;i++) {
						if (context.performatives[i].speaker == targetID) {
							lastPerf = context.performatives[i];
							break;
						}
					}
					var newIntention:Term = null;
					if (lastPerf != null) newIntention = this.convertPerformativeToWhereQuestionAnswerIntention(lastPerf, ai);
					if (newIntention != null) {
						intention = newIntention;
					} else {
						// this should never happen
						var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+ai.selfID+"'[#id],#and(the(NOUN:'perf.question'[perf.question],S:[singular]),noun(NOUN,S))))))", ai.o);
						ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
						return true;
					}
				} else {
					// this should never happen
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+ai.selfID+"'[#id],#and(the(NOUN:'perf.question'[perf.question],S:[singular]),noun(NOUN,S))))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
					return true;
				}
			}
		} else if (intention.attributes.length == 4) {
			if (intention.attributes[1] instanceof ConstantTermAttribute) {
				var targetID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				console.log(ai.selfID + " answer followup where with constraint to " + targetID);
				// this is a follow up question! see if we can reconstruct the question...
				var context:NLContext = ai.contextForSpeakerWithoutCreatingANewOne(targetID);
				if (context != null) {
					// get the last sentence we said:
					var lastPerf:NLContextPerformative = null;
					// we don't use "lastPerformativeBy", since that would just return the "where?"
					for(let i:number = 1;i<context.performatives.length;i++) {
						if (context.performatives[i].speaker == targetID) {
							lastPerf = context.performatives[i];
							break;
						}
					}
					if ((lastPerf.performative.functor.name == "perf.q.whereis" ||
						lastPerf.performative.functor.name == "perf.q.whereto")) {
						if (lastPerf.performative.attributes.length==2 &&
							lastPerf.performative.attributes[1] instanceof ConstantTermAttribute) {
							// insert the missing subject of the where:
							intention.attributes.splice(2, 0, lastPerf.performative.attributes[1]);
						} else if (lastPerf.performative.attributes.length==4 &&
							lastPerf.performative.attributes[3] instanceof TermTermAttribute) {
							// insert the missing subject of the where:
							intention.attributes.splice(2, 0, lastPerf.performative.attributes[1]);
							// add additional query terms:
							var queryTermsList:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>lastPerf.performative.attributes[3]).term, "#and");
							for(let queryTerm of queryTermsList) {
								if (queryTerm instanceof TermTermAttribute) {
									intention.attributes[4] = new TermTermAttribute(new Term(ai.o.getSort("#and"),
																							 [queryTerm, intention.attributes[4]]));
								}
							}
						} else {
							// this should never happen
							var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+ai.selfID+"'[#id],#and(the(NOUN:'perf.question'[perf.question],S:[singular]),noun(NOUN,S))))))", ai.o);
							ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
							return true;
						}
					} else {
						// this should never happen
						var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+ai.selfID+"'[#id],#and(the(NOUN:'perf.question'[perf.question],S:[singular]),noun(NOUN,S))))))", ai.o);
						ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
						return true;
					}
				} else {
					// this should never happen
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.parseerror('"+context.speaker+"'[#id], #not(verb.understand('"+ai.selfID+"'[#id],#and(the(NOUN:'perf.question'[perf.question],S:[singular]),noun(NOUN,S))))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, null, ai.time_in_seconds));
					return true;
				}
			}
		}


		console.log(ai.selfID + " answer where: " + intention.attributes[2]);	
		if (intention.attributes[2] instanceof ConstantTermAttribute &&
			intention.attributes.length == 3) {
			// we add the sentence with positive sign, to see if it introduces a contradiction
			var target1:Sentence[] = [new Sentence([new Term(ai.o.getSort("space.at"),
															[intention.attributes[2],
															 new VariableTermAttribute(ai.o.getSort("#id"), "WHERE")])],[false])];
//				console.log("target1: " + target1);
			var target2:Sentence[] = [new Sentence([new Term(ai.o.getSort("space.at"),
															[intention.attributes[1],
															 new VariableTermAttribute(ai.o.getSort("#id"), "WHERE")])],[false])];
//				console.log("target2: " + target2);
			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [target1,target2], 1, 0, false, null, new AnswerWhere_InferenceEffect(intention, intention.functor == ai.o.getSort("action.answer.whereto")), ai.o));
		} else if (intention.attributes.length >= 5 &&
			      (intention.attributes[2] instanceof VariableTermAttribute) &&
			      (intention.attributes[3] instanceof VariableTermAttribute) &&
			      (intention.attributes[4] instanceof TermTermAttribute)) {
			// this is a question with a query inside, so, we need to trigger an inference procedure:
			var whoVariable:TermAttribute = intention.attributes[2];
			var whereVariable:TermAttribute = intention.attributes[3];
			(<VariableTermAttribute>whoVariable).name = "WHO";
			(<VariableTermAttribute>whereVariable).name = "WHERE";
			var additionalTermsTmp:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>(intention.attributes[4])).term, "#and");
			var target1Terms:Term[] = [new Term(ai.o.getSort("space.at"),
								 		 	    [whoVariable,
								 	 			 whereVariable])];
			var target1Signs:boolean[] = [false];
			for(let qtTmp of additionalTermsTmp) {
				if (qtTmp instanceof TermTermAttribute) {
					var additionalTerm:Term = (<TermTermAttribute>qtTmp).term;
					var additionalSign:boolean = false;
					if (additionalTerm.functor.name == "#not") {
						additionalTerm = (<TermTermAttribute>(additionalTerm.attributes[0])).term;
						additionalSign = true;
					}
					target1Terms.push(additionalTerm);
					target1Signs.push(additionalSign);
				}
			}
			var target1:Sentence[] = [new Sentence(target1Terms,target1Signs)];
			console.log("target1: " + target1);
			var target2:Sentence[] = [new Sentence([new Term(ai.o.getSort("space.at"),
															[intention.attributes[1],
															 new VariableTermAttribute(ai.o.getSort("#id"), "WHERE")])],[false])];
//				console.log("target2: " + target2);
			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [target1,target2], 1, 0, false, null, new AnswerWhere_InferenceEffect(intention, intention.functor == ai.o.getSort("action.answer.whereto")), ai.o));
			
		} else if (intention.attributes.length >= 5 &&
			       (intention.attributes[2] instanceof ConstantTermAttribute) &&
			       (intention.attributes[3] instanceof VariableTermAttribute) &&
			       (intention.attributes[4] instanceof TermTermAttribute)) {
			// this is a question with a query inside, so, we need to trigger an inference procedure:
			var whoVariable:TermAttribute = intention.attributes[2];
			var whereVariable:TermAttribute = intention.attributes[3];
			(<VariableTermAttribute>whereVariable).name = "WHERE";
			var additionalTermsTmp:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>(intention.attributes[4])).term, "#and");
			var additionalTerms:Sentence[] = [];
			var target1Terms:Term[] = [new Term(ai.o.getSort("space.at"),
								 		 	    [whoVariable,
								 	 			 whereVariable])];
			var target1Signs:boolean[] = [false];
			for(let qtTmp of additionalTermsTmp) {
				if (qtTmp instanceof TermTermAttribute) {
					var additionalTerm:Term = (<TermTermAttribute>qtTmp).term;
					var additionalSign:boolean = true;
					if (additionalTerm.functor.name == "#not") {
						additionalTerm = (<TermTermAttribute>(additionalTerm.attributes[0])).term;
						additionalSign = false;
						if (additionalTerm.containsVariable(whereVariable)) {
							// needs to be added to the query, otherwise, it's not going to work...
							target1Terms.push(additionalTerm);
							target1Signs.push(true);
						} else {
							additionalTerms.push(new Sentence([additionalTerm], [additionalSign]));
						}
					} else if (additionalTerm.functor.name == "#or") {
						additionalTerms = additionalTerms.concat(Term.termToSentences(additionalTerm, ai.o));
					} else {
						if (additionalTerm.containsVariable(whereVariable)) {
							// needs to be added to the query, otherwise, it's not going to work...
							target1Terms.push(additionalTerm);
							target1Signs.push(false);
						} else {
							additionalTerms.push(new Sentence([additionalTerm], [additionalSign]));
						}
					}
				}
			}
			var target1:Sentence[] = [new Sentence(target1Terms,target1Signs)];
			console.log("additionalTerms: " + additionalTerms);
			console.log("target1: " + target1);
			var target2:Sentence[] = [new Sentence([new Term(ai.o.getSort("space.at"),
															[intention.attributes[1],
															 new VariableTermAttribute(ai.o.getSort("#id"), "WHERE")])],[false])];
//				console.log("target2: " + target2);
			ai.inferenceProcesses.push(new InferenceRecord(ai, additionalTerms, [target1,target2], 1, 0, false, null, new AnswerWhere_InferenceEffect(intention, intention.functor == ai.o.getSort("action.answer.whereto")), ai.o));
		} else {
			console.error("executeIntention answer where: attribute[2] was not a ConstantTermAttribute nor a VariableTermAttribute: " + intention.attributes[2]);
		}

		return true;
	}


	convertPerformativeToWhereQuestionAnswerIntention(nlcp:NLContextPerformative, ai:RuleBasedAI) : Term
	{
		if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.predicate")) &&
			(nlcp.performative.attributes[1] instanceof TermTermAttribute)) {
			console.log("convertPerformativeToWhereQuestionAnswerIntention: perf.q.predicate");
			var predicate:Term = (<TermTermAttribute>nlcp.performative.attributes[1]).term;
			var terms:Term[] = NLParser.termsInList(predicate, "#and");

			var objectTerms:Term[] = [];
			for(let term of terms) {
				if (term.attributes.length == 1) {
					if (term.functor.is_a(ai.o.getSort("object"))) {
						objectTerms.push(term);
					}
				}
			}
			if (objectTerms.length == 1) {
				var newIntention:Term = new Term(ai.o.getSort("action.answer.whereis"),
										 		 [nlcp.performative.attributes[0],
											 	  new ConstantTermAttribute(nlcp.speaker, ai.o.getSort("#id")),
												  objectTerms[0].attributes[0],
												  new VariableTermAttribute(ai.o.getSort("any"), null),
												  nlcp.performative.attributes[1]]);
				console.log("convertPerformativeToWhereQuestionAnswerIntention, newIntention: " + newIntention);
				return newIntention;
			}

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.whereis")) ||
			       nlcp.performative.functor.is_a(ai.o.getSort("perf.q.whereto"))) {
			return nlcp.performative;
		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.query"))) {
			// ...

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.howmany"))) {
			// ...

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.moreresults"))) {
			// ...

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.action")) &&
				   nlcp.performative.attributes.length>=2 &&
				   nlcp.performative.attributes[1] instanceof TermTermAttribute) {
			// perf.q.action(LISTENER_0:[any], V1:verb.see(LISTENER_0, QUERY_V_0:[any]), V3:rover(QUERY_V_0))
			// perf.q.whereis(V:'etaoin'[#id], V, L, space.at(L,'location-aurora-station'[#id]))
			let action:Term = (<TermTermAttribute>nlcp.performative.attributes[1]).term;
			if (action.functor.is_a(ai.o.getSort("verb.see")) &&
				action.attributes.length==2) {
				console.log("convertPerformativeToWhereQuestionAnswerIntention: perf.q.action(verb.see)");
				if (nlcp.performative.attributes.length == 2 &&
					action.attributes[1] instanceof ConstantTermAttribute) {
					var newIntention:Term = new Term(ai.o.getSort("action.answer.whereis"),
											 		 [nlcp.performative.attributes[0],
													  new ConstantTermAttribute(nlcp.speaker, ai.o.getSort("#id")),
												  	  action.attributes[1]]);
					console.log("convertPerformativeToWhereQuestionAnswerIntention, newIntention: " + newIntention);
					return newIntention;					
				} else if (nlcp.performative.attributes.length == 3 &&
						   action.attributes[1] instanceof VariableTermAttribute) {
					var newIntention:Term = new Term(ai.o.getSort("action.answer.whereis"),
											 		 [nlcp.performative.attributes[0],
													  new ConstantTermAttribute(nlcp.speaker, ai.o.getSort("#id")),
												  	  action.attributes[1],
													  new VariableTermAttribute(ai.o.getSort("#id"), null),
													  nlcp.performative.attributes[2]]);
					console.log("convertPerformativeToWhereQuestionAnswerIntention, newIntention: " + newIntention);
					return newIntention;					
				}
			}
		}

		return null;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerWhere_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerWhere_IntentionAction();
	}
}
