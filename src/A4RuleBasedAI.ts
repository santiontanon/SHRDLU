
class A4RuleBasedAI extends RuleBasedAI {
	constructor(o:Ontology, nlp:NLParser, game:A4Game, pf:number, pfoffset:number, qpt:number)
	{
		super(o, nlp, pf, pfoffset, qpt);
		this.game = game;

		this.intentionHandlers.push(new Call_IntentionAction());
		this.intentionHandlers.push(new Help_IntentionAction());
    	this.intentionHandlers.push(new Memorize_IntentionAction());
	    this.intentionHandlers.push(new AnswerPredicate_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhere_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhoIs_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhatIs_IntentionAction());
	    this.intentionHandlers.push(new AnswerQuery_IntentionAction());
	    this.intentionHandlers.push(new AnswerHowMany_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhen_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhy_IntentionAction());
	    this.intentionHandlers.push(new AnswerHow_IntentionAction());
	    this.intentionHandlers.push(new AnswerDefine_IntentionAction());
	    this.intentionHandlers.push(new AnswerHearSee_IntentionAction());

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
		this.locationsWherePlayerIsNotPermitted.push("location-as27");
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
		this.doorsPlayerIsNotPermittedToOpen.push("SCIENCE");
		this.doorsPlayerIsNotPermittedToOpen.push("MAINTENANCE");
		this.doorsPlayerIsNotPermittedToOpen.push("GARAGE");
		this.doorsPlayerIsNotPermittedToOpen.push("COMMAND");
	}


	precalculateLocationKnowledge(game:A4Game, o:Ontology)
	{
		// console.log("RuleBasedAI.precalculateLocationKnowledge...");


		for(let location of game.locations) {
			var str:string = location.sort.name + "('"+location.id+"'[#id])";
			var term:Term = Term.fromString(str, o);
			//console.log(term.toString());
			this.addLongTermTerm(term, BACKGROUND_PROVENANCE);

			if (location.name != null) {
				var str:string =  "name('"+location.id+"'[#id], '"+location.name+"'[symbol])";
				var term:Term = Term.fromString(str, o);
				//console.log(term.toString());
				this.addLongTermTerm(term, BACKGROUND_PROVENANCE);

				if (location.name.indexOf(' ') != -1) {
					// it's a multitoken! we should add it:
					this.naturalLanguageParser.posParser.addMultiToken(location.name);
				}
				this.naturalLanguageParser.posParser.addTokenPOS(new PartOfSpeech(location.name, location.name, Term.fromString("proper-noun('"+location.name+"'[symbol], [singular])", o), 1.0));
			}
		}

		for(let idx_l1:number = 0;idx_l1<game.locations.length;idx_l1++) {
			var l1:AILocation = game.locations[idx_l1];
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				var l2:AILocation = game.locations[idx_l2];
				if (l1 == l2) continue;
				if (game.location_in[idx_l1][idx_l2]) {
					var somethignInBetween:boolean = false;
					for(let idx_l3:number = 0;idx_l3<game.locations.length;idx_l3++) {
						if (idx_l3 != idx_l1 && idx_l3 != idx_l2 &&
							game.location_in[idx_l1][idx_l3] &&
							game.location_in[idx_l3][idx_l2]) {
							somethignInBetween = true;
							break;
						}
					}
					if (!somethignInBetween) {
						var term:Term = Term.fromString("space.at('"+l1.id+"'[#id], '"+l2.id+"'[#id])", o);
						//console.log(term.toString());
						this.addLongTermTerm(term, BACKGROUND_PROVENANCE);
					}
				} else {
					var s:Sentence = Sentence.fromString("~space.at('"+l1.id+"'[#id], '"+l2.id+"'[#id])", o);
					//console.log(term.toString());
					this.addLongTermRuleNow(s, BACKGROUND_PROVENANCE);
				}
			}
		}

