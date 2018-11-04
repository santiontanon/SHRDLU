class A4PlayerCharacter extends A4Character {
    constructor(name:string, sort:Sort)
    {
        super(name, sort);
    }


    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        
        // This function is just so that we can reuse object class definitions between Players and AI characters.
        var a_name:string = attribute_xml.getAttribute("name");
        if (a_name == "sightRadius") {
            return true;
        } else if (a_name == "respawn") {
            return true;
        } else if (a_name == "AI.period") {
            return true;
        } else if (a_name == "AI.cycle") {
            return true;
        } else if (a_name == "respawnRecordID") {
            return true;
        }
        
        return false;
    }

    
    isPlayer() : boolean
    {
        return true;
    }


    nextItem()
    {
        for(let i:number = 0;i<this.inventory.length;i++) {
            this.selectedItem++;
            this.selectedItem = this.selectedItem%this.inventory.length;
            if (this.inventory[this.selectedItem]!=null) return;
        }
        this.selectedItem = -1;
    }


    previousItem()
    {
        for(let i:number = 0;i<this.inventory.length;i++) {
            this.selectedItem--;
            if (this.selectedItem<0) this.selectedItem = this.inventory.length-1;
            if (this.inventory[this.selectedItem]!=null) return;
        }
        this.selectedItem = -1;
    }


    selectedItem:number = -1;
}