/*
Notes: 
- Standard GraphPlan cannot handle negated preconditions. 
- This version can handle them to a limited extent. To be safe, only use negative preconditions that ideally do get changed by other operators (i.e., only those that should match the initial state)
*/

class GraphPlanLayer {
	mutex:boolean[][];
	links:number[][] = null;	// where do the elements come from in the previous layer

	signature() : number[]
	{
		return [];
	}

	toStringMutex() : string
	{
		let str:string = "mutex: [ ";
		let first:boolean = true;
		for(let idx:number = 0; idx<this.mutex.length; idx++) {
			if (first) {
				str += idx + ": [ ";
				first = false;
			} else {
				str += ", " + idx + ": [ ";
			}

			for(let idx2:number = 0;idx2<this.mutex[idx].length;idx2++) {
				if (this.mutex[idx][idx2]) {
					str += idx2 + " ";
				}
			}

			str += " ]";
		}
		return str + " ]";
	}
} 


class GraphPlanPredicateLayer extends GraphPlanLayer {

	static fromPlanningState(s:PlanningState) : GraphPlanPredicateLayer
	{
		let l:GraphPlanPredicateLayer = new GraphPlanPredicateLayer();

		for(let t of s.terms) {
			l.predicates.push(new PlanningPredicate(t, true));
		}

		l.mutex = [];
		for(let i:number = 0;i<l.predicates.length;i++) {
			l.mutex[i] = [];
			for(let j:number = 0;j<l.predicates.length;j++) {
				l.mutex[i][j] = false;
			}
		}
		return l;
	}


	static fromActionLayer(al:GraphPlanActionLayer, occursCheck:boolean)
	{
		let l:GraphPlanPredicateLayer = new GraphPlanPredicateLayer();

		l.links = [];
		for(let i:number=0; i<al.actions.length; i++) {
			for(let effect of al.actions[i].effect) {
				let found:number = -1;
				for(let j:number=0; j<l.predicates.length; j++) {
					if (l.predicates[j].equalsNoBindings(effect)) {
						found = j;
						break;
					}
				}
				if (found >= 0) {
					l.links[found].push(i);
				} else {
					l.predicates.push(effect);
					l.links.push([i]);
				}
			}
		}

		// mutex:
		l.mutex = [];
		for(let i:number = 0;i<l.predicates.length;i++) {
			l.mutex[i] = [];
			for(let j:number = 0;j<l.predicates.length;j++) {
				l.mutex[i][j] = false;
			}
		}
		for(let i:number = 0;i<l.predicates.length;i++) {
			for(let j:number = i+1;j<l.predicates.length;j++) {
				if (l.mutexPredicates(i, j, al)) {
					l.mutex[i][j] = true;
					l.mutex[j][i] = true;
				}
			}
		}

		return l;
	}


	mutexPredicates(idx1:number, idx2:number, al:GraphPlanActionLayer)
	{
		let p1:PlanningPredicate = this.predicates[idx1];
		let p2:PlanningPredicate = this.predicates[idx2];

		if (p1.sign != p2.sign &&
			p1.term.equalsNoBindings(p2.term) == 1) {
			return true;
		}

		// mutex actions:
		for(let link1 of this.links[idx1]) {
			for(let link2 of this.links[idx2]) {
				if (!al.mutex[link1][link2]) return false;
			}
		}

		return true;
	}


	equals(cl:GraphPlanPredicateLayer) : boolean
	{
		if (this.predicates.length != cl.predicates.length) return false;

		for(let idx:number = 0; idx<this.predicates.length; idx++) {
			if (!this.predicates[idx].equalsNoBindings(cl.predicates[idx])) return false;
			if (this.links[idx].length != cl.links[idx].length) return false;
			for(let idx2:number = 0; idx2<this.links[idx].length; idx2++) {
				if (this.links[idx][idx2] != cl.links[idx][idx2]) return false;
			}
			for(let idx2:number = idx+1; idx2<this.predicates.length; idx2++) {
				if (this.mutex[idx][idx2] != cl.mutex[idx][idx2]) return false;
			}
		}

		return true;
	}


	goalAchievable(goal:PlanningCondition, occursCheck) : number[][]
	{
		let solutions:number[][] = [];
		for(let goalConjunction of goal.predicates) {
			this.conjunctiveGoalAchievable(goalConjunction, 0, [], solutions, occursCheck);
		}
		return solutions;
	}


