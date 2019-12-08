class A4AnswerHow_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.how"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

		if (intention.attributes.length == 2) {
			if (intention.attributes[1] instanceof ConstantTermAttribute) {
				var targetID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				console.log(ai.selfID + " answer followup how to " + targetID);
				// this is a follow up question! see if we can reconstruct the question...
				var context:NLContext = ai.contextForSpeakerWithoutCreatingANewOne(targetID);
				if (context != null) {
					// get the last sentence we said:
					var lastPerf:NLContextPerformative = context.lastPerformativeBy(ai.selfID);

					var newIntention:Term = null;
					if (lastPerf != null) newIntention = this.convertPerformativeToHowQuestionAnswerIntention(lastPerf, ai, context);
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

		if (intention.attributes.length>=3 &&
			intention.attributes[2] instanceof TermTermAttribute) {
			var action:Term = (<TermTermAttribute>intention.attributes[2]).term;

			if (action.functor.is_a(ai.o.getSort("verb.go")) &&
				action.attributes.length == 2 &&
				(action.attributes[0] instanceof ConstantTermAttribute)) {
				// This is the case, when the first attribute is the ID of an object (character), and
				// the second is the ID of a location, or a sort identifying the location
				var subject:ConstantTermAttribute = <ConstantTermAttribute>action.attributes[0];
				console.log(ai.selfID + " answer how (with verb.go): " + intention.attributes[2]);	
				// we add the sentence with positive sign, to see if it introduces a contradiction
				var target1:Sentence[] = [new Sentence([new Term(ai.o.getSort("space.at"),
																[subject,
																 new VariableTermAttribute(ai.o.getSort("#id"), "WHERE")])],[false])];
				ai.inferenceProcesses.push(new InferenceRecord(ai, [], [target1], 1, 0, false, null, new AnswerHowGoto_InferenceEffect(intention), ai.o));

			} else {
				var subject:ConstantTermAttribute = <ConstantTermAttribute>action.attributes[0];
				console.log(ai.selfID + " answer how: " + intention.attributes[2]);	
				// we add the sentence with positive sign, to see if it introduces a contradiction
				var target1:Sentence[] = [new Sentence([new Term(ai.o.getSort("relation.howto"),
																[new TermTermAttribute(action),
																 new VariableTermAttribute(ai.o.getSort("any"), "HOW")])],[false])];
				ai.inferenceProcesses.push(new InferenceRecord(ai, [], [target1], 1, 0, false, null, new AnswerHow_InferenceEffect(intention), ai.o));
				/*
				if (requester != null) {
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer("+requester+",'unknown'[symbol]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, requester, null, null, ai.time_in_seconds));
				}
				*/
			}
		}
		return true;		
	}


	convertPerformativeToHowQuestionAnswerIntention(nlcp:NLContextPerformative, ai:RuleBasedAI, context:NLContext) : Term
	{
		if ((nlcp.performative.functor.is_a(ai.o.getSort("perf.request.action")) ||
		     nlcp.performative.functor.is_a(ai.o.getSort("perf.q.action"))) &&
			(nlcp.performative.attributes[1] instanceof TermTermAttribute)) {
			console.log("convertPerformativeToHowQuestionAnswerIntention: perf.request.action/perf.q.action");

			let predicate:Term = (<TermTermAttribute>nlcp.performative.attributes[1]).term;
			let newIntention:Term = new Term(ai.o.getSort("action.answer.how"),
									 		 [new ConstantTermAttribute(nlcp.speaker, ai.o.getSort("#id")),
											  nlcp.performative.attributes[0],
										 	  new TermTermAttribute(predicate)]);
			console.log("convertPerformativeToHowQuestionAnswerIntention, newIntention: " + newIntention);
			return newIntention;
		}

		return null;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"A4AnswerHow_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new A4AnswerHow_IntentionAction();
	}
}
