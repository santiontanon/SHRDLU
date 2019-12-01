var MAX_PERFORMATIVE_MEMORY:number = 10;
var MAXIMUM_DISTANCE_TO_BE_CONSIDERED_THIS:number = 128;


class NLContextEntity {
	constructor(id:ConstantTermAttribute, time:number, distance:number, tl:Term[])
	{
		this.objectID = id;
		this.mentionTime = time;
		this.distanceFromSpeaker = distance;
		this.terms = tl;
	}


	properNounMatch(name:string) : boolean
	{
		for(let term of this.terms) {
			if (term.functor.name == "name") {
				if (term.attributes[1] instanceof ConstantTermAttribute &&
					(<ConstantTermAttribute>(term.attributes[1])).value == name) {
					return true;
				}
			}
		}

		return false;
	}


	sortMatch(sort:Sort) : boolean
	{
		for(let term of this.terms) {
			if (term.attributes.length == 1 &&
				term.functor.is_a(sort)) {
				return true;
			}
		}

		return false;
	}


	adjectiveMatch(sort:Sort, o:Ontology) : boolean
	{
		for(let term of this.terms) {
//			console.log("checking term: " + term + " for adjective " + sort.name);
			if (term.attributes.length == 1 &&
				term.functor.is_a(sort)) {
				return true;
			} else if (term.attributes.length == 2 &&
//					   term.functor.is_a(sort) &&
					   term.functor.is_a(o.getSort("property-with-value")) &&
					   (term.attributes[1] instanceof ConstantTermAttribute) &&
					   term.attributes[1].sort.is_a(sort)) {
				return true;
			}
//			console.log("    no match...");
		}		
		return false;
	}


	relationMatch(relation:Term, o:Ontology, pos:POSParser) : boolean
	{
		//console.log("        relationMatch: " + relation + " with " + this.terms);
		for(let term of this.terms) {
//			console.log("checking term: " + term + " for relation " + relation);
			if (relation.subsumesNoBindings(term) == 1) {
				// console.log("match! " + relation  + "   subsumes   " + term);
				return true;
//			} else {
				// console.log("no match! " + relation  + "   does not subsume   " + term);				
			}
		}		

		if (pos!=null &&
			pos.reverseRelations[relation.functor.name] != null) {
			let inverseRelation:Sort = o.getSort(pos.reverseRelations[relation.functor.name]);
			let relation_reverse:Term = new Term(inverseRelation, [relation.attributes[1], relation.attributes[0]]);
			for(let term of this.terms) {
//				if (term.equalsNoBindings(relation_reverse) == 1) {
				if (relation_reverse.subsumesNoBindings(term) == 1) {
					return true;
				}
			}		
		}

		return false;
	}


	addTerm(t:Term)
	{
		for(let t2 of this.terms) {
			if (t.equalsNoBindings(t2) == 1) return;
		}
		this.terms.push(t);
	}


	addStateTerm(t:Term)
	{
		for(let t2 of this.terms) {
			if (TermContainer.termReplacesPreviousStateTerm(t, t2)) {
				if (t.equalsNoBindings(t2) == 1) return;
				// replace!
				this.terms.splice(this.terms.indexOf(t2),1);
				this.terms.push(t);
				return;
			}
		}
		this.terms.push(t);
	}


	static fromXML(xml:Element, o:Ontology) : NLContextEntity
	{
		var id:ConstantTermAttribute = new ConstantTermAttribute(xml.getAttribute("id"),
																 o.getSort(xml.getAttribute("sort")));
		var time:number = null;
		var distance:number = null;
		var tl:Term[] = [];

		if (xml.getAttribute("mentionTime")!=null) time = Number(xml.getAttribute("mentionTime"));
		if (xml.getAttribute("distanceFromSpeaker")!=null) distance = Number(xml.getAttribute("distanceFromSpeaker"));

		for(let t_xml of getElementChildrenByTag(xml, "term")) {
			let t:Term = Term.fromString(t_xml.getAttribute("term"), o);
			if (t != null) tl.push(t);
		}

		return new NLContextEntity(id, time, distance, tl);
	}


	saveToXML() : string
	{
		var str = "<NLContextEntity id=\""+this.objectID.value+"\" sort=\""+this.objectID.sort.name+"\"";
		if (this.mentionTime != null) str += " mentionTime=\""+this.mentionTime+"\"";
		if (this.distanceFromSpeaker != null) str += " distanceFromSpeaker=\""+this.distanceFromSpeaker+"\"";
		str += ">\n";
		for(let t of this.terms) {
			str += "<term term=\""+t.toStringXML()+"\"/>\n";
		}
		str += "</NLContextEntity>";
		return str;
	}


	toString() : string
	{
		return "[NLCE: " + this.objectID + ","+this.mentionTime+","+this.distanceFromSpeaker+"]"; 
	}


	objectID:ConstantTermAttribute = null;
	mentionTime:number = null;
	distanceFromSpeaker:number = null;
	terms:Term[] = [];
}


class NLContextPerformative {
	constructor(t:string, speaker:string, p:Term, c:CauseRecord, timeStamp:number)
	{
		this.text = t;
		this.speaker = speaker;
		this.performative = p;
		this.cause = c;
		this.timeStamp = timeStamp;
	}


	static fromXML(xml:Element, o:Ontology) : NLContextPerformative
	{
		var cause:CauseRecord = null;
		var p_xml = getFirstElementChildByTag(xml, "cause");
		if (p_xml != null) {
			cause = CauseRecord.fromXML(p_xml, o);
		}
		return new NLContextPerformative(xml.getAttribute("text"),
										 xml.getAttribute("speaker"),
										 Term.fromString(xml.getAttribute("performative"), o),
										 cause,
										 Number(xml.getAttribute("timeStamp")));
	}


	saveToXML() : string
	{
		if (this.cause == null) {
			let tmp:string = "<NLContextPerformative text=\""+this.text+"\" " +
										  "speaker=\""+this.speaker+"\" " + 
										  (this.performative != null ? "performative=\""+this.performative+"\" ":"") + 
										  "timeStamp=\""+this.timeStamp+"\"/>";
		    return tmp;
		} else {
			let tmp:string = "<NLContextPerformative text=\""+this.text+"\" " +
										  "speaker=\""+this.speaker+"\" " + 
										  (this.performative != null ? "performative=\""+this.performative+"\" ":"") + 
										  "timeStamp=\""+this.timeStamp+"\">";
		    tmp += this.cause.saveToXML();
		    tmp +="</NLContextPerformative>"

		    return tmp;
		}
	}


	text:string = null;
	speaker:string = null;
	performative:Term = null;
	cause:CauseRecord = null;	// the cause of having said this performative
	timeStamp:number = 0;	// cycle when it was recorded
}


class NLContext {
	constructor(speaker:string, ai:RuleBasedAI, mentionMemorySize:number)
	{
		this.speaker = speaker;
		this.ai = ai;
		this.mentionMemorySize = mentionMemorySize;
		this.cache_sort_space_at = this.ai.o.getSort("space.at");
		this.cache_sort_contains = this.ai.o.getSort("relation.contains");
	}


	endConversation()
	{
		this.inConversation = false;
		this.lastPerformativeInvolvingThisCharacterWasToUs = false;
		this.expectingYes = false;
		this.expectingThankYou = false;
		this.expectingYouAreWelcome = false;
		this.expectingGreet = false;
		this.expectingFarewell = false;
		this.expectingNicetomeetyoutoo = false;
		this.expectingAnswerToQuestion_stack = [];
		this.expectingAnswerToQuestionTimeStamp_stack = [];
		this.expectingConfirmationToRequest_stack = [];
		this.expectingConfirmationToRequestTimeStamp_stack = [];
		this.lastEnumeratedQuestion_answered = null;
		this.lastEnumeratedQuestion_answers = null;
		this.lastEnumeratedQuestion_next_answer_index = 0;
	}


	newContextEntity(idAtt:ConstantTermAttribute, time:number, distance:number, o:Ontology) : NLContextEntity
	{
//		console.log("newContextEntity: " + idAtt);

		let ID:string = idAtt.value;
		let e:NLContextEntity = this.findByID(ID);
		let itsAnExistingOne:boolean = false;
		if (e != null) {
			if (time != null) {
				if (e.mentionTime==null || e.mentionTime < time) e.mentionTime = time;
			}
			if (distance != null) {
				e.distanceFromSpeaker = distance;
			}
			// return e;
			e.terms = [];		// entities need to be updated every time, otherwise, info is outdated!
			itsAnExistingOne = true;
		} else {
//		console.log("newContextEntity: creating " + ID + " from scratch...");
			e = new NLContextEntity(idAtt, time, distance, []);
		}

		// find everything we can about it:
		let typeSorts:Sort[] = []
		let typeSortsWithArity:[Sort,number][] = []
		let pSort:Sort = o.getSort("property");
		let pwvSort:Sort = o.getSort("property-with-value");
		let rSort:Sort = o.getSort("relation"); 
		for(let s of POSParser.sortsToConsiderForTypes) {
			typeSorts.push(o.getSort(s));
			typeSortsWithArity.push([o.getSort(s), 1]);
		}
		typeSortsWithArity.push([pSort,1]);
		typeSortsWithArity.push([pwvSort,2]);
		typeSortsWithArity.push([rSort,2]);
		/*
		for(let t of this.ai.perceptionBuffer) {
			if (t.functor.is_a(oSort) ||
				t.functor.is_a(pSort)) {
				if (t.attributes[0] instanceof ConstantTermAttribute &&
				    (<ConstantTermAttribute>t.attributes[0]).value == ID) {
//					console.log("newContextEntity: adding " + t + " to " + ID);
					e.terms.push(t);
				}
			}
		}
		*/
		for(let te of this.ai.shortTermMemory.plainTermList) {
			if (POSParser.sortIsConsideredForTypes(te.term.functor, o) || 
				te.term.functor.is_a(pSort) ||
				te.term.functor.is_a(pwvSort) ||
				te.term.functor.is_a(rSort)) {
				for(let att of te.term.attributes) {
					if (att instanceof ConstantTermAttribute &&
					    (<ConstantTermAttribute>att).value == ID) {
//						console.log("newContextEntity: adding " + s.terms[0] + " to " + ID);
						e.addTerm(te.term);
					}
				}
			}
		}
		for(let tmp of typeSortsWithArity) {
			for(let s of this.ai.longTermMemory.allSingleTermMatches(<Sort>(tmp[0]), <number>(tmp[1]), o)) {
//				console.log("NLContext: considering sentence " + s);
				for(let att of s.terms[0].attributes) {
					if (att instanceof ConstantTermAttribute &&
					    (<ConstantTermAttribute>att).value == ID) {
//						console.log("newContextEntity: adding " + s.terms[0] + " to " + ID);
						e.addTerm(s.terms[0]);
					}
				}
			}
		}
		if (e.terms.length == 0) {
			if (itsAnExistingOne) this.deleteContextEntity(e);
			return null;
		}
		return e;
	}


