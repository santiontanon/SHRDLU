class AILocation {
	id:string = null;
	name:string = null;
	sort:Sort = null;
	maps:A4Map[] = [];
	mapOccupancyMaps:boolean[][] = [];


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
			}
		}
		if (total == 0) return null;
		x1 = Math.floor(x1/(total*map.tileWidth))*map.tileWidth;
		y1 = Math.floor(y1/(total*map.tileHeight))*map.tileHeight;
		return [x1, y1];
	}



	static loadLocationsFromXML(xml:Element, game:A4Game, o:Ontology)
	{
		// load the locations:
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
			}
		}


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

		for(let connection_xml of getElementChildrenByTag(xml,"location_connects")) {
			let l1_name:string = connection_xml.getAttribute("l1");
			let l2_name:string = connection_xml.getAttribute("l2");

			let l1_idx:number = game.locations.indexOf(game.getAILocationByID(l1_name));
			let l2_idx:number = game.locations.indexOf(game.getAILocationByID(l2_name));

			game.location_connects[l1_idx][l2_idx] = true;	
			game.location_connects[l2_idx][l1_idx] = true;
		}		

		// add missing links manually (this could be done automatically, but why bother :)):
		/*
		{
			let al1:number = game.locations.indexOf(game.getAILocationByID("location-as31"));
			let al2:number = game.locations.indexOf(game.getAILocationByID("location-as32"));
			let al3:number = game.locations.indexOf(game.getAILocationByID("location-as33"));
			let al4:number = game.locations.indexOf(game.getAILocationByID("location-as34"));

			let as:number = game.locations.indexOf(game.getAILocationByID("location-aurora-settlement"));
			let asct:number = game.locations.indexOf(game.getAILocationByID("location-comm-tower"));
			let asr:number = game.locations.indexOf(game.getAILocationByID("location-recycling"));
			let aso:number = game.locations.indexOf(game.getAILocationByID("location-oxygen"));
			let asw:number = game.locations.indexOf(game.getAILocationByID("location-water"));
			let asgh:number = game.locations.indexOf(game.getAILocationByID("location-greenhouse"));
			let aspp:number = game.locations.indexOf(game.getAILocationByID("location-powerplant"));

			let sv:number = game.locations.indexOf(game.getAILocationByID("spacer-valley"));

			let ec:number = game.locations.indexOf(game.getAILocationByID("location-east-cave"));

			game.location_connects[al1][as] = true;	game.location_connects[as][al1] = true;
			game.location_connects[al2][as] = true;	game.location_connects[as][al2] = true;
			game.location_connects[al3][as] = true;	game.location_connects[as][al3] = true;
			game.location_connects[al4][as] = true;	game.location_connects[as][al4] = true;

			game.location_connects[asct][as] = true;	game.location_connects[as][asct] = true;
			game.location_connects[asr][as] = true;	game.location_connects[as][asr] = true;
			game.location_connects[aso][as] = true;	game.location_connects[as][aso] = true;
			game.location_connects[asw][as] = true;	game.location_connects[as][asw] = true;
			game.location_connects[asgh][as] = true;	game.location_connects[as][asgh] = true;
			game.location_connects[aspp][as] = true;	game.location_connects[as][aspp] = true;

			game.location_connects[sv][as] = true;	game.location_connects[as][sv] = true;
			
			game.location_connects[sv][ec] = true;	game.location_connects[ec][sv] = true;
		}
		*/
	}

}
