
var BW_PLANNING_ACTION_TAKE:string = "action.take";
var BW_PLANNING_ACTION_PUT_IN:string = "action.put-in";


function isOnTopOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	if (o1 == null || o2 == null) return false;
	if (o1 == o2) return false;
	if (state.x[o1]+state.bw.objects[o1].dx > state.x[o2] && state.x[o2]+state.bw.objects[o2].dx > state.x[o1] &&
		state.y[o1] == state.y[o2]+state.bw.objects[o2].dy &&
		state.z[o1]+state.bw.objects[o1].dz > state.z[o2] && state.z[o2]+state.bw.objects[o2].dz > state.z[o1]) {
		return true;
	}
	return false;
}


function isInsideOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	if (o1 == null || o2 == null) return false;
	if (o1 == o2) return false;
	if (state.collide(o1, o2)) {
		// they overlap:
		if (state.x[o2] <= state.x[o1] && state.z[o2] <= state.z[o1]) {
			// o1 inside o2:
			return true;
		}
	}
	return false;
}


function isNextTo(o1:number, o2:number, state:BWPlannerState) : boolean
{
	if (o1 == null || o2 == null) return false;
	if (o1 == o2) return false;

	let dx:number = state.getDxO1O2(o1, o2);
	let dz:number = state.getDzO1O2(o1, o2);
	if (dx == 0 && dz == 0) {
		if (state.y[o1]+state.bw.objects[o1].dy > state.y[o2] &&
			state.y[o2]+state.bw.objects[o2].dy > state.y[o1]) {
			if (!isInsideOf(o1, o2, state) && !isInsideOf(o2, o1, state)) {
				return true;
			}
		}
	}
	return false;
}


function isNorthOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, 1, 7, false, true);
}


function isEastOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, -3, 3, true, false);
}


function isWestOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, 5, -5, true, false);
}


function isSouthOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, -7, -1, false, true);
}


function isNortheastOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, 1, 3, true, true);
}


function isNorthwestOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, 5, 7, true, true);
}


function isSouthwestOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, -7, -5, true, true);
}


function isSoutheastOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, -3, -1, true, true);
}


function isBehindOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, 3, 5, false, true);
}


function isInFrontOf(o1:number, o2:number, state:BWPlannerState) : boolean
{
	return state.isWithinAngleOf(o1, o2, -5, -3, false, true);
}


class BWPlannerState {

	constructor(bw:ShrdluBlocksWorld)
	{
		this.bw = bw;
	}

	static fromBlocksWorld(bw:ShrdluBlocksWorld) : BWPlannerState
	{
		let s:BWPlannerState = new BWPlannerState(bw);

		s.x = [];
		s.y = [];
		s.z = [];
		for(let o of bw.objects) {
			if (o == bw.objectInArm) {
				s.x.push(o.x);
				s.y.push(10000);
				s.z.push(o.z);
			} else {
				s.x.push(o.x);
				s.y.push(o.y);
				s.z.push(o.z);
			}
		}

		if (bw.objectInArm != null) s.objectInArm = bw.objects.indexOf(bw.objectInArm);

		return s;
	}

	static clone(s0:BWPlannerState) : BWPlannerState
	{
		let s:BWPlannerState = new BWPlannerState(s0.bw);
		s.objectInArm = s0.objectInArm;
		s.x = [...s0.x];
		s.y = [...s0.y];
		s.z = [...s0.z];
		return s;
	}


	checkGoal(goal:PlanningCondition, o:Ontology) : boolean
	{
		let number_satisfied:number = 0;		
		for(let conjunct of goal.predicates) {
			if (this.checkConjunct(conjunct, null, 0, o)) {
				number_satisfied++;
				if (number_satisfied >= goal.number_constraint) return true;
			}
		}
		return false;
	}


	checkConjunct(predicates:PlanningPredicate[], b:Bindings, index:number, o:Ontology) : boolean
	{
		if (index >= predicates.length) return true;
		let term:Term = predicates[index].term;
		if (b != null) term = term.applyBindings(b);			
		if (predicates[index].sign) {
			let possibleBindings:[VariableTermAttribute,TermAttribute][][] = this.checkPredicate(term, o);
			for(let bindings of possibleBindings) {
				let b2:Bindings = b;
				if (bindings.length > 0) {
					b2 = new Bindings();
					if (b == null) {
						b2.l = bindings;
					} else {
						b2.l = b.l.concat(bindings); 
					}
				}
				// recursive call:
				if (this.checkConjunct(predicates, b2, index+1, o)) return true;
			}
			return false;
		} else {
			if (this.checkPredicate(term, o).length > 0) return false;
			return this.checkConjunct(predicates, b, index+1, o);
		}
	}