	deleteContextEntity(e:NLContextEntity) 
	{
		let idx:number = this.shortTermMemory.indexOf(e);
		if (idx >= 0) this.shortTermMemory.splice(idx, 1);
		idx = this.mentions.indexOf(e);
		if (idx >= 0) this.mentions.splice(idx, 1);
	}


	newLongTermTerm(term:Term)
	{
		for(let ce of this.shortTermMemory) {
			for(let att of term.attributes) {
				if (att instanceof ConstantTermAttribute &&
				    (<ConstantTermAttribute>att).value == ce.objectID.value) {
					if (ce.terms.indexOf(term) == -1) ce.addTerm(term);
				}
			}
		}
		for(let ce of this.mentions) {
			for(let att of term.attributes) {
				if (att instanceof ConstantTermAttribute &&
				    (<ConstantTermAttribute>att).value == ce.objectID.value) {
					if (ce.terms.indexOf(term) == -1) ce.addTerm(term);
				}
			}
		}
	}


	newLongTermStateTerm(term:Term)
	{
		for(let ce of this.shortTermMemory) {
			for(let att of term.attributes) {
				if (att instanceof ConstantTermAttribute &&
				    (<ConstantTermAttribute>att).value == ce.objectID.value) {
					if (ce.terms.indexOf(term) == -1) ce.addStateTerm(term);
				}
			}
		}
		for(let ce of this.mentions) {
			for(let att of term.attributes) {
				if (att instanceof ConstantTermAttribute &&
				    (<ConstantTermAttribute>att).value == ce.objectID.value) {
					if (ce.terms.indexOf(term) == -1) ce.addStateTerm(term);
				}
			}
		}
	}


	// find all the entities mentioned in the clause:
	IDsInPerformative(perf:Term, o:Ontology)
	{
		let IDs:ConstantTermAttribute[] = [];
		if (perf.functor.is_a(o.getSort("perf.callattention")) ||
			perf.functor.is_a(o.getSort("perf.greet")) ||
			perf.functor.is_a(o.getSort("perf.nicetomeetyou")) ||
			perf.functor.is_a(o.getSort("perf.nicetomeetyoutoo")) ||
			perf.functor.is_a(o.getSort("perf.farewell")) ||
			perf.functor.is_a(o.getSort("perf.ack.ok")) ||
			perf.functor.is_a(o.getSort("perf.ack.unsure")) ||
			perf.functor.is_a(o.getSort("perf.ack.contradict")) ||
			perf.functor.is_a(o.getSort("perf.ack.invalidanswer")) ||
			perf.functor.is_a(o.getSort("perf.ack.denyrequest")) ||
			perf.functor.is_a(o.getSort("perf.ackresponse")) ||
			perf.functor.is_a(o.getSort("perf.thankyou")) ||
			perf.functor.is_a(o.getSort("perf.youarewelcome")) ||
			perf.functor.is_a(o.getSort("perf.sentiment")) ||
			perf.functor.is_a(o.getSort("perf.q.howareyou")) ||
			perf.functor.is_a(o.getSort("perf.moreresults")) ||
			perf.functor.is_a(o.getSort("perf.request.repeataction")) ||
			perf.functor.is_a(o.getSort("perf.inform")) ||
		    perf.functor.is_a(o.getSort("perf.q.predicate")) ||
		    perf.functor.is_a(o.getSort("perf.q.predicate-negated")) ||
		    perf.functor.is_a(o.getSort("perf.request.action")) ||
		    perf.functor.is_a(o.getSort("perf.request.stopaction")) ||
		    perf.functor.is_a(o.getSort("perf.q.action")) ||
		    perf.functor.is_a(o.getSort("perf.q.why")) ||
		    perf.functor.is_a(o.getSort("perf.q.how")) ||
			perf.functor.is_a(o.getSort("perf.q.query")) ||
	 	    perf.functor.is_a(o.getSort("perf.q.howmany")) ||
			perf.functor.is_a(o.getSort("perf.rephrase.entity")) ||
		    perf.functor.is_a(o.getSort("perf.q.whereis")) ||
		    perf.functor.is_a(o.getSort("perf.q.whereto")) ||
		    perf.functor.is_a(o.getSort("perf.q.whois.name")) ||
		    perf.functor.is_a(o.getSort("perf.q.whois.noname")) ||
		    perf.functor.is_a(o.getSort("perf.q.whatis.name")) ||
		    perf.functor.is_a(o.getSort("perf.q.whatis.noname")) ||
			perf.functor.is_a(o.getSort("perf.q.when")) ||
			perf.functor.is_a(o.getSort("perf.changemind"))) {
			for(let i:number = 0;i<perf.attributes.length;i++) {
				if (perf.attributes[i] instanceof ConstantTermAttribute) {
					IDs.push(<ConstantTermAttribute>(perf.attributes[i]));
				} else if (perf.attributes[i] instanceof TermTermAttribute) {
					NLContext.searchForIDsInClause((<TermTermAttribute>perf.attributes[i]).term, IDs, o);
				}
			}
		} else {
			console.error("NLContext.newPerformative: unsupported performative " + perf.functor.name);
		}
		return IDs;
	}	

	
	newPerformative(speakerID:string, perfText:string, perf:Term, cause:CauseRecord, o:Ontology, timeStamp:number) : NLContextPerformative[]
	{
		let newPerformatives:NLContextPerformative[] = [];
		if (perf.functor.name=="#list") {
			let parsePerformatives:TermAttribute[] = NLParser.elementsInList(perf, "#list");
			for(let parsePerformative of parsePerformatives) {
				if (parsePerformative instanceof TermTermAttribute) {
					newPerformatives = newPerformatives.concat(this.newPerformative(speakerID, perfText, (<TermTermAttribute>parsePerformative).term, cause, o, timeStamp));
				}
			}
			return newPerformatives;
		}

//		console.log("NLContext.newPerformative: " + perf);

		var cp:NLContextPerformative = new NLContextPerformative(perfText, speakerID, perf, cause, timeStamp);
		let IDs:ConstantTermAttribute[] = this.IDsInPerformative(perf, o);
//		console.log("NLContext.newPerformative IDs found: " + IDs);

		for(let id of IDs) {
			let ce:NLContextEntity = this.newContextEntity(id, this.ai.time_in_seconds, null, o);			
			if (ce != null) {
				let idx:number = this.mentions.indexOf(ce);
				if (idx != -1) this.mentions.splice(idx,1);
				this.mentions.unshift(ce);
			}
		}

		// add the clause:
		this.performatives.unshift(cp);
		while(this.performatives.length > MAX_PERFORMATIVE_MEMORY) {
			this.performatives.pop();
		}

		this.sortEntities();

		if (this.mentions.length > this.mentionMemorySize) {
			this.mentions = this.mentions.slice(0,this.mentionMemorySize);
		}

		// update conversation context:
		this.inConversation = true;
		if (speakerID == this.ai.selfID) {
			this.expectingThankYou = false;
			this.expectingYouAreWelcome = false;
			if (perf.functor.name == "perf.inform.answer") {
				this.expectingThankYou = true;
			} else if (perf.functor.name == "perf.thankyou") {
				this.expectingYouAreWelcome = true;
			}		

			this.expectingGreet = false;
			this.expectingFarewell = false;
			this.expectingNicetomeetyoutoo = false;
			if (perf.functor.name == "perf.greet") {
				this.expectingGreet = true;
			} else if (perf.functor.name == "perf.farewell") {
				this.expectingFarewell = true;
				this.inConversation = false;
			} else if (perf.functor.name == "perf.nicetomeetyou") {
				this.expectingNicetomeetyoutoo = true;
			}

			if (perf.functor.is_a(this.ai.o.getSort("perf.question"))) {
				if (perf.functor.name == "perf.q.how" &&
					perf.attributes.length>=2 &&
					(perf.attributes[1] instanceof TermTermAttribute) &&
					(<TermTermAttribute>perf.attributes[1]).term.functor.name == "verb.help") {
					// no need to push anything to the stack here
				} else {
					this.expectingAnswerToQuestion_stack.push(cp);
					this.expectingAnswerToQuestionTimeStamp_stack.push(this.ai.time_in_seconds);
				}
			}

			if (perf.functor.is_a(this.ai.o.getSort("perf.request.action"))) {
				this.expectingConfirmationToRequest_stack.push(cp);
				this.expectingConfirmationToRequestTimeStamp_stack.push(this.ai.time_in_seconds);
			} else {
				// For now, just clear these stacks if we move on in the conversation, since requests do not necessarily need an answer
				this.expectingConfirmationToRequest_stack = [];
				this.expectingConfirmationToRequestTimeStamp_stack = [];
			}

			this.expectingYes = false;
			if (perf.functor.is_a(this.ai.o.getSort("perf.callattention"))) {
				this.expectingYes = true;
			}
		}

		return [cp];
	}


