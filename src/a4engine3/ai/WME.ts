var WME_PARAMETER_INTEGER:number = 0;
var WME_PARAMETER_WILDCARD:number = 1;
var WME_PARAMETER_SYMBOL:number = 2;
var WME_PARAMETER_SORT:number = 3;



class WME {
    constructor(functor:string, activation:number)
    {
        this.functor = functor;
        this.activation = activation;
    }


    static fromWME(wme:WME) : WME
    {
        var wme2:WME = new WME(wme.functor, wme.activation);
        for(let i:number = 0;i<wme.parameters.length;i++) {
            wme2.parameters.push(wme.parameters[i]);
            wme2.parameterTypes.push(wme.parameterTypes[i]);
        }
        wme2.startTime = wme.startTime;
        return wme2;
    }

    static fromExpression(exp:Expression, o:Ontology, activation:number) : WME
    {
        var wme:WME = new WME(exp.head, activation);
//        console.log("creating WME from expression: " + exp.toString());
        for(let it of exp.parameters) {
            var tmp:string = it.head;

            if (tmp.charAt(0)=='?') {
                // wildcard:
                if (tmp.length == 1) {
                    wme.parameters.push(0);
                } else {
                    wme.parameters.push(Number(tmp.substring(1)));
                }
                wme.parameterTypes.push(WME_PARAMETER_WILDCARD);
            } else if (tmp.charAt(0)=='\"') {
                // symbol:
                var tmp3:string = tmp.substring(1,tmp.length-1).replace("\\039","\'");
                wme.parameters.push(tmp3);
                wme.parameterTypes.push(WME_PARAMETER_SYMBOL);
            } else if (it.quoted) {
                // symbol:
                var tmp3:string = tmp.replace("\\039","\'");
                wme.parameters.push(tmp3);
                wme.parameterTypes.push(WME_PARAMETER_SYMBOL);
            } else if ((tmp[0]>='0' && tmp[0]<='9') || tmp[0]=='-') {
                // integer:
                wme.parameters.push(Number(tmp));
                wme.parameterTypes.push(WME_PARAMETER_INTEGER);
            } else {
                // sort:
                wme.parameters.push(o.getSort(tmp));
                wme.parameterTypes.push(WME_PARAMETER_SORT);
            }
        }
//        console.log("created WME: " + wme.toString());
        return wme;
    }


    addParameter(p:any, type:number)
    {
        this.parameterTypes.push(type);
        this.parameters.push(p);
        if (p == null) {
            console.error("adding null WME parameter!");
        }
    }


    equivalents(wme:WME) : boolean
    {
        if (this.functor != wme.functor) return false;
        if (this.parameters.length != wme.parameters.length) return false;
        for(let i:number = 0;i<this.parameters.length;i++) {
            if (!this.equivalentParameters(this.parameters[i], this.parameterTypes[i],
                                           wme.parameters[i], wme.parameterTypes[i])) return false;
        }
        return true;
    }


    subsumption(wme:WME) : boolean
    {
        if (this.functor != wme.functor) return false;
        if (this.parameters.length != wme.parameters.length) return false;
        for(let i:number = 0;i<this.parameters.length;i++) {
            switch(this.parameterTypes[i]) {
                case WME_PARAMETER_INTEGER:
                    if (wme.parameterTypes[i] != WME_PARAMETER_INTEGER) return false;
                    if (this.parameters[i] != wme.parameters[i]) return false;
                    break;
                case WME_PARAMETER_SYMBOL:
                    if (wme.parameterTypes[i] != WME_PARAMETER_SYMBOL) return false;
                    if (this.parameters[i] != wme.parameters[i]) return false;
                    break;
                case WME_PARAMETER_SORT:
                    if (wme.parameterTypes[i] != WME_PARAMETER_SORT) return false;
                    if (!(<Sort>this.parameters[i]).subsumes(<Sort>wme.parameters[i])) return false;
                    break;
                case WME_PARAMETER_WILDCARD:
                    break;
            }
        }
        return true;
    }


    relativeSubsumption(wme:WME, m:AIMemory) : boolean
    {
        if (this.functor!=wme.functor) return null;
        if (this.parameters.length!=wme.parameters.length) return null;
        for(let i:number = 0;i<this.parameters.length;i++) {
            switch(this.parameterTypes[i]) {
                case WME_PARAMETER_INTEGER:
                    if (wme.parameterTypes[i] != WME_PARAMETER_INTEGER) return false;
                    if (this.parameters[i] != wme.parameters[i]) return false;
                    break;

                case WME_PARAMETER_SYMBOL:
                    if (wme.parameterTypes[i]!=WME_PARAMETER_SYMBOL) return false;
                    if (this.parameters[i] != wme.parameters[i]) return false;
                    break;

                case WME_PARAMETER_SORT:
                    if (wme.parameterTypes[i] == WME_PARAMETER_SORT) {
                        if (!(<Sort>this.parameters[i]).subsumes(<Sort>wme.parameters[i])) return false;
                    } else if (wme.parameterTypes[i] == WME_PARAMETER_INTEGER) {
                        // check for "is_a" wmes:
                        var isaPattern:WME = new WME("is_a", 0);
                        isaPattern.addParameter(wme.parameters[i], wme.parameterTypes[i]);
                        isaPattern.addParameter(0, WME_PARAMETER_WILDCARD);
                        var l:WME[] = m.retrieveSubsumption(isaPattern);
                        var found:boolean = false;
                        for(let isaWME of l) {
                            if (isaWME.parameterTypes[1] == WME_PARAMETER_SORT &&
                                (<Sort>this.parameters[i]).subsumes(<Sort>isaWME.parameters[1])) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) return false;
                    } else if (wme.parameterTypes[i] == WME_PARAMETER_SYMBOL) {
                        // check for "is_a" wmes:
                        var isaPattern:WME = new WME("is_a", 0);
                        isaPattern.addParameter(wme.parameters[i], wme.parameterTypes[i]);
                        isaPattern.addParameter(0, WME_PARAMETER_WILDCARD);
                        var l:WME[] = m.retrieveSubsumption(isaPattern);
                        var found:boolean = false;
                        for(let isaWME of l) {
                            if (isaWME.parameterTypes[1] == WME_PARAMETER_SORT &&
                                (<Sort>this.parameters[i]).subsumes(<Sort>isaWME.parameters[1])) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) return false;
                    } else {
                        // it's a wildcard... no subsumption...
                        return false;
                    }
                    break;
                case WME_PARAMETER_WILDCARD:
                    break;
            }
        }
        return true;
    }