	minimumStepsLeft(goal:PlanningCondition, o:Ontology) : number
	{
		let stepsLeft:number[] = [];

		for(let conjunct of goal.predicates) {
			stepsLeft.push(this.minimumStepsLeftForConjunct(conjunct, null, 0, o, []));
		}

		// Since it could be that an action for addressing one of the conjuncts also addresses another of the conjuncts,
		// we return the minimum number of steps required for one of them (the max of the minimum required):
		stepsLeft.sort();
		let idx:number = goal.number_constraint-1;
		if (idx >= stepsLeft.length) idx = stepsLeft.length-1;

		return stepsLeft[idx];
	}


	/*
		This function calculates an estimation of the minimum number of steps required to accomplish the goals.
		Note: it some times over estimates, so, it can prune valid plans. However, it makes planning very fast,
		so, I decided to leave it as is.
	*/
	minimumStepsLeftForConjunct(predicates:PlanningPredicate[], b:Bindings, index:number, o:Ontology,
								unsatisfiedPredicates:PlanningPredicate[]) : number
	{
		if (index >= predicates.length) {
			let minSteps:number = 0;
			for(let predicate of unsatisfiedPredicates) {
				if (predicate.term.functor.name == "space.directly.on.top.of" ||
					predicate.term.functor.name == "space.inside.of" ||
					predicate.term.functor.name == "space.next-to") {
					if (this.objectInArm == -1) minSteps ++;
					minSteps ++;
				}
			}
			return minSteps;
		}
		let term:Term = predicates[index].term;
		let stepsLeft:number = null;
		if (b != null) term = term.applyBindings(b);			
		if (predicates[index].sign) {
			let possibleBindings:[VariableTermAttribute,TermAttribute][][] = this.checkPredicate(term, o);
			for(let bindings of possibleBindings) {
				let b2:Bindings = b;
				if (bindings.length > 0) {
					b2 = new Bindings();
					if (b == null) {
						b2.l = bindings;
					} else {
						b2.l = b.l.concat(bindings); 
					}
				}
				// recursive call:
				let stepsLeft2:number = this.minimumStepsLeftForConjunct(predicates, b2, index+1, o,
																		 unsatisfiedPredicates);
				if (stepsLeft == null || stepsLeft2 < stepsLeft) stepsLeft = stepsLeft2;
			}
			let stepsLeft2:number = this.minimumStepsLeftForConjunct(predicates, b, index+1, o, unsatisfiedPredicates.concat([predicates[index]]));
			if (stepsLeft == null || stepsLeft2 < stepsLeft) stepsLeft = stepsLeft2;
			return stepsLeft;
		} else {
			if (this.checkPredicate(term, o).length > 0) {
				return this.minimumStepsLeftForConjunct(predicates, b, index+1, o, unsatisfiedPredicates.concat([predicates[index]]));
			} else {
				return this.minimumStepsLeftForConjunct(predicates, b, index+1, o, unsatisfiedPredicates);
			}
		}
	}


	checkPredicate(predicate:Term, o:Ontology) : [VariableTermAttribute,TermAttribute][][]
	{
		switch(predicate.functor.name) {
			case "verb.hold":
				{
					if (this.objectInArm == -1) return [];

					let id:TermAttribute = predicate.attributes[1];
					if (id instanceof VariableTermAttribute) {
						return [[[id, new ConstantTermAttribute(this.bw.objects[this.objectInArm].ID, BWPlanner.s_id_sort)]]];
					} else if (id instanceof ConstantTermAttribute) {
						if ((<ConstantTermAttribute>id).value == this.bw.objects[this.objectInArm].ID) {
							return [[]];
						} else {
							return [];
						}
					} else {
						return [];
					}
				}
				break;

			case "space.directly.on.top.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isOnTopOf);
			case "space.inside.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isInsideOf);
			case "space.next-to":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isNextTo);
			case "space.north.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isNorthOf);
			case "space.east.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isEastOf);
			case "space.west.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isWestOf);
			case "space.south.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isSouthOf);
			case "space.northeast.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isNortheastOf);
			case "space.northwest.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isNorthwestOf);
			case "space.southeast.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isSoutheastOf);
			case "space.southwest.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isSouthwestOf);
			case "space.in.front.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isInFrontOf);
			case "space.behind":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isBehindOf);
			case "space.right.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isEastOf);
			case "space.left.of":
				return this.checkPredicateRelation(predicate.attributes[0], predicate.attributes[1], isWestOf);

