
class CompiledNLPatternRules extends NLPatternContainer {

	constructor(name:string, o:Ontology, sv:VariableTermAttribute, lv:VariableTermAttribute)
	{
		super(name, sv, lv);
//		if (o!=null) {
//			this.speakerVariable = new VariableTermAttribute(o.getSort("any"),"SPEAKER");
//			this.listenerVariable = new VariableTermAttribute(o.getSort("any"),"LISTENER");
//		}
	} 


	ruleHeadMatchesSort(sort:Sort, rule:NLPatternRule) : boolean
	{
		if (rule.head.functor.is_a(sort)) {
			return true;
		} else if (rule.head.functor.name == "#list" &&
			       rule.head.attributes.length>0 &&
			       rule.head.attributes[0] instanceof TermTermAttribute) {
			if ((<TermTermAttribute>rule.head.attributes[0]).term.functor.is_a(sort)) {
				return true;
			}
		}
		return false;
	}
	

	populate(sort:Sort, parser:NLParser) 
	{
		this.root = new CompiledNLPatternState();
		for(let rule of parser.rules) {
			if (this.ruleHeadMatchesSort(sort, rule)) {
//			if (rule.head.functor.is_a(sort)) {
//				console.log("rule head: " + rule.head);
				this.root.addRule(rule, this.speakerVariable, this.listenerVariable);	
			}
		}
	}


	cloneForParsing() : CompiledNLPatternRules
	{
//		let map:[TermAttribute,TermAttribute][] = [];
		let c:CompiledNLPatternRules = new CompiledNLPatternRules(this.name, null, this.speakerVariable, this.listenerVariable);
		c.root = this.root;
//		this.speakerVariable = new VariableTermAttribute(o.getSort("any"),"SPEAKER");
//		this.listenerVariable = new VariableTermAttribute(o.getSort("any"),"LISTENER");
//		c.speakerVariable = this.speakerVariable;
//		c.listenerVariable = this.listenerVariable;

		return c;
	}


	parse(tokenization:TokenizationElement, filterPartialParses:boolean, context:NLContext, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		// parse the sentence:
//		console.log("NLPatternRule.parse");
		this.lastDerefErrors = [];
		let bindings:Bindings = new Bindings();
		if (this.speakerVariable != null) {
//			console.log("Speaker: " + this.speakerVariable);
			bindings.l.push([(<VariableTermAttribute>this.speakerVariable), 
							 new ConstantTermAttribute(context.speaker, parser.o.getSort("#id"))]);
		}
		let parses:NLParseRecord[] = this.root.parse(new NLParseRecord([tokenization], [], bindings, [], [], []), context, this, parser, AI, filterPartialParses);
		if (parses == null) return null;

//		console.log("CompiledNLPatternRules.parse, n parses: " + parses.length);

		// if there is any valid parse, generate the corresponding terms:
		let results:NLParseRecord[] = [];
		for(let parse of parses) {
			if (filterPartialParses &&
				parse.nextTokens != null && parse.nextTokens.length > 0) continue;

//			parse.ruleNames = [this.name].concat(parse.ruleNames);
//			parse.priorities = [this.priority].concat(parse.priorities);
//			parse.result = this.head.applyBindings(parse.bindings);
			// console.log("Parse completed, result (before resolvecons): " + parse.result);
			NLParser.resolveCons(parse.result, parser.o);
			// console.log("CompiledNLPatternRules.parse: Parse completed, result: " + parse.result);
			results.push(parse);
		}

		return results;
	}


	parseMatchingWithTerm(parse:NLParseRecord, filterPartialParses:boolean, context:NLContext, parser:NLParser, AI:RuleBasedAI, term:Term) : NLParseRecord[]
	{
		let results:NLParseRecord[] = [];
		let parses:NLParseRecord[] = this.root.parse(parse, context, this, parser, AI, filterPartialParses);
		if (parses != null) {
//			console.log("parseMatchingWithTerm completed with parses.length = " + parses.length);
			for(let parse2 of parses) {
				if (filterPartialParses &&
					parse2.nextTokens != null && parse2.nextTokens.length > 0) continue;

//				parse2.ruleNames = [this.name].concat(parse.ruleNames);
//				parse2.priorities = [this.priority].concat(parse.priorities);
//				parse2.result = this.head.applyBindings(parse2.bindings);
				// console.log("parseMatchingWithTerm completed, result (before resolvecons): " + parse2.result);
				NLParser.resolveCons(parse2.result, parser.o);
				// console.log("parseMatchingWithTerm.parse: Parse completed, result: " + parse2.result);
				let bindings:Bindings = new Bindings();
				// if (parse2.result.unify(term, OCCURS_CHECK, bindings)) {
				if (term.unify(parse2.result, OCCURS_CHECK, bindings)) {
					parse2.result = parse2.result.applyBindings(bindings);
//					console.log("parseMatchingWithTerm completed, result: " + parse2.result);
					results.push(parse2);
				}
			}
		}

		return results;
	}



