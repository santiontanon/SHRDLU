var SORT_HASH_SIZE:number = 2048;

class Ontology {
    loadSortsFromXML(xml:Element)
    {
        var sort_xml_l:Element[] = getElementChildrenByTag(xml,"sort");
        for(let sort_xml of sort_xml_l) {
            var name:string = sort_xml.getAttribute("name");
            var super_raw:string = sort_xml.getAttribute("super");
            var super_l:Sort[] = [];
            if (super_raw != null) {
                for(let super_s of super_raw.split(",")) {
                    super_l.push(this.getSort(super_s));
                }
            }
            //console.log("loaded sort " + name + " supers: " + super_l);
            this.newSort(name, super_l);
        }
    }


    newSort(name:string, parents:Sort[]):Sort
    {
        var s:Sort = new Sort(name, parents);
        var bin:number = stringHashFunction(name)%SORT_HASH_SIZE;
        if (this.sorts[bin] == null) this.sorts[bin] = [];
        this.sorts[bin].push(s);
        return s;
    }


    newSortStrings(name:string, parentsStr:string[]):Sort
    {
        var parents:Sort[] = [];
        for(let str of parentsStr) {
            parents.push(this.getSort(str));
        }
        var s:Sort = new Sort(name, parents);
        var bin:number = stringHashFunction(name)%SORT_HASH_SIZE;
        if (this.sorts[bin] == null) this.sorts[bin] = [];
        this.sorts[bin].push(s);
        return s;
    }


    getSort(name:string)
    {
        var bin:number = stringHashFunction(name)%SORT_HASH_SIZE;
        if (this.sorts[bin] == null) {
            console.error("Sort " + name + " does not exist!");
            return null;
        }
        for(let s of this.sorts[bin]) {
            if (s.name == name) return s;
        }
        console.error("Sort " + name + " does not exist!");
        return null;
    }                                       


    // same as getSort, but does not print errors if sort do not exist
    getSortSilent(name:string)
    {
        var bin:number = stringHashFunction(name)%SORT_HASH_SIZE;
        if (this.sorts[bin] == null) {
            return null;
        }
        for(let s of this.sorts[bin]) {
            if (s.name == name) return s;
        }
        return null;
    }     


    getAllSorts():Sort[]
    {
        var allSorts:Sort[] = [];
        for(let i:number = 0;i<SORT_HASH_SIZE;i++) {
            if (this.sorts[i]!=null) {
                for(let s of this.sorts[i]) {
                    allSorts.push(s);
                }
            }
        }
        return allSorts;
    }


    sorts:Sort[][] = new Array(SORT_HASH_SIZE);
}
