class A4MapBridge extends A4Object {
    constructor(bridge_xml:Element, map:A4Map)
    {
        super(null, null);
        this.name = bridge_xml.getAttribute("name");
        this.x = Number(bridge_xml.getAttribute("x"));
        this.y = Number(bridge_xml.getAttribute("y"));
        this.width = Number(bridge_xml.getAttribute("width"));
        this.height = Number(bridge_xml.getAttribute("height"));
        this.appearDirection = A4_DIRECTION_NONE;
        this.appearWalking = false;
        this.linkedTo = null;
        this.map = map;        
    }
    

    link(b:A4MapBridge) {
        this.linkedTo = b;
        b.linkedTo = this;
    }


    findAvailableTargetLocation(o:A4Object, tile_dx:number, tile_dy:number) : [number, number]
    {
        for(let i:number = 0;i<this.height;i+=tile_dy) {
            for(let j:number = 0;j<this.width;j+=tile_dx) {
                if (this.map.walkable(this.x+j, this.y+i, o.getPixelWidth(), o.getPixelHeight()-o.tallness, o)) {
                    return [this.x+j,this.y+i];
                }
            }
        }
        return null;
    }
    

    getPixelWidth():number
    {
        return this.width;
    }
    

    getPixelHeight():number
    {
        return this.height;
    }

    
    width:number;
    height:number;
    appearDirection:number;
    appearWalking:boolean;
    linkedTo:A4MapBridge = null;
}