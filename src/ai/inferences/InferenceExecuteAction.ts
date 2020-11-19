class ExecuteAction_InferenceEffect extends InferenceEffect {

	constructor(perf:Term) 
	{
		super()
		this.perf = perf;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		let raw_action:Term = (<TermTermAttribute>(this.perf.attributes[1])).term;
		if (inf.inferences.length >= 1 &&
			inf.inferences[0].endResults.length > 0) {
			let speaker:string = inf.triggeredBySpeaker;
			let context:NLContext = ai.contextForSpeaker(speaker);
			let nlcp:NLContextPerformative = context.getNLContextPerformative(inf.triggeredBy);
			let action_variables:VariableTermAttribute[] = raw_action.getAllVariables();
			let action_variableNames:string[] = [];
			for(let v of action_variables) {
				action_variableNames.push(v.name);
			}

			let forAllVariableNames:string[] = [];
			if (this.perf.attributes.length >= 5) {
				for(let forAll of NLParser.termsInList((<TermTermAttribute>(this.perf.attributes[4])).term, "#and")) {
					if (forAll.attributes.length>=1 &&
						forAll.attributes[0] instanceof VariableTermAttribute) {
						forAllVariableNames.push((<VariableTermAttribute>forAll.attributes[0]).name);
					}
				}
			}
			console.log("forAllVariableNames: " + forAllVariableNames);
			if (inf.inferences.length != 1+forAllVariableNames.length) {
				console.error("number of inferences is wrong, should be 1 + " + forAllVariableNames.length + ", but is: " + inf.inferences.length);
			} else {
				// filter by the forAll results:
				for(let i:number = 0;i<forAllVariableNames.length;i++) {
					if (inf.inferences.length >= i+1) {
				        let allValues:TermAttribute[] = [];
				        for(let result of inf.inferences[i+1].endResults) {
				            let v:TermAttribute = result.getValueForVariableName(forAllVariableNames[i]);
				            if (v != null) allValues.push(v);
				        }
				        console.log("forAll values ("+forAllVariableNames[i]+"): " + allValues);
				        inf.inferences[0].filterResultsByForAll(action_variableNames, forAllVariableNames[i], allValues);
				    }
				}
			}

			let action:Term = raw_action.applyBindings(inf.inferences[0].endResults[0].bindings);
			let ir:IntentionRecord = new IntentionRecord(action, new ConstantTermAttribute(speaker, ai.cache_sort_id), nlcp, null, ai.timeStamp);
			let tmp:number = ai.canSatisfyActionRequest(ir);
			if (tmp == ACTION_REQUEST_CAN_BE_SATISFIED) {
				ir.alternative_actions = [];
				for(let result of inf.inferences[0].endResults) {
					ir.alternative_actions.push(raw_action.applyBindings(result.bindings));
					ai.applyBindingsToSubsequentActionsOrInferences(result.bindings);
				}
				if (nlcp.performative.attributes.length>=4) ir.numberConstraint = nlcp.performative.attributes[3];
				ai.planForAction(ir);
			} else if (tmp == ACTION_REQUEST_CANNOT_BE_SATISFIED) {
				let tmp2:string = "action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+speaker+"'[#id]))";
				let term:Term = Term.fromString(tmp2, ai.o);
				ai.intentions.push(new IntentionRecord(term, new ConstantTermAttribute(speaker, ai.cache_sort_id), nlcp, null, ai.timeStamp));
			}
		} else {
			if (raw_action.functor.is_a(ai.o.getSort("verb.hear")) ||
				raw_action.functor.is_a(ai.o.getSort("verb.see"))) {
				let tmp2:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+inf.triggeredBySpeaker+"'[#id],'no'[symbol]))";
				let term:Term = Term.fromString(tmp2, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			} else {
				let speaker:string = inf.triggeredBySpeaker;
				let context:NLContext = ai.contextForSpeaker(speaker);
				let nlcp:NLContextPerformative = context.getNLContextPerformative(inf.triggeredBy);
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.ack.denyrequest('"+inf.triggeredBySpeaker+"'[#id]))", ai.o);
				if (nlcp.performative.attributes.length >= 3) {
					let cause:Term = Term.fromString("#not(verb.see('"+ai.selfID+"'[#id], "+nlcp.performative.attributes[2]+"))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, new CauseRecord(cause, null, ai.timeStamp), ai.timeStamp));
				} else {
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
				}
			}
		}		
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"ExecuteAction_InferenceEffect\" perf=\""+this.perf.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("perf"), o, variableNames, variables).term;
		return new ExecuteAction_InferenceEffect(t);
	}
	

	perf:Term = null;
}
