var WME_HASH_SIZE:number = 1024;
var PERCEPTION_CONTRADICTION_CONSTANT:number = 50;

class AIMemory {
    constructor(freeze_threshold:number)
    {
        this.freezeThreshold = freeze_threshold;
        for(let i:number = 0;i<WME_HASH_SIZE;i++) {
            this.short_term_memory[i] = [];
            this.long_term_memory[i] = [];
        }
    }


    update(steps:number) 
    {
        var toFreeze:WME[] = [];
        var toDelete:WME[] = [];
        for(let wme of this.short_term_memory_plain) {
            if (wme.activation >= this.freezeThreshold ||
                this.time - wme.startTime >= this.freezeThreshold) {
                toFreeze.push(wme);
            } else {
                wme.activation -= steps;
                if (wme.activation <= 0) {
                    toDelete.push(wme);
                }
            }
        }

        for(let wme of toDelete) {
            var hash:number = stringHashFunction(wme.functor) % WME_HASH_SIZE;
            var idx:number = this.short_term_memory[hash].indexOf(wme);
            this.short_term_memory[hash].splice(idx,1);
            idx = this.short_term_memory_plain.indexOf(wme);
            this.short_term_memory_plain.splice(idx,1);
        }
        for(let wme of toFreeze) {
            var hash:number = stringHashFunction(wme.functor) % WME_HASH_SIZE;
            var idx:number = this.short_term_memory[hash].indexOf(wme);
            this.short_term_memory[hash].splice(idx,1);
            idx = this.short_term_memory_plain.indexOf(wme);
            this.short_term_memory_plain.splice(idx,1);
            wme.activation = this.freezeThreshold;
            this.long_term_memory[hash].push(wme);
            this.long_term_memory_plain.push(wme);
        }

        this.time += steps;
    }


    // returns a WME that exactly matches "wme" if it exists, and 0 otherwise
    contains(wme:WME) : WME    
    {
        var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme2.equivalents(wme)) return wme2;
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme2.equivalents(wme)) return wme2;
        }
        return null;    
    }


    // these two functions return the pointer to the WME after adding ("wme" if it did not exist, or the previous WME if it did)
    // (and thus was not added)
    addShortTermWME(wme:WME) : WME 
    {
        var wme2:WME = this.contains(wme);
        if (wme2==null) {
            var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
            this.short_term_memory[hash].push(wme);
            this.short_term_memory_plain.push(wme);
            wme.startTime = this.time;
            return wme;
        } else {
            if (wme2.activation < wme.activation) wme2.activation = wme.activation;
            return wme2;
        }
    }


    addLongTermWME(wme:WME) : WME
    {
        var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme2.equivalents(wme)) {
                // freeze WME:
                var idx:number = this.short_term_memory[hash].indexOf(wme2);
                this.short_term_memory[hash].splice(idx,1);
                idx = this.short_term_memory_plain.indexOf(wme2);
                this.short_term_memory_plain.splice(idx,1);
                wme2.activation = this.freezeThreshold;
                this.long_term_memory[hash].push(wme2);
                this.long_term_memory_plain.push(wme2);
                return wme2;
            }
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme2.equivalents(wme)) return wme2;
        }

        wme.activation = this.freezeThreshold;
        this.long_term_memory[hash].push(wme);
        this.long_term_memory_plain.push(wme);
        wme.startTime = this.time;
        return wme;        
    }


    removeWME(wme:WME)
    {
        var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
        var idx:number = this.short_term_memory[hash].indexOf(wme);
        this.short_term_memory[hash].splice(idx,1);
        idx = this.short_term_memory_plain.indexOf(wme);
        this.short_term_memory_plain.splice(idx,1);

        var idx:number = this.long_term_memory[hash].indexOf(wme);
        this.long_term_memory[hash].splice(idx,1);
        idx = this.long_term_memory_plain.indexOf(wme);
        this.long_term_memory_plain.splice(idx,1);
    }


    retrieveByFunctor(functor:string) : WME[]
    {
        var l:WME[] = [];
        var hash:number = stringHashFunction(functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme2.functor == functor) l.push(wme2);
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme2.functor == functor) l.push(wme2);
        }
        return l;
    }


    retrieveSubsumption(wme:WME) : WME[]
    {
        var l:WME[] = [];
        var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme.subsumption(wme2)) l.push(wme2);
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme.subsumption(wme2)) l.push(wme2);
        }
        return l;
    }


    retrieveUnification(wme:WME) : WME[]
    {
        var l:WME[] = [];
        var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme.unification(wme2) != null) l.push(wme2);
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme.unification(wme2) != null) l.push(wme2);
        }
        return l;
    }    


    retrieveRelativeSubsumption(wme:WME) : WME[]
    {
        var l:WME[] = [];
        var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme.relativeSubsumption(wme2, this)) l.push(wme2);
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme.relativeSubsumption(wme2, this)) l.push(wme2);
        }
        return l;
    }


    retrieveFirstByFunctor(functor:string) : WME
    {
        var hash:number = stringHashFunction(functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme2.functor == functor) return wme2;
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme2.functor == functor) return wme2;
        }
        return null;
    }


    retrieveFirstBySubsumption(wme:WME) : WME
    {
        var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme.subsumption(wme2)) return wme2;
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme.subsumption(wme2)) return wme2;
        }
        return null;
    }    

    retrieveFirstByRelativeSubsumption(wme:WME) : WME
    {
        var hash:number = stringHashFunction(wme.functor)%WME_HASH_SIZE;
        for(let wme2 of this.short_term_memory[hash]) {
            if (wme.relativeSubsumption(wme2, this)) return wme2;
        }
        for(let wme2 of this.long_term_memory[hash]) {
            if (wme.relativeSubsumption(wme2, this)) return wme2;
        }
        return null;
    }


    objectRemoved(o:A4Object)
    {
        for(let w of this.short_term_memory_plain) {
            if (w.sourceObject == o) w.sourceObject = null;
        }
        for(let w of this.long_term_memory_plain) {
            if (w.sourceObject == o) w.sourceObject = null;
        }
    }


    freezeThreshold:number;
    time:number = 0;
    short_term_memory:WME[][] = new Array(WME_HASH_SIZE);
    short_term_memory_plain:WME[] = [];     // this list contains ALL the elements in m_short_term_memory
                                            // is ueful for quick iteration, without having to go through
                                            // the whole array.

    long_term_memory:WME[][] = new Array(WME_HASH_SIZE);
    long_term_memory_plain:WME[] = [];     // see comment above
};

