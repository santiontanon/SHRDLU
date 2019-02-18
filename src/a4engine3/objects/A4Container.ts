class A4Container extends A4Item {

    constructor(name:string, sort:Sort, a:A4Animation)
    {
        super(name, sort);
        this.animations[A4_ANIMATION_IDLE] = a;
        this.usable = true;
    }
    

    loadObjectAdditionalContent(xml:Element, game:A4Game, of:A4ObjectFactory, objectsToRevisit_xml:Element[], objsctsToRevisit_object:A4Object[])
    {
        super.loadObjectAdditionalContent(xml, game, of, objectsToRevisit_xml, objsctsToRevisit_object);
        
        var items_xml:Element = getFirstElementChildByTag(xml, "items");
        if (items_xml != null) {
//            var item_xml_l:NodeListOf<Element> = items_xml.children;
            var item_xml_l:HTMLCollection = items_xml.children;
            for(let i:number = 0;i<item_xml_l.length;i++) {
                var item_xml:Element = item_xml_l[i];
                var tmp:string = item_xml.getAttribute("probability");
                if (tmp != null) {
                    if (Math.random() >= Number(tmp)) continue;
                }
                var completeRedefinition:boolean = false;
                if (item_xml.getAttribute("completeRedefinition") == "true") completeRedefinition = true;
                let item:A4Object = null;
                if (item_xml.getAttribute("class") != null) {
                    item = of.createObject(item_xml.getAttribute("class"), game, false, completeRedefinition);
                } else {
                    // for compatibility with previous formats
                    item = of.createObject(item_xml.getAttribute("type"), game, false, completeRedefinition);
                }
                var id:string = item_xml.getAttribute("id");
                if (id!=null) {
                    item.ID = id;
                    if (!isNaN(Number(id)) &&
                        Number(id) >= A4Object.s_nextID) A4Object.s_nextID = Number(id)+1;
                }
                item.loadObjectAdditionalContent(item_xml, game, of, objectsToRevisit_xml, objsctsToRevisit_object);
                this.addContent(item);
            }
        }
    }


    savePropertiesToXML(game:A4Game) : string
    {
        var xmlString:string = super.savePropertiesToXML(game);
        
        if (this.content.length>0) {
            xmlString += "<items>\n";
            for(let o of this.content) {
                xmlString += o.saveToXML(game, 0, false) + "\n";
            }
            xmlString += "</items>\n";
        }

        return xmlString;
    }


    event(a_event:number, otherCharacter:A4Character, map:A4Map, game:A4Game)
    {
        super.event(a_event, otherCharacter, map, game);
        
        if (a_event == A4_EVENT_USE) {
            this.event(A4_EVENT_OPEN, otherCharacter, map, game);
            otherCharacter.removeFromInventory(this);
            for(let o of this.content) {
                otherCharacter.addObjectToInventory(o, game);
            }
            this.content = [];
            game.requestDeletion(this);
        }
    }

    
    addContent(o:A4Object) 
    {
        this.content.push(o);
        if (this.currentAnimation == A4_ANIMATION_OPEN_EMPTY) {
            if (this.animations[A4_ANIMATION_OPEN_FULL] != null) this.currentAnimation = A4_ANIMATION_OPEN_FULL;
        }
    }


    objectRemoved(o:A4Object)
    {
        super.objectRemoved(o);

        for(let o2 of this.content) {
            o2.objectRemoved(o);
        }

        if (this.content.length == 0) {
            if (this.currentAnimation == A4_ANIMATION_OPEN_FULL) {
                if (this.animations[A4_ANIMATION_OPEN_EMPTY] != null) this.currentAnimation = A4_ANIMATION_OPEN_EMPTY;
            }            
        }
    }


    findObjectByName(name:string) : A4Object[]
    {
        for(let o of this.content) {
            if (o.name == name) return [o];
            var o2:A4Object[] = o.findObjectByName(name);
            if (o2!=null) return [o].concat(o2);
        }
        return null;
    }   


    findObjectByID(ID:string) : A4Object[]
    {
        for(let o of this.content) {
            if (o.ID == ID) return [o];
            var o2:A4Object[] = o.findObjectByID(ID);
            if (o2!=null) return [o].concat(o2);
        }
        return null;
    }       


    content:A4Object[] = [];
};