	popLastQuestion() 
	{
		if (this.expectingAnswerToQuestion_stack.length > 0) {
			this.expectingAnswerToQuestion_stack.splice(this.expectingAnswerToQuestion_stack.length-1,1);
			this.expectingAnswerToQuestionTimeStamp_stack.splice(this.expectingAnswerToQuestionTimeStamp_stack.length-1,1);
		}
	}


	lastPerformativeBy(speaker:string) : NLContextPerformative
	{
		for(let i:number = 0;i<this.performatives.length;i++) {
			if (this.performatives[i].speaker == speaker) return this.performatives[i];
		}
		return null;
	}


	lastPerformativeByExcept(speaker:string, perf:Term) : NLContextPerformative
	{
		for(let i:number = 0;i<this.performatives.length;i++) {
			if (this.performatives[i].speaker == speaker &&
				this.performatives[i].performative != perf) return this.performatives[i];
		}
		return null;
	}


	static searchForIDsInClause(clause:Term, IDs:ConstantTermAttribute[], o:Ontology)
	{
//		console.log("searchForIDsInClause");
		for(let i:number = 0;i<clause.attributes.length;i++) {
			if (clause.attributes[i] instanceof ConstantTermAttribute &&
				clause.attributes[i].sort.name == "#id") {
//					console.log("searchForIDsInClause: " + clause.attributes[0]);
				IDs.push(<ConstantTermAttribute>(clause.attributes[i]));
			} else if (clause.attributes[i] instanceof TermTermAttribute) {
				NLContext.searchForIDsInClause((<TermTermAttribute>clause.attributes[i]).term, IDs, o);
			}
		}
	}


	sortEntities()
	{
		this.shortTermMemory.sort((e1:NLContextEntity, e2:NLContextEntity) => 
			{
				if (e1.distanceFromSpeaker == null &&
					e2.distanceFromSpeaker == null) {
					return 0;
				} else if (e1.distanceFromSpeaker == null) {
					return 1;
				} else if (e2.distanceFromSpeaker == null) {
					return -1;
				} else {
					return e1.distanceFromSpeaker - e2.distanceFromSpeaker;
				}
			});
		this.mentions.sort((e1:NLContextEntity, e2:NLContextEntity) => 
			{
				if (e1.mentionTime == null &&
					e2.mentionTime == null) {
					return 0;
				} else if (e1.mentionTime == null) {
					return 1;
				} else if (e2.mentionTime == null) {
					return -1;
				} else {
					return e2.mentionTime - e1.mentionTime;
				}
			});
//		console.log("sortEntities:\nP: " + this.shortTermMemory + "\nM: " + this.mentions);
	}


	deref(clause:Term, listenerVariable:TermAttribute, o:Ontology, pos:POSParser, AI:RuleBasedAI) : TermAttribute[]
	{
		return this.derefInternal(NLParser.elementsInList(clause, "#and"), listenerVariable, o, pos, AI);
	}


