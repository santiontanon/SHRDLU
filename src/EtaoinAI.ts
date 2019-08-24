class AttentionRecord {
	constructor(o:A4Object, p:number, a:number)
	{
		this.object = o;
		this.priority = p;
		this.anxiety = a;
	}

	object:A4Object = null;
	priority:number = 1;
	anxiety:number = 0;
}


class EtaoinAI extends A4RuleBasedAI {
	constructor(o:Ontology, nlp:NLParser, stationMaps:A4Map[], game:A4Game,
				rulesFileNames:string[])
	{
		super(o, nlp, game, 12, 0, DEFAULT_QUESTION_PATIENCE_TIMER);
		console.log("EtaoinAI.constructor Start...");

		this.selfID = "etaoin";
		this.stationMaps = stationMaps;

		this.intentionHandlers.push(new EtaoinTalk_IntentionAction());
		this.intentionHandlers.push(new EtaoinOpen_IntentionAction());
		this.intentionHandlers.push(new EtaoinClose_IntentionAction());
		this.intentionHandlers.push(new EtaoinSwitchOn_IntentionAction());
		this.intentionHandlers.push(new EtaoinSwitchOff_IntentionAction());		
		this.intentionHandlers.push(new EtaoinConnectTo_IntentionAction());
		this.intentionHandlers.push(new EtaoinHelp_IntentionAction());

		// load specific knowledge:
		for(let rulesFileName of rulesFileNames) {
			let xmlhttp:XMLHttpRequest = new XMLHttpRequest();
			xmlhttp.overrideMimeType("text/xml");
			xmlhttp.open("GET", rulesFileName, false); 
			xmlhttp.send();
			this.loadLongTermRulesFromXML(xmlhttp.responseXML.documentElement);
		}

		this.precalculateLocationKnowledge(game, o);

		// get objects the AI cares about:
		let tmp:A4Object[] = game.findObjectByID("david");
		if (tmp!=null) this.player_object = tmp[tmp.length-1];
		tmp = game.findObjectByName("communicator");
		if (tmp!=null) this.communicator_object = tmp[tmp.length-1];

		let attention_IDs:string[] = ["david","communicator","shrdlu","qwerty"];
		let attention_priorities:number[] = [5,1,1,1];
		for(let i:number = 0;i<attention_IDs.length;i++) {
			let obj_l:A4Object[] = game.findObjectByID(attention_IDs[i]);
			if (obj_l!=null) {
				let obj:A4Object = obj_l[obj_l.length-1];
				this.attention.push(new AttentionRecord(obj, attention_priorities[i], 0));
			}
		}

		console.log("EtaoinAI.constructor End...");
	}


	update(timeStamp:number) 
	{
		super.update(timeStamp);

		// if the player is running out of oxygen, notify her:
		if (this.game.suit_oxygen < SHRDLU_MAX_SPACESUIT_OXYGEN*0.25 &&
			this.oxygen_message_timer == 0) {

			if (this.queuedIntentions.length == 0 &&
				this.withinEtaoinViewRange(this.game.currentPlayer)) {				

				let term2:Term = new Term(this.game.ontology.getSort("action.talk"), 
										 [new ConstantTermAttribute("david", this.game.ontology.getSort("#id")), 
										  new TermTermAttribute(Term.fromString("perf.inform(V0:'david'[#id], oxygen-level('david'[#id],'low'[low]))", this.game.ontology))]);
				this.queueIntention(term2, null, null);

				term2 = new Term(this.game.ontology.getSort("action.talk"), 
								 [new ConstantTermAttribute("david", this.game.ontology.getSort("#id")), 
								  new TermTermAttribute(Term.fromString("perf.request.action('david'[#id], verb.come-back(E:'david'[#id]))", this.game.ontology))]);
				this.queueIntention(term2, null, null);

				this.oxygen_message_timer = 50*20;	// do not say anything for 20 seconds
			}
			
		} else {
			if (this.oxygen_message_timer > 0) this.oxygen_message_timer--;
		}
	}	


