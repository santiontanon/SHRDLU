
class A4RuleBasedAI extends RuleBasedAI {
	constructor(o:Ontology, nlp:NLParser, game:A4Game, pf:number, pfoffset:number, qpt:number)
	{
		super(o, nlp, pf, pfoffset, qpt);
		this.game = game;

		this.inferenceEffectFactory = new A4InferenceEffectFactory();

		this.intentionHandlers.push(new Call_IntentionAction());
    	this.intentionHandlers.push(new Memorize_IntentionAction());
	    this.intentionHandlers.push(new AnswerPredicate_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhoIs_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhatIs_IntentionAction());
	    this.intentionHandlers.push(new AnswerQuery_IntentionAction());
	    this.intentionHandlers.push(new AnswerHowMany_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhen_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhy_IntentionAction());
	    this.intentionHandlers.push(new A4AnswerHow_IntentionAction());
	    this.intentionHandlers.push(new AnswerDefine_IntentionAction());
	    this.intentionHandlers.push(new AnswerHearSee_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhere_IntentionAction());

		this.locationsWherePlayerIsNotPermitted.push("location-as4");	// bedroom 1
		this.locationsWherePlayerIsNotPermitted.push("location-as5");	// bedroom 2
		this.locationsWherePlayerIsNotPermitted.push("location-as6");	// bedroom 3
		this.locationsWherePlayerIsNotPermitted.push("location-as7");	// bedroom 4
		this.locationsWherePlayerIsNotPermitted.push("location-as9");	// bedroom 6
		this.locationsWherePlayerIsNotPermitted.push("location-as10");	// bedroom 7
		this.locationsWherePlayerIsNotPermitted.push("location-as11");	// bedroom 8
		this.locationsWherePlayerIsNotPermitted.push("location-as12");	// bedroom 9
		this.locationsWherePlayerIsNotPermitted.push("location-as13");	// bedroom 10
		this.locationsWherePlayerIsNotPermitted.push("location-as14");	// bedroom 11
		this.locationsWherePlayerIsNotPermitted.push("location-as15");	// bedroom 12
		this.locationsWherePlayerIsNotPermitted.push("location-as26");
		// this.locationsWherePlayerIsNotPermitted.push("location-as27");
		this.locationsWherePlayerIsNotPermitted.push("location-maintenance");
		this.locationsWherePlayerIsNotPermitted.push("location-as29");
		this.locationsWherePlayerIsNotPermitted.push("location-garage");

		this.doorsPlayerIsNotPermittedToOpen.push("STASIS");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM1");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM2");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM3");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM4");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM6");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM7");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM8");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM9");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM10");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM11");
		this.doorsPlayerIsNotPermittedToOpen.push("BEDROOM12");
		// this.doorsPlayerIsNotPermittedToOpen.push("SCIENCE");
		this.doorsPlayerIsNotPermittedToOpen.push("MAINTENANCE");
		this.doorsPlayerIsNotPermittedToOpen.push("GARAGE");
		this.doorsPlayerIsNotPermittedToOpen.push("COMMAND");

		this.cache_sort_bright = this.o.getSort("bright");
		this.cache_sort_dark = this.o.getSort("dark");
		this.cache_sort_west = this.o.getSort("west");
		this.cache_sort_north = this.o.getSort("north");
		this.cache_sort_east = this.o.getSort("east");
		this.cache_sort_south = this.o.getSort("south");
		this.cache_sort_powered_state = this.o.getSort("powered.state");
		this.cache_sort_powered_on = this.o.getSort("powered.on");
		this.cache_sort_powered_off = this.o.getSort("powered.off");
		this.cache_sort_space_iside_of = this.o.getSort("space.inside.of");

		this.predicatesToStoreInLongTermMemory = [];
		this.predicatesToStoreInLongTermMemory.push(this.cache_sort_action_talk);
		this.predicatesToStoreInLongTermMemory.push(this.cache_sort_space_at);
	}


	precalculateLocationKnowledge(game:A4Game, o:Ontology)
	{
		// First, remove any location knowledge that was previously in the KB:
		this.longTermMemory.removeAllWithProvenance(LOCATIONS_PROVENANCE);

		// console.log("RuleBasedAI.precalculateLocationKnowledge...");
		for(let location of game.locations) {
			let str:string = location.sort.name + "('"+location.id+"'[#id])";
			let term:Term = Term.fromString(str, o);
			//console.log(term.toString());
			this.addLongTermTerm(term, LOCATIONS_PROVENANCE);

			if (location.name != null) {
				let str:string =  "name('"+location.id+"'[#id], '"+location.name+"'[symbol])";
				let term:Term = Term.fromString(str, o);
				//console.log(term.toString());
				//this.addLongTermTerm(term, LOCATIONS_PROVENANCE);
				// if has to be added this way, since otherwise, it's treated like a #StateSort, and it removes the previous
				// names we might have added!
				this.addLongTermRuleNow(new Sentence([term], [true]), LOCATIONS_PROVENANCE);

				if (location.name.indexOf(' ') != -1) {
					// it's a multitoken! we should add it:
					this.naturalLanguageParser.posParser.addMultiToken(location.name);
				}
				this.naturalLanguageParser.posParser.addTokenPOS(new PartOfSpeech(location.name, location.name, Term.fromString("proper-noun('"+location.name+"'[symbol], [singular])", o), 1.0));
			}
		}

		let n_space_at:number = 0;
		let n_not_space_at:number = 0;
		let n_space_connects:number = 0;
		// let debug_text:string = "";

		for(let idx_l1:number = 0;idx_l1<game.locations.length;idx_l1++) {
			let l1:AILocation = game.locations[idx_l1];
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				let l2:AILocation = game.locations[idx_l2];
				if (l1 == l2) continue;
				if (game.location_in[idx_l1][idx_l2]) {
					let somethingInBetween:boolean = false;
					for(let idx_l3:number = 0;idx_l3<game.locations.length;idx_l3++) {
						if (idx_l3 != idx_l1 && idx_l3 != idx_l2 &&
							game.location_in[idx_l1][idx_l3] &&
							game.location_in[idx_l3][idx_l2]) {
							somethingInBetween = true;
							break;
						}
					}
					if (!somethingInBetween) {
						//let term:Term = Term.fromString("space.at('"+l1.id+"'[#id], '"+l2.id+"'[#id])", o);
						let term:Term = Term.fromString("space.inside.of('"+l1.id+"'[#id], '"+l2.id+"'[#id])", o);
						//if (this.selfID == "etaoin") console.log(term.toString());

						// this.addLongTermTerm(term, LOCATIONS_PROVENANCE);
						// if has to be added this way, since otherwise, it's treated like a #StateSort, and it removes the previous
						// names we might have added!
						this.addLongTermRuleNow(new Sentence([term], [true]), LOCATIONS_PROVENANCE);
						n_space_at++;
						// debug_text += term + "\n";
					}
				} else {
					let mostSpecific:boolean = true;
					for(let idx_l3:number = 0;idx_l3<game.locations.length;idx_l3++) {
						if (idx_l3 != idx_l1 && idx_l3 != idx_l2 &&
							game.location_in[idx_l1][idx_l3] &&
							!game.location_in[idx_l2][idx_l3]) {
							mostSpecific = false;
							break;
						}
					}
					if (mostSpecific) {					
						let s:Sentence = Sentence.fromString("~space.inside.of('"+l1.id+"'[#id], '"+l2.id+"'[#id])", o);
						this.addLongTermRuleNow(s, LOCATIONS_PROVENANCE);
						n_not_space_at++;
						// debug_text += s + "\n";
					}
				}
			}
		}

		for(let idx_l1:number = 0;idx_l1<game.locations.length;idx_l1++) {
//			console.log("idx: " + idx_l1);
			let l1:AILocation = game.locations[idx_l1];
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				let l2:AILocation = game.locations[idx_l2];
				if (l1 == l2) continue;
				if (game.location_in[idx_l1][idx_l2] ||
					game.location_in[idx_l2][idx_l1]) continue;
				if (game.location_connects[idx_l1][idx_l2]) {
					let str:string = "space.connects('"+l1.id+"'["+l1.sort.name+"], '"+l2.id+"'["+l2.sort.name+"])";
					let term:Term = Term.fromString(str, o);
					//console.log(term.toString());
					this.addLongTermTerm(term, LOCATIONS_PROVENANCE);
					n_space_connects++;
					// debug_text += str + "\n";
				}
			}
		}
		console.log("RuleBasedAI.precalculateLocationKnowledge: " + n_space_at + ", " + n_not_space_at + ", " + n_space_connects);
		// downloadStringAsFile(debug_text, "location-predicates.txt");
	}


	add3DPrintingKnowledge(game:A4Game, o:Ontology, IDofAIthatCanPrint:string)
	{
		for(let recipe of game.three_d_printer_recipies) {
			let item:string = recipe[0]
			let materials:string[] = recipe[1];

			let term:Term = Term.fromString("verb.can('"+IDofAIthatCanPrint+"'[#id], action.print('"+IDofAIthatCanPrint+"'[#id], ["+item+"]))", o);
			this.addLongTermRuleNow(new Sentence([term], [true]), BACKGROUND_PROVENANCE);
			term = Term.fromString("verb.can('david'[#id], action.print('david'[#id], ["+item+"]))", o);
			this.addLongTermRuleNow(new Sentence([term], [true]), BACKGROUND_PROVENANCE);

			let sentence:Sentence = Sentence.fromString("~metal-3dprinter(X) ; verb.can('"+IDofAIthatCanPrint+"'[#id], action.print('"+IDofAIthatCanPrint+"'[#id], ["+item+"], X))", o);
			this.addLongTermRuleNow(sentence, BACKGROUND_PROVENANCE);
			sentence = Sentence.fromString("~metal-3dprinter(X) ; verb.can('david'[#id], action.print('david'[#id], ["+item+"], X))", o);
			console.log(sentence.toString())
			this.addLongTermRuleNow(sentence, BACKGROUND_PROVENANCE);

			if (materials.length == 1 && materials[0] == "plastic") {
				let sentence2:Sentence = Sentence.fromString("~plastic-3dprinter(X) ; verb.can('"+IDofAIthatCanPrint+"'[#id], action.print('"+IDofAIthatCanPrint+"'[#id], ["+item+"], X))", o);
				this.addLongTermRuleNow(sentence2, BACKGROUND_PROVENANCE);
				sentence2 = Sentence.fromString("~plastic-3dprinter(X) ; verb.can('david'[#id], action.print('david'[#id], ["+item+"], X))", o);
				this.addLongTermRuleNow(sentence2, BACKGROUND_PROVENANCE);
			}

			for(let material of materials) {
				term = Term.fromString("verb.need-for(X:[#id], ["+material+"], action.print(X, '"+item+"'["+item+"]))", o);
				this.addLongTermRuleNow(new Sentence([term], [true]), BACKGROUND_PROVENANCE);
			}
		}
	}


	perception(x0:number, y0:number, x1:number, y1:number, 
			   location:AILocation, map:A4Map, visibilityRegion:number, occupancyMap:boolean[],
			   ifVisionNotActive:number[])
	{
		let l:A4Object[] = [];

		if (this.visionActive) {
			l = map.getAllObjects(x0, y0, (x1-x0), (y1-y0));
		} else if (ifVisionNotActive != null) {
			l = map.getAllObjects(ifVisionNotActive[0], ifVisionNotActive[1],
							  ifVisionNotActive[2]-ifVisionNotActive[0], ifVisionNotActive[3]-ifVisionNotActive[1]);
		}

//		console.log("location: " + location.name + " l.length = " + l.length + " l.sort = " + location.sort);

		if (this.visionActive) {
			this.addTermToPerception(Term.fromString("property.sighted('"+this.selfID+"'[#id])", this.o));
		} else {
			this.addTermToPerception(Term.fromString("property.blind('"+this.selfID+"'[#id])", this.o));
		}


		this.addTermToPerception(new Term(location.sort, [new ConstantTermAttribute(location.id, this.cache_sort_id)]));
		// perceive the light status:
		if (this.visionActive) {
			if (this.game.rooms_with_lights.indexOf(location.id) != -1) {
				if (this.game.rooms_with_lights_on.indexOf(location.id) != -1) {
					// lights on! room is bright:
					this.addTermToPerception(new Term(this.cache_sort_bright, [new ConstantTermAttribute(location.id, this.cache_sort_id)]));
				} else {
					// lights off! room is dark:
					this.addTermToPerception(new Term(this.cache_sort_dark, [new ConstantTermAttribute(location.id, this.cache_sort_id)]));
				}
			}
		}

		let perceivedLocations:AILocation[] = [location];

		for(let o of l) {
			let tile_ox:number = Math.floor(o.x/map.tileWidth);
			let tile_oy:number = Math.floor((o.y+o.tallness)/map.tileHeight);
			let offset:number = tile_ox + tile_oy*map.width;
			// - Doors are usually in between visibility regions, and thus, we just perceive them all, and that's it!
			// - East cave is also an exception, since the rocks are just to prevent the player from seeing Shrdlu, but
			//   Shrdlu should be able to hear the player from a different visibilityRegion
			if (map.visibilityRegions[offset] == visibilityRegion ||
				(tile_ox>0 && map.visibilityRegions[offset-1] == visibilityRegion) ||
				(tile_ox<map.width-1 && map.visibilityRegions[offset+1] == visibilityRegion) ||
				(tile_oy>0 && map.visibilityRegions[offset-map.width] == visibilityRegion) ||
				(tile_oy<map.height-1 && map.visibilityRegions[offset+map.width] == visibilityRegion) ||
				o instanceof A4Door ||
				o.ID == "tardis-broken-cable" || 	// exception: since this is inside the wall, they don't see it otherwise!
			    map.name == "East Cave") {
				let locationID:string = location.id;
				if (!occupancyMap[offset]) {
					// it's not in "location":
					let l2:AILocation = this.game.getAILocation(o);
					if (l2!=null) locationID = l2.id;
					if (perceivedLocations.indexOf(l2) == -1) {
						perceivedLocations.push(l2);
						this.addTermToPerception(new Term(l2.sort, [new ConstantTermAttribute(l2.id, this.cache_sort_id)]));
					}
				}

				// perceived an object!
				let term1:Term = new Term(o.sort, [new ConstantTermAttribute(o.ID, this.cache_sort_id)]);
				let term2:Term = new Term(this.cache_sort_space_iside_of, 
										  [new ConstantTermAttribute(o.ID, this.cache_sort_id),
										   new ConstantTermAttribute(locationID, this.cache_sort_id)
//										   new ConstantTermAttribute(tile_ox, this.cache_sort_number),
//										   new ConstantTermAttribute(tile_oy, this.cache_sort_number),
//										   new ConstantTermAttribute(map.name, this.cache_sort_symbol)
										   ]);
//				console.log(term1.toString());
//				console.log(term2.toString());
				this.addTermToPerception(term1);
				this.addTermToPerception(term2);

				for(let property of this.getBaseObjectProperties(o)) {
					this.addTermToPerception(property);

				}

				if (o instanceof A4Character) {
					for(let o2 of (<A4Character>o).inventory) {
						let term3:Term = new Term(o2.sort, [new ConstantTermAttribute(o2.ID, this.cache_sort_id)]);
						let term4:Term = new Term(this.cache_sort_space_iside_of, 
												  [new ConstantTermAttribute(o2.ID, this.cache_sort_id),
												   new ConstantTermAttribute(locationID, this.cache_sort_id)
												   ]);
						this.addTermToPerception(term3);
						this.addTermToPerception(term4);
						this.addTermToPerception(new Term(this.cache_sort_verb_have, 
														  [new ConstantTermAttribute(o.ID, this.cache_sort_id),
														   new ConstantTermAttribute(o2.ID, this.cache_sort_id)]
								  						  ));
						for(let property of this.getBaseObjectProperties(o2)) {
							this.addTermToPerception(property);
						}
					}
				} else if (o instanceof A4Container) {
					for(let o2 of (<A4Container>o).content) {
						let term3:Term = new Term(o2.sort, [new ConstantTermAttribute(o2.ID, this.cache_sort_id)]);
						let term4:Term = new Term(this.cache_sort_space_iside_of, 
												  [new ConstantTermAttribute(o2.ID, this.cache_sort_id),
												   new ConstantTermAttribute(locationID, this.cache_sort_id)
												   ]);
						this.addTermToPerception(term3);
						this.addTermToPerception(term4);
						this.addTermToPerception(new Term(this.cache_sort_verb_contains, 
														  [new ConstantTermAttribute(o.ID, this.cache_sort_id),
														   new ConstantTermAttribute(o2.ID, this.cache_sort_id)]
								  						  ));
						for(let property of this.getBaseObjectProperties(o2)) {
							this.addTermToPerception(property);
						}
					}
				} else if (o instanceof A4Vehicle) {
					for(let o2 of (<A4Vehicle>o).load) {
						let term3:Term = new Term(o2.sort, [new ConstantTermAttribute(o2.ID, this.cache_sort_id)]);
						let term4:Term = new Term(this.cache_sort_space_iside_of, 
												  [new ConstantTermAttribute(o2.ID, this.cache_sort_id),
												   new ConstantTermAttribute(locationID, this.cache_sort_id)
												   ]);
						this.addTermToPerception(term3);
						this.addTermToPerception(term4);
						this.addTermToPerception(new Term(this.cache_sort_verb_contains, 
														  [new ConstantTermAttribute(o.ID, this.cache_sort_id),
														   new ConstantTermAttribute(o2.ID, this.cache_sort_id)]
								  						  ));
						for(let property of this.getBaseObjectProperties(o2)) {
							this.addTermToPerception(property);
						}
					}
				} else if (o.sort.is_a_string("light")) {
					if (this.game.rooms_with_lights.indexOf(location.id) != -1) {
						if (this.game.rooms_with_lights_on.indexOf(location.id) != -1) {
							this.addTermToPerception(new Term(this.cache_sort_powered_state, [new ConstantTermAttribute(o.ID, this.cache_sort_id), new ConstantTermAttribute(this.cache_sort_powered_on.name, this.cache_sort_powered_on)]));
						} else {
							this.addTermToPerception(new Term(this.cache_sort_powered_state, [new ConstantTermAttribute(o.ID, this.cache_sort_id), new ConstantTermAttribute(this.cache_sort_powered_off.name, this.cache_sort_powered_off)]));
						}
					}
				}
			}
		}

		// actions:
        for(let pbr of map.perceptionBuffer) {
            if (pbr.x0<x1 && pbr.x1>x0 &&
                pbr.y0<y1 && pbr.y1>y0) {
				let tile_ox:number = Math.floor(pbr.x0/map.tileWidth);
				let tile_oy:number = Math.floor(pbr.y0/map.tileHeight);
				let offset:number = tile_ox + tile_oy*map.width;

				if ((map.visibilityRegions[offset] == visibilityRegion ||
			    	 map.name == "East Cave") &&
					this.alreadyProcessedPBRs.indexOf(pbr)==-1) {

					// we always perceive "talk", but the rest only if the AI can see:
					if (pbr.action == "talk" || this.visionActive) {
						this.perceivePBR(pbr);
					}
    	        }
            }
        }

		if (this.game.communicatorConnectedTo == this.selfID &&
			this.game.currentPlayer.findObjectByID("communicator") != null) {
			// we can hear david throught the communicator:
	        for(let pbr of this.game.currentPlayer.map.perceptionBuffer) {
	        	if (pbr.action == "talk" && pbr.subjectID == "david" &&
	        		this.alreadyProcessedPBRs.indexOf(pbr)==-1) {
	        		// we can hear it!
	        		this.perceivePBR(pbr);
	        	}
	        }
		}

		// internal clock:
		let timeTerm:Term = new Term(this.cache_sort_time_current,
									 [new ConstantTermAttribute(this.time_in_seconds, this.o.getSort("number"))]);
		this.addTermToPerception(timeTerm);
	}


	perceivePBR(pbr:PerceptionBufferRecord)
	{
		if (this.alreadyProcessedPBRs.length >= 50) this.alreadyProcessedPBRs.slice(0,49);
		this.alreadyProcessedPBRs.push(pbr);

        // perceived an action!
    	let actionTerms:Term[] = [Term.fromString("action."+pbr.action + "("+
    										      "'"+pbr.time+"'[number],"+
    											  "'"+pbr.subjectID+"'[#id])", this.o)];
    	if (pbr.directObjectID != null) {
    		for(let actionTerm of actionTerms) {
    			actionTerm.addAttribute(new ConstantTermAttribute(pbr.directObjectID, this.o.getSort("#id")));
    		}
    	} else if (pbr.directObjectSymbol != null &&
    		       pbr.subjectID != this.selfID) {
    		// assume that this is a "talk" action:
    		let context:NLContext = null;
    		for(let actionTerm of actionTerms) {
    			actionTerm.addAttribute(new ConstantTermAttribute(pbr.directObjectSymbol, this.o.getSort("#id")));
    			// update context perception:
    			context = this.updateContext((<ConstantTermAttribute>actionTerm.attributes[1]).value);
    		}

			// parse the text:
		    let parses:NLParseRecord[] = this.naturalLanguageParser.parse(pbr.directObjectSymbol, this.cache_sort_performative, context, this);
		    if (parses == null || parses.length == 0 && this.naturalLanguageParser.error_semantic.length > 0) {
		    	// if we cannot parse sentences in any other way, at least consider the semantic errors as the parses:
		    	parses = this.naturalLanguageParser.error_semantic;
		    }
		    if (parses != null && parses.length > 0) {
		    	let HPparse:NLParseRecord = this.naturalLanguageParser.chooseHighestPriorityParse(parses);
		    	console.log("AIRuleBasedAI("+this.selfID+"): parsed sentence '" + pbr.directObjectSymbol + "'\n  " + HPparse.result);
		    	// the parse might contain several performatives combined with a "#list" construct
				let parsePerformatives:TermAttribute[] = NLParser.elementsInList(HPparse.result, "#list");
				let actionTerms2:Term[] = [];
        		for(let actionTerm of actionTerms) {
	        		for(let parsePerformative of parsePerformatives) {
	        			let tmp:Term = actionTerm.clone([]);
				    	tmp.addAttribute(parsePerformative);
				    	actionTerms2.push(tmp);
	        		}
        		}
        		actionTerms = actionTerms2;
		    } else {
		    	console.warn("A4RuleBasedAI ("+this.selfID+"): cannot parse sentence: " + pbr.directObjectSymbol);
		    	if (this.naturalLanguageParser.error_semantic.length > 0) console.warn("    semantic error!");
		    	if (this.naturalLanguageParser.error_deref.length > 0) console.warn("    ("+this.selfID+") could not deref expressions: " + this.naturalLanguageParser.error_deref);
		    	if (this.naturalLanguageParser.error_unrecognizedTokens.length > 0) console.warn("    unrecognized tokens: " + this.naturalLanguageParser.error_unrecognizedTokens);
		    	if (this.naturalLanguageParser.error_grammatical) console.warn("    grammatical error!");
		    	if (this.respondToPerformatives) this.reactiveBehaviorUpdateToParseError(pbr.subjectID);
		    }
    	}
    	if (pbr.indirectObjectID != null) {
    		for(let actionTerm of actionTerms) {
        		actionTerm.addAttribute(new ConstantTermAttribute(pbr.indirectObjectID, pbr.indirectObjectSort));
        	}
    	}
		for(let actionTerm of actionTerms) {
			// console.log(actionTerm + " added to perception");
			this.addTermToPerception(actionTerm);
		}		
	}


	distanceBetweenIds(source:string, target:string)
	{
		// We assume that unless the AI is seeing an object, it does not know where it is:
		let sourceObject:A4Object = null;
		let targetObject:A4Object = null;
		// We assume that the AIs know all the locations:
		let sourceLocation:AILocation = this.game.getAILocationByID(source);
		let targetLocation:AILocation = this.game.getAILocationByID(target);
		for(let te of this.shortTermMemory.plainTermList) {
			let t:Term = te.term;
			if (te.provenance == PERCEPTION_PROVENANCE &&
				t.functor.is_a(this.cache_sort_object) &&
				t.attributes.length == 1) {
				if ((<ConstantTermAttribute>t.attributes[0]).value == source) {
					sourceObject = this.game.findObjectByIDJustObject(source);
				} else if ((<ConstantTermAttribute>t.attributes[0]).value == target) {
					targetObject = this.game.findObjectByIDJustObject(target);
				}
			}/* else if (te.provenance == PERCEPTION_PROVENANCE &&
				t.functor.is_a(this.cache_sort_space_location) &&
				t.attributes.length == 1) {
				if ((<ConstantTermAttribute>t.attributes[0]).value == source) {
					sourceLocation = this.game.getAILocationByID(source);
				} else if ((<ConstantTermAttribute>t.attributes[0]).value == target) {
					targetLocation = this.game.getAILocationByID(target);
				}
			}*/
		}
		if (sourceObject != null && targetObject != null) {
			if (targetObject.map == sourceObject.map) {
				let x1:number = targetObject.x + targetObject.getPixelWidth()/2;
				let y1:number = targetObject.y + targetObject.tallness + (targetObject.getPixelHeight()-targetObject.tallness)/2;
				let x2:number = sourceObject.x + sourceObject.getPixelWidth()/2;
				let y2:number = sourceObject.y + sourceObject.tallness + (sourceObject.getPixelHeight()-sourceObject.tallness)/2;
				return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
			}
		}
		if (sourceObject != null && targetLocation != null) {
			let mapIdx:number = targetLocation.maps.indexOf(sourceObject.map);
			if (mapIdx != -1) {
				return targetLocation.distanceFromObject(sourceObject, mapIdx);
			}
		}
		if (sourceLocation != null && targetObject != null) {
			let mapIdx:number = sourceLocation.maps.indexOf(targetObject.map);
			if (mapIdx != -1) {
				return sourceLocation.distanceFromObject(targetObject, mapIdx);
			}
		}
		if (sourceLocation != null && targetLocation != null) {
			return sourceLocation.distanceFromLocation(targetLocation, this.game);
		}

		// special cases:
		// NOTE: this is bad, I should have these in the KB in some declarative form!
		if (source == 'earth') {
			if (targetObject != null || targetLocation != null || target == 'aurora') {
				return 1.1246e+20;
			}
		}
		if (target == 'earth') {
			if (sourceObject != null || sourceLocation != null || source == 'aurora') {
				return 1.1246e+20;
			}
		}
		if (source == 'aurora') {
			if (targetObject != null || targetLocation != null) {
				return 0;
			}
		}
		if (target == 'aurora') {
			if (sourceObject != null || sourceLocation != null) {
				return 0;
			}
		}
		return null;
	}


	updateContext(speaker:string) : NLContext
	{
		let context:NLContext = this.contextForSpeaker(speaker);
		if (context.lastTimeUpdated >= this.time_in_seconds) return context;
		context.lastTimeUpdated = this.time_in_seconds;
		context.shortTermMemory = [];

//		console.log("updateContext: speaker: " + speakerObject)
		// add from perception:
		let alreadyUpdatedEntities:string[] = [];
		for(let te of this.shortTermMemory.plainTermList) {
			let t:Term = te.term;
			if ((t.functor.is_a(this.cache_sort_object) ||
				 t.functor.is_a(this.cache_sort_space_location) ||
				 t.functor.is_a(this.cache_sort_property) ||
				 t.functor.is_a(this.cache_sort_relation))) {

				if (t.attributes[0] instanceof ConstantTermAttribute) {
					let id:string = (<ConstantTermAttribute>t.attributes[0]).value;
					if (alreadyUpdatedEntities.indexOf(id) == -1) {
						alreadyUpdatedEntities.push(id);
						let distanceFromSpeaker:number = this.distanceBetweenIds(speaker, id);
						let e:NLContextEntity = context.newContextEntity(<ConstantTermAttribute>t.attributes[0], null, distanceFromSpeaker, this.o);
						if (e!=null && context.shortTermMemory.indexOf(e) == -1) context.shortTermMemory.push(e);
					}
				}
			}			
		}

		context.sortEntities();

		return context;
	}


	resolveThere(otherCharacterID:string, otherCharacterLocation:AILocation) : AILocation
	{
		let context:NLContext = this.contextForSpeaker(otherCharacterID);
		if (context == null) return null;

		// We need to see what "there" refers to:
		// 1) if there is a place mentioned in the previous performative, then that's it
//		let perf:NLContextPerformative = context.lastPerformativeBy(otherCharacterID);
		let perf:NLContextPerformative = context.lastPerformativeBy(this.selfID);
		if (perf != null) {
			let IDs:ConstantTermAttribute[] = [];
			for(let i:number = 0;i<perf.performative.attributes.length;i++) {
				if (perf.performative.attributes[i] instanceof ConstantTermAttribute) {
					IDs.push(<ConstantTermAttribute>(perf.performative.attributes[0]));
				} else if (perf.performative.attributes[i] instanceof TermTermAttribute) {
					NLContext.searchForIDsInClause((<TermTermAttribute>perf.performative.attributes[i]).term, IDs, context.ai.o);
				}
			}
			let locations:AILocation[] = [];
			for(let ID of IDs) {
				let loc:AILocation = this.game.getAILocationByID((<ConstantTermAttribute>ID).value);
				if (loc != null) locations.push(loc);
			}
			if (locations.length == 1) return locations[0];
		}

		// 2) otherwise, it refers to the location of the listener, unless it's the same as that of the speaker
		let me:A4Object = this.game.findObjectByIDJustObject(this.selfID);
		if (me != null) {
			let myLoc:AILocation = this.game.getAILocation(me);
			if (myLoc != otherCharacterLocation) return myLoc;
		}

		return null;
	}


	canSee(characterID:string)
	{
		if (!this.visionActive) return false;
		// if the character is in the perception buffer:
		let objectSort:Sort = this.o.getSort("object");
		let locationSort:Sort = this.o.getSort("space.location");
		for(let tc of this.shortTermMemory.plainTermList) {
			let t:Term = tc.term;
			if ((t.functor.is_a(objectSort) || t.functor.is_a(locationSort)) && 
				t.attributes.length == 1 &&
				t.attributes[0] instanceof ConstantTermAttribute &&
				(<ConstantTermAttribute>t.attributes[0]).value == "" + characterID) {
				return true;
			}
		}

		return false;
	}


	canHear(objectID:string)
	{
		let o:A4Object = this.game.findObjectByIDJustObject(objectID);
		if (o == null) return false;
		return true;
	}


	// reference object is used in case o2 is not a directional object, to determine what is "behind" and "in front"
	checkSpatialRelation(relation:Sort, o1ID:string, o2ID:string, referenceObject:string) : boolean
	{
		if (relation.is_a(this.cache_sort_space_at) ||
			relation.name == "space.outside.of") {
			if (o1ID == o2ID) return false;
			let loc2:AILocation = this.game.getAILocationByID(o2ID);	// see if o2 is a location
			if (loc2 == null) {
				// if o2ID is not a location, maybe it's a container or a character:
				if (relation.is_a(this.cache_sort_space_at)) {
					let o1l:A4Object[] = this.game.findObjectByID(o1ID);	// see if o1 is an object
					if (o1l == null) return null;
					for(let o2 of o1l) {
						if (o2.ID == o2ID) return true;
					}
					return null;
				} else {
					return null;
				}
			}
			let o1l:A4Object[] = this.game.findObjectByID(o1ID);	// see if o1 is an object
			let loc1:AILocation = null;
			if (o1l == null) {
				loc1 = this.game.getAILocationByID(o1ID);	// if it's not an object, maybe it's a location
				if (loc1 == null) return null;	// we don't know!
			} else {
				loc1 = this.game.getAILocation(o1l[0]);
			}
			if (loc1 == null) return null;
			if (loc1 == loc2) {
				if (relation.is_a(this.cache_sort_space_at)) return true;
				return false;
			}
			if (relation.is_a(this.cache_sort_space_at)) {
				return this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)];
			} else {
				return !this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)] &&
					   !this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)];
			}
		} else if (relation.name == "space.near") {
			let distance:number = this.distanceBetweenIds(o1ID, o2ID);
			if (distance == null) return null;
			if (distance < SPACE_NEAR_FAR_THRESHOLD) return true;
			return false;
		} else if (relation.name == "space.far") {
			let distance:number = this.distanceBetweenIds(o1ID, o2ID);
			if (distance == null) return null;
			if (distance >= SPACE_NEAR_FAR_THRESHOLD) return true;
			return false;
		} else if (relation.name == "space.north.of" ||
			relation.name == "space.east.of" ||
			relation.name == "space.west.of" ||
			relation.name == "space.south.of" ||
			relation.name == "space.northeast.of" ||
			relation.name == "space.northwest.of" ||
			relation.name == "space.southeast.of" ||
			relation.name == "space.southwest.of" ||
			relation.name == "space.in.front.of" ||
			relation.name == "space.behind") {
			let o1:A4Object = this.game.findObjectByIDJustObject(o1ID);
			let o2:A4Object = this.game.findObjectByIDJustObject(o2ID);
			let inFrontDirection:number = A4_DIRECTION_NONE;
			if (o1 != null && o2 != null) {
				if (o1.map != o2.map) return null;
				let x1:number = Math.floor(o1.x + o1.getPixelWidth()/2);
				let y1:number = Math.floor(o1.y+o1.tallness + (o1.getPixelHeight()-o1.tallness)/2);
				let x2:number = Math.floor(o2.x + o2.getPixelWidth()/2);
				let y2:number = Math.floor(o2.y+o2.tallness + (o2.getPixelHeight()-o2.tallness)/2);
				let dx:number = x1-x2;
				let dy:number = y1-y2;
				if (o2.x >= o1.x && o2.x + o2.getPixelWidth() <= o1.x+o1.getPixelWidth()) dx = 0;
				if (o2.y + o2.tallness >= o1.y + o1.tallness && o2.y + o2.getPixelHeight() <= o1.y+o1.getPixelHeight()) dy = 0;
				
				// find the reference direction:
				if (o2 instanceof A4Character) {
					inFrontDirection = o2.direction;
				} else {
					let or:A4Object = this.game.findObjectByIDJustObject(referenceObject);
					if (or == null || !(or instanceof A4Character)) {
						// in this case, we just take the reference of the player:
						or = this.game.currentPlayer;
					}
					if (or.map == o2.map) {
						let o_dx:number = Math.floor(or.x + or.getPixelWidth()/2) - x2;
						let o_dy:number = Math.floor(or.y+or.tallness + (or.getPixelHeight()-or.tallness)/2) - y2;
						let angle:number = Math.atan2(o_dy,o_dx);
						if (angle>-(6*Math.PI/8) && angle<=-(2*Math.PI/8)) {
							inFrontDirection = A4_DIRECTION_UP;
						} else if (angle>-(2*Math.PI/8) && angle<=(2*Math.PI/8)) {
							inFrontDirection = A4_DIRECTION_RIGHT;
						} else if (angle>(2*Math.PI/8) && angle<=(6*Math.PI/8)) {
							inFrontDirection = A4_DIRECTION_DOWN;
						} else {
							inFrontDirection = A4_DIRECTION_LEFT;
						}
					}
				}
				return this.checkSpatialRelationBetweenCoordinates(relation, dx, dy, inFrontDirection);
			} else {
				if (o1 == null) {
					if (o2 == null) {
						let loc1:AILocation = this.game.getAILocationByID(o1ID);
						let loc2:AILocation = this.game.getAILocationByID(o2ID);
						if (loc1 == null || loc2 == null) return null;
						// relation between two locations:
						if (this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)] ||
							this.game.location_in[this.game.locations.indexOf(loc2)][this.game.locations.indexOf(loc1)]) return false;
						for(let map of loc1.maps) {
							if (loc2.maps.indexOf(map) != -1) {
								let x1_y1:number[] = loc1.centerCoordinatesInMap(map);
								let x2_y2:number[] = loc2.centerCoordinatesInMap(map);
								if (x1_y1 != null && x2_y2 != null) {

									// find the reference direction:
									let or:A4Object = this.game.findObjectByIDJustObject(referenceObject);
									if (or == null || !(or instanceof A4Character)) {
										// in this case, we just take the reference of the player:
										or = this.game.currentPlayer;
									}
									if (or.map == map) {
										let o_dx:number = Math.floor(or.x + or.getPixelWidth()/2) - x2_y2[0];
										let o_dy:number = Math.floor(or.y+or.tallness + (or.getPixelHeight()-or.tallness)/2) - x2_y2[0];
										let angle:number = Math.atan2(o_dy,o_dx);
										if (angle>-(6*Math.PI/8) && angle<=-(2*Math.PI/8)) {
											inFrontDirection = A4_DIRECTION_UP;
										} else if (angle>-(2*Math.PI/8) && angle<=(2*Math.PI/8)) {
											inFrontDirection = A4_DIRECTION_RIGHT;
										} else if (angle>(2*Math.PI/8) && angle<=(6*Math.PI/8)) {
											inFrontDirection = A4_DIRECTION_DOWN;
										} else {
											inFrontDirection = A4_DIRECTION_LEFT;
										}
									}
									return this.checkSpatialRelationBetweenCoordinates(relation, x1_y1[0]-x2_y2[0], x1_y1[1]-x2_y2[1], inFrontDirection);
								}
							}
						}
					} else {
						let loc1:AILocation = this.game.getAILocationByID(o1ID);
						if (loc1 != null) {
							let loc2:AILocation = this.game.getAILocation(o2);
							if (loc2 != null) {
								if (loc2 == loc1) return false;
								if (this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)] ||
									this.game.location_in[this.game.locations.indexOf(loc2)][this.game.locations.indexOf(loc1)]) return false;
								let x1_y1:number[] = loc1.centerCoordinatesInMap(o2.map);
								if (x1_y1 == null) return;
								let x2:number = Math.floor(o2.x + o2.getPixelWidth()/2);
								let y2:number = Math.floor(o2.y+o2.tallness + (o2.getPixelHeight()-o2.tallness)/2);

								// find the reference direction:
								if (o2 instanceof A4Character) {
									inFrontDirection = o2.direction;
								} else {
									let or:A4Object = this.game.findObjectByIDJustObject(referenceObject);
									if (or == null || !(or instanceof A4Character)) {
										// in this case, we just take the reference of the player:
										or = this.game.currentPlayer;
									}
									if (or.map == o2.map) {
										let o_dx:number = Math.floor(or.x + or.getPixelWidth()/2) - x2;
										let o_dy:number = Math.floor(or.y+or.tallness + (or.getPixelHeight()-or.tallness)/2) - y2;
										let angle:number = Math.atan2(o_dy,o_dx);
										if (angle>-(6*Math.PI/8) && angle<=-(2*Math.PI/8)) {
											inFrontDirection = A4_DIRECTION_UP;
										} else if (angle>-(2*Math.PI/8) && angle<=(2*Math.PI/8)) {
											inFrontDirection = A4_DIRECTION_RIGHT;
										} else if (angle>(2*Math.PI/8) && angle<=(6*Math.PI/8)) {
											inFrontDirection = A4_DIRECTION_DOWN;
										} else {
											inFrontDirection = A4_DIRECTION_LEFT;
										}
									}
								}
								return this.checkSpatialRelationBetweenCoordinates(relation, x1_y1[0]-x2, x1_y1[1]-y2, inFrontDirection);
							}
						}
					}
				} else {
					let loc2:AILocation = this.game.getAILocationByID(o2ID);
					if (loc2 != null) {
						let loc1:AILocation = this.game.getAILocation(o1);
						if (loc1 != null) {
							if (loc2 == loc1) return false;
							if (this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)] ||
								this.game.location_in[this.game.locations.indexOf(loc2)][this.game.locations.indexOf(loc1)]) return false;
							let x2_y2:number[] = loc2.centerCoordinatesInMap(o1.map);
							if (x2_y2 == null) return;
							let x1:number = Math.floor(o1.x + o1.getPixelWidth()/2);
							let y1:number = Math.floor(o1.y+o1.tallness + (o1.getPixelHeight()-o1.tallness)/2);

							// find the reference direction:
							let or:A4Object = this.game.findObjectByIDJustObject(referenceObject);
							if (or == null || !(or instanceof A4Character)) {
								// in this case, we just take the reference of the player:
								or = this.game.currentPlayer;
							}
							if (or.map == o1.map) {
								let o_dx:number = Math.floor(or.x + or.getPixelWidth()/2) - x2_y2[0];
								let o_dy:number = Math.floor(or.y+or.tallness + (or.getPixelHeight()-or.tallness)/2) - x2_y2[0];
								let angle:number = Math.atan2(o_dy,o_dx);
								if (angle>-(6*Math.PI/8) && angle<=-(2*Math.PI/8)) {
									inFrontDirection = A4_DIRECTION_UP;
								} else if (angle>-(2*Math.PI/8) && angle<=(2*Math.PI/8)) {
									inFrontDirection = A4_DIRECTION_RIGHT;
								} else if (angle>(2*Math.PI/8) && angle<=(6*Math.PI/8)) {
									inFrontDirection = A4_DIRECTION_DOWN;
								} else {
									inFrontDirection = A4_DIRECTION_LEFT;
								}
							}
							return this.checkSpatialRelationBetweenCoordinates(relation, x1-x2_y2[0], y1-x2_y2[1], inFrontDirection);
						}
					}
				}
			}
		}

		return null;
	}


	checkSpatialRelationBetweenCoordinates(relation:Sort, dx:number, dy:number, frontDirection:number) : boolean
	{
		if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
			let angle:number = Math.atan2(dy,dx);

			if (relation.name == "space.north.of") {
				return angle>-(7*Math.PI/8) && angle<=-(1*Math.PI/8);
			} else if (relation.name == "space.east.of") {
				return angle>-(3*Math.PI/8) && angle<=(3*Math.PI/8);
			} else if (relation.name == "space.west.of") {
				return angle<=-(5*Math.PI/8) || angle>(5*Math.PI/8);
			} else if (relation.name == "space.south.of") {
				return angle>(1*Math.PI/8) && angle<=(7*Math.PI/8);
			} else if (relation.name == "space.northeast.of") {
				return angle>-(3*Math.PI/8) && angle<=-(1*Math.PI/8);
			} else if (relation.name == "space.northwest.of") {
				return angle>-(7*Math.PI/8) && angle<=-(5*Math.PI/8);
			} else if (relation.name == "space.southeast.of") {
				return angle>(1*Math.PI/8) && angle<=(3*Math.PI/8);
			} else if (relation.name == "space.southwest.of") {
				return angle>(5*Math.PI/8) && angle<=(7*Math.PI/8);
			} else if ((relation.name == "space.in.front.of" && frontDirection == A4_DIRECTION_UP) ||
					   (relation.name == "space.behind" && frontDirection == A4_DIRECTION_DOWN)) {
				return angle>-(6*Math.PI/8) && angle<=-(2*Math.PI/8);
			} else if ((relation.name == "space.in.front.of" && frontDirection == A4_DIRECTION_RIGHT) ||
					   (relation.name == "space.behind" && frontDirection == A4_DIRECTION_LEFT)) {
				return angle>-(2*Math.PI/8) && angle<=(2*Math.PI/8);
			} else if ((relation.name == "space.in.front.of" && frontDirection == A4_DIRECTION_LEFT) ||
					   (relation.name == "space.behind" && frontDirection == A4_DIRECTION_RIGHT)) {
				return angle<=-(6*Math.PI/8) || angle>(6*Math.PI/8);
			} else if ((relation.name == "space.in.front.of" && frontDirection == A4_DIRECTION_DOWN) ||
					   (relation.name == "space.behind" && frontDirection == A4_DIRECTION_UP)) {
				return angle>(2*Math.PI/8) && angle<=(6*Math.PI/8);
			}

		}
		return null;
	}

	
	// Calculates spatial relations (e.g., "space.west.of") of o1 with respect to o2. 
	// E.g.: if "o1 is to the west of o2", this will return [this.o.getSort("space.west.of")]
	spatialRelations(o1ID:string, o2ID:string) : Sort[]
	{
		let relations:Sort[] = super.spatialRelations(o1ID, o2ID);
		let o1:A4Object = this.game.findObjectByIDJustObject(o1ID);
		let o2:A4Object = this.game.findObjectByIDJustObject(o2ID);
		if (relations == null) relations = [];
		if (o1 != null && o2 == null) {
			// try to see if o2ID is a location:
			let loc1:AILocation = this.game.getAILocation(o1);
			let loc2:AILocation = this.game.getAILocationByID(o2ID);	// see if o2 is a location
			if (loc1 != null && loc1 == loc2) {
				relations.push(this.cache_sort_space_at);
			}
		}

		if (o1 == null || o2 == null) return null;

		if (o2 instanceof A4Container) {
			if ((<A4Container>o2).content.indexOf(o1) != -1) relations.push(this.o.getSort("space.inside.of"));
		} else if (o1 instanceof A4Character) {
			if ((<A4Character>o2).inventory.indexOf(o1) != -1) relations.push(this.o.getSort("verb.have"));
		}

		if (o1.map != o2.map) return relations;
		let x1:number = Math.floor(o1.x + o1.getPixelWidth()/2);
		let y1:number = Math.floor(o1.y+o1.tallness + (o1.getPixelHeight()-o1.tallness)/2);
		let x2:number = Math.floor(o2.x + o2.getPixelWidth()/2);
		let y2:number = Math.floor(o2.y+o2.tallness + (o2.getPixelHeight()-o2.tallness)/2);
		let dx:number = x1-x2;
		let dy:number = y1-y2;
		let distance:number = Math.sqrt(dx*dx + dy*dy);
		if (distance < SPACE_NEAR_FAR_THRESHOLD) relations.push(this.o.getSort("space.near"));
		if (distance >= SPACE_NEAR_FAR_THRESHOLD) relations.push(this.o.getSort("space.far"));

		if (o2.x >= o1.x && o2.x + o2.getPixelWidth() <= o1.x+o1.getPixelWidth()) dx = 0;
		if (o2.y + o2.tallness >= o1.y + o1.tallness && o2.y + o2.getPixelHeight() <= o1.y+o1.getPixelHeight()) dy = 0;

//		console.log("dx: " + dx + ", dy: " + dy);
		if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
			let angle:number = Math.atan2(dy,dx);
//			console.log("angle: " + angle + ", dx: " + dx + ", dy: " + dy);

			if (angle>-(7*Math.PI/8) && angle<=-(5*Math.PI/8)) {
				relations.push(this.o.getSort("space.northwest.of"));
			} else if (angle>-(5*Math.PI/8) && angle<=-(3*Math.PI/8)) {
				relations.push(this.o.getSort("space.north.of"));
				if (o2.direction == A4_DIRECTION_UP) relations.push(this.o.getSort("space.in.front.of"));
				if (o2.direction == A4_DIRECTION_DOWN) relations.push(this.o.getSort("space.behind"));
			} else if (angle>-(3*Math.PI/8) && angle<=-(1*Math.PI/8)) {
				relations.push(this.o.getSort("space.northeast.of"));
			} else if (angle>-(1*Math.PI/8) && angle<=(1*Math.PI/8)) {
				relations.push(this.o.getSort("space.east.of"));
				if (o2.direction == A4_DIRECTION_RIGHT) relations.push(this.o.getSort("space.in.front.of"));
				if (o2.direction == A4_DIRECTION_LEFT) relations.push(this.o.getSort("space.behind"));
			} else if (angle>(1*Math.PI/8) && angle<=(3*Math.PI/8)) {
				relations.push(this.o.getSort("space.southeast.of"));
			} else if (angle>(3*Math.PI/8) && angle<=(5*Math.PI/8)) {
				relations.push(this.o.getSort("space.south.of"));
				if (o2.direction == A4_DIRECTION_DOWN) relations.push(this.o.getSort("space.in.front.of"));
				if (o2.direction == A4_DIRECTION_UP) relations.push(this.o.getSort("space.behind"));
			} else if (angle>(5*Math.PI/8) && angle<=(7*Math.PI/8)) {
				relations.push(this.o.getSort("space.southwest.of"));
			} else {
				relations.push(this.o.getSort("space.west.of"));
				if (o2.direction == A4_DIRECTION_LEFT) relations.push(this.o.getSort("space.in.front.of"));
				if (o2.direction == A4_DIRECTION_RIGHT) relations.push(this.o.getSort("space.behind"));
			}
		}

		return relations;
	}
	

	spatialRelationsFromLocation(l1:AILocation, o2:A4Object) : Sort[]
	{
		let relations:Sort[] = [];

		let tmp:[number,number] = l1.centerCoordinatesInMap(o2.map);
		if (tmp == null) return relations;
		let x1:number = tmp[0];
		let y1:number = tmp[1];

		let x2:number = Math.floor(o2.x + o2.getPixelWidth()/2);
		let y2:number = Math.floor(o2.y+o2.tallness + (o2.getPixelHeight()-o2.tallness)/2);
		let dx:number = x1-x2;
		let dy:number = y1-y2;

		if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
			let angle:number = Math.atan2(dy,dx);
	//		console.log("angle: " + angle + ", dx: " + dx + ", dy: " + dy);

			if (angle>-(7*Math.PI/8) && angle<=-(5*Math.PI/8)) {
				relations.push(this.o.getSort("space.northwest.of"));
			} else if (angle>-(5*Math.PI/8) && angle<=-(3*Math.PI/8)) {
				relations.push(this.o.getSort("space.north.of"));
			} else if (angle>-(3*Math.PI/8) && angle<=-(1*Math.PI/8)) {
				relations.push(this.o.getSort("space.northeast.of"));
			} else if (angle>-(1*Math.PI/8) && angle<=(1*Math.PI/8)) {
				relations.push(this.o.getSort("space.east.of"));
			} else if (angle>(1*Math.PI/8) && angle<=(3*Math.PI/8)) {
				relations.push(this.o.getSort("space.southeast.of"));
			} else if (angle>(3*Math.PI/8) && angle<=(5*Math.PI/8)) {
				relations.push(this.o.getSort("space.south.of"));
			} else if (angle>(5*Math.PI/8) && angle<=(7*Math.PI/8)) {
				relations.push(this.o.getSort("space.southwest.of"));
			} else {
				relations.push(this.o.getSort("space.west.of"));
			}
		}

		return relations;
	}


	spatialRelationsLocationsAsNouns(l1:AILocation, l2:AILocation) : Sort[]
	{
		let relations:Sort[] = [];

		if (this.game.location_in[this.game.locations.indexOf(l1)]
							     [this.game.locations.indexOf(l2)]) return relations;
		if (this.game.location_in[this.game.locations.indexOf(l2)]
							     [this.game.locations.indexOf(l1)]) return relations;
		let map:A4Map = null;
		for(let map2 of l1.maps) {
			if (l2.maps.indexOf(map2) != -1) {
				map = map2;
				break;
			}
		}
		if (map == null) return relations;


		let tmp:[number,number] = l1.centerCoordinatesInMap(map);
		if (tmp == null) return relations;
		let x1:number = tmp[0];
		let y1:number = tmp[1];

		let tmp2:[number,number] = l2.centerCoordinatesInMap(map);
		if (tmp2 == null) return relations;
		let x2:number = tmp2[0];
		let y2:number = tmp2[1];

		let dx:number = x1-x2;
		let dy:number = y1-y2;

		if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
			let angle:number = Math.atan2(dy,dx);
	//		console.log("angle: " + angle + ", dx: " + dx + ", dy: " + dy);

			if (angle>-(7*Math.PI/8) && angle<=-(5*Math.PI/8)) {
				relations.push(this.o.getSort("northwest"));
			} else if (angle>-(5*Math.PI/8) && angle<=-(3*Math.PI/8)) {
				relations.push(this.o.getSort("north"));
			} else if (angle>-(3*Math.PI/8) && angle<=-(1*Math.PI/8)) {
				relations.push(this.o.getSort("northeast"));
			} else if (angle>-(1*Math.PI/8) && angle<=(1*Math.PI/8)) {
				relations.push(this.o.getSort("east"));
			} else if (angle>(1*Math.PI/8) && angle<=(3*Math.PI/8)) {
				relations.push(this.o.getSort("southeast"));
			} else if (angle>(3*Math.PI/8) && angle<=(5*Math.PI/8)) {
				relations.push(this.o.getSort("south"));
			} else if (angle>(5*Math.PI/8) && angle<=(7*Math.PI/8)) {
				relations.push(this.o.getSort("southwest"));
			} else {
				relations.push(this.o.getSort("west"));
			}
		}

		return relations;
	}


	processSuperlatives(results:InferenceNode[], superlative:Sentence)
	{
		if (superlative.terms.length == 1 &&
			superlative.terms[0].functor.name == "space.nearest-to" &&
			superlative.terms[0].attributes.length == 2) {
			let best:InferenceNode = null;
			let best_distance:number = null;
			for(let result of results) {
				let tmp:Term = superlative.terms[0].applyBindings(result.bindings);
				if ((tmp.attributes[0] instanceof ConstantTermAttribute) &&
					(tmp.attributes[1] instanceof ConstantTermAttribute)) {
					let d:number = this.distanceBetweenIds((<ConstantTermAttribute>tmp.attributes[0]).value,
														   (<ConstantTermAttribute>tmp.attributes[1]).value);
					if (!superlative.sign[0] && d != null) d = -d;
					console.log("processSuperlatives: d = " + d + ", from: " + tmp);
					if (best_distance == null) {
						best = result;
						best_distance = d;
					} else if (d != null && 
							   best_distance > d) {
						best = result;
						best_distance = d;
					}
				} else {
					if (best == null) {
						best = result;
					}
				}
			}
			console.log("processSuperlatives: best = " + best);
			return [best];
		} else if (superlative.terms.length == 1 &&
			superlative.terms[0].functor.name == "space.farthest-from" &&
			superlative.terms[0].attributes.length == 2) {
			let best:InferenceNode = null;
			let best_distance:number = null;
			for(let result of results) {
				let tmp:Term = superlative.terms[0].applyBindings(result.bindings);
				if ((tmp.attributes[0] instanceof ConstantTermAttribute) &&
					(tmp.attributes[1] instanceof ConstantTermAttribute)) {
					let d:number = this.distanceBetweenIds((<ConstantTermAttribute>tmp.attributes[0]).value,
														   (<ConstantTermAttribute>tmp.attributes[1]).value);
					if (!superlative.sign[0] && d != null) d = -d;
					console.log("processSuperlatives: d = " + d + ", from: " + tmp);
					if (best_distance == null) {
						best = result;
						best_distance = d;
					} else if (d != null && 
							   best_distance < d) {
						best = result;
						best_distance = d;
					}
				} else {
					if (best == null) {
						best = result;
					}
				}
			}
			console.log("processSuperlatives: best = " + best);
			return [best];
		}
		return results;
	}


	/* This is used by the perception routines, to assign properties to the objects, that
	   can then be used to reason about them: */
	getBaseObjectProperties(obj:A4Object) : Term[]
	{
		let properties:Term[] = [];

		for(let p of obj.perceptionProperties) {
			let s:Sort = this.o.getSort(p);
			if (s.is_a(this.cache_sort_property_with_value)) {
				if (s.parents.length == 1 &&
					s.parents[0].is_a(this.cache_sort_property_with_value)) {
					properties.push(new Term(s.parents[0], [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
												 			new ConstantTermAttribute(s.name, s)]));
				} else {
					properties.push(new Term(s, [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
												 new ConstantTermAttribute(s.name, s)]));
				}
			} else {
				properties.push(new Term(s, [new ConstantTermAttribute(obj.ID, this.cache_sort_id)]));
			}
		}

		if (obj instanceof A4Container) {
			if ((<A4Container>obj).content.length == 0) {
				properties.push(new Term(this.o.getSort("empty"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id)]));
			} else {
				properties.push(new Term(this.o.getSort("full"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id)]));
			}
			if (obj instanceof A4ObstacleContainer) {
				if ((<A4ObstacleContainer>obj).closed) {
					properties.push(new Term(this.o.getSort("property.closed"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id)]));
				} else {
					properties.push(new Term(this.o.getSort("property.opened"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id)]));
				}
			}
		}

		if (obj instanceof A4Door) {
			if ((<A4Door>obj).closed) {
				properties.push(new Term(this.o.getSort("property.closed"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id)]));
			} else {
				properties.push(new Term(this.o.getSort("property.opened"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id)]));
			}
		}

		// object types that can potentially have a direction:
		if ((obj instanceof A4Character) ||
			(obj instanceof A4Vehicle) ||
			(obj instanceof A4Door) ||
			(obj instanceof A4Obstacle) ||
			(obj instanceof A4ObstacleContainer)) {
			let direction:number = obj.direction;
			if (direction == A4_DIRECTION_LEFT) {
				properties.push(new Term(this.o.getSort("facing-direction"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
																			  new ConstantTermAttribute(this.cache_sort_west.name, this.cache_sort_west)]));
			} else if (direction == A4_DIRECTION_UP) {
				properties.push(new Term(this.o.getSort("facing-direction"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
																			  new ConstantTermAttribute(this.cache_sort_north.name, this.cache_sort_north)]));
			} else if (direction == A4_DIRECTION_RIGHT) {
				properties.push(new Term(this.o.getSort("facing-direction"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
																			  new ConstantTermAttribute(this.cache_sort_east.name, this.cache_sort_east)]));
			} else if (direction == A4_DIRECTION_DOWN) {
				properties.push(new Term(this.o.getSort("facing-direction"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
																			  new ConstantTermAttribute(this.cache_sort_south.name, this.cache_sort_south)]));
			}
		}

		/*
		// the name is not directly visible, so, they should not know!
		if (obj instanceof A4Character) {
			properties.push(new Term(this.o.getSort("name"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
															  new ConstantTermAttribute(obj.name.toLowerCase(), this.cache_sort_symbol)]));
		}
	    */

		return properties;
	}


	replaceSpatialAdverbsInReferenceToAnotherSpeaker(term:Term, originalSpeaker:string)
	{
		if (term.functor.is_a(this.o.getSort("verb.come"))) {
			if (term.attributes.length == 1) {
				term.functor = this.o.getSort("verb.go-to");
				// add destination:
				let speakerObject:A4Object = this.game.findObjectByIDJustObject(originalSpeaker);
				if (speakerObject != null) {
					let location:AILocation = this.game.getAILocation(speakerObject);
					if (location != null) {
						term.attributes.push(new ConstantTermAttribute(location.id, this.cache_sort_id));
					}
				}
			}
		} 
		for(let i:number = 0;i<term.attributes.length;i++) {
			term.attributes[i] = this.replaceSpatialAdverbsInReferenceToAnotherSpeaker_internal(term.attributes[i], originalSpeaker);
		}
	}


	replaceSpatialAdverbsInReferenceToAnotherSpeaker_internal(ta:TermAttribute, originalSpeaker:string) : TermAttribute
	{
		if (ta instanceof TermTermAttribute) {
			this.replaceSpatialAdverbsInReferenceToAnotherSpeaker((<TermTermAttribute>ta).term, originalSpeaker);
		} else if (ta instanceof VariableTermAttribute) {
			if (ta.sort.is_a(this.o.getSort("space.here"))) {
				let speakerObject:A4Object = this.game.findObjectByIDJustObject(originalSpeaker);
				if (speakerObject != null) {
					let location:AILocation = this.game.getAILocation(speakerObject);
					if (location != null) {
						return new ConstantTermAttribute(location.id, this.cache_sort_id);
					}
				}
			}
		}
		return ta;
	}


	reactToPerformative(perf2:Term, speaker:TermAttribute, context:NLContext) : Term[]
	{
		if (this.respondToPerformatives) return super.reactToPerformative(perf2, speaker, context);
		return [];
	}


	reactToMoreResultsPerformative(perf:Term, speaker:TermAttribute, context:NLContext)
	{
    	app.achievement_nlp_asked_for_more = true;
    	app.trigger_achievement_complete_alert();
    	super.reactToMoreResultsPerformative(perf, speaker, context);
    }


	reactiveBehaviorUpdateToParseError(speakerID:string)
	{
    	let context:NLContext = this.contextForSpeakerWithoutCreatingANewOne(speakerID);
    	if (context != null) {
    		if (this.talkingToUs(context, speakerID, null)) {

		    	app.achievement_nlp_parse_error = true;
		    	app.trigger_achievement_complete_alert();

		    	super.reactiveBehaviorUpdateToParseError(speakerID);
		    }
		}
	}


	canSatisfyActionRequest(ir:IntentionRecord) : number
	{
		let actionRequest:Term = ir.action;
		if (this.game.gameScript.actionRequestHandleByScript(actionRequest)) return ACTION_REQUEST_WILL_BE_HANDLED_EXTERNALLY;
		return super.canSatisfyActionRequest(ir);
	}


	allowPlayerIntoEveryWhere()
	{
		for(let location of this.locationsWherePlayerIsNotPermitted) {
			// remove the long term permission term and add a negated one:
			this.longTermMemory.removeSentence(Sentence.fromString("~permitted-in('david'[#id], '"+location+"'[#id])", this.o));
			this.longTermMemory.addSentence(Sentence.fromString("permitted-in('david'[#id], '"+location+"'[#id])", this.o), BACKGROUND_PROVENANCE, 1, this.time_in_seconds);
		}
		this.locationsWherePlayerIsNotPermitted = [];
		this.doorsPlayerIsNotPermittedToOpen = [];
	}


	allowPlayerInto(location:string, door:string)
	{
		let idx:number = this.locationsWherePlayerIsNotPermitted.indexOf(location);
		if (idx != -1) {
			this.locationsWherePlayerIsNotPermitted.splice(idx,1);

			// remove the long term permission term and add a negated one:
			this.longTermMemory.removeSentence(Sentence.fromString("~permitted-in('david'[#id], '"+location+"'[#id])", this.o));
			this.longTermMemory.addSentence(Sentence.fromString("permitted-in('david'[#id], '"+location+"'[#id])", this.o), BACKGROUND_PROVENANCE, 1, this.time_in_seconds);
		}
		idx = this.doorsPlayerIsNotPermittedToOpen.indexOf(door);
		if (idx != -1) this.doorsPlayerIsNotPermittedToOpen.splice(idx,1);
	}


	pathBetweenLocations(loc1:AILocation, loc2:AILocation) : AILocation[]
	{
		let open:number[] = [];
		let open_parents:number[] = [];
		let closed:number[] = [];
		let closed_parents:number[] = [];
		let loc1_idx:number = this.game.locations.indexOf(loc1);
		console.log("pathBetweenLocations: loc1_idx = " + loc1_idx);
		if (loc1_idx == -1) return null;
		let loc2_idx:number = this.game.locations.indexOf(loc2);
		console.log("pathBetweenLocations: loc2_idx = " + loc2_idx);
		if (loc2_idx == -1) return null;
		open.push(loc1_idx);
		open_parents.push(-1);
		while(open.length > 0) {
			let current:number = open[0];
			let parent:number = open_parents[0];
			open.splice(0,1);
			open_parents.splice(0,1);
			closed.push(current);
			closed_parents.push(parent);

//			console.log("open: " + open.length + ", closed: " + closed.length + ", current = " + this.game.locations[current].id);

			if (current == loc2_idx || this.game.location_in[current][loc2_idx]) {
				// we found the goal!
				let path:AILocation[] = [];
				while(current != -1) {
					path.unshift(this.game.locations[current]);
					if (parent == -1) break;
					current = closed[parent];
					parent = closed_parents[parent];
				}
				return path;
			} else {
				for(let next:number = 0;next<this.game.locations.length;next++) {
					if (this.game.location_connects[current][next]) {
						if (closed.indexOf(next) == -1 &&
							open.indexOf(next) == -1) {
							open.push(next);
							open_parents.push(closed.length-1);
						}
					}
				}
			}
		}

		return null;
	}


	pathToGetOutOf(loc1:AILocation, loc2:AILocation, outside_flag:boolean) : AILocation[]
	{
		let open:number[] = [];
		let open_parents:number[] = [];
		let closed:number[] = [];
		let closed_parents:number[] = [];
		let loc1_idx:number = this.game.locations.indexOf(loc1);
		console.log("pathToGetOutOf: loc1_idx = " + loc1_idx);
		if (loc1_idx == -1) return null;
		let loc2_idx:number = this.game.locations.indexOf(loc2);
		console.log("pathToGetOutOf: loc2_idx = " + loc2_idx);
		if (loc2_idx == -1) return null;
		open.push(loc1_idx);
		open_parents.push(-1);
		while(open.length > 0) {
			let current:number = open[0];
			let parent:number = open_parents[0];
			open.splice(0,1);
			open_parents.splice(0,1);
			closed.push(current);
			closed_parents.push(parent);

//			console.log("open: " + open.length + ", closed: " + closed.length + ", current = " + this.game.locations[current].id);

			if (current != loc2_idx && 
				((outside_flag && this.game.location_in[loc2_idx][current]) ||
				 (!outside_flag && !this.game.location_in[current][loc2_idx]))) {
				// we found the goal!
				let path:AILocation[] = [];
				while(current != -1) {
					path.unshift(this.game.locations[current]);
					if (parent == -1) break;
					current = closed[parent];
					parent = closed_parents[parent];
				}
				return path;
			} else {
				for(let next:number = 0;next<this.game.locations.length;next++) {
					if (this.game.location_connects[current][next]) {
						if (closed.indexOf(next) == -1 &&
							open.indexOf(next) == -1) {
							open.push(next);
							open_parents.push(closed.length-1);
						}
					}
				}
			}
		}

		return null;
	}	


	locationOutsideOf(loc:AILocation) : AILocation
	{
		let loc_idx:number = this.game.locations.indexOf(loc);
		for(let loc2_idx:number = 0;loc2_idx < this.game.locations.length; loc2_idx++) {
			if (this.game.location_connects[loc_idx][loc2_idx] &&
				!this.game.location_in[loc2_idx][loc_idx]) {
				return this.game.locations[loc2_idx];
			}
		}
		return null;
	}


	executeIntention(ir:IntentionRecord) : boolean
	{
		let intention:Term = ir.action;
		for(let ih of this.intentionHandlers) {
			if (ih.canHandle(intention, this)) {
				if (ih instanceof AnswerPredicate_IntentionAction) {
    				app.achievement_nlp_all_types_of_questions[0] = true;
	    			app.trigger_achievement_complete_alert();
				} else if (ih instanceof AnswerWhere_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[1] = true;
			    	app.trigger_achievement_complete_alert();
				} else if (ih instanceof AnswerWhoIs_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[2] = true;
			    	app.trigger_achievement_complete_alert();
				} else if (ih instanceof AnswerWhatIs_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[3] = true;
			    	app.trigger_achievement_complete_alert();
				} else if (ih instanceof AnswerQuery_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[4] = true;
    				app.trigger_achievement_complete_alert();
				} else if (ih instanceof AnswerHowMany_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[5] = true;
			    	app.trigger_achievement_complete_alert();
				} else if (ih instanceof AnswerWhen_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[6] = true;
			    	app.trigger_achievement_complete_alert();
				} else if (ih instanceof AnswerWhy_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[7] = true;
			    	app.trigger_achievement_complete_alert();

					let intention:Term = ir.action;
					if (intention.attributes.length == 2) {
						if (intention.attributes[1] instanceof ConstantTermAttribute) {
							var targetID:string = (<ConstantTermAttribute>intention.attributes[1]).value;
							var context:NLContext = this.contextForSpeakerWithoutCreatingANewOne(targetID);
							if (context != null) {
								var lastPerf:NLContextPerformative = context.lastPerformativeBy(this.selfID);
								if (lastPerf.cause != null) {
									if (lastPerf.cause.causesComeFromInference) {
										app.achievement_nlp_resolution_explanation = true;
										app.trigger_achievement_complete_alert();
									}
								}
							}
						}
					}
				} else if (ih instanceof A4AnswerHow_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[8] = true;
			    	app.trigger_achievement_complete_alert();
				} else if (ih instanceof AnswerDefine_IntentionAction) {
			    	app.achievement_nlp_all_types_of_questions[9] = true;
    				app.trigger_achievement_complete_alert();

					let intention:Term = ir.action;
					if (intention.attributes.length == 2 &&
						(intention.attributes[0] instanceof ConstantTermAttribute) &&
						((intention.attributes[1] instanceof VariableTermAttribute) ||
						 (intention.attributes[1] instanceof ConstantTermAttribute)) &&
						(<ConstantTermAttribute>(intention.attributes[0])).value == this.selfID) {
						if (intention.attributes[1].sort.name == "three-laws-of-robotics") {
							app.achievement_secret_3_laws_of_robotics = true;
							app.trigger_achievement_complete_alert();
						}
					}
				}
				return ih.execute(ir, this);
			}
		}

		return false;
	}	


	restoreFromXML(xml:Element)
	{
		super.restoreFromXML(xml);

		let xml_tmp:Element = getFirstElementChildByTag(xml, "respondToPerformatives");
		if (xml_tmp != null) {
			this.respondToPerformatives = xml_tmp.getAttribute("value") == "true";
		}
		xml_tmp = getFirstElementChildByTag(xml, "locationsWherePlayerIsNotPermitted");
		if (xml_tmp != null) {
			this.locationsWherePlayerIsNotPermitted = xml_tmp.getAttribute("value").split(",");
		}
		xml_tmp = getFirstElementChildByTag(xml, "doorsPlayerIsNotPermittedToOpen");
		if (xml_tmp != null) {
			this.doorsPlayerIsNotPermittedToOpen = xml_tmp.getAttribute("value").split(",");
		}
	    this.visionActive = true;
	    xml_tmp = getFirstElementChildByTag(xml, "visionActive");
	    if (xml_tmp != null && xml_tmp.getAttribute("value") == "false") this.visionActive = false;
	}


	savePropertiesToXML() : string
	{
		let str:string = super.savePropertiesToXML();

		str += "<respondToPerformatives value=\""+this.respondToPerformatives+"\"/>\n";
		str += "<locationsWherePlayerIsNotPermitted value=\""+this.locationsWherePlayerIsNotPermitted+"\"/>\n";
		str += "<doorsPlayerIsNotPermittedToOpen value=\""+this.doorsPlayerIsNotPermittedToOpen+"\"/>";
		str += "<visionActive value=\""+this.visionActive+"\"/>\n";

		return str;
	}


	generateAILocationDOTGraph() : string
	{
		let str:string = "digraph locations {\n";
		str+="graph[rankdir=LR];\n";

		for(let i:number = 0;i<this.game.locations.length;i++) {
			if (this.game.locations[i].name == null) {
				str += "s" + i + "[shape=box label=\""+this.game.locations[i].sort.name+"\"];\n";
			} else {
				str += "s" + i + "[shape=box label=\""+this.game.locations[i].name+"\"];\n";
			}
		}
		for(let i:number = 0;i<this.game.locations.length;i++) {
			for(let j:number = 0;j<this.game.locations.length;j++) {
				if (this.game.location_connects[i][j]) {
					str += "s" + i + " -> s" + j + " [label=\"connects\"];\n";
				}
			}
		}

		str += "}\n";
		return str;		
	}


	game:A4Game = null;
	
	alreadyProcessedPBRs:PerceptionBufferRecord[] = [];	// this is a small cache, so that we do not parse the same text
														// more than once to save CPU resources.

	// If the player requests to go here, or instructs qwerty/shrdlu to go ther, she will not be allowed:
	locationsWherePlayerIsNotPermitted:string[] = [];
	doorsPlayerIsNotPermittedToOpen:string[] = [];

	// variables so that the game script can control the AI:
	respondToPerformatives:boolean = false;	

	visionActive:boolean = true;	// if this is "false", the robot is blind

	cache_sort_bright:Sort = null;
	cache_sort_dark:Sort = null;
	cache_sort_west:Sort = null;
	cache_sort_north:Sort = null;
	cache_sort_east:Sort = null;
	cache_sort_south:Sort = null;
	cache_sort_powered_state:Sort = null;
	cache_sort_powered_on:Sort = null;
	cache_sort_powered_off:Sort = null;
	cache_sort_space_iside_of:Sort = null;
}