		for(let idx_l1:number = 0;idx_l1<game.locations.length;idx_l1++) {
//			console.log("idx: " + idx_l1);
			var l1:AILocation = game.locations[idx_l1];
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				var l2:AILocation = game.locations[idx_l2];
				if (l1 == l2) continue;
				if (game.location_in[idx_l1][idx_l2] ||
					game.location_in[idx_l2][idx_l1]) continue;
				if (game.location_connects[idx_l1][idx_l2]) {
					var str:string = "space.connects('"+l1.id+"'["+l1.sort.name+"], '"+l2.id+"'["+l2.sort.name+"])";
					var term:Term = Term.fromString(str, o);
					//console.log(term.toString());
					this.addLongTermTerm(term, BACKGROUND_PROVENANCE);
				}
			}
		}
//		console.log("RuleBasedAI.precalculateLocationKnowledge... 4");
	}


	perception(x0:number, y0:number, x1:number, y1:number, location:AILocation, map:A4Map, visibilityRegion:number, occupancyMap:boolean[])
	{
		var l:A4Object[] = map.getAllObjects(x0, y0, (x1-x0), (y1-y0));

//		console.log("location: " + location.name + " l.length = " + l.length + " l.sort = " + location.sort);

		this.addTermToPerception(new Term(location.sort, [new ConstantTermAttribute(location.id, this.cache_sort_id)]));

		for(let o of l) {
			var tile_ox:number = Math.floor(o.x/map.tileWidth);
			var tile_oy:number = Math.floor((o.y+o.tallness)/map.tileHeight);
			var offset:number = tile_ox + tile_oy*map.width;
			// Doors are usually in between visibility regions, and thus, we just perceive them all, and that's it!
			if (map.visibilityRegions[offset] == visibilityRegion ||
				o instanceof A4Door) {
				var locationID:string = location.id;
				if (!occupancyMap[offset]) {
					// it's not in "location":
					var l2:AILocation = this.game.getAILocation(o);
					if (l2!=null) locationID = l2.id;
				}

				// perceived an object!
				var term1:Term = new Term(o.sort, [new ConstantTermAttribute(o.ID, this.cache_sort_id)]);
				var term2:Term = new Term(this.cache_sort_space_at, 
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
						var term3:Term = new Term(o2.sort, [new ConstantTermAttribute(o2.ID, this.cache_sort_id)]);
						var term4:Term = new Term(this.cache_sort_space_at, 
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
						var term3:Term = new Term(o2.sort, [new ConstantTermAttribute(o2.ID, this.cache_sort_id)]);
						var term4:Term = new Term(this.cache_sort_space_at, 
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
				}
			}
		}

		// actions:
        for(let pbr of map.perceptionBuffer) {
            if (pbr.x0<x1 && pbr.x1>x0 &&
                pbr.y0<y1 && pbr.y1>y0) {
				var tile_ox:number = Math.floor(pbr.x0/map.tileWidth);
				var tile_oy:number = Math.floor(pbr.y0/map.tileHeight);
				var offset:number = tile_ox + tile_oy*map.width;

				if (map.visibilityRegions[offset] == visibilityRegion &&
					this.alreadyProcessedPBRs.indexOf(pbr)==-1) {

					this.perceivePBR(pbr);
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
		var timeTerm:Term = new Term(this.cache_sort_time_current,
									 [new ConstantTermAttribute(this.time_in_seconds, this.o.getSort("number"))]);
		this.addTermToPerception(timeTerm);
	}


	perceivePBR(pbr:PerceptionBufferRecord)
	{
		if (this.alreadyProcessedPBRs.length >= 50) this.alreadyProcessedPBRs.slice(0,49);
		this.alreadyProcessedPBRs.push(pbr);

        // perceived an action!
    	var actionTerms:Term[] = [Term.fromString("action."+pbr.action + "("+
    										      "'"+pbr.time+"'[number],"+
    											  "'"+pbr.subjectID+"'[#id])", this.o)];
    	if (pbr.directObjectID != null) {
    		for(let actionTerm of actionTerms) {
    			actionTerm.addAttribute(new ConstantTermAttribute(pbr.directObjectID, this.o.getSort("#id")));
    		}
    	} else if (pbr.directObjectSymbol != null &&
    		       pbr.subjectID != this.selfID) {
    		// assume that this is a "talk" action:
    		var context:NLContext = null;
    		for(let actionTerm of actionTerms) {
    			actionTerm.addAttribute(new ConstantTermAttribute(pbr.directObjectSymbol, this.o.getSort("#id")));
    			// update context perception:
    			context = this.updateContext((<ConstantTermAttribute>actionTerm.attributes[1]).value);
    		}

			// parse the text:
		    var parses:NLParseRecord[] = this.naturalLanguageParser.parse(pbr.directObjectSymbol, this.cache_sort_performative, context, this);
		    if (parses != null && parses.length > 0) {
		    	var HPparse:NLParseRecord = this.naturalLanguageParser.chooseHighestPriorityParse(parses);
		    	console.log("RuleBasedAI("+this.selfID+"): parsed sentence '" + pbr.directObjectSymbol + "'\n  " + HPparse.result);
		    	// the parse might contain several performatives combined with a "#list" construct
				var parsePerformatives:TermAttribute[] = NLParser.elementsInList(HPparse.result, "#list");
				var actionTerms2:Term[] = [];
        		for(let actionTerm of actionTerms) {
	        		for(let parsePerformative of parsePerformatives) {
	        			var tmp:Term = actionTerm.clone([]);
				    	tmp.addAttribute(parsePerformative);
				    	actionTerms2.push(tmp);
	        		}
        		}
        		actionTerms = actionTerms2;
		    } else {
		    	console.warn("A4RuleBasedAI: cannot parse sentence: " + pbr.directObjectSymbol);
		    	if (this.naturalLanguageParser.error_semantic) console.warn("    semantic error!");
		    	if (this.naturalLanguageParser.error_deref.length > 0) console.warn("    could not deref expressions: " + this.naturalLanguageParser.error_deref);
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


	updateContext(speaker:string) : NLContext
	{
		var context:NLContext = this.contextForSpeaker(speaker);
		var speakerObject:A4Object = this.game.findObjectByIDJustObject(speaker);
		context.shortTermMemory = [];

//		console.log("updateContext: speaker: " + speakerObject)
		// add from perception:
		for(let te of this.shortTermMemory.plainTermList) {
			var t:Term = te.term;
			if (t.functor.is_a(this.cache_sort_object) ||
				t.functor.is_a(this.cache_sort_space_location) ||
				t.functor.is_a(this.cache_sort_property) ||
				t.functor.is_a(this.cache_sort_relation)) {

//				console.log("updateContext: t: " + t)

				if (t.attributes[0] instanceof ConstantTermAttribute) {
					var id:string = (<ConstantTermAttribute>t.attributes[0]).value;
					// calculate the distance tot he speaker:
					var distanceFromSpeaker:number = null;
					if (speakerObject!=null) {
						if ((t.functor.is_a(this.cache_sort_object) &&
							 te.provenance == PERCEPTION_PROVENANCE) ||
							t.functor.name == "space.at") {
							let objects:A4Object[] = this.game.findObjectByID(id);
							let object:A4Object = null;
							if (objects != null && objects.length>0) {
								object = objects[0];	// we get the top-most container object to calculate the distance
							}
	//						console.log("updateContext: object: " + object)
							if (object != null) {
								if (object.map == speakerObject.map) {
									var x1:number = object.x + object.getPixelWidth()/2;
									var y1:number = object.y + object.tallness + (object.getPixelHeight()-object.tallness)/2;
									var x2:number = speakerObject.x + speakerObject.getPixelWidth()/2;
									var y2:number = speakerObject.y + speakerObject.tallness + (speakerObject.getPixelHeight()-speakerObject.tallness)/2;
									distanceFromSpeaker = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
	//								console.log(speakerObject.name + " from " + object.name + ": " + distanceFromSpeaker);
								}
							}
						} else if (t.functor.is_a(this.cache_sort_space_location)) {
							var location:AILocation = this.game.getAILocationByID(id)
							if (location != null) {
								var mapIdx:number = location.maps.indexOf(speakerObject.map);
//								console.log("updateContext of a location: " + location.name + " (" + location.id + ", " + mapIdx + ")");
								if (mapIdx != -1) {
									distanceFromSpeaker = location.distanceFromObject(speakerObject, mapIdx);
								}
//								console.log("updateContext of a location: distanceFromSpeaker = " + distanceFromSpeaker);
							}
						}
					}

					var e:NLContextEntity = context.newContextEntity(<ConstantTermAttribute>t.attributes[0], null, distanceFromSpeaker, this.o);
					if (context.shortTermMemory.indexOf(e) == -1) context.shortTermMemory.push(e);
				}
			}			
		}

		context.sortEntities();

		return context;
	}


	resolveThere(otherCharacterID:string, otherCharacterLocation:AILocation) : AILocation
	{
		var context:NLContext = this.contextForSpeaker(otherCharacterID);
		if (context == null) return null;

		// We need to see what "there" refers to:
		// 1) if there is a place mentioned in the previous performative, then that's it
//		var perf:NLContextPerformative = context.lastPerformativeBy(otherCharacterID);
		var perf:NLContextPerformative = context.lastPerformativeBy(this.selfID);
		if (perf != null) {
			var IDs:ConstantTermAttribute[] = [];
			for(let i:number = 0;i<perf.performative.attributes.length;i++) {
				if (perf.performative.attributes[i] instanceof ConstantTermAttribute) {
					IDs.push(<ConstantTermAttribute>(perf.performative.attributes[0]));
				} else if (perf.performative.attributes[i] instanceof TermTermAttribute) {
					context.searchForIDsInClause((<TermTermAttribute>perf.performative.attributes[i]).term, IDs, context.ai.o);
				}
			}
			var locations:AILocation[] = [];
			for(let ID of IDs) {
				var loc:AILocation = this.game.getAILocationByID((<ConstantTermAttribute>ID).value);
				if (loc != null) locations.push(loc);
			}
			if (locations.length == 1) return locations[0];
		}

		// 2) otherwise, it refers to the location of the listener, unless it's the same as that of the speaker
		var me:A4Object = this.game.findObjectByIDJustObject(this.selfID);
		if (me != null) {
			var myLoc:AILocation = this.game.getAILocation(me);
			if (myLoc != otherCharacterLocation) return myLoc;
		}

		return null;
	}


	canSee(characterID:string)
	{
		// if the character is in the perception buffer:
		var objectSort:Sort = this.o.getSort("object");
		for(let tc of this.shortTermMemory.plainTermList) {
			var t:Term = tc.term;
//		for(let t of this.perceptionBuffer) {
			if (t.functor.is_a(objectSort) && t.attributes.length == 1 &&
				t.attributes[0] instanceof ConstantTermAttribute &&
				(<ConstantTermAttribute>t.attributes[0]).value == "" + characterID) {
				return true;
			}
		}

		return false;
	}


	// reference object is used in case o2 is not a directional object, to determine what is "behind" and "in front"
	checkSpatialRelation(relation:Sort, o1ID:string, o2ID:string, referenceObject:string) : boolean
	{
		if (relation.name == "space.at" ||
			relation.name == "space.outside.of") {
			var loc2:AILocation = this.game.getAILocationByID(o2ID);	// see if o2 is a location
			if (loc2 == null) return null;
			var o1:A4Object = this.game.findObjectByIDJustObject(o1ID);	// see if o1 is an object
			var loc1:AILocation = null;
			if (o1 == null) {
				loc1 = this.game.getAILocationByID(o1ID);	// if it's not an object, maybe it's a location
				if (loc1 == null) return null;
			} else {
				loc1 = this.game.getAILocation(o1);
			}
			if (loc1 == null) return null;
			if (loc1 == loc2) {
				if (relation.name == "space.at") return true;
				return false;
			}
			if (relation.name == "space.at") {
				return this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)];
			} else {
				return !this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)] &&
					   !this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)];
			}
		}

		if (relation.name == "space.north.of" ||
			relation.name == "space.east.of" ||
			relation.name == "space.west.of" ||
			relation.name == "space.south.of" ||
			relation.name == "space.northeast.of" ||
			relation.name == "space.northwest.of" ||
			relation.name == "space.southeast.of" ||
			relation.name == "space.southwest.of" ||
			relation.name == "space.in.front.of" ||
			relation.name == "space.behind") {
			var o1:A4Object = this.game.findObjectByIDJustObject(o1ID);
			var o2:A4Object = this.game.findObjectByIDJustObject(o2ID);
			var inFrontDirection:number = A4_DIRECTION_NONE;
			if (o1 != null && o2 != null) {
				if (o1.map != o2.map) return null;
				var x1:number = Math.floor(o1.x + o1.getPixelWidth()/2);
				var y1:number = Math.floor(o1.y+o1.tallness + (o1.getPixelHeight()-o1.tallness)/2);
				var x2:number = Math.floor(o2.x + o2.getPixelWidth()/2);
				var y2:number = Math.floor(o2.y+o2.tallness + (o2.getPixelHeight()-o2.tallness)/2);
				var dx:number = x1-x2;
				var dy:number = y1-y2;
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
						var angle:number = Math.atan2(o_dy,o_dx);
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
						var loc1:AILocation = this.game.getAILocationByID(o1ID);
						var loc2:AILocation = this.game.getAILocationByID(o2ID);
						if (loc1 == null || loc2 == null) return null;
						// relation between two locations:
						if (this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)] ||
							this.game.location_in[this.game.locations.indexOf(loc2)][this.game.locations.indexOf(loc1)]) return false;
						for(let map of loc1.maps) {
							if (loc2.maps.indexOf(map) != -1) {
								var x1_y1:number[] = loc1.centerCoordinatesInMap(map);
								var x2_y2:number[] = loc2.centerCoordinatesInMap(map);
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
										var angle:number = Math.atan2(o_dy,o_dx);
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
						var loc1:AILocation = this.game.getAILocationByID(o1ID);
						if (loc1 != null) {
							var loc2:AILocation = this.game.getAILocation(o2);
							if (loc2 != null) {
								if (loc2 == loc1) return false;
								if (this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)] ||
									this.game.location_in[this.game.locations.indexOf(loc2)][this.game.locations.indexOf(loc1)]) return false;
								var x1_y1:number[] = loc1.centerCoordinatesInMap(o2.map);
								if (x1_y1 == null) return;
								var x2:number = Math.floor(o2.x + o2.getPixelWidth()/2);
								var y2:number = Math.floor(o2.y+o2.tallness + (o2.getPixelHeight()-o2.tallness)/2);

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
										var angle:number = Math.atan2(o_dy,o_dx);
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
					var loc2:AILocation = this.game.getAILocationByID(o2ID);
					if (loc2 != null) {
						var loc1:AILocation = this.game.getAILocation(o1);
						if (loc1 != null) {
							if (loc2 == loc1) return false;
							if (this.game.location_in[this.game.locations.indexOf(loc1)][this.game.locations.indexOf(loc2)] ||
								this.game.location_in[this.game.locations.indexOf(loc2)][this.game.locations.indexOf(loc1)]) return false;
							var x2_y2:number[] = loc2.centerCoordinatesInMap(o1.map);
							if (x2_y2 == null) return;
							var x1:number = Math.floor(o1.x + o1.getPixelWidth()/2);
							var y1:number = Math.floor(o1.y+o1.tallness + (o1.getPixelHeight()-o1.tallness)/2);

							// find the reference direction:
							let or:A4Object = this.game.findObjectByIDJustObject(referenceObject);
							if (or == null || !(or instanceof A4Character)) {
								// in this case, we just take the reference of the player:
								or = this.game.currentPlayer;
							}
							if (or.map == o1.map) {
								let o_dx:number = Math.floor(or.x + or.getPixelWidth()/2) - x2_y2[0];
								let o_dy:number = Math.floor(or.y+or.tallness + (or.getPixelHeight()-or.tallness)/2) - x2_y2[0];
								var angle:number = Math.atan2(o_dy,o_dx);
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
			var angle:number = Math.atan2(dy,dx);

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


	/*
	Calculates spatial relations (e.g., "space.west.of") of o1 with respect to o2. 
	E.g.: if "o1 is to the west of o2", this will return [this.o.getSort("space.west.of")]
	*/
	spatialRelations(o1ID:string, o2ID:string) : Sort[]
	{
		var relations:Sort[] = super.spatialRelations(o1ID, o2ID);
		var o1:A4Object = this.game.findObjectByIDJustObject(o1ID);
		var o2:A4Object = this.game.findObjectByIDJustObject(o2ID);
		if (o1 == null || o2 == null) return relations;
		if (o1.map != o2.map) return relations;
		var x1:number = Math.floor(o1.x + o1.getPixelWidth()/2);
		var y1:number = Math.floor(o1.y+o1.tallness + (o1.getPixelHeight()-o1.tallness)/2);
		var x2:number = Math.floor(o2.x + o2.getPixelWidth()/2);
		var y2:number = Math.floor(o2.y+o2.tallness + (o2.getPixelHeight()-o2.tallness)/2);
		var dx:number = x1-x2;
		var dy:number = y1-y2;

		if (o2.x >= o1.x && o2.x + o2.getPixelWidth() <= o1.x+o1.getPixelWidth()) dx = 0;
		if (o2.y + o2.tallness >= o1.y + o1.tallness && o2.y + o2.getPixelHeight() <= o1.y+o1.getPixelHeight()) dy = 0;

//		console.log("dx: " + dx + ", dy: " + dy);
		if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
			var angle:number = Math.atan2(dy,dx);
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
		var relations:Sort[] = [];

		var tmp:[number,number] = l1.centerCoordinatesInMap(o2.map);
		if (tmp == null) return relations;
		var x1:number = tmp[0];
		var y1:number = tmp[1];

		var x2:number = Math.floor(o2.x + o2.getPixelWidth()/2);
		var y2:number = Math.floor(o2.y+o2.tallness + (o2.getPixelHeight()-o2.tallness)/2);
		var dx:number = x1-x2;
		var dy:number = y1-y2;

		if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
			var angle:number = Math.atan2(dy,dx);
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
		var relations:Sort[] = [];

		if (this.game.location_in[this.game.locations.indexOf(l1)]
							     [this.game.locations.indexOf(l2)]) return relations;
		if (this.game.location_in[this.game.locations.indexOf(l2)]
							     [this.game.locations.indexOf(l1)]) return relations;
		var map:A4Map = null;
		for(let map2 of l1.maps) {
			if (l2.maps.indexOf(map2) != -1) {
				map = map2;
				break;
			}
		}
		if (map == null) return relations;


		var tmp:[number,number] = l1.centerCoordinatesInMap(map);
		if (tmp == null) return relations;
		var x1:number = tmp[0];
		var y1:number = tmp[1];

		var tmp2:[number,number] = l2.centerCoordinatesInMap(map);
		if (tmp2 == null) return relations;
		var x2:number = tmp2[0];
		var y2:number = tmp2[1];

		var dx:number = x1-x2;
		var dy:number = y1-y2;

		if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
			var angle:number = Math.atan2(dy,dx);
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


	/* This is used by the perception routines, to assign properties to the objects, that
	   can then be used to reason about them: */
	getBaseObjectProperties(obj:A4Object) : Term[]
	{
		var properties:Term[] = [];

		for(let p of obj.perceptionProperties) {
			var s:Sort = this.o.getSort(p);
			if (s.is_a(this.cache_sort_property_with_value)) {
				properties.push(new Term(s, [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
											 new ConstantTermAttribute(s.name, s)]));
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

		/*
		// the name is not directly visible, so, they should not know!
		if (obj instanceof A4Character) {
			properties.push(new Term(this.o.getSort("name"), [new ConstantTermAttribute(obj.ID, this.cache_sort_id),
															  new ConstantTermAttribute(obj.name.toLowerCase(), this.cache_sort_symbol)]));
		}
	    */

		return properties;
	}


	replaceSpatialAdverbsInReferenceToAnotherSpeaker(performative:Term, originalSpeaker:string)
	{
		for(let i:number = 0;i<performative.attributes.length;i++) {
			performative.attributes[i] = this.replaceSpatialAdverbsInReferenceToAnotherSpeaker_internal(performative.attributes[i], originalSpeaker);
		}
	}


	replaceSpatialAdverbsInReferenceToAnotherSpeaker_internal(ta:TermAttribute, originalSpeaker:string) : TermAttribute
	{
		if (ta instanceof TermTermAttribute) {
			this.replaceSpatialAdverbsInReferenceToAnotherSpeaker((<TermTermAttribute>ta).term, originalSpeaker);
		} else if (ta instanceof VariableTermAttribute) {
			if (ta.sort.is_a(this.o.getSort("space.here"))) {
				var speakerObject:A4Object = this.game.findObjectByIDJustObject(originalSpeaker);
				if (speakerObject != null) {
					var location:AILocation = this.game.getAILocation(speakerObject);
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


	allowPlayerInto(location:string, door:string)
	{
		var idx:number = this.locationsWherePlayerIsNotPermitted.indexOf(location);
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
		var open:number[] = [];
		var open_parents:number[] = [];
		var closed:number[] = [];
		var closed_parents:number[] = [];
		var loc1_idx:number = this.game.locations.indexOf(loc1);
		console.log("pathBetweenLocations: loc1_idx = " + loc1_idx);
		if (loc1_idx == -1) return null;
		var loc2_idx:number = this.game.locations.indexOf(loc2);
		console.log("pathBetweenLocations: loc2_idx = " + loc2_idx);
		if (loc2_idx == -1) return null;
		open.push(loc1_idx);
		open_parents.push(-1);
		while(open.length > 0) {
			var current:number = open[0];
			var parent:number = open_parents[0];
			open.splice(0,1);
			open_parents.splice(0,1);
			closed.push(current);
			closed_parents.push(parent);

//			console.log("open: " + open.length + ", closed: " + closed.length + ", current = " + this.game.locations[current].id);

			if (current == loc2_idx || this.game.location_in[current][loc2_idx]) {
				// we found the goal!
				var path:AILocation[] = [];
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
		var open:number[] = [];
		var open_parents:number[] = [];
		var closed:number[] = [];
		var closed_parents:number[] = [];
		var loc1_idx:number = this.game.locations.indexOf(loc1);
		console.log("pathToGetOutOf: loc1_idx = " + loc1_idx);
		if (loc1_idx == -1) return null;
		var loc2_idx:number = this.game.locations.indexOf(loc2);
		console.log("pathToGetOutOf: loc2_idx = " + loc2_idx);
		if (loc2_idx == -1) return null;
		open.push(loc1_idx);
		open_parents.push(-1);
		while(open.length > 0) {
			var current:number = open[0];
			var parent:number = open_parents[0];
			open.splice(0,1);
			open_parents.splice(0,1);
			closed.push(current);
			closed_parents.push(parent);

//			console.log("open: " + open.length + ", closed: " + closed.length + ", current = " + this.game.locations[current].id);

			if (current != loc2_idx && 
				((outside_flag && this.game.location_in[loc2_idx][current]) ||
				 (!outside_flag && !this.game.location_in[current][loc2_idx]))) {
				// we found the goal!
				var path:AILocation[] = [];
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


	restoreFromXML(xml:Element)
	{
		super.restoreFromXML(xml);

		let xml_tmp:Element = getFirstElementChildrenByTag(xml, "respondToPerformatives");
		if (xml_tmp != null) {
			this.respondToPerformatives = xml_tmp.getAttribute("value") == "true";
		}
		xml_tmp = getFirstElementChildrenByTag(xml, "locationsWherePlayerIsNotPermitted");
		if (xml_tmp != null) {
			this.locationsWherePlayerIsNotPermitted = xml_tmp.getAttribute("value").split(",");
		}
		xml_tmp = getFirstElementChildrenByTag(xml, "doorsPlayerIsNotPermittedToOpen");
		if (xml_tmp != null) {
			this.doorsPlayerIsNotPermittedToOpen = xml_tmp.getAttribute("value").split(",");
		}
	}


	savePropertiesToXML() : string
	{
		let str:string = super.savePropertiesToXML();

		str += "<respondToPerformatives value=\""+this.respondToPerformatives+"\"/>\n";
		str += "<locationsWherePlayerIsNotPermitted value=\""+this.locationsWherePlayerIsNotPermitted+"\"/>\n";
		str += "<doorsPlayerIsNotPermittedToOpen value=\""+this.doorsPlayerIsNotPermittedToOpen+"\"/>";

		return str;
	}


	generateAILocationDOTGraph() : string
	{
		var str:string = "digraph locations {\n";
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
}