	attentionAndPerception()
	{
		this.clearPerception();

		// attention selection:
		// pick the object that generates the maximum anxiety:
		let max_anxiety_object:AttentionRecord = null;
		for(let i:number = 0;i<this.attention.length;i++) {
			// increment anxiety of objects:
			this.attention[i].anxiety += this.attention[i].priority;
//			console.log("EtaoinAI: attention["+this.attention[i].object.name+"].anxiety = " + this.attention[i].anxiety);

			if (max_anxiety_object == null ||
				this.attention[i].anxiety > max_anxiety_object.anxiety) {
				if (this.withinEtaoinViewRange(this.attention[i].object)) max_anxiety_object = this.attention[i];
			}
		}

		let attention_object:A4Object = null;
		let attention_object_l:A4Object[] = null;
		let attention_map:A4Map = null;
		let attention_x:number = 0;
		let attention_y:number = 0;
		if (max_anxiety_object != null) {
			max_anxiety_object.anxiety = 0;
			attention_object = max_anxiety_object.object;
			if (attention_object.map == null) {
				attention_object_l = this.game.findObjectByName(attention_object.name);
				if (attention_object_l!=null) {
					attention_object = attention_object_l[0];				
				}
			}
			attention_map = attention_object.map;
			attention_x = attention_object.x;
			attention_y = attention_object.y + attention_object.tallness;
		}

		if (attention_map==null) {
			//console.log("EtaoinAI: attention_map = null");
			return;
		}

		// find the AILocation:
		let location:AILocation = null;
		let location_idx:number = -1;
		let occupancyMap:boolean[] = null;
		let tile_x:number = Math.floor(attention_x/attention_map.tileWidth);
		let tile_y:number = Math.floor(attention_y/attention_map.tileHeight);
		let offset:number = tile_x + tile_y*attention_map.width;
		for(let location_idx2:number = 0;location_idx2<this.game.locations.length;location_idx2++) {
			let l:AILocation = this.game.locations[location_idx2];
			for(let i:number = 0;i<l.maps.length;i++) {
				if (l.maps[i] == attention_map) {
					if (l.mapOccupancyMaps[i][offset]) {
						if (location == null) {
							location = l;
							location_idx = location_idx2;
							occupancyMap = l.mapOccupancyMaps[i];
						} else {
							if (this.game.location_in[location_idx2][location_idx]) {
								location = l;
								location_idx = location_idx2;
								occupancyMap = l.mapOccupancyMaps[i];
							}
						}
					}
				}
			}
		}

		// perception:
		if (location != null) {
			let visibilityRegion:number = attention_map.visibilityRegion(tile_x,tile_y);
			let perceptionRadius = 10;
			this.perception((tile_x-perceptionRadius)*attention_map.tileWidth, 
							(tile_y-perceptionRadius)*attention_map.tileHeight, 
							(tile_x+perceptionRadius)*attention_map.tileWidth, 
							(tile_y+perceptionRadius)*attention_map.tileHeight, 
						    location, attention_map, visibilityRegion, occupancyMap, null);

			if (max_anxiety_object.object.name == "communicator" &&
				max_anxiety_object.object != attention_object &&
				attention_object_l.length>1) {
				// the communicator is in the pocket of someone, or in some container:
				let container:A4Object = attention_object_l[attention_object_l.length-2];
				let o:A4Object = attention_object_l[attention_object_l.length-1];
	//			console.log("comm: " + o.ID + ", container: " + container.ID);

				let term1:Term = new Term(o.sort, [new ConstantTermAttribute(o.ID, this.cache_sort_id)]);
				let term2:Term = new Term(this.cache_sort_verb_have, 
										  [new ConstantTermAttribute(container.ID, this.cache_sort_id),
										   new ConstantTermAttribute(o.ID, this.cache_sort_id)
	//									   new ConstantTermAttribute(tile_ox, this.cache_sort_number),
	//									   new ConstantTermAttribute(tile_oy, this.cache_sort_number),
	//									   new ConstantTermAttribute(map.name, this.cache_sort_symbol)
											   ]);
	//			console.log(term1.toString());
	//			console.log(term2.toString());
				this.addTermToPerception(term1);
				this.addTermToPerception(term2);

				for(let property of this.getBaseObjectProperties(o)) {
					this.addTermToPerception(property);
				}
			}
		}

		// etaoin perceives itself:
		if (this.self_perception_term == null) {
			this.self_perception_term = Term.fromString("disembodied-ai('"+this.selfID+"'[#id])", this.o);
		}		
		this.addTermToPerception(this.self_perception_term)

		this.addTermToPerception(Term.fromString("temperature('location-aurora-station'[#id],'"+this.game.aurora_station_temperature_sensor_indoors+"'[temperature.unit.celsius])", this.o));
		this.addTermToPerception(Term.fromString("temperature('location-aurora-settlement'[#id],'"+this.game.aurora_station_temperature_sensor_outdoors+"'[temperature.unit.celsius])", this.o));
		this.addTermToPerception(Term.fromString("temperature('spacer-valley'[#id],'"+this.game.aurora_station_temperature_sensor_outdoors+"'[temperature.unit.celsius])", this.o));
		this.addTermToPerception(Term.fromString("property.sighted('"+this.selfID+"'[#id])", this.o));
	}


