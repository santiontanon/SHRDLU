
var SPACE_NEAR_FAR_THRESHOLD:number = 8;



class PlanningRecord {
	constructor(ai:BlocksWorldRuleBasedAI, goal:PlanningCondition, o:Ontology, requester:TermAttribute, 
				requestingPerformative:NLContextPerformative, timeStamp:number)
	{
		this.planner = new BWPlanner(ai.world, o);		
		this.goal = goal;
		this.o = o;
		this.requester = requester;
		this.requestingPerformative = requestingPerformative;
		this.timeStamp = timeStamp;
	}


	// executes one step of plannning, and returns "true" if planning is over
	step() : boolean
	{
		this.plan = this.planner.plan(this.goal, this.maxDepth)
		return true;
	}


	requester:TermAttribute = null;
	requestingPerformative:NLContextPerformative = null;
	timeStamp:number = null;

	planner:BWPlanner;
	goal:PlanningCondition;
	o:Ontology;
	plan:PlanningPlan = null;
	planExecutionPointer:number = 0;

	maxDepth:number = 8;
	priority:number = 1;
	anxiety:number = 0;
}


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
			this.addTermToPerception(Term.fromString("color('"+object.ID+"'[#id], '"+object.color+"'["+object.color+"])", this.o));

			this.addTermToPerception(Term.fromString(object.size + "('"+object.ID+"'[#id])", this.o));
			if (object.shape != null) {
				this.addTermToPerception(Term.fromString("shape('"+object.ID+"'[#id], '"+object.shape+"'["+object.shape+"])", this.o));
			}

			if (object.ID != "shrdlu-arm") {
				let clearTop:boolean = true;
				for(let object2 of this.world.objects) {
					if (object != object2) {
						if (object2.isInside(object)) {
							this.addTermToPerception(Term.fromString("space.inside.of('"+object2.ID+"'[#id], '"+object.ID+"'[#id])", this.o));
						}

						if (object2.isOnTopOf(object)) {
							clearTop = false;
							this.addTermToPerception(Term.fromString("space.directly.on.top.of('"+object2.ID+"'[#id], '"+object.ID+"'[#id])", this.o));
							this.addTermToPerception(Term.fromString("space.directly.under('"+object.ID+"'[#id], '"+object2.ID+"'[#id])", this.o));
						}
					}
				}
				if (clearTop) {
					this.addTermToPerception(Term.fromString("top-clear-status('"+object.ID+"'[#id], 'clear-status-clear'[clear-status-clear])", this.o));
				} else {
					this.addTermToPerception(Term.fromString("top-clear-status('"+object.ID+"'[#id], 'clear-status-not-clear'[clear-status-not-clear])", this.o));
				}
			}
		}

		if (this.world.objectInArm != null) {
			this.addTermToPerception(Term.fromString("verb.hold('"+this.selfID+"'[#id], '"+this.world.objectInArm.ID+"'[#id])", this.o));
			this.addTermToPerception(Term.fromString("space.at('"+this.world.objectInArm.ID+"'[#id], '"+this.world.shrdluArm.ID+"'[#id])", this.o));
		} else {
			this.addTermToPerception(Term.fromString("empty('"+this.world.shrdluArm.ID+"'[#id])", this.o));
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

        // planning:
        let toDelete:PlanningRecord[] = [];
        for(let pr of this.planningProcesses) {
        	if (pr.step()) {
    			toDelete.push(pr);

        		// get the plan and execute it:
        		if (pr.plan == null) {
        			// generate error message:
        			if (pr.requester != null) {
						let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.denyrequest("+pr.requester+"))", this.o);
						this.intentions.push(new IntentionRecord(term, null, null, null, this.time_in_seconds));
					}
        		} else {
        			if (pr.requester != null) {
						let term:Term = Term.fromString("action.talk('"+this.selfID+"'[#id], perf.ack.ok("+pr.requester+"))", this.o);
						this.intentions.push(new IntentionRecord(term, null, null, null, this.time_in_seconds));
					}
        			this.plans.push(pr);
        		}
        	}
        }
        for(let pr of toDelete) {
        	this.planningProcesses.splice(this.planningProcesses.indexOf(pr), 1);
        }

        // execute plans:
        toDelete = [];
        for(let pr of this.plans) {
        	let plan:PlanningPlan = pr.plan;

        	// execute the plan:
        	if (this.isIdleWithoutConsideringPlanExecution()) {
        		if (pr.planExecutionPointer >= plan.actions.length) {
        			// we are done!
        			toDelete.push(pr);
        		} else {
        			let action:Term = plan.actions[pr.planExecutionPointer].signature;
        			pr.planExecutionPointer++;
        			// we set the requester to null, so that we don't constantly say "ok" after each action
        			this.intentions.push(new IntentionRecord(action, null, 
        													 pr.requestingPerformative, null, this.time_in_seconds));
        		}
        	}
        }
        for(let pr of toDelete) {
        	this.plans.splice(this.plans.indexOf(pr), 1);
        }
	}	


	distanceBetweenIds(source:string, target:string) : number
	{
		if (source == "shrdlu") source = "shrdlu-arm";
		if (target == "shrdlu") target = "shrdlu-arm";
		let o1:ShrdluBlock = this.world.getObject(source);
		let o2:ShrdluBlock = this.world.getObject(target);
		if (o1 != null && o2 != null) return this.world.distanceBetweenObjects(o1, o2);
		return super.distanceBetweenIds(source, target);
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
						// let distanceFromSpeaker:number = this.distanceBetweenIds(speaker, id);
						// let e:NLContextEntity = context.newContextEntity(<ConstantTermAttribute>t.attributes[0], null, distanceFromSpeaker, this.o, false);
						let distanceFromSelf:number = this.distanceBetweenIds(this.selfID, id);
						let e:NLContextEntity = context.newContextEntity(<ConstantTermAttribute>t.attributes[0], null, distanceFromSelf, this.o, false);
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

		if (relation.name == "space.outside.of") {
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
			let dx_raw:number = (o1.x+o1.dx/2)-(o2.x+o2.dx/2);
			let dz_raw:number = (o1.z+o1.dz/2)-(o2.z+o2.dz/2);
			let dx:number = 0;
			let dz:number = 0;
			if (o1.x+o1.dx < o2.x) {
				dx = o2.x - (o1.x+o1.dx);
			} else if (o2.x+o2.dx < o1.x) {
				dx = o1.x - (o2.x+o2.dx);
			}
			if (o1.z+o1.dz < o2.z) {
				dz = o2.z - (o1.z+o1.dz);
			} else if (o2.z+o2.dz < o1.z) {
				dx = o1.z - (o2.z+o2.dz);
			}
			if (Math.abs(dx_raw) >= 1 || Math.abs(dz_raw) >= 1) {
				let angle:number = Math.atan2(dz_raw,dx_raw);

				if (relation.name == "space.north.of" ||
					relation.name == "space.behind") {
					return angle>(1*Math.PI/8) && angle<=(7*Math.PI/8) && dz > 0;
				} else if (relation.name == "space.east.of" ||
						   relation.name == "space.right.of") {
					return angle>-(3*Math.PI/8) && angle<=(3*Math.PI/8) && dx > 0;
				} else if (relation.name == "space.west.of" ||
						   relation.name == "space.left.of") {
					return angle<=-(5*Math.PI/8) || angle>(5*Math.PI/8) && dx > 0;
				} else if (relation.name == "space.south.of" ||
						   relation.name == "space.in.front.of") {
					return angle>-(7*Math.PI/8) && angle<=-(1*Math.PI/8) && dz > 0;
				} else if (relation.name == "space.northeast.of") {
					return angle>(1*Math.PI/8) && angle<=(3*Math.PI/8) && (dx > 0 || dz > 0);
				} else if (relation.name == "space.northwest.of") {
					return angle>(5*Math.PI/8) && angle<=(7*Math.PI/8) && (dx > 0 || dz > 0);
				} else if (relation.name == "space.southeast.of") {
					return angle>-(3*Math.PI/8) && angle<=-(1*Math.PI/8) && (dx > 0 || dz > 0);
				} else if (relation.name == "space.southwest.of") {
					return angle>-(7*Math.PI/8) && angle<=-(5*Math.PI/8) && (dx > 0 || dz > 0);
				}
			}
		} else if (relation.is_a(this.cache_sort_space_at)) {
			if (o1 == this.world.objectInArm && o1 == this.world.shrdluArm) return true;
			if (o1.isInside(o2) || o1.isOnTopOf(o2)) return true;
			return false;
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
		} else if (o2.isOnTopOf(o1)) {
			relations.push(this.o.getSort("space.directly.under"))
		}
		if (o1ID == "shrdlu-arm" && o2 == this.world.objectInArm) {
			relations.push(this.o.getSort("verb.have"))
		}
		if (o2ID == "shrdlu-arm" && o1 == this.world.objectInArm) {
			relations.push(this.o.getSort("space.at"))
		}

		let distance:number = this.world.distanceBetweenObjects(o1, o2);
		if (distance < SPACE_NEAR_FAR_THRESHOLD) relations.push(this.o.getSort("space.near"));
		if (distance >= SPACE_NEAR_FAR_THRESHOLD) relations.push(this.o.getSort("space.far"));


		let dx_raw:number = (o1.x+o1.dx/2)-(o2.x+o2.dx/2);
		let dz_raw:number = (o1.z+o1.dz/2)-(o2.z+o2.dz/2);
		let dx:number = 0;
		let dz:number = 0;
		if (o1.x+o1.dx < o2.x) {
			dx = o2.x - (o1.x+o1.dx);
		} else if (o2.x+o2.dx < o1.x) {
			dx = o1.x - (o2.x+o2.dx);
		}
		if (o1.z+o1.dz < o2.z) {
			dz = o2.z - (o1.z+o1.dz);
		} else if (o2.z+o2.dz < o1.z) {
			dx = o1.z - (o2.z+o2.dz);
		}
		if (Math.abs(dx_raw) >= 1 || Math.abs(dz_raw) >= 1) {
			let angle:number = Math.atan2(dz_raw,dx_raw);
//			console.log("angle: " + angle + ", dx: " + dx + ", dy: " + dy);
			if (angle>-(7*Math.PI/8) && angle<=-(5*Math.PI/8)) {
				if (dx > 0 || dz > 0) relations.push(this.o.getSort("space.southwest.of"));
			} else if (angle>-(5*Math.PI/8) && angle<=-(3*Math.PI/8)) {
				if (dz > 0) {
					relations.push(this.o.getSort("space.south.of"));
					relations.push(this.o.getSort("space.in.front.of"));
				}
			} else if (angle>-(3*Math.PI/8) && angle<=-(1*Math.PI/8)) {
				if (dx > 0 || dz > 0) relations.push(this.o.getSort("space.southeast.of"));
			} else if (angle>-(1*Math.PI/8) && angle<=(1*Math.PI/8)) {
				if (dx > 0) {
					relations.push(this.o.getSort("space.east.of"));
					relations.push(this.o.getSort("space.right.of"));
				}
			} else if (angle>(1*Math.PI/8) && angle<=(3*Math.PI/8)) {
				if (dx > 0 || dz > 0) relations.push(this.o.getSort("space.northeast.of"));
			} else if (angle>(3*Math.PI/8) && angle<=(5*Math.PI/8)) {
				if (dz > 0) {
					relations.push(this.o.getSort("space.north.of"));
					relations.push(this.o.getSort("space.behind"));
				}
			} else if (angle>(5*Math.PI/8) && angle<=(7*Math.PI/8)) {
				if (dx > 0 || dz > 0) relations.push(this.o.getSort("space.northwest.of"));
			} else {
				if (dx > 0) {
					relations.push(this.o.getSort("space.west.of"));
					relations.push(this.o.getSort("space.left.of"));
				}
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
			for(let actionTerm of actionTerms2) {
				// console.log(actionTerm + " added to perception");
				this.addTermToPerception(actionTerm);
			}
			this.reactToParsedPerformatives(parsePerformatives, text, speaker);
	    } else {
	    	console.warn("BlocksWorldRuleBasedAI ("+this.selfID+"): cannot parse sentence: " + text);
	    	if (this.naturalLanguageParser.error_semantic.length > 0) console.warn("    semantic error!");
	    	if (this.naturalLanguageParser.error_deref.length > 0) console.warn("    ("+this.selfID+") could not deref expressions: " + this.naturalLanguageParser.error_deref);
	    	if (this.naturalLanguageParser.error_unrecognizedTokens.length > 0) console.warn("    unrecognized tokens: " + this.naturalLanguageParser.error_unrecognizedTokens);
	    	if (this.naturalLanguageParser.error_grammatical) console.warn("    grammatical error!");
	    	this.reactToParseError(speaker);
	    }
	}


	isIdle() : boolean
	{
		if (this.intentions.length > 0) return false;
		if (this.queuedIntentions.length > 0) return false;
		if (this.inferenceProcesses.length > 0) return false;
		if (this.currentActionHandler != null) return false;
		if (this.planningProcesses.length > 0) return false;
		if (this.plans.length > 0) return false;
		return true;
	}


	isIdleWithoutConsideringPlanExecution() : boolean
	{
		if (this.intentions.length > 0) return false;
		if (this.queuedIntentions.length > 0) return false;
		if (this.inferenceProcesses.length > 0) return false;
		if (this.currentActionHandler != null) return false;
		if (this.planningProcesses.length > 0) return false;
		return true;
	}


	reactToParsedPerformatives(performatives:TermAttribute[], text:string, speaker:string)
	{
		if (speaker != this.selfID && performatives.length > 0) {
			let context:NLContext = this.contextForSpeaker(speaker);
			let first_performative:Term = null;
			let unified_performatives:Term[] = [];
			let actions:Term[] = [];
			let allActionRequestsTalkingToUs:boolean = true;  // We are the listener of the performative
			let anyNeedsInference:boolean = false;
			let allRequestsForUs:boolean = true;  // We are the performer of the requested action
			let canSatisfyThemAll:boolean = true;
			for(let performative_att of performatives) {
				if (performative_att instanceof TermTermAttribute) {
					let performative:Term = (<TermTermAttribute>performative_att).term;
					// is it talking to us?
					if (this.talkingToUs(context, speaker, performative) &&
						(performative.functor.is_a_string("perf.request.action") || 
					   	 performative.functor.is_a_string("perf.q.action"))) {

						let perf2:Term = this.naturalLanguageParser.unifyListener(performative, this.selfID);
						if (perf2 == null) perf2 = performative;
						if (first_performative == null) first_performative = perf2;
						unified_performatives.push(perf2);

						let action:Term = (<TermTermAttribute>(perf2.attributes[1])).term;
						actions.push(action);

						let needsInference:boolean = false;
						if (perf2.attributes.length == 4 &&
							perf2.attributes[2] instanceof TermTermAttribute) {
							needsInference = true;
							for(let ih of this.intentionHandlers) {
								if (ih.canHandle(action, this)) {
									if (ih.canHandleWithoutInference(perf2)) {
										needsInference = false;
										break;
									}
								}
							}
							if (needsInference) {
								anyNeedsInference = true;
								break;
							}
						}

						if (action.attributes.length>=1 &&
							(action.attributes[0] instanceof ConstantTermAttribute)) {
							if ((<ConstantTermAttribute>action.attributes[0]).value != this.selfID) {
								allRequestsForUs = false;
								break;
							}
						}

						let ir:IntentionRecord = new IntentionRecord(action, new ConstantTermAttribute(context.speaker, this.cache_sort_id), context.getNLContextPerformative(perf2), null, this.time_in_seconds)
						let tmp:number = this.canSatisfyActionRequest(ir);
						if (tmp != ACTION_REQUEST_CAN_BE_SATISFIED) {
							canSatisfyThemAll = false;
							break;
						}

					} else {
						allActionRequestsTalkingToUs = false;
						break;
					}
				}
			}
			if (allActionRequestsTalkingToUs && allRequestsForUs && canSatisfyThemAll && actions.length>0 && !anyNeedsInference) {
				// Create an intention record with all the requested actions:
				let nlcp_l:NLContextPerformative[] = context.newPerformative(speaker, text, first_performative, null, this.o, this.time_in_seconds);
				let nlcp:NLContextPerformative = null;
				if (nlcp_l != null) nlcp = nlcp_l[0];
				let ir:IntentionRecord = new IntentionRecord(actions[0], 
															 new ConstantTermAttribute(context.speaker, this.cache_sort_id), 
															 nlcp, 
															 null, 
															 this.time_in_seconds)
				ir.alternative_actions = actions;
				ir.numberConstraint = new VariableTermAttribute(this.o.getSort("all"), null);
				this.planForAction(ir);
			} else {
				super.reactToParsedPerformatives(performatives, text, speaker);
			}
		}
	}	


	planForAction(ir:IntentionRecord)
	{
		// 1) Translate the intention to a planning goal:
		let actions:Term[] = ir.alternative_actions;
		if (actions == null) actions = [ir.action];
		
		let numberConstraint:number = 1;
		if (ir.numberConstraint != null) {
			numberConstraint = ir.resolveNumberConstraint(ir.numberConstraint, actions.length);
		}

		let predicates:PlanningPredicate[] = [];
		for(let action of actions) {
			if (action.functor.is_a_string("action.take") && action.attributes.length==2) {
				let target:TermAttribute = action.attributes[1];
				predicates.push(new PlanningPredicate(Term.fromString("verb.hold('"+this.selfID+"'[#id], "+target+")", this.o), true));
			} else if (action.functor.is_a_string("action.put-in") && action.attributes.length==3 &&
					   (action.attributes[2] instanceof ConstantTermAttribute)) {
				let o1:TermAttribute = action.attributes[1];
				let o2:ConstantTermAttribute = <ConstantTermAttribute>action.attributes[2];
				if (this.world.getObject(o2.value).type == SHRDLU_BLOCKTYPE_BOX) {
					predicates.push(new PlanningPredicate(Term.fromString("space.inside.of("+o1+","+o2+")", this.o), true));
				} else {
					predicates.push(new PlanningPredicate(Term.fromString("space.directly.on.top.of("+o1+","+o2+")", this.o), true));
				}
			} else {
				// unsupported action, just execute directly without planning:
				this.intentions.push(ir);
				return;
			}
		}

		let goal:PlanningCondition = new PlanningCondition();
		if (numberConstraint == 1) {
			// make the goal an "or":
			for(let predicate of predicates) {
				goal.predicates.push([predicate]);
			}
		} else if (numberConstraint == actions.length) {
			// make the goal a single "and"
			goal.predicates.push(predicates);
		} else if (numberConstraint < actions.length) {
			// We want to execute a subset of the possible actions:
			for(let predicate of predicates) {
				goal.predicates.push([predicate]);
			}
			goal.number_constraint = numberConstraint;
		} else {
			// unsupported number constraint, just execute directly without planning:
			this.intentions.push(ir);
			return;
		}

		// 2) Plan:
		console.log("planForAction, goal:");
		console.log(goal);

		this.planningProcesses.push(new PlanningRecord(this, goal, this.o, ir.requester, ir.requestingPerformative, this.time_in_seconds));
	}


	/*
	getWorldStateForPlanning(version:string) : PlanningState
	{
		let state:PlanningState = new PlanningState();
		let predicatesToInclude:string[] = ["color", "shape", 
											BW_SIZE_SMALL, BW_SIZE_MEDIUM, BW_SIZE_LARGE,
											SHRDLU_BLOCKTYPE_BLOCK, SHRDLU_BLOCKTYPE_CUBE, SHRDLU_BLOCKTYPE_PYRAMID, SHRDLU_BLOCKTYPE_BOX,
											SHRDLU_BLOCKTYPE_TABLE, ,"arm",
											"space.inside.of", "space.directly.on.top.of", "verb.hold","empty"];
		let objectPredicates:string[] = [SHRDLU_BLOCKTYPE_BLOCK, SHRDLU_BLOCKTYPE_CUBE, SHRDLU_BLOCKTYPE_PYRAMID, SHRDLU_BLOCKTYPE_BOX];

		for(let term of this.perceptionBuffer) {
			if (predicatesToInclude.indexOf(term.functor.name) != -1) {
				state.terms.push(term);
				if (objectPredicates.indexOf(term.functor.name) != -1 &&
					term.attributes.length == 1 &&
					(term.attributes[0] instanceof ConstantTermAttribute)) {
					// see if their top is clear:
					let clear:boolean = true;
					for(let term2 of this.perceptionBuffer) {
						if ((term2.functor.name == "space.directly.on.top.of" ||
						     term2.functor.name == "space.inside.of") &&
							term2.attributes.length == 2 &&
							(term2.attributes[1] instanceof ConstantTermAttribute) &&
							(<ConstantTermAttribute>term2.attributes[1]).value == (<ConstantTermAttribute>term.attributes[0]).value) {
							clear = false;
						}
					}
					if (clear && version == "graphplan") {
						state.terms.push(Term.fromString("top-clear-status('"+(<ConstantTermAttribute>term.attributes[0]).value+"'[#id], "+
														 "'clear-status-clear'[clear-status-clear])", this.o));
					}
				}
			}
		}

		for(let object of this.world.objects) {
			for(let object2 of this.world.objects) {
				if (object != object2) {
					if (object2.type == SHRDLU_BLOCKTYPE_BLOCK || 
						object2.type == SHRDLU_BLOCKTYPE_CUBE ||
						object2.type == SHRDLU_BLOCKTYPE_BOX ||
						object2.type == SHRDLU_BLOCKTYPE_TABLE) {
						if (object.dx <= object2.dx &&
							object.dz <= object2.dz) {
							state.terms.push(Term.fromString("verb.can('"+this.selfID+"'[#id], action.put-in('"+object.ID+"'[#id], '"+object2.ID+"'[#id]))", this.o));
						}
					}
				}
			}
		}

		return state;
	}
	*/

	naturalLanguageGenerator:NLGenerator = null;
	world:ShrdluBlocksWorld = null;
	app:BlocksWorldApp = null;	// in order to print messages

	currentActionHandler:IntentionAction = null;

	planningProcesses:PlanningRecord[] = [];	// list of the current planning processes the AI is trying to perform
	plans:PlanningRecord[] = [];	// list of plans we are currently executing
}
