class A4ObjectFactory {

    constructor()
    {
        this.baseClasses = ["item","container","vehicle","character","obstacle","obstacle-container","door","key","pushable-wall","food","spade","object"];
    }


    addDefinitions(xml:Element, game:A4Game, baseClassName:string)
    {
        let o:Ontology = game.ontology;        
        let classes_xml:Element[] = getElementChildrenByTag(xml, baseClassName);
        for(let i:number = 0;i<classes_xml.length;i++) {
            let class_xml:Element = classes_xml[i];
            this.objectTypes.push(class_xml);

            let sortName:string = class_xml.getAttribute("class");
            let s:Sort = o.getSortSilent(sortName);
            if (s==null) s = o.newSort(sortName,[]);
            let superClasses:string[] = class_xml.getAttribute("super").split(',');

//            console.log("added class " + s.name + " to A4ObjectFactory.objectTypes");

            for(let className of superClasses) {
                if (className.charAt(0) == '*') {
                    let sortName:string = className.substring(1);
                    let s2:Sort = o.getSortSilent(sortName);
                    if (s2 == null) s2 = o.newSort(sortName, []);
                    s.addParent(s2);
                } else {
                    let sortName:string = className;
                    let s2:Sort = o.getSort(sortName);
                    if (s2 == null) s2 = o.newSort(sortName, []);
                    s.addParent(s2);
                }
            }
        }
    }


    createObject(className:string, game:A4Game, isPlayer:boolean, completeRedefinition:boolean) : A4Object
    {
        let xml:Element = this.getObjectType(className);
        if (xml != null) return this.createObjectFromXML(xml, game, isPlayer, completeRedefinition);
        
        return this.createObjectFromBaseClass(className, game.ontology.getSort("obstacle"), null, isPlayer, false)
    }


    createObjectFromBaseClass(baseClassName:string, s:Sort, o_name:string, isPlayer:boolean, dead:boolean) : A4Object
    {
        if (baseClassName == "item") {
            return new A4Item(o_name, s);
        } else if (baseClassName == "vehicle") {
            return new A4Vehicle(o_name,s);
        } else if (baseClassName == "character") {
            if (dead) {
                return new A4Character(o_name, s);
            } else {
                if (isPlayer) {
                    return new A4PlayerCharacter(o_name,s);
                } else {
                    return new A4AICharacter(o_name, s);
                }
            }
        } else if (baseClassName == "obstacle") {
            return new A4Obstacle(o_name, s);
        } else if (baseClassName == "obstacle-container") {
            return new A4ObstacleContainer(o_name, s, null, true, false, null, null);
        } else if (baseClassName == "door") {
            return new A4Door(s, null, true, false, null, null);
        } else if (baseClassName == "key") {
            return new A4Key(o_name, s, null, null);
        } else if (baseClassName == "lever") {
            return new A4Lever(s, null, false, null, null);
        } else if (baseClassName == "pressure-plate") {
            return new A4PressurePlate(s, null, null, TRIGGER_PRESSURE_ITEM);            
        } else if (baseClassName == "container") {
            return new A4Container(o_name, s, null);            
        } else if (baseClassName == "pushable-wall") {
            return new A4PushableWall(o_name, s, null);
        } else if (baseClassName == "food") {
            return new A4Food(o_name, s, null, 0);
        } else if (baseClassName == "spade") {
            return new A4Spade(s, null, 0);
        } else if (baseClassName == "trigger") {
            return new A4Trigger(s, 0, 0);
        } else if (baseClassName == "object") {
            return new A4Object(o_name, s);
        } else {
            return null;
        }
    }


    getObjectType(type:string) : Element
    {
        for(let xml of this.objectTypes) {
            if (xml.getAttribute("class") == type) return xml;
        }
        return null;
    }


    createObjectFromXML(xml:Element, game:A4Game, isPlayer:boolean, completeRedefinition:boolean) : A4Object
    {
        let o:A4Object;
        let ontology:Ontology = game.ontology;

        if (xml.getAttribute("completeRedefinition") == "true") completeRedefinition = true;

        // find base class, and additional definitions to add:
        let classes:Element[] = [];
        let baseClassName:string = null;
        let dead:boolean = false;

        {
            let open:string[] = [xml.getAttribute("class")];
            //let closed:string[] = [];

            while(open.length > 0) {
                let current:string = open[0];
                //console.log("considering: " + current);
                open.splice(0,1);
                let loadContent:boolean = true;
                let current2:string = current;
                if (current.charAt(0) == '*') {
                    // loadContent = false;
                    current2 = current.substring(1);
                    if (ontology.getSort(current2).is_a_string("dead")) dead = true;
                    //closed.push(current2);
                    continue;
                } else {
                    if (ontology.getSort(current2).is_a_string("dead")) dead = true;
                    //closed.push(current2);
                }
                let current_xml:Element = this.getObjectType(current2);
                let found:number = this.baseClasses.indexOf(current2);

                if (current_xml == null && found >= 0) {
                    if (baseClassName == null) {
                        baseClassName = current;
                    } else if (baseClassName != current) {
                        console.error("A4ObjectFactory::createObject: baseClassName was '"+baseClassName+"' and now it's attempted to set to '"+current+"'!!!");
                        return null;
                    }
                } else {
                    if (current_xml != null) {
                        if (loadContent) classes.unshift(current_xml);    // push at the front of the array
                        let superString:string = current_xml.getAttribute("super");
                        let superClasses:string[] = superString.split(',');
                        for(let className of superClasses) {
                            open.push(className);
                        }
                    }
                }
            }
        }

        if (baseClassName == null) {
            console.error("A4ObjectFactory::createObject: baseClassName null to create '" + xml.getAttribute("class") + "'!!!");
            return null;
        }

        let o_ID:string = xml.getAttribute("id");
        let o_name:string = xml.getAttribute("name");
        if (o_name == null) {
            for(let xml2 of classes) {
                o_name = xml2.getAttribute("name");
                if (o_name != null) break;
            }
        }

        let classStr:string = xml.getAttribute("class");
        if (classStr == null) classStr = xml.getAttribute("type");

        o = this.createObjectFromBaseClass(baseClassName, ontology.getSort(classStr), o_name, isPlayer, dead);

        if (o_ID != null) {
            o.ID = o_ID;
            if (!isNaN(Number(o_ID)) &&
                Number(o_ID) >= A4Object.s_nextID) A4Object.s_nextID = Number(o_ID)+1;
        }

        if (!completeRedefinition) {
            for(let xml2 of classes) {
                o.loadObjectAdditionalContent(xml2, game, this, [], []);
            }
        }

        return o;
    }


    objectTypes:Element[] = [];
    baseClasses:string[] = [];
};

