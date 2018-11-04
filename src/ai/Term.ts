class Bindings {
    concat(b:Bindings) {
        var result:Bindings = new Bindings();
        result.l = this.l.concat(b.l);
        return result;   
    }


    toString() : string
    {
        var str:string = "[ ";
        for(let b of this.l) {
            var str2:string = "(";
            if (b[0].name != null) {
                str2 += b[0].name;
            } else {
                str2 += "_";
            }
            str2 += " = " + b[1].toString() + ")";
            str += str2 + " ";
        }
        return str + "]";
    }


    toStringWithMappings(variables:TermAttribute[], variableNames:string[]) : string
    {
        var str:string = "[ ";
        for(let b of this.l) {
            var str2:string = "(";
            str2 += Term.variableNameForPrinting(b[0], variables, variableNames);
            str2 += " = " + Term.variableNameForPrinting(b[1], variables, variableNames) + ":" + b[1].toStringInternal(variables, variableNames) + ")";
            str += str2 + " ";
        }
        return str + "]";
    }


    equals(b:Bindings) {
        if (this.l.length != b.l.length) return false;

        for(let [variable,value] of this.l) {
            var found:boolean = false;
            for(let [variable2,value2] of b.l) {
                if (variable == variable2) {
                    found = true;
                    if (Term.equalsNoBindingsAttribute(value, value2) != 1) return false;
                }
            }
            if (!found) return false;
        }

        return true;
    }


    // if "this" a subset of "b"?
    subset(b:Bindings) {
        if (this.l.length > b.l.length) return false;

        for(let [variable,value] of this.l) {
            var found:boolean = false;
            for(let [variable2,value2] of b.l) {
                if (variable == variable2) {
                    found = true;
                    if (Term.equalsNoBindingsAttribute(value, value2) != 1) return false;
                }
            }
            if (!found) return false;
        }

        return true;
    }

    l:[VariableTermAttribute,TermAttribute][] = [];
}


abstract class TermAttribute {
    constructor(sort:Sort) {
        this.sort = sort;
    }


    abstract occursCheck(v:VariableTermAttribute,
                         bindings:Bindings) : boolean;


    // this function requires the variable to be an exact match:
    abstract applyBindings(bindings:Bindings) : TermAttribute;


    abstract clone(map:[TermAttribute,TermAttribute][]) : TermAttribute;


    toString() :string
    {
        return this.toStringInternal([], []);
    }


    toStringXML() :string
    {
        return this.toStringXMLInternal([], []);
    }


    abstract toStringInternal(variables:TermAttribute[], variableNames:string[]) : string;
    abstract toStringXMLInternal(variables:TermAttribute[], variableNames:string[]) : string;
    

    sort:Sort = null;
}


class ConstantTermAttribute extends TermAttribute {
    constructor(value:any, sort:Sort) {
        super(sort);
        this.value = value;
    }


    occursCheck(v:VariableTermAttribute,
                bindings:Bindings) : boolean
    {
        return false;
    }


    applyBindings(bindings:Bindings) : TermAttribute
    {
        return this;
    }


    clone(map:[TermAttribute,TermAttribute][]) : TermAttribute
    {
        return this;    // this is a constant, no need to clone
    }


    toStringInternal(variables:TermAttribute[], variableNames:string[]) : string
    {
        return "'" + this.value + "'[" + this.sort.name + "]";
    }


    toStringXMLInternal(variables:TermAttribute[], variableNames:string[]) : string
    {
        if ((typeof this.value) == "string") {
            return "'" + (<string>this.value).replace("'","\\039") + "'[" + this.sort.name + "]";

        } else {
            return "'" + this.value + "'[" + this.sort.name + "]";            
        }
    }


    value:any = null;
}


class VariableTermAttribute extends TermAttribute {
    constructor(sort:Sort, name:string) {
        super(sort);
        this.name = name;
    }


    occursCheck(v:VariableTermAttribute,
                bindings:Bindings) : boolean
    {
        if (this == v) return true;
        for(let binding of bindings.l) {
            if (this == binding[0]) {
                return binding[1].occursCheck(v, bindings);
            }
        }
        return false;
    }


