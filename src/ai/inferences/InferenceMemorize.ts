class Memorize_InferenceEffect extends InferenceEffect {

	constructor(effectParameter:Term) 
	{
		super()
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		// memorize the target:
		console.log("Memorize_InferenceEffect");
		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("A4RuleBasedAI.executeInferenceEffect: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		var targetCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		var memorize:boolean = false;

		if (inf.inferences.length == 1) {
			// this means that there was a variable in the query, and thus only the negation was launched:
			if (inf.inferences[0].endResults.length == 0) {
				// memorize:
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok('"+targetCharacterID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				memorize = true;
			} else if (inf.inferences[0].endResults[0].l.length == 0) {
				// contradiction:
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.contradict('"+targetCharacterID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			} else {
				// we already knew, just say ok:
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok('"+targetCharacterID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		} else {
			if (inf.inferences[0].endResults.length == 0) {
				if (inf.inferences[1].endResults.length == 0) {
					// memorize:
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok('"+targetCharacterID+"'[#id]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					memorize = true;
				} else {
					// we already knew, just say ok:
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok('"+targetCharacterID+"'[#id]))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			} else {
				// contradiction:
				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.contradict('"+targetCharacterID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		}

		if (memorize) {
			var s_l:Sentence[] = Term.termToSentences((<TermTermAttribute>(this.effectParameter.attributes[2])).term);
			for(let s of s_l) {
				if (s.terms.length == 1 && s.sign[0] == true) {
					ai.addLongTermTerm(s.terms[0], MEMORIZE_PROVENANCE);
				} else {
					ai.addLongTermRuleNow(s, MEMORIZE_PROVENANCE);
				}
			}				
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"Memorize_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables);
		return new Memorize_InferenceEffect(t);
	}
	

	effectParameter:Term = null;
}