			case SHRDLU_BLOCKTYPE_BLOCK:
			case SHRDLU_BLOCKTYPE_CUBE:
			case SHRDLU_BLOCKTYPE_PYRAMID:
			case SHRDLU_BLOCKTYPE_BOX:
			case SHRDLU_BLOCKTYPE_TABLE:
			case SHRDLU_BLOCKTYPE_ARM:
				{
					let id:TermAttribute = predicate.attributes[0];
					if (id instanceof VariableTermAttribute) {
						let bindings:[VariableTermAttribute,TermAttribute][][] = [];
						for(let idx:number = 0; idx<this.x.length; idx++) {
							if (this.bw.objects[idx].type == predicate.functor.name) {
								bindings.push([[id, new ConstantTermAttribute(this.bw.objects[idx].ID, BWPlanner.s_id_sort)]]);
							}
						}
						return bindings;
					} else if (id instanceof ConstantTermAttribute) {
						if (this.bw.objects[this.bw.idHash[(<ConstantTermAttribute>id).value]].type == predicate.functor.name) {
							return [[]];
						} else {
							return [];
						}
					} else {
						return [];
					}
				}
				break;

			case BW_SIZE_SMALL:
			case BW_SIZE_MEDIUM:
			case BW_SIZE_LARGE:
				{
					let id:TermAttribute = predicate.attributes[0];
					if (id instanceof VariableTermAttribute) {
						let bindings:[VariableTermAttribute,TermAttribute][][] = [];
						for(let idx:number = 0; idx<this.x.length; idx++) {
							if (this.bw.objects[idx].size == predicate.functor.name) {
								bindings.push([[id, new ConstantTermAttribute(this.bw.objects[idx].ID, BWPlanner.s_id_sort)]]);
							}
						}
						return bindings;
					} else if (id instanceof ConstantTermAttribute) {
						if (this.bw.objects[this.bw.idHash[(<ConstantTermAttribute>id).value]].size == predicate.functor.name) {
							return [[]];
						} else {
							return [];
						}
					} else {
						return [];
					}
				}
				break;

			case "color":
				{
					let a1:TermAttribute = predicate.attributes[0];
					let a2:TermAttribute = predicate.attributes[1];
					if ((a1 instanceof ConstantTermAttribute) &&
					    (a2 instanceof ConstantTermAttribute)) {
						let id:string = (<ConstantTermAttribute>a1).value;
						let color:string = (<ConstantTermAttribute>a2).value;

						if (this.bw.objects[this.bw.idHash[id]].color == color) {
							return [[]];
						} else {
							return [];
						}

					}  else if ((a1 instanceof VariableTermAttribute) &&
					    		(a2 instanceof ConstantTermAttribute)) {
						let color:string = (<ConstantTermAttribute>a2).value;
						let bindings:[VariableTermAttribute,TermAttribute][][] = [];
						for(let idx:number = 0; idx<this.x.length; idx++) {
							if (this.bw.objects[idx].color == color) {
								bindings.push([[a1, new ConstantTermAttribute(this.bw.objects[idx].ID, BWPlanner.s_id_sort)]]);
							}
						}
						return bindings;

					}  else if ((a1 instanceof ConstantTermAttribute) &&
					    		(a2 instanceof VariableTermAttribute)) {
						let id:string = (<ConstantTermAttribute>a1).value;
						let color:string = this.bw.objects[this.bw.idHash[id]].color;
						return [[[a2, new ConstantTermAttribute(color, o.getSort(color))]]];

					}  else if ((a1 instanceof VariableTermAttribute) &&
					    		(a2 instanceof VariableTermAttribute)) {
						let bindings:[VariableTermAttribute,TermAttribute][][] = [];
						for(let idx:number = 0; idx<this.x.length; idx++) {
							let color:string = this.bw.objects[idx].color;
							bindings.push([[a1, new ConstantTermAttribute(this.bw.objects[idx].ID, BWPlanner.s_id_sort)],
										   [a2, new ConstantTermAttribute(color, o.getSort(color))]]);
						}
						return bindings;
					}					
				}
				break;

