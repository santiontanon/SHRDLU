class A4Key extends A4Item {

	constructor(name:string, sort:Sort, id:string, a1:A4Animation)
	{
		super(name, sort);
		this.keyID = id;
		this.animations[A4_ANIMATION_IDLE] = a1;
	}



    loadObjectAttribute(attribute_xml:Element) : boolean
    {
        if (super.loadObjectAttribute(attribute_xml)) return true;
        var a_name:string = attribute_xml.getAttribute("name");

	    if (a_name == "keyID") {
	    	this.keyID = attribute_xml.getAttribute("value");
	        return true;
	    }

        return false;
    }

	
	isKey() : boolean 
	{
		return true;
	}


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);

        xmlString += this.saveObjectAttributeToXML("keyID",this.keyID) + "\n";

        return xmlString;
    }


	keyID:string;

}
