class AnswerHowMany_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.howmany"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

    	app.achievement_nlp_all_types_of_questions[5] = true;
    	app.trigger_achievement_complete_alert();

		console.log(ai.selfID + " answer howmany: " + intention.attributes[0] + " - " + intention.attributes[1] + " - "  + intention.attributes[2]);
		if (intention.attributes[2] instanceof TermTermAttribute) {
			var queryPerformative:Term = (<TermTermAttribute>intention.attributes[2]).term;

			if (queryPerformative.attributes.length == 1) {
				if (intention.attributes[1] instanceof ConstantTermAttribute) {
					var targetID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
					console.log(ai.selfID + " answer followup howmany to " + targetID);
					// this is a follow up question! see if we can reconstruct the question...
					var context:NLContext = ai.contextForSpeakerWithoutCreatingANewOne(targetID);
					if (context != null) {
						// get the last sentence we said:
						var lastPerf:NLContextPerformative = null;
						// we don't use "lastPerformativeBy", since that would just return the "how many?"
						for(let i:number = 1;i<context.performatives.length;i++) {
							if (context.performatives[i].speaker == targetID) {
								lastPerf = context.performatives[i];
								break;
							}
						}
						var newIntention:Term = null;
						if (lastPerf != null) newIntention = this.convertPerformativeToHowManyQuestionAnswerIntention(lastPerf, ai);
						if (newIntention != null) {
							intention = newIntention;
							queryPerformative = (<TermTermAttribute>intention.attributes[2]).term;
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


			var s_l:Sentence[] = Term.termToSentences((<TermTermAttribute>(queryPerformative.attributes[2])).term, ai.o);
			// negate the query:
			var negated_s:Sentence = new Sentence([],[]);
			for(let s of s_l) {
				var tmp:Sentence[] = s.negate();
				if (tmp == null || tmp.length != 1) {
					console.error("executeIntention answer query: cannot negate query!: " + intention);		
					return true;
				}
				negated_s.terms = negated_s.terms.concat(tmp[0].terms);
				negated_s.sign = negated_s.sign.concat(tmp[0].sign);
			}
//				console.log("executeIntention answer query: negated_s = " + negated_s);
			ai.inferenceProcesses.push(new InferenceRecord(ai, [], [[negated_s]], 1, 0, true, null, new AnswerHowMany_InferenceEffect(intention), ai.o));
		} else {
			console.error("executeIntention answer howmany: attribute[2] was not a TermTermAttribute: " + intention);	
		}
		return true;
	}


	convertPerformativeToHowManyQuestionAnswerIntention(nlcp:NLContextPerformative, ai:RuleBasedAI) : Term
	{
		if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.predicate")) &&
			(nlcp.performative.attributes[1] instanceof TermTermAttribute)) {
			console.log("convertPerformativeToHowManyQuestionAnswerIntention: perf.q.predicate");
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
				var newIntention:Term = new Term(ai.o.getSort("action.answer.howmany"),
										 		 [nlcp.performative.attributes[0],
											 	  new ConstantTermAttribute(nlcp.speaker, ai.o.getSort("#id")),
											 	  new TermTermAttribute(
											 	  	new Term(ai.o.getSort("perf.q.howmany"),
											 	  		     [nlcp.performative.attributes[0],
											 	  		      objectTerms[0].attributes[0],
											 	  			  nlcp.performative.attributes[1]]))]);
				console.log("convertPerformativeToHowManyQuestionAnswerIntention, newIntention: " + newIntention);
				return newIntention;
			}

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.whereis")) ||
			       nlcp.performative.functor.is_a(ai.o.getSort("perf.q.whereto"))) {
			// ...
		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.query"))) {			
			let attributes:TermAttribute[] = []
			for(let att of nlcp.performative.attributes) attributes.push(att);
			let newPerformative:Term = new Term(ai.o.getSort("perf.q.howmany"),attributes);			
			let intention:Term = new Term(ai.o.getSort("action.answer.howmany"),
										  [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
										   new ConstantTermAttribute(nlcp.speaker, ai.cache_sort_id),
										   new TermTermAttribute(newPerformative)]);
			console.log("convertPerformativeToHowManyQuestionAnswerIntention, newIntention: " + intention);
			return intention;

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.q.howmany"))) {
			return nlcp.performative;

		} else if (nlcp.performative.functor.is_a(ai.o.getSort("perf.moreresults"))) {
			// ...

		}

		return null;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerHowMany_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerHowMany_IntentionAction();
	}
}
