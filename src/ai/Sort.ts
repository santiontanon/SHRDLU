class Sort {
    constructor(name:string, parents:Sort[])
    {
        this.ID = Sort.s_next_ID++;
        this.name = name;
        this.parents = parents;
        if (Sort.s_precomputedIsA != null) {
            console.error("s_precomputedIsA was computed already when instantiating sort " + name);
            Sort.s_precomputedIsA = null;
        }
    }


    is_a(s:Sort):boolean
    {
        if (Sort.s_precomputedIsA != null) {
            var offs:number = this.ID + s.ID*Sort.s_next_ID;
            if (Sort.s_precomputedIsA[offs] == undefined) {
                Sort.s_precomputedIsA[offs] = this.is_a_internal(s);
            }
            return Sort.s_precomputedIsA[offs];
        } else {
            return this.is_a_internal(s);
        }
    }

    is_a_internal(s:Sort):boolean
    {
        if (s == this) return true;
        for(let parent of this.parents) {
            if (parent.is_a_internal(s)) return true;
        }
        return false;
    }


    is_a_string(s:string):boolean
    {
        if (this.name == s) return true;
        for(let parent of this.parents) {
            if (parent.is_a_string(s)) return true;
        }
        return false;
    }


    subsumes(s:Sort):boolean 
    {
        return s.is_a(this);
    }    


    addParent(s:Sort) 
    {
        if (s == this) {
            console.error("Trying to add a sort as its own parent! " + s.name);
            return;
        }
        for(let s2 of this.parents) {
            if (s2 == s) return;
        }
        this.parents.push(s);
        Sort.s_precomputedIsA = null;
    }


    getAncestors() : Sort[]
    {
        var closed:Sort[] = [];
        var open:Sort[] = [];
        open = open.concat(this.parents);
        while(open.length > 0) {
            var s:Sort = open[0];
            open.splice(0,1);
            if (closed.indexOf(s)==-1) closed.push(s);
            open = open.concat(s.parents);
        }
        return closed;
    }


    toString()
    {
        return this.name;
    }


    static precomputeIsA()
    {
        Sort.s_precomputedIsA = new Array(Sort.s_next_ID*Sort.s_next_ID);
        for(let i:number = 0;i<Sort.s_precomputedIsA.length;i++) {
            Sort.s_precomputedIsA[i] = undefined;
        }
    }

    static clear()
    {
        Sort.s_next_ID = 0;
        Sort.s_precomputedIsA = null;
    }


    ID:number;
    name:string;
    parents:Sort[] = null;

    static s_next_ID:number = 0;
    static s_precomputedIsA:boolean[] = null;
}