	root:CompiledNLPatternState = null;
}



class CompiledNLPatternState {

	// this function adds a rule to the current parsing graph, and returns the set of terminal states where this rule ends
	addRule(rule:NLPatternRule, speakerVariable:TermAttribute, listenerVariable:TermAttribute)
	{
		let tmp:[CompiledNLPatternState,Bindings][] = this.addRuleInternal(rule.priority, rule.body, new Bindings(), speakerVariable, listenerVariable);
		for(let i:number = 0;i<tmp.length;i++) {
			let s:CompiledNLPatternState = tmp[i][0];
			let b:Bindings = tmp[i][1];

			// set the proper LISTENER and SPEAKER variables:
			let rule2:Term = rule.head.applyBindings(b);
//			console.log("rule.head: " + rule.head);
//			console.log("rule2: " + rule2);
			let variables:VariableTermAttribute[] = rule2.getAllVariables();
			let b2:Bindings = new Bindings();
			for(let v of variables) {
//				if (v.name == "LISTENER" && v != listenerVariable) b2.l.push([v, listenerVariable]);
				if (v.name == "SPEAKER" && v != speakerVariable) b2.l.push([v, speakerVariable]);
			}
			if (b2.l.length > 0)  rule2 = rule2.applyBindings(b2);

			s.priorities.push(rule.priority);
			s.heads.push(rule2);	
			s.ruleNames.push(rule.name)
		}
	}


