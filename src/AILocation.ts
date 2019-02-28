class AILocation {
	id:string = null;
	name:string = null;
	sort:Sort = null;
	maps:A4Map[] = [];
	mapOccupancyMaps:boolean[][] = [];


	distanceFromObject(o:A4Object, mapIdx:number) : number
	{
		var map:A4Map = this.maps[mapIdx];
		var tile_x:number = Math.floor((o.x + o.getPixelWidth()/2)/map.tileWidth);
		var tile_y:number = Math.floor((o.y + o.tallness + (o.getPixelHeight() - o.tallness)/2)/map.tileHeight);
		var offset:number = tile_x + tile_y*map.width;
		if (this.mapOccupancyMaps[mapIdx][offset]) {
			return 0;
		} else {
			var closestDistance:number = null;
			for(let i:number = 0;i<this.mapOccupancyMaps[mapIdx].length;i++) {
				if (this.mapOccupancyMaps[mapIdx][i]) {
					var x:number = i%map.width;
					var y:number = Math.floor(i/map.width);
					var d:number = Math.sqrt((tile_x-x)*(tile_x-x) + (tile_y-y)*(tile_y-y));
					if (closestDistance == null || d<closestDistance) closestDistance = d;
				}
			}
			return closestDistance;
		}
	}


	centerCoordinatesInMap(map:A4Map) : [number,number]
	{
		var x1:number = 0;
		var y1:number = 0;
		var total:number = 0;

		for(let i:number = 0;i<this.maps.length;i++) {
			if (this.maps[i] == map) {
				var offset:number = 0;
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
		var x1:number = 0;
		var y1:number = 0;
		var total:number = 0;

		for(let i:number = 0;i<this.maps.length;i++) {
			if (this.maps[i] == map) {
				var offset:number = 0;
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
			var mapName:string = map_xml.getAttribute("name");
			var w:number = Number(map_xml.getAttribute("width"));
			var h:number = Number(map_xml.getAttribute("height"));
			var data:string = getFirstElementChildByTag(map_xml,"data").firstChild.nodeValue;
			var splitData:string[] = data.split(",");
			for(let i:number = 0;i<splitData.length;i++) splitData[i] = splitData[i].trim();
//			console.log("location data for " + mapName + ": " + splitData);

			for(let location_xml of getElementChildrenByTag(map_xml,"location")) {
				var code:string = location_xml.getAttribute("code");
				var id:string = location_xml.getAttribute("id");
				var name:string = location_xml.getAttribute("name");
				var sort:string = location_xml.getAttribute("sort");

				var location:AILocation = null;
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

				var occupancyMap:boolean[] = new Array(w*h);
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
			var l1:AILocation = game.locations[idx_l1];
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				var l2:AILocation = game.locations[idx_l2];
				if (l1 == l2) continue;

				// automatically generate the "space.at" terms
				game.location_in[idx_l1][idx_l2] = true;
				for(let mapIdx1:number = 0;mapIdx1<l1.maps.length;mapIdx1++) {
					var map:A4Map = l1.maps[mapIdx1];
					var mapIdx2:number = l2.maps.indexOf(map);
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
			var l1:AILocation = game.locations[idx_l1];
			for(let idx_l2:number = 0;idx_l2<game.locations.length;idx_l2++) {
				var l2:AILocation = game.locations[idx_l2];
				if (l1 == l2) continue;
				if (game.location_in[idx_l1][idx_l2] ||
					game.location_in[idx_l2][idx_l1]) continue;
				// automatically generate the "location.connects" terms
				game.location_connects[idx_l1][idx_l2] = false;
				for(let mapIdx1:number = 0;mapIdx1<l1.maps.length;mapIdx1++) {
					var map:A4Map = l1.maps[mapIdx1];
					var mapIdx2:number = l2.maps.indexOf(map);
					if (mapIdx2 == -1) break;
					for(let i:number = 0;i<l1.mapOccupancyMaps[mapIdx1].length;i++) {
						var i2_l:number[] = [i-1,i+1,i-map.width, i+map.width];
						for(let j:number = 0;j<i2_l.length;j++) {
							var i2:number = i2_l[j];
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
			var location_names:string[] = [];
			for(let y:number = 0;y<map.height;y++) {
				for(let x:number = 0;x<map.width;x++) {
					var l:AILocation = game.getAILocationTileCoordinate(map, x, y);
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
			var l1_name:string = connection_xml.getAttribute("l1");
			var l2_name:string = connection_xml.getAttribute("l2");

			var l1_idx:number = game.locations.indexOf(game.getAILocationByID(l1_name));
			var l2_idx:number = game.locations.indexOf(game.getAILocationByID(l2_name));

			game.location_connects[l1_idx][l2_idx] = true;	
			game.location_connects[l2_idx][l1_idx] = true;
		}		

		// add missing links manually (this could be done automatically, but why bother :)):
		/*
		{
			var al1:number = game.locations.indexOf(game.getAILocationByID("location-as31"));
			var al2:number = game.locations.indexOf(game.getAILocationByID("location-as32"));
			var al3:number = game.locations.indexOf(game.getAILocationByID("location-as33"));
			var al4:number = game.locations.indexOf(game.getAILocationByID("location-as34"));

			var as:number = game.locations.indexOf(game.getAILocationByID("location-aurora-settlement"));
			var asct:number = game.locations.indexOf(game.getAILocationByID("location-comm-tower"));
			var asr:number = game.locations.indexOf(game.getAILocationByID("location-recycling"));
			var aso:number = game.locations.indexOf(game.getAILocationByID("location-oxygen"));
			var asw:number = game.locations.indexOf(game.getAILocationByID("location-water"));
			var asgh:number = game.locations.indexOf(game.getAILocationByID("location-greenhouse"));
			var aspp:number = game.locations.indexOf(game.getAILocationByID("location-powerplant"));

			var sv:number = game.locations.indexOf(game.getAILocationByID("spacer-valley"));

			var ec:number = game.locations.indexOf(game.getAILocationByID("location-east-cave"));

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
