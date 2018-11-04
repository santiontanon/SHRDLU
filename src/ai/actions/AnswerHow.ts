class AnswerHow_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.how"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		var intention:Term = ir.action;
		var requester:TermAttribute = ir.requester;

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


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerHow_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerHow_IntentionAction();
	}
}