	addRuleInternal(priority:number, current:NLPattern, bindings:Bindings, speakerVariable:TermAttribute, listenerVariable:TermAttribute) : [CompiledNLPatternState,Bindings][]
	{
		switch(current.type) {
			case NLPATTERN_SEQUENCE:
				let currentStates:[CompiledNLPatternState,Bindings][] = [[this, bindings]];
				for(let i:number = 0;i<current.children.length;i++) {
					let nextStates:[CompiledNLPatternState,Bindings][] = [];
					for(let tmp of currentStates) {
						let s:CompiledNLPatternState = tmp[0];
						let b:Bindings = tmp[1];
						let nextStates2:[CompiledNLPatternState,Bindings][] = s.addRuleInternal(priority, current.children[i], b, speakerVariable, listenerVariable);
						for(let ns of nextStates2) nextStates.push(ns);
					}
					currentStates = nextStates;
				}
				return currentStates;

			case NLPATTERN_ALTERNATIVE:
				{
					let nextStates:[CompiledNLPatternState,Bindings][] = [];
					let accumBindings:Bindings = bindings;
					for(let i:number = 0;i<current.children.length;i++) {
						let nextStates2:[CompiledNLPatternState,Bindings][] = this.addRuleInternal(priority, current.children[i], accumBindings, speakerVariable, listenerVariable);
						if (nextStates2.length != 1) {
							console.error("!!!");
						}
						for(let ns2 of nextStates2) {
							nextStates.push(ns2);
							accumBindings = ns2[1];
						}
					}
					if (nextStates.length > 1) {
						let s:CompiledNLPatternState = new CompiledNLPatternState();
						for(let ns of nextStates) {
							let t:CompiledNLPatternTransition = new CompiledNLPatternTransition();
							t.type = NLPATTERN_NONE;
							t.maxPriority = priority;
							t.destinationState = s;
							ns[0].transitions.push(t);
						}
						return [[s, accumBindings]];
					} else {
						return nextStates;
					}
				}

			case NLPATTERN_OPTIONAL:
				{
					let nextStates:[CompiledNLPatternState,Bindings][] = this.addRuleInternal(priority, current.children[0], bindings, speakerVariable, listenerVariable);
					if (nextStates.length == 1) {
						let found:boolean = false;
						for(let t2 of this.transitions) {
							if (t2.type == NLPATTERN_NONE && t2.destinationState == nextStates[0][0]) {
								found = true;
								break;
							}
						}
						if (!found) {
							// create a new transition (if needed):
							let t:CompiledNLPatternTransition = new CompiledNLPatternTransition();
							t.type = NLPATTERN_NONE;
							t.maxPriority = priority;
							t.destinationState = nextStates[0][0];
							this.transitions.push(t);
						}
						return nextStates;
					} else {
						nextStates.push([this, bindings]);
						return nextStates;
					}
				}

			case NLPATTERN_REPEAT:
				{
					let nextStates:[CompiledNLPatternState,Bindings][] = this.addRuleInternal(priority, current.children[0], bindings, speakerVariable, listenerVariable);
					// replace the next states with this:
					let open:[CompiledNLPatternState,CompiledNLPatternTransition][] = [];
					let closed:CompiledNLPatternState[] = [];
					open.push([this, null]);
					while(open.length > 0) {
	//					console.log("open: " + open.length + ", closed: " + closed.length);
						let [current_s, current_t]:[CompiledNLPatternState,CompiledNLPatternTransition] = open[0];
						open.splice(0,1);
						closed.push(current_s);
						let found:boolean = false;
						for(let sb of nextStates) {
							if (sb[0] == current_s && current_t != null) {
								current_t.destinationState = this;
								found = true;
								break;
							}
						}
						if (!found) {
							for(let t of current_s.transitions) {
								if (closed.indexOf(t.destinationState) == -1) {
									open.push([t.destinationState, t]);
								}
							}
						}
					}
				}
				return [[this, bindings]];
				
			case NLPATTERN_STRING:
			case NLPATTERN_POS:
			case NLPATTERN_PATTERN:
			case NLPATTERN_FUNCTION:
				let tmp:[CompiledNLPatternTransition, Bindings] = this.findMatchingTransition(current, bindings);
				if (tmp == null) {
					// create a new transition:
					let t:CompiledNLPatternTransition = new CompiledNLPatternTransition();
					let s:CompiledNLPatternState = new CompiledNLPatternState();
					t.type = current.type;
					t.string = current.string;
					t.maxPriority = priority;
					t.destinationState = s;

					if (current.term != null) {
//						let v:TermAttribute[] = [];
//						let vn:string[] = [];
//						console.log("  adding transition: " + current.term.toStringInternal(v, vn));
//						console.log("  with bindings: " + bindings.toStringWithMappings(v, vn));
						let term2:Term = current.term.applyBindings(bindings);
						// set the proper LISTENER and SPEAKER variables:
						let variables:VariableTermAttribute[] = term2.getAllVariables();
						let b2:Bindings = new Bindings();
						for(let v of variables) {
//							if (v.name == "LISTENER" && v != listenerVariable) b2.l.push([v, listenerVariable]);
							if (v.name == "SPEAKER" && v != speakerVariable) b2.l.push([v, speakerVariable]);
						}
						if (b2.l.length > 0) {
							t.term = term2.applyBindings(b2);
						} else {
							t.term = term2;
						}
					}

					this.transitions.push(t);
					return [[s, bindings]];
				} else {
					let t:CompiledNLPatternTransition = tmp[0];
					let b:Bindings = tmp[1];
					t.maxPriority = Math.max(t.maxPriority, priority);
					return [[t.destinationState, b]];
				}

			case NLPATTERN_NONE:
				console.error("Unsuported rule type NLPATTERN_NONE!");
				return null;
			default:
				console.error("Unsuported rule type!");
				return null;
		}

		return [];
	}


	findMatchingTransition(p:NLPattern, b:Bindings) : [CompiledNLPatternTransition, Bindings]
	{
		for(let i:number = 0;i<this.transitions.length;i++) {
			if (this.transitions[i].type == p.type) {
				if (p.type == NLPATTERN_STRING) {
					if (this.transitions[i].string == p.string) return [this.transitions[i], b];
				} else {
					let t2:Term = p.term.applyBindings(b);
					let b2:Bindings = new Bindings();
//					if (this.transitions[i].term.equalsInternal(t2, b2)) return [this.transitions[i], b.concat(b2)];
					if (t2.equalsInternal(this.transitions[i].term, b2)) return [this.transitions[i], b.concat(b2)];
				}
			}
		}

		return null;
	}