	conjunctiveGoalAchievable(goal:PlanningPredicate[], nextPredicate:number, predicatesUsed:number[], solutions:number[][], occursCheck:boolean)
	{
		if (nextPredicate >= goal.length) {
			// make sure the negated predicates are also satisfied:
			let b:Bindings = new Bindings();	// we reuse one, to prevent slow calls to "new"
			for(let goal_predicate of goal) {
				if (goal_predicate.sign) continue;
				let positiveMatches:number[] = [];
				let negativeMatches:number[] = [];
				for(let predicateIdx:number = 0; predicateIdx<this.predicates.length; predicateIdx++) {
					b.l = []
					let mutex:boolean = false;
					for(let idx2 of predicatesUsed) {
						if (this.mutex[predicateIdx][idx2]) {
							mutex = true;
							break;
						}
					}
					if (mutex) continue;
					if (goal_predicate.term.subsumes(this.predicates[predicateIdx].term, occursCheck, b)) {
						if (this.predicates[predicateIdx].sign) {
							positiveMatches.push(predicateIdx);
						} else {
							negativeMatches.push(predicateIdx);
						}
					}
				}
				// for each positive that matches there must be an equivalent negative to cover for it:
				/*
				let satisfied:boolean = true;
				for(let positive of positiveMatches) {
					let found:boolean = false;
					for(let negative of negativeMatches) {
						if (this.predicates[positive].term.equalsNoBindings(this.predicates[negative].term) == 1) {
							found = true;
							// we only need this negative if it is absolutely necessary to maintain the negative condition:
							predicatesUsed.push(negative);
							break;
						}
					}
					if (!found) {
						satisfied = false;
						break;
					}
				}
				if (!satisfied) return;
				*/
				if (positiveMatches.length > 0) {
					return;
				}
			}
			// add the new solution:
			let predicatesUsed_clone:number[] = [];
			for(let p of predicatesUsed) predicatesUsed_clone.push(p);
			solutions.push(predicatesUsed_clone);
		} else {
			let goal_predicate:PlanningPredicate = goal[nextPredicate];
			if (goal_predicate.sign) {
				let b:Bindings = new Bindings();	// we reuse one, to prevent slow calls to "new"
				for(let predicateIdx:number = 0; predicateIdx<this.predicates.length; predicateIdx++) {
					if (!this.predicates[predicateIdx].sign) continue;
					let mutex:boolean = false;
					for(let idx2 of predicatesUsed) {
						if (this.mutex[predicateIdx][idx2]) {
							mutex = true;
							break;
						}
					}
					if (mutex) continue;
					b.l = []
					if (goal_predicate.term.subsumes(this.predicates[predicateIdx].term, occursCheck, b)) {
						// console.log("        -> goal_predicate: " + goal_predicate.term.toString() + " satisfied");
						let len:number = predicatesUsed.length;
						predicatesUsed.push(predicateIdx);

						// instantiate the goal
						let new_goal:PlanningPredicate[] = [];
						if (b.l.length == 0) {
							new_goal = goal;
						} else {
							for(let gp of goal) {
								new_goal.push(gp.applyBindings(b));
							}
						}

						this.conjunctiveGoalAchievable(new_goal, nextPredicate+1, predicatesUsed, solutions, occursCheck);
						while(predicatesUsed.length > len) predicatesUsed.pop();
					}
				}
			} else {
				this.conjunctiveGoalAchievable(goal, nextPredicate+1, predicatesUsed, solutions, occursCheck);
			}
		}
	}


	signature() : number[]
	{
		let nl:number = 0;
		let nm:number = 0;

		for(let i:number = 0; i<this.predicates.length; i++) {
			if (this.links != null) nl += this.links[i].length;
			for(let j:number = 0; j<this.predicates.length; j++) {
				if (this.mutex[i][j]) nm ++;
			}
		}
		return [this.predicates.length, nl, nm];
	}


	toString() : string
	{
		let str:string = "predicates: [ ";
		let first:boolean = true;
		for(let idx:number = 0; idx<this.predicates.length; idx++) {
			let condition = this.predicates[idx];
			if (first) {
				str += idx + ": " + condition + " {" + (this.links != null ? this.links[idx]:"") + "}";
				first = false;
			} else {
				str += ", " + idx + ": " + condition + " {" + (this.links != null ? this.links[idx]:"") + "}";
			}
		}
		return str + " ]\nmutex: " + this.toStringMutex();
	}


	predicates:PlanningPredicate[] = [];
}


class GraphPlanActionLayer extends GraphPlanLayer {

	constructor(occursCheck:boolean)
	{
		super();
		this.occursCheck = occursCheck;
	}