			case "shape":
				{
					let a1:TermAttribute = predicate.attributes[0];
					let a2:TermAttribute = predicate.attributes[1];
					if ((a1 instanceof ConstantTermAttribute) &&
					    (a2 instanceof ConstantTermAttribute)) {
						let id:string = (<ConstantTermAttribute>a1).value;
						let shape:string = (<ConstantTermAttribute>a2).value;

						if (this.bw.objects[this.bw.idHash[id]].shape == shape) {
							return [[]];
						} else {
							return [];
						}

					}  else if ((a1 instanceof VariableTermAttribute) &&
					    		(a2 instanceof ConstantTermAttribute)) {
						let shape:string = (<ConstantTermAttribute>a2).value;
						let bindings:[VariableTermAttribute,TermAttribute][][] = [];
						for(let idx:number = 0; idx<this.x.length; idx++) {
							if (this.bw.objects[idx].shape == shape) {
								bindings.push([[a1, new ConstantTermAttribute(this.bw.objects[idx].ID, BWPlanner.s_id_sort)]]);
							}
						}
						return bindings;

					}  else if ((a1 instanceof ConstantTermAttribute) &&
					    		(a2 instanceof VariableTermAttribute)) {
						let id:string = (<ConstantTermAttribute>a1).value;
						let shape:string = this.bw.objects[this.bw.idHash[id]].shape;
						if (shape != null) {
							return [[[a2, new ConstantTermAttribute(shape, o.getSort(shape))]]];
						} else {
							return [];
						}
						
					}  else if ((a1 instanceof VariableTermAttribute) &&
					    		(a2 instanceof VariableTermAttribute)) {
						let bindings:[VariableTermAttribute,TermAttribute][][] = [];
						for(let idx:number = 0; idx<this.x.length; idx++) {
							let shape:string = this.bw.objects[idx].shape;
							if (shape != null) {
								bindings.push([[a1, new ConstantTermAttribute(this.bw.objects[idx].ID, BWPlanner.s_id_sort)],
											   [a2, new ConstantTermAttribute(shape, o.getSort(shape))]]);
							}
						}
						return bindings;
					}					
				}
				break;
		}

		console.error("checkPredicate: unsupported predicate: " + predicate);
		return [];
	}


	checkPredicateRelation(a1:TermAttribute, a2:TermAttribute, f:(o1:number, o2:number, state:BWPlannerState) => boolean) : [VariableTermAttribute,TermAttribute][][]
	{
		if ((a1 instanceof ConstantTermAttribute) &&
		    (a2 instanceof ConstantTermAttribute)) {
			let id1:string = (<ConstantTermAttribute>a1).value;
			let id2:string = (<ConstantTermAttribute>a2).value;
			if (f(this.bw.idHash[id1], this.bw.idHash[id2], this)) return [[]];
			return [];
		}  else if ((a1 instanceof VariableTermAttribute) &&
		    		(a2 instanceof ConstantTermAttribute)) {
			let id2:string = (<ConstantTermAttribute>a2).value;
			let bindings:[VariableTermAttribute,TermAttribute][][] = [];
			for(let idx1:number = 0; idx1<this.x.length; idx1++) {
				if (f(idx1, this.bw.idHash[id2], this)) {
					bindings.push([[a1, new ConstantTermAttribute(this.bw.objects[idx1].ID, BWPlanner.s_id_sort)]]);
				}
			}
			return bindings;
		}  else if ((a1 instanceof ConstantTermAttribute) &&
		    		(a2 instanceof VariableTermAttribute)) {
			let id1:string = (<ConstantTermAttribute>a1).value;
			let bindings:[VariableTermAttribute,TermAttribute][][] = [];
			for(let idx2:number = 0; idx2<this.x.length; idx2++) {
				if (f(this.bw.idHash[id1], idx2, this)) {
					bindings.push([[a2, new ConstantTermAttribute(this.bw.objects[idx2].ID, BWPlanner.s_id_sort)]]);
				}
			}
			return bindings;
		}  else if ((a1 instanceof VariableTermAttribute) &&
		    		(a2 instanceof VariableTermAttribute)) {
			let bindings:[VariableTermAttribute,TermAttribute][][] = [];
			for(let idx1:number = 0; idx1<this.x.length; idx1++) {
				for(let idx2:number = 0; idx2<this.x.length; idx2++) {
					if (f(idx1, idx2, this)) {
						bindings.push([[a1, new ConstantTermAttribute(this.bw.objects[idx1].ID, BWPlanner.s_id_sort)],
									   [a2, new ConstantTermAttribute(this.bw.objects[idx2].ID, BWPlanner.s_id_sort)]]);
					}
				}
			}
			return bindings;
		}
		return [];
	}	


	getDxO1O2(o1:number, o2:number) : number
	{
		let dx:number = 0;
		if (this.x[o1]+this.bw.objects[o1].dx < this.x[o2]) {
			dx = this.x[o2] - (this.x[o1]+this.bw.objects[o1].dx);
		} else if (this.x[o2]+this.bw.objects[o2].dx < this.x[o1]) {
			dx = this.x[o1] - (this.x[o2]+this.bw.objects[o2].dx);
		}
		return dx;
	}


	getDzO1O2(o1:number, o2:number) : number
	{
		let dz:number = 0;
		if (this.z[o1]+this.bw.objects[o1].dz < this.z[o2]) {
			dz = this.z[o2] - (this.z[o1]+this.bw.objects[o1].dz);
		} else if (this.z[o2]+this.bw.objects[o2].dz < this.z[o1]) {
			dz = this.z[o1] - (this.z[o2]+this.bw.objects[o2].dz);
		}
		return dz;
	}


	isWithinAngleOf(o1:number, o2:number, min:number, max:number, check_dx:boolean, check_dz:boolean) : boolean
	{
		if (o1 == null || o2 == null) return false;
		if (o1 == o2) return false;

		let dx_raw:number = (this.x[o1]+this.bw.objects[o1].dx/2)-(this.x[o2]+this.bw.objects[o2].dx/2);
		let dz_raw:number = (this.z[o1]+this.bw.objects[o1].dz/2)-(this.z[o2]+this.bw.objects[o2].dz/2);
		let dx:number = this.getDxO1O2(o1, o2);
		let dz:number = this.getDzO1O2(o1, o2);
		if (Math.abs(dx_raw) >= 1 || Math.abs(dz_raw) >= 1) {
			let angle:number = Math.atan2(dz_raw,dx_raw);
			if (check_dx && dx <= 0) return false;
			if (check_dz && dz <= 0) return false;
			return angle>(min*Math.PI/8) && angle<=(max*Math.PI/8);
		}
		return false;
	}


	collide(o1:number, o2:number): boolean
	{
		if (o1 == null || o2 == null) return false;
		if (this.x[o1]+this.bw.objects[o1].dx > this.x[o2] && this.x[o2]+this.bw.objects[o2].dx > this.x[o1] &&
			this.y[o1]+this.bw.objects[o1].dy > this.y[o2] && this.y[o2]+this.bw.objects[o2].dy > this.y[o1] &&
			this.z[o1]+this.bw.objects[o1].dz > this.z[o2] && this.z[o2]+this.bw.objects[o2].dz > this.z[o1]) {
			return true;
		}
		return false;
	}


	positionsToPutObjectOn(o_idx:number, base_idx:number) : [number,number,number][]
	{
		let positions:[number, number, number][] = [];
		let base:ShrdluBlock = this.bw.objects[base_idx];

		if (base.type != SHRDLU_BLOCKTYPE_BLOCK &&
			base.type != SHRDLU_BLOCKTYPE_CUBE &&
			base.type != SHRDLU_BLOCKTYPE_BOX &&
			base.type != SHRDLU_BLOCKTYPE_TABLE) return positions;

		let x1:number = this.x[base_idx];
		let y:number = this.y[base_idx] + base.dy;
		let z1:number = this.z[base_idx];
		let x2:number = this.x[base_idx] + base.dx;
		let z2:number = this.z[base_idx] + base.dz;
		if (base.type == SHRDLU_BLOCKTYPE_BOX) {
			x1 += 1;
			z1 += 1;
			x2 -= 1;
			z2 -= 1;
			y = this.y[base_idx] +1; 
		}

		let o:ShrdluBlock = this.bw.objects[o_idx];
		let resolution:number = 2;
		if (base.type == SHRDLU_BLOCKTYPE_TABLE) resolution = 4;
		for(let x:number = x1; x <= x2-o.dx; x+=resolution) {
			for(let z:number = z1; z <= z2-o.dz; z+=resolution) {
				let collision:boolean = false;
				for(let o2_idx:number = 0; o2_idx<this.x.length; o2_idx++) {
					if (this.bw.objects[o2_idx].type == SHRDLU_BLOCKTYPE_BOX &&
						this.y[o2_idx] < y) continue;	// ignore this collision
					if (o2_idx != o_idx && o2_idx != base_idx) {
						if (x+o.dx > this.x[o2_idx] && this.x[o2_idx]+this.bw.objects[o2_idx].dx > x &&
							y+o.dy > this.y[o2_idx] && this.y[o2_idx]+this.bw.objects[o2_idx].dy > y &&
							z+o.dz > this.z[o2_idx] && this.z[o2_idx]+this.bw.objects[o2_idx].dz > z) {
							collision = true;
							break;
						}
					}
				}
				if (!collision) {
					positions.push([x,y,z]);
				}
			}
		}

		return positions;
	}	


	bw:ShrdluBlocksWorld;
	x:number[];
	y:number[];
	z:number[];
	objectInArm:number = -1;
}


