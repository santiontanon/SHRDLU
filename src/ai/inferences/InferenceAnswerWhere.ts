class AnswerWhere_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term, whereto:boolean) 
	{
		super()
		this.effectParameter = effectParameter;
		this.whereto = whereto;
	}


	execute(inf:InferenceRecord, ai_raw:RuleBasedAI)
	{
		var ai:A4RuleBasedAI = <A4RuleBasedAI>ai_raw;
		var where_preposition:string = "space.at";
		var query_perf:string = "perf.q.whereis";
		if (this.whereto) {
			where_preposition = "relation.target";
			query_perf = "perf.q.whereto";
		}
		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("A4RuleBasedAI.executeInferenceEffect: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		var speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		var targetID:string = null;
		var targetTermString:string = null;
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

		console.log("query result, answer where (target): " + inf.inferences[0].endResults);
		console.log("query result, answer where (speaker): " + inf.inferences[1].endResults);
		if (inf.inferences[0].endResults.length == 0) {
			var term1:Term = null;
			if (targetID != null) {
				term1 = Term.fromString("perf.inform.answer('"+speakerCharacterID+"'[#id],'unknown'[symbol],"+query_perf+"('"+ai.selfID+"'[#id],"+targetTermString+"))", ai.o);
			} else {
				term1 = Term.fromString("perf.inform.answer('"+speakerCharacterID+"'[#id],'unknown'[symbol])", ai.o);
			}
			var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id])", ai.o);
			term.attributes.push(new TermTermAttribute(term1));
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
			console.log("new intention: " + term);
		} else {
			// get the location ID
			let targetLocation:AILocation = null;
			let targetIfItsALocation:AILocation = ai.game.getAILocationByID(targetID);
			let targetLocationID:string = null;
			let speakerLocation:AILocation = null;
			let speakerLocationID:string = null;
			for(let bindings of inf.inferences[0].endResults) {
				for(let b of bindings.l) {
					if (b[0].name == "WHERE") {
						var v:TermAttribute = b[1];
						if (v instanceof ConstantTermAttribute) {
							// select the most specific one:
							if (targetLocation == null) {
								targetLocationID = (<ConstantTermAttribute>v).value;
								targetLocation = ai.game.getAILocationByID(targetLocationID);
							} else {
								let targetLocationID2:string = (<ConstantTermAttribute>v).value;
								let targetLocation2:AILocation = ai.game.getAILocationByID(targetLocationID2);
								let idx1:number = ai.game.locations.indexOf(targetLocation);
								let idx2:number = ai.game.locations.indexOf(targetLocation2);
								if (ai.game.location_in[idx2][idx1]) {
									targetLocationID = targetLocationID2;
									targetLocation = targetLocation2;
								}
							}
						}
					}
				}
			}			
			if (inf.inferences[1].endResults.length != 0) {
				for(let bindings of inf.inferences[1].endResults) {
					for(let b of bindings.l) {
						if (b[0].name == "WHERE") {
							var v:TermAttribute = b[1];
							if (v instanceof ConstantTermAttribute) {
								// select the most specific one:
								if (speakerLocation == null) {
									speakerLocationID = (<ConstantTermAttribute>v).value;
									speakerLocation = ai.game.getAILocationByID(speakerLocationID);
								} else {
									let speakerLocationID2:string = (<ConstantTermAttribute>v).value;
									let speakerLocation2:AILocation = ai.game.getAILocationByID(speakerLocationID2);
									let idx1:number = ai.game.locations.indexOf(speakerLocation);
									let idx2:number = ai.game.locations.indexOf(speakerLocation2);
									if (ai.game.location_in[idx2][idx1]) {
										speakerLocationID = speakerLocationID2;
										speakerLocation = speakerLocation2;
									}
								}
							}
						}
					}
				}
			}
			if (targetLocationID == null) {
				console.error("A4RuleBasedAI.executeInferenceEffect: cannot find location from results " + inf.inferences[0].endResults);
				return;
			}

			if (targetLocation != null && targetLocation == speakerLocation &&
				targetID != null && 
				speakerCharacterID != targetID &&
				ai.canSee(targetID)) {
				// if we can see the target, and it's in the same room as the speaker (who is a different entity), then
				// explain where it is relative to the speaker:
				var speakerObject:A4Object = ai.game.findObjectByIDJustObject(speakerCharacterID);
				var targetObject_l:A4Object[] = ai.game.findObjectByID(targetID);
				if (speakerObject != null) {
					if (targetObject_l.length == 1) {
						var targetObject:A4Object = targetObject_l[0];
						var relations:Sort[] = ai.spatialRelations(targetID, speakerCharacterID);
						if (relations != null && relations.length>0) {
							var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+relations[relations.length-1].name+"("+targetTermString+",'"+speakerCharacterID+"'[#id])))";
							var term:Term = Term.fromString(tmp, ai.o);
							ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
							return;
						}
					} else if (targetObject_l[0].ID == ai.selfID) {
						var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],verb.have('"+ai.selfID+"'[#id], "+targetTermString+")))";
						var term:Term = Term.fromString(tmp, ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					} else if (targetObject_l[0].ID == speakerCharacterID) {
						var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],verb.have('"+speakerCharacterID+"'[#id], "+targetTermString+")))";
						var term:Term = Term.fromString(tmp, ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					} else {
						console.warn("executeInferenceEffect.answer_where: We cannot find target or speaker! " + targetID + ", " + speakerCharacterID);
						var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+where_preposition+"("+targetTermString+",'"+targetLocationID+"'[#id])))";
						var term:Term = Term.fromString(tmp, ai.o);
						ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
					}
				}
			} else {					
				var speakerLocation_idx:number = ai.game.locations.indexOf(speakerLocation);
				var targetLocation_idx:number = ai.game.locations.indexOf(targetLocation);
				if (speakerLocation_idx>=0 &&
					targetLocation_idx>=0 &&
					(ai.game.location_in[speakerLocation_idx][targetLocation_idx] ||
					 speakerLocation_idx == targetLocation_idx)) {
					// If the speakerLocation is in targetLocation: 

					var speakerObject:A4Object = ai.game.findObjectByIDJustObject(speakerCharacterID);
					if (targetIfItsALocation != null &&
						targetIfItsALocation != speakerLocation && 
						speakerObject != null && 
						!ai.game.location_in[speakerLocation_idx][ai.game.locations.indexOf(targetIfItsALocation)]) {
						// if the object we are asking about is a location, and we are NOT in that location, then report directions:
						var relations:Sort[] = ai.spatialRelationsFromLocation(targetIfItsALocation, speakerObject);
						if (relations != null && relations.length>0) {
							var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+relations[relations.length-1].name+"("+targetTermString+",'"+speakerCharacterID+"'[#id])))";
							var term:Term = Term.fromString(tmp, ai.o);
							ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
							return;
						}

						// if we are here, we could not compute relations. We will attempt to say "it's outside of X"
						// find the largest area such that:
						// - speaker is in it
						// - it is within targetlocation
						// - targetIfItsALocation is not in it
						var targetIfItsALocation_idx:number = ai.game.locations.indexOf(targetIfItsALocation);
						var l:number = -1;
						for(let i:number = 0;i<ai.game.locations.length;i++) {
							if (ai.game.location_in[speakerLocation_idx][i] &&
								ai.game.location_in[i][targetLocation_idx] &&
								!ai.game.location_in[targetIfItsALocation_idx][i]) {
								if (l == -1) {
									l = i;
								} else {
									if (ai.game.location_in[l][i]) {
										l = i;
									}
								}
							}
						}
						if (l != -1) {
							var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],#and("+where_preposition+"(TARGET:"+targetTermString+",'"+targetLocationID+"'[#id]), space.outside.of(TARGET, '"+ai.game.locations[l].id+"'[#id]) )))";
							var term:Term = Term.fromString(tmp, ai.o);
							ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
							return;
						}
					}
					// otherwise just say where the target is:
					var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+where_preposition+"("+targetTermString+",'"+targetLocationID+"'[#id])))";
					var term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				} else {
					// otherwise just say where the target is:
					var tmp:string = "action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],"+where_preposition+"("+targetTermString+",'"+targetLocationID+"'[#id])))";
					var term:Term = Term.fromString(tmp, ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			}
		}
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"AnswerWhere_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\" whereto=\""+this.whereto+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables).term;
		let wt:boolean = xml.getAttribute("whereto") == "true";
		return new AnswerWhere_InferenceEffect(t, wt);
	}


	effectParameter:Term = null;
	whereto:boolean = false;
}