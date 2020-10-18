var NLPATTERN_NONE:number = 0;
var NLPATTERN_STRING:number = 1;
var NLPATTERN_SEQUENCE:number = 2;
var NLPATTERN_ALTERNATIVE:number = 3;
var NLPATTERN_OPTIONAL:number = 4;
var NLPATTERN_REPEAT:number = 5;
var NLPATTERN_POS:number = 6;
var NLPATTERN_PATTERN:number = 7;
var NLPATTERN_FUNCTION:number = 8;


class NLPattern {
	constructor(t:number)
	{
		this.type = t;
	}


	parse(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		switch(this.type) {
			case NLPATTERN_SEQUENCE:
				let parses2:NLParseRecord[] = [parse];
				for(let pattern of this.children) {
					let newParses:NLParseRecord[] = [];
					for(let parse2 of parses2) {
						let parses3:NLParseRecord[] = pattern.parse(parse2, context, rule, parser, AI);
						if (parses3 != null) newParses = newParses.concat(parses3);
					}
					parses2 = newParses;
					if (parses2.length == 0) return null;
				}
				return parses2;

			case NLPATTERN_ALTERNATIVE:
				let parses_a:NLParseRecord[] = [];
				//console.log("alternative with " + this.children.length + " children");
				for(let pattern of this.children) {
					let parses2_a:NLParseRecord[] = pattern.parse(parse, context, rule, parser, AI);
					//console.log("    " + parses2_a.length + " parses");
					if (parses2_a != null) parses_a = parses_a.concat(parses2_a);
				}
				if (parses_a.length == 0) return null;
				return parses_a;

			case NLPATTERN_OPTIONAL:
				// concat the current parse (which ignores the optional part), with the pares resulting from forcing it
				let parses:NLParseRecord[] = this.children[0].parse(parse, context, rule, parser, AI);
//				console.log("Results of optional: " + parses);
				if (parses == null) return [parse];
				return [parse].concat(parses);
		
			case NLPATTERN_REPEAT:
				let parses2_r:NLParseRecord[] = [parse];	// 0 repetitions is also allowed, that's why
															// we initialize the list of results with the current parse.
				let parses2_r_last:NLParseRecord[] = [parse];
				let newParses:NLParseRecord[];
				do{
					newParses = [];
					for(let parse2_r of parses2_r_last) {
						let parses3_r:NLParseRecord[] = this.children[0].parse(parse2_r, context, rule, parser, AI);
						if (parses3_r != null) newParses = newParses.concat(parses3_r);
					}
					parses2_r_last = newParses;
					parses2_r = parses2_r.concat(newParses);
				}while(newParses.length>0);
				return parses2_r;

			case NLPATTERN_STRING:
				return this.parseString(parse, context, rule, parser, AI);

			case NLPATTERN_POS:
				return this.parsePOS(parse, context, rule, parser, AI);

			case NLPATTERN_PATTERN:
				return this.parsePattern(parse, context, rule, parser, AI);

			case NLPATTERN_FUNCTION:
				return this.parseFunction(parse, context, rule, parser, AI);

			default:
				console.error("NLPattern.parse: pattern type not supported " + this.type);
				return null;
		}
	}


	parseString(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		if (parse.nextTokens == null) return null;
		let parses:NLParseRecord[] = [];
		for(let nextToken of parse.nextTokens) {
			if (nextToken.token == null) {
				let parses2:NLParseRecord[] = this.parseString(new NLParseRecord(nextToken.next, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities), context, rule, parser, AI);
				if (parses2 != null) parses = parses.concat(parses2);
			} else if (nextToken.token == this.string) {
				// match!
				parses.push(new NLParseRecord(nextToken.next, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities));
			}
		}
		if (parses.length == 0) return null;
		return parses;
	}


	parsePOS(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		let parses:NLParseRecord[] = [];
		let term2:Term = this.term.applyBindings(parse.bindings);
//				console.log("Matching POS, before: " + this.term.toString() + "\n  bindings: " + parse.bindings + "\n  Matching POS, after: " + term2.toString());
		for(let nextToken of parse.nextTokens) {
			if (nextToken.token == null) {
				let parses2:NLParseRecord[] = this.parsePOS(new NLParseRecord(nextToken.next, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities), context, rule, parser, AI);
				if (parses2 != null) parses = parses.concat(parses2);
			} else {
//						console.log("Matching POS "+term2.toString()+" with: " + nextToken.token);
				for(let POS of nextToken.POS) {
					let bindings:Bindings = new Bindings();
					if (POS.term.unify(term2, OCCURS_CHECK, bindings)) {
						let newParse:NLParseRecord = new NLParseRecord(nextToken.next, parse.previousPOS.concat([POS]), parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities); 
//								console.log("POS match with: " + POS.term + "\nBindings: " + newParse.bindings);
						parses.push(newParse);
					}
				}
			}
		}
		if (parses.length == 0) return null;
		return parses;
	}


