
class PlanningState {
	sign:boolean[] = [];
	predicates:Term[] = [];


	toString() : string
	{
		let str:string = "[ ";
		for(let i:number = 0; i<this.sign.length; i++) {
			if (this.sign[i]) {
				str += this.predicates[i] + ", ";
			} else {
				str += "~" + this.predicates[i] + ", ";
			}
		}
		return str + "]";
	}
}