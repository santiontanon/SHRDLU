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
				var parses2:NLParseRecord[] = [parse];
				for(let pattern of this.children) {
					var newParses:NLParseRecord[] = [];
					for(let parse2 of parses2) {
						var parses3:NLParseRecord[] = pattern.parse(parse2, context, rule, parser, AI);
						if (parses3 != null) newParses = newParses.concat(parses3);
					}
					parses2 = newParses;
					if (parses2.length == 0) return null;
				}
				return parses2;

			case NLPATTERN_ALTERNATIVE:
				var parses_a:NLParseRecord[] = [];
				//console.log("alternative with " + this.children.length + " children");
				for(let pattern of this.children) {
					var parses2_a:NLParseRecord[] = pattern.parse(parse, context, rule, parser, AI);
					//console.log("    " + parses2_a.length + " parses");
					if (parses2_a != null) parses_a = parses_a.concat(parses2_a);
				}
				if (parses_a.length == 0) return null;
				return parses_a;

			case NLPATTERN_OPTIONAL:
				// concat the current parse (which ignores the optional part), with the pares resulting from forcing it
				var parses:NLParseRecord[] = this.children[0].parse(parse, context, rule, parser, AI);
//				console.log("Results of optional: " + parses);
				if (parses == null) return [parse];
				return [parse].concat(parses);
		
			case NLPATTERN_REPEAT:
				var parses2_r:NLParseRecord[] = [parse];	// 0 repetitions is also allowed, that's why
															// we initialize the list of results with the current parse.
				var parses2_r_last:NLParseRecord[] = [parse];
				var newParses:NLParseRecord[];
				do{
					newParses = [];
					for(let parse2_r of parses2_r_last) {
						var parses3_r:NLParseRecord[] = this.children[0].parse(parse2_r, context, rule, parser, AI);
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
		var parses:NLParseRecord[] = [];
		for(let nextToken of parse.nextTokens) {
			if (nextToken.token == null) {
				var parses2:NLParseRecord[] = this.parseString(new NLParseRecord(nextToken.next, parse.bindings, parse.ruleNames, parse.priorities), context, rule, parser, AI);
				if (parses2 != null) parses = parses.concat(parses2);
			} else if (nextToken.token == this.string) {
				// match!
				parses.push(new NLParseRecord(nextToken.next, parse.bindings, parse.ruleNames, parse.priorities));
			}
		}
		if (parses.length == 0) return null;
		return parses;
	}


	parsePOS(parse:NLParseRecord, context:NLContext, rule:NLPatternContainer, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		var parses:NLParseRecord[] = [];
		var term2:Term = this.term.applyBindings(parse.bindings);
//				console.log("Matching POS, before: " + this.term.toString() + "\n  bindings: " + parse.bindings + "\n  Matching POS, after: " + term2.toString());
		for(let nextToken of parse.nextTokens) {
			if (nextToken.token == null) {
				var parses2:NLParseRecord[] = this.parsePOS(new NLParseRecord(nextToken.next, parse.bindings, parse.ruleNames, parse.priorities), context, rule, parser, AI);
				if (parses2 != null) parses = parses.concat(parses2);
			} else {
//						console.log("Matching POS "+term2.toString()+" with: " + nextToken.token);
				for(let POS of nextToken.POS) {
					var bindings:Bindings = new Bindings();
					if (POS.term.unify(term2, true, bindings)) {
						var newParse:NLParseRecord = new NLParseRecord(nextToken.next, parse.bindings.concat(bindings), parse.ruleNames, parse.priorities); 
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
		var parses_p:NLParseRecord[] = [];
		var term2:Term = this.term.applyBindings(parse.bindings);
//				console.log("Matching pattern: " + term2.toString());

		var compiled:CompiledNLPatternRules = parser.compiledRules[term2.functor.name];
		if (compiled != null) {
			// if we have a compiled tree, use it!
//			console.log("NLPattern.parsePattern: Found a compiled tree for " + term2.functor.name + " ...");
			var results:NLParseRecord[] = compiled.parseMatchingWithTerm(new NLParseRecord(parse.nextTokens, parse.bindings, parse.ruleNames, parse.priorities), false, context, parser, AI, term2);
			for(let pr of results) {
				var bindings2:Bindings = new Bindings();
				if (!pr.result.unify(term2, true, bindings2)) {
					console.error("NLPattern.parsePattern: something went wrong when parsing pattern " + term2.toString() + "\n  It does not unify with: " + pr.result);
					return null;
				}
				// we continue from "pr", but using the bdingins from "parse", since the bindings
				// generated during the parsing of the sub-pattern are not relevant
				var pr2:NLParseRecord = new NLParseRecord(pr.nextTokens, parse.bindings.concat(bindings2), pr.ruleNames.concat(parse.ruleNames), pr.priorities.concat(parse.priorities));
				pr2.result = pr.result;
				parses_p.push(pr2);				
			}
		} else {
			console.log("NLPattern.parsePattern: Using the raw rules for " + term2.functor.name + " ...");
			for(let rawRule2 of parser.rules) {
				var rule2:NLPatternRule = rawRule2.clone();
				var bindings:Bindings = new Bindings();
				if (rule2.head.unify(term2, true, bindings)) {
					// rule to consider!!
	//						console.log("  considering rule with head: " + rule2.head.toString() + "\n  new bindings: " + bindings);
					var results:NLParseRecord[] = rule2.parseWithBindings(new NLParseRecord(parse.nextTokens, parse.bindings.concat(bindings), parse.ruleNames, parse.priorities), false, context, parser, AI);

					for(let pr of results) {
	//							console.log("Pattern matched successfully with result: " + t.toString());
						var bindings2:Bindings = new Bindings();
						if (!pr.result.unify(term2, true, bindings2)) {
							console.error("NLPattern.parsePattern: something went wrong when parsing pattern " + term2.toString() + "\n  It does not unify with: " + pr.result);
							return null;
						}
						// we continue from "pr", but using the bdingins from "parse", since the bindings
						// generated during the parsing of the sub-pattern are not relevant
						parses_p.push(new NLParseRecord(pr.nextTokens, parse.bindings.concat(bindings2), pr.ruleNames.concat(parse.ruleNames), pr.priorities.concat(parse.priorities)));
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
			var term2:Term = this.term.applyBindings(parse.bindings);
			var  nlprl:NLParseRecord[] = this.specialfunction_derefFromContext(parse, term2.attributes[0], term2.attributes[1], context, rule.listenerVariable, parser.o, parser.posParser, AI);
			if (nlprl == null) {
				var nlper:NLDerefErrorRecord = new NLDerefErrorRecord(context.lastDerefErrorType, parse.tokensLeftToParse());
				nlper.derefFromContextErrors.push(term2.attributes[0]);
				rule.lastDerefErrors.push(nlper)
			}
			return nlprl;
		} else if (this.term.functor.name == "#derefUniversal") {
			var term2:Term = this.term.applyBindings(parse.bindings);
			var  nlprl:NLParseRecord[] = this.specialfunction_derefUniversal(parse, term2.attributes[0], term2.attributes[1], term2.attributes[2], parser.o);
			if (nlprl == null) {
				var nlper:NLDerefErrorRecord = new NLDerefErrorRecord(this.lastDerefErrorType, parse.tokensLeftToParse());
				nlper.derefUniversalErrors.push(term2.attributes[0]);
				rule.lastDerefErrors.push(nlper)
			}
			return nlprl;
		} else if (this.term.functor.name == "#derefHypothetical") {
			var term2:Term = this.term.applyBindings(parse.bindings);
			var  nlprl:NLParseRecord[] = this.specialfunction_derefHypothetical(parse, term2.attributes[0], term2.attributes[1], term2.attributes[2], context, rule.listenerVariable, parser.o, parser.posParser, AI);
			if (nlprl == null) {
				var nlper:NLDerefErrorRecord = new NLDerefErrorRecord(this.lastDerefErrorType, parse.tokensLeftToParse());
				nlper.derefHypotheticalErrors.push(term2.attributes[0]);
				rule.lastDerefErrors.push(nlper)
			}
			return nlprl;
		} else if (this.term.functor.name == "#derefQuery") {
			var term2:Term = this.term.applyBindings(parse.bindings);
			var  nlprl:NLParseRecord[] = this.specialfunction_derefQuery(parse, term2.attributes[0], term2.attributes[1], term2.attributes[2], context, rule.listenerVariable, parser.o, parser.posParser, AI);
			if (nlprl == null) {
				var nlper:NLDerefErrorRecord = new NLDerefErrorRecord(this.lastDerefErrorType, parse.tokensLeftToParse());
				nlper.derefQueryErrors.push(term2.attributes[0]);
				rule.lastDerefErrors.push(nlper)
			}
			return nlprl;
		} else if (this.term.functor.name == "#symbolToSort") {
			var term2:Term = this.term.applyBindings(parse.bindings);
			var  nlprl:NLParseRecord[] = this.specialfunction_symbolToSort(parse, term2.attributes[0], term2.attributes[1], parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#subsumes") {
			var term2:Term = this.term.applyBindings(parse.bindings);
			var  nlprl:NLParseRecord[] = this.specialfunction_subsumes(parse, term2.attributes[0], term2.attributes[1], parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#concatenateSymbols") {
			var term2:Term = this.term.applyBindings(parse.bindings);
			var  nlprl:NLParseRecord[] = this.specialfunction_concatenateSymbols(parse, term2.attributes, parser.o);
			return nlprl;
		} else if (this.term.functor.name == "#completeVerbArgumentsFromContext" && this.term.attributes.length == 2) {
			var term2:Term = this.term.applyBindings(parse.bindings);
			var  nlprl:NLParseRecord[] = this.specialfunction_completeVerbArgumentsFromContext(parse, this.term.attributes[0], this.term.attributes[1], context, parser.o);
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

		var result_l:TermAttribute[] = context.deref((<TermTermAttribute>clause).term, listenerVariable, o, pos, AI);

//		console.log("specialfunction_derefFromContext result: " + result);

		if (result_l == null || result_l.length == 0) {
			this.lastDerefErrorType = context.lastDerefErrorType;
			return null;
		}

		var result:TermAttribute = result_l[0];
		for(let i:number = 1;i<result_l.length;i++) {
			var tmp:Term = new Term(o.getSort("#list"), [result_l[i], result]);
			result = new TermTermAttribute(tmp);
		}

		var bindings2:Bindings = new Bindings();
		if (Term.unifyAttribute(output, result, true, bindings2)) {
			var parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.bindings.concat(bindings2), parse.ruleNames, parse.priorities);
			return [parse2];
		} else {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
	}


	specialfunction_derefUniversal(parse:NLParseRecord, clause:TermAttribute, outputVariable:TermAttribute, output:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		this.lastDerefErrorType = 0;
		var nounSort:Sort = o.getSort("noun");
		var properNounSort:Sort = o.getSort("proper-noun");
		var personalPronounSort:Sort = o.getSort("personal-pronoun");
		var determinerSort:Sort = o.getSort("determiner");
		var adjectiveSort:Sort = o.getSort("adjective");
		var result:Term = null;

		if (!(clause instanceof TermTermAttribute)) {
			console.log("specialfunction_derefUniversal: trying to dereference a clause that is not a term! " + clause);
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

		var all_found:boolean = false;
		for(let tmp of NLParser.elementsInList((<TermTermAttribute>clause).term, "#and")) {
			if (tmp instanceof TermTermAttribute) {
				var tmp2:Term = (<TermTermAttribute>tmp).term;
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
						var resultTmp:Term = new Term(o.getSort((<ConstantTermAttribute>tmp2.attributes[0]).value),
										  			  [outputVariable]);
					if (result == null) {
						result = resultTmp;
					} else {
						result = new Term(o.getSort("#and"), [new TermTermAttribute(resultTmp), 
															  new TermTermAttribute(result)]);

					}
				} else if (tmp2.functor.is_a(adjectiveSort) &&
						   tmp2.attributes[1] instanceof ConstantTermAttribute) {
						var propertySort:Sort = o.getSort((<ConstantTermAttribute>tmp2.attributes[1]).value);
						var resultTmp:Term = null;
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
		
		var bindings2:Bindings = new Bindings();
		var resultAtt:TermTermAttribute = new TermTermAttribute(result);
		if (Term.unifyAttribute(output, resultAtt, true, bindings2)) {
			var parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.bindings.concat(bindings2), parse.ruleNames, parse.priorities);
			return [parse2];
		} else {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
	}	


	specialfunction_derefHypothetical(parse:NLParseRecord, clause:TermAttribute, outputVariable:TermAttribute, output:TermAttribute, context:NLContext, listenerVariable:TermAttribute, o:Ontology, pos:POSParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		this.lastDerefErrorType = 0;
		var properNounSort:Sort = o.getSort("proper-noun");
		var nounSort:Sort = o.getSort("noun");
		var determinerSort:Sort = o.getSort("determiner");
		var relationSort:Sort = o.getSort("relation");
		var indefiniteArticleSort:Sort = o.getSort("indefinite-article");
//		var adjectiveSort:Sort = o.getSort("adjective");
		var result:Term = null;
//		var foundIndefiniteArticle:boolean = false;
		var hadName:boolean = false;	// if there is a name for the new hypothetical, then we need to generate an ID for it
		var outputVariableSort:Sort = null;

		if (!(clause instanceof TermTermAttribute)) {
			console.log("specialfunction_derefHypothetical: trying to dereference a clause that is not a term! " + clause);
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

//		console.log("specialfunction_derefHypothetical: " + clause);

		// if we can dereference the expression in the context, then this function should not apply:
		var contextDerefResult:TermAttribute[] = context.deref((<TermTermAttribute>clause).term, listenerVariable, o, pos, AI);
		if (contextDerefResult != null && contextDerefResult.length>0) {
//			console.log("specialfunction_derefHypothetical: context.deref succeeded! " + contextDerefResult);
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}

//		console.log("specialfunction_derefHypothetical: context.deref failed");

		var clauses:TermAttribute[] =  NLParser.elementsInList((<TermTermAttribute>clause).term, "#and");

		for(let tmp of clauses) {
			if (tmp instanceof TermTermAttribute) {
				var tmp2:Term = (<TermTermAttribute>tmp).term;
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
				var tmp2:Term = (<TermTermAttribute>tmp).term;
				if (tmp2.functor.is_a(properNounSort)) {
					hadName = true;		
					var resultTmp:Term = new Term(o.getSort("name"),
									  			  [outputVariable, tmp2.attributes[0]]);
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
						var resultTmp:Term = new Term(o.getSort((<ConstantTermAttribute>(tmp2.attributes[0])).value),
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
		
		var bindings2:Bindings = new Bindings();
		if (hadName) {
			var outputVariableID:ConstantTermAttribute = new ConstantTermAttribute(context.newHypotheticalID(), o.getSort("#id"));
	//		console.log("outputVariable: " + outputVariable);
	//		console.log("outputVariableID: " + outputVariableID);
			if (!Term.unifyAttribute(outputVariable, outputVariableID, true, bindings2)) return null;
		} else if (outputVariableSort != null) {
			var outputVariableID:ConstantTermAttribute = new ConstantTermAttribute(outputVariableSort.name, outputVariableSort);
	//		console.log("outputVariable: " + outputVariable);
	//		console.log("outputVariableID: " + outputVariableID);
			if (!Term.unifyAttribute(outputVariable, outputVariableID, true, bindings2)) return null;
		}

		var resultAtt:TermTermAttribute = new TermTermAttribute(result);
		if (!Term.unifyAttribute(output, resultAtt, true, bindings2)) return null;

		var parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.bindings.concat(bindings2), parse.ruleNames, parse.priorities);
		return [parse2];
	}	


	/*
	Examples:
		#and(V0:determiner.my(V1:'name'[#id], V2:[singular]), V3:noun(V1, V2)		->		name(context.selfID, queryVariable)
		#and(V0:determiner.your(V1:'name'[#id], V2:[singular]), V3:noun(V1, V2))		->		name(listenerVariable, queryVariable)
		#and(V0:relation.owns(V1:'ship'[#id], V2:'name'[#id]), V3:#and(V4:noun(V2, V5:[singular]), V6:#and(V7:the(V1, V8:[singular]), V9:noun(V1, V8))))
				-> if there is a "relation.owns", separate in two:
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
//		console.log("specialfunction_derefQuery: clause = " + clause);
//		console.log("specialfunction_derefQuery: queryVariable = " + queryVariable);
//		console.log("specialfunction_derefQuery: query = " + query);
//		console.log("specialfunction_derefQuery: context.ai.selfID = " + context.ai.selfID);
		var queryTerm:TermAttribute = null;
		var terms:TermAttribute[] = NLParser.elementsInList((<TermTermAttribute>clause).term, "#and");
		var myDeterminer:Term = null;
		var yourDeterminer:Term = null;
		var definiteArticle:Term = null;
		var aDeterminer:Term = null;
		var indefinitePronoun:Term = null;
		var ownsRelation:Term = null;
		var otherRelations:Term[] = [];
		var nounTerm:Term = null;
		var properNounTerm:Term = null;	
		var adverbs:Term[] = [];
		var adjectives:Sort[] = [];	// adjectives are filled later, since we neeed queryFunctor
		var demonstrativeDeterminer:Term = null;
		var demonstrativePronoun:Term = null;
		var otherTerms:Term[] = [];
		var elsePresent:boolean = false;
		var otherDeterminerPresent:boolean = false;
		for(let t of terms) {
			if (t instanceof TermTermAttribute) {
				if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("determiner.my"))) {
					myDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("determiner.your"))) {
					yourDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("determiner.other"))) {
					otherDeterminerPresent = true;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("a")) ||
					       (<TermTermAttribute>t).term.functor.is_a(o.getSort("article.any"))) {
					aDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("definite-article"))) {
					definiteArticle = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("demonstrative-determiner"))) {
					demonstrativeDeterminer = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("relation.owns"))) {
					ownsRelation = (<TermTermAttribute>t).term;
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
					properNounTerm = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("demonstrative-pronoun"))) {
					demonstrativePronoun = (<TermTermAttribute>t).term;
				} else if ((<TermTermAttribute>t).term.functor.is_a(o.getSort("relation"))) {
					otherRelations.push((<TermTermAttribute>t).term);
				} else {
					otherTerms.push((<TermTermAttribute>t).term);
				}
			}
		}

		var potentialQueryFunctor:TermAttribute = null;
		var queryFunctor:TermAttribute = null;
		var queryFunctorSort:Sort = null;
		var querySubjectID:TermAttribute = null;
		var queryLocationID:TermAttribute = null;
		var TermUsedForQueryLocationID:Term = null;

		if (myDeterminer!=null) {
			queryFunctor = myDeterminer.attributes[0];
			if (queryFunctor instanceof ConstantTermAttribute) {
				queryFunctorSort = o.getSortSilent((<ConstantTermAttribute>queryFunctor).value);
			}
			/*
			if (queryFunctorSort!= null && !queryFunctorSort.is_a(o.getSort("property-with-value"))) {
				// probably not a query, see if I find this case later on
				// ... handle this for the case "my room"
				// ...
				return null;
			}
			*/
			querySubjectID = new ConstantTermAttribute(context.speaker, o.getSort("#id"));
		} else if (yourDeterminer!=null) {
			queryFunctor = yourDeterminer.attributes[0];
			if (queryFunctor instanceof ConstantTermAttribute) {
				queryFunctorSort = o.getSortSilent((<ConstantTermAttribute>queryFunctor).value);
			}
			/*
			if (queryFunctorSort!= null && !queryFunctorSort.is_a(o.getSort("property-with-value"))) {
				// probably not a query, see if I find this case later on
				// ... handle this for the case "your room"
				// ...
				return null;
			}
			*/
			querySubjectID = new ConstantTermAttribute(context.ai.selfID, o.getSort("#id"));
		} else if (aDeterminer != null) {
			queryFunctor = aDeterminer.attributes[0];
		} else if (ownsRelation!=null) {
			// case 3: if there is a "relation.owns":
			var ownerVariable:TermAttribute = ownsRelation.attributes[0];
			var ownerTerms:TermAttribute[] = [];
			queryFunctor = ownsRelation.attributes[1];
			for(let t of terms) {
				if (t instanceof TermTermAttribute) {
					var t2:Term = (<TermTermAttribute>t).term;
					if (t2 == ownsRelation) continue;
					for(let i:number = 0;i<t2.attributes.length;i++) {
						if (t2.attributes[i] == ownerVariable) ownerTerms.push(t);
					}
				}
			}
			var dereffedOwner:TermAttribute[] = context.derefInternal(ownerTerms, listenerVariable, o, pos, AI);
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
			querySubjectID = dereffedOwner[0];
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

/*
		if (querySubjectID != null &&
			definiteArticle != null && 
			(definiteArticle.attributes[0] instanceof ConstantTermAttribute)) {
			if ((<ConstantTermAttribute>(definiteArticle.attributes[0])).value == querySubjectID) {
				// the definite article applies to the query, so, this is not a query, but a deref from context!
				return null;
			}
		}
*/

//		console.log("queryFunctor: " + queryFunctor + " (" + queryFunctorSort + ")");
//		console.log("querySubjectID: " + querySubjectID);

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
					var t2:Term = (<TermTermAttribute>t).term;
					if (t2.attributes[0] == queryFunctor &&
						t2.attributes[1] instanceof ConstantTermAttribute) {
						var adjectiveSort:Sort = o.getSort((<ConstantTermAttribute>(t2.attributes[1])).value);
						if (adjectiveSort != null) adjectives.push(adjectiveSort);
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

		var queryTerms:TermAttribute[] = [];
		if (queryFunctorSort != null) {
			if (queryLocationID == null) {
				if (querySubjectID == null ||
					!queryFunctorSort.is_a(o.getSort("property-with-value"))) {
					if (queryFunctorSort.name != "any") {
						queryTerms.push(new TermTermAttribute(new Term(queryFunctorSort, [queryVariable])));
					}
				} else {
					queryTerms.push(new TermTermAttribute(new Term(queryFunctorSort, [querySubjectID, queryVariable])));
				}
			} else {
				if (querySubjectID == null) {
					console.warn("specialfunction_derefQuery: case not considered, querySubjectID == null and queryLocationID != null!");
					return null;
				} else {
					queryTerms.push(new TermTermAttribute(new Term(queryFunctorSort, [querySubjectID, queryLocationID, queryVariable])));
					if (otherRelations.indexOf(TermUsedForQueryLocationID) != -1) {
						otherRelations.splice(otherRelations.indexOf(TermUsedForQueryLocationID), 1);
					}
				}
			}
		}
		if (myDeterminer != null && queryFunctorSort != null &&
			!queryFunctorSort.is_a(o.getSort("property-with-value"))) {
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("relation.owns"), [querySubjectID, queryVariable])));
		}
		if (yourDeterminer != null && queryFunctorSort != null &&
			!queryFunctorSort.is_a(o.getSort("property-with-value"))) {
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("relation.owns"), [listenerVariable, queryVariable])));	
		}
		for(let adjective of adjectives) {

			if (adjective.is_a(o.getSort("property-with-value"))) {
				if (adjective.is_a(o.getSort("role"))) {
					queryTerms.push(new TermTermAttribute(new Term(adjective,[queryVariable, queryLocationID, new ConstantTermAttribute(adjective.name, adjective)])));
				} else {
					queryTerms.push(new TermTermAttribute(new Term(adjective,[queryVariable, new ConstantTermAttribute(adjective.name, adjective)])));
				}
			} else {
				queryTerms.push(new TermTermAttribute(new Term(adjective,[queryVariable])));
			}
		}
		for(let adverb of adverbs) {
			if (adverb.attributes.length > 0 &&
				adverb.attributes[0] instanceof ConstantTermAttribute) {
				var adverbString:string = (<ConstantTermAttribute>adverb.attributes[0]).value;
				if (adverbString == "space.here") {
					// find the location of the speaker:
					var hereEntity:NLContextEntity = context.findLocationOfID(context.speaker);
					if (hereEntity != null) {
						queryTerms.push(new TermTermAttribute(new Term(o.getSort("space.at"),[queryVariable, hereEntity.objectID])));
					}
				} else if (adverbString == "space.there") {
					// Find if there is a location we just talked about (and that is not the place where the speaker is):
					var hereEntity:NLContextEntity = context.findLocationOfID(context.speaker);
					var thereEntity:NLContextEntity = null;
					var entities_mpl:NLContextEntity[][] = context.findEntitiesOfSort(o.getSort("space.location"), o);
					var candidateThereEntities:NLContextEntity[] = context.applySingularTheDeterminer(entities_mpl);
					if (candidateThereEntities != null && candidateThereEntities.length == 1) thereEntity = candidateThereEntities[0];
					if (thereEntity != null && thereEntity != hereEntity) {
						queryTerms.push(new TermTermAttribute(new Term(o.getSort("space.at"),[queryVariable, thereEntity.objectID])));
					}
				}
			}
		}
		for(let relation of otherRelations) {
//			console.log("considering relation: " + relation);
			var atts:TermAttribute[] = [];
			var found:boolean = false;
			for(let i:number = 0;i<relation.attributes.length;i++) {
				if (relation.attributes[i] == queryFunctor) {
					atts.push(queryVariable);
					found = true;
				} else {
					atts.push(relation.attributes[i]);
				}
			}
			if (found) {
				queryTerms.push(new TermTermAttribute(new Term(relation.functor, atts)));
			} else {
				console.log("specialfunction_derefQuery: otherRelation does not have queryFunctor ("+queryFunctor+") as a parameter: " + relation);
			}
		}
		if (properNounTerm != null) {
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("name"),[queryVariable,properNounTerm.attributes[0]])));
		}
		// list of entities for which we have added a not(queryVariable == entity) term:
		var nottedEntities:string[] = [];
		if (elsePresent) {
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("#not"), [new TermTermAttribute(new Term(o.getSort("="), [queryVariable, new ConstantTermAttribute(context.speaker , o.getSort("#id"))]))])));
			queryTerms.push(new TermTermAttribute(new Term(o.getSort("#not"), [new TermTermAttribute(new Term(o.getSort("="), [queryVariable, new ConstantTermAttribute(context.ai.selfID , o.getSort("#id"))]))])));
			nottedEntities.push(context.speaker);
			nottedEntities.push(context.ai.selfID);
		}
		if (otherDeterminerPresent && queryFunctorSort!=null) {
			// Find the entities that the expression could be referring to, and exclude them ("other"):
			var entities_mpl:NLContextEntity[][] = context.findEntitiesOfSort(queryFunctorSort, o);
			if (entities_mpl != null) {
				// exclude the ones in mentions and in short term memory:
				for(let e of entities_mpl[0]) {
					var stringID:string = (<ConstantTermAttribute>(e.objectID)).value;
					if (nottedEntities.indexOf(stringID) == -1) {
						queryTerms.push(new TermTermAttribute(new Term(o.getSort("#not"), [new TermTermAttribute(new Term(o.getSort("="), [queryVariable, e.objectID]))])));
						nottedEntities.push(stringID);
					}
				}
				for(let e of entities_mpl[1]) {
					var stringID:string = (<ConstantTermAttribute>(e.objectID)).value;
					if (nottedEntities.indexOf(stringID) == -1) {
						queryTerms.push(new TermTermAttribute(new Term(o.getSort("#not"), [new TermTermAttribute(new Term(o.getSort("="), [queryVariable, e.objectID]))])));
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

		var bindings2:Bindings = new Bindings();
		if (!Term.unifyAttribute(query, queryTerm, true, bindings2)) {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
		var parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.bindings.concat(bindings2), parse.ruleNames, parse.priorities);
		return [parse2];
	}


	specialfunction_symbolToSort(parse:NLParseRecord, symbol:TermAttribute, sort:TermAttribute, o:Ontology) : NLParseRecord[]
	{
		if (symbol instanceof ConstantTermAttribute) {
			var symbol_v:string = (<ConstantTermAttribute>symbol).value;
//			var symbol_s:Sort = symbol.sort;
//			if (symbol_s.is_a(o.getSort("symbol"))) {
				var s:Sort = o.getSort(symbol_v);
				if (s == null) return null;
				var sAtt:TermAttribute = new VariableTermAttribute(s, null);
		
				var bindings:Bindings = new Bindings();
				if (!Term.unifyAttribute(sort, sAtt, true, bindings)) {
					return null;
				}
				var parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.bindings.concat(bindings), parse.ruleNames, parse.priorities);
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
			var s:Sort = sortAtt.sort
			if (att.sort.is_a(s)) return [parse];
		}
		return null;
	}


	specialfunction_concatenateSymbols(parse:NLParseRecord, args:TermAttribute[], o:Ontology) : NLParseRecord[]
	{
		var concatenation:string = "";
		for(let i:number = 0;i<args.length-1;i++) {
			if (args[i] instanceof ConstantTermAttribute) {
				concatenation += (<ConstantTermAttribute>(args[i])).value;
			} else {
				return null;
			}
		}

		var bindings:Bindings = new Bindings();
		if (!Term.unifyAttribute(args[args.length-1], new ConstantTermAttribute(concatenation, o.getSort("symbol")), true, bindings)) {
			return null;
		}
		var parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.bindings.concat(bindings), parse.ruleNames, parse.priorities);
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

		var term2:Term = (<TermTermAttribute>verb).term.applyBindings(parse.bindings);
		var result_l:TermAttribute[] = context.completeVerbArgumentsFromContext(term2, output, o);

//		console.log("specialfunction_derefFromContext result: " + result);

		if (result_l == null || result_l.length == 0) {
			this.lastDerefErrorType = context.lastDerefErrorType;
			return null;
		}

		var result:TermAttribute = result_l[0];
		for(let i:number = 1;i<result_l.length;i++) {
			var tmp:Term = new Term(o.getSort("#list"), [result_l[i], result]);
			result = new TermTermAttribute(tmp);
		}

		var bindings2:Bindings = new Bindings();
		if (Term.unifyAttribute(output, result, true, bindings2)) {
			var parse2:NLParseRecord = new NLParseRecord(parse.nextTokens, parse.bindings.concat(bindings2), parse.ruleNames, parse.priorities);
			return [parse2];
		} else {
			this.lastDerefErrorType = DEREF_ERROR_CANNOT_PROCESS_EXPRESSION;
			return null;
		}
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
				var children:NLPattern[] = [];
				for(let c of this.children) {
					children.push(c.clone(map));
				}
				var p:NLPattern = new NLPattern(this.type);
				p.children = children;
				return p;

			case NLPATTERN_POS:
			case NLPATTERN_PATTERN:
			case NLPATTERN_FUNCTION:
				var p:NLPattern = new NLPattern(this.type);
				p.term = this.term.clone(map);
				return p;

			default:
				console.error("NLPattern.clone: pattern type not supported " + this.type);
				return null;
		}
	}


	static fromString(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : NLPattern
	{
		// start assuming it is a sequence. Tokenize the string into the elements of the sequence, and then parse each of them:
		var parentheses:number = 0;
		var squareBrackets:number = 0;
		var inquote:boolean = false;
		var elementStrings:string[] = [];
		var tmp:string = "";

		for(let i:number = 0; i<str.length; i++) {
			var c:string = str.charAt(i);
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
			var patterns:NLPattern[] = [];
			for(let patternString of elementStrings) {
				var pattern:NLPattern = NLPattern.fromString(patternString, o, variableNames, variableValues);
				if (pattern == null) {
					console.error("NLPattern.fromString: cannot parse string " + patternString);
					return null;
				}
				patterns.push(pattern);
			}
			var p:NLPattern = new NLPattern(NLPATTERN_SEQUENCE);
			p.children = patterns;

			return p;
		} else {
			var patternString:string = elementStrings[0];
			var repeat:boolean = false;
			var pattern:NLPattern = null;
			if (patternString.charAt(patternString.length-1) == '*') {
				repeat = true;
				patternString = patternString.substring(0,patternString.length-1);
			}
			c = patternString.charAt(0);
			if (c == '(') pattern = NLPattern.fromStringAlternative(patternString, o, variableNames, variableValues);
			if (c == '[') pattern = NLPattern.fromStringOptional(patternString, o, variableNames, variableValues);
			if (c == '\'') pattern = NLPattern.fromStringString(patternString, o, variableNames, variableValues);
			if ((c >= 'a' && c < 'z') || 
				(c >= 'A' && c < 'Z') ||
				c == '#') pattern = NLPattern.fromStringTerm(patternString, o, variableNames, variableValues);

			if (pattern != null) {
				if (repeat) {
					var pattern2:NLPattern = new NLPattern(NLPATTERN_REPEAT);
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

		var parentheses:number = 0;
		var squareBrackets:number = 0;
		var inquote:boolean = false;
		var elementStrings:string[] = [];
		var tmp:string = "";

		for(let i:number = 0; i<str.length; i++) {
			var c:string = str.charAt(i);
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
			var patterns:NLPattern[] = [];
			for(let patternString of elementStrings) {
				var pattern:NLPattern = NLPattern.fromString(patternString, o, variableNames, variableValues);
				if (pattern == null) {
					console.error("NLPattern.fromString: cannot parse string " + patternString);
					return null;
				}
				patterns.push(pattern);
			}

			var p:NLPattern = new NLPattern(NLPATTERN_ALTERNATIVE);
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
		var pattern:NLPattern = NLPattern.fromString(str, o, variableNames, variableValues);
		if (pattern == null) return null;

		var p:NLPattern = new NLPattern(NLPATTERN_OPTIONAL);
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

		var p:NLPattern = new NLPattern(NLPATTERN_STRING);
		p.string = str;
		return p;
	}


	static fromStringTerm(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : NLPattern
	{
		var term:Term = Term.fromStringInternal(str, o, variableNames, variableValues);

		if (term == null) return null;

		// check if it's a POS, a pattern or a special function:
		var posSort:Sort = o.getSort("part-of-speech");
		var specialFunctionSort:Sort = o.getSort("parser-function");
		if (posSort.subsumes(term.functor)) {
			// POS:
			var p:NLPattern = new NLPattern(NLPATTERN_POS);
			p.term = term;
			return p;
		} else if (specialFunctionSort.subsumes(term.functor)) {
			// Special function:
			var p:NLPattern = new NLPattern(NLPATTERN_FUNCTION);
			p.term = term;
			return p;
		} else {
			// sub pattern
			var p:NLPattern = new NLPattern(NLPATTERN_PATTERN);
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
				var out:string = "";
				for(let i:number = 0;i<this.children.length;i++) {
					var child:NLPattern = this.children[i];
					if (i!=0) out += " ";
					out += child.toStringInternal(variables, variableNames);
				}
				return out;

			case NLPATTERN_ALTERNATIVE:
				var out:string = "(";
				for(let i:number = 0;i<this.children.length;i++) {
					var child:NLPattern = this.children[i];
					if (i!=0) out += "|";
					out += child.toStringInternal(variables, variableNames);
				}
				return out + ")";

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
