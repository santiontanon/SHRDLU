class AnswerWhatIs_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term) 
	{
		super()
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
			var listenerID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
			var targetID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[2])).value;
			var targetName:string = null;
			if (inf.inferences[0].endResults.length != 0) {
				for(let b of inf.inferences[0].endResults[0].l) {
					if (b[0].name == "NAME") {
						var v:TermAttribute = b[1];
						if (v instanceof ConstantTermAttribute) {
							targetName = (<ConstantTermAttribute>v).value;
							break;
						}
					}
				}
			}
			AnswerWhatIs_InferenceEffect.executeInferenceEffect_AnswerWhatis(targetName, targetID, listenerID, ai);
	}

	static executeInferenceEffect_AnswerWhatis(name:string, whatID:string, listenerID:string, ai:RuleBasedAI)
	{
//		console.log("executeInferenceEffect_AnswerWhatis: " + name + ", " + whatID);

		// get the types:
		var mostSpecificTypes:Term[] = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("object('"+whatID+"'[#id])", ai.o));
		if (mostSpecificTypes == null || mostSpecificTypes.length == 0) mostSpecificTypes = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("space.location('"+whatID+"'[#id])", ai.o));
		if (mostSpecificTypes == null || mostSpecificTypes.length == 0) mostSpecificTypes = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("abstract-entity('"+whatID+"'[#id])", ai.o));
		if (mostSpecificTypes == null || mostSpecificTypes.length == 0) mostSpecificTypes = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("role('"+whatID+"'[#id])", ai.o));
		console.log("executeInferenceEffect_AnswerWhatis: mostSpecificTypes: " + mostSpecificTypes);

		// generate the talk intentions:
		if (name == null && mostSpecificTypes.length == 0) {
			ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id],'unknown'[symbol]))", ai.o), 
													 new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
		} else {
			if (name != null) {
				ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id],name('"+whatID+"'[#id],'"+name+"'[symbol])))", ai.o), 
														 new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
			}
			if (mostSpecificTypes.length != 0) {
				ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id], "+mostSpecificTypes[0]+"))", ai.o), 
														 new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
			}
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"AnswerWhatIs_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables);
		return new AnswerWhatIs_InferenceEffect(t);
	}


	effectParameter:Term = null;
}