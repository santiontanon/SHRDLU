
class BlocksWorldRuleBasedAI extends RuleBasedAI {
	constructor(o:Ontology, nlp:NLParser, nlg:NLGenerator, world:ShrdluBlocksWorld, app:BlocksWorldApp, 
				pf:number, pfoffset:number, qpt:number, 
				rulesFileNames:string[])
	{
		super(o, nlp, pf, pfoffset, qpt);
		this.world = world;
		this.app = app;
		this.selfID = "shrdlu";
		this.naturalLanguageGenerator = nlg;

		// Generic:
		this.intentionHandlers.push(new Call_IntentionAction());
    	this.intentionHandlers.push(new Memorize_IntentionAction());
	    this.intentionHandlers.push(new AnswerPredicate_IntentionAction());
	    this.intentionHandlers.push(new AnswerQuery_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhoIs_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhatIs_IntentionAction());
	    this.intentionHandlers.push(new AnswerHowMany_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhen_IntentionAction());
	    // this.intentionHandlers.push(new AnswerWhere_IntentionAction());
	    this.intentionHandlers.push(new AnswerWhy_IntentionAction());
	    this.intentionHandlers.push(new AnswerHow_IntentionAction());
	    this.intentionHandlers.push(new AnswerDefine_IntentionAction());
	    this.intentionHandlers.push(new AnswerHearSee_IntentionAction());

		// Blocks world specific:
		this.intentionHandlers.push(new ShrdluTalk_IntentionAction());

		// load specific knowledge:
		for(let rulesFileName of rulesFileNames) {
			this.loadLongTermRulesFromFile(rulesFileName);
		}		
	}


	perception()
	{
		// ...
	}


	distanceBetweenIds(source:string, target:string)
	{
		// ...
		return null;
	}