	addParseIfNew(parses:NLParseRecord[], parse:NLParseRecord) : boolean
	{
		for(let parse2 of parses) {
			if (parse.result != null && parse2.result != null &&
				parse.nextTokens.length == parse2.nextTokens.length &&
				parse.higherPriorityThan(parse2) <= 0 &&
				parse.result.equalsNoBindings(parse2.result) == 1) {
				if (parse.nextTokens.length == 0 ||
					parse.nextTokens[0].token == parse2.nextTokens[0].token) {
					// console.log("Filtering out parse: ");
		   //          console.log("  result: " + parse.result);
		   //          console.log("  ruleNames: " + parse.ruleNames);
		   //          console.log("  bindings: " + parse.bindings);
		   //          console.log("  nextTokens: " + parse.nextTokens);
		   //          console.log("  priorities: " + parse.priorities);
					// console.log("Because it's the same as: ");
		   //          console.log("  result: " + parse2.result);
		   //          console.log("  ruleNames: " + parse2.ruleNames);
		   //          console.log("  bindings: " + parse2.bindings);
		   //          console.log("  nextTokens: " + parse2.nextTokens);
		   //          console.log("  priorities: " + parse2.priorities);
					return false;
				}
			}
		}
		parses.push(parse);
		return true;
	}


	parse(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI, filterPartialParses:boolean) : NLParseRecord[]
	{
//		console.log("CompiledNLPatternState.parse... (heads: " + this.heads.length + "), parsing: " + 
//					(parse.nextTokens != null && parse.nextTokens.length>0 ? parse.nextTokens[0].token:"-"));

		let parses:NLParseRecord[] = [];
//		let bestPriority:number = 0;

		for(let i:number = 0;i<this.heads.length;i++) {
			// found a parse!
//			console.log("parse found with bindings: " + parse.bindings);
			let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities);
			parse2.result = this.heads[i].applyBindings(parse2.bindings);
			parse2.ruleNames = [this.ruleNames[i]].concat(parse2.ruleNames);
			parse2.priorities = [this.priorities[i]].concat(parse2.priorities);
			this.addParseIfNew(parses, parse2)
			// console.log("HEAD reached with rule names: " + parse.ruleNames);
			// if (parse2.nextTokens != null && parse2.nextTokens.length > 0) {
				// console.log("    tokens left: " + parse.nextTokens[0].toStringSimple());
			// } else {
			// 	console.log("HEAD reached with rule names: " + parse2.ruleNames);
				// console.log("    bindings: " + parse.bindings);
			// 	console.log("    result: " + parse2.result);
			// }
//			console.log("result: " + parse.result);
		}

		for(let t of this.transitions) {
			// if we do not have hopes of finding a parse with higher priority, then we can already abandon:
//			if (t.maxPriority < bestPriority) {
//				console.log("t.maxPriority = " + t.maxPriority + " < bestPriority = " + bestPriority);
//				continue;
//			}
			let parses2:NLParseRecord[] = [];
			switch(t.type) {
				case NLPATTERN_NONE:
					parses2 = t.destinationState.parse(parse, context, rule, parser, AI, filterPartialParses);
					break;

				case NLPATTERN_STRING:
					parses2 = t.parseString(parse, context, rule, parser, AI, filterPartialParses);
					break;

				case NLPATTERN_POS:
					parses2 = t.parsePOS(parse, context, rule, parser, AI, filterPartialParses);
					break;

				case NLPATTERN_PATTERN:
					parses2 = t.parsePattern(parse, context, rule, parser, AI, filterPartialParses);
					break;

				case NLPATTERN_FUNCTION:
					parses2 = t.parseFunction(parse, context, rule, parser, AI, filterPartialParses);
					break;

				default:
					console.error("CompiledNLPatternState.parse: pattern type not supported " + t.type);
			}
	
			if (parses2 != null) {
				for(let p of parses2) {
					if (filterPartialParses &&
						p.nextTokens != null && p.nextTokens.length > 0) continue;

//					if (p.priorities[0] >= bestPriority) {
					this.addParseIfNew(parses, p)
//					console.log("passing along result ("+t.type+", priority = " + p.priorities[0] + "): " + p.result);
//					bestPriority = p.priorities[0];
//					}
				}
			}
		}
		return parses;
	}


	getAllStatesForDOTString() : CompiledNLPatternState[]
	{
		// find all the states:
		let open:CompiledNLPatternState[] = [];
		let closed:CompiledNLPatternState[] = [];
		open.push(this);
		while(open.length != 0) {
			let current = open[0];
			open.splice(0,1);
			closed.push(current);
			for(let t of current.transitions) {
				if (closed.indexOf(t.destinationState) == -1 &&
					open.indexOf(t.destinationState) == -1) {
					open.push(t.destinationState);
				}
			}
		}

		return closed;		
	}


	convertToDOTString() : string
	{
		let str:string = "digraph compiledgrammar {\n";
		str+="graph[rankdir=LR];\n";
		let variables:TermAttribute[] = []; 
		let variableNames:string[] = [];

		// find all the states:
		let closed:CompiledNLPatternState[] = this.getAllStatesForDOTString();
		for(let i:number = 0;i<closed.length;i++) {
			let slabel:string = "";
			for(let j:number = 0;j<closed[i].heads.length;j++) {
				if (j!=0) slabel+="\n";
				slabel += closed[i].heads[j].toStringInternal(variables, variableNames) + "  (" + closed[i].priorities[j] + ")";
			}
			str += "s" + i + "[shape=box label=\""+slabel+"\"];\n";
		}
		for(let i:number = 0;i<closed.length;i++) {
			for(let j:number = 0;j<closed[i].transitions.length;j++) {
				let tlabel:string = "";
				if (closed[i].transitions[j].string != null) {
					tlabel = "'" + closed[i].transitions[j].string + "'";
				} else if (closed[i].transitions[j].term != null) {
					tlabel = closed[i].transitions[j].term.toStringInternal(variables, variableNames);
				} else {
					"-";
				}
				str += "s" + i + " -> s" + closed.indexOf(closed[i].transitions[j].destinationState) + "[label=\""+tlabel+"  ("+closed[i].transitions[j].maxPriority+")\"];\n";
			}
		}

		str += "}\n";
		return str;
	}


	priorities:number[] = [];	// if parsing ends at this node, what would be the priority of the parse
	heads:Term[] = [];		// if parsing can end at this node, this is the term that will be returned
	transitions:CompiledNLPatternTransition[] = [];
	ruleNames:string[] = [];
}