    applyBindings(bindings:Bindings) : TermAttribute
    {
        for(let b of bindings.l) {
            if (b[0] == this) {
                return b[1].applyBindings(bindings);
            }
        }
        return this;
    }


    clone(map:[TermAttribute,TermAttribute][]) : TermAttribute
    {
        for(let [v1,v2] of map) {
            if (v1 == this) return v2;
        }
        var v:VariableTermAttribute = new VariableTermAttribute(this.sort, this.name);
        map.push([this, v]);
        return v;
    }


    toStringInternal(variables:TermAttribute[], variableNames:string[]) : string
    {
//        if (this.name != null) return this.name + ":[" + this.sort.name + "]";
        return "[" + this.sort.name + "]";
    }


    toStringXMLInternal(variables:TermAttribute[], variableNames:string[]) : string
    {
//        if (this.name != null) return this.name + ":[" + this.sort.name + "]";
        return "[" + this.sort.name + "]";
    }


    name:string = null;
}


class TermTermAttribute extends TermAttribute {
    constructor(term:Term) {
        super(term.functor);
        this.term = term;
    }


    occursCheck(v:VariableTermAttribute, 
                bindings:Bindings) : boolean
    {
        for(let a of this.term.attributes) {
            if (a.occursCheck(v, bindings)) return true;
        }
        return false;
    }


    applyBindings(bindings:Bindings) : TermAttribute
    {
        return new TermTermAttribute(this.term.applyBindings(bindings));
    }


    clone(map:[TermAttribute,TermAttribute][]) : TermAttribute
    {
        for(let [v1,v2] of map) {
            if (v1 == this) return v2;
        }
        var v:TermTermAttribute = new TermTermAttribute(this.term.clone(map));
        map.push([this, v]);
        return v;
    }


    toStringInternal(variables:TermAttribute[], variableNames:string[]) : string
    {
        return this.term.toStringInternal(variables, variableNames);
    }


    toStringXMLInternal(variables:TermAttribute[], variableNames:string[]) : string
    {
        return this.term.toStringXMLInternal(variables, variableNames);
    }


    term:Term = null;
}


class Term {
    constructor(functor:Sort, attributes:TermAttribute[])
    {
        this.functor = functor;
        this.attributes = attributes;
    }


    addAttribute(p:TermAttribute)
    {
        this.attributes.push(p);
    }


    unify(t:Term, occursCheck:boolean, bindings:Bindings) : boolean
    {
        // if they have a different number of attribetus -> return false
        if (this.attributes.length != t.attributes.length) return false;

        // if functors do not match (one should subsume the other) -> return false
        if (!this.functor.is_a(t.functor) && !t.functor.is_a(this.functor)) return false;

        // for each attribute:
        for(let i:number = 0;i<this.attributes.length;i++) {
            var att1:TermAttribute = this.attributes[i];
            var att2:TermAttribute = t.attributes[i];

            if (!Term.unifyAttribute(att1, att2, occursCheck, bindings)) return false;
        }

        return true;
    }