	updateContext(speaker:string) : NLContext
	{
		let context:NLContext = this.contextForSpeaker(speaker);
		if (context.lastTimeUpdated >= this.time_in_seconds) return context;
		context.lastTimeUpdated = this.time_in_seconds;
		context.shortTermMemory = [];

		console.log("updateContext: speaker: " + speaker)
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


	canSee(characterID:string)
	{
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


	// reference object is used in case o2 is not a directional object, to determine what is "behind" and "in front"
	checkSpatialRelation(relation:Sort, o1ID:string, o2ID:string, referenceObject:string) : boolean
	{
		/*
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
		*/

		return null;
	}


	checkSpatialRelationBetweenCoordinates(relation:Sort, dx:number, dy:number, frontDirection:number) : boolean
	{
		/*
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
		*/
		return null;
	}


	/*
	Calculates spatial relations (e.g., "space.west.of") of o1 with respect to o2. 
	E.g.: if "o1 is to the west of o2", this will return [this.o.getSort("space.west.of")]
	*/
	spatialRelations(o1ID:string, o2ID:string) : Sort[]
	{
		let relations:Sort[] = super.spatialRelations(o1ID, o2ID);
		/*
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
		*/

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
	getBaseObjectProperties(obj:string) : Term[]
	{
		let properties:Term[] = [];
		/*
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
		*/

		return properties;
	}


	talkingToUs(context:NLContext, speaker:string, performative:Term) : boolean
	{
		// the "targetList" is a structure of the form #and(T1, #and(t2, ... #and(Tn-1,Tn)...) if there is more than one target
		let targetList:TermAttribute = null;
		let targetIDList:string[] = [];
		if (performative != null) {
			targetList = performative.attributes[0];
			while(targetList instanceof TermTermAttribute) {
				if (targetList.term.functor.name == "#and" &&
					targetList.term.attributes[0] instanceof ConstantTermAttribute) {
					targetIDList.push((<ConstantTermAttribute>targetList.term.attributes[0]).value);
					targetList = targetList.term.attributes[1];
				} else {
					break;
				}
			}
			if (targetList instanceof ConstantTermAttribute) targetIDList.push((<ConstantTermAttribute>targetList).value);

			for(let targetID of targetIDList) {
				if (targetID == this.selfID) {
					context.lastPerformativeInvolvingThisCharacterWasToUs = true;
					return true;
				} else {
					// talking to someone else, so we are now not talking to that someone else:
					let context2:NLContext = this.contextForSpeakerWithoutCreatingANewOne(targetID);
					if (context2 != null) {
						context2.lastPerformativeInvolvingThisCharacterWasToUs = false;
						context2.inConversation = false;
					}
				}
			}

			if (targetIDList.length > 0) {
				// not talking to us!
				context.lastPerformativeInvolvingThisCharacterWasToUs = false;
				context.inConversation = false;
				for(let targetID of targetIDList) {
					let context2:NLContext = this.contextForSpeakerWithoutCreatingANewOne(targetID);
					if (context2 != null) {
						context2.inConversation = false;
						context2.lastPerformativeInvolvingThisCharacterWasToUs = false;
					}
				}
				return false;
			}

			// if not specified, they are talking to us:
			if (targetIDList.length == 0) {
				context.lastPerformativeInvolvingThisCharacterWasToUs = true;
				return true;
			}
		}

		if (context.performatives.length>0 &&
			(this.time_in_seconds - context.performatives[0].timeStamp) >= CONVERSATION_TIMEOUT) return false;
		if (context.lastPerformativeInvolvingThisCharacterWasToUs) return true;
		if (context.inConversation) return true;

		return false;
	}	


	perceiveTextInput(speaker:string, text:string, time:number)
	{
		// assume that this is a "talk" action:
		let context:NLContext = this.updateContext(speaker);

        // perceived an action!
    	let actionTerms:Term[] = [Term.fromString("action.talk("+
    										      "'"+time+"'[number],"+
    											  "'"+speaker+"'[#id])", this.o)];

		// assume that this is a "talk" action:
		for(let actionTerm of actionTerms) {
			actionTerm.addAttribute(new ConstantTermAttribute(speaker, this.o.getSort("#id")));
		}

		// parse the text:
	    let parses:NLParseRecord[] = this.naturalLanguageParser.parse(text, this.cache_sort_performative, context, this);
	    if (parses == null || parses.length == 0 && this.naturalLanguageParser.error_semantic.length > 0) {
	    	// if we cannot parse sentences in any other way, at least consider the semantic errors as the parses:
	    	parses = this.naturalLanguageParser.error_semantic;
	    }
	    if (parses != null && parses.length > 0) {
	    	let HPparse:NLParseRecord = this.naturalLanguageParser.chooseHighestPriorityParse(parses);
	    	console.log("BlocksWorldRuleBasedAI("+this.selfID+"): parsed sentence '" + text + "'\n  " + HPparse.result);
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
			for(let actionTerm of actionTerms) {
				// console.log(actionTerm + " added to perception");
				this.addTermToPerception(actionTerm);
			}			        		
	    } else {
	    	console.warn("BlocksWorldRuleBasedAI ("+this.selfID+"): cannot parse sentence: " + text);
	    	if (this.naturalLanguageParser.error_semantic.length > 0) console.warn("    semantic error!");
	    	if (this.naturalLanguageParser.error_deref.length > 0) console.warn("    ("+this.selfID+") could not deref expressions: " + this.naturalLanguageParser.error_deref);
	    	if (this.naturalLanguageParser.error_unrecognizedTokens.length > 0) console.warn("    unrecognized tokens: " + this.naturalLanguageParser.error_unrecognizedTokens);
	    	if (this.naturalLanguageParser.error_grammatical) console.warn("    grammatical error!");
	    	this.reactiveBehaviorUpdateToParseError(speaker);
	    }
	}


	isIdle() : boolean
	{
		if (this.intentions.length > 0) return false;
		if (this.queuedIntentions.length > 0) return false;
		if (this.inferenceProcesses.length > 0) return false;
		return true;
	}

	naturalLanguageGenerator:NLGenerator = null;
	world:ShrdluBlocksWorld = null;
	app:BlocksWorldApp = null;	// in order to print messages
}