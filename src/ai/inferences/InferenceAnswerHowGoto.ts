class AnswerHowGoto_InferenceEffect extends InferenceEffect {
	constructor(effectParameter:Term) 
	{
		super()
		this.effectParameter = effectParameter;
	}


	execute(inf:InferenceRecord, ai_raw:RuleBasedAI)
	{
		var ai:A4RuleBasedAI = <A4RuleBasedAI>ai_raw;
		console.log("AnswerHowGoto_InferenceEffect");
		console.log("inf.inferences.length: " + inf.inferences.length);
		console.log("inf.inferences[0].endResults: " + inf.inferences[0].endResults);

		if (!(this.effectParameter.attributes[1] instanceof ConstantTermAttribute)) {
			console.error("A4RuleBasedAI.executeInferenceEffect: Trying to talk to a character for which we don't know the ID!");
			return;
		}
		var speakerCharacterID:string = (<ConstantTermAttribute>(this.effectParameter.attributes[1])).value;
		var targetID:string = null;

		console.log("query result, answer how goto (source): " + inf.inferences[0].endResults);
		if (inf.inferences[0].endResults.length == 0) {
			var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],'unknown'[symbol]))", ai.o);
			ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
		} else {
			// get the location ID
			var sourceLocation:AILocation = null;
			var intention:Term = this.effectParameter;
			var action:Term = (<TermTermAttribute>intention.attributes[2]).term;
			if (inf.inferences[0].endResults.length != 0) {
				// get the location ID
				for(let result of inf.inferences[0].endResults) {
					let bindings:Bindings = result.bindings;
					for(let b of bindings.l) {
						if (b[0].name == "WHERE") {
							var v:TermAttribute = b[1];
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
			var path:AILocation[] = null;
			if (action.attributes[1] instanceof ConstantTermAttribute) {
				var destination:ConstantTermAttribute = <ConstantTermAttribute>action.attributes[1];
				var targetLocation:AILocation = ai.game.getAILocationByID(destination.value);
				if (sourceLocation != null && targetLocation != null) {
//						console.log(ai.generateAILocationDOTGraph());
					if (action.functor.is_a(ai.o.getSort("verb.leave"))) {
						path = ai.pathToGetOutOf(sourceLocation,targetLocation, false);
					} else {
						path = ai.pathBetweenLocations(sourceLocation,targetLocation);
					}
				}
			} else if (action.attributes[1] instanceof VariableTermAttribute) {
				var destinationSort:Sort = action.attributes[1].sort;
				if (destinationSort.is_a(ai.o.getSort("space.outside"))) {
					path = ai.pathToGetOutOf(sourceLocation,sourceLocation, true);
				} else if (destinationSort.is_a(ai.o.getSort("space.there"))) {
					var targetLocation:AILocation = ai.resolveThere(speakerCharacterID, sourceLocation);
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
//				var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],'unknown'[symbol]))", ai.o);
//				ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));

				// we don't know! Default to a standard query, to see if we can figure it out that way:
				var action:Term = (<TermTermAttribute>intention.attributes[2]).term;
				var subject:ConstantTermAttribute = <ConstantTermAttribute>action.attributes[0];
				console.log(ai.selfID + " answer how: " + intention.attributes[2]);	
				// we add the sentence with positive sign, to see if it introduces a contradiction
				var target1:Sentence[] = [new Sentence([new Term(ai.o.getSort("relation.howto"),
																[new TermTermAttribute(action),
																 new VariableTermAttribute(ai.o.getSort("any"), "HOW")])],[false])];
				ai.inferenceProcesses.push(new InferenceRecord(ai, [], [target1], 1, 0, false, null, new AnswerHow_InferenceEffect(intention), ai.o));
			} else if (path.length == 1) {
				if (action.functor.is_a(ai.o.getSort("verb.leave"))) {
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],#not(space.at("+action.attributes[0]+","+action.attributes[1]+"))))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				} else {
					var term:Term = Term.fromString("action.talk('"+ai.selfID+"'[#id], perf.inform.answer('"+speakerCharacterID+"'[#id],space.at("+action.attributes[0]+","+action.attributes[1]+")))", ai.o);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
			} else {
				var answer:Term = null;
				var needsSpacesuit:boolean = false;
				var stationIndoorsLocation:AILocation = ai.game.getAILocationByID("location-aurora-station");
				var stationIndoorsLocationIdx:number = ai.game.locations.indexOf(stationIndoorsLocation);
				var startIndoors:boolean = ai.game.location_in[ai.game.locations.indexOf(path[0])][stationIndoorsLocationIdx];

				// we skip the very first one
				for(let i:number = path.length-1;i>0;i--) {
					var locPrev:AILocation = path[i-1];
					var loc:AILocation = path[i];
					var relations:Sort[] = ai.spatialRelationsLocationsAsNouns(loc, locPrev);
					if (!needsSpacesuit && !ai.game.location_in[ai.game.locations.indexOf(loc)][stationIndoorsLocationIdx]) {
						needsSpacesuit = true;
					}

					console.log(loc.name + " - " + loc.sort + " -> relations: " + relations);
					var tmpTerm:Term = new Term(ai.o.getSort("verb.go-to"), 
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
					var term:Term = new Term(ai.o.getSort("action.talk"),
											 [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
											  new TermTermAttribute(new Term(ai.o.getSort("perf.inform.answer"),
											  		   			  	 	     [new ConstantTermAttribute(speakerCharacterID, ai.cache_sort_id),
											  		    				      new TermTermAttribute(answer)]))]);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				} else {
					var term1:Term = new Term(ai.o.getSort("perf.request.action"),
			     		   			  		  [action.attributes[0],
									  		   new TermTermAttribute(answer)]);
					var term:Term = new Term(ai.o.getSort("action.talk"),
											 [new ConstantTermAttribute(ai.selfID, ai.cache_sort_id),
											  new TermTermAttribute(new Term(ai.o.getSort("perf.inform.answer"),
											  		   			  	 	     [new ConstantTermAttribute(speakerCharacterID, ai.cache_sort_id),
											  		    				      new TermTermAttribute(new Term(ai.o.getSort("action.talk"),
											  		    				      					    [new ConstantTermAttribute(speakerCharacterID, ai.cache_sort_id),
											  		    				      					     new TermTermAttribute(term1)]))]))]);
					ai.intentions.push(new IntentionRecord(term, null, null, null, ai.time_in_seconds));
				}
				if (startIndoors && needsSpacesuit) {
					var term:Term = new Term(ai.o.getSort("action.talk"),
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