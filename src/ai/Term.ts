class Bindings {
    concat(b:Bindings) : Bindings {
        if (b == null) return null;
        let result:Bindings = new Bindings();
        //result.l = this.l.concat(b.l);
        for(let [variable,value] of this.l) {
            result.l.push([variable,value.applyBindings(b)]);
        }
        for(let binding of b.l) {
            let found:boolean = false;
            for(let tmp of result.l) {
                let variable2:VariableTermAttribute = tmp[0];
                let value2:TermAttribute = tmp[1];
                if (binding[0] == variable2) {
                    let cmp:number = Term.equalsNoBindingsAttribute(binding[1], value2);
                    if (cmp == 1) {
                        found = true;
                    } else if (cmp == -1) {
                        return null;
                    } else {
                        found = true;
                        tmp[1] = value2;                       
                    }
                }
            }
            if (!found) result.l.push(binding);
        }
        return result;   
    }


    removeUselessBindings(variables:VariableTermAttribute[])
    {
        let new_l:[VariableTermAttribute,TermAttribute][] = [];
        for(let [variable,value] of this.l) {
            if (variables.indexOf(variable) != -1) {
                new_l.push([variable, value.applyBindings(this)])
            }
        }
        this.l = new_l;
    }


    removeUselessBindingsSentence(s:Sentence, variables:VariableTermAttribute[])
    {
        let s_variables:VariableTermAttribute[] = s.getAllVariables();
        let new_l:[VariableTermAttribute,TermAttribute][] = [];
        for(let [variable,value] of this.l) {
            if (s_variables.indexOf(variable) != -1 ||
                variables.indexOf(variable) != -1) {
                new_l.push([variable, value.applyBindings(this)])
            }
        }
        this.l = new_l;
    }


    getValueForVariableName(vName:string) : TermAttribute
    {
        for(let b of this.l) {
            if (b[0].name == vName) return b[1];
        }
        return null;
    }


    toString() : string
    {
        let str:string = "[ ";
        for(let b of this.l) {
            let str2:string = "(";
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
        let str:string = "[ ";
        for(let b of this.l) {
            let str2:string = "(";
            str2 += Term.variableNameForPrinting(b[0], variables, variableNames);
            str2 += " = " + Term.variableNameForPrinting(b[1], variables, variableNames) + ":" + b[1].toStringInternal(variables, variableNames) + ")";
            str += str2 + " ";
        }
        return str + "]";
    }


    equals(b:Bindings) {
        if (this.l.length != b.l.length) return false;

        for(let [variable,value] of this.l) {
            let found:boolean = false;
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
            let found:boolean = false;
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

    abstract applyBindings_internal(bindings:Bindings, map:[Term, TermAttribute][]) : TermAttribute

    abstract clone(map:[TermAttribute,TermAttribute][]) : TermAttribute;

    abstract cloneKeepingVariables(map:[TermAttribute,TermAttribute][]) : TermAttribute;


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

    // for debugging purposes, remove after I'm done:
    ID:number = TermAttribute.next_ID++;
    static next_ID:number = 0;
}


class ConstantTermAttribute extends TermAttribute {
    constructor(value:any, sort:Sort) {
        super(sort);
        this.value = value;
        // debug:
        // if (sort.name == "#id") {
        //     if (typeof value === 'string') {
        //         // ...
        //     } else {
        //         console.error("ID is not a string!");
        //     }
        // }
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


    applyBindings_internal(bindings:Bindings, map:[Term, TermAttribute][]) : TermAttribute
    {
        return this;
    }


    clone(map:[TermAttribute,TermAttribute][]) : TermAttribute
    {
        return this;    // this is a constant, no need to clone
    }

    cloneKeepingVariables(map:[TermAttribute,TermAttribute][]) : TermAttribute
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


    applyBindings_internal(bindings:Bindings, map:[Term, TermAttribute][]) : TermAttribute
    {
        for(let b of bindings.l) {
            if (b[0] == this) {
                return b[1].applyBindings_internal(bindings, map);
            }
        }
        return this;
    }


    clone(map:[TermAttribute,TermAttribute][]) : TermAttribute
    {
        for(let [v1,v2] of map) {
            if (v1 == this) return v2;
        }
        let v:VariableTermAttribute = new VariableTermAttribute(this.sort, this.name);
        map.push([this, v]);
        return v;
    }


    cloneKeepingVariables(map:[TermAttribute,TermAttribute][]) : TermAttribute
    {
        return this;
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


    applyBindings_internal(bindings:Bindings, map:[Term, TermAttribute][]) : TermAttribute
    {
        return this.term.applyBindings_internal(bindings, map);
    }


    clone(map:[TermAttribute,TermAttribute][]) : TermAttribute
    {
        for(let [v1,v2] of map) {
            if (v1 == this) return v2;
        }
        let v:TermTermAttribute = new TermTermAttribute(this.term.clone(map));
        map.push([this, v]);
        return v;
    }


    cloneKeepingVariables(map:[TermAttribute,TermAttribute][]) : TermAttribute
    {
        for(let [v1,v2] of map) {
            if (v1 == this) return v2;
        }
        let v:TermTermAttribute = new TermTermAttribute(this.term.cloneKeepingVariables(map));
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
            let att1:TermAttribute = this.attributes[i];
            let att2:TermAttribute = t.attributes[i];

            if (!Term.unifyAttribute(att1, att2, occursCheck, bindings)) return false;
        }

        return true;
    }


    unifySameFunctor(t:Term, occursCheck:boolean, bindings:Bindings) : boolean
    {
        // if they have a different number of attribetus -> return false
        if (this.attributes.length != t.attributes.length) return false;

        if (this.functor != t.functor) return false;

        // for each attribute:
        for(let i:number = 0;i<this.attributes.length;i++) {
            let att1:TermAttribute = this.attributes[i];
            let att2:TermAttribute = t.attributes[i];

            if (!Term.unifyAttributeSameFunctor(att1, att2, occursCheck, bindings)) return false;
        }

        return true;
    }


    unifyIgnoringFirstfunctor(t:Term, occursCheck:boolean, bindings:Bindings) : boolean
    {
        // if they have a different number of attribetus -> return false
        if (this.attributes.length != t.attributes.length) return false;

        // for each attribute:
        for(let i:number = 0;i<this.attributes.length;i++) {
            let att1:TermAttribute = this.attributes[i];
            let att2:TermAttribute = t.attributes[i];

            if (!Term.unifyAttributeSameFunctor(att1, att2, occursCheck, bindings)) return false;
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


    static unifyAttributeSameFunctor(att1:TermAttribute, att2:TermAttribute, occursCheck:boolean, bindings:Bindings) : boolean
    {
        if (att1 == att2) return true;

        // - first of all, apply bindings (in order) if any is a variable to construct temporary terms
        if (att1 instanceof VariableTermAttribute) {
            for(let pair of bindings.l) {
                if (pair[0] == att1) {
                    return Term.unifyAttributeSameFunctor(pair[1], att2, occursCheck, bindings);
                }
            }
        }
        if (att2 instanceof VariableTermAttribute) {
            for(let pair of bindings.l) {
                if (pair[0] == att2) {
                    return this.unifyAttributeSameFunctor(att1, pair[1], occursCheck, bindings);
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
                if (!att1.term.unifySameFunctor(att2.term, occursCheck, bindings)) return false;
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


    subsumes(t:Term, occursCheck:boolean, bindings:Bindings) : boolean
    {
        if (this.functor.name == "$and" ||
            t.functor.name == "#and") {
            let tl1:TermAttribute[];
            let tl2:TermAttribute[];

            if (this.functor.name == "#and") {
                tl1 = Term.elementsInAndList(this);
            } else {
                tl1 = [new TermTermAttribute(this)];
            }
            if (t.functor.name == "#and") {
                tl2 = Term.elementsInAndList(t);
            } else {
                tl2 = [new TermTermAttribute(t)];
            }

            for(let t1 of tl1) {
                let found:boolean = false;
                for(let t2 of tl2) {
                    let bl:number = bindings.l.length;
                    if ((t1 instanceof TermTermAttribute) &&
                        (t2 instanceof TermTermAttribute)) {
                        if ((<TermTermAttribute>t1).term.subsumesInternal((<TermTermAttribute>t2).term, occursCheck, bindings)) {
                            found = true;
                            break;
                        }
                    } else {
                        if (Term.subsumesAttribute(t1, t2, occursCheck, bindings)) {
                            found = true;
                            break;
                        }
                    }
                    bindings.l.length = bl;    // remove all the bindings that were created in the failed subsumption attempt
                }
                if (!found) return false;
            }

            return true;
        } else {
            return this.subsumesInternal(t, occursCheck, bindings);
        }
    }


    subsumesInternal(t:Term, occursCheck:boolean, bindings:Bindings) : boolean
    {
        // if they have a different number of attribetus -> return false
        if (this.attributes.length != t.attributes.length) return false;

        // if functors do not match (one should subsume the other) -> return false
        if (!t.functor.is_a(this.functor)) return false;

        // for each attribute:
        for(let i:number = 0;i<this.attributes.length;i++) {
            let att1:TermAttribute = this.attributes[i];
            let att2:TermAttribute = t.attributes[i];

            if (!Term.subsumesAttribute(att1, att2, occursCheck, bindings)) return false;
        }

        return true;
    }


    static subsumesAttribute(att1:TermAttribute, att2:TermAttribute, occursCheck:boolean, bindings:Bindings) : boolean
    {
        if (att1 == att2) return true;

        // - first of all, apply bindings (in order) if any is a variable to construct temporary terms
        if (att1 instanceof VariableTermAttribute) {
            for(let pair of bindings.l) {
                if (pair[0] == att1) {
                    return Term.subsumesAttribute(pair[1], att2, occursCheck, bindings);
                }
            }
        }
        if (att2 instanceof VariableTermAttribute) {
            for(let pair of bindings.l) {
                if (pair[0] == att2) {
                    return this.subsumesAttribute(att1, pair[1], occursCheck, bindings);
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
                if (!att1.term.subsumes(att2.term, occursCheck, bindings)) return false;
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
            return false;
        }

        return true;
    }


    equalsBindings(t:Term) : Bindings
    {
        let b:Bindings = new Bindings();
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
            let att1:TermAttribute = this.attributes[i];
            let att2:TermAttribute = t.attributes[i];

            if (!Term.equalsAttribute(att1, att2, bindings)) return false;
        }

        return true;
    }


    // same as equals, but considers the #and functor in a spceial way, so that #and(X, #and(Y,Z)) is the same as #and(#and(X, Y), Z)
    equalsConsideringAndList(t:Term) : boolean
    {
        return this.equalsConsideringAndListInternal(t, new Bindings());
    }


    equalsConsideringAndListInternal(t:Term, bindings:Bindings) : boolean
    {
        // if they have a different number of attributes -> return false
        if (this.attributes.length != t.attributes.length) return false;

        // if functors do not match -> return false
        if (this.functor != t.functor) return false;

        if (this.functor.name == "#and" ||
            this.functor.name == "#list") {
            // special case!
            let tl1:TermAttribute[] = Term.elementsInList(this, this.functor.name);
            let tl2:TermAttribute[] = Term.elementsInList(t, this.functor.name);

            if (tl1.length != tl2.length) return false;
            for(let t1 of tl1) {
                let found:TermAttribute = null;
                for(let t2 of tl2) {
                    let bl:number = bindings.l.length;
                    if (Term.equalsAttributeConsideringAndList(t1,t2,bindings)) {
                        found = t2;
                        break;
                    }
                    bindings.l.length = bl;    // remove all the bindings that were created 
                }
                if (found == null) return false;
                tl2.splice(tl2.indexOf(found),1);
            }
        } else {
            // for each attribute:
            for(let i:number = 0;i<this.attributes.length;i++) {
                let att1:TermAttribute = this.attributes[i];
                let att2:TermAttribute = t.attributes[i];

                if (!Term.equalsAttributeConsideringAndList(att1, att2, bindings)) return false;
            }
        }

        return true;
    }


    static elementsInAndList(list:Term) : TermAttribute[]
    {
        return Term.elementsInList(list, "#and");
    }


    static elementsInListList(list:Term) : TermAttribute[]
    {
        return Term.elementsInList(list, "#list");
    }

    
    static elementsInList(list:Term, listFunctor:string) : TermAttribute[]
    {
        let output:TermAttribute[] = [];
        if (list.functor.name == listFunctor) {
            for(let i = 0;i<list.attributes.length;i++) {
                if ((list.attributes[i] instanceof TermTermAttribute) &&
                    (<TermTermAttribute>list.attributes[i]).term.functor.name == listFunctor) {
                    output = output.concat(Term.elementsInList((<TermTermAttribute>(list.attributes[i])).term, listFunctor));
                } else {
                    output.push(list.attributes[i]);
                }
            }
        } else {
            output.push(new TermTermAttribute(list));
        }
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
            let found:boolean = false;
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


    static equalsAttributeConsideringAndList(att1:TermAttribute, att2:TermAttribute, bindings:Bindings) : boolean
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
            return att1.term.equalsConsideringAndListInternal(att2.term, bindings);
        }

        // - if one of them is a variable that does not occur inside the other (occurs check) -> add binding
        if (att1 instanceof VariableTermAttribute &&
            att2 instanceof VariableTermAttribute) {
            if (att1.sort != att2.sort) return false;
            let found:boolean = false;
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
        let result:number = 1;
        for(let i:number = 0;i<this.attributes.length;i++) {
            let att1:TermAttribute = this.attributes[i];
            let att2:TermAttribute = t.attributes[i];

            let tmp:number = Term.equalsNoBindingsAttribute(att1, att2);
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
        } else if (att1 instanceof TermTermAttribute) {
            if (att2 instanceof TermTermAttribute) {
                return att1.term.equalsNoBindings(att2.term);
            } else if (att2 instanceof ConstantTermAttribute) {
                return -1;
            } else {
                return 0;
            }
        } else /*if (att1 instanceof VariableTermAttribute)*/ {
            if (att2 instanceof VariableTermAttribute) {
                //if (att1 == att2) return 1;
                if (att1.sort == att2.sort) return 1;
                return 0;
            } else {
                return 0;
            }
        }
    }    



    /*
    1: equals
    0: cannot decide
    -1: different
    */
    subsumesNoBindings(t:Term) : number
    {
        // if they have a different number of attribetus -> return false
        if (this.attributes.length != t.attributes.length) return -1;

        // if functors do not match -> return false
        if (!this.functor.subsumes(t.functor)) return -1;

        // for each attribute:
        let result:number = 1;
        for(let i:number = 0;i<this.attributes.length;i++) {
            let att1:TermAttribute = this.attributes[i];
            let att2:TermAttribute = t.attributes[i];

            let tmp:number = Term.subsumesNoBindingsAttribute(att1, att2);
            if (tmp==-1) return -1;
            if (tmp==0 && result==1) result = 0;
        }

        return result;
    }


    // return values:
    // 1: true
    // -1: false
    // 0: could unify, but they are not identical
    static subsumesNoBindingsAttribute(att1:TermAttribute, att2:TermAttribute) : number
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
                return att1.term.subsumesNoBindings(att2.term);
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
        return (<TermTermAttribute>this.applyBindings_internal(bindings, [])).term;
    }


    applyBindings_internal(bindings:Bindings, map:[Term, TermAttribute][]) : TermAttribute
    {
        for(let [v1,v2] of map) {
            if (v1 == this) return v2;
        }
        let t:Term = new Term(this.functor, []);
        let t_a:TermTermAttribute = new TermTermAttribute(t);
        map.push([this, t_a]);
        for(let att of this.attributes) {
            let att2:TermAttribute = att.applyBindings_internal(bindings, map);
            t.attributes.push(att2);
        }
        t_a.sort = t_a.term.functor;

        return t_a;
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
        let attributes:TermAttribute[] = [];
        for(let a of this.attributes) {
            attributes.push(a.clone(map));
        }
        return new Term(this.functor, attributes);
    }


    cloneKeepingVariables(map:[TermAttribute,TermAttribute][]) : Term
    {
        let attributes:TermAttribute[] = [];
        for(let a of this.attributes) {
            attributes.push(a.cloneKeepingVariables(map));
        }
        return new Term(this.functor, attributes);
    }


    // Sentences or sets of sentences can be represented by a single term using the 
    // #and, #or and #not functors. This function decodes such notation into a set of sentences:
    static termToSentences(term:Term, o:Ontology) : Sentence[]
    {
        let sentences:Sentence[] = [];

        // First thing is to convert to CNF, which has 2 steps:
        term = Term.convertToCNF(term, o);

        let sentenceTermAs:TermAttribute[] = Term.elementsInList(term, "#and");
  
        for(let sentenceTermA of sentenceTermAs) {
            if (!(sentenceTermA instanceof TermTermAttribute)) return null;
            let sentenceTerm:Term = (<TermTermAttribute>sentenceTermA).term;
            let termTermAs:TermAttribute[] = Term.elementsInList(sentenceTerm, "#or");
    
            let terms:Term[] = [];
            let signs:boolean[] = [];

            for(let termTermA of termTermAs) {
                if (!(termTermA instanceof TermTermAttribute)) return null;
                let termTerm:Term = (<TermTermAttribute>termTermA).term;
                let sign:boolean = true;
                if (termTerm.functor.name == "#not" &&
                    termTerm.attributes.length == 1 &&
                    termTerm.attributes[0] instanceof TermTermAttribute) {
                    termTerm = (<TermTermAttribute>termTerm.attributes[0]).term;
                    sign = false;
                }
                // turn "!=" into a negated "="
                if (termTerm.functor.name == "!=") {
                    termTerm = new Term(o.getSort("="), termTerm.attributes);
                    sign = !sign;
                }
                terms.push(termTerm);
                signs.push(sign);
            }



            sentences.push(new Sentence(terms, signs));
        }

//        console.log("termToSentences: " + sentences);
        return sentences;
    }


    static convertToCNF(term:Term, o:Ontology) : Term
    {
        // Step 1: bring the #not inwards:
        term = Term.bringNotInwards(term, o);

        // Step 2: apply distributive property to turn the expression into a conjunction of disjunctions:
        term = Term.applyDistributive(term, o);

        return term;
    }


    static bringNotInwards(term:Term, o:Ontology) : Term
    {
        if (term.functor.name == "#not" && 
            term.attributes.length == 1 &&
            term.attributes[0] instanceof TermTermAttribute) {
            let subterm:Term = (<TermTermAttribute>term.attributes[0]).term;
            if (subterm.functor.name == "#or") {
                let term2:Term = new Term(o.getSort("#and"), []);
                for(let att of subterm.attributes) {
                    if (att instanceof TermTermAttribute) {
                        term2.attributes.push(new TermTermAttribute(
                                                Term.bringNotInwards(new Term(term.functor,
                                                         [new TermTermAttribute((<TermTermAttribute>att).term)]), o)));
                    } else {
                        term2.attributes.push(new TermTermAttribute(new Term(term.functor, [att])));
                    }
                }
                return term2;
            } else if (subterm.functor.name == "#and") {
                let term2:Term = new Term(o.getSort("#or"), []);
                for(let att of subterm.attributes) {
                    if (att instanceof TermTermAttribute) {
                        term2.attributes.push(new TermTermAttribute(
                                                Term.bringNotInwards(new Term(term.functor,
                                                  [new TermTermAttribute((<TermTermAttribute>att).term)]), o)));
                    } else {
                        term2.attributes.push(new TermTermAttribute(new Term(term.functor, [att])));
                    }
                }
                return term2;
            } else if (subterm.functor.name == "#not" && 
                       term.attributes.length == 1 &&
                       term.attributes[0] instanceof TermTermAttribute) {
                // Two nots in a row, eliminate them!
                return Term.bringNotInwards((<TermTermAttribute>(subterm.attributes[0])).term, o);
            } else {
                return term;
            }
        } else {
            let term2:Term = new Term(term.functor, []);
            for(let att of term.attributes) {
                if (att instanceof TermTermAttribute) {
                    term2.attributes.push(new TermTermAttribute(Term.bringNotInwards((<TermTermAttribute>att).term, o)));
                } else {
                    term2.attributes.push(att);
                }
            }
            return term2;
        }
    }


    // Checks if we need to apply the distributive property to turn a term into CNF:
    static applyDistributive(term:Term, o:Ontology) : Term
    {
        // first make sure all the children are fixed:
        if (term.functor.name == "#and" || term.functor.name == "#or") {
            for(let attribute of term.attributes) {
                if (attribute instanceof TermTermAttribute) {
                    (<TermTermAttribute>attribute).term = Term.applyDistributive((<TermTermAttribute>attribute).term, o);
                }
            }
        }

        // See if we can apply the distribution pattern:  P v (Q ^ R)  -->  (P v Q) ^ (P v R)
        if (term.functor.name == "#or" &&
            term.attributes.length == 2 &&
            (term.attributes[0] instanceof TermTermAttribute) &&
            (term.attributes[1] instanceof TermTermAttribute)) {
            let terma1:Term = (<TermTermAttribute>term.attributes[0]).term;
            let terma2:Term = (<TermTermAttribute>term.attributes[1]).term;
            if (terma1.functor.name == "#and" &&
                terma1.attributes.length == 2) {
                // apply pattern! (Q ^ R) v P  -->  (Q v P) ^ (R v P)
                term.functor = o.getSort("#and");
                term.attributes = [
                    new TermTermAttribute(new Term(o.getSort("#or"),
                        [terma1.attributes[0], 
                         term.attributes[1]])),
                    new TermTermAttribute(new Term(o.getSort("#or"),
                        [terma1.attributes[1], 
                         term.attributes[1]]))];
                return Term.applyDistributive(term, o);
            } else if (terma2.functor.name == "#and") {
                // apply pattern! P v (Q ^ R)  -->  (P v Q) ^ (P v R)
                term.functor = o.getSort("#and");
                term.attributes = [
                    new TermTermAttribute(new Term(o.getSort("#or"),
                        [term.attributes[0],
                         terma2.attributes[0]])),
                    new TermTermAttribute(new Term(o.getSort("#or"),
                        [term.attributes[0],
                         terma2.attributes[1]]))];
                return Term.applyDistributive(term, o);
            }
        }

        return term;
    }    


    static sentencesToTerm(s_l:Sentence[], o:Ontology) : Term
    {
        let term:Term = null;

        for(let i:number = 0; i<s_l.length; i++) {
            let s:Sentence = s_l[i];
            let term2:Term = Term.sentenceToTerm(s, o);
            if (term == null) {
                term = term2;
            } else {
                term = new Term(o.getSort("#and"), [new TermTermAttribute(term), new TermTermAttribute(term2)]);
            }
        }

        return term;
    }


    static sentenceToTerm(sentence:Sentence, o:Ontology) : Term
    {
        let term:Term = null;

        for(let i:number = 0; i<sentence.terms.length; i++) {
            let term2:Term = sentence.terms[i];
            if (!sentence.sign[i]) {
                term2 = new Term(o.getSort("#not"), [new TermTermAttribute(term2)]);
            }
            if (term == null) {
                term = term2;
            } else {
                term = new Term(o.getSort("#or"), [new TermTermAttribute(term), new TermTermAttribute(term2)]);
            }
        }

        return term;
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
        let str:string = this.functor.name + "(";
        let first:boolean = true;
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
        let str:string = this.functor.name + "(";
        let first:boolean = true;
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
        let idx:number = variables.indexOf(a);
        if (idx >= 0)  return variableNames[idx];

        variables.push(a);
        let basevname:string = null;
        let vname:string = null;
        if (a instanceof VariableTermAttribute) basevname = (<VariableTermAttribute>a).name;               
        if (basevname == null) basevname = "V"+(variables.length-1);
        vname = basevname;
        let idx2:number = 0;
        let nameAllowed:boolean = true;
        do {
            nameAllowed = true;
            if (variableNames.lastIndexOf(vname) != -1) {
                nameAllowed = false;
            } else {
                for(let v2 of variables) {
                    let vname2:string = null;
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
        let ta:TermTermAttribute = Term.fromStringInternal(str, o, [], []);
        if (ta == null) {
            console.error("Error parsing term: " + str);
            return null;
        }
        return ta.term;
    }


    static tokenizeStringByAttribute(str:string): string[]
    {
        // separate the strings corresponding to each attribute:
        let idx:number = 0;
        let len:number = str.length;
        let c:string;
        let attributeStrings:string[] = [];
        let parenthesis:number = 0;
        let squareBrackets:number = 0;
        let quotation:boolean = false;
        let expectingAttribute:boolean = false;
        let tmp:string = "";
        while(idx<len) {
            c = str.charAt(idx);
            idx++;
            if (parenthesis == 0 &&
                squareBrackets == 0 &&
                !quotation &&
                c == ',') {
                tmp = tmp.trim();
                if (tmp == "") {
                    console.error("Term.fromString: empty attribute string parsing: " + str);
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
                    console.error("Term.fromString: empty attribute string parsing: " + str);
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
            console.error("Term.fromString: extra characters found after term! " + str.substring(idx) + " in " + str);
            return null;
        }
//        console.log("attribute strings("+attributeStrings.length+"): " + attributeStrings);
        return attributeStrings;
    }


    static fromStringInternal(str:string, o:Ontology, 
                              variableNames:string[], variableValues:TermAttribute[]) : TermTermAttribute
    {
        let tmp:string = "";
        let len:number = str.length;
        let idx:number = 0;
        let c:string = null;
        let term:Term = new Term(null,[]);
        let term_a:TermTermAttribute = new TermTermAttribute(term);
        let state:number = 0;

        // if (str.indexOf("location2") >= 0) console.log("str: " + str);

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
                variableValues.push(term_a);
                tmp = "";
                state = 1;
            } else if (c=='(') {
                term.functor = o.getSort(tmp);
                term_a.sort = term.functor;
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

        let attributeStrings:string[] = Term.tokenizeStringByAttribute(str.substring(idx));
        if (attributeStrings == null) {
            console.error("Term.parseFromString: attributeStrings is null!");
            return null;
        }

        for(let attributeString of attributeStrings)
        {
            let att:TermAttribute = Term.parseAttribute(attributeString, o, variableNames, variableValues);
            if (att == null) {
                console.error("Term.parseFromString: Term.parseAttribute returned null!");
                return null;
            }
            term.attributes.push(att);
        }

        return term_a;
    }


    static parseAttribute(attributeString:string, o:Ontology, variableNames:string[], variableValues:TermAttribute[]) : TermAttribute
    {
        // if (attributeString.indexOf("location2") >= 0) console.log("attributeString: " + attributeString);
        let tmp:string = "";
        let idx:number = 0;
        let len:number = attributeString.length;
        while(idx<len) {
            let c:string = attributeString.charAt(idx);
            idx++;
            if (c == '[') {
                if (tmp == "") {
                    // [sort]
                    let idx2:number = attributeString.indexOf("]");
                    tmp = attributeString.substring(idx,idx2);
                    if (attributeString.substring(idx2+1).trim() != "") {
                        console.error("Term.parseAttribute: extra characters found after VariableTermAttribute! parsing " + attributeString);
                        return null;
                    }
                    if (tmp.indexOf("'") >= 0) {
                        console.error("Term.parseAttribute: unexpected character ' in sort name: " + tmp);
                        return null;
                    }
                    let a_sort:Sort = o.getSort(tmp);
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
                    let foundQuote:boolean = false;
                    let idx2:number = idx;
                    while(idx2<len) {
                        if (attributeString.charAt(idx2) == "\'") {
                            foundQuote = true;
                            break;
                        }
                        idx2++;
                    }
                    if (!foundQuote) {
                        console.error("Term.parseAttribute: unclosed quote in attribute!" + attributeString);
                        return null;
                    }
                    let idx3:number = attributeString.substring(idx2).indexOf("[");
                    let idx4:number = attributeString.substring(idx2).indexOf("]");
                    tmp = attributeString.substring(idx,idx2);
                    let tmp2:string = attributeString.substring(idx2).substring(idx3+1,idx4);
                    if (tmp2.indexOf("'") >= 0) {
                        console.error("Term.parseAttribute: unexpected character ' in sort name: " + tmp2);
                        return null;
                    }
                    let a_sort:Sort = o.getSort(tmp2);
                    if (a_sort == null) {
                        console.error("Term.parseAttribute: unknown sort " + tmp2);
                        return null;
                    }
                    if (tmp.trim()!="" && a_sort.name != "#id" && !isNaN(Number(tmp))) {
                        return new ConstantTermAttribute(Number(tmp), a_sort);
                    } else {                            
                        return new ConstantTermAttribute(tmp.replace("\\039","'"), a_sort);
                    }
                } else {
                    console.error("Term.parseAttribute: quote starts in the middle of a name! parsing " + attributeString);
                    return null;
                }
            } else if (c == ":") {
                if (tmp == "") {
                    console.error("Term.parseAttribute: empty variable name!");
                    return null;
                } else {
                    if (attributeString.charAt(idx)=="[") {
                        // VariableName:[sort]
                        let idx2:number = attributeString.indexOf("]");
                        let tmp2:string = attributeString.substring(idx+1,idx2);
                        if (attributeString.substring(idx2+1).trim() != "") {
                            console.error("Term.parseAttribute: extra characters found after VariableTermAttribute! parsing " + attributeString);
                            return null;
                        }
                        let a_sort:Sort = o.getSort(tmp2);
                        if (a_sort == null) {
                            console.error("Term.parseAttribute: unknown sort " + tmp2);
                            return null;
                        }

                        if (tmp.charAt(tmp.length-1) == "]") {
                            console.error("Variable name ends in ], something went wrong!: " + tmp);
                        }
                        // console.log("   variableName(1): " + tmp);

                        let a_term:TermAttribute = new VariableTermAttribute(a_sort, tmp);
                        if (variableNames.indexOf(tmp) == -1) {
                            variableNames.push(tmp);
                            variableValues.push(a_term);
                        } else {
                            console.error("Repeated definition of variable sort for variable '"+tmp +"' in: " + attributeString);
                            return null;
                        }
                        return a_term;
                    } else if (attributeString.charAt(idx)=="\'") {
                        // VariableName:'constant'[sort]
                        if (variableNames.indexOf(tmp) != -1) {
                            console.error("Repeated definition of variable sort for variable '"+tmp +"' in: " + attributeString);
                            return null;
                        }                        
                        variableNames.push(tmp);
                        attributeString = attributeString.substring(idx);
                        idx = 1;
                        let foundQuote:boolean = false;
                        let idx2:number = idx;
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
                        let idx3:number = attributeString.substring(idx2).indexOf("[");
                        let idx4:number = attributeString.substring(idx2).indexOf("]");
                        tmp = attributeString.substring(idx,idx2);
                        let tmp2:string = attributeString.substring(idx2).substring(idx3+1,idx4);
                        let a_sort:Sort = o.getSort(tmp2);
                        if (a_sort == null) {
                            console.error("Term.parseAttribute: unknown sort " + tmp2);
                            return null;
                        }
                        let a_term:TermAttribute = null;
                        if (tmp.trim()!="" && a_sort.name != "#id" && !isNaN(Number(tmp))) {
                            a_term = new ConstantTermAttribute(Number(tmp), a_sort);
                        } else {
                            a_term = new ConstantTermAttribute(tmp.replace("\\039","'"), a_sort);
                        }
                        variableValues.push(a_term);
                        return a_term;

                    } else {
                        // VariableName:functor( ... )
                        let a_term:TermAttribute = Term.fromStringInternal(attributeString, o, variableNames, variableValues);
                        if (a_term == null) return null;
                        return a_term;
                    }
                }

            } else if (c == "(") {
                // functor( ... )
                let a_term:TermAttribute = Term.fromStringInternal(attributeString, o, variableNames, variableValues);
                if (a_term == null) {
                    console.error("Term.parseAttribute: Term.parseFromString returned null!");            
                    return null;
                }
                return a_term;
            } 
            tmp += c;
        }

        if (tmp.charAt(tmp.length-1) == "]") {
            console.error("Variable name ends in ], something went wrong!: " + tmp);
        }

        // VariableName
//        console.log("variableNames: " + variableNames);
        // console.log("   variableName(2): " + tmp);
        idx = variableNames.indexOf(tmp);
        if (idx == -1) {
//            console.log("   it's a new one");
            let a_sort:Sort = o.getSort("any");
            let a_term:TermAttribute = new VariableTermAttribute(a_sort, tmp);
            variableNames.push(tmp);
            variableValues.push(a_term);
            return a_term;
        } else {
//            console.log("   we had it before");
            return variableValues[idx];
        }
    }



    functor:Sort = null;
    attributes:TermAttribute[] = [];
}
