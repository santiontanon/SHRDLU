class NLParser {
	constructor(o:Ontology, dp:number)
	{
		this.o = o;
		this.defaultPriority = dp;
	}


	static fromXML(xml:Element, o:Ontology) : NLParser
	{
		let parser:NLParser = new NLParser(o, Number(xml.getAttribute("defaultPriority")));

		parser.posParser = new POSParser(o);

		let speakerVariable:VariableTermAttribute = new VariableTermAttribute(o.getSort("any"),"SPEAKER");
		let listenerVariable:VariableTermAttribute = new VariableTermAttribute(o.getSort("any"),"LISTENER");

		for(let rulexml of getElementChildrenByTag(xml, "NLPattern")) {
			let priority:number = parser.defaultPriority;
			if (rulexml.getAttribute("priority")!=null) priority = Number(rulexml.getAttribute("priority"));
			let rule:NLPatternRule = NLPatternRule.fromString(rulexml.getAttribute("name"),
														      rulexml.getAttribute("head"),
															  rulexml.getAttribute("body"),
															  priority, o, speakerVariable, listenerVariable);
//			console.log("rule loaded with head: " + rule.head);
			parser.rules.push(rule);
		}

		for(let sortName of ["maybeNegatedPrepositionalPhrase",
							 "maybeNegatedAdjective",
							 "nounPhrase",
							 "nounPhraseNoDeterminer",
							 "nounPhraseNoDeterminerNoProperNoun",
							 "properNounCompound",
							 "performative",
							 "perf.request.action",
							 "perf.inform"]) {
			let compiled:CompiledNLPatternRules = new CompiledNLPatternRules("compiled-" + sortName, o, speakerVariable, listenerVariable);
			compiled.populate(o.getSort(sortName), parser);

			let nstates:number = compiled.root.getAllStatesForDOTString().length;
			console.log("compiled parse graph for " +sortName+ " has " + nstates + " nodes");

//			console.log(compiled.root.convertToDOTString());
//			To generate the pdf type: dot -Tpdf grammar-2.4.dot -o grammar-2.4.pdf
			parser.compiledRules[sortName] = compiled;
		}

/*
		// list of sorts for which there are rules:
		let sortList:string[] = [];
		for(let rule of parser.rules) {
			if (sortList.indexOf(rule.head.functor.name) == -1) sortList.push(rule.head.functor.name);
		}
		console.log(sortList);
*/

		return parser;
	}


	//  Parses a natural language sentence considering only rules that produce a resulting clause of sort "s"
	parse(sentence:string, s:Sort, context:NLContext, AI:RuleBasedAI) : NLParseRecord[]
	{
		// STEP 1: Tokenization
		let tokens:string[] = this.posParser.tokenize(sentence);
		//console.log("Tokenization:\n" + tokens);
		if (tokens == null || tokens.length == 0) return [];

		// STEP 2: Dictionary-based multi-token word detection (merge tokens)
		let tokens2:TokenizationElement = this.posParser.identifyMultiTokenWords(tokens);
		//console.log("Multi-token word identification:\n" + tokens2.toString());

		// STEP 3: Part of Speech Tagging
		this.posParser.unrecognizedTokens = [];
		this.posParser.POSTagging(tokens2, this.o);
		//console.log("POS Tagging:\n" + tokens2.toString());

		this.error_semantic = [];
		this.error_deref = [];
		this.error_unrecognizedTokens = [];
		this.error_grammatical = false;

		let results:NLParseRecord[] = [];
		let derefErrors:NLDerefErrorRecord[] = [];
		let bestPriorityOfFirstRule:number = 0;
		let semanticalErrors:NLParseRecord[] = [];

		let compiled:CompiledNLPatternRules = this.compiledRules[s.name];
		if (compiled != null) {
			// if we have a compiled tree, use it!
//			console.log("NLParser.parse: Found a compiled tree for " + s.name + " ...");
			let results2:NLParseRecord[] = compiled.parse(tokens2, true, context, this, AI);
			if (results2 != null && results2.length > 0) {
				for(let r of results2) {
					//console.log("(1) result before resolving the lists:" + r.result);
					r.result = this.resolveLists(r.result);
					//console.log("(2) result after resolving the lists:" + r.result);
//					console.log("result! (" + r.priorities[0] + "): " + r.result);
					// properly resolve the "listener" variable:
					if (s.name == "performative" && r.result.attributes.length>0) {
						let performativeHead:Term = r.result;
						while(performativeHead.functor.name == "#list" ||
							  performativeHead.functor.name == "#and") {
							if (performativeHead.attributes.length>0 &&
								performativeHead.attributes[0] instanceof TermTermAttribute) {
								performativeHead = (<TermTermAttribute>performativeHead.attributes[0]).term;
							} else {
								break;
							}
						}

						// performative
						if (performativeHead.functor.is_a_string("performative")) {
							if (compiled.listenerVariable != performativeHead.attributes[0]) {
								let b2:Bindings = new Bindings();
								b2.l.push([compiled.listenerVariable, r.result.attributes[0]]);
								r.result = r.result.applyBindings(b2);
							}
						}
					}
					if (this.semanticallyCorrect(r.result, context)) {						
						if (r.priorities[0] > bestPriorityOfFirstRule) bestPriorityOfFirstRule = r.priorities[0];
						results.push(r);
						//console.log("(3) result after applying bindings:" + r.result);
					} else {
						semanticalErrors.push(r);
						for(let e of compiled.lastDerefErrors) derefErrors.push(e);
					}
				}
			} else {
//				console.log("nope...");
				for(let e of compiled.lastDerefErrors) derefErrors.push(e);
			}
		} else {
//			console.log("NLParser.parse: Using the raw rules for " + s.name + " ...");
			// we don't have a compiled tree, just use the rules...
			for(let rawRule of this.rules) {
				if (rawRule.priority <= bestPriorityOfFirstRule) continue;
				if (!rawRule.head.functor.is_a(s)) continue;
				let rule:NLPatternRule = rawRule.clone();
				let results2:NLParseRecord[] = rule.parse(tokens2, true, context, this, AI);
				if (results2 != null && results2.length > 0) {
					for(let r of results2) {
						r.result = this.resolveLists(r.result);
						// properly resolve the "listener" variable:
						if (s.name == "performative" && r.result.attributes.length>0) {
							if (compiled.listenerVariable != r.result.attributes[0]) {
								let b2:Bindings = new Bindings();
								b2.l.push([compiled.listenerVariable, r.result.attributes[0]]);
								r.result = r.result.applyBindings(b2);
							}
						}
						if (this.semanticallyCorrect(r.result, context)) {
							if (r.priorities[0] > bestPriorityOfFirstRule) bestPriorityOfFirstRule = r.priorities[0];
							results.push(r);
						} else {
							semanticalErrors.push(r);
							for(let e of compiled.lastDerefErrors) derefErrors.push(e);
						}
					}
				} else {
					for(let e of rule.lastDerefErrors) derefErrors.push(e);
				}
			}
		}

/*
		// resolve the #list constructs, and ensure parses are semantically sound:
		let results2:NLParseRecord[] = [];
		for(let result of results) {
			result.result = this.resolveLists(result.result);
			if (this.semanticallyCorrect(result.result, context)) results2.push(result);
		}
*/

		if (results.length == 0) {
			// record why couldn't we parse the sentence:
			if (semanticalErrors.length > 0) {
				// parse error was due to a semantical error!
				// only if we cannot parse the sentence in any other way, we return the parses with semantic errors.
				// However, we still report the deref errors just in case:
				this.error_semantic = semanticalErrors;
				if (derefErrors.length > 0) {
					this.error_deref = derefErrors;
				}
			} else if (this.posParser.unrecognizedTokens.length > 0) {
				// parse error was due to unrecognized words:
				this.error_unrecognizedTokens = this.posParser.unrecognizedTokens;
			} else if (derefErrors.length > 0) {
				// parse error was due to a deref error!
				this.error_deref = derefErrors;
			} else {
				// just grammatically not correct:
				this.error_grammatical = true;
			}
		}

		// for debugging purposes:
//		for(let r of results) {
//			console.log("parse: " + r.ruleNames + ", " + r.priorities);
//		}

		return results;
	}


	chooseHighestPriorityParse(parses:NLParseRecord[]) : NLParseRecord
	{
		let bestParse:NLParseRecord = null;

		for(let parse of parses) {
			if (bestParse == null) {
				bestParse = parse;
			} else {
				if (parse.higherPriorityThan(bestParse) == 1) {
					bestParse = parse;
				}
			}
		}

		return bestParse;
	}


	chooseHighestPriorityParseWithListener(parses:NLParseRecord[], listener:string) : NLParseRecord
	{
		let bestParse:NLParseRecord = null;

		for(let parse of parses) {
			let result:Term = this.unifyListener(parse.result, listener);
			if (result != null) {
				let unifiedParse:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.bindings, parse.ruleNames, parse.priorities);
				unifiedParse.result = result;
				if (bestParse == null) {
					bestParse = unifiedParse;
				} else {
					if (unifiedParse.higherPriorityThan(bestParse) == 1) {
						bestParse = unifiedParse;
					}
				}
			}
		}

		return bestParse;
	}


	// If "parse" is a performative, unifies the first attribute (which should be the "LISTENER"), with listener
	unifyListener(parse:Term, listener:string) : Term
	{
		if (parse.functor.is_a(this.o.getSort("performative"))) {
			// create a pattern for unification:
			let pattern:Term = new Term(parse.functor, []);
			pattern.addAttribute(new ConstantTermAttribute(listener, this.o.getSort("#id")));
			for(let i:number = 1;i<parse.attributes.length;i++) {
				pattern.addAttribute(new VariableTermAttribute(this.o.getSort("any"), null));
			}

			let bindings:Bindings = new Bindings();
			if (parse.unify(pattern, OCCURS_CHECK, bindings)) {
				return parse.applyBindings(bindings);
			} else {
				console.warn("NLParser.unifyListener: parse " + parse + " does not unify with pattern " + pattern);
				return null;
			}
		} else if (parse.functor.name == "#list") {
			let result:Term = null;
			for(let perf of NLParser.elementsInList(parse, "#list")) {
				if (!(perf instanceof TermTermAttribute)) return null;
				let perf2:Term = this.unifyListener((<TermTermAttribute>perf).term, listener);
				if (perf2 != null) {
					if (result == null) {
						result = perf2;
					} else {
						result = new Term(this.o.getSort("#list"), [new TermTermAttribute(perf2), 
													  			    new TermTermAttribute(result)]);
					}
				}
			}
			return result;
		}

		return parse;
	}


	// This function is used to filter out parses that do not make sense from a semantic point of view
	// for example: space.at(X, Y) only makes sense if Y is a location
	semanticallyCorrect(parse:Term, context:NLContext) : boolean
	{
		return this.semanticallyCorrectInternal(parse, context, []);
	}


	semanticallyCorrectInternal(parse:Term, context:NLContext, closed:Term[]) : boolean
	{
		if (closed.indexOf(parse) != -1) return true;
		closed.push(parse);

		if (parse.functor.is_a(this.o.getSort("time.at"))) {
			if (parse.attributes[1].sort.is_a(this.o.getSort("number"))) return true;
			console.log("semanticallyCorrect: fail! " + parse);
			return false;
		}

		if (parse.functor.is_a(this.o.getSort("space.at"))) {
			if (parse.attributes[1] instanceof ConstantTermAttribute) {
				let e:NLContextEntity = context.findByID((<ConstantTermAttribute>parse.attributes[1]).value);		
				if (e!=null) {
					if (e.sortMatch(this.o.getSort("space.location"))) return true;
					if (e.sortMatch(this.o.getSort("container"))) return true;
					return true;
				} else {
					// we don't know, so, for now assume it's fine
					return true;
				}
			} else if (parse.attributes[1] instanceof VariableTermAttribute) {
				if (parse.attributes[1].sort.is_a(this.o.getSort("space.location")) ||
					this.o.getSort("space.location").is_a(parse.attributes[1].sort)) return true;
			}
			console.log("semanticallyCorrect: fail! " + parse);
			return false;
		}		

		for(let ta of parse.attributes) {
			if (ta instanceof TermTermAttribute) {
				if (!this.semanticallyCorrectInternal((<TermTermAttribute>ta).term, context, closed)) return false;
			}
		}

		if (parse.functor.is_a(this.o.getSort("perf.inform.answer"))) {
			if (context.expectingAnswerToQuestion_stack.length > 0) return true;
			if (context.expectingYes &&
				parse.attributes.length>=2 && 
				(parse.attributes[1] instanceof ConstantTermAttribute) &&
				(<ConstantTermAttribute>parse.attributes[1]).value == "yes") return true;
			if (context.expectingConfirmationToRequest_stack.length > 0 &&
				parse.attributes.length>=2 && 
				(parse.attributes[1] instanceof ConstantTermAttribute) &&
				((<ConstantTermAttribute>parse.attributes[1]).value == "yes" ||
				 (<ConstantTermAttribute>parse.attributes[1]).value == "no")) return true;
			return false;
		}

		if (parse.functor.is_a(this.o.getSort("perf.callattention"))) {
			if (parse.attributes.length>=1 &&
				(parse.attributes[0] instanceof ConstantTermAttribute)) {
				let target:string = (<ConstantTermAttribute>parse.attributes[0]).value;
				// call attention cannot be to oneself!
				if (target == context.speaker) return false;
			}
		}

		if (parse.functor.is_a(this.o.getSort("performative")) &&
			parse.attributes.length >= 1 && 
			parse.attributes[0] instanceof ConstantTermAttribute) {
			let target:string = (<ConstantTermAttribute>parse.attributes[0]).value;
			// we should really be only talking to the robots:
			if (this.talkingTargets != null && this.talkingTargets.indexOf(target) == -1) {
				console.log("semanticallyCorrectInternal: " + target + " is not in talkingTargets");
				return false;
			}
		}

		return true;
	}


	static resolveCons(parse:Term, o:Ontology)
	{
		if (parse.functor.name == "#cons" &&
			parse.attributes.length>0 &&
			parse.attributes[0] instanceof ConstantTermAttribute) {
			let sortName:string = (<ConstantTermAttribute>parse.attributes[0]).value;
			if (sortName[0] == '~') {
				// negated sort! insert '#not'
				let sort:Sort = o.getSort(sortName.substring(1));
				if (sort != null) {
					let tmp:Term = new Term(sort, parse.attributes.slice(1));
					parse.functor = o.getSort("#not");
					parse.attributes = [new TermTermAttribute(tmp)];
				}
			} else {
				let sort:Sort = o.getSort(sortName);
				if (sort != null) {
					parse.functor = sort;
					parse.attributes.splice(0, 1);
				}
			}
		}

		for(let i:number = 0;i<parse.attributes.length;i++) {
			if (parse.attributes[i] instanceof TermTermAttribute) {
				NLParser.resolveCons((<TermTermAttribute>parse.attributes[i]).term, o);
				parse.attributes[i].sort = (<TermTermAttribute>parse.attributes[i]).term.functor;
			}
		}
	}


	resolveLists(parse:Term) : Term
	{
//		console.log("resolveLists: " + parse);
		return this.resolveListsInternal(parse, []);
	}


	resolveListsInternal(parse:Term, alreadyProcessed:Term[]) : Term
	{
		if (alreadyProcessed.indexOf(parse) != -1) return parse;
		alreadyProcessed.push(parse);

		// start by resolving the inner #lists
//		console.log("resolveLists: " + parse + " (" + alreadyProcessed.length + ")");

		for(let i:number = 0;i<parse.attributes.length;i++) {
			if (parse.attributes[i] instanceof TermTermAttribute) {
				(<TermTermAttribute>parse.attributes[i]).term = this.resolveListsInternal((<TermTermAttribute>parse.attributes[i]).term, alreadyProcessed);
			}
		}		
		
//		console.log("resolveLists (outer): " + parse + " (" + alreadyProcessed.length + ")");
		// now resolve the outer lists:
		for(let ii:number = 0;ii<parse.attributes.length;ii++) {
			if (parse.attributes[ii] instanceof TermTermAttribute) {
				let childTerm:Term = (<TermTermAttribute>parse.attributes[ii]).term;
				if (childTerm.functor.name == "#list" && parse.functor.name != "#list") {
					let l:TermAttribute[] = NLParser.elementsInList(childTerm, "#list");
					let output:Term = null;
//					console.log("resolveListsInternal (elements in list): " + l);
//					console.log("resolveListsInternal (before resolving the list): " + parse);
					for(let j:number = l.length-1;j>=0;j--) {
						if (output == null) {
							output = this.cloneTermReplacingIthAttribute(parse, ii, l[j]);
						} else {
							output = new Term(this.o.getSort("#list"), 
											  [new TermTermAttribute(this.cloneTermReplacingIthAttribute(parse, ii, l[j])), 
											   new TermTermAttribute(output)]);
						}
					}
//					console.log("resolveListsInternal (after resolving the list): " + output);
					// call the function again, just in case there are more lists:
//					console.log("resolveLists recursive call with: " + output);
					return this.resolveListsInternal(output, alreadyProcessed);
//					return output;
				}
			}
		}
		
		return parse;
	}


	static constructList(elements:TermAttribute[], listFunctor:Sort) : TermAttribute
	{
		let result:TermAttribute = null;

		for(let e of elements) {
			if (result == null) {
				result = e;
			} else {
				result = new TermTermAttribute(new Term(listFunctor, [e, result]));
			}
//			console.log("after adding '" + e + "' the list is now: " + result);
		}

		return result;
	}


	static termsInList(list:Term, listFunctor:string) : Term[]
	{
		let output:Term[] = [];

		while(list.functor.name == listFunctor) {
			if (list.attributes[0] instanceof TermTermAttribute &&
				(<TermTermAttribute>list.attributes[0]).term.functor.name == listFunctor) {
				if (list.attributes[1] instanceof TermTermAttribute) output.push((<TermTermAttribute>(list.attributes[1])).term);
				list = (<TermTermAttribute>list.attributes[0]).term;
			} else if (list.attributes[1] instanceof TermTermAttribute &&
				(<TermTermAttribute>list.attributes[1]).term.functor.name == listFunctor) {
				if (list.attributes[0] instanceof TermTermAttribute) output.push((<TermTermAttribute>(list.attributes[0])).term);
				list = (<TermTermAttribute>list.attributes[1]).term;
			} else {
				if (list.attributes[0] instanceof TermTermAttribute) output.push((<TermTermAttribute>(list.attributes[0])).term);
				if (list.attributes[1] instanceof TermTermAttribute) output.push((<TermTermAttribute>(list.attributes[1])).term);
				return output;
			}
		}
		// this means that the whole thing was not a list to begin with, so, just return an array of one:
		output.push(list);
		return output;
	}


	static elementsInList(list:Term, listFunctor:string) : TermAttribute[]
	{
		let output:TermAttribute[] = [];
		if (list.functor.name == listFunctor) {
			for(let i = 0;i<list.attributes.length;i++) {
				if ((list.attributes[i] instanceof TermTermAttribute) &&
					(<TermTermAttribute>list.attributes[i]).term.functor.name == listFunctor) {
					output = output.concat(NLParser.elementsInList((<TermTermAttribute>(list.attributes[i])).term, listFunctor));
				} else {
					output.push(list.attributes[i]);
				}
			}
		} else {
			output.push(new TermTermAttribute(list));
		}
		return output;
	}

