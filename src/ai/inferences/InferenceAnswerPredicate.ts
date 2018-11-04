class AnswerPredicate_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term) 
	{
		super()
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		console.log("AnswerPredicate_InferenceEffect");
		console.log("inf.inferences.length: " + inf.inferences.length);
		for(let i:number = 0;i<inf.inferences.length;i++) {
			console.log("inf.inferences["+i+"].endResults: " + inf.inferences[i].endResults);
		}

		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("A4RuleBasedAI.executeInferenceEffect: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		var targetCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;

		if (inf.inferences.length == 1) {
			// this means that there was a variable in the query, and thus only the negation was launched:
			if (inf.inferences[0].endResults.length == 0) {
//					console.log("inference.endResults.length == 0, and no inferenceNegated");
				let answer:string = "no"
				if (this.effectParameter.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) answer = "yes";
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'"+answer+"'[symbol]))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
//				console.log("new intention: " + term);
			} else if (inf.inferences[0].endResults[0].l.length == 0) {
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'unknown'[symbol]))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			} else {
				for(let [variable,value] of inf.inferences[0].endResults[0].l) {
					if (value instanceof ConstantTermAttribute &&
						value.sort.name == "#id") {
						// we need to add this mention to the context entity list:
						var context:NLContext = ai.contextForSpeaker(targetCharacterID);
						if (context != null) {
							var ce:NLContextEntity = context.newContextEntity(value, ai.time_in_seconds, null, ai.o);
							var idx:number = context.mentions.indexOf(ce);
							if (idx != -1) context.mentions.splice(idx,1);
							context.mentions.unshift(ce);
						}
					}
				}

				let answer:string = "yes"
				if (this.effectParameter.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) answer = "no";
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'"+answer+"'[symbol]))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		} else {
			if (inf.inferences[0].endResults.length == 0) {
				if (inf.inferences[1].endResults.length == 0) {
	//						console.log("inference.endResults.length == 0, and inferenceNegated.endResults.length == 0");
					var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'unknown'[symbol]))";
					var term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
	//				console.log("new intention: " + term);
				} else {
	//						console.log("inference.endResults.length == 0, and inferenceNegated.endResults.length != 0");
					let answer:string = "yes"
					if (this.effectParameter.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) answer = "no";
					var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'"+answer+"'[symbol]))";
					var term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
	//				console.log("new intention: " + term);
				}
			} else {
				//console.log("inference.endResults.length != 0");
				let answer:string = "no"
				if (this.effectParameter.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) answer = "yes";
				var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'"+answer+"'[symbol]))";
				var term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
	//				console.log("new intention: " + term);
			}
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"AnswerPredicate_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables);
		return new AnswerPredicate_InferenceEffect(t);
	}


	effectParameter:Term = null;
}