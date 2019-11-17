/*

FIXME: this class needs a refactoring BADLY. There is a significant amount of redundant code, and there are way too many special cases.

*/


class NLGenerator {
	constructor(o:Ontology, pos:POSParser)
	{
		this.o = o;
		this.pos = pos;

		// cache the sorts:
		this.nlg_cache_sort_id = o.getSort("#id");
		this.nlg_cache_sort_symbol = o.getSort("symbol");
		this.nlg_cache_sort_number = o.getSort("number");
		this.nlg_cache_sort_name = o.getSort("name");
		this.nlg_cache_sort_object = o.getSort("object");
		this.nlg_cache_sort_role = o.getSort("role");
		this.nlg_cache_sort_unique_role = o.getSort("unique-role");
		this.nlg_cache_sort_space_location = o.getSort("space.location");
		this.nlg_cache_sort_property = o.getSort("property");
		this.nlg_cache_sort_propertywithvalue = o.getSort("property-with-value");
		this.nlg_cache_sort_haveableproperty = o.getSort("haveable-property");
		this.nlg_cache_sort_haveablepropertywithvalue = o.getSort("haveable-property-with-value");
		this.nlg_cache_sort_relationwithvalue = o.getSort("relation-with-value");
		this.nlg_cache_sort_relation = o.getSort("relation");
		this.nlg_cache_sort_symmetric_relation = o.getSort("symmetric-relation");
		this.nlg_cache_sort_verb = o.getSort("verb");
		this.nlg_cache_sort_verb_to_do = o.getSort("verb.do");
		this.nlg_cache_sort_modal_verb = o.getSort("modal-verb");
		this.nlg_cache_sort_past = o.getSort("time.past");
		this.nlg_cache_sort_present = o.getSort("time.present");
		this.nlg_cache_sort_future = o.getSort("time.future");
		this.nlg_cache_sort_pronoun = o.getSort("pronoun");
		this.nlg_cache_sort_timedate = o.getSort("time.date");
		this.nlg_cache_sort_measuringunit = o.getSort("measuring-unit");
	}


	// listenerID will usually be null, if it is != null, the sentence will start with a reference to that listener, 
	// to help the listener know we are talking to her
	termToEnglish(t:Term, speakerID:string, listenerID:ConstantTermAttribute, context:NLContext) : string
	{
		let listenerPrefix:string = "";

		this.renderingSentenceVariables = null;	// mark that we are NOT rendering a sentence with more than one #or-red term

		if (listenerID != null) {
			let targetString:string = this.termToEnglish_EntityName(listenerID, context);
			if (targetString != null) {
				// special case to prevent "hello man!", which sounds like "hello dude!"
				if (targetString == "man") targetString = "human";
				listenerPrefix = targetString + ", ";
			}			
		}
		let render:string = this.termToEnglishInternal(t, speakerID, context, true);
		if (render == null) return null;
		return listenerPrefix + render;
	}


	termToEnglishInternal(t:Term, speakerID:string, context:NLContext, rootPerformative:boolean) : string
	{
		let o:Ontology = context.ai.o;
		if (!t.functor.is_a(o.getSort("performative"))) {
			console.error("termToEnglish, term is not a performative! " + t.toString());
			return "[NLG ERROR]";
		}

		if (t.functor.is_a(o.getSort("perf.callattention"))) return this.termToEnglish_CallAttention(t, speakerID, context);
		if (t.functor.is_a(o.getSort("perf.greet"))) return this.termToEnglish_Greet(t, speakerID, context);
		if (t.functor.is_a(o.getSort("perf.farewell"))) return this.termToEnglish_Farewell(t, context);
		if (t.functor.is_a(o.getSort("perf.thankyou"))) return "Thank you";
		if (t.functor.is_a(o.getSort("perf.youarewelcome"))) return "You are welcome";
		if (t.functor.is_a(o.getSort("perf.nicetomeetyou"))) return "Nice to meet you!";
		if (t.functor.is_a(o.getSort("perf.nicetomeetyoutoo"))) return "Nice to meet you too!";
		if (t.functor.is_a(o.getSort("perf.ack.ok"))) return this.termToEnglish_Ack_Ok(t);
		if (t.functor.is_a(o.getSort("perf.ack.unsure"))) return this.termToEnglish_Ack_Unsure(t);
		if (t.functor.is_a(o.getSort("perf.ack.contradict"))) return this.termToEnglish_Ack_Contradict(t);
		if (t.functor.is_a(o.getSort("perf.ack.invalidanswer"))) return this.termToEnglish_Ack_InvalidAnswer(t);
		if (t.functor.is_a(o.getSort("perf.ack.denyrequest"))) return this.termToEnglish_Ack_DenyRequest(t, context);
		if (t.functor.is_a(o.getSort("perf.ackresponse"))) return "Ok";
		if (t.functor.is_a(o.getSort("perf.inform.answer"))) return this.termToEnglish_Inform_Answer(t, speakerID, context);
		if (t.functor.is_a(o.getSort("perf.inform"))) return this.termToEnglish_Inform(t, speakerID, context);
		if (t.functor.is_a(o.getSort("perf.sentiment")))  return this.termToEnglish_Sentiment(t);
		if (t.functor.is_a(o.getSort("perf.q.action"))) return this.termToEnglish_QuestionAction(t, speakerID, context);
		if (t.functor.is_a(o.getSort("perf.request.action"))) return this.termToEnglish_RequestAction(t, speakerID, context, rootPerformative, true);
		if (t.functor.is_a(o.getSort("perf.q.predicate"))) return this.termToEnglish_Q_Predicate(t, speakerID, context);
		if (t.functor.is_a(o.getSort("perf.q.query"))) return this.termToEnglish_Query(t.attributes[1], t.attributes[2], speakerID, context);
		if (t.functor.is_a(o.getSort("perf.q.whereis"))) return this.termToEnglish_Where(t.attributes[1], speakerID, context);
		if (t.functor.is_a(o.getSort("perf.q.how"))) return this.termToEnglish_How(t, speakerID, context);

		// default case, just convert to string:
		console.error("termToEnglishInternal: could not render " + t.toString());
		return t.toString();
	}


	capitalize(sentence:string) : string
	{
		if (sentence == null) return null;
		sentence = sentence.trim();
		if (sentence.length>0) {
			sentence = sentence.substring(0,1).toUpperCase() + sentence.substring(1);
		}
		sentence = sentence.split(" etaoin").join(" Etaoin");
		sentence = sentence.split(" qwerty").join(" Qwerty");
		sentence = sentence.split(" shrdlu").join(" Shrdlu");
		sentence = sentence.split(" aurora").join(" Aurora");
		return sentence;
	}


	termToEnglish_CallAttention(t:Term, speakerID:string, context:NLContext) : string
	{
//		let ai:RuleBasedAI = context.ai;
		let target:TermAttribute = t.attributes[0];

		if (target instanceof ConstantTermAttribute) {
			let targetString:string = this.termToEnglish_EntityName(target, context);
			if (targetString != null) {
				// special case to prevent "hello man!", which sounds like "hello dude!"
				if (targetString == "man") targetString = "human";
				return targetString + "?"
			} else {
				console.error("termToEnglish_CallAttention: cannot render performative " + t);
				return t.toString();
			}
		} else {
			console.error("termToEnglish_CallAttention: cannot render performative " + t);
			return t.toString();
		}
	}


	termToEnglish_Greet(t:Term, speakerID:string, context:NLContext) : string
	{
//		let ai:RuleBasedAI = context.ai;
		let target:TermAttribute = t.attributes[0];

		if (target instanceof ConstantTermAttribute) {
			let targetString:string = this.termToEnglish_EntityName(target, context);
			if (targetString != null) {
				// special case to prevent "hello man!", which sounds like "hello dude!"
				if (targetString == "man") targetString = "human";
				return "Hello " + targetString + "!"
			} else {
				return "Hello!";
			}
		} else {
			return "Hello!";
		}
	}


	termToEnglish_Farewell(t:Term, context:NLContext) : string
	{
//		let ai:RuleBasedAI = context.ai;
		let target:TermAttribute = t.attributes[0];

		if (target instanceof ConstantTermAttribute) {
			let targetString:string = this.termToEnglish_EntityName(target, context);
			if (targetString != null) {
				// special case to prevent "hello man!", which sounds like "hello dude!"
				if (targetString == "man") targetString = "human";
				return "Farewell " + targetString + "!"
			} else {
				return "Farewell!";
			}
		} else {
			return "Farewell!";
		}
	}


	termToEnglish_Ack_Ok(t:Term) : string
	{
		return "Ok";
	}


	termToEnglish_Ack_Unsure(t:Term) : string
	{
		return "I am not sure";
	}


	termToEnglish_Ack_Contradict(t:Term) : string
	{
		return "That is a contradiction";
	}


	termToEnglish_Ack_InvalidAnswer(t:Term) : string
	{
		return "That does not answer my question";
	}


	termToEnglish_Ack_DenyRequest(t:Term, context:NLContext) : string
	{
		if (t.attributes.length < 2) {
			return "I cannot do that";
		} else {
			let action:TermAttribute = t.attributes[1];
			let actionSort:Sort = null;
			if (action instanceof ConstantTermAttribute) {
				actionSort = context.ai.o.getSortSilent((<ConstantTermAttribute>action).value);
			} else if (action instanceof VariableTermAttribute) {
				actionSort = action.sort;
			}
			let actionString:string = this.pos.getVerbString(actionSort, 0, 0, 0);
			if (actionString != null) {
				return "I cannot "+actionString+" that";
			} else {
				return "I cannot do that";
			}
		}
	}
	

	termToEnglish_Sentiment(t:Term) : string
	{
		if (t.attributes[1] instanceof ConstantTermAttribute) {
			let value:string = (<ConstantTermAttribute>t.attributes[1]).value;
			if (value == "good") return "Good!";
			else if (value == "bad") return "That's bad";
			else if (value == "surprise") return "Wow!";
			else return null;
		} else {
			return null;
		}
	}


	termToEnglish_Inform_Answer(t:Term, speakerID:string, context:NLContext) : string
	{
		if (t.attributes[1] instanceof TermTermAttribute &&
			(<TermTermAttribute>(t.attributes[1])).term.functor.name == "#and") {
			let o:Ontology = context.ai.o;
			let t_l:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>(t.attributes[1])).term, "#and");
			let timeTerm:TermAttribute = null;
			// console.log("t_l: " + t_l);
			// this "list" rendering format is only for when we want to generate text for lists of answers:
			for(let t2 of t_l) {
				if ((t2 instanceof TermTermAttribute) &&
					((<TermTermAttribute>t2).term.functor.is_a(o.getSort("time.past")) ||
					 (<TermTermAttribute>t2).term.functor.is_a(o.getSort("time.future")))) {
					timeTerm = t2;
					break;
				}
			}
			if (t_l.length > 1 && timeTerm == null) {
				let etcetera:boolean = false;
				let last_answer:TermAttribute = t_l[t_l.length-1];
				if ((last_answer instanceof ConstantTermAttribute )&&
					last_answer.sort.name == "etcetera") {
					etcetera = true;
				}
				let answers_l:string[] = [];
				let last_t:Term = null; 
				for(let ta2 of t_l) {
					if (etcetera && ta2 == last_answer) {
						answers_l.push("...");
					} else {
						let current_t:Term = null;
						if (ta2 instanceof TermTermAttribute) current_t = (<TermTermAttribute>ta2).term;
						if (last_t != null && current_t != null &&
							last_t.attributes.length >= 1 && current_t.attributes.length>=1 &&
							Term.equalsNoBindingsAttribute(last_t.attributes[0], current_t.attributes[0]) == 1) {
							if (last_t.functor == current_t.functor && 
								last_t.attributes.length == current_t.attributes.length &&
								last_t.attributes.length == 2) {
								// identical subject and functor, just render second attribute:
								let t2:Term = new Term(o.getSort("perf.inform.answer"), [(<TermTermAttribute>(t.attributes[1])).term.attributes[0],current_t.attributes[1]]);
								let answer:string = this.termToEnglish_Inform_Answer(t2, speakerID, context);
								if (answer == null) return null;
								answers_l.push(answer);
							} else {
								// identical subject:
								let answer:string = null;
								if (!current_t.functor.is_a(this.nlg_cache_sort_property) &&
									!current_t.functor.is_a(this.nlg_cache_sort_relation) &&
									current_t.functor.is_a(this.nlg_cache_sort_verb)) {
									answer = this.termToEnglish_Inform_Verb(current_t, [new TermTermAttribute(current_t)], false, speakerID, context, true);
								} else {
									let current_t_modified:Term = current_t.clone([]);
									current_t_modified.attributes[0] = new VariableTermAttribute(o.getSort("any"), null);
									let t2:Term = new Term(o.getSort("perf.inform.answer"), [(<TermTermAttribute>(t.attributes[1])).term.attributes[0],new TermTermAttribute(current_t_modified)]);
									answer = this.termToEnglish_Inform_Answer(t2, speakerID, context);
								}
								if (answer == null) return null;
								answers_l.push(answer);
							}
						} else {
							let t2:Term = new Term(o.getSort("perf.inform.answer"), [t.attributes[0],ta2]);
							let answer:string = this.termToEnglish_Inform_Answer(t2, speakerID, context);
							if (answer == null) return null;
							answers_l.push(answer);
						}
						last_t = current_t;
					}
				}
				let finalAnswer:string = null;
				for(let i:number = 0;i<answers_l.length;i++) {
					if (finalAnswer == null) {
						finalAnswer = answers_l[i];
					} else if (i < answers_l.length-1) {
						finalAnswer += ", " + answers_l[i];
					} else {
						if (etcetera) {
							finalAnswer += ", " + answers_l[i];
						} else {
							finalAnswer += " and " + answers_l[i];
						}
					}
				}
				return finalAnswer;
			}