	derefInternal(clauseElements:TermAttribute[], listenerVariable:TermAttribute, o:Ontology, pos:POSParser, AI:RuleBasedAI) : TermAttribute[]
	{
		this.lastDerefErrorType = 0;
		var properNounSort:Sort = o.getSort("proper-noun");
		var nounSort:Sort = o.getSort("noun");
		var pronounSort:Sort = o.getSort("pronoun");
		var personalPronounSort:Sort = o.getSort("personal-pronoun");
		var adjectiveSort:Sort = o.getSort("adjective");
		var determinerSort:Sort = o.getSort("determiner");
		var possessiveDeterminerSort:Sort = o.getSort("possessive-determiner");
		var firstPerson:Sort = o.getSort("first-person");
		var secondPerson:Sort = o.getSort("second-person");
		var thirdPerson:Sort = o.getSort("third-person");
		var relationSort:Sort = o.getSort("relation");
		var spatialRelationSort:Sort = o.getSort("spatial-relation");

		var properNounTerms:Term[] = [];
		var nounTerms:Term[] = [];
		var pronounTerms:Term[] = [];
		var adjectiveTerms:Term[] = [];
		var determinerTerms:Term[] = [];
		var relationTerms:Term[][] = [];
		var otherTerms:Term[] = [];
		var genitiveTerm:Term = null;
		for(let tmp of clauseElements) {
			if (tmp instanceof TermTermAttribute) {
				let tmp2:Term =(<TermTermAttribute>tmp).term;
				 NLParser.resolveCons(tmp2, o);
				if (tmp2.functor.is_a(properNounSort)) {
					properNounTerms.push(tmp2);
				} else if (tmp2.functor.name == "saxon-genitive") {
					if (genitiveTerm != null) {
						console.warn("two saxon genitives in a noun phrase, not supported!");
						return null;
					}
					genitiveTerm = tmp2;
				} else if (tmp2.functor.is_a(nounSort)) {
					nounTerms.push(tmp2);
				} else if (tmp2.functor.is_a(pronounSort)) {
					pronounTerms.push(tmp2);
				} else if (tmp2.functor.is_a(adjectiveSort)) {
					adjectiveTerms.push(tmp2);
				} else if (tmp2.functor.is_a(determinerSort)) {
					determinerTerms.push(tmp2);
				} else if (tmp2.functor.is_a(relationSort)) {
					relationTerms.push([tmp2]);
				} else {
					otherTerms.push(tmp2);
				}
			} else {
				console.error("context.deref: clause contains an element that is not a term!");
			}
		}
		/*
		console.log("context.derefInternal: \n  PN: " + properNounTerms + "\n  N: " + nounTerms + 
					"\n  P:" + pronounTerms + "\n  A: " + adjectiveTerms + "\n  D: " + determinerTerms + 
					"\n  R:" + relationTerms + "\n  O: " + otherTerms);
		*/
		if (genitiveTerm != null) return null;
		let all_determiner:Term = null;
		let other_determiner:Term = null;
		for(let t of determinerTerms) {
			if (t.functor.name == 'all') {
				if (determinerTerms.length == 1) {
					// this clause refers to a hypothetical, and not to entities in the context!
					this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
					return null;
				} else {
					all_determiner = t;
				}
			} else if (t.functor.name == 'determiner.other') {
				other_determiner = t;
			}
		}
		// remove "all" and "other"
		if (all_determiner!=null) determinerTerms.splice(determinerTerms.indexOf(all_determiner), 1);
		if (other_determiner!=null) determinerTerms.splice(determinerTerms.indexOf(other_determiner), 1);

		// we should really only have one determiner other than "all" or "other":
		if (determinerTerms.length>1) {
			console.warn("NLContext.derefInternal: too many determiners other than all/other" + determinerTerms);
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

		if (properNounTerms.length > 0) {
			let output:TermAttribute[] = [];
			for(let properNounTerm of properNounTerms) {
				if (properNounTerm.attributes[0] instanceof ConstantTermAttribute) {
					let name:string = <string>(<ConstantTermAttribute>(properNounTerm.attributes[0])).value;
					//let entity:NLContextEntity = this.findClosestProperNoun(name, o);
					//if (entity != null) output.push(entity.objectID);
					let entities:NLContextEntity[] = this.findAllProperNoun(name, o);
					for(let entity of entities) {
						if (output.indexOf(entity.objectID) == -1) output.push(entity.objectID);
					}
					// console.log("Proper noun match ('"+name+"'): " + output);
				}
			}
			return output;

		} else if (pronounTerms.length > 0) {
			let output:TermAttribute[] = [];
			for(let pronounTerm of pronounTerms) {
				if (pronounTerm.functor.is_a(personalPronounSort)) {
					if (pronounTerm.attributes[3].sort.is_a(firstPerson)) {
						output.push(new ConstantTermAttribute(this.speaker, o.getSort("#id")));
					} else if (pronounTerm.attributes[3].sort.is_a(secondPerson)) {
						output.push(listenerVariable);
					} else if (pronounTerm.attributes[3].sort.is_a(thirdPerson)) {
						// get the gender, only characters can match with "he"/"she", and only live humans do not match with "it"
						let gender:number = -1;
						if (pronounTerm.attributes[2].sort.name == "gender-masculine") gender = 0;
						else if (pronounTerm.attributes[2].sort.name == "gender-femenine") gender = 1;
						else if (pronounTerm.attributes[2].sort.name == "gender-neutral") gender = 2;

						// find the most recent mention that could match with "the pronoun
						let entity:NLContextEntity = null;

						for(let e2 of this.mentions) {
							if (gender == 0 || gender == 1) if (!e2.sortMatch(o.getSort("character"))) continue;
							if (gender == 2) if (e2.sortMatch(o.getSort("human")) &&
												 !e2.sortMatch(o.getSort("corpse"))) continue;

							if (e2.objectID.value != this.speaker && e2.objectID.value != this.ai.selfID) {
//								console.log("it: considering " + e2.objectID.value);
								if (entity == null) {
									entity = e2;
								} else {
									if (entity.mentionTime > e2.mentionTime) {
										// we found it!
										break;
									}
									// there is ambiguity... abort!
									this.lastDerefErrorType = DEREF_ERROR_CANNOT_DISAMBIGUATE;
									entity = null;
									break;
								}
							}
						}
						if (entity != null) output.push(entity.objectID);
					} else {
						console.log("context.deref: unknown person dereferencing personal pronoun: " + clauseElements);
					}
				} else {
					if (pronounTerm.attributes[0] instanceof ConstantTermAttribute) {
						let pronounType:string = (<ConstantTermAttribute>pronounTerm.attributes[0]).value;
						if (pronounType == "pronoun.everybody") {
							// match with all the known "character" entities:
							let tmp:NLContextEntity[][] = this.findEntitiesOfSort(o.getSort("character"), o);
							let allCharacters:NLContextEntity[] = [];
							for(let tmpl of tmp) {
								for(let ce of tmpl) {
									if (allCharacters.indexOf(ce)==-1) allCharacters.push(ce);
								}
							}
							for(let ce of allCharacters) {
								output.push(ce.objectID);
							}
						} else if (pronounType == "pronoun.everybody.else") {
							// match with all the known "character" entities, except speaker and listener:
							let tmp:NLContextEntity[][] = this.findEntitiesOfSort(o.getSort("character"), o);
							let allCharacters:NLContextEntity[] = [];
							for(let tmpl of tmp) {
								for(let ce of tmpl) {
									if (allCharacters.indexOf(ce)==-1) allCharacters.push(ce);
								}
							}
							for(let ce of allCharacters) {
								if (ce.objectID.value != this.speaker &&
									ce.objectID.value != this.ai.selfID)
								output.push(ce.objectID);
							}
						}
					} else {
						console.log("context.deref: unsupported pronoun! " + pronounTerm);					
					}
				}
			}	
			if (output.length == 0) {
				this.lastDerefErrorType = DEREF_ERROR_NO_REFERENTS;
				return null;
			}		
			return output;
		} else if (nounTerms.length == 1) {
			let output:TermAttribute[] = [];
			for(let nounTerm of nounTerms) {
				if (nounTerm.attributes.length == 2 &&
					nounTerm.attributes[0] instanceof ConstantTermAttribute &&
					(<ConstantTermAttribute>nounTerm.attributes[0]).value == "space.here") {
					// find the location of the speaker:
					let hereEntity:NLContextEntity = this.findLocationOfID(this.speaker);
					if (hereEntity != null) {
						return [hereEntity.objectID];
					}

				} else if (nounTerm.attributes.length == 2 &&
						   nounTerm.attributes[0] instanceof ConstantTermAttribute &&
						   (<ConstantTermAttribute>nounTerm.attributes[0]).value == "space.there") {
					// Find if there is a location we just talked about (and that is not the place where the speaker is):
					let hereEntity:NLContextEntity = this.findLocationOfID(this.speaker);
					let thereEntity:NLContextEntity = null;
					let entities_mpl:NLContextEntity[][] = this.findEntitiesOfSort(o.getSort("space.location"), o);
					let candidateThereEntities:NLContextEntity[] = this.applySingularTheDeterminer(entities_mpl);
					if (candidateThereEntities != null && candidateThereEntities.length == 1) thereEntity = candidateThereEntities[0];
					if (thereEntity != null && thereEntity != hereEntity) {
						return [thereEntity.objectID];
					}

				} else if (nounTerm.attributes.length == 2 &&
						   nounTerm.attributes[0] instanceof ConstantTermAttribute &&
						   (<ConstantTermAttribute>nounTerm.attributes[0]).value == "space.outside") {
					// Find the most specific location that is "outdoers" and the player is in right now
					let outsideEntity:NLContextEntity = this.findMostSpecificOutdoorLocationOfID(this.speaker, o);
					if (outsideEntity != null) {
						return [outsideEntity.objectID];
					}					

				} else if (nounTerm.attributes.length == 2 &&
						   nounTerm.attributes[0] instanceof ConstantTermAttribute) {
					let name:string = <string>(<ConstantTermAttribute>(nounTerm.attributes[0])).value;
					let nameSort:Sort = o.getSortSilent(name);
					let grammaticalNumberSort:Sort = nounTerm.attributes[1].sort;
					let singular:boolean = false;
					if (grammaticalNumberSort.name == "singular") singular = true;

					if (nameSort != null) {
						// See if we have any determiners that will modify the search:
						// - "the" -> resolve to the latest one mentioned if there is more than one (if it's from shortTermMemory, and there is more than one, then fail)
						// - "every" -> change from singular to plural
						// - possessive: -> look for "owned-by" relationship
						// - "this" -> if it's a mention, consider the closest one, if it's in shortTermMemory, look for the closest one to the character
						// - "these" -> (ignore)
						// - "that" -> if it's a mention, consider the second one, if it's in shortTermMemory, consider the further one
						// - "those" -> (ignore)
						// - "other" -> removes all the matches from short term memory or from mentions

						// "a" -> ???
						// "some"/"any"/"much"/"many" -> ???
						let the_determiner:boolean = false;
//						let a_determiner:boolean = false;
						let this_determiner:boolean = false;
						let that_determiner:boolean = false;

						// console.log("context.derefInternal: nounTerm = " + nounTerm);

						for(let determinerTerm of determinerTerms) {
							let determinerNumberSort:Sort = determinerTerm.attributes[1].sort;
							if (determinerTerm.functor.name == "the") {
//								if (singular) {
									the_determiner = true;
//								} else {
									// ignore for now ...
//								}
							} else if (determinerTerm.functor.name == "every") {
								singular = false;
							} else if (determinerTerm.functor.name == "close-demonstrative-determiner") {
								if (determinerNumberSort.name == "singular") this_determiner = true;
								// if it's plural ("these"), ignore
							} else if (determinerTerm.functor.name == "far-demonstrative-determiner") {
								if (determinerNumberSort.name == "singular") that_determiner = true;
								// if it's plural ("those"), ignore
							} else if (determinerTerm.functor.is_a(possessiveDeterminerSort)) {
								if (determinerTerm.functor.name == "determiner.my") {
									// find owner:
//									var ownerRelation:Term = Term.fromString("verb.own('"+this.speaker+"'[#id])", o);
//									ownerRelation.addAttribute(determinerTerm.attributes[0]);
//									relationTerms.push(ownerRelation);
									let belongsRelation:Term = new Term(o.getSort("verb.own"), 
																	    [new ConstantTermAttribute(this.speaker, o.getSort("#id")),
																	     determinerTerm.attributes[0]]);
									let haveRelation:Term = new Term(o.getSort("verb.have"), 
																	    [new ConstantTermAttribute(this.speaker, o.getSort("#id")),
																	     determinerTerm.attributes[0]]);
									relationTerms.push([belongsRelation, haveRelation]);
								} else if (determinerTerm.functor.name == "determiner.your") {
									// find owner:
//									let ownerRelation:Term = Term.fromString("verb.own('"+this.ai.selfID+"'[#id])", o);
//									ownerRelation.addAttribute(determinerTerm.attributes[0]);
//									relationTerms.push(ownerRelation);
									let belongsRelation:Term = new Term(o.getSort("verb.own"), 
																	    [new ConstantTermAttribute(this.ai.selfID, o.getSort("#id")),
																	     determinerTerm.attributes[0]]);
									let haveRelation:Term = new Term(o.getSort("verb.have"), 
																	    [new ConstantTermAttribute(this.ai.selfID, o.getSort("#id")),
																	     determinerTerm.attributes[0]]);
									relationTerms.push([belongsRelation, haveRelation]);
								} else {
									console.log("context.deref: determiner " + determinerTerm + " not yet supported!");
								}
							} else if (determinerTerm.functor.name == "a") {
//								a_determiner = true;
								console.log("context.deref: determiner " + determinerTerm + " is invalid in contex dereference!");
								return null;
							} else {
								console.log("context.deref: determiner " + determinerTerm + " not yet supported!");
							}
						}

						//console.log("nameSort: '" + nameSort + "'");
						//console.log("relationTerms: '" + relationTerms + "'");
						let entities_mpl:NLContextEntity[][] = this.findEntitiesOfSort(nameSort, o);
						if (entities_mpl == null) {
							console.log("No entities match name constraint '" + nameSort + "'");
							this.lastDerefErrorType = DEREF_ERROR_NO_REFERENTS;
							return null;
						}

						// if we are asking about "other" things, then we refer to those "other than" those we were just talking about,
						// thus, remove all matches from short term memory or mentions:
						if (other_determiner) {
							for(let e of entities_mpl[0]) {
								if (entities_mpl[2].indexOf(e) != -1) entities_mpl[2].splice(entities_mpl[2].indexOf(e),1);
							}
							for(let e of entities_mpl[1]) {
								if (entities_mpl[2].indexOf(e) != -1) entities_mpl[2].splice(entities_mpl[2].indexOf(e),1);
							}
							entities_mpl[0] = [];
							entities_mpl[1] = [];
						}
						//console.log("entities_mpl: " + entities_mpl);
						// adjectives:
						for(let adjectiveTerm of adjectiveTerms) {
							if (Term.equalsNoBindingsAttribute(nounTerm.attributes[0], 
															   adjectiveTerm.attributes[0]) == 1 &&
								adjectiveTerm.attributes[1] instanceof ConstantTermAttribute) {
//								console.log("clauseElements: " + clauseElements);
//								console.log("nounTerm: " + nounTerm);
//								console.log("adjectiveTerm: " + adjectiveTerm);
								let adjectiveStr:string = <string>((<ConstantTermAttribute>adjectiveTerm.attributes[1]).value);
								let specificAdjectiveSort:Sort = o.getSort(adjectiveStr);
								if (specificAdjectiveSort != null) {
//										console.log("adjective sort: " + specificAdjectiveSort.name);
									entities_mpl = this.filterByAdjective(specificAdjectiveSort, entities_mpl, o);
								}
//								} else {
//									console.log("  discarded... (didn't match noun)");
							}
						}	
						//console.log("entities_mpl (after adjectives): " + entities_mpl);

						// apply relations:
						for(let relationTermL of relationTerms) {
							let relationTerm:Term = relationTermL[0];
//							console.log("Before " + relationTerm + ": " + entities_mpl[0].length + ", " + entities_mpl[1].length + ", " + entities_mpl[2].length);
							// check if it's a spatial relation (which are not in the logic representation, to save computation requirements):
							if (relationTerm.functor.is_a(spatialRelationSort)) {
								if (Term.equalsNoBindingsAttribute(nounTerm.attributes[0], 
																   relationTerm.attributes[0]) == 1 &&
									relationTerm.attributes[1] instanceof ConstantTermAttribute) {
									let otherEntityID:string = (<ConstantTermAttribute>(relationTerm.attributes[1])).value;
									let results_mpl:NLContextEntity[][] = [];
									for(let entities of entities_mpl) {
										let results:NLContextEntity[] = [];
										for(let entity of entities) {
											let spatialRelations:Sort[] = AI.spatialRelations(entity.objectID.value, otherEntityID);
	//											console.log("spatialRelations ("+entity.objectID.value+"): " + spatialRelations);
											if (spatialRelations != null) {
												//console.log("    spatialRelations != null");
												for(let sr of spatialRelations) {
													if (relationTerm.functor.subsumes(sr)) {
														results.push(entity);
														break;
													}
												}
											} else {
												let tmp:TermAttribute = relationTerm.attributes[0];
												relationTerm.attributes[0] = entity.objectID;
												//console.log("    spatialRelations == null, checking manually (1) for " + relationTerm);
												if (results.indexOf(entity) == -1 && 
													entity.relationMatch(relationTerm, o, pos)) results.push(entity);
												relationTerm.attributes[0] = tmp;
											}
										}
										results_mpl.push(results);
									}
									entities_mpl = results_mpl;
								} else if (Term.equalsNoBindingsAttribute(nounTerm.attributes[0], 
																   		  relationTerm.attributes[1]) == 1 &&
									relationTerm.attributes[0] instanceof ConstantTermAttribute) {
									let otherEntityID:string = (<ConstantTermAttribute>(relationTerm.attributes[0])).value;
									let results_mpl:NLContextEntity[][] = [];
									for(let entities of entities_mpl) {
										let results:NLContextEntity[] = [];
										for(let entity of entities) {
											let spatialRelations:Sort[] = AI.spatialRelations(entity.objectID.value, otherEntityID);
//											console.log("spatialRelations ("+entity.objectID.value+"): " + spatialRelations);
											if (spatialRelations != null) {
												console.log("    spatialRelations != null");
												for(let sr of spatialRelations) {
													if (relationTerm.functor.subsumes(sr)) {
														results.push(entity);
														break;
													}
												}
											} else {
												let tmp:TermAttribute = relationTerm.attributes[0];
												relationTerm.attributes[1] = entity.objectID;
												console.log("    spatialRelations == null, checking manually (2) for " + relationTerm);
												if (results.indexOf(entity) == -1 && 
													entity.relationMatch(relationTerm, o, pos)) results.push(entity);
												relationTerm.attributes[1] = tmp;
											}
										}
										results_mpl.push(results);
									}
									entities_mpl = results_mpl;
								}
								//console.log("After " + relationTerm + ": " + entities_mpl[0].length + ", " + entities_mpl[1].length + ", " + entities_mpl[2].length);
							} else {
								if (Term.equalsNoBindingsAttribute(nounTerm.attributes[0], 
																   relationTerm.attributes[0]) == 1 &&
									relationTerm.attributes[1] instanceof ConstantTermAttribute) {
	//								console.log("Considering relation (1): " + relationTerm);
									entities_mpl = this.filterByAtLeastOneRelation1(relationTermL, entities_mpl, o, pos);
								} else if (Term.equalsNoBindingsAttribute(nounTerm.attributes[0], 
																   relationTerm.attributes[1]) == 1 &&
									relationTerm.attributes[0] instanceof ConstantTermAttribute) {
	//								console.log("Considering relation (2): " + relationTerm);
									entities_mpl = this.filterByAtLeastOneRelation2(relationTermL, entities_mpl, o, pos);
								}
							}
						}	
						//console.log("entities_mpl (after relations): " + entities_mpl);

						if (entities_mpl[0].length == 0 &&
							entities_mpl[1].length == 0 &&
							entities_mpl[2].length == 0) {
							this.lastDerefErrorType = DEREF_ERROR_NO_REFERENTS;
							return null;
						}

						if (this_determiner || that_determiner) {
							// remove both the speaker and listener:
							let toDelete:NLContextEntity[] = [];
							for(let e of entities_mpl[1]) {
								if (e.objectID.value == this.speaker ||
									e.objectID.value == this.ai.selfID) {
									toDelete.push(e);
								}
							}
							for(let e of toDelete) {
								entities_mpl[1].splice(entities_mpl[1].indexOf(e), 1);
							}
							
							// sort!
							entities_mpl[1].sort((e1:NLContextEntity, e2:NLContextEntity) => 
								{
									if (e1.distanceFromSpeaker == null &&
										e2.distanceFromSpeaker == null) {
										return 0;
									} else if (e1.distanceFromSpeaker == null) {
										return 1;
									} else if (e2.distanceFromSpeaker == null) {
										return -1;
									} else {
										return e1.distanceFromSpeaker - e2.distanceFromSpeaker;
									}
								});
						}

//						console.log("Before determiners: \nM: " + entities_mpl[0] + "\nP: " + entities_mpl[1] + "\nL: " + entities_mpl[2]);
//						if (determinerTerms.length > 0) {
//							console.log("Context: \nM:" + this.mentions + "\nP:" + this.shortTermMemory);
//						}
						// apply determiners:
						// If there is no determiners, assume a "the":
						if (determinerTerms.length == 0) the_determiner = true;
						let entities:NLContextEntity[] = null;
						if (the_determiner) {
							if (singular) {
								entities = this.applySingularTheDeterminer(entities_mpl);
							} else {
								entities = entities_mpl[0].concat(entities_mpl[1]).concat(entities_mpl[2]);
							}
//							console.log("the determiner with entities_mpl: " + entities_mpl + "\nResult: " + entities);
						} else if (this_determiner) {
							// remove the speaker, and the content of the inventory from the list of candidates:
							// since it's very weird to use "this" to refer to the inventory... (but
							// we save it in ``toConsiderIfNoneLeft" just in case...)
							let toDelete:NLContextEntity[] = []
							let toConsiderIfNoneLeft:NLContextEntity[] = []
							for(let idx:number = 0;idx<entities_mpl[1].length;idx++) {
								if (entities_mpl[1][idx].objectID.value == this.speaker) {
									toDelete.push(entities_mpl[1][idx]);
								} else if (entities_mpl[1][idx].distanceFromSpeaker == 0 &&
										   entities_mpl[1][idx].relationMatch(new Term(o.getSort("verb.have"),[new ConstantTermAttribute(this.speaker, o.getSort("#id")),
										   																	  entities_mpl[1][idx].objectID]), o, pos)) {
									toDelete.push(entities_mpl[1][idx]);
									toConsiderIfNoneLeft.push(entities_mpl[1][idx])
								} else {
									// see if the object is contained in any other object we can see, and also remove:
									for(let t of entities_mpl[1][idx].terms) {
										if (t.functor.is_a(this.cache_sort_contains) &&
											t.attributes.length>=2 &&
											Term.equalsAttribute(t.attributes[1], entities_mpl[1][idx].objectID, new Bindings())) {
											toDelete.push(entities_mpl[1][idx]);
										}
									}
								}
							}
							for(let e of toDelete) {
								entities_mpl[1].splice(entities_mpl[1].indexOf(e), 1);
							}

							if (entities_mpl[1].length>0) {
								// get the one that is closest to the speaker:
								if (entities_mpl[1].length>1) {
									if ((entities_mpl[1][0].distanceFromSpeaker < 
										 entities_mpl[1][1].distanceFromSpeaker) ||
										(entities_mpl[1][0].distanceFromSpeaker != null &&
									     entities_mpl[1][1].distanceFromSpeaker == null)) {
										if (entities_mpl[1][0].distanceFromSpeaker < MAXIMUM_DISTANCE_TO_BE_CONSIDERED_THIS) {
											entities = [entities_mpl[1][0]];
										}
									} else {
										// several locations are equally close (TODO: think to see if there is a way to disambiguate further)
										// ...

										// the two closest entities are at the same distance, we cannot disambiguate!
									}
								} else {
									if (entities_mpl[1][0].distanceFromSpeaker < MAXIMUM_DISTANCE_TO_BE_CONSIDERED_THIS) {
										entities = [entities_mpl[1][0]];
									}
								}
							}
							if (entities == null) {
								if (entities_mpl[0].length == 1) {
									entities = [entities_mpl[0][0]];
								} else if (entities_mpl[2].length==1) {
									entities = [entities_mpl[2][0]];
								} else {
									entities = [];
								}
							}
							// If we cannot find the entity we are looking for but one entity in the inventory matches, then maybe
							// the speaker refers to that one:
							if (entities.length == 0 && toConsiderIfNoneLeft.length == 1) {
								entities = toConsiderIfNoneLeft;
							}
//							console.log("\"this\" determiner with entities_mpl: " + entities_mpl + "\nResult: " + entities);
						} else if (that_determiner) {
							if (entities_mpl[0].length == 1) {
								entities = [entities_mpl[0][0]];
							} else if (entities_mpl[1].length == 1) {
								entities = [entities_mpl[1][0]];
							} else if (entities_mpl[1].length == 2) {
								// get the one that is further to the speaker:
								if (entities_mpl[1][0].distanceFromSpeaker < 
									entities_mpl[1][1].distanceFromSpeaker) {
									entities = [entities_mpl[1][1]];
								} else {
									// the two closest entities are at the same distance, we cannot disambiguate!
									entities = [];			
								}
							} else if (entities_mpl[2].length==1) {
								entities = [entities_mpl[2][0]];
							} else {
								entities = [];
							}
//						} else if (a_determiner) {
//							// just get the first one if it exists:
//							entities = entities_mpl[0].concat(entities_mpl[1]).concat(entities_mpl[2]);
//							if (entities.length>0) entities = [entities[0]];
						} else {
							// if there is no determiner, then this should not be a context dereference ...
							entities = entities_mpl[0].concat(entities_mpl[1]).concat(entities_mpl[2]);
						}
						entities = removeListDuplicates(entities);
						// consider grammatical number:
						if (entities.length == 1) {
							output.push(entities[0].objectID);
						} else if (entities.length > 1) {
							if (singular) {
//								 console.log("NLContext.deref noun: more than one entity matches a singular noun constraint ("+nameSort.name+"): " + entities);
							} else {
								for(let e of entities) {
									output.push(e.objectID);
								}
							}
						} else {
//							console.log("NLContext.deref noun: no entity matches the noun constraint ("+nameSort.name+")");
						}
						/*
						if (determinerTerms.length > 0) {
							console.log("After determiners/number: " + output);
						}
						*/					
					}
				}
			}
			if (output.length == 0) this.lastDerefErrorType = DEREF_ERROR_CANNOT_DISAMBIGUATE;
			//console.log("output: " + output);
			return output;
		} else if (nounTerms.length > 1) {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

		this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
		return null;		
	}


	/*
		- Given a list containing [entities in mentions, entities in short term memory, entities in long-term memory]
		- This function returns the list of entities that the deteminer "the" (singular) refers to
		- If no entity applies, then it will return an empty list
	*/
	applySingularTheDeterminer(msl:NLContextEntity[][]) : NLContextEntity[]
	{
		if (msl[0].length == 1) {
			// mentions:
			return [msl[0][0]];
		} else if (msl[0].length>1) {
			// mentions:
			// console.log("    msl[0][0].mentionTime: " + msl[0][0].mentionTime + " (" + msl[0][0].objectID + ")");
			// console.log("    msl[0][1].mentionTime: " + msl[0][1].mentionTime + " (" + msl[0][0].objectID + ")");
			if (msl[0][0].mentionTime > 
				msl[0][1].mentionTime) {
				return [msl[0][0]];
			} else {
				// the two closest entities were mentioned at the same time, we cannot disambiguate!
				return [];
			}
		} else if (msl[1].length==1) {
			// short term memory:
			return [msl[1][0]];
		} else if (msl[1].length>1) {
			// short term memory:
			let d1:number = msl[1][0].distanceFromSpeaker;
			let d2:number = msl[1][1].distanceFromSpeaker;
			// if the distance d1 is smaller than d2:
			if (d1 != null && d2 != null) {
				// if the distance d1 is SIGNIFICANTLY smaller than d2:
				//if (d1 <= 32 && d2 >= 64) return [msl[1][0]];
				if (d1 < d2) return [msl[1][0]];
			}
			return [];
		} else if (msl[2].length==1) {
			return [msl[2][0]];
		}
		return [];
	}


	findLocationOfID(id:string) : NLContextEntity
	{
		for(let entity of this.shortTermMemory) {
			if (entity.objectID.value == id) {
				for(let t of entity.terms) {
					if (t.functor.is_a(this.cache_sort_space_at) &&
						t.attributes.length == 2 &&
						t.attributes[0] instanceof ConstantTermAttribute &&
						t.attributes[1] instanceof ConstantTermAttribute &&
						(<ConstantTermAttribute>t.attributes[0]).value == id) {
						return this.findByID((<ConstantTermAttribute>t.attributes[1]).value);
					}
				}
			}
		}
		for(let entity of this.mentions) {
			if (entity.objectID.value == id) {
				for(let t of entity.terms) {
					if (t.functor.is_a(this.cache_sort_space_at) &&
						t.attributes.length == 2 &&
						t.attributes[0] instanceof ConstantTermAttribute &&
						t.attributes[1] instanceof ConstantTermAttribute &&
						(<ConstantTermAttribute>t.attributes[0]).value == id) {
						return this.findByID((<ConstantTermAttribute>t.attributes[1]).value);
					}
				}
			}
		}
		return null;		
	}


	findMostSpecificOutdoorLocationOfID(id:string, o:Ontology) : NLContextEntity
	{
		let open:NLContextEntity[] = [];
		let closed:NLContextEntity[] = [];
		let outdoors_sort:Sort = o.getSort("outdoor.location");

		for(let entity of this.shortTermMemory) {
			if (entity.objectID.value == id) {
				for(let t of entity.terms) {
					if (t.functor.is_a(this.cache_sort_space_at) &&
						t.attributes.length == 2 &&
						t.attributes[0] instanceof ConstantTermAttribute &&
						t.attributes[1] instanceof ConstantTermAttribute &&
						(<ConstantTermAttribute>t.attributes[0]).value == id) {
						open.push(entity);
					}
				}
			}
		}

		while(open.length>0) {
			let current:NLContextEntity = open[0];
			open.splice(0,1);
			closed.push(current);
			for(let t of current.terms) {
				if (t.functor.is_a(outdoors_sort)) {
					return current;
				}
				if (t.functor.is_a(this.cache_sort_space_at) &&
					t.attributes.length == 2 &&
					t.attributes[0] instanceof ConstantTermAttribute &&
					t.attributes[1] instanceof ConstantTermAttribute &&
					(<ConstantTermAttribute>t.attributes[0]).value == current.objectID.value) {
					let next:NLContextEntity = this.findByID((<ConstantTermAttribute>t.attributes[1]).value);
					if (next != null && closed.indexOf(next) == -1 && open.indexOf(next) == -1) open.push(next);
				}
			}
		}
		return null;		
	}


	findByID(id:string) : NLContextEntity
	{
		for(let entity of this.shortTermMemory) {
			if (entity.objectID.value == id) return entity;
		}
		for(let entity of this.mentions) {
			if (entity.objectID.value == id) return entity;
		}
		return null;
	}


	findClosestProperNoun(name:string, o:Ontology) : NLContextEntity
	{
//		console.log("NLContext.findClosestProperNoun: " + name);
		for(let entity of this.shortTermMemory) {
			if (entity.properNounMatch(name)) return entity;
		}
		for(let entity of this.mentions) {
			if (entity.properNounMatch(name)) return entity;
		}

		let nameSort:Sort = o.getSort("name");
		for(let s of this.ai.longTermMemory.allSingleTermMatches(nameSort, 2, o)) {
			if (s.terms[0].functor == nameSort && 
				s.terms[0].attributes[1] instanceof ConstantTermAttribute &&
				(<ConstantTermAttribute>s.terms[0].attributes[1]).value == name) {
				let e:NLContextEntity = this.newContextEntity(<ConstantTermAttribute>(s.terms[0].attributes[0]), this.ai.time_in_seconds, null, o);
				if (e != null) return e;
			}
		}
		return null;
	}



	findAllProperNoun(name:string, o:Ontology) : NLContextEntity[]
	{
		let matches:NLContextEntity[] = [];
		for(let entity of this.shortTermMemory) {
			if (entity.properNounMatch(name)) matches.push(entity);
		}
		for(let entity of this.mentions) {
			if (entity.properNounMatch(name)) matches.push(entity);
		}

		let nameSort:Sort = o.getSort("name");
		for(let s of this.ai.longTermMemory.allSingleTermMatches(nameSort, 2, o)) {
			if (s.terms[0].functor == nameSort && 
				(s.terms[0].attributes[0] instanceof ConstantTermAttribute) &&
				(s.terms[0].attributes[1] instanceof ConstantTermAttribute) &&
				(<ConstantTermAttribute>s.terms[0].attributes[1]).value == name) {
				//console.log("    findAllProperNoun: '"+(<ConstantTermAttribute>s.terms[0].attributes[0]).value+"'");
				let e:NLContextEntity = this.newContextEntity(<ConstantTermAttribute>(s.terms[0].attributes[0]), this.ai.time_in_seconds, null, o);
				if (e != null) {
					matches.push(e);
				} else {
					// console.log("    findAllProperNoun: failed to create entity for name '"+name+"'");
				}
			}
		}
		return matches;
	}	


	// returns 3 arrays, containins matches in mentions, shortTermMemory and long-term memory
	findEntitiesOfSort(sort:Sort, o:Ontology) : NLContextEntity[][]
	{
		let results_mpl:NLContextEntity[][] = [];
		let results:NLContextEntity[] = [];
		let any_match:boolean = false;

		for(let entity of this.mentions) {
			if (entity.sortMatch(sort)) {
				results.push(entity);
				any_match = true;
			}
		}
		results_mpl.push(results);
		results = [];
		for(let entity of this.shortTermMemory) {
			if (entity.sortMatch(sort)) {
				results.push(entity);
				any_match = true;
			}
		}
		results_mpl.push(results);

		if (any_match) {
			// if we have found something on shortTermMemory or mentions, do not check for long-term memory:
			results_mpl.push([]);
			return results_mpl;
		}

		results = [];
		for(let s of this.ai.longTermMemory.allSingleTermMatches(sort, 1, o)) {
			if (s.terms[0].functor.is_a(sort) &&
				s.terms[0].attributes[0] instanceof ConstantTermAttribute) {
				let e:NLContextEntity = this.newContextEntity(<ConstantTermAttribute>(s.terms[0].attributes[0]), this.ai.time_in_seconds, null, o);
				if (e != null) results.push(e);
			}
		}
		results_mpl.push(results);
		return results_mpl;
	}


	// returns 3 arrays, containins matches in mentions, shortTermMemory and long-term memory
	filterByAdjective(adjective:Sort, entities_mpl:NLContextEntity[][], o:Ontology) : NLContextEntity[][]
	{
//		console.log("filterByAdjective: " + adjective);
		var results_mpl:NLContextEntity[][] = [];
		for(let entities of entities_mpl) {
			let results:NLContextEntity[] = [];
			for(let entity of entities) {
				if (entity.adjectiveMatch(adjective, o)) results.push(entity);
			}
			results_mpl.push(results);
		}

		return results_mpl;
	}


	// returns 3 arrays, containins matches in mentions, shortTermMemory and long-term memory
	filterByRelation1(relation:Term, entities_mpl:NLContextEntity[][], o:Ontology, pos:POSParser) : NLContextEntity[][]
	{
		var results_mpl:NLContextEntity[][] = [];
		for(let entities of entities_mpl) {
			let results:NLContextEntity[] = [];
			for(let entity of entities) {
				let tmp:TermAttribute = relation.attributes[0];
				relation.attributes[0] = entity.objectID;
				if (entity.relationMatch(relation, o, pos)) results.push(entity);
				relation.attributes[0] = tmp;
			}
			results_mpl.push(results);
		}

		return results_mpl;
	}


	// returns 3 arrays, containins matches in mentions, shortTermMemory and long-term memory
	filterByAtLeastOneRelation1(relationL:Term[], entities_mpl:NLContextEntity[][], o:Ontology, pos:POSParser) : NLContextEntity[][]
	{
		var results_mpl:NLContextEntity[][] = [];
		for(let entities of entities_mpl) {
			let results:NLContextEntity[] = [];
			for(let entity of entities) {
				for(let relation of relationL) {
					let tmp:TermAttribute = relation.attributes[0];
					relation.attributes[0] = entity.objectID;
					if (results.indexOf(entity) == -1 && 
						entity.relationMatch(relation, o, pos)) results.push(entity);
					relation.attributes[0] = tmp;
				}
			}
			results_mpl.push(results);
		}

		return results_mpl;
	}


	// returns 3 arrays, containins matches in mentions, shortTermMemory and long-term memory
	filterByRelation2(relation:Term, entities_mpl:NLContextEntity[][], o:Ontology, pos:POSParser) : NLContextEntity[][]
	{
		var results_mpl:NLContextEntity[][] = [];
		for(let entities of entities_mpl) {
			let results:NLContextEntity[] = [];
			for(let entity of entities) {
				let tmp:TermAttribute = relation.attributes[1];
				relation.attributes[1] = entity.objectID;
				if (entity.relationMatch(relation, o, pos)) results.push(entity);
				relation.attributes[1] = tmp;
			}
			results_mpl.push(results);
		}

		return results_mpl;
	}


	// returns 3 arrays, containins matches in mentions, shortTermMemory and long-term memory
	filterByAtLeastOneRelation2(relationL:Term[], entities_mpl:NLContextEntity[][], o:Ontology, pos:POSParser) : NLContextEntity[][]
	{
		var results_mpl:NLContextEntity[][] = [];
		for(let entities of entities_mpl) {
			let results:NLContextEntity[] = [];
			for(let entity of entities) {
				for(let relation of relationL) {
					let tmp:TermAttribute = relation.attributes[1];
					relation.attributes[1] = entity.objectID;
					if (results.indexOf(entity) == -1 && 
						entity.relationMatch(relation, o, pos)) results.push(entity);
					relation.attributes[1] = tmp;
				}
			}
			results_mpl.push(results);
		}

		return results_mpl;
	}


	// Attempts to complete verb arguments by looking at previous sentences in the context. For example, if some one says:
	// "Do you know my password?"
	// and then "Would qwerty know?" -> then the parameter "my password" should be transferred to the "qwerty know" verb
	completeVerbArgumentsFromContext(verb:Term, outputVariable:TermAttribute, o:Ontology) : TermAttribute[]
	{
		if (verb.attributes.length == 0) return null;

		let verbSort:Sort = verb.functor;
		let firstAttribute:TermAttribute = verb.attributes[0];
		let nAttributes:number = verb.attributes.length;
		if (verbSort.name == "#cons") {
			nAttributes = verb.attributes.length-1;
			if (verb.attributes.length>=2 &&
				verb.attributes[0] instanceof ConstantTermAttribute) {
				verbSort = o.getSort((<ConstantTermAttribute>verb.attributes[0]).value);
				firstAttribute = verb.attributes[1];
			} else {
				return null;
			}
		}

		// get the last performative by each agent:
		let performativesToConsider:NLContextPerformative[] = [];
		{
			let perf:NLContextPerformative = this.lastPerformativeBy(this.ai.selfID);
			if (perf != null) performativesToConsider.push(perf);
			perf = this.lastPerformativeBy(this.speaker);
			if (perf != null) performativesToConsider.push(perf);
		}

		let possibleOutputs:TermAttribute[] = []
		for(let perf of performativesToConsider) {
			let verb2:Term = perf.performative.findSubtermWithFunctorSort(verbSort)
			if (verb2 != null) {
				// found it! reconstruct a possible verb:
				let output:Term = new Term(verbSort, [firstAttribute]);
				for(let i:number = 1;i<verb2.attributes.length;i++) {
					output.attributes.push(verb2.attributes[i]);
				}
				possibleOutputs.push(new TermTermAttribute(output))
			}
		}

		if (possibleOutputs.length == 0) {
			if (verbSort.is_a(o.getSort("verb.know"))) {
				for(let perf of performativesToConsider) {
					if (perf.performative.functor.name == "perf.q.query" &&
						perf.performative.attributes.length == 3) {
						let output:Term = new Term(verbSort, [firstAttribute, 
															  perf.performative.attributes[2]]);
						possibleOutputs.push(new TermTermAttribute(output))
					} else {
/*
					    <sort name="perf.question" super="perf.request"/>
					    <sort name="perf.q.predicate" super="perf.question"/>
					    <sort name="perf.q.predicate-negated" super="perf.question"/>
					    <sort name="perf.q.whereis" super="perf.question"/>
					    <sort name="perf.q.whereto" super="perf.question"/>
					    <sort name="perf.q.query-followup" super="perf.q.query"/>
					    <sort name="perf.q.whois.name" super="perf.question"/>
					    <sort name="perf.q.whois.noname" super="perf.question"/>
					    <sort name="perf.q.whatis.name" super="perf.question"/>
					    <sort name="perf.q.whatis.noname" super="perf.question"/>
					    <sort name="perf.q.action" super="perf.question,perf.request.action"/> <!-- this is similar to perf.request.action, except that it is a question, rather than a command -->
					    <sort name="perf.q.howareyou" super="perf.question"/>
					    <sort name="perf.q.when" super="perf.question"/>
					    <sort name="perf.q.howmany" super="perf.question"/>
					    <sort name="perf.q.why" super="perf.question"/>
					    <sort name="perf.q.how" super="perf.question"/>
*/
					}
				}
			} else if (verbSort.is_a(o.getSort("verb.go"))) {
				if (nAttributes == 1) {
					// we are missing the destination, see if in the last performative, we mentioned a location:
					for(let perf of performativesToConsider) {
						let IDs:ConstantTermAttribute[] = this.IDsInPerformative(perf.performative, o);
						for(let ID of IDs) {
							let e:NLContextEntity = this.findByID(ID.value);
							if (e != null && e.sortMatch(o.getSort("space.location"))) {
								let output:Term = new Term(verbSort, [firstAttribute, 
																	  ID]);
								possibleOutputs.push(new TermTermAttribute(output))
							}
						}
					}
				}
			}
		}

		return possibleOutputs;
	}


	newHypotheticalID() : string
	{
		this.nextHypotheticalID++;
		return "H-" + this.speaker + "-" + this.nextHypotheticalID;
	}


	getNLContextPerformative(perf:Term) : NLContextPerformative
	{
		for(let p of this.performatives) {
			if (p.performative == perf) return p;
		}
		return null;
	}


	static fromXML(xml:Element, o:Ontology, ai:RuleBasedAI, mentionMemorySize:number) : NLContext
	{
		let c:NLContext = new NLContext(xml.getAttribute("speaker"), ai, mentionMemorySize);

		let p_xml:Element = getFirstElementChildByTag(xml, "shortTermMemory");
		if (p_xml != null) {
			for(let ce_xml of getElementChildrenByTag(p_xml, "NLContextEntity")) {
				let ce:NLContextEntity = NLContextEntity.fromXML(ce_xml, o);
				if (ce != null) c.shortTermMemory.push(ce);
			}
		}
		let m_xml:Element = getFirstElementChildByTag(xml, "mentions");
		if (m_xml != null) {
			for(let ce_xml of getElementChildrenByTag(m_xml, "NLContextEntity")) {
				let ce:NLContextEntity = NLContextEntity.fromXML(ce_xml, o);
				if (ce != null) c.mentions.push(ce);
			}
		}
		let pf_xml:Element = getFirstElementChildByTag(xml, "performatives");
		if (pf_xml != null) {
			for(let cp_xml of getElementChildrenByTag(pf_xml, "NLContextPerformative")) {
				let cp:NLContextPerformative = NLContextPerformative.fromXML(cp_xml, o);
				if (cp != null) c.performatives.push(cp);
			}
		}

		let tmp_xml:Element = getFirstElementChildByTag(xml, "inConversation");
		if (tmp_xml != null) c.inConversation = tmp_xml.getAttribute("value") == "true";

		tmp_xml = getFirstElementChildByTag(xml, "lastPerformativeInvolvingThisCharacterWasToUs");
		if (tmp_xml != null) c.lastPerformativeInvolvingThisCharacterWasToUs = tmp_xml.getAttribute("value") == "true";

		tmp_xml = getFirstElementChildByTag(xml, "expectingYes");
		if (tmp_xml != null) c.expectingYes = tmp_xml.getAttribute("value") == "true";

		tmp_xml = getFirstElementChildByTag(xml, "expectingThankYou");
		if (tmp_xml != null) c.expectingThankYou = tmp_xml.getAttribute("value") == "true";

		tmp_xml = getFirstElementChildByTag(xml, "expectingYouAreWelcome");
		if (tmp_xml != null) c.expectingYouAreWelcome = tmp_xml.getAttribute("value") == "true";

		tmp_xml = getFirstElementChildByTag(xml, "expectingGreet");
		if (tmp_xml != null) c.expectingGreet = tmp_xml.getAttribute("value") == "true";

		tmp_xml = getFirstElementChildByTag(xml, "expectingFarewell");
		if (tmp_xml != null) c.expectingFarewell = tmp_xml.getAttribute("value") == "true";

		tmp_xml = getFirstElementChildByTag(xml, "expectingNicetomeetyoutoo");
		if (tmp_xml != null) c.expectingNicetomeetyoutoo = tmp_xml.getAttribute("value") == "true";

		for(let tmp_xml2 of getElementChildrenByTag(xml, "expectingAnswerToQuestion_stack")) {
			c.expectingAnswerToQuestion_stack.push(c.performatives[Number(tmp_xml2.getAttribute("value"))]);
			c.expectingAnswerToQuestionTimeStamp_stack.push(Number(tmp_xml2.getAttribute("time")));
		}

		for(let tmp_xml2 of getElementChildrenByTag(xml, "expectingConfirmationToRequest_stack")) {
			c.expectingConfirmationToRequest_stack.push(c.performatives[Number(tmp_xml2.getAttribute("value"))]);
			c.expectingConfirmationToRequestTimeStamp_stack.push(Number(tmp_xml2.getAttribute("time")));
		}

		tmp_xml = getFirstElementChildByTag(xml, "lastEnumeratedQuestion_answered");
		if (tmp_xml != null) c.lastEnumeratedQuestion_answered = c.performatives[Number(tmp_xml.getAttribute("value"))];

		c.lastEnumeratedQuestion_answers = null;
		for(let tmp_xml2 of getElementChildrenByTag(xml, "lastEnumeratedQuestion_answers")) {
			if (c.lastEnumeratedQuestion_answers == null) c.lastEnumeratedQuestion_answers = [];
//			c.lastEnumeratedQuestion_answers.push(Term.fromString(tmp_xml2.getAttribute("value"), o));
			c.lastEnumeratedQuestion_answers.push(Term.parseAttribute(tmp_xml2.getAttribute("value"), o, [], []));
		}

		tmp_xml = getFirstElementChildByTag(xml, "lastEnumeratedQuestion_next_answer_index");
		if (tmp_xml != null) c.lastEnumeratedQuestion_next_answer_index = Number(tmp_xml.getAttribute("value"));

		tmp_xml = getFirstElementChildByTag(xml, "nextHypotheticalID");
		if (tmp_xml != null) c.nextHypotheticalID = Number(tmp_xml.getAttribute("value"));

		tmp_xml = getFirstElementChildByTag(xml, "lastDerefErrorType");
		if (tmp_xml != null) c.lastDerefErrorType = Number(tmp_xml.getAttribute("value"));

		return c;
	}


	saveToXML() : string
	{
		var str:string = "<context speaker=\""+this.speaker+"\">\n";

		str += "<shortTermMemory>\n";
		for(let ce of this.shortTermMemory) str += ce.saveToXML() + "\n";
		str += "</shortTermMemory>\n";
		str += "<mentions>\n";
		for(let ce of this.mentions) str += ce.saveToXML() + "\n";
		str += "</mentions>\n";
		str += "<performatives>\n";
		for(let cp of this.performatives) str += cp.saveToXML() + "\n";
		str += "</performatives>\n";

		str += "<inConversation value=\""+this.inConversation+"\"/>\n";
		str += "<lastPerformativeInvolvingThisCharacterWasToUs value=\""+this.lastPerformativeInvolvingThisCharacterWasToUs+"\"/>\n";
		str += "<expectingYes value=\""+this.expectingYes+"\"/>\n";
		str += "<expectingThankYou value=\""+this.expectingThankYou+"\"/>\n";
		str += "<expectingYouAreWelcome value=\""+this.expectingYouAreWelcome+"\"/>\n";
		str += "<expectingGreet value=\""+this.expectingGreet+"\"/>\n";
		str += "<expectingFarewell value=\""+this.expectingFarewell+"\"/>\n";
		str += "<expectingNicetomeetyoutoo value=\""+this.expectingNicetomeetyoutoo+"\"/>\n";
		for(let i:number = 0;i<this.expectingAnswerToQuestion_stack.length;i++) {
			str += "<expectingAnswerToQuestion_stack value=\""+this.performatives.indexOf(this.expectingAnswerToQuestion_stack[i])+"\" time=\""+this.expectingAnswerToQuestionTimeStamp_stack[i]+"\"/>\n";
		}
		for(let i:number = 0;i<this.expectingConfirmationToRequest_stack.length;i++) {
			str += "<expectingConfirmationToRequest_stack value=\""+this.performatives.indexOf(this.expectingConfirmationToRequest_stack[i])+"\" time=\""+this.expectingConfirmationToRequestTimeStamp_stack[i]+"\"/>\n";
		}

		if (this.lastEnumeratedQuestion_answered != null) {
			str += "<lastEnumeratedQuestion_answered value=\""+this.performatives.indexOf(this.lastEnumeratedQuestion_answered)+"\"/>\n";
		}
		if (this.lastEnumeratedQuestion_answers != null) {
			for(let i:number = 0;i<this.lastEnumeratedQuestion_answers.length;i++) {
				str += "<lastEnumeratedQuestion_answers value=\""+this.lastEnumeratedQuestion_answers[i].toStringXML()+"\"/>\n";
			}
		}
		str += "<lastEnumeratedQuestion_next_answer_index value=\""+this.lastEnumeratedQuestion_next_answer_index+"\"/>\n";
		str += "<nextHypotheticalID value=\""+this.nextHypotheticalID+"\"/>\n";
		str += "<lastDerefErrorType value=\""+this.lastDerefErrorType+"\"/>\n";

		str += "</context>";
		return str;
	}


	speaker:string = null;
	ai:RuleBasedAI = null;
	shortTermMemory:NLContextEntity[] = [];
	mentions:NLContextEntity[] = [];
	performatives:NLContextPerformative[] = [];

	cache_sort_space_at:Sort = null;
	cache_sort_contains:Sort = null;

	// conversation state:
	inConversation:boolean = false;
	lastPerformativeInvolvingThisCharacterWasToUs:boolean = false;
	expectingYes:boolean = false;
	expectingThankYou:boolean = false;
	expectingYouAreWelcome:boolean = false;
	expectingGreet:boolean = false;
	expectingFarewell:boolean = false;
	expectingNicetomeetyoutoo:boolean = false;
	expectingAnswerToQuestion_stack:NLContextPerformative[] = [];
	expectingAnswerToQuestionTimeStamp_stack:number[] = [];

	expectingConfirmationToRequest_stack:NLContextPerformative[] = [];
	expectingConfirmationToRequestTimeStamp_stack:number[] = [];

	lastEnumeratedQuestion_answered:NLContextPerformative = null;
	lastEnumeratedQuestion_answers:TermAttribute[] = null;
	lastEnumeratedQuestion_next_answer_index:number = 0;

	// the "mentions" list can be at most this size: 
	mentionMemorySize:number = 10;

	// when hypothetical entities are mentioned in conversation, new IDs are given to them, this variable
	// determines which is the next ID to give them:
	nextHypotheticalID:number = 0;

	lastDerefErrorType:number = 0;	

	lastTimeUpdated:number = -1;
}
