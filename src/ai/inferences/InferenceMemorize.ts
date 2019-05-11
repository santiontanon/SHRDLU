class Memorize_InferenceEffect extends InferenceEffect {

	constructor(effectParameter:Term, negated:boolean) 
	{
		super()
		this.effectParameter = effectParameter;
		this.negated = negated;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		// memorize the target:
		console.log("Memorize_InferenceEffect");
		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("A4RuleBasedAI.executeInferenceEffect: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		let targetCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		let memorize:boolean = false;

		if (this.negated) {
			// this was the complex case:
			if (inf.inferences[0].endResults.length == 0) {
				// there was no contradiction...
				// We are not sure..., let's not memorize, just in case...
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.unsure('"+targetCharacterID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			} else {
				// we already knew, just say ok:
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok('"+targetCharacterID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		} else {
			if (inf.inferences[0].endResults.length == 0) {
				// there was no contradiction... we can add the sentence safely
				// we already knew, just say ok:
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok('"+targetCharacterID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				memorize = true;
			} else {
				// contradiction:
				// Check for the special case, where the player is just correcting a wrong statement she stated in the past:
				let s_l:Sentence[] = Term.termToSentences((<TermTermAttribute>(this.effectParameter.attributes[2])).term, ai.o);
				if (s_l.length == 1 && s_l[0].terms.length == 1) {
					let negatedToMemorize:Sentence = new Sentence(s_l[0].terms, [!s_l[0].sign[0]]);
					let se:SentenceEntry = ai.longTermMemory.findSentenceEntry(negatedToMemorize)
					if (se != null && se.provenance == MEMORIZE_PROVENANCE) {
						console.log("Correcting a wrong statement she stated in the past!");
						ai.longTermMemory.removeSentence(negatedToMemorize);
						let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok('"+targetCharacterID+"'[#id]))", ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
						return;
					}
				}

				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.contradict('"+targetCharacterID+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		}

		if (memorize) {
			let s_l:Sentence[] = Term.termToSentences((<TermTermAttribute>(this.effectParameter.attributes[2])).term, ai.o);
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
		return "<InferenceEffect type=\"Memorize_InferenceEffect\" "+
			   "effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\" "+
			   "negated=\""+this.negated+"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables).term;
		return new Memorize_InferenceEffect(t, xml.getAttribute("negated")=="true");
	}
	

	effectParameter:Term = null;
	negated:boolean = false;
}