			// check to see if there is more than one verb, to handle them separately:
			if (timeTerm == null) {
				let verbs:Term[] = [];
				let verbNegated:boolean[] = [];
				let nonVerbs:boolean = false;
				let etcetera:boolean = false;
				for(let ta of t_l) {
					if (ta instanceof TermTermAttribute) {
						let ta_t:Term = (<TermTermAttribute>ta).term;
						if (ta_t.functor.is_a(this.nlg_cache_sort_verb)) {
							verbs.push((<TermTermAttribute>ta).term);
							verbNegated.push(false);
						} else if (ta_t.functor.name == "#not" &&
								   ta_t.attributes.length == 1 &&
								   (ta_t.attributes[0] instanceof TermTermAttribute) &&
								   (<TermTermAttribute>ta_t.attributes[0]).term.functor.is_a(this.nlg_cache_sort_verb)) {
							verbs.push((<TermTermAttribute>ta).term);
							verbNegated.push(true);
						} else {
							nonVerbs = true;
						}
					} else {
						if ((ta instanceof ConstantTermAttribute) &&
							(<ConstantTermAttribute>ta).value == "etcetera") {
							etcetera = true;
						}
					}
				}
				if (verbs.length > 1 && !nonVerbs) {
					// this is a list of verbs! (probably an answer with a list of actions):
					let text:string = "";
					for(let i:number = 0;i<verbs.length;i++) {
						let v:Term = verbs[i];
						let vtext:string = this.termToEnglish_Inform_Verb(v, [new TermTermAttribute(v)], verbNegated[i], speakerID, context, false);
						if (vtext == null) return null;
						if (i == 0) {
							text = vtext;
						} else if (i == verbs.length-1 && !etcetera) {
							text = text + " and " + vtext;
						} else {
							text = text + ", " + vtext;
						}
					}
					if (etcetera) text += ", ...";
					return text;
				}
			}
		}

		if (t.attributes[1] instanceof ConstantTermAttribute) {
			let v:string = (<ConstantTermAttribute>t.attributes[1]).value;
			if (v=='yes') {
				return "Yes";
			} else if (v=='no') {
				return "No";
			} else if (v=='unknown') {
				if (t.attributes.length >= 3 && t.attributes[2] instanceof TermTermAttribute) {
					let query:Term = (<TermTermAttribute>t.attributes[2]).term;
//					console.log("termToEnglish_Inform_Answer: query: " + query);
					if (query.functor.is_a(context.ai.o.getSort("perf.question"))) {
						let queryString:string = this.termToEnglishInternal(query, speakerID, context, false);
						if (queryString != null && queryString[queryString.length-1] == '?') {
							return "I don't know " + queryString.substring(0,queryString.length-1);
						} else {
							return "I don't know";
						}
					} else {
						return "I don't know";
					}
				} else {
					return "I don't know";
				}
			} else if (v=='no-matches-found') {
				return 'No matches found';
			} else if (v=='nothing') {
				return 'Nothing';
			} else if (v=='fine') {
				return 'I am fine';
			} else if (t.attributes[1].sort == this.nlg_cache_sort_id) {
//				if (v == speakerID) return "you";
//				if (v == context.selfID) return "me";
				return this.termToEnglish_Entity(<ConstantTermAttribute>t.attributes[1], speakerID, true, context, null, true)[0];
			} else if (t.attributes[1].sort.is_a(this.nlg_cache_sort_measuringunit)) {
				let unitStr:[string, number, string, number] = this.termToEnglish_MeasuringUnit((<ConstantTermAttribute>(t.attributes[1])).value, t.attributes[1].sort);	
				if (unitStr == null) return null;
				return unitStr[0];
			} else if (t.attributes[1].sort == this.nlg_cache_sort_symbol) {
				return v;
			} else if (t.attributes[1].sort == this.nlg_cache_sort_number) {
				return '' + v;
			} else if (t.attributes[1].sort.name == v) {
				let v2:string = this.pos.getTypeString(t.attributes[1].sort, 0);
				if (v2 == null) v2 = this.pos.getNounString(t.attributes[1].sort, 0, false);	// without trying ancestors
				if (v2 == null) v2 = this.pos.getPropertyString(t.attributes[1].sort);
				if (v2 == null) v2 = this.pos.getNounString(t.attributes[1].sort, 0, true);		// we are despearte, try ancestors
				return v2;
			} else {
				console.error("termToEnglish_Inform_Answer: cannot render performative " + t);
				return t.toString();
			}

		} else if (t.attributes[1] instanceof TermTermAttribute) {
			let t2:Term = (<TermTermAttribute>(t.attributes[1])).term;
			let negated_t:boolean = false;
			if (t2.functor.name == "#not" && t2.attributes.length == 1 &&
				t2.attributes[0] instanceof TermTermAttribute) {
				negated_t = true;
				t2 = (<TermTermAttribute>t2.attributes[0]).term;
			}			
			if (t2.functor.is_a(this.nlg_cache_sort_relation) &&
				(t2.attributes[0] instanceof VariableTermAttribute) &&
				t2.attributes[0].sort.name == "any") {
				// special case of an answer of the type "in the bedroom":

				let relationStr:string = this.pos.getRelationString(t2.functor);
				let objectStr:[string, number, string, number] = this.termToEnglish_RelationArgument(t2.attributes[1], speakerID, true, context, true, 
																							         ((t2.attributes[0] instanceof ConstantTermAttribute) ? 
																							         (<ConstantTermAttribute>(t2.attributes[0])).value:null), true);
				let relationsAggregateStr:string = "";
				if (relationStr + " " + objectStr[0] == "of I" ||
					relationStr + " " + objectStr[0] == "of me") {
					relationsAggregateStr += " " + (negated_t ? "not ":"") + "mine";
				} else if (relationStr + " " + objectStr[0] == "of you") {
					relationsAggregateStr += " " + (negated_t ? "not ":"") + "yours";
				} else {
					relationsAggregateStr += " " + (negated_t ? "not ":"") + relationStr + " " + objectStr[0];
				}
				relationsAggregateStr = relationsAggregateStr.trim();

				// console.log("subjectStr: " + subjectStr +"\nverbStr: " + verbStr + "\nrelationStr: " + relationStr + "\nobjectStr: " + objectStr);
				if (relationsAggregateStr != "") return relationsAggregateStr;
			}
			return this.termToEnglish_Inform(t, speakerID, context);
		} else if (t.attributes[1] instanceof VariableTermAttribute) {
			let tmp:[string, number, string, number] = this.termToEnglish_ConceptEntity(t.attributes[1], speakerID, context);
			if (tmp != null) return tmp[0];
			return null;
		} else {
			return this.termToEnglish_Inform(t, speakerID, context);
		}
	}


	termToEnglish_Inform(pt:Term, speakerID:string, context:NLContext) : string
	{
//		let listenerID:string = null;
		let ai:RuleBasedAI = context.ai;
//		if (pt.attributes[0] instanceof ConstantTermAttribute) listenerID = (<ConstantTermAttribute>pt.attributes[0]).value;
		if (!(pt.attributes[1] instanceof TermTermAttribute)) {
			console.error("termToEnglish_Inform: could not render " + pt);
			return pt.toString();
		}
		let or_tl:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>pt.attributes[1]).term,"#or");
		if (or_tl.length > 1) {
			// we are trying to render a sentence, not just a term:
			return this.termToEnglish_Inform_ComplexSentence(or_tl, speakerID, context);
		}
		let tl:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>pt.attributes[1]).term,"#and");
		for(let tmp_t of tl) {
			if (!(tmp_t instanceof TermTermAttribute)) {
				console.error("termToEnglish_Inform: could not render (one of the elements in the list is not a term) " + pt);	
				return null;
			}
		}
		let t:Term = (<TermTermAttribute>tl[0]).term;	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers
		let adverb_str:string = null;
		let adverb_str_term:Term = null;
		let negated_t:boolean = false;
		if (t.functor.name == "#not" && t.attributes.length == 1 &&
			t.attributes[0] instanceof TermTermAttribute) {
			negated_t = true;
			t = (<TermTermAttribute>t.attributes[0]).term;
		}
		for(let tmp_t of tl) {
			let tmp_t2:Term = (<TermTermAttribute>tmp_t).term;
			if (tmp_t2 != t && tmp_t2.attributes.length == 1) {
				adverb_str = this.pos.getAdverbString(tmp_t2.functor);
				adverb_str_term = tmp_t2;
			}
		}

		// Look for the special case of "these is a X in Y", which is of the form #and(type(X), space.at(X, Y))
		if (tl.length == 2 &&
			(tl[0] instanceof TermTermAttribute) &&
			(tl[1] instanceof TermTermAttribute)) {
			let term1:Term = (<TermTermAttribute>tl[0]).term;
			let term2:Term = (<TermTermAttribute>tl[1]).term;
			if (term1.attributes.length == 1 &&
				term2.attributes.length == 2 &&
				term2.functor.name == "space.at" &&
				(term1.attributes[0] instanceof VariableTermAttribute) &&
				term1.attributes[0] == term2.attributes[0]) {
				// it's a "there is"!
				return this.termToEnglish_Inform_ThereIs(term1.functor, term2.attributes[1], speakerID, context);
			}
		}

