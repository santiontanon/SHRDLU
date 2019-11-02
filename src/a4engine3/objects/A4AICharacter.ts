class A4AICharacter extends A4Character {

    constructor(name:string, sort:Sort)
    {
        super(name, sort);
        this.AI = new A4AI(this);
    }

    
    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        var a_name:string = attribute_xml.getAttribute("name");
        
        if (a_name == "sightRadius") {
            this.sightRadius = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "AI.period") {
            this.AI.period = Number(attribute_xml.getAttribute("value"));
            return true;
        } else if (a_name == "AI.cycle") {
            this.AI.cycle = Number(attribute_xml.getAttribute("value"));
            return true;
        }

        return false;
    }


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);

        xmlString += this.saveObjectAttributeToXML("sightRadius",this.sightRadius) + "\n";

        xmlString += this.saveObjectAttributeToXML("AI.period",this.AI.period) + "\n";
        xmlString += this.saveObjectAttributeToXML("AI.cycle",this.AI.cycle) + "\n";

        var tagOpen:boolean = false;

        for(let map_name of this.AI.maps_familiar_with) {
            if (!tagOpen) {
                xmlString += "<onStart>\n";
                tagOpen = true;
            }
            xmlString += "<familiarWithMap map=\""+map_name+"\"/>\n";
        }
        if (tagOpen) xmlString += "</onStart>\n";
                
        return xmlString;
    }


    update(game:A4Game) : boolean
    {
        if (!super.update(game)) return false;
        if (this.map != null) this.AI.update(game);

        return true;
    }


    isAICharacter():boolean 
    {
        return true;
    }


    objectRemoved(o:A4Object)
    {
        super.objectRemoved(o);
        this.AI.objectRemoved(o);
    }


    // attributes:
    sightRadius:number = 5;

    AI:A4AI = null;
}
