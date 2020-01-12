class AnswerWhatIs_IntentionAction extends IntentionAction {

	canHandle(intention:Term, ai:RuleBasedAI) : boolean
	{
		if (intention.functor.is_a(ai.o.getSort("action.answer.whatis.name")) ||
			intention.functor.is_a(ai.o.getSort("action.answer.whatis.noname"))) return true;
		return false;
	}


	execute(ir:IntentionRecord, ai:RuleBasedAI) : boolean
	{
		let intention:Term = ir.action;

		if (intention.functor == ai.o.getSort("action.answer.whatis.name")) {
			console.log(ai.selfID + " answer whatis.name: " + intention.attributes[2]);	
			if (intention.attributes[1] instanceof ConstantTermAttribute &&
				intention.attributes[2] instanceof ConstantTermAttribute) {
				let listenerID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
				// Don't do any inference for now (we'll see if I need it later on), 
				// directly call the same function that will be called after the inference in whatis.noname:
				AnswerWhatIs_InferenceEffect.executeInferenceEffect_AnswerWhatis(null, (<ConstantTermAttribute>intention.attributes[2]).value, listenerID, ai);
			} else {
				console.error("executeIntention answer whatis.name: attribute[1] or attribute[2] was not a ConstantTermAttribute: " + intention);
			}
			return true;			


		} else if (intention.functor == ai.o.getSort("action.answer.whatis.noname")) {
			console.log(ai.selfID + " answer whatis.noname: " + intention.attributes[2]);	
			if (intention.attributes[1] instanceof ConstantTermAttribute &&
				intention.attributes[2] instanceof ConstantTermAttribute) {
				// target 1: name of the entity:
				let target1:Sentence[] = [new Sentence([new Term(ai.o.getSort("name"),
																[intention.attributes[2],
																 new VariableTermAttribute(ai.o.getSort("symbol"), "NAME")])],[false])];
				ai.inferenceProcesses.push(new InferenceRecord(ai, [], [target1], 1, 0, false, null, new AnswerWhatIs_InferenceEffect(intention), ai.o));
			} else {
				console.error("executeIntention answer whatis.noname: attribute[1] or attribute[2] was not a ConstantTermAttribute: " + intention);
			}	
			return true;
		}		

		return false;
	}


	saveToXML(ai:RuleBasedAI) : string
	{
		return "<IntentionAction type=\"AnswerWhatIs_IntentionAction\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI) : IntentionAction
	{
		return new AnswerWhatIs_IntentionAction();
	}
}