//		console.log("termToEnglish_Inform: " + t);

		if (POSParser.sortIsConsideredForTypes(t.functor, this.o) &&
			!(t.functor.is_a(this.nlg_cache_sort_propertywithvalue)) &&
			!(t.functor.is_a(this.nlg_cache_sort_relationwithvalue)) &&
			!(t.functor.is_a(this.nlg_cache_sort_haveableproperty)) &&
			!(t.functor.is_a(context.ai.o.getSort("time.subsequently")))) {
			//console.log("termToEnglish_Inform object, space_location, process, or role");
			return this.renderTypeStatement(pt.attributes[1], speakerID, context);

		} else if (t.functor.is_a(this.nlg_cache_sort_haveableproperty) && t.attributes.length == 1) {
			//console.log("termToEnglish_Inform nlg_cache_sort_haveableproperty");
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let verbStr:string = this.pos.getVerbString(ai.o.getSort("verb.have"), subjectStr[3], subjectStr[1], 3);
			let propertyStr:string = this.pos.getPropertyString(t.functor);
			if (verbStr != null && propertyStr != null) {
				if (adverb_str != null) propertyStr = propertyStr + " " + adverb_str;
				if (negated_t) {
					verbStr = this.pos.getVerbString(ai.o.getSort("verb.do"), subjectStr[3], subjectStr[1], 3);
					return subjectStr[0] + " " + verbStr + " not have " + propertyStr;
				} else {
					return subjectStr[0] + " " + verbStr + " " + propertyStr;
				}
			}

		} else if (t.functor.is_a(this.nlg_cache_sort_property) && t.attributes.length == 1) {
//			console.log("termToEnglish_Inform property");
			let complements:string = "";
			let time:Sort = this.nlg_cache_sort_present;
			let time_term:Term = null;
	
			for(let tmp_t2 of tl) {
				let t2:Term = (<TermTermAttribute>tmp_t2).term;
				if (t2 == t) continue;
				if (t2.functor.is_a(this.nlg_cache_sort_past) ||
					t2.functor.is_a(this.nlg_cache_sort_present) ||
					t2.functor.is_a(this.nlg_cache_sort_future)) {
					if (t2.functor.is_a(this.nlg_cache_sort_past)) {
						time = t2.functor;
						time_term = t2;
					}
					if (t2.functor.is_a(this.nlg_cache_sort_present)) {
						time = t2.functor;
						time_term = t2;
					}
					if (t2.functor.is_a(this.nlg_cache_sort_future)) {
						time = t2.functor;
						time_term = t2;
					}

					// find if there is any other verb complement
					if (t2.functor.name == "time.later") complements += " later";
					if (t2.functor.name == "time.first") complements += " first";
					if (t2.functor.name == "time.now") complements += " now";
					if (t2.functor.name == "time.subsequently") complements += " after that";

					if (t2.attributes.length == 2 &&
						(t2.attributes[1] instanceof TermTermAttribute) &&
						t2.attributes[1].sort.is_a_string("time.date")) {
						let dateTerm:Term = (<TermTermAttribute>t2.attributes[1]).term;
						if (dateTerm.attributes.length >= 2) {
							let time_date:string = this.termToEnglish_Date(dateTerm.attributes[0], dateTerm.attributes[1].sort)
							if (time_date != null) complements += " on " + time_date;
						}
					}
				}
			}

			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let verbStr:string = this.verbStringWithTime(ai.o.getSort("verb.be"), subjectStr[3], subjectStr[1], time, false);
			let propertyStr:string = this.pos.getPropertyString(t.functor);

			if (propertyStr == null) {
				propertyStr = this.pos.getNounString(t.functor, 0, false);	// without trying ancestors
				if (propertyStr != null) propertyStr = "a " + propertyStr;
			}
			if (propertyStr == null) {
				propertyStr = this.pos.getNounString(t.functor, 0, true);		// we are despearte, try ancestors
				if (propertyStr != null) propertyStr = "a " + propertyStr;
			}
			if (adverb_str != null && adverb_str_term != time_term) complements = complements + " " + adverb_str;
			if (verbStr != null && propertyStr != null) 
				return subjectStr[0] + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr + complements;

		} else if (t.functor.is_a(this.nlg_cache_sort_haveablepropertywithvalue) && t.attributes.length == 2) {
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, true, (t.attributes[0] instanceof ConstantTermAttribute ? (<ConstantTermAttribute>(t.attributes[0])).value:null), false);
			let verbStr:string = this.pos.getVerbString(ai.o.getSort("verb.have"), subjectStr[3], subjectStr[1], 3);
			let propertyStr:string = this.pos.getPropertyString(t.functor);
			if (verbStr != null && propertyStr != null && objectStr != null) {
				if (propertyStr.substring(propertyStr.length-3) == " to" && 
					objectStr[0].substring(0,3) == "to ") {
					objectStr[0] = objectStr[0].substring(3);
				}
				if (adverb_str != null) objectStr[0] = objectStr[0] + " " + adverb_str;
				if (negated_t) {
					verbStr = this.pos.getVerbString(ai.o.getSort("verb.do"), subjectStr[3], subjectStr[1], 3);
					return subjectStr[0] + " " + verbStr + " not have " + propertyStr + " " + objectStr[0];
				} else {
					return subjectStr[0] + " " + verbStr + " " + propertyStr + " " + objectStr[0];
				}
			}


		} else if (t.functor.is_a(this.nlg_cache_sort_role)) {		
			let determiner:string = "a";	
			let preComplementsStr:string = "";
			let time:Sort = this.nlg_cache_sort_present;
			let complementsStr:string = "";
			let typeFunctor:Sort = null;
			if (t.attributes.length == 3) {
				// role with a location, generate an initial complementsStr:
//					console.log("role with a location, generate an initial complementsStr:!!!!");
				let roleLocationStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, 
																								       ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																							 	       (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
				if (roleLocationStr != null) {
					complementsStr = " in " + roleLocationStr[0];
				}
				typeFunctor = t.attributes[2].sort;	// since this is of the form role(subject, [location], role))
			} else {
				typeFunctor = t.attributes[1].sort;	// since this is of the form role(subject, role))
			}
			if (typeFunctor.is_a(this.nlg_cache_sort_unique_role)) determiner = "the";
			// let relationStr:string = this.pos.getRelationString(typeFunctor);
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let verbStr:string = this.verbStringWithTime(ai.o.getSort("verb.be"), subjectStr[3], subjectStr[1], time, negated_t);
			let typeStr:string = this.pos.getTypeString(typeFunctor, subjectStr[3]);
			if (verbStr != null && typeStr != null) {
				if (determiner == "a") determiner = this.aVSanArticle(preComplementsStr + typeStr);
				return subjectStr[0] + " " + verbStr + " " + determiner + " " + preComplementsStr + typeStr + complementsStr;
			} else {
				console.warn("(termToEnglish_Inform.nlg_cache_sort_role) subjectStr: " + subjectStr[0] + ", verbStr: " + verbStr + ", typeStr: " + typeStr + ", complementsStr: " + complementsStr);
				return null;
			}


		} else if (t.functor.is_a(this.nlg_cache_sort_propertywithvalue) && t.attributes.length == 2) {
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, false);
			let verbStr:string = this.pos.getVerbString(ai.o.getSort("verb.be"), 0, 2, 3);
			let propertyStr:string = this.pos.getNounString(t.functor, 0, true);
			let propertyStr2:string = null;
			if (t.attributes[1] instanceof ConstantTermAttribute &&
				t.attributes[1].sort.name != "symbol") {
				if (t.attributes[1].sort.is_a(this.nlg_cache_sort_measuringunit)) {
					let unitStr:[string, number, string, number] = this.termToEnglish_MeasuringUnit((<ConstantTermAttribute>(t.attributes[1])).value, t.attributes[1].sort);
					if (unitStr != null) propertyStr2 = unitStr[0];
				} else {
				 	propertyStr2 = this.pos.getPropertyString(t.attributes[1].sort);	
				}
			} else {
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, 
																							     ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																							     (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
				if (objectStr != null) propertyStr2 = objectStr[0];
			}
			if (subjectStr != null && verbStr != null && propertyStr != null && propertyStr2 != null) {
				if (adverb_str != null) propertyStr2 = propertyStr2 + " " + adverb_str;
				if (subjectStr[0] == "I") {
					return "my " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2;
				} else if (subjectStr[0] == "you") {
					return "your " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2;
				} else {
					return subjectStr[0] +"'s " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2;
				}			
			} else {
				return t.toString();
			}


		} else if (t.functor.is_a(this.nlg_cache_sort_relationwithvalue)) {
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, false, null, true);
			let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, null, true);
			let valueStr:string = null;
			let relationStr:string = this.pos.getTypeString(t.functor, 0);
			if (t.attributes[2] instanceof ConstantTermAttribute &&
				t.attributes[2].sort.name != "symbol") {
				if (t.attributes[2].sort.is_a(this.nlg_cache_sort_measuringunit)) {
					let unitStr:[string, number, string, number] = this.termToEnglish_MeasuringUnit((<ConstantTermAttribute>(t.attributes[2])).value, t.attributes[2].sort);
					if (unitStr != null) valueStr = unitStr[0];
				} else {
				 	valueStr = this.pos.getPropertyString(t.attributes[2].sort);	
				}
			} else {
				let valueStrTmp:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[2], speakerID, true, context, false, 
																							     ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																							     (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
				if (valueStrTmp != null) valueStr = valueStrTmp[0];
			}
			return "the " + relationStr + " between " + subjectStr[0] + " and " + objectStr[0] + " is " + valueStr;

		} else if (t.functor.is_a(context.ai.o.getSort("time.subsequently"))) {
			return this.termToEnglish_RequestAction(pt, speakerID, context, true, false);

		} else if (t.functor.is_a(this.nlg_cache_sort_relation) &&
				   !t.functor.is_a(this.nlg_cache_sort_verb)) {			
			// console.log("termToEnglish_Inform: relation " + t.functor.name);
			let subjectStr:[string, number, string, number] = this.termToEnglish_RelationArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let time:Sort = this.nlg_cache_sort_present;
			if (subjectStr != null) {
				let relationsAggregateStr:string = "";
				let complementsStr:string = "";
				for(let tmp_t2 of tl) {
					let t2:Term = (<TermTermAttribute>tmp_t2).term;

					let negated_t2:boolean = false;
					if (t2.functor.name == "#not" && t2.attributes.length == 1 &&
						t2.attributes[0] instanceof TermTermAttribute) {
						negated_t2 = true;
						t2 = (<TermTermAttribute>t2.attributes[0]).term;
					}

					if (t2.attributes.length == 1 &&
						(t2.attributes[0] instanceof TermTermAttribute) &&
						(<TermTermAttribute>(t2.attributes[0])).term == t) {
						// find if there is any term that determines tense, otherwise, assume present:
						if (t2.functor.is_a(this.nlg_cache_sort_past)) {
							time = t2.functor;
						}
						if (t2.functor.is_a(this.nlg_cache_sort_future)) {
							time = t2.functor;
						}
					}

					if (t2.functor.is_a(this.nlg_cache_sort_relation) &&
				   		!t2.functor.is_a(this.nlg_cache_sort_verb)) {

						let typeFunctor:Sort = t2.functor;
						let relationStr:string = this.pos.getRelationString(typeFunctor);
						let objectStr:[string, number, string, number] = this.termToEnglish_RelationArgument(t2.attributes[1], speakerID, true, context, false, 
																									   	    ((t2.attributes[0] instanceof ConstantTermAttribute) ? 
																									        (<ConstantTermAttribute>(t2.attributes[0])).value:null), true);

		//				console.log("termToEnglish_Inform: relationStr: " + relationStr);
		//				console.log("termToEnglish_Inform: objectStr: " + objectStr);
						if (relationStr == null) {
							let reverseSortName:string = this.pos.reverseRelations[t2.functor.name];
							if (reverseSortName != null) {
								// we cannot render the original relation, but we can render the opposite, so reverse subject and object:
								let reverseSort:Sort = ai.o.getSort(reverseSortName);
								relationStr = this.pos.getRelationString(reverseSort)
								let tmp2:[string, number, string, number] = subjectStr;
								subjectStr = objectStr;
								objectStr = tmp2;
							} 
						}
						if (relationStr == "because" && !this.argumentIsVerb(t2.attributes[1], context)) relationStr = "because of";
						if (relationStr + " " + objectStr[0] == "of I" ||
							relationStr + " " + objectStr[0] == "of me") {
							relationsAggregateStr += " " + (negated_t2 ? "not ":"") + "mine" + complementsStr;
						} else if (relationStr + " " + objectStr[0] == "of you") {
							relationsAggregateStr += " " + (negated_t2 ? "not ":"") + "yours" + complementsStr;
						} else {
							relationsAggregateStr += " " + (negated_t2 ? "not ":"") + relationStr + " " + objectStr[0] + complementsStr;
						}
					}
				}
				relationsAggregateStr = relationsAggregateStr.trim();
				if (t.functor.is_a(this.o.getSort("relation.cause"))) {
					// special case:
					return subjectStr[0] + " " + relationsAggregateStr;
				} else {
					let verbStr:string = this.verbStringWithTime(ai.o.getSort("verb.be"), subjectStr[3], subjectStr[1], time, false);
					if (verbStr != null && relationsAggregateStr != "") 
						return subjectStr[0] + " " + verbStr + " " + relationsAggregateStr;
				}
			}


		} else if (t.functor.is_a(this.nlg_cache_sort_verb)) {
			return this.termToEnglish_Inform_Verb(t, tl, negated_t, speakerID, context, false);

		} else if (t.functor.is_a(this.nlg_cache_sort_timedate)) {
			return this.termToEnglish_Date(t.attributes[0], t.attributes[1].sort);	
		}

		console.error("termToEnglish_Inform: could not render " + pt);
		return null;
	}


	termToEnglish_Inform_ThereIs(sort:Sort, location:TermAttribute, speakerID:string, context:NLContext) : string
	{
		let entityStr:[string, number, string, number] = this.termToEnglish_ConceptEntity(new VariableTermAttribute(sort, null), speakerID, context);
		if (location instanceof ConstantTermAttribute) {
			let locationStr:[string, number, string, number] = this.termToEnglish_Entity(location, speakerID, true, context, false, false);
			if (entityStr != null && locationStr != null) {
				return "there is "+entityStr[0]+" in "+locationStr[0];
			}
		} else if (location instanceof VariableTermAttribute) {
			let locationStr:string = this.pos.getAdverbString(location.sort);
			if (entityStr != null && locationStr != null) {
				return "there is "+entityStr[0]+" " + locationStr;
			}
		}
		return null;
	}


	termToEnglish_Inform_Verb(t:Term, tl:TermAttribute[], negated_t:boolean, speakerID:string, context:NLContext, dropSubject:boolean) : string
	{
		let ai:RuleBasedAI = context.ai;
		let verbPreComplements = "";
		let verbComplements = "";
		let time:Sort = null;
		for(let tmp_t2 of tl) {
			let t2:Term = (<TermTermAttribute>tmp_t2).term;
			if (t2 == t) continue;
			if (t2.functor.is_a(this.nlg_cache_sort_past) ||
				t2.functor.is_a(this.nlg_cache_sort_present) ||
				t2.functor.is_a(this.nlg_cache_sort_future)) {
				if (t2.functor.is_a(this.nlg_cache_sort_past)) {
					time = t2.functor;
				}
				if (t2.functor.is_a(this.nlg_cache_sort_present)) {
					time = t2.functor;
				}
				if (t2.functor.is_a(this.nlg_cache_sort_future)) {
					time = t2.functor;
				}

				// find if there is any other verb complement
				if (t2.functor.name == "time.later") verbComplements += " later";
				if (t2.functor.name == "time.first") verbComplements += " first";
				if (t2.functor.name == "time.now") verbComplements += " now";
				if (t2.functor.name == "time.subsequently") verbComplements += " after that";
				if (t2.functor.name == "conjunction-contrast") verbPreComplements += "however, ";

				if (t2.attributes.length == 2 &&
					(t2.attributes[1] instanceof TermTermAttribute) &&
					t2.attributes[1].sort.is_a_string("time.date")) {
					let dateTerm:Term = (<TermTermAttribute>t2.attributes[1]).term;
					if (dateTerm.attributes.length >= 2) {
						let time_date:string = this.termToEnglish_Date(dateTerm.attributes[0], dateTerm.attributes[1].sort)
						if (time_date != null) verbComplements += " on " + time_date;
					}
				}
			} else if (t2.attributes.length == 1 &&
				(t2.attributes[0] instanceof TermTermAttribute) &&
				(<TermTermAttribute>(t2.attributes[0])).term == t) {

				// find if there is any other verb complement
				if (t2.functor.name == "time.later") verbComplements += " later";
				if (t2.functor.name == "time.first") verbComplements += " first";
				if (t2.functor.name == "time.now") verbComplements += " now";
				if (t2.functor.name == "conjunction-contrast") verbPreComplements += "however, ";
			} else if (t2.attributes.length == 2 &&
				t2.functor.is_a(this.nlg_cache_sort_relation) &&
				(t2.attributes[0] instanceof TermTermAttribute) &&
				(<TermTermAttribute>(t2.attributes[0])).term == t) {
				// render the relation as a verb complement:
				let relationStr:string = this.pos.getRelationString(t2.functor);
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t2.attributes[1], speakerID, true, context, false, 
																								 ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																						     	 (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
				if (relationStr == null &&
					this.pos.reverseRelations[t2.functor.name] != null) {
					relationStr = this.pos.getRelationString(ai.o.getSort(this.pos.reverseRelations[t2.functor.name]));
				}

				if (relationStr == "because" && !this.argumentIsVerb(t2.attributes[1], context)) relationStr = "because of";

				if (objectStr == null) {
					console.warn("termToEnglish_Inform (verb): cannot render verb complement (objectStr == null) " + t2);	
				} else if (relationStr == null) {
					console.warn("termToEnglish_Inform (verb): cannot render verb complement (relationStr == null) " + t2);	
				} else {
					if (relationStr == "to" && objectStr[0].indexOf("to")==0) {
						verbComplements += " " + objectStr[0];
					} else {
						verbComplements += " " + relationStr + " " + objectStr[0];
					}
				}
			} else {
				console.warn("termToEnglish_Inform (verb): cannot render verb complement " + t2);					
			}
		}

		if (time == null) time = this.nlg_cache_sort_present;

		if (t.attributes.length == 1) {
			if ((t.attributes[0] instanceof VariableTermAttribute) &&
				t.attributes[0].sort.name == "any") {
				// 0, 2 -> singular, 3rd person
				let verbStr:string = this.verbStringWithTime(t.functor, 0, 2, time, negated_t);
				return verbPreComplements + verbStr + verbComplements;
			} else {
				let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
				if (subjectStr == null) {
					console.error("termToEnglish_Inform: subjectStr == null!");
					return t.toString();
				}
				if (dropSubject) {
					subjectStr[0] = "";
				} else {
					subjectStr[0] += " ";
				}
				let verbStr:string = this.verbStringWithTime(t.functor, subjectStr[3], subjectStr[1], time, negated_t);
				return verbPreComplements + subjectStr[0] + verbStr + verbComplements;
			}

		} else if (t.attributes.length == 2) {
			if (t.attributes[0] instanceof VariableTermAttribute &&
				t.attributes[0].sort.name == "any") {
				// the subject of the verb is a variable, so, we are just going to render the verb in infinitive and the object
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false,
																								 ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																							     (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
				if (objectStr == null || objectStr[0] == null) {
					console.error("termToEnglish_Inform: objectStr == null or objectStr[0] == null! for " + t.attributes[1])
					return null;
				}
				if (objectStr[0][0] == 't' && objectStr[0][1] == 'o' && objectStr[0][2] == ' ' && 
					t.functor.is_a(this.nlg_cache_sort_modal_verb)) objectStr[0] = objectStr[0].substring(3);
//				console.log("Inform objectStr[0]: " + objectStr[0]);
				let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
				return verbPreComplements + verbStr + " " + objectStr[0] + verbComplements;

			} else {
				let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false,
																								 ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																							     (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
				if (subjectStr == null || objectStr == null) {
					console.error("termToEnglish_Inform: subjectStr == null or objectStr == null!");
					return null;
				}
				if (objectStr[0] == null) {
					console.error("termToEnglish_Inform: objectStr[0] == null! for " + t.attributes[1]);
					return null;
				}
				if (objectStr[0][0] == 't' && objectStr[0][1] == 'o' && objectStr[0][2] == ' ' && 
					t.functor.is_a(this.nlg_cache_sort_modal_verb)) objectStr[0] = objectStr[0].substring(3);
//				console.log("Inform objectStr[0]: " + objectStr[0]);
				let verbStr:string = this.verbStringWithTime(t.functor, subjectStr[3], subjectStr[1], time, negated_t);
				if (dropSubject) {
					subjectStr[0] = "";
				} else {
					subjectStr[0] += " ";
				}
				return verbPreComplements + subjectStr[0] + verbStr + " " + objectStr[0] + verbComplements;
			}

		} else if (t.attributes.length == 3 && 
				   (t.functor.name == "verb.tell" ||
				   	t.functor.name == "action.talk" ||
				   	t.functor.name == "action.give" ||
				   	t.functor.name == "verb.go" ||
				   	t.functor.name == "verb.guide" ||
				   	t.functor.name == "verb.take-to" ||
				   	t.functor.name == "action.put-in" ||
				   	t.functor.name == "verb.bring" ||
				   	t.functor.name == "verb.help")) {
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let object1Str:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false,
												 											  ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																						      (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
			let object2Str:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[2], speakerID, true, context, false,
												 											  ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																						      (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
			let verbStr:string = this.verbStringWithTime(t.functor, subjectStr[3], subjectStr[1], time, negated_t);
			if (subjectStr != null && object1Str != null && object2Str != null) {
				if (dropSubject) {
					subjectStr[0] = "";
				} else {
					subjectStr[0] += " ";
				}
				if (t.functor.name == "verb.help" &&
					(t.attributes[1] instanceof ConstantTermAttribute) &&
					(t.attributes[2] instanceof TermTermAttribute) &&
					(<TermTermAttribute>t.attributes[2]).term.attributes.length >= 1 &&
					((<TermTermAttribute>t.attributes[2]).term.attributes[0] instanceof ConstantTermAttribute)) {
					let obj1:string = (<ConstantTermAttribute>t.attributes[1]).value;
					let obj2:string = (<ConstantTermAttribute>(<TermTermAttribute>t.attributes[2]).term.attributes[0]).value;
					if (obj1 == obj2) {
						object2Str = this.termToEnglish_VerbArgument(t.attributes[2], speakerID, true, context, false, obj1, true);						
					}
					return subjectStr[0] + verbStr + " " + object1Str[0] + " " + object2Str[0] + verbComplements;
				} else if (t.functor.name == "verb.tell" ||
				   	t.functor.name == "action.talk") { 
					return subjectStr[0] + verbStr + " " + object2Str[0] + " " + object1Str[0] + verbComplements;
				} else if (t.functor.name == "verb.take-to"||
				   		   t.functor.name == "verb.bring") {
					// verbStr = this.verbStringWithTime(this.o.getSort("action.take"), subjectStr[3], subjectStr[1], time, negated_t);
					verbStr = this.verbStringWithTime(t.functor, subjectStr[3], subjectStr[1], time, negated_t);
					return subjectStr[0] + verbStr + " " + object1Str[0] + verbComplements + " to " + object2Str[0];
				} else if (t.functor.name == "action.put-in") {
					verbStr = this.verbStringWithTime(ai.o.getSort("verb.put"), subjectStr[3], subjectStr[1], time, negated_t);
					return subjectStr[0] + verbStr + " " + object1Str[0] + verbComplements + " in " + object2Str[0];
				} else {
					return subjectStr[0] + verbStr + " " + object1Str[0] + verbComplements + " to " + object2Str[0];
				}
			}
		}		

		console.error("termToEnglish_Inform_verb: could not render " + t);
		return null;
	}


	termToEnglish_Q_Predicate(pt:Term, speakerID:string, context:NLContext) : string
	{
//		let listenerID:string = null;
		let ai:RuleBasedAI = context.ai;
//		if (pt.attributes[0] instanceof ConstantTermAttribute) listenerID = (<ConstantTermAttribute>pt.attributes[0]).value;
		if (!(pt.attributes[1] instanceof TermTermAttribute)) {
			console.error("termToEnglish_Q_Predicate: could not render " + pt);
			return pt.toString();
		}
		let tl:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>pt.attributes[1]).term,"#and");
		for(let tmp_t of tl) {
			if (!(tmp_t instanceof TermTermAttribute)) {
				console.error("termToEnglish_Q_Predicate: could not render (one of the elements in the list is not a term) " + pt);	
				return null;
			}
		}
		let t:Term = (<TermTermAttribute>tl[0]).term;	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers

		if (t.functor.is_a(ai.o.getSort("verb"))) {
			// find if there is any term that determines tense, otherwise, assume present:
			let time:Sort = this.nlg_cache_sort_present;
			for(let tmp_t2 of tl) {
				let t2:Term = (<TermTermAttribute>tmp_t2).term;
				if (t2.attributes.length == 1 &&
					(t2.attributes[0] instanceof TermTermAttribute) &&
					(<TermTermAttribute>(t2.attributes[0])).term == t) {
					if (t2.functor.is_a(this.nlg_cache_sort_past)) time = t2.functor;
					if (t2.functor.is_a(this.nlg_cache_sort_present)) time = t2.functor;
					if (t2.functor.is_a(this.nlg_cache_sort_future)) time = t2.functor;
				}
			}
			if (t.functor.is_a(ai.o.getSort("verb.be")) && t.attributes.length == 2) {
				// ...

			} else if (t.attributes.length == 1) {
				let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
				let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
				if (time.is_a(this.nlg_cache_sort_past)) {
					let doVerbStr:string = this.pos.getVerbString(ai.o.getSort("verb.do"), subjectStr[3], subjectStr[1], 4);
					return doVerbStr + " " + subjectStr[0] + " " + verbStr + "?";
				} else if (time.is_a(this.nlg_cache_sort_future)) {
					return "Will " + subjectStr[0] + " " + verbStr + "?";
				} else {
					let doVerbStr:string = this.pos.getVerbString(ai.o.getSort("verb.do"), subjectStr[3], subjectStr[1], 3);
					return doVerbStr + " " + subjectStr[0] + " " + verbStr + "?";
				}

			} else if (t.attributes.length == 2) {
				let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false,
																								 ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																							     (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
				let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
				if (time.is_a(this.nlg_cache_sort_past)) {
					let doVerbStr:string = this.pos.getVerbString(ai.o.getSort("verb.do"), subjectStr[3], subjectStr[1], 4);
					return doVerbStr + " " + subjectStr[0] + " " + verbStr + " " + objectStr[0] + "?";
				} else if (time.is_a(this.nlg_cache_sort_future)) {
					return "Will " + subjectStr[0] + " " + verbStr + " " + objectStr[0] + "?";
				} else {
					let doVerbStr:string = this.pos.getVerbString(ai.o.getSort("verb.do"), subjectStr[3], subjectStr[1], 3);
					return doVerbStr + " " + subjectStr[0] + " " + verbStr + " " + objectStr[0] + "?";
				}
			} else {
				// ...
			}

		} else if (t.functor.is_a(ai.o.getSort("haveable-property-with-value")) && t.attributes.length == 2) {
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, true, (t.attributes[0] instanceof ConstantTermAttribute ? (<ConstantTermAttribute>(t.attributes[0])).value:null), false);
			let verbStr:string = this.pos.getVerbString(ai.o.getSort("verb.do"), subjectStr[3], subjectStr[1], 3);
			let propertyStr:string = this.pos.getPropertyString(t.functor);
			if (verbStr != null && propertyStr != null) {
				//console.log("haveable-property-with-value:")
				//console.log("    subjectStr: " + subjectStr[0])
				//console.log("    objectStr: " + objectStr[0])
				if (propertyStr.substring(propertyStr.length-3) == " to" && 
					objectStr[0].substring(0,3) == "to ") {
					objectStr[0] = objectStr[0].substring(3);
				}
				return verbStr + " " + subjectStr[0] + " have " + propertyStr + " " + objectStr[0] + "?";
			}

		} else if (t.functor.is_a(ai.o.getSort("relation")) && t.attributes.length == 2) {
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, true, null, false);
			let verbStr:string = this.pos.getVerbString(ai.o.getSort("verb.be"), subjectStr[3], subjectStr[1], 3);
			let relationStr:string = this.pos.getRelationString(t.functor);
			if (verbStr != null && relationStr != null) {
				return verbStr + " " + subjectStr[0] + " " + relationStr + " " + objectStr[0] + "?";
			}
		}

		console.error("termToEnglish_Q_Predicate: could not render " + pt);
		return t.toString();
	}


	termToEnglish_RequestAction(pt:Term, speakerID:string, context:NLContext, rootPerformative:boolean, addPlease:boolean) : string
	{
		let listenerID:string = null;
//		let ai:RuleBasedAI = context.ai;
		if (pt.attributes[0] instanceof ConstantTermAttribute) {
			listenerID = (<ConstantTermAttribute>pt.attributes[0]).value;
		}
		if (!(pt.attributes[1] instanceof TermTermAttribute)) {
			console.error("termToEnglish_RequestAction: could not render " + pt);
			return pt.toString();
		}
		let actionSequence:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>pt.attributes[1]).term,"time.subsequently");
		let actionSequenceStrings:string[] = [];
		for(let actionAtt of actionSequence) {
			if (!(actionAtt instanceof TermTermAttribute)) {
				console.error("termToEnglish_RequestAction: could not render (one of the actions in the sequence is not a term) " + pt);	
				return null;
			}
			let action:Term = (<TermTermAttribute>actionAtt).term;
			let actionString:string = null;
			let tl:TermAttribute[] = NLParser.elementsInList(action,"#and");
			for(let tmp_t of tl) {
				if (!(tmp_t instanceof TermTermAttribute)) {
					console.error("termToEnglish_RequestAction: could not render (one of the elements in the list is not a term) " + pt);	
					return null;
				}
			}
			let t:Term = (<TermTermAttribute>tl[0]).term;	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers
			let negated:boolean = false;
			if (t.functor.name == "#not") {
				negated = true;
				t = (<TermTermAttribute>(t.attributes[0])).term;
			}

			if (!t.functor.is_a(this.nlg_cache_sort_verb)) {
				console.error("termToEnglish_RequestAction: could not render (main clause's functor is not a verb) " + t);
				return null;
			}
			if (!(t.attributes[0] instanceof ConstantTermAttribute) ||
				(<ConstantTermAttribute>(t.attributes[0])).value != listenerID) {
				console.error("termToEnglish_RequestAction: could not render (subject of request ("+(<ConstantTermAttribute>(t.attributes[0])).value+") is different from listener ("+listenerID+")) " + pt);
				return null;
			}

			let verbComplements:string = "";
			for(let tmp_t2 of tl) {
				let t2:Term = (<TermTermAttribute>tmp_t2).term;
				if (t2 == t) continue;
				if (t2.attributes.length == 1 &&
					(t2.attributes[0] instanceof TermTermAttribute) &&
					(<TermTermAttribute>(t2.attributes[0])).term == t) {
					// find if there is any other verb complement
					if (t2.functor.name == "time.later") verbComplements += " later";
					if (t2.functor.name == "time.first") verbComplements += " first";
					if (t2.functor.name == "time.now") verbComplements += " now";
					if (t2.functor.name == "time.subsequently") verbComplements += " after that";
				} else if (t2.attributes.length == 2 &&
					t2.functor.is_a(this.nlg_cache_sort_relation) &&
					(t2.attributes[0] instanceof TermTermAttribute) &&
					(<TermTermAttribute>(t2.attributes[0])).term == t) {
					// render the relation as a verb complement:
					let relationStr:string = this.pos.getRelationString(t2.functor);
					let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t2.attributes[1], speakerID, true, context, false, listenerID, true);

					if (relationStr == "to" && objectStr[0].indexOf("to")==0) {
						verbComplements += " " + objectStr[0];
					} else {
						verbComplements += " " + relationStr + " " + objectStr[0];
					}
				} else {
					console.warn("termToEnglish_RequestAction (verb): cannot render verb complement " + t2);					
				}
			}		

			if (t.attributes.length == 1) {
				let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
				if (negated) {
					if (rootPerformative) {
						actionString = "do not " + verbStr + verbComplements;
					} else {
						actionString = "not to " + verbStr + verbComplements;
					}
				} else {
					if (rootPerformative) {
						actionString = verbStr + verbComplements;
					} else {
						actionString = "to " + verbStr + verbComplements;
					}
				}

			} else if (t.attributes.length == 2) {
				if (t.functor.is_a(context.ai.o.getSort("action.talk"))) {
					let whatToSay:TermAttribute = t.attributes[1];
					if (whatToSay instanceof TermTermAttribute &&
						(<TermTermAttribute>whatToSay).term.functor.is_a(context.ai.o.getSort("performative"))) {
						let perf:Term = (<TermTermAttribute>whatToSay).term;
						let targetStr:[string, number, string, number] = this.termToEnglish_VerbArgument(perf.attributes[0], speakerID, true, context, false, listenerID, true);

						let perfText:string = this.termToEnglishInternal(perf, speakerID, context, false);
						
						if (targetStr != null && perfText != null) {
							if (negated) {
								if (rootPerformative) {
									actionString = "do not tell " + targetStr[0] + " " + perfText + verbComplements;
								} else {
									actionString = "not to tell " + targetStr[0] + " " + perfText + verbComplements;
								}
							} else {
								if (rootPerformative) {
									actionString = "tell " + targetStr[0] + " " + perfText + verbComplements;
								} else {
									actionString = "to tell " + targetStr[0] + " " + perfText + verbComplements;
								}
							}
						}
					} else {
						let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, listenerID, true);
						if (objectStr != null) {
							if (negated) {
								if (rootPerformative) {
									actionString = "do not say " + objectStr[0] + verbComplements;
								} else {
									actionString = "not to say " + objectStr[0] + verbComplements;
								}
							} else {
								if (rootPerformative) {
									actionString = "say " + objectStr[0] + verbComplements;
								} else {
									actionString = "to say " + objectStr[0] + verbComplements;
								}
							}
						}
					}
				} else {
					let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
					let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, listenerID, true);
					if (objectStr != null) {
						if (negated) {
							if (rootPerformative) {
								actionString = "do not " + verbStr + " " + objectStr[0] + verbComplements;
							} else {
								actionString = "not to " + verbStr + " " + objectStr[0] + verbComplements;
							}
						} else {
							if (rootPerformative) {
								actionString = verbStr + " " + objectStr[0] + verbComplements;
							} else {
								actionString = "to " + verbStr + " " + objectStr[0] + verbComplements;
							}
						}
					}
				}

			} else if (t.attributes.length == 3 && 
					   (t.functor.name == "verb.tell" ||
					   	t.functor.name == "action.talk" ||
					   	t.functor.name == "action.give" ||
					   	t.functor.name == "verb.go" ||
					   	t.functor.name == "verb.take-to" ||
					   	t.functor.name == "verb.bring")) {
				let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
				let object1Str:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, listenerID, true);
				let object2Str:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[2], speakerID, true, context, false, listenerID, true);
				if (object1Str != null && object2Str != null) {
					if (negated) {
						if (rootPerformative) {
							actionString = "do not " + verbStr + " " + object1Str[0] + verbComplements + " to " + object2Str[0];
						} else {
							actionString = "not to " + verbStr + " " + object1Str[0] + verbComplements + " to " + object2Str[0];
						}
					} else {
						if (rootPerformative) {
							actionString = verbStr + " " + object1Str[0] + verbComplements + " to " + object2Str[0];
						} else {
							actionString = "to " + verbStr + " " + object1Str[0] + verbComplements + " to " + object2Str[0];
						}
					}
				}			
			} else {
				// ...
			}

			if (actionString == null) {
				console.error("termToEnglish_RequestAction: could not render " + pt);
				return null;
			}

			actionSequenceStrings.push(actionString);
		}

		let str:string = "";
		let first:boolean = true;
		for(let as of actionSequenceStrings) {
			if (first) {
				first = false;
				if (rootPerformative && addPlease) {
					str = "please, " + as;
				} else {
					str = as;
				}
			} else {
				str += ", then " + as;
			}
		}
		return str;
	}


	termToEnglish_QuestionAction(pt:Term, speakerID:string, context:NLContext) : string
	{
		let listenerID:string = null;
//		let ai:RuleBasedAI = context.ai;
		if (pt.attributes[0] instanceof ConstantTermAttribute) {
			listenerID = (<ConstantTermAttribute>pt.attributes[0]).value;
		}
		if (!(pt.attributes[1] instanceof TermTermAttribute)) {
			console.error("termToEnglish_QuestionAction: could not render " + pt);
			return pt.toString();
		}
		let tl:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>pt.attributes[1]).term,"#and");
		for(let tmp_t of tl) {
			if (!(tmp_t instanceof TermTermAttribute)) {
				console.error("termToEnglish_QuestionAction: could not render (one of the elements in the list is not a term) " + pt);	
				return null;
			}
		}
		let t:Term = (<TermTermAttribute>tl[0]).term;	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers

