class ExecuteAction_InferenceEffect extends InferenceEffect {

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
			let ir:IntentionRecord = new IntentionRecord(this.action, new ConstantTermAttribute(speaker, ai.cache_sort_id), nlcp, null, ai.time_in_seconds);
			let tmp:number = ai.canSatisfyActionRequest(ir);
			if (tmp == ACTION_REQUEST_CAN_BE_SATISFIED) {
				ai.intentions.push(ir);
			} else if (tmp == ACTION_REQUEST_CANNOT_BE_SATISFIED) {
				let tmp2:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+speaker+"'[#id]))";
				let term:Term = Term.fromString(tmp2, ai.o);
				ai.intentions.push(new IntentionRecord(term, new ConstantTermAttribute(speaker, ai.cache_sort_id), nlcp, null, ai.time_in_seconds));
			}
		} else {
			if (this.action.functor.is_a(ai.o.getSort("verb.hear")) ||
				this.action.functor.is_a(ai.o.getSort("verb.see"))) {
				let tmp2:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+inf.triggeredBySpeaker+"'[#id],'no'[symbol]))";
				let term:Term = Term.fromString(tmp2, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			} else {
				let tmp2:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+inf.triggeredBySpeaker+"'[#id]))";
				let term:Term = Term.fromString(tmp2, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		}		
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"ExecuteAction_InferenceEffect\" action=\""+this.action.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("action"), o, variableNames, variables).term;
		return new ExecuteAction_InferenceEffect(t);
	}
	

	action:Term = null;
}
