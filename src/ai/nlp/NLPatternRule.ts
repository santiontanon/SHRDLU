// Sorted in order or preference of reporting (we prefer to report the ones with a higher number):
var DEREF_ERROR_CANNOT_PROCESS_EXPRESSION:number = 0;
var DEREF_ERROR_VERB_COMPLETION:number = 1;
var DEREF_ERROR_NO_REFERENTS:number = 2;
var DEREF_ERROR_CANNOT_DISAMBIGUATE:number = 3;



class NLParseRecord {
	constructor(nt:TokenizationElement[], pp:PartOfSpeech[], b:Bindings, d:Term[], rn:string[], p:number[])
	{
		this.nextTokens = nt;
		this.previousPOS = pp;
		this.bindings = b;
		this.derefs = d;
		this.ruleNames = rn;
		this.priorities = p;
	}


	higherPriorityThan(pr2:NLParseRecord) : number
	{
		let idx:number = 0;
		while(true) {
			let p1:number = null;
			let p2:number = null;
			if (this.priorities.length >= idx+1) p1 = this.priorities[idx];
			if (pr2.priorities.length >= idx+1) p2 = pr2.priorities[idx];
			if (p1 == null) {
				if (p2 == null) return 0;
				return 1;	// p1 has higher priority
			} else {
				if (p2 == null) return -1;
				if (p1 > p2) return 1;
				if (p1 < p2) return -1;
			}
			idx++;
		}
	}


	// throught the first path
	tokensLeftToParse() : number
	{
		if (this.nextTokens == null || this.nextTokens.length == 0) return 0;
		return this.nextTokens[0].tokensLeftToParse();
	}


	nextTokens:TokenizationElement[] = null;  // this is not a flat list, but all the possible "immediate next" tokens, according to different parses
	previousPOS:PartOfSpeech[] = null; // the list of POS tags of the tokens already parsed (those that have the direct token in the pattern are ignored)
	bindings:Bindings = null;
	derefs:Term[] = null;  // this list accumulates all the successful deref operations completed during parsing up to this point
	ruleNames:string[] = null;
	priorities:number[] = null; // the priorities of all the rules used up to this point
	result:Term = null;
}


class NLDerefErrorRecord {
	derefFromContextError:TermAttribute = null;
	derefUniversalError:TermAttribute = null;
	derefHypotheticalError:TermAttribute = null;
	derefQueryError:TermAttribute = null;
	previousPOS:PartOfSpeech[] = [];

	derefErrorType:number = -1;
	tokensLeftToParse:number = -1;

	toString() : string
	{
		return "NLDerefErrorRecord("+
			   (this.derefFromContextError != null ? "context: " + this.derefFromContextError:"")+
			   (this.derefUniversalError != null ? "universal: " + this.derefUniversalError:"")+
			   (this.derefHypotheticalError != null ? "hypothetical: " + this.derefHypotheticalError:"")+
			   (this.derefQueryError != null ? "query: " + this.derefQueryError:"")+
			   ")";
	}

	constructor(errorType:number, tokensLeftToParse:number, previousPOS:PartOfSpeech[]) {
		this.derefErrorType = errorType;
		this.tokensLeftToParse = tokensLeftToParse;
		this.previousPOS = previousPOS;
	}

	equals(e:NLDerefErrorRecord) : boolean
	{
		if (this.derefErrorType != e.derefErrorType) return false;
		if (this.tokensLeftToParse != e.tokensLeftToParse) return false;
		if ((this.derefFromContextError == null) != (e.derefFromContextError == null)) return false;
		if (this.derefFromContextError!= null &&
			Term.equalsNoBindingsAttribute(this.derefFromContextError, e.derefFromContextError) != 1) {
			return false;
		}
		if ((this.derefUniversalError == null) != (e.derefUniversalError == null)) return false;
		if (this.derefUniversalError!= null &&
			Term.equalsNoBindingsAttribute(this.derefUniversalError, e.derefUniversalError) != 1) {
			return false;
		}
		if ((this.derefHypotheticalError == null) != (e.derefHypotheticalError == null)) return false;
		if (this.derefHypotheticalError!= null &&
			Term.equalsNoBindingsAttribute(this.derefHypotheticalError, e.derefHypotheticalError) != 1) {
			return false;
		}
		if ((this.derefQueryError == null) != (e.derefQueryError == null)) return false;
		if (this.derefQueryError!= null &&
			Term.equalsNoBindingsAttribute(this.derefQueryError, e.derefQueryError) != 1) {
			return false;
		}

		if (this.previousPOS.length != e.previousPOS.length) return false;
		for(let i:number = 0;i<this.previousPOS.length;i++) {
			if (!this.previousPOS[i].equals(e.previousPOS[i])) return false;
		}
		return true;
	}
}


