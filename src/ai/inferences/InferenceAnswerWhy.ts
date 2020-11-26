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
			console.error("AnswerWhy_InferenceEffect.execute: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		let speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		let toExplain:TermAttribute = this.effectParameter.attributes[2];
		let negativeAnswer:string = "'unknown'[symbol]";
		if (inf.inferences[0].endResults.length != 0) {
			let results:TermAttribute[] = [];
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
				let answer:Term = new Term(ai.o.getSort("relation.cause"),[toExplain, results[0]]);
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+answer+"))", ai.o);
//					console.log("term: " + term);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			} else {
				console.error("Inference produced a result, but none of the resulting variables is the query variable!");
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
		} else if (inf.inferences[1].endResults.length != 0) {
			let causeRecord:CauseRecord = this.generateCauseRecord(inf.inferences[1].originalTarget, inf.inferences[1].endResults[0], ai);
			if (causeRecord == null) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			} else {
				let causeTerm:Term = causeRecord.term;
				let causeTerms:Term[] = [];
				if (causeTerm.functor.name == "#and") {
					let tal:TermAttribute[] = Term.elementsInList(causeTerm,"#and");
					for(let ta of tal) {
						if (ta instanceof TermTermAttribute) {
							causeTerms.push((<TermTermAttribute>ta).term);
						}
					}
				} else {
					causeTerms = [causeTerm];
				}
				for(let causeTerm2 of causeTerms) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id], relation.cause([any],"+causeTerm2+")))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
			}
		} else {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
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