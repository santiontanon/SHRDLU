class AnswerWhy_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.why"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		if (intention.attributes.length == 2) {
			if (intention.attributes[1] instanceof ConstantTermAttribute) {
				var targetID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				console.log(ai.selfID + " answer followup why to " + targetID);
				// this is a follow up question! see if we can reconstruct the question...
				var context:NLContext = ai.contextForSpeakerWithoutCreatingANewOne(targetID);
				if (context != null) {
					// get the last sentence we said:
					var lastPerf:NLContextPerformative = context.lastPerformativeBy(ai.selfID);

					if (lastPerf.cause != null) {
						// we already know the cause!!
						var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+context.speaker+"'[#id], relation.cause([any],"+lastPerf.cause.term+")))", ai.o);
						ai.intentions.push(new IntentionRecord(term, intention.attributes[1], null, lastPerf.cause.cause, ai.time_in_seconds));
						return true;
					}

					var newIntention:Term = null;
					if (lastPerf != null) newIntention = this.convertPerformativeToWhyQuestionAnswerIntention(lastPerf, ai, context);
					if (newIntention != null) {
						intention = newIntention;
					} else {
						var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
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

		console.log(ai.selfID + " answer why: " + intention);	
		if (intention.attributes.length>=3 &&
			intention.attributes[2] instanceof TermTermAttribute) {
			var toExplain:Term = (<TermTermAttribute>(intention.attributes[2])).term;

			// STEP 1: check to see if the term is in the intentionsCausedByRequest list, so we don't need inference:
			for(let cl of ai.intentionsCausedByRequest) {
				var b:Bindings = new Bindings();
				if (cl.action.unify(toExplain, true, b)) {
					// found!
					var term:Term = new Term(ai.o.getSort("verb.ask"),[cl.requester,new ConstantTermAttribute(ai.selfID, ai.cache_sort_id)]);
					var term2:Term = new Term(ai.o.getSort("relation.cause"), [new TermTermAttribute(toExplain), new TermTermAttribute(term)]);
					var term3:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+"))", ai.o);
					(<TermTermAttribute>(term3.attributes[1])).term.attributes.push(new TermTermAttribute(term2));
					ai.intentions.push(new IntentionRecord(term3, requester, null, null, ai.time_in_seconds));
					
					return true;	
				}
			}

			// STEP 2: otherwise, launch an inference process to find an explanation:
			var query:Term = new Term(ai.o.getSort("relation.cause"), 
									  [new TermTermAttribute(toExplain),
									   new VariableTermAttribute(ai.o.getSort("any"),"CAUSE")]);
			// negate the query:
			var negated_s:Sentence = new Sentence([query],[false]);
			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [[negated_s]], 1, 0, false, null, new AnswerWhy_InferenceEffect(intention), ai.o));
		} else {
			if (requester != null) {
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
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