//		let negated:boolean = false;
		if (t.functor.name == "#not") {
//			negated = true;
			t = (<TermTermAttribute>(t.attributes[0])).term;
		}

		if (!t.functor.is_a(this.nlg_cache_sort_verb)) {
			console.error("termToEnglish_QuestionAction: could not render (main clause's functor is not a verb) " + pt);
			return pt.toString();
		}
		if (!(t.attributes[0] instanceof ConstantTermAttribute) ||
			(<ConstantTermAttribute>(t.attributes[0])).value != listenerID) {
			console.error("termToEnglish_QuestionAction: could not render (subject of request ("+(<ConstantTermAttribute>(t.attributes[0])).value+") is different from listener ("+listenerID+")) " + pt);
			return pt.toString();
		}

		let verbComplements = "";
		for(let tmp_t2 of tl) {
			let t2:Term = (<TermTermAttribute>tmp_t2).term;
			if (t2 == t) continue;
			if (t2.attributes.length == 1 &&
				(t2.attributes[0] instanceof TermTermAttribute) &&
				(<TermTermAttribute>(t2.attributes[0])).term == t) {
				// find if there is any other verb complement
				if (t2.functor.name == "time.later") verbComplements += " later";
				if (t2.functor.name == "time.first") verbComplements += " first";
				if (t2.functor.name == "time.now") verbComplements += " now";
				if (t2.functor.name == "time.subsequently") verbComplements += " after that";
			} else if (t2.attributes.length == 2 &&
				t2.functor.is_a(this.nlg_cache_sort_relation) &&
				(t2.attributes[0] instanceof TermTermAttribute) &&
				(<TermTermAttribute>(t2.attributes[0])).term == t) {
				// render the relation as a verb complement:
				let relationStr:string = this.pos.getRelationString(t2.functor);
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t2.attributes[1], speakerID, true, context, false, null, true);

				verbComplements += " " + relationStr + " " + objectStr[0];
			} else {
				console.warn("termToEnglish_QuestionAction (verb): cannot render verb complement " + t2);					
			}
		}		

		if (t.attributes.length == 1) {
			let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
			return "would you please " + verbStr + verbComplements + "?";

		} else if (t.attributes.length == 2) {
			let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
			let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, listenerID, true);
			if (objectStr != null) {
				return "would you please " + verbStr + " " + objectStr[0] + verbComplements + "?";
			}
		} else if (t.attributes.length == 3) {
			let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
			if (t.functor.name == "verb.help" && 
				(t.attributes[1] instanceof ConstantTermAttribute)) {
				// help special case (we assume the second argument is the subject of the 3rd, which is a verb):
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, listenerID, true);
				let objectStr2:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[2], speakerID, true, context, false, (<ConstantTermAttribute>t.attributes[1]).value, true);
				if (objectStr != null && objectStr2 != null) {
					return "would you please " + verbStr + " " + objectStr[0] + " " + objectStr2[0] + verbComplements + "?";
				}
			} else {
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, listenerID, true);
				let objectStr2:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[2], speakerID, true, context, false, listenerID, true);
				if (objectStr != null && objectStr2 != null) {
					return "would you please " + verbStr + " " + objectStr[0] + " " + objectStr2[0] + verbComplements + "?";
				}
			}
		}

		console.error("termToEnglish_QuestionAction: could not render " + pt);
		return t.toString();
	}


	renderTypeStatement(pt:TermAttribute, speakerID:string, context:NLContext) : string
	{
		let ai:RuleBasedAI = context.ai;
//		if (pt.attributes[0] instanceof ConstantTermAttribute) listenerID = (<ConstantTermAttribute>pt.attributes[0]).value;
		if (!(pt instanceof TermTermAttribute)) {
			console.error("renderTypeStatement: could not render " + pt);
			return pt.toString();
		}
		let tl:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>pt).term,"#and");
		for(let tmp_t of tl) {
			if (!(tmp_t instanceof TermTermAttribute)) {
				console.error("renderTypeStatement: could not render (one of the elements in the list is not a term) " + pt);	
				return null;
			}
		}
		let t:Term = (<TermTermAttribute>tl[0]).term;	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers
		let original_t:Term = t;
		let negated_t:boolean = false;
		if (t.functor.name == "#not" && t.attributes.length == 1 &&
			t.attributes[0] instanceof TermTermAttribute) {
			negated_t = true;
			t = (<TermTermAttribute>t.attributes[0]).term;
		}

		if (POSParser.sortIsConsideredForTypes(t.functor, this.o) &&
			!(t.functor.is_a(this.nlg_cache_sort_propertywithvalue)) &&
			!(t.functor.is_a(this.nlg_cache_sort_relationwithvalue)) &&
			!(t.functor.is_a(this.nlg_cache_sort_haveableproperty))) {
			// find complements:
			let typeFunctor:Sort = t.functor;
			let determiner:string = "a";
			let preComplementsStr:string = "";
			let complementsStr:string = "";
			let subjectPreComplementsStr:string = "";
			let subjectPostComplementsStr:string = "";
			let time:Sort = this.nlg_cache_sort_present;

//			if (negated_t) subjectPreComplementsStr = "not";

			for(let tmp_t2 of tl) {
				let t2:Term = (<TermTermAttribute>tmp_t2).term;
				if (t2 != original_t) {
					if (t2.attributes.length >= 1 &&
						t2.attributes[0] instanceof TermTermAttribute &&
						(<TermTermAttribute>(t2.attributes[0])).term == t) {
						if (t2.functor.is_a(this.nlg_cache_sort_past) ||
							t2.functor.is_a(this.nlg_cache_sort_present) ||
							t2.functor.is_a(this.nlg_cache_sort_future)) {
							time = t2.functor;
						} else if (t2.functor.is_a(this.nlg_cache_sort_propertywithvalue) &&
								   t2.attributes.length == 2 &&
								   t2.attributes[1] instanceof ConstantTermAttribute) {
							// let propertyStr:string = this.pos.getPropertyString(t2.attributes[1].sort);
							// ???
						} else if (t2.functor.is_a(this.nlg_cache_sort_property) &&
							       t2.attributes.length == 1) {
							let propertyStr:string = this.pos.getPropertyString(t2.functor);
							preComplementsStr += propertyStr + " ";
						} else if (t2.functor.is_a(this.nlg_cache_sort_relation)) {
							let relationStr:string = this.pos.getRelationString(t2.functor);
							let objectStr:[string, number, string, number] = this.termToEnglish_RelationArgument(t2.attributes[1], speakerID, true, context, false, 
																										         ((t2.attributes[0] instanceof ConstantTermAttribute) ? 
																										         (<ConstantTermAttribute>(t2.attributes[0])).value:null), true);
							if (relationStr != null) {
								// console.log("subjectStr: " + subjectStr +"\nverbStr: " + verbStr + "\nrelationStr: " + relationStr + "\nobjectStr: " + objectStr);
								complementsStr += " " + relationStr + " " + objectStr[0];
							} else {
								console.error("renderTypeStatement: cannot render relation " + t2 + " as a complement");
							}
						} else {
							console.error("renderTypeStatement: cannot render term " + t2 + " as a complement");						
						}
					} else if (t2.attributes.length >= 1 &&
							   t2.attributes[0] == t.attributes[0]) {
						if (t2.functor.is_a(this.nlg_cache_sort_propertywithvalue) &&
 						    t2.attributes.length == 2 &&
						    t2.attributes[1] instanceof ConstantTermAttribute) {
							let propertyStr:string = this.pos.getPropertyString(t2.attributes[1].sort);
							subjectPreComplementsStr += propertyStr + " ";
						} else if (t2.functor.is_a(this.nlg_cache_sort_property) &&
							       t2.attributes.length == 1) {
							let propertyStr:string = this.pos.getPropertyString(t2.functor);
							subjectPreComplementsStr += propertyStr + " ";
						} else {
							console.error("renderTypeStatement: cannot render term " + t2 + " as a subject complement");
						}
					} else {
						console.error("renderTypeStatement: cannot render term(2) " + t2 + " as a complement");						
					}
				}
			}

			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, null, true);
			let verbStr:string = this.verbStringWithTime(ai.o.getSort("verb.be"), subjectStr[3], subjectStr[1], time, negated_t);
			let typeStr:string = this.pos.getTypeString(typeFunctor, subjectStr[3]);
			if (verbStr != null && typeStr != null) {
				if (determiner == "a") determiner = this.aVSanArticle(preComplementsStr + typeStr);
				return subjectPreComplementsStr + subjectStr[0] + subjectPostComplementsStr + " " + verbStr + " " + determiner + " " + preComplementsStr + typeStr + complementsStr;
			} else {
				console.log("subjectStr: " + subjectStr[0] + ", verbStr: " + verbStr + ", typeStr: " + typeStr + ", complementsStr: " + complementsStr);
			}
		}

		return null;
	}	


	argumentIsVerb(entityRaw:TermAttribute, context:NLContext) : boolean
	{
		let tl:TermAttribute[] = [entityRaw];
		if (entityRaw instanceof TermTermAttribute) {
			if ((<TermTermAttribute>entityRaw).term.functor.name == "#and") {
				tl = NLParser.elementsInList((<TermTermAttribute>entityRaw).term,"#and");
			}
		}
		let entity:TermAttribute = null;
		// first search for a "noun":
		for(let i:number = 0;i<tl.length;i++) {
			let entity_tmp = tl[i];
			if (entity_tmp instanceof TermTermAttribute) {
				let entityTerm:Term = (<TermTermAttribute>entity_tmp).term;
				if (entityTerm.functor.is_a(context.ai.o.getSort("noun"))) {
					entity = entity_tmp;
					break; 
				}
				
			}
		}
		if (entity == null) {
			for(let i:number = 0;i<tl.length;i++) {
				entity = tl[i];
				let next:boolean = false;
				if (entity instanceof TermTermAttribute) {
					let entityTerm:Term = (<TermTermAttribute>entity).term;
					if (entityTerm.functor.is_a(context.ai.o.getSort("determiner"))) next = true;
					if (entityTerm.functor.is_a(context.ai.o.getSort("adjective"))) next = true;
				}
				if (!next) break;	// we found it!
			}
		}

		if (entity instanceof TermTermAttribute) {
			let entity_term:Term = (<TermTermAttribute>tl[0]).term;	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers
			if (entity_term.functor.is_a(this.nlg_cache_sort_verb)) return true;
		}

		return false;		
	}


	termToEnglish_VerbArgument(entityRaw:TermAttribute, speakerID:string, considerRelations:boolean, context:NLContext, subject:boolean, mainVerbSubjectID:string, useNameIfAvailable:boolean) : [string, number, string, number]
	{
		return this.termToEnglish_RelationOrVerbArgument(entityRaw, speakerID, considerRelations, context, subject, mainVerbSubjectID, useNameIfAvailable, true);
	}


	termToEnglish_RelationArgument(entityRaw:TermAttribute, speakerID:string, considerRelations:boolean, context:NLContext, subject:boolean, mainVerbSubjectID:string, useNameIfAvailable:boolean) : [string, number, string, number]
	{
		return this.termToEnglish_RelationOrVerbArgument(entityRaw, speakerID, considerRelations, context, subject, mainVerbSubjectID, useNameIfAvailable, false);
	}


	/*
	- This returns: [rendered string, person (0 = first, 1 = second, 2 = third), gender ('male', 'female'), and number (0 = singular, 1 = plural)]
	*/
	termToEnglish_RelationOrVerbArgument(entityRaw:TermAttribute, speakerID:string, considerRelations:boolean, context:NLContext, subject:boolean, mainVerbSubjectID:string, useNameIfAvailable:boolean, useInfinitives:boolean) : [string, number, string, number]
	{
		let tl:TermAttribute[] = [entityRaw];
		if (entityRaw instanceof TermTermAttribute) {
			if ((<TermTermAttribute>entityRaw).term.functor.name == "#or") {
				tl = NLParser.elementsInList((<TermTermAttribute>entityRaw).term,"#or");
				if (tl.length > 1) {
					// we are trying to render a sentence, not just a term:
					return [this.termToEnglish_Inform_ComplexSentence(tl, speakerID, context), 2, null, 0];
				}
			}
			if ((<TermTermAttribute>tl[0]).term.functor.name == "#and") {
				tl = NLParser.elementsInList((<TermTermAttribute>tl[0]).term,"#and");
			}
		}
		let entity:TermAttribute = null;
		let entityTerm:Term = null;
		// first search for a "noun":
		for(let i:number = 0;i<tl.length;i++) {
			let entity_tmp = tl[i];
			if (entity_tmp instanceof TermTermAttribute) {
				entityTerm = (<TermTermAttribute>entity_tmp).term;
				if (entityTerm.functor.is_a(context.ai.o.getSort("noun"))) {
					entity = entity_tmp;
					break; 
				}
				
			}
		}
		if (entity == null) {
			for(let i:number = 0;i<tl.length;i++) {
				entity = tl[i];
				let next:boolean = false;
				if (entity instanceof TermTermAttribute) {
					entityTerm = (<TermTermAttribute>entity).term;
					if (entityTerm.functor.is_a(context.ai.o.getSort("determiner"))) next = true;
					if (entityTerm.functor.is_a(context.ai.o.getSort("adjective"))) next = true;
				}
				if (!next) break;	// we found it!
			}
		}

		if (entity instanceof ConstantTermAttribute) {
			if (entity.sort == this.nlg_cache_sort_id) {
				return this.termToEnglish_Entity(entity, speakerID, considerRelations, context, subject, useNameIfAvailable);
			} else if (entity.sort.is_a(this.nlg_cache_sort_measuringunit)) {
				return this.termToEnglish_MeasuringUnit((<ConstantTermAttribute>entity).value, entity.sort);
			} else if (entity.sort.is_a(this.nlg_cache_sort_verb)) {
				return [this.pos.getVerbString(entity.sort, 0, 0, 0), 2, null, 0];
			} else if (entity.sort.name == "pronoun.anything") {
				return ["anything", 2, undefined, 0]
			} else if (entity.sort.name == "pronoun.something") {
				return ["something", 2, undefined, 0]
			} else if (entity.sort.name == "symbol") {
				return [(<ConstantTermAttribute>entity).value,2,null,0];
			} else {
				let nounStr:string = this.pos.getNounString(entity.sort, 0, false);
				if (nounStr != null) {
					return [nounStr,2,null,0];
				} else {
					return [(<ConstantTermAttribute>entity).value,2,null,0];
				}
			}
		}
		if ((entity instanceof VariableTermAttribute) ||
			(entity instanceof TermTermAttribute &&
			 (<TermTermAttribute>entity).term.functor.name == "noun")) return this.termToEnglish_ConceptEntity(entityRaw, speakerID, context);

		if ((entity instanceof TermTermAttribute &&
			 (<TermTermAttribute>entity).term.functor.name == "proper-noun")) {
			let properNounTerm:Term = (<TermTermAttribute>entity).term;
			if (properNounTerm.attributes[0] instanceof ConstantTermAttribute) {
				return [(<ConstantTermAttribute>(properNounTerm.attributes[0])).value, 0, null, 2];
			}
		}	

		if (entity instanceof TermTermAttribute) {
//			console.log("termToEnglish_RelationOrVerbArgument: TermTermAttribute -> " + entity);
			for(let tmp_t of tl) {
				if (!(tmp_t instanceof TermTermAttribute)) {
					console.error("termToEnglish_RelationArgument: could not render (one of the elements in the list is not a term) " + entity);	
					return null;
				}
			}
//		 	entityTerm = (<TermTermAttribute>tl[0]).term;	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers
			if (entityTerm.functor.name == "#not") entityTerm = (<TermTermAttribute>entityTerm.attributes[0]).term;
			if (entityTerm.functor.name == "#query" && entityTerm.attributes.length==1) return this.termToEnglish_QueryInternal(entityTerm.attributes[0], tl.slice(1), speakerID, context);
			if (entityTerm.functor.is_a(this.nlg_cache_sort_verb)) return this.termToEnglish_NestedVerb((<TermTermAttribute>entityRaw).term, speakerID, mainVerbSubjectID, useInfinitives, context);
			if (entityTerm.functor.is_a(this.nlg_cache_sort_timedate)) return [this.termToEnglish_Date(entityTerm.attributes[0], entityTerm.attributes[1].sort), 2, undefined, 0];
			if (entityTerm.functor.is_a(this.nlg_cache_sort_pronoun) &&
				entityTerm.attributes.length >= 2 && 
				entityTerm.attributes[0] instanceof ConstantTermAttribute) {
				let pronoun:string = (<ConstantTermAttribute>entityTerm.attributes[0]).value;
				let num:number = (entityTerm.attributes[1].sort.name == 'plural' ? 1:0);
				let gender:number = 0;
				if (entityTerm.attributes[2].sort.name == 'gender-femenine') gender = 1;
				if (entityTerm.attributes[2].sort.name == 'gender-neutral') gender = 2;
				return [this.pos.getPronounStringString(pronoun, num, gender), 2, undefined, num];
			}
			if (entityTerm.functor.is_a(this.nlg_cache_sort_property) && entityTerm.attributes.length == 1) {
				return this.termToEnglish_Property(entityRaw, speakerID, !subject, context);
			}
			if (entityTerm.functor.is_a(this.nlg_cache_sort_relation) && entityTerm.attributes.length == 2) {
				return this.termToEnglish_Relation(entityRaw, speakerID, context);
			}
			if (entityTerm.functor.is_a(this.nlg_cache_sort_haveablepropertywithvalue) && entityTerm.attributes.length == 2) {
				let infinitive:boolean = false;
				let subjectStr:[string, number, string, number] = null;
				let subjectId:string = null;
				if ((entityTerm.attributes[0] instanceof ConstantTermAttribute)) {
					subjectId = (<ConstantTermAttribute>(entityTerm.attributes[0])).value;
					if ((<ConstantTermAttribute>entityTerm.attributes[0]).value == mainVerbSubjectID) {
						infinitive = true;
					} else {
						subjectStr = this.termToEnglish_VerbArgument(entityTerm.attributes[0], speakerID, true, context, true, null, true);	
					}
				} else {	
					subjectStr = this.termToEnglish_VerbArgument(entityTerm.attributes[0], speakerID, true, context, true, null, true);
				}
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(entityTerm.attributes[1], speakerID, true, context, true, subjectId, false);
				let verbStr:string = null;
				if (infinitive) {
					verbStr = this.pos.getVerbString(context.ai.o.getSort("verb.have"), 0, 0, 0);
				} else {
					verbStr = this.pos.getVerbString(context.ai.o.getSort("verb.have"), subjectStr[3], subjectStr[1], 3);
				}
				let propertyStr:string = this.pos.getPropertyString(entityTerm.functor);
				if (verbStr != null && propertyStr != null) {
					if (propertyStr.substring(propertyStr.length-3) == " to" && 
						objectStr[0].substring(0,3) == "to ") {
						objectStr[0] = objectStr[0].substring(3);
					}					
					if (infinitive) {
//						if (negated_t) {
//							return ["not to " + verbStr + " " + propertyStr + " " + objectStr[0], 2, undefined, 0];
//						} else {
							return ["to " + verbStr + " " + propertyStr + " " + objectStr[0], 2, undefined, 0];
//						}
					} else {
//						if (negated_t) {
//							verbStr = this.pos.getVerbString(context.ai.o.getSort("verb.do"), subjectStr[3], subjectStr[1], 3);
//							return [subjectStr[0] + " " + verbStr + " not have " + propertyStr + " " + objectStr[0], 2, undefined, 0];
//						} else {
							return [subjectStr[0] + " " + verbStr + " " + propertyStr + " " + objectStr[0], 2, undefined, 0];
//						}
					}
				}
				console.warn("termToEnglish_RelationOrVerbArgument: cannot render haveable property with value: " + entityTerm);
				return null;
			}
			if (entityTerm.functor.is_a(this.nlg_cache_sort_propertywithvalue) && entityTerm.attributes.length == 2) {
				let subjectStr:[string, number, string, number] = this.termToEnglish_RelationArgument(entityTerm.attributes[0], speakerID, true, context, true, null, true);
				let verbStr:string = this.pos.getVerbString(context.ai.o.getSort("verb.be"), 0, 2, 3);
				let propertyStr:string = this.pos.getNounString(entityTerm.functor, 0, true);
				let propertyStr2:string = null;

				if (entityTerm.attributes[1] instanceof ConstantTermAttribute &&
					entityTerm.attributes[1].sort.name != "symbol") {
					if (entityTerm.attributes[1].sort.is_a(this.nlg_cache_sort_measuringunit)) {
						let unitStr:[string, number, string, number] = this.termToEnglish_MeasuringUnit((<ConstantTermAttribute>(entityTerm.attributes[1])).value, entityTerm.attributes[1].sort);
						if (unitStr != null) propertyStr2 = unitStr[0];
					} else {
					 	propertyStr2 = this.pos.getPropertyString(entityTerm.attributes[1].sort);	
					 	if (propertyStr2 == null) {
					 		propertyStr2 = this.pos.getNounString(entityTerm.functor, 0, true);
					 	}
					}
				} else {
					let objectStr:[string, number, string, number] = this.termToEnglish_RelationArgument(entityTerm.attributes[1], speakerID, true, context, false, 
																								     ((entityTerm.attributes[0] instanceof ConstantTermAttribute) ? 
																								     (<ConstantTermAttribute>(entityTerm.attributes[0])).value:null), true);
					if (objectStr != null) propertyStr2 = objectStr[0];
				}
				if (subjectStr != null && verbStr != null && propertyStr != null && propertyStr2 != null) {
					let negated_t:boolean = false;	// TODO: find the proper value for this
					if (subjectStr[0] == "I") {
						return ["my " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2, 2, undefined, 0];
					} else if (subjectStr[0] == "you") {
						return ["your " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2, 2, undefined, 0];
					} else {
						return [subjectStr[0] +"'s " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2, 2, undefined, 0];
					}			
				} else {
					console.error("termToEnglish_RelationOrVerbArgument: could not render property with value!");
				}
				return [this.termToEnglish_Inform(new Term(context.ai.o.getSort("perf.inform"),[new ConstantTermAttribute(speakerID,context.ai.o.getSort("#id")),entityRaw]), speakerID, context), 2, undefined, 0];
			}
			if ((entityTerm.functor.is_a_string("role") ||
				 entityTerm.functor.is_a_string("relative-direction")) && 
				entityTerm.attributes.length == 3) {
				// special case for "role":
				let subjectStr:[string, number, string, number] = this.termToEnglish_RelationArgument(entityTerm.attributes[0], speakerID, true, context, true, null, true);
				let verbStr:string = this.pos.getVerbString(context.ai.o.getSort("verb.be"), 0, 2, 3);
				let propertyStr:string = this.pos.getNounString(entityTerm.functor, 0, true);
				let propertyStr2:string = null;
				let propertyStr3:string = null;

				if (entityTerm.attributes[1] instanceof ConstantTermAttribute &&
					entityTerm.attributes[1].sort.name != "symbol") {
					if (entityTerm.attributes[1].sort.is_a(this.nlg_cache_sort_measuringunit)) {
						let unitStr:[string, number, string, number] = this.termToEnglish_MeasuringUnit((<ConstantTermAttribute>(entityTerm.attributes[1])).value, entityTerm.attributes[1].sort);
						if (unitStr != null) propertyStr2 = unitStr[0];
					} else {
					 	propertyStr2 = this.pos.getPropertyString(entityTerm.attributes[1].sort);	
					}
				} else {
					let objectStr:[string, number, string, number] = this.termToEnglish_RelationArgument(entityTerm.attributes[1], speakerID, true, context, false, 
																								     ((entityTerm.attributes[0] instanceof ConstantTermAttribute) ? 
																								     (<ConstantTermAttribute>(entityTerm.attributes[0])).value:null), true);
					if (objectStr != null) propertyStr2 = objectStr[0];
				}
				let objectStr2:[string, number, string, number] = this.termToEnglish_RelationArgument(entityTerm.attributes[2], speakerID, true, context, false, 
																							     ((entityTerm.attributes[0] instanceof ConstantTermAttribute) ? 
																							     (<ConstantTermAttribute>(entityTerm.attributes[0])).value:null), true);
				if (objectStr2 != null) propertyStr3 = objectStr2[0];
				if (subjectStr != null && verbStr != null && propertyStr != null && propertyStr2 != null && propertyStr3 != null) {
					let negated_t:boolean = false;	// TODO: find the proper value for this
					if (entityTerm.functor.is_a_string("relative-direction")) {
						return ["the " + propertyStr + " of " + propertyStr2 + " with respect to " + subjectStr[0] + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr3, 2, undefined, 0];
					} else {
						if (subjectStr[0] == "I") {
							return ["my " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2 + " in " + propertyStr3, 2, undefined, 0];
						} else if (subjectStr[0] == "you") {
							return ["your " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2 + " in " + propertyStr3, 2, undefined, 0];
						} else {
							return [subjectStr[0] +"'s " + propertyStr + " " + verbStr + " " + (negated_t ? "not ":"") + propertyStr2 + " in " + propertyStr3, 2, undefined, 0];
						}			
					}
				}
				return [this.termToEnglish_Inform(new Term(context.ai.o.getSort("perf.inform"),[new ConstantTermAttribute(speakerID,context.ai.o.getSort("#id")),entityRaw]), speakerID, context), 2, undefined, 0];
			}			
			if (entityTerm.functor.is_a(context.ai.o.getSort("perf.request.action"))) {
				return [this.termToEnglish_RequestAction(entityTerm, speakerID, context, false, false), 2, undefined, 0];
			}
			if (POSParser.sortIsConsideredForTypes(entityTerm.functor, this.o)) {
				//console.log("termToEnglish_Inform object, space_location, process, or role");
				return [this.renderTypeStatement(entityRaw, speakerID, context), 2, undefined, 0];
			}
		}

		console.warn("termToEnglish_RelationArgument: could not render " + entityRaw);
		return null;
	}



	termToEnglish_Property(propertyRaw:TermAttribute, speakerID:string, insertThat:boolean, context:NLContext) : [string, number, string, number]
	{
		let tl:TermAttribute[] = [propertyRaw];
		if (propertyRaw instanceof TermTermAttribute) {
			if ((<TermTermAttribute>propertyRaw).term.functor.name == "#and") {
				tl = NLParser.elementsInList((<TermTermAttribute>propertyRaw).term,"#and");
			}
		}
		let property:TermAttribute = tl[0];	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers
		if (property instanceof TermTermAttribute) {
			let num:number = undefined;
			let time:Sort = this.nlg_cache_sort_present;
			for(let t of tl) {
				if (t == property) continue;
				if (t instanceof TermTermAttribute) {
					let t_term:Term = (<TermTermAttribute>t).term;
					if (t_term.functor.is_a(context.ai.o.getSort("plural"))) num = 1;
					else if (t_term.functor.is_a(context.ai.o.getSort("singular"))) num = 0;
					else if (t_term.functor.is_a(this.nlg_cache_sort_past) ||
						 	 t_term.functor.is_a(this.nlg_cache_sort_present) ||
							 t_term.functor.is_a(this.nlg_cache_sort_future)) {
							time = t_term.functor;				
					}
				}
			}
			let property_term:Term = (<TermTermAttribute>property).term;	
			let subjectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(property_term.attributes[0], speakerID, true, context, true, null, true);
			if (num == undefined) num = subjectStr[3];
			let verbStr:string = this.verbStringWithTime(context.ai.o.getSort("verb.be"), num, subjectStr[1], time, false);
			let propertyStr:string = this.pos.getPropertyString(property_term.functor);

			if (propertyStr == null) {
				propertyStr = this.pos.getNounString(property_term.functor, 0, false);	// without trying ancestors
				if (propertyStr != null) propertyStr = "a " + propertyStr;
			}
			if (propertyStr == null) {
				propertyStr = this.pos.getNounString(property_term.functor, 0, true);		// we are despearte, try ancestors
				if (propertyStr != null) propertyStr = "a " + propertyStr;
			}

			if (verbStr != null && propertyStr != null) 
				return [(insertThat ? "that ":"") + subjectStr[0] + " " + verbStr + " " + propertyStr, 2, undefined, 0];
		}

		console.error("termToEnglish_Property: could not render " + propertyRaw);
		return null;
	}


	termToEnglish_Relation(propertyRaw:TermAttribute, speakerID:string, context:NLContext) : [string, number, string, number]
	{
		let tl:TermAttribute[] = [propertyRaw];
		if (propertyRaw instanceof TermTermAttribute) {
			if ((<TermTermAttribute>propertyRaw).term.functor.name == "#and") {
				tl = NLParser.elementsInList((<TermTermAttribute>propertyRaw).term,"#and");
			}
		}
		let relation:TermAttribute = tl[0];	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers
		if (relation instanceof TermTermAttribute) {
			let att1:TermAttribute = (<TermTermAttribute>relation).term.attributes[0];
			let att2:TermAttribute = (<TermTermAttribute>relation).term.attributes[1];

			let objectStr1:[string, number, string, number] = this.termToEnglish_VerbArgument(att1, speakerID, true, context, false, null, true);
			let objectStr2:[string, number, string, number] = this.termToEnglish_VerbArgument(att2, speakerID, true, context, false, null, true);
			let relationStr:string = this.pos.getRelationString((<TermTermAttribute>relation).term.functor);
			if (objectStr1 == null) return null;
			if (objectStr2 == null) return null;

			if ((<TermTermAttribute>relation).term.functor.name == "relation.howto") {
				// special case for how to:
				return ["the way " + objectStr1[0] + " is " + objectStr2[0], 2, null, objectStr1[3]];
			}
			if (relationStr == null) return null;
			let verbStr:string = this.pos.getVerbString(context.ai.o.getSort("verb.be"), objectStr1[3], objectStr1[1], 3);
			return [objectStr1[0] + " " + verbStr + " " + relationStr + " " + objectStr2[0], 2, null, objectStr1[3]];
		}

		console.error("termToEnglish_Property: could not render " + propertyRaw);
		return null;
	}


	/*
	- This returns: [rendered string, person (0 = first, 1 = second, 2 = third), gender ('male', 'female'), and number (0 = singular, 1 = plural)]
	- definite == true, makes the returning string have "the", otherwise it has a/an
	*/
	termToEnglish_ConceptEntity(entityRaw:TermAttribute, speakerID:string, context:NLContext) : [string, number, string, number]
	{
		if (this.renderingSentenceVariables != null &&
			(entityRaw instanceof VariableTermAttribute)) {
			if (entityRaw.sort.name == "any" ||
				entityRaw.sort.name == "number" ||
				entityRaw.sort.name == "#id") {
				let idx:number = this.renderingSentenceVariables.indexOf(entityRaw);
				if (idx == -1) {
					idx = this.renderingSentenceVariables.length;
					this.renderingSentenceVariables.push(entityRaw);
				}
				return ["X"+(idx+1), 2, null, 0];
			}
		}

		let tl:TermAttribute[] = [entityRaw];
		if (entityRaw instanceof TermTermAttribute) {
			if ((<TermTermAttribute>entityRaw).term.functor.name == "#and") {
				tl = NLParser.elementsInList((<TermTermAttribute>entityRaw).term,"#and");
			}
		}
//		console.log("termToEnglish_ConceptEntity: " + entityRaw);

		// the_article, number, preComplementsStr, postComplementsStr, entity
		let entity_properties:[boolean,number,string,string][] = [];
		let entities:TermAttribute[] = [];
		for(let t of tl) {
//			console.log("considering: " + t + " (entities: " + entities + ")");
			if (t instanceof VariableTermAttribute) {
				if (entities.indexOf(t) == -1) {
					entities.push(t);
					entity_properties.push([false, 0, "", ""]);
				}
			} else if ((t instanceof TermTermAttribute) &&
			 	 	   (<TermTermAttribute>t).term.functor.name == "noun" &&
			 	 	   (<TermTermAttribute>t).term.attributes.length == 2) {
				let t_entity_idx = entities.indexOf(t);
				if (t_entity_idx == -1) {
					// check if we need to replace the previous entry in the list by the "noun" structure
					// This is because some elements like adjectives refer to the entity by its first parameter, rather
					// than by the whole structure.
					for(let i:number = 0;i<entities.length;i++) {
						if ((<TermTermAttribute>t).term.attributes[0] == entities[i]) {
							t_entity_idx = i;
							break;
						}
					}
					if (t_entity_idx == -1) {
						entities.push(t);
						entity_properties.push([false, 0, "", ""]);
					} else {
						entities[t_entity_idx] = t;
					}
				}
			} else if (t instanceof TermTermAttribute) {
				let t_term:Term = (<TermTermAttribute>t).term;
				if (t_term.functor.is_a(context.ai.o.getSort("plural"))) {
//					number = 1;
					let t_entity:TermAttribute = t_term.attributes[0];
					let t_entity_idx = entities.indexOf(t_entity);
					if (t_entity_idx == -1) {
						for(let i:number = 0;i<entities.length;i++) {
							if (entities[i] instanceof TermTermAttribute &&
								(<TermTermAttribute>entities[i]).term.functor.name == "noun" &&
								(<TermTermAttribute>entities[i]).term.attributes.length == 2) {
								if ((<TermTermAttribute>entities[i]).term.attributes[0] == t_entity) {
									t_entity_idx = i;
									break;
								}
							}
						}
					}
					if (t_entity_idx == -1) {
						t_entity_idx = entities.length;
						entities.push(t_entity);
						entity_properties.push([false, 0, "", ""]);
					}
					entity_properties[t_entity_idx][1] = 1;
				} else if (t_term.functor.is_a(context.ai.o.getSort("the"))) {
					//the_article = true;
					let t_entity:TermAttribute = t_term.attributes[0];
					let t_entity_idx = entities.indexOf(t_entity);
					if (t_entity_idx == -1) {
						for(let i:number = 0;i<entities.length;i++) {
							if (entities[i] instanceof TermTermAttribute &&
								(<TermTermAttribute>entities[i]).term.functor.name == "noun" &&
								(<TermTermAttribute>entities[i]).term.attributes.length == 2) {
								if ((<TermTermAttribute>entities[i]).term.attributes[0] == t_entity) {
									t_entity_idx = i;
									break;
								}
							}
						}
					}
					if (t_entity_idx == -1) {
						t_entity_idx = entities.length;
						entities.push(t_entity);
						entity_properties.push([false, 0, "", ""]);
					}
					entity_properties[t_entity_idx][0] = true;
				} else if (t_term.functor.is_a(context.ai.o.getSort("determiner"))) {
					let num:number = 0;
					let t_entity:TermAttribute = t_term.attributes[0];
					let t_entity_idx = entities.indexOf(t_entity);
					if (t_entity_idx == -1) {
						for(let i:number = 0;i<entities.length;i++) {
							if (entities[i] instanceof TermTermAttribute &&
								(<TermTermAttribute>entities[i]).term.functor.name == "noun" &&
								(<TermTermAttribute>entities[i]).term.attributes.length == 2) {
								if ((<TermTermAttribute>entities[i]).term.attributes[0] == t_entity) {
									t_entity_idx = i;
									break;
								}
							}
						}
					}
					if (t_entity_idx == -1) {
						t_entity_idx = entities.length;
						entities.push(t_entity);
						entity_properties.push([false, 0, "", ""]);
					}
					if (t_term.attributes.length >= 2) {
						if (t_term.attributes[1].sort.name == 'plural') num = 1;
					}
					let detStr:string = this.pos.getDeterminerString(t_term.functor, num);
					if (detStr != null) {
						//preComplementsStr = detStr + " " + preComplementsStr;
						entity_properties[t_entity_idx][2] = detStr + " " + entity_properties[t_entity_idx][2];
					} else {
						console.error("termToEnglish_ConceptEntity: getDeterminerString is null for " + t_term);
					}
				} else if (t_term.functor.name == "adjective" &&
						   t_term.attributes.length == 2 &&
						   t_term.attributes[1] instanceof ConstantTermAttribute) {
					let t_entity:TermAttribute = t_term.attributes[0];
					let t_entity_idx = entities.indexOf(t_entity);
					if (t_entity_idx == -1) {
						for(let i:number = 0;i<entities.length;i++) {
							if (entities[i] instanceof TermTermAttribute &&
								(<TermTermAttribute>entities[i]).term.functor.name == "noun" &&
								(<TermTermAttribute>entities[i]).term.attributes.length == 2) {
								if ((<TermTermAttribute>entities[i]).term.attributes[0] == t_entity) {
									t_entity_idx = i;
									break;
								}
							}
						}
					}
					if (t_entity_idx == -1) {
						t_entity_idx = entities.length;
						entities.push(t_entity);
						entity_properties.push([false, 0, "", ""]);
					}
					let adjSort:Sort = this.o.getSort((<ConstantTermAttribute>t_term.attributes[1]).value);
					let adjStr:string = this.pos.getPropertyString(adjSort);
					if (adjStr != null) {
						//preComplementsStr = detStr + " " + preComplementsStr;
						entity_properties[t_entity_idx][2] = adjStr + " " + entity_properties[t_entity_idx][2];
					} else {
						console.error("termToEnglish_ConceptEntity: getPropertyString is null for " + t_term);
					}

				} else if (t_term.functor.is_a(context.ai.o.getSort("relation"))) {
					let relationString:string = null;
					let otherEntity:TermAttribute = null;
					//let t_entity:TermAttribute = null;
					let t0_entity_idx:number = -1;
					let t1_entity_idx:number = -1;
					for(let i:number = 0;i<entities.length;i++) {
						if (entities[i] == t_term.attributes[0]) {
							t0_entity_idx = i;
							break;							
						}
						if (entities[i] instanceof TermTermAttribute &&
							(<TermTermAttribute>entities[i]).term.functor.name == "noun" &&
							(<TermTermAttribute>entities[i]).term.attributes.length == 2) {
							if ((<TermTermAttribute>entities[i]).term.attributes[0] == t_term.attributes[0]) {
								t0_entity_idx = i;
								break;
							}
						}
					}
					for(let i:number = 0;i<entities.length;i++) {
						if (entities[i] == t_term.attributes[1]) {
							t1_entity_idx = i;
							break;							
						}
						if (entities[i] instanceof TermTermAttribute &&
							 (<TermTermAttribute>entities[i]).term.functor.name == "noun" &&
							 (<TermTermAttribute>entities[i]).term.attributes.length == 2) {
							if ((<TermTermAttribute>entities[i]).term.attributes[0] == t_term.attributes[1]) {
								t1_entity_idx = i;
								break;
							}
						}
					}
					let t_entity_idx = -1;
					if (t0_entity_idx != -1) {
						//t_entity = t_term.attributes[0];
						otherEntity = <ConstantTermAttribute>(t_term.attributes[1]);
						relationString = this.pos.getRelationString(t_term.functor)
						t_entity_idx = t0_entity_idx;
					} else if (t1_entity_idx != -1) {
						//t_entity = t_term.attributes[1];
						otherEntity = <ConstantTermAttribute>(t_term.attributes[0]);
						let reverseSortName:string = this.pos.reverseRelations[t_term.functor.name];
						if (reverseSortName != null) {
							let reverseSort:Sort = context.ai.o.getSort(reverseSortName);
							relationString = this.pos.getRelationString(reverseSort)
						} 
						t_entity_idx = t1_entity_idx;
					}
//					console.log("entities: " + entities);
//					console.log("otherEntity: " + otherEntity);
					if (otherEntity != null) {
						let tmp:[string, number, string, number] = this.termToEnglish_VerbArgument(otherEntity, speakerID, true, context, false, null, true);
//						console.log("tmp: " + tmp);
						if (tmp != null) {
							let otherEntityString:string = tmp[0];
							if (otherEntityString != null) {
								let tmpStr:string = relationString + " " + otherEntityString;
								if (tmpStr == "of you") {
									//preComplementsStr = "your " + preComplementsStr;
									entity_properties[t_entity_idx][2] = "your " + entity_properties[t_entity_idx][2];
								} else if (tmpStr == "of I" ||
										   tmpStr == "of me") {
									//preComplementsStr = "my " + preComplementsStr;
									entity_properties[t_entity_idx][2] = "my " + entity_properties[t_entity_idx][2];
								} else {
									//postComplementsStr += " " + tmpStr;
									entity_properties[t_entity_idx][3] += " " + tmpStr;
								}
							}
						} else {
							console.error("termToEnglish_ConceptEntity: cannot render other entity ID " + otherEntity);
						}
					}
//					console.log("relationString: " + relationString);
				} else {
					console.warn("ignoring term: " + t_term);
				}
			}
		}

		let outputNumber:number = 0;
		let outputText:string = null;
		for(let entity_idx:number = 0;entity_idx<entities.length;entity_idx++) {
			let entityText:string = null;
			let entity:TermAttribute = entities[entity_idx];
			let the_article:boolean = entity_properties[entity_idx][0];
			let number:number = entity_properties[entity_idx][1];
			let preComplementsStr:string = entity_properties[entity_idx][2];
			let postComplementsStr:string = entity_properties[entity_idx][3];
			let sort:Sort = entity.sort;
			let needsArticle:boolean = true;

//			console.log("rendering entity ("+entity_idx+"): " + entities[entity_idx] + " " + entity_properties[entity_idx]);

			if (entity instanceof TermTermAttribute &&
				(<TermTermAttribute>entity).term.functor.name == "noun") {
				let entity_t:Term = (<TermTermAttribute>entity).term;
				if (entity_t.attributes.length >= 1 &&
					entity_t.attributes[0] instanceof ConstantTermAttribute) {
					sort = context.ai.o.getSort((<ConstantTermAttribute>entity_t.attributes[0]).value);
				}
				if (entity_t.attributes.length >= 2 &&
					entity_t.attributes[1] instanceof VariableTermAttribute) {
					if (entity_t.attributes[1].sort.name == "plural") number = 1;
				}
			}
			let word:string = this.pos.getAdverbString(sort);
			if (word != null) needsArticle = false;
			if (word == null) {
				word = this.pos.getTypeString(sort, number);
			}
			if (word == null) {
				let sort_l:Sort[] = sort.getAncestors();
				for(let ts of sort_l) {
					word = this.pos.getTypeString(ts, 0);
					if (word != null) {
						sort = ts;
						break;
					}
				}
			}
			if (word == null) {
				word = this.pos.getPropertyString(sort);
				if (word != null) {
					preComplementsStr = "something that is " + preComplementsStr;
				}
			}
			if (word == null && 
				(sort.name == "property" || sort.name == "property-with-value")) {
				word = "property";
			}

			if (word == null) {
				continue;
//				console.error("termToEnglish_ConceptEntity NLPos could not generate a type string for " + sort + " for " + entityRaw);
//				return null;
			}

			if (needsArticle) {
				if (number == 0) {
					if (the_article) preComplementsStr = "the " + preComplementsStr;
					if (preComplementsStr == "" && this.pos.isCountable(word)) {
						preComplementsStr = this.aVSanArticle(word) + " ";
					} else if (preComplementsStr == "a " ||
							   preComplementsStr == "an ") {
						preComplementsStr = this.aVSanArticle(word) + " ";
					}
					entityText = preComplementsStr + word + postComplementsStr;
				} else {
					if (the_article) preComplementsStr = "the " + preComplementsStr;
					//return [preComplementsStr + word + postComplementsStr, 2, undefined, number];
					entityText = preComplementsStr + word + postComplementsStr;
				}
			} else {
				entityText = preComplementsStr + word + postComplementsStr;
			}

			if (outputText == null) {
				outputText = entityText;
			} else {
				outputText += " and " + entityText;
			}
			outputNumber = Math.max(outputNumber, number);
		}
		return [outputText, 2, undefined, outputNumber];
	}


	/*
	- This returns: [rendered string, person (0 = first, 1 = second, 2 = third), gender ('male', 'female'), and number (0 = singular, 1 = plural)]
	- Note:
		- This case is not handled: if a relation "r(X1,X2)" is present (X1 = entity), and there is another object X3, such that
		  "r(X1,X3)" is also present, and X2 and X3 are of the same type, this will return a description that is not specific enough.
	*/
	termToEnglish_Entity(entity:TermAttribute, speakerID:string, considerRelations:boolean, context:NLContext, subject:boolean, useNameIfAvailable:boolean) : [string, number, string, number]
	{
		if (!(entity instanceof ConstantTermAttribute)) return null;
		let ai:RuleBasedAI = context.ai;
		let entityID:string = (<ConstantTermAttribute>entity).value;

//		console.log("termToEnglish_Entity, entity: " + entity + ", speakerID: " + speakerID + ", selfID: " + ai.selfID);

		if (entityID == speakerID) {
			if (subject) return ["I", 0, undefined, 0];
				    else return ["me", 0, undefined, 0];
		}
		if (entityID == context.speaker) return ["you", 1, undefined, 0];

		// get all the properties of the entity:
		let ce:NLContextEntity = context.newContextEntity(<ConstantTermAttribute>entity, undefined, undefined, ai.o);
		let nameTerms:Term[] = [];
		let typeTerms:Term[] = [];
		let PRTerms:Term[] = [];
		if (ce == null) {
			console.error("termToEnglish_Entity: could not render " + entity + " (" + nameTerms.length + " nameTerms, " + typeTerms.length + " typeTerms)");
			console.error("termToEnglish_Entity: ce is null!");
			return [entityID, 2, undefined, 0];
		}
		for(let t of ce.terms) {
//			console.log("for " + entity + ": " + t);
			if (t.functor.is_a(this.nlg_cache_sort_name)) nameTerms.push(t);
			if (t.attributes.length == 1 && POSParser.sortIsConsideredForTypes(t.functor, this.o)) typeTerms.push(t);
			if (t.functor.is_a(this.nlg_cache_sort_property)) PRTerms.push(t);
			if (considerRelations) {
				if (t.functor.is_a(this.nlg_cache_sort_relation)) {
					PRTerms.push(t);
//					console.log("PRTerm.push( " + t + " )");
				}
			}
		}

		if (useNameIfAvailable && nameTerms.length > 0) {
			let nameTerm:Term = nameTerms[0];
			if (nameTerm.attributes[1] instanceof ConstantTermAttribute) {
				let name:string = (<ConstantTermAttribute>nameTerm.attributes[1]).value;
				if (name.indexOf(" room")!=-1 ||
					name.indexOf(" key")!=-1) return ["the " + name, 2, undefined, 0];
				return [name, 2, undefined, 0];
			}
		}

//		console.log("termToEnglish_Entity, typeTerms: " + typeTerms.length + ", nameTerms: " + nameTerms.length + ", PRTerms: " + PRTerms.length);

		if (typeTerms.length > 0) {
			let typeTerm:Term = typeTerms[0];
			let typeSort:Sort = typeTerm.functor;
			let typeString:string = this.pos.getTypeString(typeSort, 0);
			if (typeString == null) {
				let typeSort_l:Sort[] = typeSort.getAncestors();
				for(let ts of typeSort_l) {
					typeString = this.pos.getTypeString(ts, 0);
					if (typeString != null) {
						typeSort = ts;
						break;
					}
				}
			}
			if (typeString == null) {
				console.error("termToEnglish_Entity: could not render type " + typeTerm);
				return [entityID, 2, undefined, 0];
			}

			// determine if it's enough:
			let msl:NLContextEntity[][] = context.findEntitiesOfSort(typeSort, ai.o);
			let candidates:NLContextEntity[] = context.applySingularTheDeterminer(msl);
			if (candidates.length == 1 && candidates[0] == ce) {
				return ["the " + typeString, 2, undefined, 0];
			}

			// we need to be more precise!
			let selectedPRPair:[Term[], number] = this.selectEntityDifferentiatingPropertiesAndRelations(PRTerms, msl, ce, context, ai.o);
			let selectedPRs:Term[] = selectedPRPair[0];
//			console.log("selectedPRs: " + selectedPRs);
			if (selectedPRs == null) {
				return [this.aVSanArticle(typeString) + " " + typeString, 2, undefined, 0]
			} else {
				let defaultDeterminer:string = "the";
				if (selectedPRPair[1]>1) defaultDeterminer = "a";
				let preoutput:string = "";
				let postoutput:string = "";
				let determiner:boolean = false;
				for(let pr of selectedPRs) {
					if (pr.attributes.length == 1) {
						// property:
						let propertyString:string = this.pos.getPropertyString(pr.functor);
						if (propertyString != null) {
							preoutput = preoutput.trim() + " " + propertyString + " ";
						} else {
//							console.error("Cannot render property: " + pr)
						}
					} else if (pr.attributes.length == 2 &&
							   pr.functor.is_a(this.nlg_cache_sort_propertywithvalue) &&
							   pr.attributes[1] instanceof ConstantTermAttribute) {
						// property with value:
						let propertyString:string = this.pos.getPropertyString(pr.attributes[1].sort);
						if (propertyString != null) {
							preoutput = preoutput.trim() + " " + propertyString + " ";
						} else {
//							console.error("Cannot render property: " + pr)
						}
					} else {
						// relations:
//						console.log("trying to add: " + pr);
						let relationString:string = null;
						let otherEntityID:ConstantTermAttribute = null;
						if ((pr.attributes[0] instanceof ConstantTermAttribute) &&
							(<ConstantTermAttribute>pr.attributes[0]).value == entityID) {
							if (pr.attributes[1] instanceof ConstantTermAttribute) {
								otherEntityID = <ConstantTermAttribute>(pr.attributes[1]);
							}
							relationString = this.pos.getRelationString(pr.functor)
						} else {
							if (pr.attributes[0] instanceof ConstantTermAttribute) {
								otherEntityID = <ConstantTermAttribute>(pr.attributes[0]);
							}
							let reverseSortName:string = this.pos.reverseRelations[pr.functor.name];
							if (reverseSortName != null) {
								let reverseSort:Sort = ai.o.getSort(reverseSortName);
								relationString = this.pos.getRelationString(reverseSort)
							} 
						}
//						console.log("entityID: " + entityID);
//						console.log("otherEntityID: " + otherEntityID);
						if (otherEntityID != null) {
							let otherEntityString:string = this.termToEnglish_Entity(otherEntityID, speakerID, false, context, false, true)[0];
							if (otherEntityString != null) {
								let tmpStr:string = relationString + " " + otherEntityString;
								if (tmpStr == "of you") {
									determiner = true;
									preoutput = "your " + preoutput.trim();
								} else if (tmpStr == "of I" ||
										   tmpStr == "of me") {
									determiner = true;
									preoutput = "my " + preoutput.trim();
								} else {
									postoutput += " " + tmpStr;
								}
							}
						}
					}
				}

				if (!determiner) {
					if (defaultDeterminer == "a") {
						if (preoutput == "") defaultDeterminer = this.aVSanArticle(typeString);
										else defaultDeterminer = this.aVSanArticle(preoutput.trim());
					}
					preoutput = defaultDeterminer + " " + preoutput.trim();
				}

				// console.log("termToEnglish_Entity, entity: " + entity + ", preoutput: " + preoutput + ", typeString: " + typeString + ", postoutput: " + postoutput);				

				return [preoutput.trim() + " " + typeString + postoutput, 2, undefined, 0]
			}
		}

		console.error("termToEnglish_Entity: could not render " + entity + " (" + nameTerms.length + " nameTerms, " + typeTerms.length + " typeTerms)");
		console.error("termToEnglish_Entity: terms: " + ce.terms);
		return [entityID, 2, undefined, 0];
	}


	termToEnglish_EntityName(entity:ConstantTermAttribute, context:NLContext) : string
	{
		let ai:RuleBasedAI = context.ai;
		let targetID:string = entity.value;
		// first, check if we know the name:
		let name:TermAttribute = ai.noInferenceQueryValue(Term.fromString("name('"+targetID+"'[#id],NAME:[symbol])", ai.o), ai.o, "NAME");
		if (name != null &&
			name instanceof ConstantTermAttribute) return (<ConstantTermAttribute>name).value;

		// otherwise, just see what do we know about this entity:
		let results:Sentence[] = ai.longTermMemory.allSingleTermMatches(ai.o.getSort("object"),1,ai.o);
		let candidateSorts:Sort[] = [];
		for(let result of results) {
//			console.log("result: " + result);
			if ((result.terms[0].attributes[0] instanceof ConstantTermAttribute) &&
				(<ConstantTermAttribute>(result.terms[0].attributes[0])).value == targetID) {
				if (candidateSorts.indexOf(result.terms[0].functor) == -1) {
					candidateSorts.push(result.terms[0].functor);
					let ancestors:Sort[] = result.terms[0].functor.getAncestors();
					for(let s of ancestors) {
						if (s.is_a(ai.o.getSort("object")) &&
							candidateSorts.indexOf(s)==-1) candidateSorts.push(s); 
					}
				}
			}
		}
		let results2:[Term, Bindings][] = ai.shortTermMemory.allMatches(Term.fromString("object('"+targetID+"'[#id])",ai.o));
//		console.log(results2.length + " out of " + ai.shortTermMemory.plainTermList.length + " match");
		for(let tmp of results2) {
			let term:Term = tmp[0];
//			console.log("result2: " + term);
			if ((term.attributes[0] instanceof ConstantTermAttribute) &&
				(<ConstantTermAttribute>(term.attributes[0])).value == targetID) {
				if (candidateSorts.indexOf(term.functor) == -1) {
					candidateSorts.push(term.functor);
					let ancestors:Sort[] = term.functor.getAncestors();
					for(let s of ancestors) {
						if (s.is_a(ai.o.getSort("object")) &&
							candidateSorts.indexOf(s)==-1) candidateSorts.push(s); 
					}
				}
			}
		}
		let currentName:string = null;
		let currentSort:Sort = null;
		for(let s of candidateSorts) {
			let tmp:string = this.pos.getTypeString(s,0);
			if (tmp != null) {
				if (currentSort == null ||
					s.is_a(currentSort)) {
					currentName = tmp;
					currentSort = s;
				}
			}
		}

		return currentName;
	}


	/*
	Assumes the first element of "tl" is #query(VARIABLE), and that the rest of terms in tl represent the query, for which VARIABLE is the answer
	*/
	termToEnglish_Query(variable:TermAttribute, rest:TermAttribute, speakerID:string, context:NLContext) : string
	{
		let tl:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>rest).term,"#and");
		for(let tmp_t of tl) {
			if (!(tmp_t instanceof TermTermAttribute)) {
				console.error("termToEnglish_Query: could not render (one of the elements in the list is not a term) " + rest);	
				return "[NLG ERROR: termToEnglish_Query]";
			}
		}

		return this.termToEnglish_QueryInternal(variable, tl, speakerID, context)[0] + "?";
	}


	/* examples:
		X, name('listener',X)  ->  what is your name?
		X, name('speaker',X)   ->  what is my name?
		X, color('chairID',X)  ->  what is the color of the chair?
		X, color(X,[white])    ->  what is colored white?
		X, in(X, 'crateID')    ->  what is in the crate?
	   patterns:
		X, R(X, [SORT])	-> what is R SORT?
		X, R(X, ID)	    -> what is R ID?
		X, R([SORT], X) -> what is the R of a SORT? (if R is a property-with-value)
						-> what is a SORT R? (otherwise)
		X, R(ID, X) 	-> what is the R of ID?	(if R is a property-with-value)
						-> what is your/my ID? 	(if R is a property-with-value)
		X, R(ID, X)		-> what is ID R? (otherwise)
	*/
	termToEnglish_QueryInternal(variable:TermAttribute, tl:TermAttribute[], speakerID:string, context:NLContext) : [string, number, string, number]
	{
		if (tl.length == 1 && 
			(tl[0] instanceof TermTermAttribute)) {
			// this is the only case we know how to consider fow now:
			let constraint:Term = (<TermTermAttribute>(tl[0])).term;
			if (constraint.functor.is_a(this.nlg_cache_sort_relation) && constraint.attributes.length == 2) {
				let att1:TermAttribute = constraint.attributes[0];
				let att2:TermAttribute = constraint.attributes[1];

				if (att1 == variable) {
					console.error("termToEnglish_QueryInternal: could not render (constraint not yet considered) " + tl);
					// ...
				} else if (att2 == variable) {
					let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(att1, speakerID, true, context, false, null, true);
					if (objectStr == null) return null;
					if (objectStr[0] == "you") {
						return ["what are you " + this.pos.getRelationString(constraint.functor), 2, undefined, 0];
					} else if (objectStr[0] == "me") {
						return ["what am I " + this.pos.getRelationString(constraint.functor), 2, undefined, 0];
					} else {
						return ["what is " + objectStr[0] + this.pos.getRelationString(constraint.functor), 2, undefined, 0];
					}
				} else {
					console.error("termToEnglish_QueryInternal: could not render (variable not found in constraint) " + tl);
				}
			} else if (constraint.functor.is_a(this.nlg_cache_sort_propertywithvalue) && constraint.attributes.length == 2) {
				let att1:TermAttribute = constraint.attributes[0];
				let att2:TermAttribute = constraint.attributes[1];

				if (att1 == variable) {
					console.error("termToEnglish_QueryInternal: could not render (constraint not yet considered) " + tl);
					// ...
				} else if (att2 == variable) {
					let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(att1, speakerID, true, context, false, null, true);
					if (objectStr == null) return null;
					if (objectStr[0] == "you") {
						return ["what is your " + this.pos.getNounString(constraint.functor, 0, true), 2, undefined, 0];
					} else if (objectStr[0] == "me") {
						return ["what is my " + this.pos.getNounString(constraint.functor, 0, true), 2, undefined, 0];
					} else {
						return ["what is the " + this.pos.getNounString(constraint.functor, 0, true) + " of " + objectStr[0], 2, undefined, 0];
					}
				}
			} else {
				console.error("termToEnglish_QueryInternal: could not render (constraint not yet considered) " + tl);
			}
		}

		console.error("termToEnglish_QueryInternal: could not render " + tl);
		return null;
	}


	termToEnglish_Where(target:TermAttribute, speakerID:string, context:NLContext) : string
	{
		if (target instanceof ConstantTermAttribute) {
			let targetStr:[string, number, string, number] = this.termToEnglish_VerbArgument(target, speakerID, true, context, true, null, true);
			if (targetStr != null) {
				let verbStr:string = this.pos.getVerbString(context.ai.o.getSort("verb.be"), targetStr[3], targetStr[1], 3);
				if (verbStr != null) {
					return "where " + verbStr + " " + targetStr[0] + "?";
				} else {
					console.error("termToEnglish_Where: could not render verb");
				}
			} else {
				console.error("termToEnglish_Where: could not render target: " + target);
			}
		} else {
			console.error("termToEnglish_Where: could not render (target is not a constant) " + target);			
		}

		console.error("termToEnglish_Where: could not render " + target);
		return target.toString();
	}


	termToEnglish_How(performative:Term, speakerID:string, context:NLContext) : string	
	{
		if (!(performative.attributes[1] instanceof TermTermAttribute)) return null;
		let verbStr:[string, number, string, number] = this.termToEnglish_NestedVerb((<TermTermAttribute>performative.attributes[1]).term, speakerID, null, false, context);
		if (verbStr == null) return null;
		return "How can " + verbStr[0] + "?";
	}


	termToEnglish_Date(date:TermAttribute, resolution:Sort) : string
	{
	    let months:string[] = ["January", "February", "March", "April", 
	                           "May", "June", "July", "August", 
	                           "September", "October", "November", "December"];
	    let days:string[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

		if (!(date instanceof ConstantTermAttribute)) return null;
		if (!(date.sort.name == "number")) return null;
		let dateNumber:number = Number((<ConstantTermAttribute>date).value);
		if (resolution.name == "time.second") {
			return ""+(getCurrentDaySecond(dateNumber)%60);
		} else if (resolution.name == "time.minute") {
			let h:number = getCurrentDayHour(dateNumber);
			if (h==0) {
				return "12:" + numberToStringTwoDigits(getCurrentDayMinute(dateNumber)%60) + "am";
			} else if (h<12) {
				return getCurrentDayHour(dateNumber) + ":" + numberToStringTwoDigits(getCurrentDayMinute(dateNumber)%60) + "am";
			} else {
				return getCurrentDayHour(dateNumber) + ":" + numberToStringTwoDigits(getCurrentDayMinute(dateNumber)%60) + "pm";
			}
		} else if (resolution.name == "time.hour") {
			let h:number = getCurrentDayHour(dateNumber);
			if (h==0) {
				return "12am";
			} else if (h<12) {
				return getCurrentDayHour(dateNumber) + "am";
			} else {
				return getCurrentDayHour(dateNumber) + "pm";
			}
		} else if (resolution.name == "time.day") {
			let monthDay:number = getCurrentDayOfTheMonth(dateNumber)+1;
			let monthDayStr:string = monthDay + "th";
			if ((monthDay % 10) == 1 && (monthDay%100) != 11) {
				monthDayStr = monthDay + "st";
			} else if ((monthDay % 10) == 2 && (monthDay%100) != 12) {
				monthDayStr = monthDay + "nd";
			} else if ((monthDay % 10) == 3 && (monthDay%100) != 13) {
				monthDayStr = monthDay + "rd";
			}
		    return days[getCurrentDayOfTheWeek(dateNumber)] + ", " + 
                   months[getCurrentMonth(dateNumber)] + " " + monthDayStr + ", year " + getCurrentYear(dateNumber);
		} else if (resolution.name == "time.week") {
		    return "week " + (1+Math.floor(getCurrentYearDay(dateNumber)/7)) + ", year " + getCurrentYear(dateNumber);
		} else if (resolution.name == "time.month") {
		    return months[getCurrentMonth(dateNumber)] + ", year " + getCurrentYear(dateNumber);
		} else if (resolution.name == "time.year") {
		    return "year " + getCurrentYear(dateNumber);
		} else if (resolution.name == "time.century") {
			let century:number = (1+Math.floor(getCurrentYear(dateNumber)/100));
			if ((century%10) == 1 && (century%100) != 11) {
				return century + "st century";
			} else if ((century%10) == 2 && (century%100) != 12) {
				return century + "nd century";
			} else if ((century%10) == 3 && (century%100) != 13) {
				return century + "rd century";
			} else {
				return century + "th century";
			}
		} else if (resolution.name == "time.millenium") {
			let millenium:number = (1+Math.floor(getCurrentYear(dateNumber)/1000));
			if ((millenium%10) == 1 && (millenium%100) != 11) {
				return millenium + "st millenium";
			} else if ((millenium%10) == 2 && (millenium%100) != 12) {
				return millenium + "nd millenium";
			} else if ((millenium%10) == 3 && (millenium%100) != 13) {
				return millenium + "rd millenium";
			} else {
				return millenium + "th millenium";
			}
		}

		return null;
	}


	// 	- This returns: [rendered string, person (0 = first, 1 = second, 2 = third), gender ('male', 'female'), and number (0 = singular, 1 = plural)]
	termToEnglish_MeasuringUnit(amount:string, unit:Sort) : [string, number, string, number]
	{
		let value:number = Number(amount);
		if (isNaN(value)) return null;
		let number:number = 1;	// plural
		if (Number(value) == 1) number = 0;	// singular
		let unitStr:string = this.pos.getTypeString(unit, number);

		return [amount + " " + unitStr, 2, null, number];		
	}


	/*
	Renders a verb clause that is the argument of another verb
	- This returns: [rendered string, person (0 = first, 1 = second, 2 = third), gender ('male', 'female'), and number (0 = singular, 1 = plural)]
	*/
	termToEnglish_NestedVerb(t_raw:Term, speakerID:string, mainVerbSubjectID:string, verbsInInfinitive:boolean, context:NLContext) : [string, number, string, number]
	{	
//		console.log("termToEnglish_NestedVerb: " + t_raw);
//		console.log("termToEnglish_NestedVerb: speakerID " + speakerID);
//		console.log("termToEnglish_NestedVerb: mainVerbSubjectID " + mainVerbSubjectID);
		let tl:TermAttribute[];
		if (t_raw.functor.name == "#and") {
			tl = NLParser.elementsInList(t_raw,"#and");
			for(let tmp_t of tl) {
				if (!(tmp_t instanceof TermTermAttribute)) {
					console.error("termToEnglish_NestedVerb: could not render (one of the elements in the list is not a term) " + t_raw);	
					return null;
				}
			}
		} else {
			tl = [new TermTermAttribute(t_raw)];
		}
		let negated_t:boolean = false;
		let t:Term = (<TermTermAttribute>tl[0]).term;	// ASSUMPTION!!!: the main term is the first in case there is a list, and the rest should be qualifiers
		if (t.functor.name == "#not") {
			negated_t = true;
			t = (<TermTermAttribute>(t.attributes[0])).term;
		}

		let verbComplements = "";
		for(let tmp_t2 of tl) {
			let t2:Term = (<TermTermAttribute>tmp_t2).term;
			if (t2 == t) continue;
			if (t2.attributes.length == 1 &&
				(t2.attributes[0] instanceof TermTermAttribute) &&
				(<TermTermAttribute>(t2.attributes[0])).term == t) {

				if (t2.functor.name == "time.later") verbComplements += " later";
				if (t2.functor.name == "time.first") verbComplements += " first";
				if (t2.functor.name == "time.now") verbComplements += " now";
				if (t2.functor.name == "time.subsequently") verbComplements += " after that";
			} else if (t2.attributes.length == 2 &&
				t2.functor.is_a(this.nlg_cache_sort_relation) &&
				(t2.attributes[0] instanceof TermTermAttribute) &&
				(<TermTermAttribute>(t2.attributes[0])).term == t) {
				// render the relation as a verb complement:
				let relationStr:string = this.pos.getRelationString(t2.functor);
				let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t2.attributes[1], speakerID, true, context, false, null, true);

				verbComplements += " " + relationStr + " " + objectStr[0];
			} else {
				console.warn("termToEnglish_NestedVerb: cannot render verb complement " + t2);					
			}
		}		


		if (t.functor.is_a(context.ai.o.getSort("verb.be")) && t.attributes.length == 2) {
			// ...

		} else if (t.attributes.length == 1) {
			let subjectStr:[string, number, string, number];
			if ((t.attributes[0] instanceof ConstantTermAttribute) &&
				(<ConstantTermAttribute>(t.attributes[0])).value == mainVerbSubjectID) {
				// when the subject in a nested verb is the same as the parent verb, it should not be rendered:
				subjectStr = ["", 0, undefined, 0];
			} else {
				subjectStr = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, mainVerbSubjectID, true);
				if (subjectStr == null) return null;
			}
			if (verbsInInfinitive) {
				let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
				return [(subjectStr[0] + (negated_t ? " not":"") + " to " + verbStr + verbComplements).trim(), 0, undefined, 0];
			} else {
				let verbStr:string = this.verbStringWithTime(t.functor, subjectStr[3], subjectStr[1], this.nlg_cache_sort_present, negated_t);
				//let verbStr:string = this.pos.getVerbString(t.functor, subjectStr[3], subjectStr[1], 3);
				return [(subjectStr[0] + " " + verbStr + verbComplements).trim(), 0, undefined, 0];
			}

		} else if (t.attributes.length == 2) {
			let subjectStr:[string, number, string, number];
			if ((t.attributes[0] instanceof ConstantTermAttribute)) {
				if ((<ConstantTermAttribute>(t.attributes[0])).value == mainVerbSubjectID) {
					// when the subject in a nested verb is the same as the parnet ver, it should not be rendered:
					subjectStr = ["", 0, undefined, 0];
				} else {
					subjectStr = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, mainVerbSubjectID, true);
					if (subjectStr == null) return null;
					mainVerbSubjectID = (<ConstantTermAttribute>(t.attributes[0])).value;
				}
			} else {
				subjectStr = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, mainVerbSubjectID, true);
				if (subjectStr == null) return null;
			}
			let objectStr:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false, mainVerbSubjectID, true);
			if (objectStr == null) return null;

			if (objectStr[0] != null &&
				objectStr[0][0] == 't' && objectStr[0][1] == 'o' && objectStr[0][2] == ' ' && 
				t.functor.is_a(this.nlg_cache_sort_modal_verb)) objectStr[0] = objectStr[0].substring(3);

			if (verbsInInfinitive) {
				let verbStr:string = this.pos.getVerbString(t.functor, 0, 0, 0);
				return [(subjectStr[0] + (negated_t ? " not":"") + " to "+ verbStr + " " + objectStr[0] + verbComplements).trim(), 0, undefined, 0];
			} else {
				let verbStr:string = this.verbStringWithTime(t.functor, subjectStr[3], subjectStr[1], this.nlg_cache_sort_present, negated_t);
//				let verbStr:string = this.pos.getVerbString(t.functor, subjectStr[3], subjectStr[1], 3);
				return [(subjectStr[0] + " " + verbStr + " " + objectStr[0] + verbComplements).trim(), 0, undefined, 0];
			}


		} else if (t.attributes.length == 3 && 
				   (t.functor.name == "verb.tell" ||
				   	t.functor.name == "action.talk" ||
				   	t.functor.name == "action.give" ||
				   	t.functor.name == "verb.go" ||
				   	t.functor.name == "verb.guide" ||
				   	t.functor.name == "verb.take-to" ||
				   	t.functor.name == "verb.bring" ||
				   	t.functor.name == "verb.find" ||
				   	t.functor.name == "verb.help")) {
			let subjectStr:[string, number, string, number];
			if ((t.attributes[0] instanceof ConstantTermAttribute)) {
				if ((<ConstantTermAttribute>(t.attributes[0])).value == mainVerbSubjectID) {
					// when the subject in a nested verb is the same as the parnet ver, it should not be rendered:
					subjectStr = ["", 0, undefined, 0];
				} else {
					subjectStr = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, mainVerbSubjectID, true);
					if (subjectStr == null) return null;
					mainVerbSubjectID = (<ConstantTermAttribute>(t.attributes[0])).value;
				}
			} else {
				subjectStr = this.termToEnglish_VerbArgument(t.attributes[0], speakerID, true, context, true, mainVerbSubjectID, true);
				if (subjectStr == null) return null;
			}
			let object1Str:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[1], speakerID, true, context, false,
												 											  ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																						      (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
			let object2Str:[string, number, string, number] = this.termToEnglish_VerbArgument(t.attributes[2], speakerID, true, context, false,
												 											  ((t.attributes[0] instanceof ConstantTermAttribute) ? 
																						      (<ConstantTermAttribute>(t.attributes[0])).value:null), true);
			let verbStr:string = this.verbStringWithTime(t.functor, subjectStr[3], subjectStr[1], this.nlg_cache_sort_present, negated_t);
			if (subjectStr != null && object1Str != null && object2Str != null) {
				if (t.functor.name == "verb.help" &&
					(t.attributes[1] instanceof ConstantTermAttribute) &&
					(t.attributes[2] instanceof TermTermAttribute) &&
					(<TermTermAttribute>t.attributes[2]).term.attributes.length >= 1 &&
					((<TermTermAttribute>t.attributes[2]).term.attributes[0] instanceof ConstantTermAttribute)) {
					let obj1:string = (<ConstantTermAttribute>t.attributes[1]).value;
					let obj2:string = (<ConstantTermAttribute>(<TermTermAttribute>t.attributes[2]).term.attributes[0]).value;
					if (obj1 == obj2) {
						object2Str = this.termToEnglish_VerbArgument(t.attributes[2], speakerID, true, context, false, obj1, true);						
					}
					return [subjectStr[0] + verbStr + " " + object1Str[0] + " " + object2Str[0] + verbComplements, 0, undefined, 0];
				} else if (t.functor.name == "verb.tell" ||
				   	t.functor.name == "action.talk") { 
					return [subjectStr[0] + verbStr + " " + object2Str[0] + " " + object1Str[0] + verbComplements, 0, undefined, 0];
				} else if (t.functor.name == "verb.find") {
					return [subjectStr[0] + verbStr + " " + object1Str[0] + verbComplements + " in " + object2Str[0], 0, undefined, 0];
				} else if (t.functor.name == "verb.take-to"||
				   		   t.functor.name == "verb.bring") {
					// verbStr = this.verbStringWithTime(this.o.getSort("action.take"), subjectStr[3], subjectStr[1], time, negated_t);
					verbStr = this.verbStringWithTime(t.functor, subjectStr[3], subjectStr[1], this.nlg_cache_sort_present, negated_t);
					return [subjectStr[0] + verbStr + " " + object1Str[0] + verbComplements + " to " + object2Str[0], 0, undefined, 0];
				} else {
					return [subjectStr[0] + verbStr + " " + object1Str[0] + verbComplements + " to " + object2Str[0], 0, undefined, 0];
				}
			}
		}

		return null;
	}


	verbStringWithTime(verb:Sort, number:number, person:number, time:Sort, negation:boolean)
	{
		if (time.is_a(this.nlg_cache_sort_past)) {
			let verbStr:string = this.pos.getVerbString(verb, number, person, 4);
			if (negation) {
				if (verb.name == "verb.be") {
					verbStr = verbStr + " not";
				} else if (verb.name == "verb.can") {
					verbStr = verbStr + " not";
				} else {
					let auxiliaryVerbStr:string = this.pos.getVerbString(this.nlg_cache_sort_verb_to_do, number, person, 4);
					verbStr = auxiliaryVerbStr + " not " + this.pos.getVerbString(verb, 0, 0, 0);
				}
			}
			return verbStr;
		} else if (time.is_a(this.nlg_cache_sort_future)) {
			let verbStr:string = this.pos.getVerbString(verb, 0, 0, 0);
			return "will " + (negation ? "not ":"") + verbStr;
		} else {
			let verbStr:string = this.pos.getVerbString(verb, number, person, 3);
			if (negation) {
				if (verb.name == "verb.be") {
					verbStr = verbStr + " not";
				} else if (verb.name == "verb.can") {
					verbStr = verbStr + " not";
				} else {
					let auxiliaryVerbStr:string = this.pos.getVerbString(this.nlg_cache_sort_verb_to_do, number, person, 3);
					verbStr = auxiliaryVerbStr + " not " + this.pos.getVerbString(verb, 0, 0, 0);
				}
			}
			return verbStr;
		}
	}


	selectEntityDifferentiatingPropertiesAndRelations(PRTerms:Term[], msl:NLContextEntity[][], target:NLContextEntity, context:NLContext, o:Ontology) : [Term[], number]
	{
		let selected:Term[] = [];
		let remaining:Term[] = [].concat(PRTerms);	// we make a copy of the list
		let best_n:number = msl[0].length + msl[1].length + msl[2].length;

		while(remaining.length > 0) {
			let best_msl:NLContextEntity[][] = null;
			let best_term:Term = null;
			best_n = msl[0].length + msl[1].length + msl[2].length;

//			console.log("selectEntityDifferentiatingPropertiesAndRelations: " + msl[0].length + ", " + msl[1].length + ", " + msl[2].length + " -> PRTerms: " + PRTerms);

			for(let PRTerm of remaining) {
//				console.log("about to evaluate (for "+target.objectID+"): " + PRTerm);
				if (PRTerm.attributes.length == 1) {
					let msl_included:NLContextEntity[][] = context.filterByAdjective(PRTerm.functor, msl, o);
					let n:number = msl_included[0].length + msl_included[1].length + msl_included[2].length;
					let found:boolean = false;
					for(let i:number = 0;i<3;i++) {
						for(let e of msl_included[i]) {
							if (e.objectID != null && target.objectID != null &&
								e.objectID.value == target.objectID.value) {
								found = true;
								break;
							}
						}
						if (found) break;
					}
					if (found &&
						n<best_n) {
						best_n = n;
						best_term = PRTerm;
						best_msl = msl_included;
					}
				} else if (PRTerm.attributes.length == 2 &&
					PRTerm.functor.is_a(this.nlg_cache_sort_propertywithvalue) &&
					(PRTerm.attributes[1] instanceof ConstantTermAttribute) &&
					(PRTerm.attributes[0] instanceof ConstantTermAttribute) &&
					(<ConstantTermAttribute>PRTerm.attributes[0]).value == target.objectID.value) {
					let msl_included:NLContextEntity[][] = context.filterByAdjective(PRTerm.attributes[1].sort, msl, o);
					let n:number = msl_included[0].length + msl_included[1].length + msl_included[2].length;
					let found:boolean = false;
					for(let i:number = 0;i<3;i++) {
						for(let e of msl_included[i]) {
							if (e.objectID != null && target.objectID != null &&
								e.objectID.value == target.objectID.value) {
								found = true;
								break;
							}
						}
						if (found) break;
					}
					if (found &&
						n<best_n) {
						best_n = n;
						best_term = PRTerm;
						best_msl = msl_included;
					}

				} else if (PRTerm.attributes.length == 2 && 
						   (PRTerm.attributes[0] instanceof ConstantTermAttribute) &&
						   (<ConstantTermAttribute>PRTerm.attributes[0]).value == target.objectID.value) {
					let msl_included:NLContextEntity[][] = context.filterByRelation1(PRTerm, msl, o, null);
					let n:number = msl_included[0].length + msl_included[1].length + msl_included[2].length;
					let found:boolean = false;
					for(let i:number = 0;i<3;i++) {
						for(let e of msl_included[i]) {
							if (e.objectID != null && target.objectID != null &&
								e.objectID.value == target.objectID.value) {
								found = true;
								break;
							}
						}
						if (found) break;
					}
					if (found &&
						n<best_n) {
						best_n = n;
						best_term = PRTerm;
						best_msl = msl_included;
					}
//					console.log("evaluating(1) " + PRTerm + " -> " + n);
				} else if (PRTerm.attributes.length == 2 && 
						   (PRTerm.attributes[1] instanceof ConstantTermAttribute) &&
						   (<ConstantTermAttribute>PRTerm.attributes[1]).value == target.objectID.value) {
					// consider it only if we can render it as text, i.e., if it's a symmetric relation, or if
					// there is a known way to render the opposite relation:
//					console.log("considering(2) " + PRTerm);
					if (PRTerm.functor.is_a(this.nlg_cache_sort_symmetric_relation) ||
						this.pos.reverseRelations[PRTerm.functor.name] != null) {
						let msl_included:NLContextEntity[][] = context.filterByRelation2(PRTerm, msl, o, null);
						let n:number = msl_included[0].length + msl_included[1].length + msl_included[2].length;
//						console.log("evaluating(2) " + PRTerm + " -> " + n);
						let found:boolean = false;
						for(let i:number = 0;i<3;i++) {
							for(let e of msl_included[i]) {
								if (e.objectID != null && target.objectID != null &&
									e.objectID.value == target.objectID.value) {
									found = true;
									break;
								}
							}
							if (found) break;
						}
						if (found &&
							n<best_n) {
							best_n = n;
							best_term = PRTerm;
							best_msl = msl_included;
						}
					}
				}
			}
			if (best_term != null) {
//				console.log("best_term " + best_term);
				selected.push(best_term);
				if (best_n == 1) return [selected, best_n];
			}

			if (best_msl != null) msl = best_msl;
			remaining.splice(remaining.indexOf(best_term),1);
		}

		return [selected, best_n];
	}


	// returns the proper article "a" or "an" to be used in front of a word
	aVSanArticle(word:string) : string
	{
		let trimmedWord:string = word.trim();
		let firstLetter:string = trimmedWord[0];
		if (firstLetter == undefined) {
			console.error("aVSanArticle: empty word!");
		}
//		console.log("aVSanArticle of '"+word+"', first letter is '"+firstLetter+"'");
		if (this.consonants_for_a_vs_an.indexOf(firstLetter) != -1) {
			return "a";
		}
		if (trimmedWord.length>2 &&
			trimmedWord[0] == "u" &&
			(trimmedWord[1] == "s" || trimmedWord[1] == "n")) {
			return "a";
		}
		return "an";
	}


	termToEnglish_Inform_ComplexSentence(terms:TermAttribute[], speakerID:string, context:NLContext) : string
	{
		let negatedTerms:TermAttribute[] = [];
		let positiveTerms:TermAttribute[] = [];

		this.renderingSentenceVariables = [];	// mark that we are actually rendering a sentence

		for(let term_a of terms) {
			if (term_a instanceof TermTermAttribute) {
				let term:Term = (<TermTermAttribute>term_a).term;
				if (term.functor.name == "#not") {
					if (term.attributes.length == 1 &&
						term.attributes[0] instanceof TermTermAttribute) {
						negatedTerms.push(term.attributes[0]);
					} else {
						// we should never have this
						console.error("malformed #not term in termToEnglish_Inform_ComplexSentence: " + term);
					}
				} else {
					positiveTerms.push(term_a);
				}
			} else {
				console.error("malformed term in termToEnglish_Inform_ComplexSentence: " + term_a);
				return null;
			}
		}

		// pattern 1: if X then Y1 and ... and Yn
		if (negatedTerms.length > 0 && positiveTerms.length > 0) {
			let output:string = "if ";

			for(let i:number = 0;i<negatedTerms.length;i++) {
				let tmp:[string, number, string, number] = this.termToEnglish_RelationOrVerbArgument(negatedTerms[i], speakerID, true, context, true, null, true, false);
				if (tmp == null || tmp[0] == null) return null;
				if (i == 0) {
					output += tmp[0];
				} else {
					if (i == negatedTerms.length-1) {
						output += " and " + tmp[0];
					} else {
						output += ", " + tmp[0];
					}
				}
			}
			output += " then ";
			for(let i:number = 0;i<positiveTerms.length;i++) {
				let tmp:[string, number, string, number] = this.termToEnglish_RelationOrVerbArgument(positiveTerms[i], speakerID, true, context, true, null, true, false);
				if (tmp == null || tmp[0] == null) return null;
				if (i == 0) {
					output += tmp[0];
				} else {
					if (i == positiveTerms.length-1) {
						output += " and " + tmp[0];
					} else {
						output += ", " + tmp[0];
					}
				}
			} 
			return output;
		}

		// pattern 2: all positive
		if (negatedTerms.length == 0 && positiveTerms.length > 0) {
			let output:string = "or ";

			for(let i:number = 0;i<positiveTerms.length;i++) {
				let tmp:[string, number, string, number] = this.termToEnglish_RelationOrVerbArgument(positiveTerms[i], speakerID, true, context, true, null, true, false);
				if (tmp == null || tmp[0] == null) return null;
				if (i == 0) {
					output += tmp[0];
				} else {
					output += " or " + tmp[0];
				}
			}
			return output;			
		}

		// pattern 2: all positive
		if (negatedTerms.length > 0 && positiveTerms.length == 0) {
			let output:string = "either ";

			for(let i:number = 0;i<negatedTerms.length;i++) {
				let tmp:[string, number, string, number] = this.termToEnglish_RelationOrVerbArgument(negatedTerms[i], speakerID, true, context, true, null, true, false);
				if (tmp == null || tmp[0] == null) return null;
				if (i == 0) {
					output += tmp[0] + " is not true";
				} else {
					output += " or " + tmp[0] + " is not true";
				}
			}
			return output;			
		}


		console.error("termToEnglish_Inform_ComplexSentence: cannot render sentence with " + positiveTerms.length + " positive terms and " + negatedTerms.length + " negated terms! ");
		return null;
	}


	o:Ontology = null;
	pos:POSParser = null;

	renderingSentenceVariables:TermAttribute[] = null;

	nlg_cache_sort_id:Sort = null;
	nlg_cache_sort_symbol:Sort = null;
	nlg_cache_sort_number:Sort = null;
	nlg_cache_sort_name:Sort = null;
	nlg_cache_sort_object:Sort = null;
	nlg_cache_sort_role:Sort = null;
	nlg_cache_sort_unique_role:Sort = null;
	nlg_cache_sort_space_location:Sort = null;
	nlg_cache_sort_property:Sort = null;
	nlg_cache_sort_propertywithvalue:Sort = null;
	nlg_cache_sort_relationwithvalue:Sort = null;
	nlg_cache_sort_haveableproperty:Sort = null;
	nlg_cache_sort_haveablepropertywithvalue:Sort = null;
	nlg_cache_sort_relation:Sort = null;
	nlg_cache_sort_symmetric_relation:Sort = null;
	nlg_cache_sort_verb:Sort = null;
	nlg_cache_sort_verb_to_do:Sort = null;
	nlg_cache_sort_modal_verb:Sort = null;
	nlg_cache_sort_past:Sort = null;
	nlg_cache_sort_present:Sort = null;
	nlg_cache_sort_future:Sort = null;
	nlg_cache_sort_pronoun:Sort = null;
	nlg_cache_sort_timedate:Sort = null;
	nlg_cache_sort_measuringunit:Sort = null;

	consonants:string = "qwrtypsdfghjklzxcvbnmQWRTYPSDFGHJKLZXCVBNM";
	consonants_for_a_vs_an:string = "qwrtpsdfghjklzxcvbnmQWRTPSDFGJKLZXCVBNM";
}
