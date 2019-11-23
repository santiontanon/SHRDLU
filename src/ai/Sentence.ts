/*

Sentences in my sorted-logic formalism in Disjunctive Normal Form 
(so that the whole knowledge base is in Conjunctive Normal Form)

*/


class Sentence {
	constructor(terms:Term[], sign:boolean[]) {
		this.terms = terms;
		this.sign = sign;
	}

	/*
	// Simple inference procedure that would only work for rules that are of the form ~Term; Term
	// - If "t" matches with the negated, it returns the positive after applying the resulting bindings
	// - Otherwise, it returns null
	singleTermForwardChaining(t:Term) : Term
	{
		var negatedTerm:Term = null;
		var positiveTerm:Term = null;
		if (this.terms.length != 2) return null;

		for(let i:number = 0;i<this.terms.length;i++) {
			if (!this.sign[i]) {
				if (negatedTerm != null) return null;	// more than one negated term in this rule
				negatedTerm = this.terms[i];
			} else {
				if (positiveTerm != null) return null;	// more than one positive term in this rule
				positiveTerm = this.terms[i];
			}
		}
		var bindings:Bindings = new Bindings();
		if (t.unify(negatedTerm, OCCURS_CHECK, bindings)) {
			var t2:Term = positiveTerm.applyBindings(bindings);
			return t2;
		}
		return null;
	}
	*/


	getAllVariables() : VariableTermAttribute[]
	{
		var vs:VariableTermAttribute[] = [];
		for(let t of this.terms) {
			let tvs:VariableTermAttribute[] = t.getAllVariables();
//			console.log("Sentence.getAllVariables(t): " + tvs);
			for(let v of tvs) {
				if (vs.indexOf(v) == -1) vs.push(v);
			}
		}
		return vs;
	}


	negate() : Sentence[]
	{
		let sentences:Sentence[] = [];
		for(let i:number = 0;i<this.terms.length;i++) {
			let t:Term = this.terms[i];
			let s:boolean = this.sign[i];
			sentences.push(new Sentence([t], [!s]));
		}
		return sentences;
	}


	// checks if "this" is a subset of "s":
	subsetNoBindings(s:Sentence) : boolean
	{
		if (this.terms.length > s.terms.length) return false;
		for(let i:number = 0;i<this.terms.length;i++) {
			var found:boolean = false;
			for(let j:number = 0;j<s.terms.length;j++) {
				if (this.sign[i] == s.sign[j] &&
					this.terms[i].equalsNoBindings(s.terms[j]) == 1) {
					found = true;
					break;
				}
			}
			if (!found) return false;
		}

		return true;
	}


	equalsNoBindings(s:Sentence) : boolean
	{
		if (this.terms.length != s.terms.length) return false;
		for(let i:number = 0;i<this.terms.length;i++) {
			if (this.sign[i] != s.sign[i]) return false;
			if (this.terms[i].equalsNoBindings(s.terms[i]) != 1) return false;
		}

		return true;
	}


	toString() : string
	{
		var variables:TermAttribute[] = [];
		var variableNames:string[] = [];
		var str:string = "";
		var first:boolean = true;
		for(let i:number = 0;i<this.terms.length;i++) {
			var t:Term = this.terms[i];
			if (first) {
				if (!this.sign[i]) str += "~";
				str += t.toStringInternal(variables, variableNames);
				first = false;
			} else {
				str += "; ";
				if (!this.sign[i]) str += "~";
				str += t.toStringInternal(variables, variableNames);
			}
		}
		return str;
	}


	toStringXML() : string
	{
		return this.toStringXMLInternal([], []);
	}


	toStringXMLInternal(variables:TermAttribute[], variableNames:string[]) : string
	{
		var str:string = "";
		var first:boolean = true;
		for(let i:number = 0;i<this.terms.length;i++) {
			var t:Term = this.terms[i];
			if (first) {
				if (!this.sign[i]) str += "~";
				str += t.toStringXMLInternal(variables, variableNames);
				first = false;
			} else {
				str += "; ";
				if (!this.sign[i]) str += "~";
				str += t.toStringXMLInternal(variables, variableNames);
			}
		}
		return str;
	}


	static fromString(str:string, o:Ontology) : Sentence
	{
		return Sentence.fromStringInternal(str, o, [], []);
	}


	static fromStringInternal(str:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : Sentence
	{
		var tokens:string[] = [];
		var token:string = "";
		var c:string;
		var state:number = 0;	// 0: no token character yet, 1: inside a token
        var parenthesis:number = 0;
        var squareBrackets:number = 0;
        var quotation:boolean = false;

		// separate the string in tokens:
		// each token can be: semicolon, ~, or a term
		for(let i:number = 0;i<str.length;i++) {
			c = str.charAt(i);
			if (c==';' || c=='~') {
				if (state == 0) {
					tokens.push(c);
					token = "";
				} else if (state == 1) {
					if (parenthesis == 0 && squareBrackets ==0 && !quotation) {
						// end of token!
						tokens.push(token.trim());
						tokens.push(c);
						token = "";
						state = 0;
					} else {
						token += c;
					}		
				}
			} else if (c==' ' || c=='\t' || c=='\n' || c=='\r') {

				if (state == 0) {
					// ignore
				} else if (state == 1) {
					if (quotation) {
						token += c;
					} else if (parenthesis == 0 && squareBrackets ==0 && !quotation) {
						// end of token!
						tokens.push(token.trim());
//						console.log("token: " + token);
						token = "";
						state = 0;
					} 			
				}
			} else {
                if (c == "\'") quotation = !quotation;
                if (!quotation) { 
                    if (c == '(') parenthesis++;
                    if (c == ')') parenthesis--;
                    if (c == '[') squareBrackets++;
                    if (c == ']') squareBrackets--;
                }
				token += c;
				state = 1;
			}
		}
		if (state==1) {
			if (parenthesis == 0 && squareBrackets ==0 && !quotation) {
				tokens.push(token.trim());
				//console.log("token: " + token);
			} else {
				console.error("Sentence.fromString: unfinished sentence!");
				return null;
			}
		}

//		for(let t of tokens) {
//			console.log("token: " + t);
//		}

		// check that the sequence is correct: term [[~]term [; [~]term]*]
		var s:Sentence = new Sentence([], []);
		var state:number = 0;
		var sign:boolean = true;
		for(let i:number = 0;i<tokens.length;i++) {
			if (state == 0) {
				if (tokens[i] == "~") {
					sign = false;
					state = 1;
					continue;
				}
			}
			if (state == 0 || state == 1) {
				if (tokens[i] == "~") {
					console.error("Sentence.fromString: two negations in a row!!");
					return null;
				}
				if (tokens[i] == ";") {
					console.error("Sentence.fromString: semicolon found too early!");
					return null;
				}

		        let ta:TermTermAttribute = Term.fromStringInternal(tokens[i], o, variableNames, variableValues);
		        if (ta == null) {
		            console.error("Error parsing sentence: " + str);
		            return null;
		        }
				var t:Term = ta.term; 
				if (t == null) return null;
				s.terms.push(t);
				s.sign.push(sign);
				state = 2;
				sign = true;
				continue;
			}
			if (state == 2) {
				if (tokens[i] != ';') {
					console.error("Sentence.fromString: expected semicolon after term and found: " + tokens[i]);
					return null;
				}
				state = 0;
			}

		}

		return s;
	}


	terms:Term[] = [];
	sign:boolean[] = [];	// whether each term is positive or negated
}