class BWAnswerWhere_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term, whereto:boolean) 
	{
		super()
		this.effectParameter = effectParameter;
		this.whereto = whereto;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		let where_preposition:string = null;
		let query_perf:string = "perf.q.whereis";
		if (this.whereto) {
			where_preposition = "relation.target";
			query_perf = "perf.q.whereto";
		}
		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("AnswerWhere_InferenceEffect.execute: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		let speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		let targetID:string = null;
		let targetTermString:string = null;
		let nresults:number = 0;
		let prepositions:string[] = ["space.directly.on.top.of", "space.inside.of", "space.at"];

		if (inf.inferences.length == 3) {
			console.log("query result, answer where space.directly.on.top.of (target): " + inf.inferences[0].endResults);
			console.log("query result, answer where space.inside.of (target): " + inf.inferences[1].endResults);
			console.log("query result, answer where space.at (target): " + inf.inferences[2].endResults);
			nresults = inf.inferences[0].endResults.length + 
					   inf.inferences[1].endResults.length +
					   inf.inferences[2].endResults.length;
		} else {
			console.log("query result, answer where custom constraint (target): " + inf.inferences[0].endResults);
			console.log("query result, answer where space.at (target): " + inf.inferences[1].endResults);
			nresults = inf.inferences[0].endResults.length + 
					   inf.inferences[1].endResults.length;
			prepositions = ["space.at", "space.at"];
		}

		if (this.effectParameter.attributes[2] instanceof ConstantTermAttribute) {
			targetID = (<ConstantTermAttribute>(this.effectParameter.attributes[2])).value;
			if (targetID == "hypothetical-character") {
				targetID = null;
				targetTermString = "[any]";
			} else {
				targetTermString = "'"+targetID + "'[#id]";
			}
		} else if (this.effectParameter.attributes[2] instanceof VariableTermAttribute) {
			targetTermString = "["+this.effectParameter.attributes[2].sort+"]";
		}

		if (nresults == 0) {
			let term1:Term = null;
			if (targetID != null) {
				term1 = Term.fromString("perf.inform.answer('"+speakerCharacterID+"'[#id],'unknown'[symbol],"+query_perf+"('"+ai.selfID+"'[#id],"+targetTermString+"))", ai.o);
			} else {
				term1 = Term.fromString("perf.inform.answer('"+speakerCharacterID+"'[#id],'unknown'[symbol])", ai.o);
			}
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id])", ai.o);
			term.attributes.push(new TermTermAttribute(term1));
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
			console.log("new intention: " + term);
		} else {
			// get the location ID
			let selectedBindings:Bindings = null;
			let targetLocationID:string = null;
			for(let i:number = 0; i<inf.inferences.length; i++) {
				if (targetLocationID == null) {
					for(let result of inf.inferences[i].endResults) {
						for(let b of result.bindings.l) {
							if (b[0].name == "WHERE") {
								let v:TermAttribute = b[1];
								if (v instanceof ConstantTermAttribute) {
									targetLocationID = (<ConstantTermAttribute>v).value;
									selectedBindings = result.bindings;
									where_preposition = prepositions[i];
								}
							}
						}
					}
				}
			}

			if (selectedBindings != null && this.effectParameter.attributes[2] instanceof VariableTermAttribute) {
				let tmp:TermAttribute = this.effectParameter.attributes[2].applyBindings(selectedBindings);
				if (tmp instanceof ConstantTermAttribute) {
					targetID = (<ConstantTermAttribute>tmp).value;
					if (targetID == "hypothetical-character") {
						targetID = null;
						targetTermString = "[any]";
					} else {
						targetTermString = "'"+targetID + "'[#id]";
					}
				}				
			}
			if (targetLocationID == null) {
				console.error("A4RuleBasedAI.executeInferenceEffect: cannot find location from results " + inf.inferences[0].endResults);
				return;
			}

			// otherwise just say where the target is:
			let tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+where_preposition+"("+targetTermString+",'"+targetLocationID+"'[#id])))";
			let term:Term = Term.fromString(tmp, ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.timeStamp));
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"BWAnswerWhere_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\" whereto=\""+this.whereto+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables).term;
		let wt:boolean = xml.getAttribute("whereto") == "true";
		return new BWAnswerWhere_InferenceEffect(t, wt);
	}


	effectParameter:Term = null;
	whereto:boolean = false;
}