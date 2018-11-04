class A4Obstacle extends A4Object {

    constructor(name:string, sort:Sort)
    {
        super(name, sort);
    }

  
    isWalkable():boolean {return false;}
};