	static fromPredicateLayer(cl:GraphPlanPredicateLayer, operators:PlanningOperator[], occursCheck:boolean) : GraphPlanActionLayer
	{
		let l:GraphPlanActionLayer = new GraphPlanActionLayer(occursCheck);

		l.links = [];

		// Dummy action for each predicate:
		for(let idx:number = 0; idx<cl.predicates.length; idx++) {
			let p:PlanningPredicate = cl.predicates[idx];
			l.actions.push(new PlanningOperator(null, [p], [p]));
			l.links.push([idx]);
		}

		// All possible actions:
		for(let operator of operators) {
			l.possibleActions(operator, cl, 0, []);
		}

		// Calculate mutex:
		l.mutex = [];
		for(let i:number = 0;i<l.actions.length;i++) {
			l.mutex[i] = [];
			for(let j:number = 0;j<l.actions.length;j++) {
				l.mutex[i][j] = false;
			}
		}
		for(let idx1:number = 0; idx1<l.actions.length; idx1++) {
			for(let idx2:number = idx1+1; idx2<l.actions.length; idx2++) {
				if (l.mutexActions(idx1, idx2, cl)) {
					l.mutex[idx1][idx2] = true;
					l.mutex[idx2][idx1] = true;
				}
			}
		}

		return l;
	}



	mutexActions(idx1:number, idx2:number, cl:GraphPlanPredicateLayer) : boolean
	{	
		let a1:PlanningOperator = this.actions[idx1];
		let a2:PlanningOperator = this.actions[idx2];
		let b:Bindings = new Bindings();
		for(let p1 of a1.effect) {
			for(let p2 of a2.precondition) {
				b.l = [];
				if (p1.sign != p2.sign &&
					p1.term.unify(p2.term, true, b)) {
					return true;
				}
			}
			for(let p2 of a2.effect) {
				b.l = [];
				if (p1.sign != p2.sign &&
					p1.term.unify(p2.term, true, b)) {
					return true;
				}
			}
		}
		for(let p2 of a2.effect) {
			for(let p1 of a1.precondition) {
				b.l = [];
				if (p1.sign != p2.sign &&
					p1.term.unify(p2.term, true, b)) {
					return true;
				}
			}
		}

		for(let link1 of this.links[idx1]) {
			for(let link2 of this.links[idx2]) {
				if (cl.mutex[link1][link2]) return true;
			}
		}
		return false;
	}	


	possibleActions(operator:PlanningOperator, cl:GraphPlanPredicateLayer, 
					nextPrecondition:number, predicatesUsed:number[])
	{
		if (nextPrecondition >= operator.precondition.length) {
			// make sure the negated preconditions are also satisfied:
			let b:Bindings = new Bindings();	// we reuse one, to prevent slow calls to "new"
			for(let precondition of operator.precondition) {
				if (precondition.sign) continue;
				let positiveMatches:number[] = [];
				let negativeMatches:number[] = [];
				for(let predicateIdx:number = 0; predicateIdx<cl.predicates.length; predicateIdx++) {
					b.l = []
					let mutex:boolean = false;
					for(let idx2 of predicatesUsed) {
						if (cl.mutex[predicateIdx][idx2]) {
							mutex = true;
							break;
						}
					}
					if (mutex) continue;
					if (precondition.term.subsumes(cl.predicates[predicateIdx].term, this.occursCheck, b)) {
						if (cl.predicates[predicateIdx].sign) {
							positiveMatches.push(predicateIdx);
						} else {
							negativeMatches.push(predicateIdx);
						}
					}
				} 
				// for each positive that matches there must be an equivalent negative that also matches:
				/*
				let satisfied:boolean = true;
				if (positiveMatches.length <= negativeMatches.length) {
					for(let positive of positiveMatches) {
						let found:boolean = false;
						for(let negative of negativeMatches) {
							if (cl.predicates[positive].term.equalsNoBindings(cl.predicates[negative].term) == 1) {
								found = true;
								predicatesUsed.push(negative);
								break;
							}
						}
						if (!found) {
							satisfied = false;
							break;
						}
					}
				} else {
					satisfied = false;
				}
				if (!satisfied) {
					if (GraphPlanPlanner.DEBUG>=1)  console.log("    removing " + operator.signature + " because ~" + precondition.term + " is not achievable ("+positiveMatches.length+"/"+negativeMatches.length+"), used: " + predicatesUsed);
					return;
				}
				*/
				if (positiveMatches.length > 0) {
					if (GraphPlanPlanner.DEBUG>=1)  console.log("    removing " + operator.signature + " because ~" + precondition.term + " is not achievable ("+positiveMatches.length+"/"+negativeMatches.length+"), used: " + predicatesUsed);
					return;
				}
			}
			// add the new action:
			this.actions.push(operator);
			let predicatesUsed_clone:number[] = [];
			for(let p of predicatesUsed) predicatesUsed_clone.push(p);
			this.links.push(predicatesUsed_clone);
		} else {
			let precondition:PlanningPredicate = operator.precondition[nextPrecondition];
			if (precondition.sign) {
				let b:Bindings = new Bindings();	// we reuse one, to prevent slow calls to "new"
				for(let predicateIdx:number = 0; predicateIdx<cl.predicates.length; predicateIdx++) {
					if (!cl.predicates[predicateIdx].sign) continue;
					let mutex:boolean = false;
					for(let idx2 of predicatesUsed) {
						if (cl.mutex[predicateIdx][idx2]) {
							mutex = true;
							break;
						}
					}
					if (mutex) continue;
					b.l = []
					if (precondition.term.subsumes(cl.predicates[predicateIdx].term, this.occursCheck, b)) {
						// console.log("        -> precondition: " + precondition.term.toString() + " satisfied");
						let len:number = predicatesUsed.length;
						predicatesUsed.push(predicateIdx);
						this.possibleActions(operator.instantiate(b), cl, nextPrecondition+1, predicatesUsed);
						while(predicatesUsed.length > len) predicatesUsed.pop();
					}
				}
			} else {
				this.possibleActions(operator, cl, nextPrecondition+1, predicatesUsed);
			}
		}
	}


