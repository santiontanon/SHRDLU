class A4Food extends A4Item {
	constructor(name:string, sort:Sort, a:A4Animation, gold:number)
	{
		super(name, sort);
		this.animations[A4_ANIMATION_IDLE] = a;
		this.gold = gold;
	}
}