class BWPlanningPlan {

	convertToTerms(o:Ontology) : PlanningPlan
	{
		let p:PlanningPlan = new PlanningPlan();

		for(let action of this.actions) {
			if (action[0] == BW_PLANNING_ACTION_TAKE) {
				p.actions.push(new PlanningOperator(Term.fromString("action.take('shrdlu'[#id], '"+action[1]+"'[#id])", o), [], []));
			} else if (action[0] == BW_PLANNING_ACTION_PUT_IN) {
				if (action.length == 3) {
					p.actions.push(new PlanningOperator(Term.fromString("action.put-in('shrdlu'[#id], '"+action[1]+"'[#id], '"+action[2]+"'[#id])", o), [], []));
				} else if (action.length == 5) {
					p.actions.push(new PlanningOperator(Term.fromString("action.put-in('shrdlu'[#id], '"+action[1]+"'[#id], '"+action[2]+"'[#id], '"+action[3]+"'[number], '"+action[4]+"'[number])", o), [], []));
				}
			} else {
				console.error("convertToTerms: unsupported action " + action);
			}
		}

		return p;
	}

	clone() : BWPlanningPlan
	{
		let plan:BWPlanningPlan = new BWPlanningPlan();
		for(let action of this.actions) {
			plan.actions.push([...action]);
		}
		return plan;
	}

