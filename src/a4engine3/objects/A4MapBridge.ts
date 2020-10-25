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
        let best_x:number, best_y:number;
        let best_d:number = null;
        for(let i:number = 0;i<=this.height-o.getPixelHeight();i+=tile_dy) {
            for(let j:number = 0;j<=this.width-o.getPixelWidth();j+=tile_dx) {
//                if (this.map.walkable(this.x+j, this.y+i, o.getPixelWidth(), o.getPixelHeight(), o)) {
                if (this.y+i >= 0) {
                    if (this.map.walkable(this.x+j, this.y+i, o.getPixelWidth(), o.getPixelHeight(), o)) {
                        let d:number = Math.abs((j+o.getPixelWidth()/2) - this.width/2) +
                                       Math.abs((i+o.getPixelHeight()/2) - this.height/2);
                        if (best_d == null || d<best_d) {
                            best_d = d;
                            best_x = j;
                            best_y = i;
                        }
                    }
                }
            }
        }
        if (best_d != null) {
            return [this.x+best_x,this.y+best_y];
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