class CompiledNLPatternTransition {

	parseString(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI, filterPartialParses:boolean) : NLParseRecord[]
	{
		if (parse.nextTokens == null) return null;
		let parses:NLParseRecord[] = [];
		for(let nextToken of parse.nextTokens) {
			if (nextToken.token == null) {
				let parses2:NLParseRecord[] = this.parseString(new NLParseRecord(nextToken.next, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities), context, rule, parser, AI, filterPartialParses);
				if (parses2 != null) parses = parses.concat(parses2);
			} else if (nextToken.token == this.string) {
				// match!
				let parses2:NLParseRecord[] = this.destinationState.parse(new NLParseRecord(nextToken.next, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities), context, rule, parser, AI, filterPartialParses);
				if (parses2 != null) parses = parses.concat(parses2);
			}
		}
		if (parses.length == 0) return null;
		return parses;
	}


	parsePOS(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI, filterPartialParses:boolean) : NLParseRecord[]
	{
		let parses:NLParseRecord[] = [];
		let term2:Term = this.term.applyBindings(parse.bindings);
//				console.log("Matching POS, before: " + this.term.toString() + "\n  bindings: " + parse.bindings + "\n  Matching POS, after: " + term2.toString());
		for(let nextToken of parse.nextTokens) {
			if (nextToken.token == null) {
				let parses2:NLParseRecord[] = this.parsePOS(new NLParseRecord(nextToken.next, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities), context, rule, parser, AI, filterPartialParses);
				if (parses2 != null) parses = parses.concat(parses2);
			} else {
//						console.log("Matching POS "+term2.toString()+" with: " + nextToken.token);
				for(let POS of nextToken.POS) {
					let bindings:Bindings = new Bindings();
					if (POS.term.unify(term2, OCCURS_CHECK, bindings)) {
						let parses2:NLParseRecord[] = this.destinationState.parse(new NLParseRecord(nextToken.next, parse.previousPOS.concat([POS]), parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities), context, rule, parser, AI, filterPartialParses);
						if (parses2 != null) parses = parses.concat(parses2);
					}
				}
			}
		}
		if (parses.length == 0) return null;
		return parses;
	}


