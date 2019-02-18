class A4AICharacter extends A4Character {

    constructor(name:string, sort:Sort)
    {
        super(name, sort);
        this.AI = new A4AI(this);
    }


    loadObjectAdditionalContent(xml:Element, game:A4Game, of:A4ObjectFactory, objectsToRevisit_xml:Element[], objsctsToRevisit_object:A4Object[])
    {
        super.loadObjectAdditionalContent(xml,game,of, objectsToRevisit_xml, objsctsToRevisit_object);
        
        // conversation graph:
        /*
        var conversationgraph_xml:Element = getFirstElementChildByTag(xml,"conversationGraph");
        if (conversationgraph_xml!=null) {
            var file:string = conversationgraph_xml.getAttribute("name");
            if (file!=null) {
                // it's defined in an external file:
                var fullPath:string = game.game_path + "/" + file;
                var xmlhttp:XMLHttpRequest = new XMLHttpRequest();
                xmlhttp.overrideMimeType("text/xml");
                xmlhttp.open("GET", fullPath, false); 
                xmlhttp.send();
                var xml2:Element = xmlhttp.responseXML.documentElement;
                this.AI.conversationGraph = ConversationGraph.fromXML(xml2);
            } else {
                // it's defined on the spot:
                this.AI.conversationGraph = ConversationGraph.fromXML(conversationgraph_xml);
            }
        }
        
        // conversation rules:
        var conversationrules_xml:Element[] = getElementChildrenByTag(xml,"conversationGraphTransition");
        for(let rule_xml of conversationrules_xml) {
            this.AI.conversationGraph.addConversationGraphTransitionFromXML(rule_xml);
        }
        */
        
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

        for(let wme of this.AI.memory.short_term_memory_plain) {
            if (!tagOpen) {
                xmlString += "<onStart>\n";
                tagOpen = true;
            }
            xmlString += "<addWME wme=\"" + wme.toStringNoActivation() + "\" activation=\""+wme.activation+"\"/>\n";
        }
        for(let wme of this.AI.memory.long_term_memory_plain) {
            if (!tagOpen) {
                xmlString += "<onStart>\n";
                tagOpen = true;
            }
            xmlString += "<addWME wme=\"" + wme.toStringNoActivation() + "\" activation=\""+wme.activation+"\"/>\n";
        }
        /*
        for(let pt of this.AI.pendingTalk) {
            if (!tagOpen) {
                xmlString += "<onStart>\n";
                tagOpen = true;
            }
            xmlString += pt.saveToXML() + "\n";
        }
        */
        if (tagOpen) xmlString += "</onStart>\n";
        
//        if (this.AI.conversationGraph!=null) xmlString += this.AI.conversationGraph.saveToXML() + "\n";
        
        return xmlString;
    }


    update(game:A4Game) : boolean
    {
        if (!super.update(game)) return false;
        this.AI.update(game);

        return true;
    }


    isAICharacter():boolean 
    {
        return true;
    }


/*
    receiveSpeechAct(speaker:A4Character, receiver:A4Character, sa:SpeechAct) {
        this.AI.receiveSpeechAct(speaker, receiver, sa);
    }
*/

    objectRemoved(o:A4Object)
    {
        super.objectRemoved(o);

        this.AI.objectRemoved(o);
    }


    // attributes:
    sightRadius:number = 5;

    AI:A4AI = null;
}