    static unifyAttribute(att1:TermAttribute, att2:TermAttribute, occursCheck:boolean, bindings:Bindings) : boolean
    {
        if (att1 == att2) return true;

        // - first of all, apply bindings (in order) if any is a variable to construct temporary terms
        if (att1 instanceof VariableTermAttribute) {
            for(let pair of bindings.l) {
                if (pair[0] == att1) {
                    return Term.unifyAttribute(pair[1], att2, occursCheck, bindings);
                }
            }
        }
        if (att2 instanceof VariableTermAttribute) {
            for(let pair of bindings.l) {
                if (pair[0] == att2) {
                    return this.unifyAttribute(att1, pair[1], occursCheck, bindings);
                }
            }
        }

        // - if they are both constants, and are different -> return false
        if (att1 instanceof ConstantTermAttribute) {
            if (att2 instanceof ConstantTermAttribute) {
                if ((<ConstantTermAttribute>att1).value != (<ConstantTermAttribute>att2).value) return false;
                if (!att1.sort.is_a(att2.sort) && !att2.sort.is_a(att1.sort)) return false;
            } else if (att2 instanceof TermTermAttribute) {
                return false;
            }
        }

        // - if they are both terms -> recursive call
        if (att1 instanceof TermTermAttribute) {
            if (att2 instanceof TermTermAttribute) {
                if (!att1.term.unify(att2.term, occursCheck, bindings)) return false;
            } else if (att2 instanceof ConstantTermAttribute) {
                return false;
            }
        }

        // - if one of them is a variable of a more general or equal sort than the other and that 
        //   does not occur inside the other (occurs check) -> add binding
        if ((att1 instanceof VariableTermAttribute) ||
            (att2 instanceof VariableTermAttribute)) {
            if ((att1 instanceof VariableTermAttribute) && att1.sort.subsumes(att2.sort)) {
                if (occursCheck && att2.occursCheck(att1, bindings)) return false;
                bindings.l.push([<VariableTermAttribute>att1, att2]);
                return true;
            }
            if ((att2 instanceof VariableTermAttribute) && att2.sort.subsumes(att1.sort)) {
                if (occursCheck && att1.occursCheck(att2, bindings)) return false;
                bindings.l.push([<VariableTermAttribute>att2, att1]);
                return true;
            }
            return false;
        }

        return true;
    }


    equalsBindings(t:Term) : Bindings
    {
        var b:Bindings = new Bindings();
        if (this.equalsInternal(t, b)) return b;
        return null;
    }


    equals(t:Term) : boolean
    {
        return this.equalsInternal(t, new Bindings());
    }


    equalsInternal(t:Term, bindings:Bindings) : boolean
    {
        // if they have a different number of attributes -> return false
        if (this.attributes.length != t.attributes.length) return false;

        // if functors do not match -> return false
        if (this.functor != t.functor) return false;

        // for each attribute:
        for(let i:number = 0;i<this.attributes.length;i++) {
            var att1:TermAttribute = this.attributes[i];
            var att2:TermAttribute = t.attributes[i];

            if (!Term.equalsAttribute(att1, att2, bindings)) return false;
        }

        return true;
    }


    // same as equals, but considers the #and functor in a spceial way, so that #and(X, #and(Y,Z)) is the same as #and(#and(X, Y), Z)
    equalsConsideringAnd(t:Term) : boolean
    {
        return this.equalsConsideringAndInternal(t, new Bindings());
    }


    equalsConsideringAndInternal(t:Term, bindings:Bindings) : boolean
    {
        // if they have a different number of attributes -> return false
        if (this.attributes.length != t.attributes.length) return false;

        // if functors do not match -> return false
        if (this.functor != t.functor) return false;

        if (this.functor.name == "#and") {
            // special case!
            var tl1:TermAttribute[] = Term.elementsInAndList(this);
            var tl2:TermAttribute[] = Term.elementsInAndList(t);

            if (tl1.length != tl2.length) return false;
            for(let t1 of tl1) {
                var found:TermAttribute = null;
                for(let t2 of tl2) {
                    if (Term.equalsAttributeConsideringAnd(t1,t2,bindings)) {
                        found = t2;
                        break;
                    }
                }
                if (found == null) return false;
                tl2.splice(tl2.indexOf(found),1);
            }
        } else {
            // for each attribute:
            for(let i:number = 0;i<this.attributes.length;i++) {
                var att1:TermAttribute = this.attributes[i];
                var att2:TermAttribute = t.attributes[i];

                if (!Term.equalsAttributeConsideringAnd(att1, att2, bindings)) return false;
            }
        }

        return true;
    }


