class AnswerQuery_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term, nlcp:NLContextPerformative) 
	{
		super()
		this.nlcp = nlcp;
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		console.log("AnswerQuery_InferenceEffect");
		console.log("inf.inferences.length: " + inf.inferences.length);
		console.log("inf.inferences[0].endResults: " + inf.inferences[0].endResults);

		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("A4RuleBasedAI.executeInferenceEffect: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		var speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		var queryPerformative:Term = (<TermTermAttribute>(this.effectParameter.attributes[2])).term;
		var queryVariable:VariableTermAttribute = <VariableTermAttribute>(queryPerformative.attributes[1]);
		var queryTerm:Term = null;
		if (queryPerformative.attributes[2] instanceof TermTermAttribute) {
			queryTerm = (<TermTermAttribute>(queryPerformative.attributes[2])).term;
		}
		var negativeAnswer:string = "'no-matches-found'[symbol]";
		if (queryTerm != null) {
			if (queryTerm.functor.is_a(ai.cache_sort_property_with_value) ||
			 	queryTerm.functor.is_a(ai.cache_sort_relation_with_value)) {
				negativeAnswer = "'unknown'[symbol]";
			} else if (queryTerm.functor.is_a(ai.o.getSort("verb.happen"))) {
				negativeAnswer = "'nothing'[symbol]";
			}
		}
			 
		if (inf.inferences[0].endResults.length != 0) {
			let results:TermAttribute[] = [];
			for(let b of inf.inferences[0].endResults) {
				for(let [variable, value] of b.l) {
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
				let resultsTA:TermAttribute = null;
				if (results.length > MAXIMUM_ANSWERS_TO_GIVE_AT_ONCE_FOR_A_QUERY) {
					resultsTA = new ConstantTermAttribute("etcetera",ai.o.getSort("etcetera"));
					for(let i:number = 0;i<MAXIMUM_ANSWERS_TO_GIVE_AT_ONCE_FOR_A_QUERY;i++) {
						let result:TermAttribute = results[i];
						// See if we need to provide results in past tense:
						if (inf.timeTerm != null && inf.timeTerm.functor.is_a(ai.o.getSort("time.past"))) {
							if (result instanceof TermTermAttribute) {
								result = new TermTermAttribute(new Term(ai.o.getSort("#and"),[result, 
															   new TermTermAttribute(new Term(ai.o.getSort("time.past"), [result]))]));
							}
						}
						resultsTA = new TermTermAttribute(new Term(ai.o.getSort("#and"),[result, resultsTA]));
					}
				} else {
					for(let i:number = 0;i<results.length;i++) {
						let result:TermAttribute = results[i];
						// See if we need to provide results in past tense:
						if (inf.timeTerm != null && inf.timeTerm.functor.is_a(ai.o.getSort("time.past"))) {
							if (result instanceof TermTermAttribute) {
								result = new TermTermAttribute(new Term(ai.o.getSort("#and"),[result, 
															   new TermTermAttribute(new Term(ai.o.getSort("time.past"), [result]))]));
							}
						}
						if (resultsTA == null) {
							resultsTA = result;
						} else {
							resultsTA = new TermTermAttribute(new Term(ai.o.getSort("#and"),[result, resultsTA]));
						}
					}
				}
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+resultsTA+"))", ai.o);
//					console.log("term: " + term);

				// store the state in case there are more answers to be given later using perf.more answers
				let context:NLContext = ai.contextForSpeaker(speakerCharacterID);
				if (context != null) {
					context.lastEnumeratedQuestion_answered = this.nlcp;
					context.lastEnumeratedQuestion_answers = results;
					context.lastEnumeratedQuestion_next_answer_index = Math.min(results.length, MAXIMUM_ANSWERS_TO_GIVE_AT_ONCE_FOR_A_QUERY);
					ai.intentions.push(new IntentionRecord(term, null, context.getNLContextPerformative(queryPerformative), null, ai.time_in_seconds));
				} else {
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			} else {
				console.error("Inference produced a result, but none of the resulting variables is the query variable!");
				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			}
		} else {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+negativeAnswer+"))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		}

	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		if (this.nlcp!=null) {
			let context:NLContext = ai.contextForSpeaker(this.nlcp.speaker);
			if (context != null) {
				return "<InferenceEffect type=\"AnswerQuery_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\" nlcp=\""+context.performatives.indexOf(this.nlcp)+"\" speaker=\""+this.nlcp.speaker+"\"/>";
			} else {
				return "<InferenceEffect type=\"AnswerQuery_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
			}
		} else {
			return "<InferenceEffect type=\"AnswerQuery_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
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
				return new AnswerQuery_InferenceEffect(t, context.performatives[nlcp]);
			} else {
				return new AnswerQuery_InferenceEffect(t, null);
			}
		} else {
			return new AnswerQuery_InferenceEffect(t, null);
		}
	}


	nlcp:NLContextPerformative = null;
	effectParameter:Term = null;
}
