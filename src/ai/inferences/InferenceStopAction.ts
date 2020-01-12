class StopAction_InferenceEffect extends InferenceEffect {

	constructor(action:Term) 
	{
		super()
		this.action = action;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		if (inf.inferences.length == 1 &&
			inf.inferences[0].endResults.length > 0) {
			let speaker:string = inf.triggeredBySpeaker;
			let context:NLContext = ai.contextForSpeaker(speaker);
			let nlcp:NLContextPerformative = context.getNLContextPerformative(inf.triggeredBy);
			this.action = this.action.applyBindings(inf.inferences[0].endResults[0].bindings);
			if (ai.stopAction(this.action, speaker)) {
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.ok('"+context.speaker+"'[#id]))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			} else {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+speaker+"'[#id]))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, new ConstantTermAttribute(speaker, ai.cache_sort_id), nlcp, null, ai.time_in_seconds));
			}
		} else {
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+inf.triggeredBySpeaker+"'[#id]))";
			let term:Term = Term.fromString(tmp, ai.o);
			let cause:Term = Term.fromString("#not("+this.action+")", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.time_in_seconds), ai.time_in_seconds));
		}		
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"StopAction_InferenceEffect\" action=\""+this.action.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("action"), o, variableNames, variables).term;
		return new StopAction_InferenceEffect(t);
	}
	

	action:Term = null;
}
