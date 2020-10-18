class AnswerHowGoto_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term) 
	{
		super()
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai_raw:RuleBasedAI)
	{
		let ai:A4RuleBasedAI = <A4RuleBasedAI>ai_raw;
		console.log("AnswerHowGoto_InferenceEffect");
		console.log("inf.inferences.length: " + inf.inferences.length);
		console.log("inf.inferences[0].endResults: " + inf.inferences[0].endResults);

		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("AnswerHowGoto_InferenceEffect.execute: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		let speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;

		console.log("query result, answer how goto (source): " + inf.inferences[0].endResults);
		if (inf.inferences[0].endResults.length == 0) {
			let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],'unknown'[symbol]))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		} else {
			// get the location ID
			let sourceLocation:AILocation = null;
			let intention:Term = this.effectParameter;
			let action:Term = (<TermTermAttribute>intention.attributes[2]).term;
			if (inf.inferences[0].endResults.length != 0) {
				// get the location ID
				for(let result of inf.inferences[0].endResults) {
					let bindings:Bindings = result.bindings;
					for(let b of bindings.l) {
						if (b[0].name == "WHERE") {
							let v:TermAttribute = b[1];
							if (v instanceof ConstantTermAttribute) {
								// select the most specific one:
								if (sourceLocation == null) {
									sourceLocation = ai.game.getAILocationByID((<ConstantTermAttribute>v).value);
								} else {
									let sourceLocation2:AILocation = ai.game.getAILocationByID((<ConstantTermAttribute>v).value);
									let idx1:number = ai.game.locations.indexOf(sourceLocation);
									let idx2:number = ai.game.locations.indexOf(sourceLocation2);
									if (idx1>=0 && idx2>=0 && ai.game.location_in[idx2][idx1]) {
										sourceLocation = sourceLocation2;
									}
								}
							}
						}
					}
				}	
			}
			let path:AILocation[] = null;
			if (action.attributes[1] instanceof ConstantTermAttribute) {
				let destination:ConstantTermAttribute = <ConstantTermAttribute>action.attributes[1];
				let targetLocation:AILocation = ai.game.getAILocationByID(destination.value);
				if (sourceLocation != null && targetLocation != null) {
//						console.log(ai.generateAILocationDOTGraph());
					if (action.functor.is_a(ai.o.getSort("verb.leave"))) {
						path = ai.pathToGetOutOf(sourceLocation,targetLocation, false);
					} else {
						path = ai.pathBetweenLocations(sourceLocation,targetLocation);
					}
				}
			} else if (action.attributes[1] instanceof VariableTermAttribute) {
				let destinationSort:Sort = action.attributes[1].sort;
				if (destinationSort.is_a(ai.o.getSort("space.outside"))) {
					path = ai.pathToGetOutOf(sourceLocation,sourceLocation, true);
				} else if (destinationSort.is_a(ai.o.getSort("space.there"))) {
					let targetLocation:AILocation = ai.resolveThere(speakerCharacterID, sourceLocation);
					if (sourceLocation != null && targetLocation != null) {
	//						console.log(ai.generateAILocationDOTGraph());
						if (action.functor.is_a(ai.o.getSort("verb.leave"))) {
							path = ai.pathToGetOutOf(sourceLocation,targetLocation, false);
						} else {
							path = ai.pathBetweenLocations(sourceLocation,targetLocation);
						}
					}
				}
			}
			if (path == null) {
//				let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],'unknown'[symbol]))", ai.o);
//				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

				// we don't know! Default to a standard query, to see if we can figure it out that way:
				let action:Term = (<TermTermAttribute>intention.attributes[2]).term;
				console.log(ai.selfID + " answer how: " + intention.attributes[2]);	
				// we add the sentence with positive sign, to see if it introduces a contradiction
				let target1:Sentence[] = [new Sentence([new Term(ai.o.getSort("relation.howto"),
																[new TermTermAttribute(action),
																 new VariableTermAttribute(ai.o.getSort("any"), "HOW")])],[false])];
				ai.queuedInferenceProcesses.push(new InferenceRecord(ai, [], [target1], 1, 0, false, null, new AnswerHow_InferenceEffect(intention)));
			} else if (path.length == 1) {
				if (action.functor.is_a(ai.o.getSort("verb.leave"))) {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],#not(space.at("+action.attributes[0]+","+action.attributes[1]+"))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				} else {
					let term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],space.at("+action.attributes[0]+","+action.attributes[1]+")))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			} else {
				let answer:Term = null;
				let needsSpacesuit:boolean = false;
				let stationIndoorsLocation:AILocation = ai.game.getAILocationByID("location-aurora-station");
				let stationIndoorsLocationIdx:number = ai.game.locations.indexOf(stationIndoorsLocation);
				let startIndoors:boolean = ai.game.location_in[ai.game.locations.indexOf(path[0])][stationIndoorsLocationIdx];

				// we skip the very first one
				for(let i:number = path.length-1;i>0;i--) {
					let locPrev:AILocation = path[i-1];
					let loc:AILocation = path[i];
					let relations:Sort[] = ai.spatialRelationsLocationsAsNouns(loc, locPrev);
					if (!needsSpacesuit && !ai.game.location_in[ai.game.locations.indexOf(loc)][stationIndoorsLocationIdx]) {
						needsSpacesuit = true;
					}

					console.log(loc.name + " - " + loc.sort + " -> relations: " + relations);
					let tmpTerm:Term = new Term(ai.o.getSort("verb.go-to"), 
										    [action.attributes[0],
										     new ConstantTermAttribute(loc.id, ai.cache_sort_id)]);
					if (relations != null && relations.length == 1) {
						tmpTerm.functor = ai.o.getSort("verb.go");
						tmpTerm.attributes = [tmpTerm.attributes[0],
											  new ConstantTermAttribute(relations[0].name, relations[0]),
											  tmpTerm.attributes[1]];
					}
					if (answer == null) {
						answer = tmpTerm;
					} else {
						answer = new Term(ai.o.getSort("time.subsequently"),
										  [new TermTermAttribute(tmpTerm),
										   new TermTermAttribute(answer)])
					}
				}
				if (speakerCharacterID == (<ConstantTermAttribute>action.attributes[0]).value) {
					let term:Term = new Term(ai.o.getSort("action.talk"),
											 [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
											  new TermTermAttribute(new Term(ai.o.getSort("perf.inform.answer"),
											  		   			  	 	     [new ConstantTermAttribute(speakerCharacterID, ai.cache_sort_id),
											  		    				      new TermTermAttribute(answer)]))]);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				} else {
					let term1:Term = new Term(ai.o.getSort("perf.request.action"),
			     		   			  		  [action.attributes[0],
									  		   new TermTermAttribute(answer)]);
					let term:Term = new Term(ai.o.getSort("action.talk"),
											 [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
											  new TermTermAttribute(new Term(ai.o.getSort("perf.inform.answer"),
											  		   			  	 	     [new ConstantTermAttribute(speakerCharacterID, ai.cache_sort_id),
											  		    				      new TermTermAttribute(new Term(ai.o.getSort("action.talk"),
											  		    				      					    [new ConstantTermAttribute(speakerCharacterID, ai.cache_sort_id),
											  		    				      					     new TermTermAttribute(term1)]))]))]);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				if (startIndoors && needsSpacesuit) {
					let term:Term = new Term(ai.o.getSort("action.talk"),
											 [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
											  new TermTermAttribute(Term.fromString("perf.inform.answer('"+speakerCharacterID+"'[#id],#and(X:verb.need("+action.attributes[0]+",[spacesuit]),time.future(X)))", ai.o))]);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			}
		}	
	}


	saveToXMLInternal(ai:RuleBasedAI, variables:TermAttribute[], variableNames:string[]) : string
	{
		return "<InferenceEffect type=\"AnswerHowGoto_InferenceEffect\" effectParameter=\""+this.effectParameter.toStringXMLInternal(variables, variableNames)+"\"/>";
	}


	static loadFromXML(xml:Element, ai:RuleBasedAI, o:Ontology, variables:TermAttribute[], variableNames:string[]) : InferenceEffect
	{
		let t:Term = Term.fromStringInternal(xml.getAttribute("effectParameter"), o, variableNames, variables).term;
		return new AnswerHowGoto_InferenceEffect(t);
	}


	effectParameter:Term = null;
}