	signature() : number[]
	{
		let nl:number = 0;
		let nm:number = 0;

		for(let i:number = 0; i<this.actions.length; i++) {
			if (this.links != null) nl += this.links[i].length;
			for(let j:number = 0; j<this.actions.length; j++) {
				if (this.mutex[i][j]) nm ++;
			}
		}
		return [this.actions.length, nl, nm];
	}


	toString() : string
	{
		let str:string = "actions: [ ";
		let first:boolean = true;
		for(let idx:number = 0; idx<this.actions.length; idx++) {
			let action = this.actions[idx];
			if (first) {
				first = false;
				if (action.signature == null) {
					str += idx + ": - {" + this.links[idx] + "}";
				} else {
					str += idx + ": " +action.signature + " {" + this.links[idx] + "}";
				}
			} else {
				if (action.signature == null) {
					str += ", " + idx + ": - {" + this.links[idx] + "}";
				} else {
					str += ", " + idx + ": " + action.signature + " {" + this.links[idx] + "}";
				}
			}
		}
		return str + " ]\nmutex: " + this.toStringMutex();
	}


	occursCheck:boolean = false;
	actions:PlanningOperator[] = [];
}


/*
action.take(V0:'pyramid-9'[#id], V1:'cube-4'[#id])
action.put-in(V0:'pyramid-9'[#id], V1:'block-3'[#id])
action.take(V0:'pyramid-10'[#id], V1:'cube-7'[#id])
action.put-in(V0:'pyramid-10'[#id], V1:'cube-4'[#id])
*/

class GraphPlanPlanner extends PlanningPlanner {
	constructor(a_o:PlanningOperator[], occursCheck:boolean) {
		super(a_o, occursCheck);
	}


	plan(s0:PlanningState, goal:PlanningCondition, maxDepth:number) : PlanningPlan
	{
		let graph:GraphPlanLayer[] = this.initPlanGraph(s0);

		if (GraphPlanPlanner.DEBUG>=1)  {
			console.log("predicates signature: " + graph[0].signature());
			console.log(graph[0].toString());
		}

		let cl:GraphPlanPredicateLayer = <GraphPlanPredicateLayer>graph[graph.length-1];
		let solutions:number[][] = cl.goalAchievable(goal, this.occursCheck);
		if (solutions.length > 0) {
			if (GraphPlanPlanner.DEBUG>=1)  console.log("GraphPlanPlanner.plan: goal achievable with " + graph.length + " layers. " + solutions.length + " possible solutions.");
			// search for a plan:
			for(let solution of solutions) {
				let plan:PlanningPlan = this.searchPlan(graph, solution);
				if (plan != null) {
					plan.autoCausalLinks(s0, this.occursCheck);
					return plan;
				}
			}
		}

		do{
			this.addPlanGraphLayer(graph);
			if (GraphPlanPlanner.DEBUG>=1)  {
				let al:GraphPlanActionLayer = <GraphPlanActionLayer>graph[graph.length-2];
				console.log("action signature: " + al.signature());
				console.log((graph.length-2) + ": " + al.toString());
				cl = <GraphPlanPredicateLayer>graph[graph.length-1];
				console.log("predicates signature: " + cl.signature());
				console.log((graph.length-1) + ": " + cl.toString());
			}

			cl = <GraphPlanPredicateLayer>graph[graph.length-1];
			let solutions:number[][] = cl.goalAchievable(goal, this.occursCheck);
			if (solutions.length > 0) {
				if (GraphPlanPlanner.DEBUG>=1) console.log("GraphPlanPlanner.plan: goal achievable with " + graph.length + " layers. " + solutions.length + " possible solutions.");
				// search for a plan:
				for(let solution of solutions) {
					let plan:PlanningPlan = this.searchPlan(graph, solution);
					if (plan != null) {
						plan.autoCausalLinks(s0, this.occursCheck);
						return plan;
					}
				}
			}			
		} while(!this.fixedPointAchieved(graph) && graph.length < (maxDepth*2+1));

		return null;
	}


