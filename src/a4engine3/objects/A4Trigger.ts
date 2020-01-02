class A4Trigger extends A4Object {

    constructor(sort:Sort, w:number, h:number)
    {
        super("trigger", sort);
        this.width = w;
        this.height = h;
        this.currentAnimation = A4_ANIMATION_OPEN;
    }


    loadObjectAttribute(xml:Element) : boolean
    {
        if (super.loadObjectAttribute(xml)) return true;

        let name:string = xml.getAttribute("name");
        if (name == "triggerState") {
            this.triggerState = false;
            if (xml.getAttribute("value") == "true") this.triggerState = true;
            return true;
        }

        return false;
    }


    loadObjectAdditionalContent(xml:Element, game:A4Game, of:A4ObjectFactory, objectsToRevisit_xml:Element[], objsctsToRevisit_object:A4Object[])
    {
        super.loadObjectAdditionalContent(xml, game, of, objectsToRevisit_xml, objsctsToRevisit_object);

        this.width = Number(xml.getAttribute("width"));
        this.height = Number(xml.getAttribute("height"));
    }


    savePropertiesToXML(game:A4Game) : string
    {
        let xmlString:string = super.savePropertiesToXML(game);

        xmlString += this.saveObjectAttributeToXML("triggerState",this.triggerState) + "\n";

        return xmlString;
    }


    getPixelWidth() : number
    {
        return this.width;
    }


    getPixelHeight() : number
    {
        return this.height;
    }

  
    isTrigger() : boolean 
    {
        return true;
    }


    update(game:A4Game) : boolean
    {
        super.update(game);
        
        let l:A4Object[] = this.map.getAllObjectCollisions(this);
        let triggered_by:A4Object = null;
        let playerOver:boolean = false;
        
        for(let o of l) {
            if (o.isPlayer()) {
                playerOver = true;
                triggered_by = o;
            }
        }
        
        if (this.triggerState) {
            if (playerOver) {
                // nothing to do, keep pressed
            } else {
                // release
                this.triggerState = false;
                this.event(A4_EVENT_DEACTIVATE, null, this.map, game);
                this.event(A4_EVENT_USE, null, this.map, game);
            }
        } else {
            if (triggered_by!=null && playerOver) {
                // press!
                this.triggerState = true;
                this.event(A4_EVENT_ACTIVATE, <A4Character>triggered_by, this.map, game);
                this.event(A4_EVENT_USE, <A4Character>triggered_by, this.map, game);
            } else {
                // nothing to do, keep released
            }
        }
        
        return true;
    }    


    width:number;
    height:number;
    triggerState:boolean = false;
};
