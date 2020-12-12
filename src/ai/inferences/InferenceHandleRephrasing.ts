class HandleRephrasing_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term, nlcp:NLContextPerformative) 
	{
		super()
		this.nlcp = nlcp;
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		console.log("HandleRephrasing_InferenceEffect");
		console.log("inf.inferences.length: " + inf.inferences.length);
		console.log("inf.inferences[0].endResults.length: " + inf.inferences[0].endResults.length);

		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("HandleRephrasing_InferenceEffect.execute: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		let speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		let queryPerformative:Term = (<TermTermAttribute>(this.effectParameter.attributes[2])).term;
		let originalText:string = (<ConstantTermAttribute>(this.effectParameter.attributes[3])).value;
		let originalError:TermTermAttribute = <TermTermAttribute>(this.effectParameter.attributes[4]);
		let queryVariable:VariableTermAttribute = <VariableTermAttribute>(queryPerformative.attributes[1]);
		let forAllVariableNames:string[] = [];
		if (queryPerformative.attributes.length >= 4) {
			for(let forAll of NLParser.termsInList((<TermTermAttribute>(queryPerformative.attributes[3])).term, "#and")) {
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
			        inf.inferences[0].filterResultsByForAll([queryVariable.name], forAllVariableNames[i], allValues);
			    }
			}
		}

		let negativeAnswer:string = "'no-matches-found'[symbol]";			 
		if (inf.inferences[0].endResults.length != 0) {
			let results:TermAttribute[] = [];
			for(let result of inf.inferences[0].endResults) {
				for(let [variable, value] of result.bindings.l) {
					if (variable == queryVariable) {
						// we have a result! check for duplicates:
						let found:boolean = false;
						for(let res of results) {
							if ((res instanceof ConstantTermAttribute) &&
								(value instanceof ConstantTermAttribute)) {
								if ((<ConstantTermAttribute>res).value == (<ConstantTermAttribute>value).value) {
									found = true;
									break;
								}
							}
						}
						if (!found) results.push(value);
					}
				}
			}
			console.log("result: " + results);
			if (results.length > 0) {
				// TODO: for now we just take the first result, but what when there is more than one?
				let result:TermAttribute = results[0];
				HandleRephrasing_InferenceEffect.handleRephrasing(originalText, result, originalError, speakerCharacterID, ai);
			} else {
				console.error("Inference produced a result, but none of the resulting variables is the query variable!");
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			}
		} else {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		}
	}


	static handleRephrasing(text:string, resultTerm:TermAttribute, error:TermTermAttribute, speaker:string, ai:RuleBasedAI)
	{
		if (resultTerm instanceof ConstantTermAttribute) {
			let result:string = (<ConstantTermAttribute>resultTerm).value;
			let context:NLContext = ai.contextForSpeaker(speaker);
			if (context.dereference_hints.length == 0) {
				context.dereference_hints = [new NLDereferenceHint(error, result)];
				ai.parsePerceivedText(text, speaker, context, []);
				context.dereference_hints = [];
			} else {
				// This is probably because we have created a loop, so, we should just cut it, and respond we don't understand or something
				ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.parseerror('"+speaker+"'[#id], #not(verb.understand('"+ai.selfID+"'[#id]))))", ai.o), null, null, null, ai.timeStamp));
			}
		} else {
			console.error("handleRephrasing: resultTerm is not a constant: " + resultTerm);
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		if (this.nlcp!=null) {
			let context:NLContext = ai.contextForSpeaker(this.nlcp.speaker);
			if (context != null) {
				return "<InferenceEffect type=\"HandleRephrasing_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\" nlcp=\""+context.performatives.indexOf(this.nlcp)+"\" speaker=\""+this.nlcp.speaker+"\"/>";
			} else {
				return "<InferenceEffect type=\"HandleRephrasing_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
			}
		} else {
			return "<InferenceEffect type=\"HandleRephrasing_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
		}
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables).term;
		let speaker:string = xml.getAttribute("speaker");
		if (speaker != null) {
			let nlcp:number = Number(xml.getAttribute("nlcp"));
			let context:NLContext = ai.contextForSpeaker(speaker);
			if (context != null) {
				return new HandleRephrasing_InferenceEffect(t, context.performatives[nlcp]);
			} else {
				return new HandleRephrasing_InferenceEffect(t, null);
			}
		} else {
			return new HandleRephrasing_InferenceEffect(t, null);
		}
	}


	nlcp:NLContextPerformative = null;
	effectParameter:Term = null;
}