	initPlanGraph(s0:PlanningState) : GraphPlanLayer[]
	{
		let graph:GraphPlanLayer[] = [];

		let cl:GraphPlanPredicateLayer = GraphPlanPredicateLayer.fromPlanningState(s0);
		graph.push(cl);

		return graph;
	}


	addPlanGraphLayer(graph:GraphPlanLayer[])
	{
		let cl:GraphPlanPredicateLayer = <GraphPlanPredicateLayer>(graph[graph.length-1]);
		let al:GraphPlanActionLayer = GraphPlanActionLayer.fromPredicateLayer(cl, this.operators, this.occursCheck);
		graph.push(al);
		graph.push(GraphPlanPredicateLayer.fromActionLayer(al, this.occursCheck));
	}


	fixedPointAchieved(graph:GraphPlanLayer[]) : boolean
	{
		if (graph.length<3) return false;
		return (<GraphPlanPredicateLayer>graph[graph.length-3]).equals(<GraphPlanPredicateLayer>graph[graph.length-1]);
	}


	searchPlan(graph:GraphPlanLayer[], targetPredicates:number[]) : PlanningPlan
	{
		let plan:PlanningPlan = new PlanningPlan();

		// search for a plan:
		if (this.searchPlanInternal(graph, targetPredicates, plan, graph.length-1)) return plan;
		return null;
	}


	searchPlanInternal(graph:GraphPlanLayer[], targetPredicates:number[], plan:PlanningPlan, layer_idx:number) : boolean
	{
		// trivial case of goal satisfied at start:
		if (layer_idx == 0) return true;

		if (GraphPlanPlanner.DEBUG>=1) console.log("searchPlanInternal " + layer_idx + ": " + targetPredicates);

		let cl:GraphPlanPredicateLayer = <GraphPlanPredicateLayer>graph[layer_idx];
		let al:GraphPlanActionLayer = <GraphPlanActionLayer>graph[layer_idx-1];
		let solutions:number[][] = [];
		this.actionsToAchievePredicates(targetPredicates, 0, [], cl, al, solutions);
		for(let solution of solutions) {
			let nextTargetPredicates:number[] = [];
			let len:number = plan.actions.length;
			for(let action of solution) {
				for(let link of al.links[action]) {
					nextTargetPredicates.push(link);
				}
				if (al.actions[action].signature != null) plan.actions.unshift(al.actions[action]);
			}

			if (this.searchPlanInternal(graph, nextTargetPredicates, plan, layer_idx-2)) return true;

			// backtrack:
			while(plan.actions.length > len) plan.actions.splice(0,1);
		}
		return false;
	}


	actionsToAchievePredicates(targetPredicates:number[], idx:number, solution:number[], l:GraphPlanPredicateLayer, l_prev:GraphPlanActionLayer, solutions:number[][])
	{
		if (idx >= targetPredicates.length) {
			let solution_clone:number[] = [];
			let atLeastOneRealAction:boolean = false;
			for(let action of solution) {
				solution_clone.push(action);
				if (l_prev.actions[action].signature != null) atLeastOneRealAction = true;
			}
			if (atLeastOneRealAction) {
				solutions.push(solution_clone);
				if (GraphPlanPlanner.DEBUG>=1) console.log("    solution: " + solution_clone);
			}
			return;
		}
		let links:number[] = l.links[targetPredicates[idx]];
		for(let link of links) {
			let mutex:boolean = false;
			for(let previous of solution) {
				if (l_prev.mutex[link][previous]) {
					mutex = true;
					break;
				}
			}
			if (mutex) continue;
			if (solution.indexOf(link) == -1) {
				solution.push(link);
				this.actionsToAchievePredicates(targetPredicates, idx+1, solution, l, l_prev, solutions);
				solution.pop();
			} else {
				this.actionsToAchievePredicates(targetPredicates, idx+1, solution, l, l_prev, solutions);
			}
		}
	}


	static DEBUG:number = 0;
}