	reactToPerformative(perf2:Term, speaker:TermAttribute, context:NLContext) : Term[]
	{
		// if the player is talking to us, then we close communicator connections to other characters:
		if (this.game.communicatorConnectedTo != null && 
			(speaker instanceof ConstantTermAttribute) &&
			(<ConstantTermAttribute>speaker).value == "david") {
			this.game.communicatorConnectedTo = null;
			this.game.communicatorConnectionTime = 0;
		}

		return super.reactToPerformative(perf2, speaker, context);
	}	


	withinEtaoinViewRange(o:A4Object)
	{
		if (this.baseindoors_location == null) {
			this.baseindoors_location = this.game.getAILocationByID("location-aurora-station");
			this.baseoutdoors_location = this.game.getAILocationByID("location-aurora-settlement");
			this.spacervalleysouth_location = this.game.getAILocationByID("spacer-valley-south");
		}
		let l:AILocation = this.game.getAILocation(o);
		if (l == null) return false;

		// if the object is in the station (settlement):
		if (l == this.baseindoors_location) return true;
		if (this.game.location_in[this.game.locations.indexOf(l)][this.game.locations.indexOf(this.baseoutdoors_location)]) return true;

		// if it is the comunicator:
		if (o == this.communicator_object) {
			// once the comm tower is repaired, the communicator can be reached anywhere
			if (this.game.comm_tower_repaired) return true;

			// communicator works only in spacer valley south:
			if (l == this.baseindoors_location) return true;
			if (l == this.baseoutdoors_location) return true;
			if (l == this.spacervalleysouth_location) return true;
			if (this.game.location_in[this.game.locations.indexOf(l)][this.game.locations.indexOf(this.spacervalleysouth_location)]) return true;
		}

		return false;
	}


	// For ETAOIN seeing/hearing is the same:
	canHear(objectID:string)
	{
		return this.canSee(objectID);
	}


	restoreFromXML(xml:Element)
	{
		super.restoreFromXML(xml);

		let xml_tmp:Element = getFirstElementChildByTag(xml, "oxygen_message_timer");
		if (xml_tmp != null) {
			this.oxygen_message_timer = Number(xml_tmp.getAttribute("value"));
		}
	}


	savePropertiesToXML() : string
	{
		let str:string = super.savePropertiesToXML() + "\n";

		str += "<oxygen_message_timer value=\""+this.oxygen_message_timer+"\"/>";

		return str;
	}	


	// perception:
	stationMaps:A4Map[] = [];	// these are the maps representing Aurora Station, over which Etaoin has direct perception
	self_perception_term:Term = null;

	// special objects:
	player_object:A4Object = null;
	communicator_object:A4Object = null;

	baseindoors_location:AILocation = null;
	baseoutdoors_location:AILocation = null;
	spacervalleysouth_location:AILocation = null;

	// attention:
	attention:AttentionRecord[] = [];

	oxygen_message_timer:number = 0;

}