/*
	static elementsInList(list:Term, listFunctor:string) : TermAttribute[]
	{
		let output:TermAttribute[] = [];

		while(list.functor.name == listFunctor) {
			if (list.attributes[0] instanceof TermTermAttribute &&
				(<TermTermAttribute>list.attributes[0]).term.functor.name == listFunctor) {
				output.push(list.attributes[1]);
				list = (<TermTermAttribute>list.attributes[0]).term;
			} else if (list.attributes[1] instanceof TermTermAttribute &&
				(<TermTermAttribute>list.attributes[1]).term.functor.name == listFunctor) {
				output.push(list.attributes[0]);
				list = (<TermTermAttribute>list.attributes[1]).term;
			} else {
				output.push(list.attributes[0]);
				output.push(list.attributes[1]);
				return output;
			}
		}
		// this means that the whole thing was not a list to begin with, so, just return an array of one:
		output.push(new TermTermAttribute(list));
		return output;
	}
*/

	cloneTermReplacingIthAttribute(term:Term, i:number, replacement:TermAttribute) : Term
	{
		let map:[TermAttribute,TermAttribute][] = [];
		let output:Term = new Term(term.functor, []);

		for(let j:number = 0;j<term.attributes.length;j++) {
			if (j == i) {
				output.addAttribute(replacement);
			} else {
				if (term.attributes[j] instanceof TermTermAttribute) {
					output.addAttribute(new TermTermAttribute((<TermTermAttribute>term.attributes[j]).term.clone(map)));
				} else {
					output.addAttribute(term.attributes[j]);
				}
			}
		}
		return output;
	}


	o:Ontology = null;
	defaultPriority:number = 100;
	posParser:POSParser = null;
	rules:NLPatternRule[] = [];
	compiledRules:{ [sort: string] : CompiledNLPatternRules; } = {};

	talkingTargets:string[] = null;

	// errors from the last parse:
	error_semantic:NLParseRecord[] = [];	// stores the parses that were properly parsed, but failed semantic checks
	error_deref:NLDerefErrorRecord[] = [];
	error_unrecognizedTokens:string[] = [];
	error_grammatical:boolean = false;
}