    unification(wme:WME) : WME
    {
        if (this.functor!=(wme.functor)) return null;
        if (this.parameters.length!=wme.parameters.length) return null;
        var unifier:WME = new WME(this.functor,0);
        for(let i:number = 0;i<this.parameters.length;i++) {
            if (this.parameterTypes[i] == WME_PARAMETER_WILDCARD) {
                unifier.addParameter(wme.parameters[i], wme.parameterTypes[i]);
            } else {
                if (wme.parameterTypes[i] == WME_PARAMETER_WILDCARD) {
                    unifier.addParameter(this.parameters[i], this.parameterTypes[i]);
                } else {
                    switch(this.parameterTypes[i]) {
                        case WME_PARAMETER_INTEGER:
                            if (wme.parameterTypes[i]!=WME_PARAMETER_INTEGER ||
                                this.parameters[i]!=wme.parameters[i]) {
                                return null;
                            }
                            unifier.addParameter(this.parameters[i], this.parameterTypes[i]);
                            break;
                        case WME_PARAMETER_SYMBOL:
                            if (wme.parameterTypes[i]!=WME_PARAMETER_SYMBOL ||
                                this.parameters[i] != wme.parameters[i]) {
                                return null;
                            }
                            unifier.addParameter(this.parameters[i], this.parameterTypes[i]);
                            break;
                        case WME_PARAMETER_SORT:
                            if (wme.parameterTypes[i]!=WME_PARAMETER_SORT) {
                                return null;
                            }
                            if ((<Sort>this.parameters[i]).subsumes(<Sort>wme.parameters[i])) {
                                unifier.addParameter(wme.parameters[i], wme.parameterTypes[i]);
                            } else if ((<Sort>wme.parameters[i]).subsumes(<Sort>this.parameters[i])) {
                                unifier.addParameter(this.parameters[i], this.parameterTypes[i]);
                            } else {
                                return null;
                            }
                            break;
                    }
                }
            }
        }
        return unifier;
    }


    equivalentParameters(p1:any, t1:number, p2:any, t2:number) : boolean
    {
        if (t1!=t2) return false;
        return p1 == p2;
    }

        
    toString() : string
    {
        var buffer:string = "";
        var buffer:string = this.functor + "(";

        for(let i:number = 0;i<this.parameters.length;i++) {
            if (i>0) buffer += ",";
            if (this.parameterTypes[i] == WME_PARAMETER_INTEGER) {
                buffer+=this.parameters[i];
            } else if (this.parameterTypes[i] == WME_PARAMETER_SYMBOL) {
                var tmp:string = (<string>this.parameters[i]).replace("\'","\\039");
                buffer+="'"+tmp+"'";
            } else if (this.parameterTypes[i] == WME_PARAMETER_SORT) {
                buffer+=(<Sort>this.parameters[i]).name;
            } else if (this.parameterTypes[i]==WME_PARAMETER_WILDCARD) {
                if (this.parameters[i] == 0) {
                    buffer += "?";
                } else {
                    buffer += "?" + this.parameters[i];
                }
            }
        }
        if (this.parameters.length != 0) buffer +=",";
        return buffer + this.activation + ")";
    }


    toStringNoActivation() : string
    {
        var buffer:string = this.functor + "(";

        for(let i:number = 0;i<this.parameters.length;i++) {
            if (i>0) buffer += ",";
            if (this.parameterTypes[i] == WME_PARAMETER_INTEGER) {
                buffer+=this.parameters[i];
            } else if (this.parameterTypes[i] == WME_PARAMETER_SYMBOL) {
                var tmp:string = (<string>this.parameters[i]).replace("\'","\\039");
                buffer+="'"+tmp+"'";
            } else if (this.parameterTypes[i] == WME_PARAMETER_SORT) {
                buffer+=(<Sort>this.parameters[i]).name;
            } else if (this.parameterTypes[i]==WME_PARAMETER_WILDCARD) {
                if (this.parameters[i] == 0) {
                    buffer += "?";
                } else {
                    buffer += "?" + this.parameters[i];
                }
            }
        }
        return buffer + ")";
    }


    functor:string;
    parameterTypes:number[] = [];
    parameters:any[] = [];
    sourceObject:A4Object = null;   // for perception WMEs, we cache here the object that triggered the creation of this WME
                                    // (notice that this pointer is not safe, since the object might hav disappeared from the
                                    // actual game, so it has to be verified before using it).
    activation:number;
    startTime:number = 0;
}