	parsePattern(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		let parses_p:NLParseRecord[] = [];
		let term2:Term = this.term.applyBindings(parse.bindings);
//				console.log("Matching pattern: " + term2.toString());

		let compiled:CompiledNLPatternRules = parser.compiledRules[term2.functor.name];
		if (compiled != null) {
			// if we have a compiled tree, use it!
//			console.log("NLPattern.parsePattern: Found a compiled tree for " + term2.functor.name + " ...");
			let results:NLParseRecord[] = compiled.parseMatchingWithTerm(new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities), false, context, parser, AI, term2);
			for(let pr of results) {
				let bindings2:Bindings = new Bindings();
				if (!pr.result.unify(term2, OCCURS_CHECK, bindings2)) {
					console.error("NLPattern.parsePattern: something went wrong when parsing pattern " + term2.toString() + "\n  It does not unify with: " + pr.result);
					return null;
				}
				// we continue from "pr", but using the bindings from "parse", since the bindings
				// generated during the parsing of the sub-pattern are not relevant
				// console.log("ruleNames for " + term2.functor.name + ": " + parse.ruleNames);
				// console.log("    concatenated to: " + pr.ruleNames);
				let pr2:NLParseRecord = new NLParseRecord(pr.nextTokens, pr.previousPOS, parse.bindings.concat(bindings2), parse.derefs, pr.ruleNames.concat(parse.ruleNames), pr.priorities.concat(parse.priorities));
				pr2.result = pr.result;
				parses_p.push(pr2);				
			}
		} else {
			console.log("NLPattern.parsePattern: Using the raw rules for " + term2.functor.name + " ...");
			for(let rawRule2 of parser.rules) {
				let rule2:NLPatternRule = rawRule2.clone();
				let bindings:Bindings = new Bindings();
				if (rule2.head.unify(term2, OCCURS_CHECK, bindings)) {
					// rule to consider!!
	//						console.log("  considering rule with head: " + rule2.head.toString() + "\n  new bindings: " + bindings);
					let results:NLParseRecord[] = rule2.parseWithBindings(new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities), false, context, parser, AI);

					for(let pr of results) {
	//							console.log("Pattern matched successfully with result: " + t.toString());
						let bindings2:Bindings = new Bindings();
						if (!pr.result.unify(term2, OCCURS_CHECK, bindings2)) {
							console.error("NLPattern.parsePattern: something went wrong when parsing pattern " + term2.toString() + "\n  It does not unify with: " + pr.result);
							return null;
						}
						// we continue from "pr", but using the bdingins from "parse", since the bindings
						// generated during the parsing of the sub-pattern are not relevant
						parses_p.push(new NLParseRecord(pr.nextTokens, pr.previousPOS, parse.bindings.concat(bindings2), parse.derefs, pr.ruleNames.concat(parse.ruleNames), pr.priorities.concat(parse.priorities)));
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


	parseFunction(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		if (this.term.functor.name == "#derefFromContext") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_derefFromContext(parse, term2.attributes[0], term2.attributes[1], context, rule.listenerVariable, parser.o, parser.posParser, AI);
			if (nlprl == null) {
				let nlper:NLDerefErrorRecord = new NLDerefErrorRecord(context.lastDerefErrorType, parse.tokensLeftToParse());
				nlper.derefFromContextErrors.push(term2.attributes[0]);
				rule.lastDerefErrors.push(nlper)
			}
			return nlprl;
		} else if (this.term.functor.name == "#derefUniversal") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_derefUniversal(parse, term2.attributes[0], term2.attributes[1], term2.attributes[2], parser.o);
			if (nlprl == null) {
				let nlper:NLDerefErrorRecord = new NLDerefErrorRecord(this.lastDerefErrorType, parse.tokensLeftToParse());
				nlper.derefUniversalErrors.push(term2.attributes[0]);
				rule.lastDerefErrors.push(nlper)
			}
			return nlprl;
		} else if (this.term.functor.name == "#derefHypothetical") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_derefHypothetical(parse, term2.attributes[0], term2.attributes[1], term2.attributes[2], context, rule.listenerVariable, parser.o, parser.posParser, AI);
			if (nlprl == null) {
				let nlper:NLDerefErrorRecord = new NLDerefErrorRecord(this.lastDerefErrorType, parse.tokensLeftToParse());
				nlper.derefHypotheticalErrors.push(term2.attributes[0]);
				rule.lastDerefErrors.push(nlper)
			}
			return nlprl;
		} else if (this.term.functor.name == "#derefQuery") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_derefQuery(parse, term2.attributes[0], term2.attributes[1], term2.attributes[2], context, rule.listenerVariable, parser.o, parser.posParser, AI);
			if (nlprl == null) {
				let nlper:NLDerefErrorRecord = new NLDerefErrorRecord(this.lastDerefErrorType, parse.tokensLeftToParse());
				nlper.derefQueryErrors.push(term2.attributes[0]);
				rule.lastDerefErrors.push(nlper)
			}
			return nlprl;
		} else if (this.term.functor.name == "#symbolToSort") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_symbolToSort(parse, term2.attributes[0], term2.attributes[1], parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#subsumes") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_subsumes(parse, term2.attributes[0], term2.attributes[1], parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#doesnotsubsume") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let listenerBindings:Bindings = new Bindings();
			listenerBindings.l.push([rule.listenerVariable, new ConstantTermAttribute(context.ai.selfID, parser.o.getSort("#id"))]);
			term2 = term2.applyBindings(listenerBindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_doesnotsubsume(parse, term2.attributes[0], term2.attributes[1], parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#notequal") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let listenerBindings:Bindings = new Bindings();
			listenerBindings.l.push([rule.listenerVariable, new ConstantTermAttribute(context.ai.selfID, parser.o.getSort("#id"))]);
			term2 = term2.applyBindings(listenerBindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_notequal(parse, term2.attributes[0], term2.attributes[1], parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#sortParent") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_sortParent(parse, term2.attributes[0], term2.attributes[1], parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#concatenateSymbols") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_concatenateSymbols(parse, term2.attributes, parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#completeVerbArgumentsFromContext" && this.term.attributes.length == 2) {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let nlprl:NLParseRecord[] = this.specialfunction_completeVerbArgumentsFromContext(parse, term2.attributes[0], term2.attributes[1], context, parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#changeConstantSort") {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_changeConstantSort(parse, term2.attributes, parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#token" && this.term.attributes.length == 1) {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_token(parse, term2.attributes[0], parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#findLastNoun" && this.term.attributes.length == 1) {
			let term2:Term = this.term.applyBindings(parse.bindings);
			let  nlprl:NLParseRecord[] = this.specialfunction_findLastNoun(parse, term2.attributes[0], parser.o);
			return nlprl;
		} else {
			console.error("NLPattern.parse: special function "+this.term.functor+" not supported!");
			return null;
		}
	}


	specialfunction_derefFromContext(parse:NLParseRecord, clause:TermAttribute, output:TermAttribute, context:NLContext, listenerVariable:TermAttribute, o:Ontology, pos:POSParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		this.lastDerefErrorType = 0;
		if (!(clause instanceof TermTermAttribute)) {
			console.log("specialfunction_derefFromContext: trying to dereference a clause that is not a term! " + clause);
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

		let result_l:TermAttribute[] = context.deref((<TermTermAttribute>clause).term, listenerVariable, parse, o, pos, AI);

//		console.log("specialfunction_derefFromContext result: " + result);

		if (result_l == null || result_l.length == 0) {
			this.lastDerefErrorType = context.lastDerefErrorType;
			return null;
		}

		let result:TermAttribute = result_l[0];
		for(let i:number = 1;i<result_l.length;i++) {
			let tmp:Term = new Term(o.getSort("#list"), [result_l[i], result]);
			result = new TermTermAttribute(tmp);
		}

		let bindings2:Bindings = new Bindings();
		if (Term.unifyAttribute(output, result, true, bindings2)) {
			let bindings3:Bindings = parse.bindings.concat(bindings2);
			let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, bindings3, 
													     parse.derefs.concat([new Term(o.getSort("#derefFromContext"), [clause, output.applyBindings(bindings3)])]), 
													     parse.ruleNames, parse.priorities);
			return [parse2];
		} else {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
	}


	specialfunction_derefUniversal(parse:NLParseRecord, clause:TermAttribute, outputVariable:TermAttribute, output:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		this.lastDerefErrorType = 0;
		let nounSort:Sort = o.getSort("noun");
		let properNounSort:Sort = o.getSort("proper-noun");
		let personalPronounSort:Sort = o.getSort("personal-pronoun");
		let determinerSort:Sort = o.getSort("determiner");
		let adjectiveSort:Sort = o.getSort("adjective");
		let result:Term = null;

		if (!(clause instanceof TermTermAttribute)) {
			console.log("specialfunction_derefUniversal: trying to dereference a clause that is not a term! " + clause);
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

		let all_found:boolean = false;
		for(let tmp of NLParser.elementsInList((<TermTermAttribute>clause).term, "#and")) {
			if (tmp instanceof TermTermAttribute) {
				let tmp2:Term = (<TermTermAttribute>tmp).term;
				if (tmp2.functor.name == "all") {
					all_found = true;
				} else if (tmp2.functor.is_a(determinerSort)) {
					// if a determiner is used that is not "all", then this is not a universal
					this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
					return null;
				} else if (tmp2.functor.is_a(properNounSort)) {
					// if a proper noun is used, then this is not a universal
					this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
					return null;
				} else if (tmp2.functor.is_a(personalPronounSort)) {
					// if a personal pronoun is used, then this is not a universal
					this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
					return null;
				} else if (tmp2.functor.is_a(nounSort) &&
					tmp2.attributes[0] instanceof ConstantTermAttribute) {
						let resultTmp:Term = new Term(o.getSort((<ConstantTermAttribute>tmp2.attributes[0]).value),
										  			  [outputVariable]);
					if (result == null) {
						result = resultTmp;
					} else {
						result = new Term(o.getSort("#and"), [new TermTermAttribute(resultTmp), 
															  new TermTermAttribute(result)]);

					}
				} else if (tmp2.functor.is_a(adjectiveSort) &&
						   tmp2.attributes[1] instanceof ConstantTermAttribute) {
						let propertySort:Sort = o.getSort((<ConstantTermAttribute>tmp2.attributes[1]).value);
						let resultTmp:Term = null;
						if (propertySort.is_a(o.getSort("property-with-value"))) {
							resultTmp = new Term(propertySort, [outputVariable, new ConstantTermAttribute(propertySort.name, propertySort)]);
						} else {
							resultTmp = new Term(propertySort, [outputVariable]);
						}
					if (result == null) {
						result = resultTmp;
					} else {
						result = new Term(o.getSort("#and"), [new TermTermAttribute(resultTmp), 
															  new TermTermAttribute(result)]);
					}
				} else {
					console.log("specialfunction_derefUniversal: clause contains an element that is not yet supported! " + tmp2);
				}
			} else {
				console.log("specialfunction_derefUniversal: clause contains an element that is not a term!");
			}
		}

		if (!all_found) {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
//		console.log("specialfunction_derefUniversal result: " + result);
		
		let bindings2:Bindings = new Bindings();
		let resultAtt:TermTermAttribute = new TermTermAttribute(result);
		if (Term.unifyAttribute(output, resultAtt, true, bindings2)) {
			let bindings3:Bindings = parse.bindings.concat(bindings2);
			let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, bindings3, 
														 parse.derefs.concat([new Term(o.getSort("#derefUniversal"), [clause, outputVariable.applyBindings(bindings3), output.applyBindings(bindings3)])]), 
														 parse.ruleNames, parse.priorities);
			return [parse2];
		} else {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
	}	


	specialfunction_derefHypothetical(parse:NLParseRecord, clause:TermAttribute, outputVariable:TermAttribute, output:TermAttribute, context:NLContext, listenerVariable:TermAttribute, o:Ontology, pos:POSParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		this.lastDerefErrorType = 0;
		let properNounSort:Sort = o.getSort("proper-noun");
		let nounSort:Sort = o.getSort("noun");
		let determinerSort:Sort = o.getSort("determiner");
		let relationSort:Sort = o.getSort("relation");
		let indefiniteArticleSort:Sort = o.getSort("indefinite-article");
//		let adjectiveSort:Sort = o.getSort("adjective");
		let result:Term = null;
//		let foundIndefiniteArticle:boolean = false;
		let hadName:boolean = false;	// if there is a name for the new hypothetical, then we need to generate an ID for it
		let outputVariableSort:Sort = null;

		if (!(clause instanceof TermTermAttribute)) {
			console.log("specialfunction_derefHypothetical: trying to dereference a clause that is not a term! " + clause);
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

//		console.log("specialfunction_derefHypothetical: " + clause);

		// if we can dereference the expression in the context, then this function should not apply:
		let contextDerefResult:TermAttribute[] = context.deref((<TermTermAttribute>clause).term, listenerVariable, parse, o, pos, AI);
		if (contextDerefResult != null && contextDerefResult.length>0) {
//			console.log("specialfunction_derefHypothetical: context.deref succeeded! " + contextDerefResult);
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

//		console.log("specialfunction_derefHypothetical: context.deref failed");

		let clauses:TermAttribute[] =  NLParser.elementsInList((<TermTermAttribute>clause).term, "#and");

		for(let tmp of clauses) {
			if (tmp instanceof TermTermAttribute) {
				let tmp2:Term = (<TermTermAttribute>tmp).term;
				if (tmp2.functor.is_a(determinerSort)) {
					if (tmp2.functor.is_a(indefiniteArticleSort)) {
//						foundIndefiniteArticle = true;
						// an indefinite article is fine
					} else {
						// if a determiner is used, then this is not a hypothetical
	//						console.log("specialfunction_derefHypothetical: a determiner is used, this is not a hypothetical!");
						this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
						return null;
					}
				}
			}
		}
		for(let tmp of clauses) {
			if (tmp instanceof TermTermAttribute) {
				let tmp2:Term = (<TermTermAttribute>tmp).term;
				if (tmp2.functor.is_a(properNounSort)) {
					hadName = true;		
					let resultTmp:Term = new Term(o.getSort("name"), [outputVariable, tmp2.attributes[0]]);
					if (result == null) {
						result = resultTmp;
					} else {
						result = new Term(o.getSort("#and"), [new TermTermAttribute(resultTmp), 
															  new TermTermAttribute(result)]);
					}
				} else if (tmp2.functor.is_a(nounSort) &&
						   tmp2.attributes.length>=1 &&
						   tmp2.attributes[0] instanceof ConstantTermAttribute) {
//					if (foundIndefiniteArticle) {
						let resultTmp:Term = new Term(o.getSort((<ConstantTermAttribute>(tmp2.attributes[0])).value),
										  			  [outputVariable]);
						outputVariableSort = resultTmp.functor;
						if (result == null) {
							result = resultTmp;
						} else {
							result = new Term(o.getSort("#and"), [new TermTermAttribute(resultTmp), 
																  new TermTermAttribute(result)]);
						}
//					} else {
//						console.log("specialfunction_derefHypothetical: noun found without an indefinite article!");
//						this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
//						return null;
//					}
				} else if (tmp2.functor.is_a(relationSort)) {
					let resultTmp:Term = new Term(relationSort, [outputVariable, tmp2.attributes[0]]);
					if (result == null) {
						result = resultTmp;
					} else {
						result = new Term(o.getSort("#and"), [new TermTermAttribute(tmp2), 
															  new TermTermAttribute(result)]);
					}

				} else if (tmp2.functor.is_a(determinerSort)) {
					// ignore, handled before
				} else {
					console.log("specialfunction_derefHypothetical: clause contains an element that is not yet supported! " + tmp2);
				}
			} else {
				console.log("specialfunction_derefHypothetical: clause contains an element that is not a term!");
			}
		}

		if (result == null) {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
//		console.log("specialfunction_derefHypothetical result: " + result);
		
		let bindings2:Bindings = new Bindings();
		if (hadName) {
			let outputVariableID:ConstantTermAttribute = new ConstantTermAttribute(context.newHypotheticalID(), o.getSort("#id"));
	//		console.log("outputVariable: " + outputVariable);
	//		console.log("outputVariableID: " + outputVariableID);
			if (!Term.unifyAttribute(outputVariable, outputVariableID, true, bindings2)) return null;
		} else if (outputVariableSort != null) {
			let outputVariableID:ConstantTermAttribute = new ConstantTermAttribute(outputVariableSort.name, outputVariableSort);
	//		console.log("outputVariable: " + outputVariable);
	//		console.log("outputVariableID: " + outputVariableID);
			if (!Term.unifyAttribute(outputVariable, outputVariableID, true, bindings2)) return null;
		}

		let resultAtt:TermTermAttribute = new TermTermAttribute(result);
		if (!Term.unifyAttribute(output, resultAtt, true, bindings2)) return null;
		let bindings3:Bindings = parse.bindings.concat(bindings2);
		let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, bindings3, 
													 parse.derefs.concat([new Term(o.getSort("#derefHypothetical"), [clause, outputVariable.applyBindings(bindings3), output.applyBindings(bindings3)])]), 
													 parse.ruleNames, parse.priorities);
		return [parse2];
	}	


	/*
	For example, for the sort "white", it will return the sort "color". But if we pass the sort "color",
	if should return the same "color" sort.
	*/
	getPropertyWithValueFunctorSort(sort:Sort, o:Ontology) : Sort
	{
		let pwv:Sort = o.getSort("property-with-value");
		if (sort.parents.indexOf(pwv) >= -0) return sort;
		for(let parent of sort.parents) {
			if (parent.is_a(pwv)) return parent;
		}
		return sort;
	}


	/*
	Examples:
		#and(V0:determiner.my(V1:'name'[#id], V2:[singular]), V3:noun(V1, V2)		->		name(context.selfID, queryVariable)
		#and(V0:determiner.your(V1:'name'[#id], V2:[singular]), V3:noun(V1, V2))		->		name(listenerVariable, queryVariable)
		#and(V0:verb.own(V1:'ship'[#id], V2:'name'[#id]), V3:#and(V4:noun(V2, V5:[singular]), V6:#and(V7:the(V1, V8:[singular]), V9:noun(V1, V8))))
				-> if there is a "verb.own", separate in two:
						owner V1) V7:the(V1:'ship'[#id], V8:[singular]), V9:noun(V1, V8)
						ownee V2) V4:noun(V2:'name'[#id], V5:[singular])
					-> owner should just be a single noun, potentially with adjectives
					-> then try to deref "owner" -> OWNER
				-> the result will be name(OWNER, queryVariable) [+ whatever adjectives applied to the queryVariable]

		Sentences with "this/these/that/those" should not be queries, and thus this function will return null for them
	*/
	specialfunction_derefQuery(parse:NLParseRecord, clause:TermAttribute, queryVariable:TermAttribute, query:TermAttribute, context:NLContext, listenerVariable:TermAttribute, o:Ontology, pos:POSParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		this.lastDerefErrorType = 0;
		if (!(clause instanceof TermTermAttribute)) {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
		NLParser.resolveCons((<TermTermAttribute>clause).term, o);
		clause.sort = (<TermTermAttribute>clause).term.functor;
//		console.log("specialfunction_derefQuery: clause = " + clause);
//		console.log("specialfunction_derefQuery: queryVariable = " + queryVariable);
//		console.log("specialfunction_derefQuery: query = " + query);
//		console.log("specialfunction_derefQuery: context.ai.selfID = " + context.ai.selfID);
		let queryTerm:TermAttribute = null;
		let terms:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>clause).term, "#and");
		let myDeterminer:Term = null;
		let ourDeterminer:Term = null;
		let yourDeterminer:Term = null;
		let definiteArticle:Term = null;
		let aDeterminer:Term = null;
		let indefinitePronoun:Term = null;
		let ownsRelation:Term = null;
		let otherRelations:Term[] = [];
		let nounTerm:Term = null;
		//let properNounTerm:Term = null;	
		let adverbs:Term[] = [];
		let adjectives:Sort[] = [];	// adjectives are filled later, since we neeed queryFunctor
		let negatedAdjectives:Sort[] = [];	// adjectives are filled later, since we neeed queryFunctor
		let demonstrativeDeterminer:Term = null;
		let demonstrativePronoun:Term = null;
		let otherTerms:Term[] = [];
		let elsePresent:boolean = false;
		let otherDeterminerPresent:boolean = false;
		for(let t of terms) {
			if (t instanceof TermTermAttribute) {
				if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("determiner.my"))) {
					myDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("determiner.your"))) {
					yourDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("determiner.our"))) {
					ourDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("determiner.other")) ||
						   (<TermTermAttribute>t).term.functor.is_a(o.getSort("determiner.another"))) {
					otherDeterminerPresent = true;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("a")) ||
					       (<TermTermAttribute>t).term.functor.is_a(o.getSort("article.any"))) {
					aDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("definite-article"))) {
					definiteArticle = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("demonstrative-determiner"))) {
					demonstrativeDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("verb.own"))) {
					ownsRelation = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("#not")) &&
						   (<TermTermAttribute>t).term.attributes.length == 1 &&
						   ((<TermTermAttribute>t).term.attributes[0] instanceof TermTermAttribute) &&
						   (<TermTermAttribute>((<TermTermAttribute>t).term.attributes[0])).term.functor.is_a(o.getSort("verb.own"))) {
					//ownsRelation = (<TermTermAttribute>t).term;
					console.error("negated owns relation not yet supported!");
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("indefinite-pronoun"))) {
					if ((<TermTermAttribute>t).term.attributes.length > 0 &&
						((<TermTermAttribute>t).term.attributes[0] instanceof ConstantTermAttribute)) {
						indefinitePronoun = (<TermTermAttribute>t).term;
						if ((<ConstantTermAttribute>((<TermTermAttribute>t).term.attributes[0])).value == "pronoun.anyone.else") {
							elsePresent = true;
						}
					}
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("adverb"))) {
					adverbs.push((<TermTermAttribute>t).term);
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("noun"))) {
					nounTerm = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("proper-noun"))) {
					//properNounTerm = (<TermTermAttribute>t).term;
					// if there is a proper noun, this is probably not a query...
					this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
					return null;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("demonstrative-pronoun"))) {
					demonstrativePronoun = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("relation"))) {
					otherRelations.push((<TermTermAttribute>t).term);
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("#not")) &&
						   (<TermTermAttribute>t).term.attributes.length == 1 &&
						   ((<TermTermAttribute>t).term.attributes[0] instanceof TermTermAttribute) &&
						   (<TermTermAttribute>((<TermTermAttribute>t).term.attributes[0])).term.functor.is_a(o.getSort("relation"))) {
					otherRelations.push((<TermTermAttribute>t).term);
				} else {
					otherTerms.push((<TermTermAttribute>t).term);
				}
			}
		}

		// console.log("#derefQuery.otherRelations: " + otherRelations);
		// console.log("#derefQuery.otherTerms: " + otherTerms);

		let potentialQueryFunctor:TermAttribute = null;
		let queryFunctor:TermAttribute = null;
		let queryFunctorSort:Sort = null;
		let querySubjectID_l:TermAttribute[] = null;
		let queryLocationID:TermAttribute = null;
		let TermUsedForQueryLocationID:Term = null;
		let queryTerms:TermAttribute[] = [];

		if (myDeterminer!=null) {
			queryFunctor = myDeterminer.attributes[0];
			if (queryFunctor instanceof ConstantTermAttribute) {
				queryFunctorSort = o.getSortSilent((<ConstantTermAttribute>queryFunctor).value);
			}
			querySubjectID_l = [new ConstantTermAttribute(context.speaker, o.getSort("#id"))];
		} else if (ourDeterminer!=null) {
			queryFunctor = ourDeterminer.attributes[0];
			if (queryFunctor instanceof ConstantTermAttribute) {
				queryFunctorSort = o.getSortSilent((<ConstantTermAttribute>queryFunctor).value);
			}
			querySubjectID_l = [new ConstantTermAttribute(context.ai.selfID, o.getSort("#id")),
								new ConstantTermAttribute(context.speaker, o.getSort("#id"))];
		} else if (yourDeterminer!=null) {
			queryFunctor = yourDeterminer.attributes[0];
			if (queryFunctor instanceof ConstantTermAttribute) {
				queryFunctorSort = o.getSortSilent((<ConstantTermAttribute>queryFunctor).value);
			}
			querySubjectID_l = [new ConstantTermAttribute(context.ai.selfID, o.getSort("#id"))];
		} else if (ownsRelation!=null) {
			// case 3: if there is a "verb.own":
			let ownerVariable:TermAttribute = ownsRelation.attributes[0];
			let ownerTerms:TermAttribute[] = [];
			queryFunctor = ownsRelation.attributes[1];
			for(let t of terms) {
				if (t instanceof TermTermAttribute) {
					let t2:Term = (<TermTermAttribute>t).term;
					if (t2 == ownsRelation) continue;
					for(let i:number = 0;i<t2.attributes.length;i++) {
						if (t2.attributes[i] == ownerVariable) ownerTerms.push(t);
					}
				}
			}
			let dereffedOwner:TermAttribute[] = context.derefInternal(ownerTerms, listenerVariable, parse, o, pos, AI);
//			console.log("ownerTerms: " + ownerTerms);
//			console.log("dereffedOwner: " + dereffedOwner);
			if (dereffedOwner == null) {
				this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
				return null;
			}
			if (dereffedOwner.length != 1) {
				this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
				return null;
			}
			querySubjectID_l = [dereffedOwner[0]];
		} else if (aDeterminer != null) {
			queryFunctor = aDeterminer.attributes[0];
		} else if (definiteArticle != null ||
				   demonstrativeDeterminer != null ||
				   demonstrativePronoun != null) {
			// in this case, this is not a query expression, probably a context dereference
			return null;
		} else if (nounTerm != null) {
			potentialQueryFunctor = nounTerm.attributes[0];
			queryFunctorSort = o.getSort((<ConstantTermAttribute>nounTerm.attributes[0]).value);
		} else if (indefinitePronoun != null) {
			potentialQueryFunctor = indefinitePronoun.attributes[0];
			if ((<ConstantTermAttribute>(indefinitePronoun.attributes[0])).value == 'pronoun.anyone' ||
				(<ConstantTermAttribute>(indefinitePronoun.attributes[0])).value == 'pronoun.anyone.else' ||
				(<ConstantTermAttribute>(indefinitePronoun.attributes[0])).value == 'pronoun.someone') {
				queryFunctorSort = o.getSort("character");
			} else if ((<ConstantTermAttribute>(indefinitePronoun.attributes[0])).value == 'pronoun.anything' ||
					   (<ConstantTermAttribute>(indefinitePronoun.attributes[0])).value == 'pronoun.something') {
				queryFunctorSort = o.getSort("any");
			}
		}

		if (queryFunctor!=null && 
			queryFunctor instanceof ConstantTermAttribute) {
			queryFunctorSort = o.getSortSilent((<ConstantTermAttribute>queryFunctor).value);
		}
		if (queryFunctor == null && potentialQueryFunctor != null) {
			queryFunctor = potentialQueryFunctor;
		}

		for(let t of terms) {
			if (t instanceof TermTermAttribute) {
				if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("adjective"))) {
					let t2:Term = (<TermTermAttribute>t).term;
					if (t2.attributes[0] == queryFunctor &&
						t2.attributes[1] instanceof ConstantTermAttribute) {
						let adjectiveSort:Sort = o.getSort((<ConstantTermAttribute>(t2.attributes[1])).value);
						if (adjectiveSort != null) adjectives.push(adjectiveSort);
					}
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("#not")) &&
						   (<TermTermAttribute>t).term.attributes.length == 1 &&
						   ((<TermTermAttribute>t).term.attributes[0] instanceof TermTermAttribute) &&
						   (<TermTermAttribute>((<TermTermAttribute>t).term.attributes[0])).term.functor.is_a(o.getSort("adjective"))) {
					let t2:Term = (<TermTermAttribute>((<TermTermAttribute>t).term.attributes[0])).term;
					if (t2.attributes[0] == queryFunctor &&
						t2.attributes[1] instanceof ConstantTermAttribute) {
						let adjectiveSort:Sort = o.getSort((<ConstantTermAttribute>(t2.attributes[1])).value);
						if (adjectiveSort != null) negatedAdjectives.push(adjectiveSort);
					}
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("space.at")) &&
					       queryFunctorSort.is_a(o.getSort("role"))) {
					queryLocationID = (<TermTermAttribute>t).term.attributes[1];
					TermUsedForQueryLocationID = (<TermTermAttribute>t).term;
				} else {
					//console.log("Not considered: " + t);
				}
			}
		}

		let verbOrRelationTerm:TermAttribute = null;	// this is so that if we have an adverb of time, we know which term to qualify
		if (queryFunctorSort != null) {
			if (queryLocationID == null) {
				if (querySubjectID_l == null ||
					!queryFunctorSort.is_a(o.getSort("property-with-value"))) {
					if (queryFunctorSort.name != "any") {
						verbOrRelationTerm = new TermTermAttribute(new Term(queryFunctorSort, [queryVariable]));
						queryTerms.push(verbOrRelationTerm);
					}
				} else {
					// Property-with-value:
					let property_with_value_functor_sort:Sort = this.getPropertyWithValueFunctorSort(queryFunctorSort, o);
					for(let querySubjectID of querySubjectID_l) {
						verbOrRelationTerm = new TermTermAttribute(new Term(property_with_value_functor_sort, [querySubjectID, queryVariable]));
						queryTerms.push(verbOrRelationTerm);
					}
				}
			} else {
				if (querySubjectID_l == null) {
					console.warn("specialfunction_derefQuery: case not considered, querySubjectID == null and queryLocationID != null!");
					return null;
				} else {
					for(let querySubjectID of querySubjectID_l) {
						verbOrRelationTerm = new TermTermAttribute(new Term(queryFunctorSort, [querySubjectID, queryLocationID, queryVariable]));
						queryTerms.push(verbOrRelationTerm);
					}
					if (otherRelations.indexOf(TermUsedForQueryLocationID) != -1) {
						otherRelations.splice(otherRelations.indexOf(TermUsedForQueryLocationID), 1);
					}
				}
			}
		}
		if ((myDeterminer != null || ourDeterminer != null) && queryFunctorSort != null &&
			!queryFunctorSort.is_a(o.getSort("property-with-value"))) {
			for(let querySubjectID of querySubjectID_l) {
				queryTerms.push(new TermTermAttribute(new Term(o.getSort("verb.own"), [querySubjectID, queryVariable])));
			}
		}
		if (yourDeterminer != null && queryFunctorSort != null &&
			!queryFunctorSort.is_a(o.getSort("property-with-value"))) {
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("verb.own"), [listenerVariable, queryVariable])));	
		}
		for(let adjective of adjectives) {
			if (adjective.is_a(o.getSort("property-with-value"))) {
				let property_with_value_functor_sort:Sort = this.getPropertyWithValueFunctorSort(adjective, o);
				if (adjective.is_a(o.getSort("role"))) {
					queryTerms.push(new TermTermAttribute(new Term(property_with_value_functor_sort, [queryVariable, queryLocationID, new ConstantTermAttribute(adjective.name, adjective)])));
				} else {
					queryTerms.push(new TermTermAttribute(new Term(property_with_value_functor_sort, [queryVariable, new ConstantTermAttribute(adjective.name, adjective)])));
				}
			} else {
				queryTerms.push(new TermTermAttribute(new Term(adjective,[queryVariable])));
			}
		}
		for(let adjective of negatedAdjectives) {
			if (adjective.is_a(o.getSort("property-with-value"))) {
				let property_with_value_functor_sort:Sort = this.getPropertyWithValueFunctorSort(adjective, o);
				if (adjective.is_a(o.getSort("role"))) {
					queryTerms.push(new TermTermAttribute(new Term(o.getSort("#not"),
										[new TermTermAttribute(new Term(property_with_value_functor_sort, [queryVariable, queryLocationID, new ConstantTermAttribute(adjective.name, adjective)]))])));
				} else {
					queryTerms.push(new TermTermAttribute(new Term(o.getSort("#not"),
										[new TermTermAttribute(new Term(property_with_value_functor_sort, [queryVariable, new ConstantTermAttribute(adjective.name, adjective)]))])));
				}
			} else {
				queryTerms.push(new TermTermAttribute(new Term(o.getSort("#not"),
										[new TermTermAttribute(new Term(adjective,[queryVariable]))])));
			}
		}
		for(let relation of otherRelations) {
//			console.log("considering relation: " + relation);
			let atts:TermAttribute[] = [];
			let negated:boolean = false;
			let found:boolean = false;
			if (relation.functor.name == "#not") {
				negated = true;
				relation = (<TermTermAttribute>(relation.attributes[0])).term;
			}
			for(let i:number = 0;i<relation.attributes.length;i++) {
				if (relation.attributes[i] == queryFunctor) {
					atts.push(queryVariable);
					found = true;
				} else {
					atts.push(relation.attributes[i]);
				}
			}
			if (found) {
				verbOrRelationTerm = new TermTermAttribute(new Term(relation.functor, atts));
				if (negated) {
					verbOrRelationTerm = new TermTermAttribute(new Term(o.getSort("#not"), [verbOrRelationTerm]));
				}
				queryTerms.push(verbOrRelationTerm);
			} else {
				console.log("specialfunction_derefQuery: otherRelation does not have queryFunctor ("+queryFunctor+") as a parameter: " + relation);
			}
		}
		for(let adverb of adverbs) {
			if (adverb.attributes.length > 0 &&
				adverb.attributes[0] instanceof ConstantTermAttribute) {
				let adverbString:string = (<ConstantTermAttribute>adverb.attributes[0]).value;
				if (adverbString == "space.here") {
					// find the location of the speaker:
					let hereEntity:NLContextEntity = context.findLocationOfID(context.speaker);
					if (hereEntity != null) {
						verbOrRelationTerm = new TermTermAttribute(new Term(o.getSort("space.at"),[queryVariable, hereEntity.objectID]));
						queryTerms.push(verbOrRelationTerm);
					}
				} else if (adverbString == "space.there") {
					// Find if there is a location we just talked about (and that is not the place where the speaker is):
					let hereEntity:NLContextEntity = context.findLocationOfID(context.speaker);
					let thereEntity:NLContextEntity = null;
					let entities_mpl:NLContextEntity[][] = context.findEntitiesOfSort(o.getSort("space.location"), o);
					let candidateThereEntities:NLContextEntity[] = context.applySingularTheDeterminer(entities_mpl);
					if (candidateThereEntities != null && candidateThereEntities.length == 1) thereEntity = candidateThereEntities[0];
					if (thereEntity != null && thereEntity != hereEntity) {
						verbOrRelationTerm = new TermTermAttribute(new Term(o.getSort("space.at"),[queryVariable, thereEntity.objectID]));
						queryTerms.push(verbOrRelationTerm);
					}
				}
			}
		}
		// we iterate twice over the adverbs, since the time-related ones have to be processed last:
		for(let adverb of adverbs) {
			if (adverb.attributes.length > 0 &&
				adverb.attributes[0] instanceof ConstantTermAttribute) {
				let adverbString:string = (<ConstantTermAttribute>adverb.attributes[0]).value;
				if (adverbString == "time.past") {
					if (verbOrRelationTerm != null) {
						queryTerms.push(new TermTermAttribute(new Term(o.getSort("time.past"),[verbOrRelationTerm])));					
					} else {
						// we have a time adverb, but we don't know what to qualify with it!
						return null;
					}
				} else if (adverbString == "time.future") {
					if (verbOrRelationTerm != null) {
						queryTerms.push(new TermTermAttribute(new Term(o.getSort("time.future"),[verbOrRelationTerm])));					
					} else {
						// we have a time adverb, but we don't know what to qualify with it!
						return null;
					}
				}
			}
		}
		/*
		if (properNounTerm != null && o.getSort("#id").is_a(queryVariable.sort)) {
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("name"),[queryVariable,properNounTerm.attributes[0]])));
		}
		*/
		// list of entities for which we have added a not(queryVariable == entity) term:
		let nottedEntities:string[] = [];
		if (elsePresent) {
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("!="), [queryVariable, new ConstantTermAttribute(context.speaker , o.getSort("#id"))])));
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("!="), [queryVariable, new ConstantTermAttribute(context.ai.selfID , o.getSort("#id"))])));
			nottedEntities.push(context.speaker);
			nottedEntities.push(context.ai.selfID);
		}
		if (otherDeterminerPresent && queryFunctorSort!=null) {
			// Find the entities that the expression could be referring to, and exclude them ("other"):
			let entities_mpl:NLContextEntity[][] = context.findEntitiesOfSort(queryFunctorSort, o);
			if (entities_mpl != null) {
				// exclude the ones in mentions and in short term memory:
				for(let e of entities_mpl[0]) {
					let stringID:string = (<ConstantTermAttribute>(e.objectID)).value;
					if (nottedEntities.indexOf(stringID) == -1) {
						queryTerms.push(new TermTermAttribute(new Term(o.getSort("!="), [queryVariable, e.objectID])));
						nottedEntities.push(stringID);
					}
				}
				for(let e of entities_mpl[1]) {
					let stringID:string = (<ConstantTermAttribute>(e.objectID)).value;
					if (nottedEntities.indexOf(stringID) == -1) {
						queryTerms.push(new TermTermAttribute(new Term(o.getSort("!="), [queryVariable, e.objectID])));
						nottedEntities.push(stringID);
					}
				}
			}
		}
		if (queryTerms.length == 0) {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
		queryTerm = NLParser.constructList(queryTerms, o.getSort("#and"));

//		console.log("queryFunctorSort: " + queryFunctorSort);
//		console.log("queryTerms: " + queryTerms);
//		console.log("queryTerm: " + queryTerm);

		if (queryTerm == null) {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

		let bindings2:Bindings = new Bindings();
		if (!Term.unifyAttribute(query, queryTerm, true, bindings2)) {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
		let bindings3:Bindings = parse.bindings.concat(bindings2);
		let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, bindings3, 
													 parse.derefs.concat([new Term(o.getSort("#derefQuery"), [clause, queryVariable.applyBindings(bindings3), query.applyBindings(bindings3)])]), 
													 parse.ruleNames, parse.priorities);
		return [parse2];
	}


	specialfunction_symbolToSort(parse:NLParseRecord, symbol:TermAttribute, sort:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		if (symbol instanceof ConstantTermAttribute) {
			let symbol_v:string = (<ConstantTermAttribute>symbol).value;
//			let symbol_s:Sort = symbol.sort;
//			if (symbol_s.is_a(o.getSort("symbol"))) {
				let s:Sort = o.getSort(symbol_v);
				if (s == null) return null;
				let sAtt:TermAttribute = new VariableTermAttribute(s, null);
		
				let bindings:Bindings = new Bindings();
				if (!Term.unifyAttribute(sort, sAtt, true, bindings)) {
					return null;
				}
				let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities);
				return [parse2];
//			} else {
//				return null;
//			}
		} else {
			return null;
		}
	}


	specialfunction_subsumes(parse:NLParseRecord, sortAtt:TermAttribute, att:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		if (sortAtt instanceof VariableTermAttribute) {
			let s:Sort = sortAtt.sort
			if (att.sort.is_a(s)) return [parse];
		}
		return null;
	}


	specialfunction_doesnotsubsume(parse:NLParseRecord, sortAtt:TermAttribute, att:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		if (sortAtt instanceof VariableTermAttribute) {
			let s:Sort = sortAtt.sort
			if (!att.sort.is_a(s)) return [parse];
		}
		return null;
	}


	specialfunction_notequal(parse:NLParseRecord, att1:TermAttribute, att2:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		if (att1 instanceof VariableTermAttribute) {
			if (att1.sort != att2.sort) return [parse];
			if ((<VariableTermAttribute>att1).name != (<VariableTermAttribute>att2).name) return [parse];
		} else if (att1 instanceof ConstantTermAttribute) {
			if (att1.sort != att2.sort) return [parse];
			if ((<ConstantTermAttribute>att1).value != (<ConstantTermAttribute>att2).value) return [parse];
		} else {
			console.error("#notequal among terms not yet supported!");
			return null;
		}
		return null;
	}


	specialfunction_sortParent(parse:NLParseRecord, sortAtt:TermAttribute, att:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		let sort:Sort = sortAtt.sort;
		let parses:NLParseRecord[] = [];
		if (sortAtt instanceof ConstantTermAttribute) {
			for(let parent of sort.parents) {
				if (parent.is_a(att.sort)) {
					let output:ConstantTermAttribute = new ConstantTermAttribute(parent.name, parent);		
					let bindings:Bindings = new Bindings();
					if (Term.unifyAttribute(att, output, true, bindings)) {
						let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities);
						parses.push(parse2);
					}
				}
			}
		} else if (sortAtt instanceof VariableTermAttribute) {
			for(let parent of sort.parents) {
				if (parent.is_a(att.sort)) {
					let output:VariableTermAttribute = new VariableTermAttribute(parent, null);
					let bindings:Bindings = new Bindings();
					if (Term.unifyAttribute(att, output, true, bindings)) {
						let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities);
						parses.push(parse2);
					}
				}
			}
		} else {
			return null;
		}
		return parses;
	}


	specialfunction_concatenateSymbols(parse:NLParseRecord, args:TermAttribute[], o:Ontology) : NLParseRecord[]
	{
		let concatenation:string = "";
		for(let i:number = 0;i<args.length-1;i++) {
			if (args[i] instanceof ConstantTermAttribute) {
				concatenation += (<ConstantTermAttribute>(args[i])).value;
			} else {
				return null;
			}
		}

		let bindings:Bindings = new Bindings();
		if (!Term.unifyAttribute(args[args.length-1], new ConstantTermAttribute(concatenation, o.getSort("symbol")), true, bindings)) {
			return null;
		}
		let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities);
		return [parse2];
	}


	specialfunction_completeVerbArgumentsFromContext(parse:NLParseRecord, verb:TermAttribute, output:TermAttribute, context:NLContext, o:Ontology) : NLParseRecord[]
	{
		this.lastDerefErrorType = 0;
		if (!(verb instanceof TermTermAttribute)) {
			console.log("specialfunction_completeVerbArgumentsFromContext: trying to complete a verb that is not a term! " + verb);
			this.lastDerefErrorType = DEREF_ERROR_VERB_COMPLETION;
			return null;
		}

		let term2:Term = (<TermTermAttribute>verb).term.applyBindings(parse.bindings);
		let result_l:TermAttribute[] = context.completeVerbArgumentsFromContext(term2, output, o);

//		console.log("specialfunction_derefFromContext result: " + result);

		if (result_l == null || result_l.length == 0) {
			this.lastDerefErrorType = context.lastDerefErrorType;
			return null;
		}

		let result:TermAttribute = result_l[0];
		for(let i:number = 1;i<result_l.length;i++) {
			let tmp:Term = new Term(o.getSort("#list"), [result_l[i], result]);
			result = new TermTermAttribute(tmp);
		}

		let bindings2:Bindings = new Bindings();
		if (Term.unifyAttribute(output, result, true, bindings2)) {
			let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings.concat(bindings2), parse.derefs, parse.ruleNames, parse.priorities);
			return [parse2];
		} else {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
	}


	specialfunction_changeConstantSort(parse:NLParseRecord, args:TermAttribute[], o:Ontology) : NLParseRecord[]
	{
		if (args.length != 3) return null;
		if (!(args[0] instanceof ConstantTermAttribute)) return null;
		let newValue:TermAttribute = new ConstantTermAttribute((<ConstantTermAttribute>args[0]).value, args[1].sort);

		let bindings:Bindings = new Bindings();
		if (!Term.unifyAttribute(args[2], newValue, true, bindings)) return null;
		let parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities);
		return [parse2];
	}


	specialfunction_token(parse:NLParseRecord, arg:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		if (parse.nextTokens == null) return null;
		let parses:NLParseRecord[] = [];
		for(let nextToken of parse.nextTokens) {
			if (nextToken.token == null) {
				let parses2:NLParseRecord[] = this.specialfunction_token(new NLParseRecord(nextToken.next, parse.previousPOS, parse.bindings, parse.derefs, parse.ruleNames, parse.priorities), arg, o);
				if (parses2 != null) parses = parses.concat(parses2);
			} else {
				let newValue:TermAttribute = new ConstantTermAttribute(nextToken.token, o.getSort("symbol"));
				let bindings:Bindings = new Bindings();
				if (!Term.unifyAttribute(arg, newValue, true, bindings)) return null;
				parses.push(new NLParseRecord(nextToken.next, parse.previousPOS, parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities));
			}
		}
		if (parses.length == 0) return null;
		return parses;
	}	


	specialfunction_findLastNoun(parse:NLParseRecord, arg:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		let noun:PartOfSpeech = null;
		for(let pos of parse.previousPOS) {
			if (pos.term.functor.name == "noun") {
				noun = pos;
			}
		}
		if (noun != null) {
			let bindings:Bindings = new Bindings();
			if (!Term.unifyAttribute(arg, new TermTermAttribute(noun.term), true, bindings)) return null;
			return [new NLParseRecord(parse.nextTokens, parse.previousPOS, parse.bindings.concat(bindings), parse.derefs, parse.ruleNames, parse.priorities)];
		}
		return null;
	}	


	clone(map:[TermAttribute,TermAttribute][]) : NLPattern
	{
		switch(this.type) {
			case NLPATTERN_STRING:
				return this;	// this is a constant, no need to clone

			case NLPATTERN_SEQUENCE:
			case NLPATTERN_ALTERNATIVE:
			case NLPATTERN_OPTIONAL:
			case NLPATTERN_REPEAT:
				{
					let children:NLPattern[] = [];
					for(let c of this.children) {
						children.push(c.clone(map));
					}
					let p:NLPattern = new NLPattern(this.type);
					p.children = children;
					return p;
				}

			case NLPATTERN_POS:
			case NLPATTERN_PATTERN:
			case NLPATTERN_FUNCTION:
				{
					let p:NLPattern = new NLPattern(this.type);
					p.term = this.term.clone(map);
					return p;
				}

			default:
				console.error("NLPattern.clone: pattern type not supported " + this.type);
				return null;
		}
	}


	static fromString(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : NLPattern
	{
		// start assuming it is a sequence. Tokenize the string into the elements of the sequence, and then parse each of them:
		let parentheses:number = 0;
		let squareBrackets:number = 0;
		let inquote:boolean = false;
		let elementStrings:string[] = [];
		let tmp:string = "";

		for(let i:number = 0; i<str.length; i++) {
			let c:string = str.charAt(i);
			if (inquote) {
				if (c == '\'') {
					inquote = false;
					if (tmp.length > 0 && tmp[tmp.length-1] == '\\') inquote = true;
				}
				tmp += c;
			} else {
				if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
					if (!inquote && parentheses == 0 && squareBrackets == 0 && tmp.length > 0) {
						// we have an element!
						tmp = tmp.trim();
						if (tmp.length>0) {
//							tmp = tmp.replace("\\","");	// just for this case "\'s"
							elementStrings.push(tmp);
//							console.log("Element: " + tmp + " (length: " + tmp.length + ")");
							tmp = "";
						}
					} else {
						tmp += c;
					}
				} else {
					if (c=='(') parentheses++;
					if (c==')') parentheses--;
					if (c=='[') squareBrackets++;
					if (c==']') squareBrackets--;
					if (c=='\'') inquote = true;

					tmp += c;
				}
			}
		}

		if (inquote) {
			console.error("Unclosed quotation while parsing NLPattern: " + str);
			return null;
		}
		if (parentheses > 0) {
			console.error("Unclosed parenthesis while parsing NLPattern: " + str);
			return null;
		}
		if (squareBrackets > 0) {
			console.error("Unclosed square brackets while parsing NLPattern: " + str);
			return null;
		}

		if (!inquote && parentheses == 0 && squareBrackets == 0 && tmp.length > 0) {
			// we have an element!
			tmp = tmp.trim();
			if (tmp.length>0) {
//				tmp = tmp.replace("\\","");	// just for this case "\'s"
				elementStrings.push(tmp);
//				console.log("Element: " + tmp);
			}
		}

//		console.log("str: " + str + "  -->>  " + elementStrings);

		if (elementStrings.length > 1) {
			// it is a sequence:
			let patterns:NLPattern[] = [];
			for(let patternString of elementStrings) {
				let pattern:NLPattern = NLPattern.fromString(patternString, o, variableNames, variableValues);
				if (pattern == null) {
					console.error("NLPattern.fromString: cannot parse string " + patternString);
					return null;
				}
				patterns.push(pattern);
			}
			let p:NLPattern = new NLPattern(NLPATTERN_SEQUENCE);
			p.children = patterns;

			return p;
		} else {
			let patternString:string = elementStrings[0];
			let repeat:boolean = false;
			let pattern:NLPattern = null;
			if (patternString.charAt(patternString.length-1) == '*') {
				repeat = true;
				patternString = patternString.substring(0,patternString.length-1);
			}
			let c:string = patternString.charAt(0);
			if (c == '(') pattern = NLPattern.fromStringAlternative(patternString, o, variableNames, variableValues);
			if (c == '[') pattern = NLPattern.fromStringOptional(patternString, o, variableNames, variableValues);
			if (c == '\'') pattern = NLPattern.fromStringString(patternString, o, variableNames, variableValues);
			if ((c >= 'a' && c < 'z') || 
				(c >= 'A' && c < 'Z') ||
				c == '#') pattern = NLPattern.fromStringTerm(patternString, o, variableNames, variableValues);

			if (pattern != null) {
				if (repeat) {
					let pattern2:NLPattern = new NLPattern(NLPATTERN_REPEAT);
					pattern2.children = [pattern];
					return pattern2;
				} else {
					return pattern;
				}
			}

			console.error("NLPattern.fromString: cannor parse string " + patternString);
			return null;
		}
	}


	static fromStringAlternative(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : NLPattern
	{
		if (str.charAt(0) != '(' ||
			str.charAt(str.length-1) != ')') {
			console.error("NLPattern.fromStringAlternative: string does not start and end with parentheses!");
			return null;
		}

		str = str.substring(1, str.length-1);

		let parentheses:number = 0;
		let squareBrackets:number = 0;
		let inquote:boolean = false;
		let elementStrings:string[] = [];
		let tmp:string = "";

		for(let i:number = 0; i<str.length; i++) {
			let c:string = str.charAt(i);
			if (inquote) {
				if (c == '\'') {
					inquote = false;
					if (tmp.length > 0 && tmp[tmp.length-1] == '\\') inquote = true;
				}
				tmp += c;
			} else {
				if (c == '|' && !inquote && parentheses == 0 && squareBrackets == 0) {
					// we have an element!
					tmp = tmp.trim();
					if (tmp.length>0) {
						elementStrings.push(tmp);
//						console.log("alternative element: " + tmp);
						tmp = "";
					} else {
						console.error("NLPattern.fromStringAlternative: empty alternative parsing " + str);
						return null;
					}
				} else {
					if (c=='(') parentheses++;
					if (c==')') parentheses--;
					if (c=='[') squareBrackets++;
					if (c==']') squareBrackets--;
					if (c=='\'') inquote = true;

					tmp += c;
				}
			}
		}
		if (!inquote && parentheses == 0 && squareBrackets == 0 && tmp.length > 0) {
			// we have an element!
			tmp = tmp.trim();
			if (tmp.length>0) {
				elementStrings.push(tmp);
//				console.log("alternative element: " + tmp);
			} else {
				console.error("NLPattern.fromStringAlternative: empty last alternative parsing " + str);
				return null;
			}
		} else {
			console.error("NLPattern.fromStringAlternative: empty last alternative parsing " + str);
			return null;
		}

		if (elementStrings.length > 1) {
			let patterns:NLPattern[] = [];
			for(let patternString of elementStrings) {
				let pattern:NLPattern = NLPattern.fromString(patternString, o, variableNames, variableValues);
				if (pattern == null) {
					console.error("NLPattern.fromString: cannot parse string " + patternString);
					return null;
				}
				patterns.push(pattern);
			}

			let p:NLPattern = new NLPattern(NLPATTERN_ALTERNATIVE);
			p.children = patterns;

			return p;
		} else {
			// this is an alternative with only one option (a parenthesis), so, just do a recursive call:
			return NLPattern.fromString(str, o, variableNames, variableValues);
		}
	}


	static fromStringOptional(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : NLPattern
	{
		if (str.charAt(0) != '[' ||
			str.charAt(str.length-1) != ']') {
			console.error("NLPattern.fromStringOptional: string does not start and end with square brackets!");
			return null;
		}

		str = str.substring(1, str.length-1);
		let pattern:NLPattern = NLPattern.fromString(str, o, variableNames, variableValues);
		if (pattern == null) return null;

		let p:NLPattern = new NLPattern(NLPATTERN_OPTIONAL);
		p.children = [pattern];
		return p;
	}


	static fromStringString(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : NLPattern
	{
		if (str.charAt(0) != '\'' ||
			str.charAt(str.length-1) != '\'') {
			console.error("NLPattern.fromStringString: string does not start and end with quotes!");
			return null;
		}

		str = str.replace("\\","");	// just for this case "\'s"
		str = str.substring(1, str.length-1);

		let p:NLPattern = new NLPattern(NLPATTERN_STRING);
		p.string = str;
		return p;
	}


	static fromStringTerm(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : NLPattern
	{
		let term:Term = Term.fromStringInternal(str, o, variableNames, variableValues).term;

		if (term == null) return null;

		// check if it's a POS, a pattern or a special function:
		let posSort:Sort = o.getSort("part-of-speech");
		let specialFunctionSort:Sort = o.getSort("parser-function");
		if (posSort.subsumes(term.functor)) {
			// POS:
			let p:NLPattern = new NLPattern(NLPATTERN_POS);
			p.term = term;
			return p;
		} else if (specialFunctionSort.subsumes(term.functor)) {
			// Special function:
			let p:NLPattern = new NLPattern(NLPATTERN_FUNCTION);
			p.term = term;
			return p;
		} else {
			// sub pattern
			let p:NLPattern = new NLPattern(NLPATTERN_PATTERN);
			p.term = term;
			return p;
		}
	}


	toStringWithoutChildren() : string
	{
		if (this.string != null) return "'" + this.string + "'";
		if (this.term != null) return this.term.toString();
		return null;
	}


	toString() : string
	{
		return this.toStringInternal([], []);
	}


	toStringInternal(variables:TermAttribute[], variableNames:string[]) : string
	{
		switch(this.type) {
			case NLPATTERN_SEQUENCE:
				{
					let out:string = "";
					for(let i:number = 0;i<this.children.length;i++) {
						let child:NLPattern = this.children[i];
						if (i!=0) out += " ";
						out += child.toStringInternal(variables, variableNames);
					}
					return out;
				}

			case NLPATTERN_ALTERNATIVE:
				{
					let out:string = "(";
					for(let i:number = 0;i<this.children.length;i++) {
						let child:NLPattern = this.children[i];
						if (i!=0) out += "|";
						out += child.toStringInternal(variables, variableNames);
					}
					return out + ")";
				}

			case NLPATTERN_OPTIONAL:
				return "[" + this.children[0].toStringInternal(variables, variableNames) + "]";

			case NLPATTERN_REPEAT:
				return this.children[0].toStringInternal(variables, variableNames) + "*";

			case NLPATTERN_STRING:
				return "'" + this.string + "'";

			case NLPATTERN_POS:
				return this.term.toStringInternal(variables, variableNames);

			case NLPATTERN_PATTERN:
			case NLPATTERN_FUNCTION:
				return this.term.toStringInternal(variables, variableNames);

//			case NLPATTERN_NONE:
			default:
				console.error("A pattern has type NLPATTERN_NONE!");
				return "";
		}
	}


	type:number = NLPATTERN_NONE;

	string:string = null;
	term:Term = null;	// this is used for POS, recursive patterns and special functions
	children:NLPattern[] = null;	// this is used for sequence. alternative, optional or repeat

	lastDerefErrorType:number = 0;
}