class NLPatternContainer {
	constructor(name:string, sv:VariableTermAttribute, lv:VariableTermAttribute) 
	{
		this.name = name;
		this.speakerVariable = sv;
		this.listenerVariable = lv;
	}

	name:string = "";
	speakerVariable:VariableTermAttribute = null;
	listenerVariable:VariableTermAttribute = null;
	lastDerefErrors:NLDerefErrorRecord[] = [];
}


class NLPatternRule extends NLPatternContainer {
	constructor(name:string, h:Term, b:NLPattern, p:number, sv:VariableTermAttribute, lv:VariableTermAttribute)
	{
		super(name, sv, lv);
		this.head = h;
		this.body = b;
		this.priority = p;
	}


	parse(tokenization:TokenizationElement, filterPartialParses:boolean, context:NLContext, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		// parse the sentence:
		this.lastDerefErrors = [];
		let bindings:Bindings = new Bindings();
		if (this.speakerVariable != null) {
			bindings.l.push([(<VariableTermAttribute>this.speakerVariable), 
							 new ConstantTermAttribute(context.speaker, parser.o.getSort("#id"))]);
		}
		let parses:NLParseRecord[] = this.body.parse(new NLParseRecord([tokenization], [], bindings, [], [], []), context, this, parser, AI);
		if (parses == null) return null;

		// if there is any valid parse, generate the corresponding terms:
		let results:NLParseRecord[] = [];
		for(let parse of parses) {
			if (filterPartialParses &&
				parse.nextTokens != null && parse.nextTokens.length > 0) continue;

			parse.ruleNames = [this.name].concat(parse.ruleNames);
			parse.priorities = [this.priority].concat(parse.priorities);
			parse.result = this.head.applyBindings(parse.bindings);
			NLParser.resolveCons(parse.result, parser.o);
			results.push(parse);
		}

		return results;
	}


	parseWithBindings(parse:NLParseRecord, filterPartialParses:boolean, context:NLContext, parser:NLParser, AI:RuleBasedAI) : NLParseRecord[]
	{
		let results:NLParseRecord[] = [];
		let parses:NLParseRecord[] = this.body.parse(parse, context, this, parser, AI);
		if (parses != null) {
			for(let parse2 of parses) {
				if (filterPartialParses &&
					parse2.nextTokens != null && parse2.nextTokens.length > 0) continue;

				parse2.ruleNames = [this.name].concat(parse.ruleNames);
				parse2.priorities = [this.priority].concat(parse.priorities);
				parse2.result = this.head.applyBindings(parse2.bindings);
				NLParser.resolveCons(parse2.result, parser.o);
				results.push(parse2);
			}
		}

		return results;
	}


	clone() : NLPatternRule
	{
		let map:[TermAttribute,TermAttribute][] = [];
		let head:Term = this.head.clone(map);
		let body:NLPattern = this.body.clone(map);
		let rule:NLPatternRule = new NLPatternRule(this.name, head, body, this.priority, this.speakerVariable, this.listenerVariable);

		for(let i:number = 0;i<map.length;i++) {
			if (map[i][0] instanceof VariableTermAttribute &&
			    (<VariableTermAttribute>map[i][0]).name == "SPEAKER") {
				rule.speakerVariable = <VariableTermAttribute>map[i][1];
			}
		}

		return rule;
	}


	static fromString(name:string, head:string, body:string, p:number, o:Ontology, sv:VariableTermAttribute, lv:VariableTermAttribute) : NLPatternRule
	{
        let variableNames:string[] = [];
        let variableValues:VariableTermAttribute[] = [];

		let h:Term = Term.fromStringInternal(head, o, variableNames, variableValues).term;
		if (h == null) {
			console.error("NLPatternRule.fromString: cannot parse head: " + head);
			return null;
		}
		let b:NLPattern = NLPattern.fromString(body, o, variableNames, variableValues);
		if (b == null) {
			console.error("NLPatternRule.fromString: cannot parse body: " + body);
			return null;
		}
		if (name == null) {
			console.error("Rule without a name!");
		}

		let rule:NLPatternRule = new NLPatternRule(name, h, b, p, sv, lv);
		for(let i:number = 0;i<variableNames.length;i++) {
			if (variableNames[i] == "SPEAKER") {
				rule.speakerVariable = variableValues[i];
			}
		}

		return rule;
	}


	head:Term = null;
	body:NLPattern = null;
	priority:number = 100;
}