	betterThan(plan:BWPlanningPlan) : boolean
	{
		if (this.actions.length < plan.actions.length) return true;
		return false;
	}

	actions:string[][] = [];
}


class BWPlanner {
	constructor(bw:ShrdluBlocksWorld, o:Ontology) {
		this.bw = bw;
		this.o = o;
		if (BWPlanner.s_id_sort == null) {
			BWPlanner.s_id_sort = o.getSort("#id");
		}
	}


	plan(goal:PlanningCondition, maxDepth:number) : PlanningPlan
	{
		let initialPlan:BWPlanningPlan = new BWPlanningPlan();
		let s0:BWPlannerState = BWPlannerState.fromBlocksWorld(this.bw);
		this.steps = 0;
		// iterative deepening:
		for(let depth:number = 1;depth<=maxDepth;depth++) {
			if (this.DEBUG >= 1) console.log("- plan -------- max depth: " + depth + " - ");
			let plan:BWPlanningPlan = this.planInternal(s0, goal, initialPlan, depth);
			console.log("plan, steps: " + this.steps);
			if (plan != null) {
				// plan.autoCausalLinks(s0, this.occursCheck);
				return plan.convertToTerms(this.o);
			}
		}
		return null;
	}


	planInternal(state:BWPlannerState, goal:PlanningCondition, plan:BWPlanningPlan, maxDepth:number) : BWPlanningPlan
	{
		this.steps ++;
		if (this.DEBUG >= 1) {
			console.log("- planInternal -------- depth left: " + maxDepth + " - ");
			if (this.DEBUG >= 2) {
				console.log("State:");
				console.log(state.toString());
			}
		}
	
		// check if we are done:
		if (state.checkGoal(goal, this.o)) {
			return plan.clone();
		}
		if (maxDepth <= 0) return null;

		// prune when the search is futile:
		if (state.minimumStepsLeft(goal, this.o) > maxDepth) return null;

		// obtain candidate actions:
		let children:[string[],BWPlannerState][] = [];
		this.generateChildren(state, children, plan);
		if (this.DEBUG >= 1) {
			for(let tmp of children) {
				console.log("    candidate action: " + tmp[0]);
			}
		}

		// search:
		for(let [action,next_state] of children) {
			plan.actions.push(action)
			if (this.DEBUG >= 1) console.log("Executing action: " + action);
			let plan2:BWPlanningPlan = this.planInternal(next_state, goal, plan, maxDepth-1);
			if (plan2 != null) return plan2;
			plan.actions.pop();
		}

		return null;
	}