	parsePattern(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI, filterPartialParses:boolean) : NLParseRecord[]
	{
		let parses_p:NLParseRecord[] = [];
		let term2:Term = this.term.applyBindings(parse.bindings);
//		let term2:Term = this.term;
//				console.log("Matching pattern: " + term2.toString());

		let compiled:CompiledNLPatternRules = parser.compiledRules[term2.functor.name];
		if (compiled != null) {
			// if we have a compiled tree, use it!
//			console.log("CompiledNLPatternTransition.parsePattern: Found a compiled tree for " + term2.functor.name + " ...");
			let results:NLParseRecord[] = compiled.parseMatchingWithTerm(new NLParseRecord(parse.nextTokens, parse.previousPOS, new Bindings(), parse.derefs, parse.ruleNames, parse.priorities), false, context, parser, AI, term2);
			for(let pr of results) {
				let bindings2:Bindings = new Bindings();
				// if (!pr.result.unify(term2, OCCURS_CHECK, bindings2)) {
				if (!term2.unify(pr.result, OCCURS_CHECK, bindings2)) {
					console.error("CompiledNLPatternTransition.parsePattern: something went wrong when parsing pattern " + term2.toString() + "\n  It does not unify with: " + pr.result);
					return null;
				}
				// console.log("Succesful unification of:");
				// console.log("        " + pr.result);
				// console.log("        " + term2);
				// console.log("        bindings: " + bindings2);
				// we continue from "pr", but using the bdingins from "parse", since the bindings
				// generated during the parsing of the sub-pattern are not relevant
				let parses2:NLParseRecord[] = this.destinationState.parse(new NLParseRecord(pr.nextTokens, pr.previousPOS, parse.bindings.concat(bindings2), pr.derefs, pr.ruleNames.concat(parse.ruleNames), pr.priorities.concat(parse.priorities)), context, rule, parser, AI, filterPartialParses);
				if (parses2 != null) parses_p = parses_p.concat(parses2);
			}
		} else {
//			console.log("CompiledNLPatternTransition.parsePattern: Using the raw rules for " + term2.functor.name + " ...");
			for(let rawRule2 of parser.rules) {
				let rule2:NLPatternRule = rawRule2.clone();
				let bindings:Bindings = new Bindings();
				if (rule2.head.unify(term2, OCCURS_CHECK, bindings)) {
					// rule to consider!!
	//						console.log("  considering rule with head: " + rule2.head.toString() + "\n  new bindings: " + bindings);
					let results:NLParseRecord[] = rule2.parseWithBindings(new NLParseRecord(parse.nextTokens, parse.previousPOS, bindings, parse.derefs, parse.ruleNames, parse.priorities), false, context, parser, AI);

					for(let pr of results) {
						let bindings2:Bindings = new Bindings();
						if (!pr.result.unify(term2, OCCURS_CHECK, bindings2)) {
							console.error("CompiledNLPatternTransition.parse: something went wrong when parsing pattern " + term2.toString() + "\n  It does not unify with: " + pr.result);
							return null;
						}
//						console.log("    Pattern matched successfully with result: " + pr.result.toString());
//						console.log("    and bindings: " + bindings2);
						// we continue from "pr", but using the bdingins from "parse", since the bindings
						// generated during the parsing of the sub-pattern are not relevant
						let parses2:NLParseRecord[] = this.destinationState.parse(new NLParseRecord(pr.nextTokens, pr.previousPOS, parse.bindings.concat(bindings2), pr.derefs, pr.ruleNames.concat(parse.ruleNames), pr.priorities.concat(parse.priorities)), context, rule, parser, AI, filterPartialParses);
						if (parses2 != null) parses_p = parses_p.concat(parses2);
					}
	//					} else {
	//						console.log("  head: " + rule2.head + "\n. did not unify with: " + term2);
				}
			}
		}
		if (parses_p.length == 0) return null;
//				console.log("Result of pattern: " + parses_p);
		return parses_p;
	}


	parseFunction(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI, filterPartialParses:boolean) : NLParseRecord[]
	{
		let parses_p:NLParseRecord[] = [];
		let pattern:NLPattern = new NLPattern(this.type);
		pattern.term = this.term;
		let results:NLParseRecord[] = pattern.parseFunction(parse, context, rule, parser, AI);
		if (results != null) {
			for(let pr of results) {
	//			console.log("parseFunction, parse.bindings: " + parse.bindings);
	//			console.log("parseFunction, pr.bindings: " + pr.bindings);
				let parses2:NLParseRecord[] = this.destinationState.parse(new NLParseRecord(pr.nextTokens, pr.previousPOS, pr.bindings, pr.derefs, pr.ruleNames, pr.priorities), context, rule, parser, AI, filterPartialParses);
				if (parses2 != null) parses_p = parses_p.concat(parses2);
			}
		}
		return parses_p;
	}	


	type:number = NLPATTERN_NONE;
	string:string = null;
	term:Term = null;	// this is used for POS, recursive patterns and special functions
	destinationState:CompiledNLPatternState = null;
	maxPriority:number = 0;
}
