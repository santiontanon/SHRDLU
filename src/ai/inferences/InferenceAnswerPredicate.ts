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
			console.log("inf.inferences["+i+"].endResults.length: " + inf.inferences[i].endResults.length);
			if (inf.inferences[i].endResults.length > 0) {
				console.log("    Reasons for first result:");
				for(let t of inf.inferences[i].endResults[0].getBaseSentences(inf.inferences[i].originalTarget)) {
					console.log("        " + t)
				}
			}
		}

		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("AnswerPredicate_InferenceEffect.execute: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		let intention:Term = this.effectParameter;
		let targetCharacterID:string = (<ConstantTermAttribute>(intention.attributes[1])).value;
		let forAlls:Term[] = [];
		let forAllVariableNames:string[] = [];
		let predicateVariables:VariableTermAttribute[] = (<TermTermAttribute>intention.attributes[2]).term.getAllVariables();
		let predicateVariableNames:string[] = [];
		for(let v of predicateVariables) {
			predicateVariableNames.push(v.name);
		}

		if (intention.attributes.length == 5) {
			forAlls = NLParser.termsInList((<TermTermAttribute>(intention.attributes[3])).term, "#and");
		} else if (intention.attributes.length == 4) {
			forAlls = NLParser.termsInList((<TermTermAttribute>(intention.attributes[3])).term, "#and");
			if (forAlls.length == 0 || forAlls[0].functor.name != "#forall") {
				forAlls = [];
			}
		}
		for(let forAll of forAlls) {
			if (forAll.attributes.length>=1 &&
				forAll.attributes[0] instanceof VariableTermAttribute) {
				forAllVariableNames.push((<VariableTermAttribute>forAll.attributes[0]).name);
			}
		}
		let nBaseInferences:number = inf.inferences.length - forAllVariableNames.length;

		console.log("predicateVariableNames: " + predicateVariableNames);
		for(let v of forAllVariableNames) {
			let idx:number = predicateVariableNames.indexOf(v);
			if (idx >= 0) predicateVariableNames.splice(idx, 1);
		}
		console.log("predicateVariableNames (without forAll): " + predicateVariableNames);
		console.log("forAllVariableNames: " + forAllVariableNames);
		// filter by the forAll results:
		for(let j:number = 0;j<nBaseInferences; j++) {	
			for(let i:number = 0;i<forAllVariableNames.length;i++) {
				if (inf.inferences.length >= i+nBaseInferences) {
			        let allValues:TermAttribute[] = [];
			        for(let result of inf.inferences[i+nBaseInferences].endResults) {
			            let v:TermAttribute = result.getValueForVariableName(forAllVariableNames[i]);
			            if (v != null) allValues.push(v);
			        }
			        console.log("forAll values ("+forAllVariableNames[i]+"): " + allValues);
			        inf.inferences[j].filterResultsByForAll(predicateVariableNames, forAllVariableNames[i], allValues);
			    }
			}
		}

		if (nBaseInferences == 1) {
			// this means that there was a variable in the query, and thus only the negation was launched:
			if (inf.inferences[0].endResults.length == 0) {
//					console.log("inference.endResults.length == 0, and no inferenceNegated");
				let answer:string = "no"
				if (this.effectParameter.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) answer = "yes";
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'"+answer+"'[symbol]))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
//				console.log("new intention: " + term);
			} else if (inf.inferences[0].endResults[0].bindings.l.length == 0) {
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'unknown'[symbol]))";
				let term:Term = Term.fromString(tmp, ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			} else {
				for(let tmp of inf.inferences[0].endResults[0].bindings.l) {
					let value:TermAttribute = tmp[1];
					if (value instanceof ConstantTermAttribute &&
						value.sort.name == "#id") {
						// we need to add this mention to the context entity list:
						let context:NLContext = ai.contextForSpeaker(targetCharacterID);
						if (context != null) {
							let ce:NLContextEntity = context.newContextEntity(value, ai.timeStamp, null, ai.o, false);
							if (ce != null) {
								let idx:number = context.mentions.indexOf(ce);
								if (idx != -1) context.mentions.splice(idx,1);
								context.mentions.unshift(ce);
							}
						}
					}
				}

				let answer:string = "yes";
				if (this.effectParameter.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) answer = "no";
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'"+answer+"'[symbol]))", ai.o);
				let causeRecord:CauseRecord = this.generateCauseRecord(inf.inferences[0].originalTarget, inf.inferences[0].endResults[0], ai);
				ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.timeStamp));
			}
		} else {
			if (inf.inferences[0].endResults.length == 0) {
				if (inf.inferences[1].endResults.length == 0) {
	//						console.log("inference.endResults.length == 0, and inferenceNegated.endResults.length == 0");
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'unknown'[symbol]))";
					let term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
	//				console.log("new intention: " + term);
				} else {
	//						console.log("inference.endResults.length == 0, and inferenceNegated.endResults.length != 0");
					let answer:string = "yes"
					if (this.effectParameter.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) answer = "no";
					let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'"+answer+"'[symbol]))";
					let term:Term = Term.fromString(tmp, ai.o);
					let causeRecord:CauseRecord = this.generateCauseRecord(inf.inferences[1].originalTarget, inf.inferences[1].endResults[0], ai);
					ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.timeStamp));
				}
			} else {
				//console.log("inference.endResults.length != 0");
				let answer:string = "no"
				if (this.effectParameter.functor.is_a(ai.o.getSort("action.answer.predicate-negated"))) answer = "yes";
				let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+targetCharacterID+"'[#id],'"+answer+"'[symbol]))";
				let term:Term = Term.fromString(tmp, ai.o);
				let causeRecord:CauseRecord = this.generateCauseRecord(inf.inferences[0].originalTarget, inf.inferences[0].endResults[0], ai);
				ai.intentions.push(new IntentionRecord(term, null, null, causeRecord, ai.timeStamp));
			}
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"AnswerPredicate_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables).term;
		return new AnswerPredicate_InferenceEffect(t);
	}


	effectParameter:Term = null;
}