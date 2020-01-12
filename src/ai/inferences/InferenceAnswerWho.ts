class AnswerWho_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term) 
	{
		super()
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai:RuleBasedAI)
	{
		let listenerID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		let targetIDVariableName:string = null;
		let targetID:string = null;
		let targetName:string = null;
		if (this.effectParameter.attributes[2] instanceof ConstantTermAttribute) {
			targetID = (<ConstantTermAttribute>(this.effectParameter.attributes[2])).value;
		} else if (this.effectParameter.attributes[2] instanceof VariableTermAttribute) {
			targetIDVariableName = (<VariableTermAttribute>(this.effectParameter.attributes[2])).name;
		}
		if (inf.inferences[0].endResults.length != 0) {
			for(let b of inf.inferences[0].endResults[0].bindings.l) {
				if (b[0].name == "NAME") {
					let v:TermAttribute = b[1];
					if (v instanceof ConstantTermAttribute) {
						targetName = (<ConstantTermAttribute>v).value;
						break;
					}
				}
				if (targetIDVariableName != null && b[0].name == targetIDVariableName) {
					let v:TermAttribute = b[1];
					if (v instanceof ConstantTermAttribute) {
						targetID = (<ConstantTermAttribute>v).value;
						break;
					}
				}
			}
		}
		AnswerWho_InferenceEffect.AnswerWhois(targetName, targetID, listenerID, false, ai);
	}


	static AnswerWhois(name:string, whoID:string, listenerID:string, playerMentionedName:boolean, ai:RuleBasedAI)
	{
//		console.log("executeInferenceEffect_AnswerWhois: " + name + ", " + whoID);
		
		// get the types:
		let mostSpecificTypes:Term[] = null;
		for(let typeSortName of POSParser.sortsToConsiderForTypes) {
			if (mostSpecificTypes == null || mostSpecificTypes.length == 0) mostSpecificTypes = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString(typeSortName+"('"+whoID+"'[#id])", ai.o));	
		}
/*
		ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("object('"+whoID+"'[#id])", ai.o));
		if (mostSpecificTypes == null || mostSpecificTypes.length == 0) mostSpecificTypes = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("space.location('"+whoID+"'[#id])", ai.o));
		if (mostSpecificTypes == null || mostSpecificTypes.length == 0) mostSpecificTypes = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("abstract-entity('"+whoID+"'[#id])", ai.o));
		if (mostSpecificTypes == null || mostSpecificTypes.length == 0) mostSpecificTypes = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("role('"+whoID+"'[#id])", ai.o));
*/
//		console.log("executeInferenceEffect_AnswerWhois: mostSpecificTypes: " + mostSpecificTypes);

		// get the role/profession:
		let mostSpecificRoles1:Term[] = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("role('"+whoID+"'[#id],[role])", ai.o));
		let mostSpecificRoles2:Term[] = ai.mostSpecificMatchesFromShortOrLongTermMemoryThatCanBeRendered(Term.fromString("role('"+whoID+"'[#id],[any],[role])", ai.o));
//		console.log("executeInferenceEffect_AnswerWhois: mostSpecificRoles1: " + mostSpecificRoles1);
//		console.log("executeInferenceEffect_AnswerWhois: mostSpecificRoles2: " + mostSpecificRoles2);

		// generate the talk intentions:
		if (name == null && 
			//mostSpecificTypes.length == 0 && 
			mostSpecificRoles1.length == 0 && mostSpecificRoles2.length == 0 && !playerMentionedName) {
			ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id],'unknown'[symbol]))", ai.o), 
													 new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
		} else if (name == null && 
			mostSpecificTypes.length == 0 && 
			mostSpecificRoles1.length == 0 && mostSpecificRoles2.length == 0 && playerMentionedName) {
			ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id],'unknown'[symbol]))", ai.o), 
							     new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
		} else {
			if (name != null) {
				ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id],name('"+whoID+"'[#id],'"+name+"'[symbol])))", ai.o), 
									 new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
			}
			if (mostSpecificTypes.length != 0) {
				ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id], "+mostSpecificTypes[0]+"))", ai.o), 
														 new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
			}
			if (mostSpecificRoles2.length != 0) {
				ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id], "+mostSpecificRoles2[0]+"))", ai.o), 
														 new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
			} else if (mostSpecificRoles1.length != 0) {
				ai.intentions.push(new IntentionRecord(Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+listenerID+"'[#id], "+mostSpecificRoles1[0]+"))", ai.o), 
														 new ConstantTermAttribute(listenerID, ai.o.getSort("#id")), null, null, ai.time_in_seconds));
			}
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"AnswerWho_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables).term;
		return new AnswerWho_InferenceEffect(t);
	}


	effectParameter:Term = null;
}