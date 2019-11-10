class AnswerWhy_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term) 
	{
		super()
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		console.log("executeInferenceEffect: INFERENCE_RECORD_EFFECT_ANSWER_WHY");
		console.log("inf.inferences.length: " + inf.inferences.length);
		console.log("inf.inferences[0].endResults: " + inf.inferences[0].endResults);

		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("A4RuleBasedAI.executeInferenceEffect: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		var speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		var toExplain:TermAttribute = this.effectParameter.attributes[2];
		var negativeAnswer:string = "'unknown'[symbol]";
		if (inf.inferences[0].endResults.length != 0) {
			var results:TermAttribute[] = [];
			for(let result of inf.inferences[0].endResults) {
				for(let [variable, value] of result.bindings.l) {
					if (variable.name == "CAUSE" &&
						results.indexOf(value) == -1) {
						// we have a result!
						results.push(value);
					}
				}
			}
//				console.log("result: " + result);
			if (results.length > 0) {
				var answer:Term = new Term(ai.o.getSort("relation.cause"),[toExplain, results[0]]);
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+answer+"))", ai.o);
//					console.log("term: " + term);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
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
		return "<InferenceEffect type=\"AnswerWhy_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables).term;
		return new AnswerWhy_InferenceEffect(t);
	}
	

	effectParameter:Term = null;
}