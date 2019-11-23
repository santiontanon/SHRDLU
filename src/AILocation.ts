class AILocation {
	id:string = null;
	name:string = null;
	sort:Sort = null;
	maps:A4Map[] = [];
	mapOccupancyMaps:boolean[][] = [];
	preferredCenterCoordinatesInMap:[number,number][] = [];	// if these are != null, they will be used as center coordiantes.
															// Used, for example, for the Tardis 8, when you ask a robot to go there, so that they just
															// enter, rather than entering and then navigating half the ship to get to the center.


	distanceFromObject(o:A4Object, mapIdx:number) : number
	{
		let map:A4Map = this.maps[mapIdx];
		let tile_x:number = Math.floor((o.x + o.getPixelWidth()/2)/map.tileWidth);
		let tile_y:number = Math.floor((o.y + o.tallness + (o.getPixelHeight() - o.tallness)/2)/map.tileHeight);
		let offset:number = tile_x + tile_y*map.width;
		if (this.mapOccupancyMaps[mapIdx][offset]) {
			return 0;
		} else {
			let closestDistance:number = null;
			for(let i:number = 0;i<this.mapOccupancyMaps[mapIdx].length;i++) {
				if (this.mapOccupancyMaps[mapIdx][i]) {
					let x:number = i%map.width;
					let y:number = Math.floor(i/map.width);
					let d:number = Math.sqrt((tile_x-x)*(tile_x-x) + (tile_y-y)*(tile_y-y)) * SHRDLU_TILE_SIZE;
					if (closestDistance == null || d<closestDistance) closestDistance = d;
				}
			}
			return closestDistance;
		}
	}


	distanceFromLocation(l2:AILocation, game:A4Game) : number
	{
		let l1_idx:number = game.locations.indexOf(this);
		let l2_idx:number = game.locations.indexOf(l2);
		if (l1_idx >= 0 && l2_idx >= 0 && 
			(game.location_in[l1_idx][l2_idx] || game.location_in[l2_idx][l1_idx])) return 0;

		for(let map of this.maps) {
			for(let map2 of l2.maps) {
				if (map == map2) {
					let c1:[number,number] = this.centerCoordinatesInMap(map);
					let c2:[number,number] = l2.centerCoordinatesInMap(map);
					if (c1 != null && c2 != null) {
						return Math.sqrt((c1[0]-c2[0])*(c1[0]-c2[0]) + (c1[1]-c2[1])*(c1[1]-c2[1]));
					}
				}
			}
		}
		return null;
	}


	centerCoordinatesInMap(map:A4Map) : [number,number]
	{
		let x1:number = 0;
		let y1:number = 0;
		let total:number = 0;

		for(let i:number = 0;i<this.maps.length;i++) {
			if (this.maps[i] == map) {
				if (this.preferredCenterCoordinatesInMap[i] != null) {
					return this.preferredCenterCoordinatesInMap[i];
				}
				let offset:number = 0;
				for(let y:number = 0;y<this.maps[i].height;y++) {
					for(let x:number = 0;x<this.maps[i].width;x++, offset++) {
						if (this.mapOccupancyMaps[i][offset]) {
							x1 += x*this.maps[i].tileWidth;
							y1 += y*this.maps[i].tileHeight;
							total ++;
						}
					}
				}
			}
		}
		if (total == 0) return null;
		x1 = Math.floor(x1/(total*map.tileWidth))*map.tileWidth;
		y1 = Math.floor(y1/(total*map.tileHeight))*map.tileHeight;
		return [x1, y1];
	}


	centerWalkableCoordinatesInMap(map:A4Map, character:A4Object) : [number,number]
	{
		let x1:number = 0;
		let y1:number = 0;
		let total:number = 0;

		for(let i:number = 0;i<this.maps.length;i++) {
			if (this.maps[i] == map) {
				if (this.preferredCenterCoordinatesInMap[i] != null) {
					let x:number = this.preferredCenterCoordinatesInMap[i][0];
					let y:number = this.preferredCenterCoordinatesInMap[i][1];
					if (map.walkable(x, y+character.tallness,
								 	 character.getPixelWidth(), character.getPixelHeight()-character.tallness, character)) {
						return this.preferredCenterCoordinatesInMap[i];
					}
				}

				// calculate the center of the walkable area:
				let offset:number = 0;
				for(let y:number = 0;y<this.maps[i].height;y++) {
					for(let x:number = 0;x<this.maps[i].width;x++, offset++) {
						if (this.mapOccupancyMaps[i][offset] &&
							map.walkable(x*map.tileWidth, y*map.tileHeight+character.tallness,
										 character.getPixelWidth(), character.getPixelHeight()-character.tallness, character)) {
							x1 += x*this.maps[i].tileWidth;
							y1 += y*this.maps[i].tileHeight;
							total ++;
						}
					}
				}

				if (total == 0) return null;
				x1 = Math.floor(x1/(total*map.tileWidth))*map.tileWidth;
				y1 = Math.floor(y1/(total*map.tileHeight))*map.tileHeight;

				// find walkable coordinates outside of a bridge:
				let half_width:number = character.getPixelWidth()/2;
				let half_height:number = (character.getPixelHeight()-character.tallness)/2;
				let best:[number,number] = null;
				let best_d:number = 0;
				offset = 0;
				for(let y:number = 0;y<this.maps[i].height;y++) {
					for(let x:number = 0;x<this.maps[i].width;x++, offset++) {
						if (this.mapOccupancyMaps[i][offset] &&
							map.walkable(x*map.tileWidth, y*map.tileHeight+character.tallness,
										 character.getPixelWidth(), character.getPixelHeight()-character.tallness, character)) {
                            let bridge:A4MapBridge = map.getBridge(x*map.tileWidth+half_width, 
                            									   y*map.tileHeight+character.tallness+half_height);
                            if (bridge==null) {
								let xtmp:number = x*this.maps[i].tileWidth;
								let ytmp:number = y*this.maps[i].tileHeight;
								let d:number = (x1-xtmp)*(x1-xtmp) + (y1-ytmp)*(y1-ytmp);
								if (best == null || d<best_d) {
									best_d = d;
									best = [xtmp, ytmp];
								}
							}
						}
					}
				}

				return best;
			}
		}

		return null;
	}



	static loadLocationsFromXML(xml:Element, game:A4Game, o:Ontology)
	{
		// load the new locations:
		for(let map_xml of getElementChildrenByTag(xml,"map")) {
			let mapName:string = map_xml.getAttribute("name");
			let w:number = Number(map_xml.getAttribute("width"));
			let h:number = Number(map_xml.getAttribute("height"));
			let data:string = getFirstElementChildByTag(map_xml,"data").firstChild.nodeValue;
			let splitData:string[] = data.split(",");
			for(let i:number = 0;i<splitData.length;i++) splitData[i] = splitData[i].trim();
//			console.log("location data for " + mapName + ": " + splitData);

			for(let location_xml of getElementChildrenByTag(map_xml,"location")) {
				let code:string = location_xml.getAttribute("code");
				let id:string = location_xml.getAttribute("id");
				let name:string = location_xml.getAttribute("name");
				let sort:string = location_xml.getAttribute("sort");

				let location:AILocation = null;
				for(let l2 of game.locations) {
					if (l2.id == id) {
						location = l2;
						break;
					}
				}
				if (location == null) {
					location = new AILocation();
					location.id = id;
					location.name = name;
					location.sort = o.getSort(sort);
					game.locations.push(location);
				}

				let occupancyMap:boolean[] = new Array(w*h);
				for(let i:number = 0;i<w*h;i++) {
					if (splitData[i] == code) occupancyMap[i] = true;
					else occupancyMap[i] = false;
				}
				location.maps.push(game.getMap(mapName));
				location.mapOccupancyMaps.push(occupancyMap);
				location.preferredCenterCoordinatesInMap.push(null);
			}
		}

		// recalculate in and connect caches:
		game.location_in = new Array(game.locations.length);
		game.location_connects = new Array(game.locations.length);
		for(let idx_l1:number = 0;idx_l1<game.locations.length;idx_l1++) {
			game.location_in[idx_l1] = new Array(game.locations.length);
			game.location_connects[idx_l1] = new Array(game.locations.length);
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				game.location_in[idx_l1][idx_l2] = false; 
				game.location_connects[idx_l1][idx_l2] = false;
			}
		}

		for(let idx_l1:number = 0;idx_l1<game.locations.length;idx_l1++) {
			let l1:AILocation = game.locations[idx_l1];
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				let l2:AILocation = game.locations[idx_l2];
				if (l1 == l2) continue;

				game.location_in[idx_l1][idx_l2] = true;
				for(let mapIdx1:number = 0;mapIdx1<l1.maps.length;mapIdx1++) {
					let map:A4Map = l1.maps[mapIdx1];
					let mapIdx2:number = l2.maps.indexOf(map);
					if (mapIdx2 == -1) {
						// console.log(this.locations[idx_l1].name + "["+this.locations[idx_l1].sort+"] not in " + this.locations[idx_l2].name + "["+this.locations[idx_l2].sort+"] due to map mismatch!");
						game.location_in[idx_l1][idx_l2] = false;
						break;
					}
					for(let i:number = 0;i<l1.mapOccupancyMaps[mapIdx1].length;i++) {
						if (l1.mapOccupancyMaps[mapIdx1][i] && 
							!l2.mapOccupancyMaps[mapIdx2][i]) {
							game.location_in[idx_l1][idx_l2] = false;
//							if (this.locations[idx_l1].name == null) {
//								console.log(this.locations[idx_l1].name + "["+this.locations[idx_l1].sort+"] not in " + this.locations[idx_l2].name + "["+this.locations[idx_l2].sort+"] due to coordinate! " + 
//											i + " in map " + map.name + " (" + l1.mapOccupancyMaps[mapIdx1].length + " - " + l2.mapOccupancyMaps[mapIdx2].length + ")");
//							}
							break;
						}
					}
					if (!game.location_in[idx_l1][idx_l2]) break;
				}
			}
		}

		for(let idx_l1:number = 0;idx_l1<game.locations.length;idx_l1++) {
//			console.log("idx: " + idx_l1);
			let l1:AILocation = game.locations[idx_l1];
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				let l2:AILocation = game.locations[idx_l2];
				if (l1 == l2) continue;
				if (game.location_in[idx_l1][idx_l2] ||
					game.location_in[idx_l2][idx_l1]) continue;
				// automatically generate the "location.connects" terms
				game.location_connects[idx_l1][idx_l2] = false;
				for(let mapIdx1:number = 0;mapIdx1<l1.maps.length;mapIdx1++) {
					let map:A4Map = l1.maps[mapIdx1];
					let mapIdx2:number = l2.maps.indexOf(map);
					if (mapIdx2 == -1) break;
					for(let i:number = 0;i<l1.mapOccupancyMaps[mapIdx1].length;i++) {
						let i2_l:number[] = [i-1,i+1,i-map.width, i+map.width];
						for(let j:number = 0;j<i2_l.length;j++) {
							let i2:number = i2_l[j];
							if (i2>=0 && i2<map.width*map.height &&
								l1.mapOccupancyMaps[mapIdx1][i] && 
								l2.mapOccupancyMaps[mapIdx2][i2]) {
								game.location_connects[idx_l1][idx_l2] = true;
								break;
							}
						}
					}
				}
			}
		}

		game.map_location_names = [];
		for(let map of game.maps) {
			let location_names:string[] = [];
			for(let y:number = 0;y<map.height;y++) {
				for(let x:number = 0;x<map.width;x++) {
					let l:AILocation = game.getAILocationTileCoordinate(map, x, y);
					if (l == null) {
						location_names.push(null);
					} else {
						location_names.push(l.id);
					}
				}
//				console.log(location_names.slice(location_names.length-map.width));
			}
			game.map_location_names.push(location_names);
		}

		for(let connection_xml of getElementChildrenByTag(xml, "location_connects")) {
			let l1_name:string = connection_xml.getAttribute("l1");
			let l2_name:string = connection_xml.getAttribute("l2");
			game.additional_location_connects.push([l1_name, l2_name]);
		}

		for(let [l1_name, l2_name] of game.additional_location_connects) {
			let l1_idx:number = game.locations.indexOf(game.getAILocationByID(l1_name));
			let l2_idx:number = game.locations.indexOf(game.getAILocationByID(l2_name));
			game.location_connects[l1_idx][l2_idx] = true;	
			game.location_connects[l2_idx][l1_idx] = true;
		}		

		for(let preferred_center_xml of getElementChildrenByTag(xml, "preferred_center")) {
			// <preferred_center id="tardis8" map=="Tardis 8" x="720" y="120"/>
			let l_id:string = preferred_center_xml.getAttribute("id");
			let map_name:string = preferred_center_xml.getAttribute("map");
			let x:number = Number(preferred_center_xml.getAttribute("x"));
			let y:number = Number(preferred_center_xml.getAttribute("y"));

			for(let l of game.locations) {
				if (l.id == l_id) {
					for(let i:number = 0; i<l.maps.length; i++) {
						if (l.maps[i].name == map_name) {
							l.preferredCenterCoordinatesInMap[i] = [x, y];
						}
					}
				}
			}
		}

	}

}
