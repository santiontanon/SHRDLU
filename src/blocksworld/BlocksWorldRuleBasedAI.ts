
var SPACE_NEAR_FAR_THRESHOLD:number = 8;


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
	    this.intentionHandlers.push(new AnswerWhy_IntentionAction());
	    this.intentionHandlers.push(new AnswerHow_IntentionAction());
	    this.intentionHandlers.push(new AnswerDefine_IntentionAction());
	    this.intentionHandlers.push(new AnswerHearSee_IntentionAction());

		// Blocks world specific:
		this.intentionHandlers.push(new ShrdluTalk_IntentionAction());
	    this.intentionHandlers.push(new BWAnswerWhere_IntentionAction());
	    this.intentionHandlers.push(new BWTake_IntentionAction());
	    this.intentionHandlers.push(new BWPutIn_IntentionAction());

		// load specific knowledge:
		for(let rulesFileName of rulesFileNames) {
			this.loadLongTermRulesFromFile(rulesFileName);
		}
		this.maximum_answers_to_give_at_once_for_a_query = 100;
		this.perceptionMemoryTime = 1;

		this.predicatesToStoreInLongTermMemory = [];
		this.predicatesToStoreInLongTermMemory.push(this.cache_sort_action_talk);
	}


	attentionAndPerception()
	{
		this.clearPerception();

		for(let object of this.world.objects) {
			this.addTermToPerception(Term.fromString(object.type + "('"+object.ID+"'[#id])", this.o));
			switch(object.color) {
				case MSX_COLOR_BLACK: this.addTermToPerception(Term.fromString("color('"+object.ID+"'[#id], 'black'[black])", this.o));
									  break;
				case MSX_COLOR_GREEN: 
				case MSX_COLOR_LIGHT_GREEN: 
				case MSX_COLOR_DARK_GREEN: 
									  this.addTermToPerception(Term.fromString("color('"+object.ID+"'[#id], 'green'[green])", this.o));
									  break;
				case MSX_COLOR_BLUE: 
				case MSX_COLOR_LIGHT_BLUE:
				case MSX_COLOR_DARK_BLUE: 
									  this.addTermToPerception(Term.fromString("color('"+object.ID+"'[#id], 'blue'[blue])", this.o));
									  break;
				case MSX_COLOR_RED: 
				case MSX_COLOR_LIGHT_RED:
				case MSX_COLOR_DARK_RED: 
									  this.addTermToPerception(Term.fromString("color('"+object.ID+"'[#id], 'red'[red])", this.o));
									  break;
				case MSX_COLOR_GREY: 
									  this.addTermToPerception(Term.fromString("color('"+object.ID+"'[#id], 'grey'[grey])", this.o));
									  break;
				case MSX_COLOR_WHITE: 
									  this.addTermToPerception(Term.fromString("color('"+object.ID+"'[#id], 'white'[white])", this.o));
									  break;
			}
			this.addTermToPerception(Term.fromString(object.size + "('"+object.ID+"'[#id])", this.o));

			if (object.ID != "shrdlu-arm") {
				for(let object2 of this.world.objects) {
					if (object != object2) {
						if (object.isInside(object2)) {
							this.addTermToPerception(Term.fromString("space.inside.of('"+object.ID+"'[#id], '"+object2.ID+"'[#id])", this.o));
						}

						if (object.isOnTopOf(object2)) {
							this.addTermToPerception(Term.fromString("space.directly.on.top.of('"+object.ID+"'[#id], '"+object2.ID+"'[#id])", this.o));
							this.addTermToPerception(Term.fromString("space.directly.under('"+object2.ID+"'[#id], '"+object.ID+"'[#id])", this.o));
						} 
					}
				}
			}
		}

		if (this.world.objectInArm != null) {
			this.addTermToPerception(Term.fromString("verb.have('"+this.selfID+"'[#id], '"+this.world.objectInArm.ID+"'[#id])", this.o));
			this.addTermToPerception(Term.fromString("space.at('"+this.world.objectInArm.ID+"'[#id], '"+this.world.shrdluArm.ID+"'[#id])", this.o));
		}
	}


	update(timeStamp:number) 
	{
		super.update(timeStamp);

		// continuous actions:
        if (this.currentActionHandler != null &&
        	this.currentActionHandler.needsContinuousExecution) {
        	if (this.currentActionHandler.executeContinuous(this)) {
				this.addLongTermTerm(new Term(this.o.getSort("verb.do"),
											  [new ConstantTermAttribute(this.selfID,this.cache_sort_id),
											   new ConstantTermAttribute("nothing",this.o.getSort("nothing"))]), PERCEPTION_PROVENANCE);
				this.currentActionHandler = null;		
        	}
        }
	}	


	distanceBetweenIds(source:string, target:string) : number
	{
		if (source == "shrdlu") source = "shrdlu-arm";
		if (target == "shrdlu") target = "shrdlu-arm";
		let o1:ShrdluBlock = this.world.getObject(source);
		let o2:ShrdluBlock = this.world.getObject(target);
		if (o1 != null && o2 != null) return this.world.distanceBetweenObjects(o1, o2);
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
		if (o1ID == "shrdlu") o1ID = "shrdlu-arm";
		if (o2ID == "shrdlu") o2ID = "shrdlu-arm";		
		let o1:ShrdluBlock = this.world.getObject(o1ID);
		let o2:ShrdluBlock = this.world.getObject(o2ID);
		if (o1 == null || o2 == null) return null;

		if (relation.is_a(this.cache_sort_space_at)) {
			if (o1 == this.world.objectInArm && o1 == this.world.shrdluArm) return true;
			if (o1.isInside(o2) || o1.isOnTopOf(o2)) return true;
			return false;
		} else if (relation.name == "space.outside.of") {
			if (!o1.isInside(o2)) return true;
			return false;
		} else if (relation.name == "space.inside.of") {			
			return o1.isInside(o2);
		} else if (relation.name == "space.directly.on.top.of") {
			return o1.isOnTopOf(o2);
		} else if (relation.name == "space.directly.under") {
			return o2.isOnTopOf(o1);
		} else if (relation.name == "space.near") {
			let distance:number = this.world.distanceBetweenObjects(o1, o2);
			if (distance == null) return null;
			if (distance < SPACE_NEAR_FAR_THRESHOLD) return true;
			return false;
		} else if (relation.name == "space.far") {
			let distance:number = this.world.distanceBetweenObjects(o1, o2);
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
			relation.name == "space.behind" ||
			relation.name == "space.right.of" ||
			relation.name == "space.left.of") {
			let dx:number = (o1.x+o1.dx/2)-(o2.x+o2.dx/2);
			let dy:number = (o1.y+o1.dy/2)-(o2.y+o2.dy/2);
			let dz:number = (o1.z+o1.dz/2)-(o2.z+o2.dz/2);
			return this.checkSpatialRelationBetweenCoordinates(relation, dx, dy, dz);
		}

		return null;
	}


	checkSpatialRelationBetweenCoordinates(relation:Sort, dx:number, dy:number, dz:number) : boolean
	{
		if (Math.abs(dx) >= 1 || Math.abs(dz) >= 1) {
			let angle:number = Math.atan2(dz,dx);

			if (relation.name == "space.north.of") {
				return angle>-(7*Math.PI/8) && angle<=-(1*Math.PI/8);
			} else if (relation.name == "space.east.of" ||
					   relation.name == "space.right.of") {
				return angle>-(3*Math.PI/8) && angle<=(3*Math.PI/8);
			} else if (relation.name == "space.west.of" ||
					   relation.name == "space.left.of") {
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
			} else if (relation.name == "space.in.front.of") {
				return dz<0;
			} else if (relation.name == "space.behind") {
				return dz>0;
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
		let relations:Sort[] = super.spatialRelations(o1ID, o2ID);
		if (o1ID == "shrdlu") o1ID = "shrdlu-arm";
		if (o2ID == "shrdlu") o2ID = "shrdlu-arm";		
		let o1:ShrdluBlock = this.world.getObject(o1ID);
		let o2:ShrdluBlock = this.world.getObject(o2ID);
		if (relations == null) relations = [];
		if (o1 == null || o2 == null) return null;

		if (o1.isInside(o2)) {
			relations.push(this.o.getSort("space.inside.of"))
		} else if (o2.isInside(o1)) {
			relations.push(this.o.getSort("verb.have"))
		}
		if (o1.isOnTopOf(o2)) {
			relations.push(this.o.getSort("space.directly.on.top.of"))
		} else if (o1.isOnTopOf(o2)) {
			relations.push(this.o.getSort("space.directly.under"))
		}
		if (o1ID == "shrdlu-arm" && o2 == this.world.objectInArm) {
			relations.push(this.o.getSort("verb.have"))
		}
		if (o2ID == "shrdlu-arm" && o1 == this.world.objectInArm) {
			relations.push(this.o.getSort("space.at"))
		}

		let dx:number = (o1.x+o1.dx/2)-(o2.x+o2.dx/2);
		let dz:number = (o1.z+o1.dz/2)-(o2.z+o2.dz/2);
		let distance:number = this.world.distanceBetweenObjects(o1, o2);
		if (distance < SPACE_NEAR_FAR_THRESHOLD) relations.push(this.o.getSort("space.near"));
		if (distance >= SPACE_NEAR_FAR_THRESHOLD) relations.push(this.o.getSort("space.far"));

		if (Math.abs(dx) >= 1 || Math.abs(dz) >= 1) {
			let angle:number = Math.atan2(dz,dx);
//			console.log("angle: " + angle + ", dx: " + dx + ", dy: " + dy);
			if (angle>-(7*Math.PI/8) && angle<=-(5*Math.PI/8)) {
				relations.push(this.o.getSort("space.northwest.of"));
			} else if (angle>-(5*Math.PI/8) && angle<=-(3*Math.PI/8)) {
				relations.push(this.o.getSort("space.north.of"));
				relations.push(this.o.getSort("space.behind"));
			} else if (angle>-(3*Math.PI/8) && angle<=-(1*Math.PI/8)) {
				relations.push(this.o.getSort("space.northeast.of"));
			} else if (angle>-(1*Math.PI/8) && angle<=(1*Math.PI/8)) {
				relations.push(this.o.getSort("space.east.of"));
				relations.push(this.o.getSort("space.right.of"));
			} else if (angle>(1*Math.PI/8) && angle<=(3*Math.PI/8)) {
				relations.push(this.o.getSort("space.southeast.of"));
			} else if (angle>(3*Math.PI/8) && angle<=(5*Math.PI/8)) {
				relations.push(this.o.getSort("space.south.of"));
				relations.push(this.o.getSort("space.in.front.of"));
			} else if (angle>(5*Math.PI/8) && angle<=(7*Math.PI/8)) {
				relations.push(this.o.getSort("space.southwest.of"));
			} else {
				relations.push(this.o.getSort("space.west.of"));
				relations.push(this.o.getSort("space.left.of"));
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
		if (this.currentActionHandler != null) return false;
		return true;
	}

	naturalLanguageGenerator:NLGenerator = null;
	world:ShrdluBlocksWorld = null;
	app:BlocksWorldApp = null;	// in order to print messages

	currentActionHandler:IntentionAction = null;
}
