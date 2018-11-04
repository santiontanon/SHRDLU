class AnswerHowMany_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term) 
	{
		super()
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		console.log("executeInferenceEffect: INFERENCE_RECORD_EFFECT_ANSWER_HOWMANY");
		console.log("inf.inferences.length: " + inf.inferences.length);
		console.log("inf.inferences[0].endResults: " + inf.inferences[0].endResults);

		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("A4RuleBasedAI.executeInferenceEffect: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		var speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		var queryPerformative:Term = (<TermTermAttribute>(this.effectParameter.attributes[2])).term;
		var queryVariable:VariableTermAttribute = <VariableTermAttribute>(queryPerformative.attributes[1]);
		var queryTerm:Term = null;
		if (queryPerformative.attributes[2] instanceof TermTermAttribute) {
			queryTerm = (<TermTermAttribute>(queryPerformative.attributes[2])).term;
		}
		var negativeAnswer:string = "'no-matches-found'[symbol]";
		if (queryTerm != null &&
			(queryTerm.functor.is_a(ai.cache_sort_property_with_value) ||
			 queryTerm.functor.is_a(ai.cache_sort_relation_with_value))) negativeAnswer = "'unknown'[symbol]";
		if (inf.inferences[0].endResults.length != 0) {
			var results:TermAttribute[] = [];
			for(let b of inf.inferences[0].endResults) {
				for(let [variable, value] of b.l) {
					if (variable == queryVariable &&
						results.indexOf(value) == -1) {
						// we have a result!
						results.push(value);
					}
				}
			}
//				console.log("result: " + result);
			if (results.length > 0) {
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],'"+results.length+"'[number]))", ai.o);
				// store the state in case there are more answers to be given later using perf.more answers
				var context:NLContext = ai.contextForSpeaker(speakerCharacterID);
				if (context != null) {
					ai.intentions.push(new IntentionRecord(term, null, context.getNLContextPerformative(queryPerformative), null, ai.time_in_seconds));
				} else {
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			} else {
				console.error("Inference produced a result, but none of the resulting variables is the query variable!");
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		} else {
			var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"AnswerHowMany_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables);
		return new AnswerHowMany_InferenceEffect(t);
	}


	effectParameter:Term = null;
}