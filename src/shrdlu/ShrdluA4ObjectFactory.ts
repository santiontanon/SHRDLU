class ShrdluA4ObjectFactory extends A4ObjectFactory {

    constructor()
    {
        super();
        this.baseClasses.push("ShrdluAirlockDoor");
    }
    

    createObjectFromBaseClass(baseClassName:string, s:Sort, o_name:string, isPlayer:boolean, dead:boolean) : A4Object
    {
        if (baseClassName == "ShrdluAirlockDoor") {
            return new ShrdluAirlockDoor(o_name, s);
        }

        return super.createObjectFromBaseClass(baseClassName, s, o_name, isPlayer, dead);
    }
};

