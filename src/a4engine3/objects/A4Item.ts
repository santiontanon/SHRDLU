class A4Item extends A4Object {

    constructor(name:string, sort:Sort)
    {
        super(name, sort);
        this.takeable = true;
        this.burrowed = false;
    }

    
    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        
        var a_name:string = attribute_xml.getAttribute("name");
        
        if (a_name == "useUponTake") {
            this.useUponTake = false;
            if (attribute_xml.getAttribute("value") == "true") this.useUponTake = true;
            return true;
        } else if (a_name == "droppable") {
            this.droppable = false;
            if (attribute_xml.getAttribute("value") == "true") this.droppable = true;
            return true;
        } else if (a_name == "weight") {
            this.weight = Number(attribute_xml.getAttribute("value"));
            return true;
        }
        return false;
    }


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);

        xmlString += this.saveObjectAttributeToXML("useUponTake",this.useUponTake) + "\n";
        xmlString += this.saveObjectAttributeToXML("droppable",this.droppable) + "\n";
        xmlString += this.saveObjectAttributeToXML("weight",this.weight) + "\n";

        return xmlString;
    }
    

    useUponTake:boolean = false;
    droppable:boolean = true;
    weight:number = 1;
};