	generateChildren(state:BWPlannerState, children:[string[],BWPlannerState][], plan:BWPlanningPlan)
	{
		if (state.objectInArm == -1) {
			let forbidden:string = null;
			if (plan.actions.length > 0 &&
				plan.actions[plan.actions.length-1][0] == BW_PLANNING_ACTION_PUT_IN) {
				forbidden = plan.actions[plan.actions.length-1][1];
			}

			// take actions:
			for(let idx:number = 0; idx<state.x.length; idx++) {
				if (this.bw.objects[idx].type == SHRDLU_BLOCKTYPE_BLOCK ||
					this.bw.objects[idx].type == SHRDLU_BLOCKTYPE_CUBE ||
					this.bw.objects[idx].type == SHRDLU_BLOCKTYPE_PYRAMID ||
					this.bw.objects[idx].type == SHRDLU_BLOCKTYPE_BOX) {
					let canBeTaken:boolean = true;
					for(let idx2:number = 0; idx2<state.x.length; idx2++) {
						if (isOnTopOf(idx2, idx, state) ||
							isInsideOf(idx2, idx, state)) {
							canBeTaken = false;
							break;
						}
					}
					if (canBeTaken && this.bw.objects[idx].ID != forbidden) {
						// We also store the position we took the object from for prunning the search:
						let op:string[] = [BW_PLANNING_ACTION_TAKE, this.bw.objects[idx].ID, ""+state.x[idx], ""+state.z[idx]];
						let nextState:BWPlannerState = BWPlannerState.clone(state);
						nextState.y[idx] = 10000;
						nextState.objectInArm = idx;
						children.push([op, nextState])
					}
				}		
			}
		} else {
			// put in actions:
			let forbidden:[number, number] = null;
			if (plan.actions.length > 0 &&
				plan.actions[plan.actions.length-1][0] == BW_PLANNING_ACTION_TAKE) {
				forbidden = [Number(plan.actions[plan.actions.length-1][2]), Number(plan.actions[plan.actions.length-1][3])];
			}
			for(let idx:number = 0; idx<state.x.length; idx++) {
				if (this.bw.objects[state.objectInArm].ID == this.bw.objects[idx].ID) continue;
				let positions:[number, number, number][] = state.positionsToPutObjectOn(state.objectInArm, idx);
				for(let position of positions) {
					if (forbidden != null && position[0] == forbidden[0] && position[2] == forbidden[1]) continue;
					let op:string[] = [BW_PLANNING_ACTION_PUT_IN, this.bw.objects[state.objectInArm].ID, this.bw.objects[idx].ID, "" + position[0], "" + position[2]];
					let nextState:BWPlannerState = BWPlannerState.clone(state);
					nextState.x[state.objectInArm] = position[0];
					nextState.y[state.objectInArm] = position[1];
					nextState.z[state.objectInArm] = position[2];
					nextState.objectInArm = -1;
					children.push([op, nextState])
				}
			}
		}
	}


	DEBUG:number = 0;
	bw:ShrdluBlocksWorld = null;
	o:Ontology = null;
	occursCheck:boolean = false;
	steps:number = 0;

	static s_id_sort:Sort = null;
}
