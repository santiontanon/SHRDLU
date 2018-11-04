class A4ObjectFactory {

    addDefinitions(xml:Element, game:A4Game, baseClassName:string)
    {
        var o:Ontology = game.ontology;        
        var classes_xml:Element[] = getElementChildrenByTag(xml, baseClassName);
        for(let i:number = 0;i<classes_xml.length;i++) {
            var class_xml:Element = classes_xml[i];
            this.objectTypes.push(class_xml);

            var sortName:string = class_xml.getAttribute("class");
            var s:Sort = o.getSortSilent(sortName);
            if (s==null) s = o.newSort(sortName,[]);
            var superClasses:string[] = class_xml.getAttribute("super").split(',');

//            console.log("added class " + s.name + " to A4ObjectFactory.objectTypes");

            for(let className of superClasses) {
                if (className.charAt(0) == '*') {
                    var sortName:string = className.substring(1);
                    var s2:Sort = o.getSortSilent(sortName);
                    if (s2 == null) s2 = o.newSort(sortName, []);
                    s.addParent(s2);
                } else {
                    var sortName:string = className;
                    var s2:Sort = o.getSort(sortName);
                    if (s2 == null) s2 = o.newSort(sortName, []);
                    s.addParent(s2);
                }
            }
        }
    }


    createObject(className:string, game:A4Game, isPlayer:boolean, completeRedefinition:boolean) : A4Object
    {
        var xml:Element = this.getObjectType(className);
        if (xml != null) return this.createObjectFromXML(xml, game, isPlayer, completeRedefinition);
        
        if (className == "obstacle") {
            return new A4Obstacle(null, game.ontology.getSort("obstacle"));
        } else if (className == "door") {
            return new A4Door(game.ontology.getSort("door"), null, false, true, null, null);
        } else if (className == "lever") {
            return new A4Lever(game.ontology.getSort("lever"), null, false, null, null);
        } else if (className == "pressure-plate") {
            return new A4PressurePlate(game.ontology.getSort("pressure-plate"), null, null, TRIGGER_PRESSURE_ITEM);
        } else if (className == "container") {
            return new A4Container(null, game.ontology.getSort("container"), null);
        } else if (className == "obstacle-container") {
            return new A4ObstacleContainer(null, game.ontology.getSort("obstacle-container"), null, false, true, null, null);
        } else if (className == "key") {
            return new A4Key(null, game.ontology.getSort("key"), null, null);
        } else if (className == "pushable-wall") {
            return new A4PushableWall(null, game.ontology.getSort("pushable-wall"), null);
        } else if (className == "food") {
            return new A4Food(null, game.ontology.getSort("food"), null, 0);
        } else if (className == "spade") {
            return new A4Spade(game.ontology.getSort("spade"), null, 0);
        } else if (className == "trigger") {
            return new A4Trigger(game.ontology.getSort("trigger"),0,0);
        } else if (className == "ShrdluAirlockDoor") {
            return new ShrdluAirlockDoor(null, game.ontology.getSort("ShrdluAirlockDoor"));
        }
        
        return null;
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
        var baseClasses:string[] = ["item","container","vehicle","character","obstacle","obstacle-container","door","key","pushable-wall","food","spade","object","ShrdluAirlockDoor"];
        var o:A4Object;
        var ontology:Ontology = game.ontology;

        if (xml.getAttribute("completeRedefinition") == "true") completeRedefinition = true;

        // find base class, and additional definitions to add:
        var classes:Element[] = [];
        var baseClassName:string = null;

        {
            var open:string[] = [xml.getAttribute("class")];

            while(open.length > 0) {
                var current:string = open[0];
                //console.log("considering: " + current);
                open.splice(0,1);
                var loadContent:boolean = true;
                var current2:string = current;
                if (current.charAt(0) == '*') {
                    loadContent = false;
                    current2 = current.substring(1);
                    continue;
                }
                var current_xml:Element = this.getObjectType(current2);
                var found:number = baseClasses.indexOf(current2);

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
                        var superString:string = current_xml.getAttribute("super");
                        var superClasses:string[] = superString.split(',');
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

        var o_ID:string = xml.getAttribute("id");
        var o_name:string = xml.getAttribute("name");
        if (o_name == null) {
            for(let xml2 of classes) {
                o_name = xml2.getAttribute("name");
                if (o_name != null) break;
            }
        }

        let classStr:string = xml.getAttribute("class");
        if (classStr == null) classStr = xml.getAttribute("type");
        if (baseClassName == "item") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Item(o_name, s);
        } else if (baseClassName == "container") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Container(o_name, s, null);
        } else if (baseClassName == "vehicle") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Vehicle(o_name,s);
        } else if (baseClassName == "character") {
            if (isPlayer) {
                var s:Sort = ontology.getSort(classStr);
                o = new A4PlayerCharacter(o_name,s);
            } else {
                var s:Sort = ontology.getSort(classStr);
                o = new A4AICharacter(o_name,s);
            }
        } else if (baseClassName == "obstacle") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Obstacle(o_name, s);
        } else if (baseClassName == "obstacle-container") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4ObstacleContainer(o_name, s, null, true, false, null, null);
        } else if (baseClassName == "door") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Door(s, null, true, false, null, null);
        } else if (baseClassName == "key") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Key(o_name,s, null, null);
        } else if (baseClassName == "pushable-wall") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4PushableWall(o_name, s, null);
        } else if (baseClassName == "food") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Food(o_name, s, null, 0);
        } else if (baseClassName == "spade") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Spade(s, null, 0);
        } else if (baseClassName == "object") {
            var s:Sort = ontology.getSort(classStr);
            o = new A4Object(o_name, s);
        } else if (baseClassName == "ShrdluAirlockDoor") {
            var s:Sort = ontology.getSort(classStr);
            o = new ShrdluAirlockDoor(o_name, s);
        } else {
            console.error("A4ObjectFactory::createObject: Could not create object " + classStr);
            return null;
        }

        if (o_ID != null) {
            o.ID = o_ID;
            if (!isNaN(Number(o_ID)) &&
                Number(o_ID) >= A4Object.s_nextID) A4Object.s_nextID = Number(o_ID)+1;
//            console.log("OF:" + o.name + " -> " + o.ID + " (" + A4Object.s_nextID + ")");
        }

        if (!completeRedefinition) {
            for(let xml2 of classes) {
                o.loadObjectAdditionalContent(xml2, game, this, [], []);
            }
        }

        return o;
    }


    objectTypes:Element[] = [];
};