    static elementsInAndList(list:Term) : TermAttribute[]
    {
        var output:TermAttribute[] = [];

        while(list.functor.name == "#and") {
            if (list.attributes[0] instanceof TermTermAttribute &&
                (<TermTermAttribute>list.attributes[0]).term.functor.name == "#and") {
                output.push(list.attributes[1]);
                list = (<TermTermAttribute>list.attributes[0]).term;
            } else if (list.attributes[1] instanceof TermTermAttribute &&
                (<TermTermAttribute>list.attributes[1]).term.functor.name == "#and") {
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



    static equalsAttribute(att1:TermAttribute, att2:TermAttribute, bindings:Bindings) : boolean
    {
        // - if they are both constants, and are different -> return false
        if ((att1 instanceof ConstantTermAttribute) &&
            (att2 instanceof ConstantTermAttribute)) {
            if ((<ConstantTermAttribute>att1).value != (<ConstantTermAttribute>att2).value) return false;
            if (att1.sort != att2.sort) return false;
            return true;
        }

        // - if they are both terms -> recursive call
        if ((att1 instanceof TermTermAttribute) &&
            (att2 instanceof TermTermAttribute)) {
            return att1.term.equalsInternal(att2.term, bindings);
        }

        // - if one of them is a variable that does not occur inside the other (occurs check) -> add binding
        if (att1 instanceof VariableTermAttribute &&
            att2 instanceof VariableTermAttribute) {
            if (att1.sort != att2.sort) return false;
            var found:boolean = false;
            for(let [v1,v2] of bindings.l) {
                if (v1 == att1) {
                    if (v2 != att2) return false;
                    found = true;
                }
            }
            if (!found && att1 != att2) bindings.l.push([<VariableTermAttribute>att1, <VariableTermAttribute>att2]);
            return true;
        }

        return false;
    }


    static equalsAttributeConsideringAnd(att1:TermAttribute, att2:TermAttribute, bindings:Bindings) : boolean
    {
        // - if they are both constants, and are different -> return false
        if ((att1 instanceof ConstantTermAttribute) &&
            (att2 instanceof ConstantTermAttribute)) {
            if ((<ConstantTermAttribute>att1).value != (<ConstantTermAttribute>att2).value) return false;
            if (att1.sort != att2.sort) return false;
            return true;
        }

        // - if they are both terms -> recursive call
        if ((att1 instanceof TermTermAttribute) &&
            (att2 instanceof TermTermAttribute)) {
            return att1.term.equalsConsideringAndInternal(att2.term, bindings);
        }

        // - if one of them is a variable that does not occur inside the other (occurs check) -> add binding
        if (att1 instanceof VariableTermAttribute &&
            att2 instanceof VariableTermAttribute) {
            if (att1.sort != att2.sort) return false;
            var found:boolean = false;
            for(let [v1,v2] of bindings.l) {
                if (v1 == att1) {
                    if (v2 != att2) return false;
                    found = true;
                }
            }
            if (!found) bindings.l.push([<VariableTermAttribute>att1, <VariableTermAttribute>att2]);
            return true;
        }

        return false;
    }


    /*
    1: equals
    0: cannot decide
    -1: different
    */
    equalsNoBindings(t:Term) : number
    {
        // if they have a different number of attribetus -> return false
        if (this.attributes.length != t.attributes.length) return -1;

        // if functors do not match -> return false
        if (this.functor != t.functor) return -1;

        // for each attribute:
        var result:number = 1;
        for(let i:number = 0;i<this.attributes.length;i++) {
            var att1:TermAttribute = this.attributes[i];
            var att2:TermAttribute = t.attributes[i];

            var tmp:number = Term.equalsNoBindingsAttribute(att1, att2);
            if (tmp==-1) return -1;
            if (tmp==0 && result==1) result = 0;
        }

        return result;
    }


    // return values:
    // 1: true
    // -1: false
    // 0: could unify, but they are not identical
    static equalsNoBindingsAttribute(att1:TermAttribute, att2:TermAttribute) : number
    {
        if (att1 instanceof ConstantTermAttribute) {
            if (att2 instanceof ConstantTermAttribute) {
                if ((<ConstantTermAttribute>att1).value != (<ConstantTermAttribute>att2).value) return -1;
                if (att1.sort != att2.sort) return -1;
                return 1;
            } else if (att2 instanceof TermTermAttribute) {
                return -1;
            } else {
                return 0;
            }
        } 

        if (att1 instanceof TermTermAttribute) {
            if (att2 instanceof TermTermAttribute) {
                return att1.term.equalsNoBindings(att2.term);
            } else if (att2 instanceof ConstantTermAttribute) {
                return -1;
            } else {
                return 0;
            }
        }

        if (att1 instanceof VariableTermAttribute) {
            if (att2 instanceof VariableTermAttribute) {
                if (att1 == att2) return 1;
                if (att1.sort == att2.sort) return 1;
                return 0;
            } else {
                return 0;
            }
        }

        // we should never reach here anyway
        return -1;
    }    


    applyBindings(bindings:Bindings) : Term
    {
        if (bindings.l.length == 0) return this;

        var t:Term = new Term(this.functor, []);
        for(let att of this.attributes) {
            var att2:TermAttribute = att.applyBindings(bindings);
            t.attributes.push(att2);
        }

        return t;
    }


    getAllVariables() : VariableTermAttribute[]
    {
        let vs:VariableTermAttribute[] = [];

        for(let att of this.attributes) {
            if (att instanceof VariableTermAttribute) {
                vs.push(att);
            } else if (att instanceof TermTermAttribute) {
                let vs2:VariableTermAttribute[] = att.term.getAllVariables();
                for(let v of vs2) {
                    if (vs.indexOf(v)==-1) vs.push(v);
                }
            }
        }

        return vs;
    }


    containsVariable(v:TermAttribute) : boolean
    {
        for(let att of this.attributes) {
            if (att == v) {
                return true;
            } else if (att instanceof TermTermAttribute) {
                if ((<TermTermAttribute>att).term.containsVariable(v)) return true;
            }
        }
        return false;
    }


    findSubtermWithFunctorSort(s:Sort) : Term
    {
        if (this.functor.is_a(s)) return this;
        for(let att of this.attributes) {
            if (att instanceof TermTermAttribute) {
                let tmp:Term = (<TermTermAttribute>att).term.findSubtermWithFunctorSort(s);
                if (tmp != null) return tmp;
            }
        }
        return null;
    }


    clone(map:[TermAttribute,TermAttribute][]) : Term
    {
        var attributes:TermAttribute[] = [];
        for(let a of this.attributes) {
            attributes.push(a.clone(map));
        }
        return new Term(this.functor, attributes);
    }


    // Sentences or sets of sentences can be represnted by a single term using the 
    // #and, #or and #not functors. This function decodes such notation into a set of sentences:
    static termToSentences(term:Term) : Sentence[]
    {
        var sentences:Sentence[] = [];
        var sentenceTerms:Term[] = [];
        while(term.functor.name == "#and") {
            var t1:Term = (<TermTermAttribute>term.attributes[0]).term;
            var t2:Term = (<TermTermAttribute>term.attributes[1]).term;
            if (t1.functor.name == "#and") {
                sentenceTerms.push((<TermTermAttribute>term.attributes[1]).term);
                term = (<TermTermAttribute>term.attributes[0]).term;
            } else if (t2.functor.name == "#and") {
                sentenceTerms.push((<TermTermAttribute>term.attributes[0]).term);
                term = (<TermTermAttribute>term.attributes[1]).term;
            } else {
                sentenceTerms.push((<TermTermAttribute>term.attributes[0]).term);
                term = (<TermTermAttribute>term.attributes[1]).term;
            }
        }
        if (term!=null) sentenceTerms.push(term);

        for(let sentenceTerm of sentenceTerms) {
            var terms:Term[] = [];
            var sign:boolean[] = [];
            while(sentenceTerm.functor.name == "#or") {
                var tmp:Term = (<TermTermAttribute>sentenceTerm.attributes[0]).term;
                if (tmp.functor.name == "#not") {
                    sign.push(false);
                    tmp = (<TermTermAttribute>tmp.attributes[0]).term;
                } else {
                    sign.push(true);
                }
                terms.push(tmp);
                sentenceTerm = (<TermTermAttribute>sentenceTerm.attributes[1]).term;
            }
            var tmp:Term = sentenceTerm;
            if (tmp.functor.name == "#not") {
                sign.push(false);
                tmp = (<TermTermAttribute>tmp.attributes[0]).term;
            } else {
                sign.push(true);
            }
            terms.push(tmp);
            sentences.push(new Sentence(terms, sign));
        }

//        console.log("termToSentences: " + sentences);
        return sentences;
    }


    toString() : string
    {
        return this.toStringInternal([],[]);
    }


    toStringXML() : string
    {
        return this.toStringXMLInternal([],[]);
    }


    toStringInternal(variables:TermAttribute[], variableNames:string[]) : string
    {
        var str:string = this.functor.name + "(";
        var first:boolean = true;
        for(let a of this.attributes) {
            if (first) {
                first = false;
            } else {
                str += ", ";                
            }
            if (variables.indexOf(a) == -1) {
                str += Term.variableNameForPrinting(a, variables, variableNames);
                str += ":" + a.toStringInternal(variables, variableNames);
            } else {
                str += Term.variableNameForPrinting(a, variables, variableNames);
            }
        }
        return str + ")";
    }


    toStringXMLInternal(variables:TermAttribute[], variableNames:string[]) : string
    {
        var str:string = this.functor.name + "(";
        var first:boolean = true;
        for(let a of this.attributes) {
            if (first) {
                first = false;
            } else {
                str += ", ";                
            }
            if (variables.indexOf(a) == -1) {
                str += Term.variableNameForPrinting(a, variables, variableNames);
                str += ":" + a.toStringXMLInternal(variables, variableNames);
            } else {
                str += Term.variableNameForPrinting(a, variables, variableNames);
            }
        }
        return str + ")";
    }    


    static variableNameForPrinting(a:TermAttribute, variables:TermAttribute[], variableNames:string[]) : string
    {
        var idx:number = variables.indexOf(a);
        if (idx >= 0)  return variableNames[idx];

        variables.push(a);
        var basevname:string = null;
        var vname:string = null;
        if (a instanceof VariableTermAttribute) basevname = (<VariableTermAttribute>a).name;               
        if (basevname == null) basevname = "V"+(variables.length-1);
        vname = basevname;
        var idx2:number = 0;
        var nameAllowed:boolean = true;
        do {
            nameAllowed = true;
            if (variableNames.lastIndexOf(vname) != -1) {
                nameAllowed = false;
            } else {
                for(let v2 of variables) {
                    var vname2:string = null;
                    if (!(v2 instanceof VariableTermAttribute)) continue;
                    vname2 = (<VariableTermAttribute>v2).name;
                    if (vname == vname2) {
                        nameAllowed = false;
                    }
                }
            }
            if (!nameAllowed) {
                vname = basevname + "_" + idx2;
                idx2++;
            }
        }while(!nameAllowed);
        variableNames.push(vname);
        return vname;
    }


    static fromString(str:string, o:Ontology) : Term
    {
        return Term.fromStringInternal(str, o, [], []);
    }


    static fromStringInternal(str:string, o:Ontology, 
                              variableNames:string[], variableValues:TermAttribute[]) : Term
    {
        var tmp:string = "";
        var len:number = str.length;
        var idx:number = 0;
        var c:string = null;
        var term:Term = new Term(null,[]);
        var state:number = 0;

//        console.log("Term.fromStringInternal: " + str);

        // parse sort string (potentially with variable name):
        while(idx<len) {
            c = str.charAt(idx);
            idx++;
            if (c==':') {
                if (state == 1) {
                    console.error("Term.fromString: two variable names!");
                    return null;
                }
                // there was a variable name!
                if (tmp == "") {
                    console.error("Term.fromString: empty variable name!");
                    return null;
                }
                variableNames.push(tmp);
                variableValues.push(new TermTermAttribute(term));
                tmp = "";
                state = 1;
            } else if (c=='(') {
                term.functor = o.getSort(tmp);
                if (term.functor == null) {
                    console.error("Term.fromString: unknown sort " + tmp + "!");
                    return null;
                }
                break;
            } else {
                tmp += c;
            }
        }
        if (idx==len) {
            console.error("Term.fromString: reached end of string and found no parenthesis!");
            return null;
        }

        // separate the strings corresponding to each attribute:
        var attributeStrings:string[] = [];
        var parenthesis:number = 0;
        var squareBrackets:number = 0;
        var quotation:boolean = false;
        var expectingAttribute:boolean = false;
        tmp = "";
        while(idx<len) {
            c = str.charAt(idx);
            idx++;
            if (parenthesis == 0 &&
                squareBrackets == 0 &&
                !quotation &&
                c == ',') {
                tmp = tmp.trim();
                if (tmp == "") {
                    console.error("Term.fromString: empty attribute string!");
                    return null;
                }
                attributeStrings.push(tmp);
                tmp = "";
                expectingAttribute = true;
            } else if (parenthesis == 0 &&
                       squareBrackets == 0 &&
                       !quotation &&
                       c == ')') {
                tmp = tmp.trim();
                if (tmp == "" && expectingAttribute) {
                    console.error("Term.fromString: empty attribute string!");
                    return null;
                } 
                if (tmp != "") {
                    attributeStrings.push(tmp);
                    tmp = "";
                }
                break;
            } else {
                if (c == "\'") quotation = !quotation;
                if (!quotation) { 
                    if (c == '(') parenthesis++;
                    if (c == ')') parenthesis--;
                    if (c == '[') squareBrackets++;
                    if (c == ']') squareBrackets--;
                }
                tmp += c;
            }
        }
        tmp = tmp.trim();
//        console.log("str: " + str + "\np: " + parenthesis + ", sb: " + squareBrackets + ", q: " + quotation);
//        console.log("attributeStrings: " + attributeStrings);
//        console.log("tmp: " + tmp);
        if (tmp != "") {
            console.error("Term.fromString: missing closing parenthesis! " + str);
            return null;            
        }
        if (quotation) {
            console.error("Term.fromString: term ends inside of a quotation!");
            return null;
        }
        if (parenthesis > 0) {
            console.error("Term.fromString: missing closing parenthesis!");
            return null;
        }
        if (squareBrackets > 0) {
            console.error("Term.fromString: missing closing square bracket!");
            return null;
        }
        if (str.substring(idx).trim()!="") {
            console.error("Term.fromString: extra characters found after term! " + str.substring(idx));
            return null;
        }
//        console.log("attribute strings("+attributeStrings.length+"): " + attributeStrings);

        for(let attributeString of attributeStrings)
        {
            let att:TermAttribute = Term.parseAttribute(attributeString, o, variableNames, variableValues);
            if (att == null) return null;
            term.attributes.push(att);
        }

        return term;
    }


    static parseAttribute(attributeString:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : TermAttribute
    {
//            console.log("attributeString: " + attributeString);
        let tmp:string = "";
        let idx:number = 0;
        let len:number = attributeString.length;
        while(idx<len) {
            let c:string = attributeString.charAt(idx);
            idx++;
            if (c == '[') {
                if (tmp == "") {
                    // [sort]
                    var idx2:number = attributeString.indexOf("]");
                    tmp = attributeString.substring(idx,idx2);
                    if (attributeString.substring(idx2+1).trim() != "") {
                        console.error("Term.parseAttribute: extra characters found after VariableTermAttribute!");
                        return null;
                    }
                    var a_sort:Sort = o.getSort(tmp);
                    if (a_sort == null) {
                        console.error("Term.parseAttribute: unknown sort " + tmp);
                        return null;
                    }
                    return new VariableTermAttribute(a_sort, null);
                } else {
                    console.error("Term.parseAttribute: square bracket directly after a variable name! " + tmp);
                    return null;
                }
            } else if (c == "\'") {
                if (tmp == "") {
                    // 'constant'[sort]
                    var foundQuote:boolean = false;
                    var idx2:number = idx;
                    while(idx2<len) {
                        if (attributeString.charAt(idx2) == "\'") {
                            foundQuote = true;
                            break;
                        }
                        idx2++;
                    }
                    if (!foundQuote) {
                        console.error("Term.parseAttribute: unclosed quote in attribute!");
                        return null;
                    }
                    var idx3:number = attributeString.substring(idx2).indexOf("[");
                    var idx4:number = attributeString.substring(idx2).indexOf("]");
                    tmp = attributeString.substring(idx,idx2);
                    var tmp2:string = attributeString.substring(idx2).substring(idx3+1,idx4);
                    var a_sort:Sort = o.getSort(tmp2);
                    if (a_sort == null) {
                        console.error("Term.parseAttribute: unknown sort " + tmp2);
                        return null;
                    }
                    if (tmp.trim()!="" && !isNaN(Number(tmp))) {
                        return new ConstantTermAttribute(Number(tmp), a_sort);
                    } else {                            
                        return new ConstantTermAttribute(tmp.replace("\\039","'"), a_sort);
                    }
                } else {
                    console.error("Term.parseAttribute: quote starts in the middle of a name! " + attributeString);
                    return null;
                }
            } else if (c == ":") {
                if (tmp == "") {
                    console.error("Term.parseAttribute: empty variable name!");
                    return null;
                } else {
                    if (attributeString.charAt(idx)=="[") {
                        // VariableName:[sort]
                        var idx2:number = attributeString.indexOf("]");
                        var tmp2:string = attributeString.substring(idx+1,idx2);
                        if (attributeString.substring(idx2+1).trim() != "") {
                            console.error("Term.parseAttribute: extra characters found after VariableTermAttribute!");
                            return null;
                        }
                        var a_sort:Sort = o.getSort(tmp2);
                        if (a_sort == null) {
                            console.error("Term.parseAttribute: unknown sort " + tmp2);
                            return null;
                        }
                        var a_term:TermAttribute = new VariableTermAttribute(a_sort, tmp);
                        variableNames.push(tmp);
                        variableValues.push(a_term);
                        return a_term;
                    } else if (attributeString.charAt(idx)=="\'") {
                        // VariableName:'constant'[sort]
                        variableNames.push(tmp);
                        attributeString = attributeString.substring(idx);
                        idx = 1;
                        var foundQuote:boolean = false;
                        var idx2:number = idx;
                        len = attributeString.length;
                        while(idx2<len) {
                            if (attributeString.charAt(idx2) == "\'") {
                                foundQuote = true;
                                break;
                            }
                            idx2++;
                        }
                        if (!foundQuote) {
                            console.error("Term.parseAttribute: unclosed quote in attribute!");
                            return null;
                        }
                        var idx3:number = attributeString.substring(idx2).indexOf("[");
                        var idx4:number = attributeString.substring(idx2).indexOf("]");
                        tmp = attributeString.substring(idx,idx2);
                        var tmp2:string = attributeString.substring(idx2).substring(idx3+1,idx4);
                        var a_sort:Sort = o.getSort(tmp2);
                        if (a_sort == null) {
                            console.error("Term.parseAttribute: unknown sort " + tmp2);
                            return null;
                        }
                        var a_term:TermAttribute = null;
                        if (tmp.trim()!="" && !isNaN(Number(tmp))) {
                            a_term = new ConstantTermAttribute(Number(tmp), a_sort);
                        } else {
                            a_term = new ConstantTermAttribute(tmp.replace("\\039","'"), a_sort);
                        }
                        variableValues.push(a_term);
                        return a_term;

                    } else {
                        // VariableName:functor( ... )
                        var a_term:TermAttribute = new TermTermAttribute(Term.fromStringInternal(attributeString, o, variableNames, variableValues));
                        if (a_term == null) return null;
                        return a_term;
                        break;
                    }
                }

            } else if (c == "(") {
                // functor( ... )
                var a_term:TermAttribute = new TermTermAttribute(Term.fromStringInternal(attributeString, o, variableNames, variableValues));
                if (a_term == null) return null;
                return a_term;
            } 
            tmp += c;
        }

        // VariableName
        idx = variableNames.indexOf(tmp);
        if (idx == -1) {
            var a_sort:Sort = o.getSort("any");
            var a_term:TermAttribute = new VariableTermAttribute(a_sort, tmp);
            variableNames.push(tmp);
            variableValues.push(a_term);
            return a_term;
        } else {
            return variableValues[idx];
        }
    }



    functor:Sort = null;
    attributes:TermAttribute[] = [];
}
