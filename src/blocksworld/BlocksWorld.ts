var SHRDLU_BLOCKTYPE_BLOCK:string = "block";
var SHRDLU_BLOCKTYPE_PYRAMID:string = "pyramid";
var SHRDLU_BLOCKTYPE_BOX:string = "box";
var SHRDLU_BLOCKTYPE_TABLE:string = "table";

var BW_SIZE_SMALL:string = "small";
var BW_SIZE_MEDIUM:string = "size.medium";
var BW_SIZE_LARGE:string = "big";

var SHRDLU_ARM_Y_REST_POSITION:number = 28;

class SBWLine {
	constructor(x1:number, y1:number, z1:number,
			    x2:number, y2:number, z2:number,
			    color:string) 
	{
		this.x1 = x1;
		this.y1 = y1;
		this.z1 = z1;
		this.x2 = x2;
		this.y2 = y2;
		this.z2 = z2;
		this.color = color;
	}


	x1:number;
	y1:number;
	z1:number;
	x2:number;
	y2:number;
	z2:number;
	color:string;
}


class ShrdluBlock {
	static next_ID:number = 1;

	constructor(type:string, color:string, size:string,
				x:number, y:number, z:number, 
				dx:number, dy:number, dz:number) {
		this.ID = "block-" + ShrdluBlock.next_ID;
		ShrdluBlock.next_ID++;
		this.type = type;
		this.color = color;
		this.size = size;
		if (type == SHRDLU_BLOCKTYPE_BLOCK ||
			type == SHRDLU_BLOCKTYPE_BOX) {
			this.shape = "rectangular";
		} else if (type == SHRDLU_BLOCKTYPE_PYRAMID) {
			this.shape = "pointed";
		} else {
			this.shape = null;
		}
		this.x = x;
		this.y = y;
		this.z = z;
		this.dx = dx;
		this.dy = dy;
		this.dz = dz;		
	}


	draw(lines:SBWLine[])	
	{
		switch(this.type) {
		case SHRDLU_BLOCKTYPE_BLOCK:
		case SHRDLU_BLOCKTYPE_TABLE:
			lines.push(new SBWLine(this.x,this.y,this.z, 					this.x+this.dx,this.y,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z, 			this.x+this.dx,this.y,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z+this.dz, 	this.x,this.y,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y,this.z+this.dz, 			this.x,this.y,this.z, this.color));

			lines.push(new SBWLine(this.x,this.y,this.z, 					this.x,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z, 			this.x+this.dx,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z+this.dz, 	this.x+this.dx,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y,this.z+this.dz, 			this.x,this.y+this.dy,this.z+this.dz, this.color));

			lines.push(new SBWLine(this.x,this.y+this.dy,this.z, 					this.x+this.dx,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y+this.dy,this.z, 			this.x+this.dx,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y+this.dy,this.z+this.dz, 	this.x,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y+this.dy,this.z+this.dz, 			this.x,this.y+this.dy,this.z, this.color));
			break;
		case SHRDLU_BLOCKTYPE_PYRAMID:
			lines.push(new SBWLine(this.x,this.y,this.z, 					this.x+this.dx,this.y,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z, 			this.x+this.dx,this.y,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z+this.dz, 	this.x,this.y,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y,this.z+this.dz, 			this.x,this.y,this.z, this.color));

			lines.push(new SBWLine(this.x,this.y,this.z, 					this.x+this.dx/2,this.y+this.dy,this.z+this.dz/2, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z, 			this.x+this.dx/2,this.y+this.dy,this.z+this.dz/2, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z+this.dz, 	this.x+this.dx/2,this.y+this.dy,this.z+this.dz/2, this.color));
			lines.push(new SBWLine(this.x,this.y,this.z+this.dz, 			this.x+this.dx/2,this.y+this.dy,this.z+this.dz/2, this.color));
			break;
		case SHRDLU_BLOCKTYPE_BOX:
			lines.push(new SBWLine(this.x,this.y,this.z, 					this.x+this.dx,this.y,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z, 			this.x+this.dx,this.y,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z+this.dz, 	this.x,this.y,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y,this.z+this.dz, 			this.x,this.y,this.z, this.color));

			lines.push(new SBWLine(this.x,this.y,this.z, 					this.x,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z, 			this.x+this.dx,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z+this.dz, 	this.x+this.dx,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y,this.z+this.dz, 			this.x,this.y+this.dy,this.z+this.dz, this.color));

			lines.push(new SBWLine(this.x,this.y+this.dy,this.z, 					this.x+this.dx,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y+this.dy,this.z, 			this.x+this.dx,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y+this.dy,this.z+this.dz, 	this.x,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y+this.dy,this.z+this.dz, 			this.x,this.y+this.dy,this.z, this.color));

			lines.push(new SBWLine(this.x+1,this.y+this.dy,this.z+1, 					this.x+this.dx-1,this.y+this.dy,this.z+1, this.color));
			lines.push(new SBWLine(this.x+this.dx-1,this.y+this.dy,this.z+1, 			this.x+this.dx-1,this.y+this.dy,this.z+this.dz-1, this.color));
			lines.push(new SBWLine(this.x+this.dx-1,this.y+this.dy,this.z+this.dz-1, 	this.x+1,this.y+this.dy,this.z+this.dz-1, this.color));
			lines.push(new SBWLine(this.x+1,this.y+this.dy,this.z+this.dz-1, 			this.x+1,this.y+this.dy,this.z+1, this.color));
			break;
		case "arm":
			lines.push(new SBWLine(this.x,this.y,this.z, 					this.x+this.dx,this.y,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z, 			this.x+this.dx,this.y,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z+this.dz, 	this.x,this.y,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y,this.z+this.dz, 			this.x,this.y,this.z, this.color));

			lines.push(new SBWLine(this.x,this.y,this.z, 					this.x,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z, 			this.x+this.dx,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y,this.z+this.dz, 	this.x+this.dx,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y,this.z+this.dz, 			this.x,this.y+this.dy,this.z+this.dz, this.color));

			lines.push(new SBWLine(this.x,this.y+this.dy,this.z, 					this.x+this.dx,this.y+this.dy,this.z, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y+this.dy,this.z, 			this.x+this.dx,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x+this.dx,this.y+this.dy,this.z+this.dz, 	this.x,this.y+this.dy,this.z+this.dz, this.color));
			lines.push(new SBWLine(this.x,this.y+this.dy,this.z+this.dz, 			this.x,this.y+this.dy,this.z, this.color));

			lines.push(new SBWLine(this.x-1,this.y,this.z-1, 					this.x+this.dx+1,this.y,this.z-1, this.color));
			lines.push(new SBWLine(this.x+this.dx+1,this.y,this.z-1, 			this.x+this.dx+1,this.y,this.z+this.dz+1, this.color));
			lines.push(new SBWLine(this.x+this.dx+1,this.y,this.z+this.dz+1, 	this.x-1,this.y,this.z+this.dz+1, this.color));
			lines.push(new SBWLine(this.x-1,this.y,this.z+this.dz+1, 			this.x-1,this.y,this.z-1, this.color));
			break;		
		}
	}


	collide(o2:ShrdluBlock): boolean
	{
		if (this.x+this.dx > o2.x && o2.x+o2.dx > this.x &&
			this.y+this.dy > o2.y && o2.y+o2.dy > this.y &&
			this.z+this.dz > o2.z && o2.z+o2.dz > this.z) {
			return true;
		}
		return false;
	}


	isInside(o2:ShrdluBlock): boolean
	{
		if (this == o2) return false;
		if (this.collide(o2)) {
			// they overlap:
			if (o2.x <= this.x && o2.z <= this.z) {
				// this inside o2:
				return true;
			}
		}
		return false;
	}


	isOnTopOf(o2:ShrdluBlock): boolean
	{
		if (this == o2) return false;
		if (this.x+this.dx > o2.x && o2.x+o2.dx > this.x &&
			this.y == o2.y+o2.dy &&
			this.z+this.dz > o2.z && o2.z+o2.dz > this.z) {
			return true;
		}
		return false;		
	}


	ID:string;
	type:string;
	color:string;
	size:string;
	shape:string;
	x:number;
	y:number;
	z:number;
	dx:number;
	dy:number;
	dz:number;
}


class ShrdluBlocksWorld {
	constructor() {
		// original SHRDLU environment:
		this.shrdluArm = new ShrdluBlock("arm", MSX_COLOR_WHITE, BW_SIZE_LARGE, 
									  	 	    0, SHRDLU_ARM_Y_REST_POSITION, 0,
									 	  		2, 256, 2);
		this.shrdluArm.ID = "shrdlu-arm";
		this.objects.push(this.shrdluArm);


		let table:ShrdluBlock = new ShrdluBlock(SHRDLU_BLOCKTYPE_TABLE, MSX_COLOR_GREY, BW_SIZE_LARGE, 
									  	 	    0, 0, 0,
									 	  		32, 4, 32);
		table.ID = "table";
		this.objects.push(table);

		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_RED, BW_SIZE_LARGE, 
										  0, 4, 10,
										  8, 12, 8));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_RED, BW_SIZE_SMALL, 
	 									  4, 4, 4,
	 									  4, 4, 4));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_BLUE, BW_SIZE_LARGE, 
									 	  8, 4, 28,
									 	  8, 12, 4));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_GREEN, BW_SIZE_MEDIUM, 
									 	  14, 4, 10,
									 	  8, 8, 8));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_GREEN, BW_SIZE_MEDIUM, 
									 	  12, 4, 0,
									 	  8, 8, 8));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BOX, MSX_COLOR_WHITE, BW_SIZE_LARGE, 
									 	  20, 4, 20,
									 	  12, 12, 12));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_PYRAMID, MSX_COLOR_GREEN, BW_SIZE_SMALL, 
									 	  4, 8, 4,
									 	  4, 4, 4));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_PYRAMID, MSX_COLOR_RED, BW_SIZE_MEDIUM, 
									 	  16, 12, 4,
									 	  4, 10, 4));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_PYRAMID, MSX_COLOR_BLUE, BW_SIZE_LARGE, 
									 	  22, 5, 22,
									 	  8, 8, 8));
	}


	draw(vpx:number, vpy:number, vpw:number, vph:number)
	{
        ctx.save();
        ctx.scale(PIXEL_SIZE*2, PIXEL_SIZE*2);

        this.center_x = (vpx + vpw*0.375)/(PIXEL_SIZE*2);
        this.center_y = (vpy + vph*0.7)/(PIXEL_SIZE*2);

		// draw objects:
		let lines:SBWLine[] = [];
		for(let object of this.objects) {
			object.draw(lines);
		}
		lines.sort(this.depthComparisonFunction)
		for(let line of lines) {
			this.drawLine(line);
		}

        ctx.restore();
	}


	depthComparisonFunction(o1:SBWLine, o2:SBWLine) : number
	{
		let z1:number = Math.max(o1.z1, o1.z2);
		let z2:number = Math.max(o2.z1, o2.z2);
		if (z1 < z2) return 1;
		if (z1 > z2) return -1;

		let y1:number = Math.max(o1.y1, o1.y2);
		let y2:number = Math.max(o2.y1, o2.y2);
		if (y1 > y2) return 1;
		if (y1 < y2) return -1;
		return 0;
	}


	drawLine(line:SBWLine) 
	{
		let [xp1, yp1]:[number, number] = this.project3dPoint(line.x1, line.y1, line.z1);
		let [xp2, yp2]:[number, number] = this.project3dPoint(line.x2, line.y2, line.z2);
  		
  		ctx.strokeStyle = line.color;
  		ctx.beginPath(); 
	   	ctx.moveTo(xp1, yp1);
	  	ctx.lineTo(xp2, yp2);
	  	ctx.stroke();
	}


	project3dPoint(x:number, y:number, z:number) : [number, number]
	{
		let nx:number = x;
		let nz:number = 32 - z;
		return [this.center_x + 3*nx - nz, 
				this.center_y + nz - 3*y];
	}


	getObject(ID:string) : ShrdluBlock
	{
		for(let object of this.objects) {
			if (object.ID == ID) return object;
		}

		return null;
	}


	objectsOnTop(ID:string) : ShrdluBlock[]
	{
		let object:ShrdluBlock = this.getObject(ID);
		if (object == null) return [];
		return this.objectsOnTopObject(object);
	}


	objectsOnTopObject(object:ShrdluBlock) : ShrdluBlock[]
	{
		let l:ShrdluBlock[] = [];
		for(let object2 of this.objects) {
			if (object2 != object && object2.isOnTopOf(object)) {
				l.push(object2);
			}
		}
		return l;
	}


	objectsInsideObject(object:ShrdluBlock): ShrdluBlock[]
	{
		let l:ShrdluBlock[] = [];
		for(let object2 of this.objects) {
			if (object2 != object && object2.isInside(object)) {
				l.push(object2);
			}
		}
		return l;
	}


	positionsToPutObjectOn(o:ShrdluBlock, base:ShrdluBlock) : [number,number,number][]
	{
		let positions:[number,number,number][] = [];

		let x1:number = base.x;
		let y:number = base.y + base.dy;
		let z1:number = base.z;
		let x2:number = base.x + base.dx;
		let z2:number = base.z + base.dz;
		if (base.type == SHRDLU_BLOCKTYPE_PYRAMID) return positions;
		if (base.type == SHRDLU_BLOCKTYPE_BOX) {
			x1 += 1;
			z1 += 1;
			x2 -= 1;
			z2 -= 1;
			y = base.y +1; 
		}

		let tmpBlock:ShrdluBlock = new ShrdluBlock(o.type, o.color, o.size, o.x, o.y, o.z, o.dx, o.dy, o.dz);
		for(let x:number = x1; x <= x2-o.dx; x++) {
			for(let z:number = z1; z <= z2-o.dz; z++) {
				let collision:boolean = false;
				tmpBlock.x = x;
				tmpBlock.y = y;
				tmpBlock.z = z;
				for(let o2 of this.objects) {
					if (o2 != o && o2 != base && o2.collide(tmpBlock)) {
						collision = true;
						break;
					}
				}
				if (!collision) {
					positions.push([x,y,z]);
				}
			}
		}

		return positions;
	}


	distanceBetweenObjects(o1:ShrdluBlock, o2:ShrdluBlock)
	{
		if (o1 != null && o2 != null) {
			let dx:number = 0;
			let dy:number = 0;
			let dz:number = 0;
			if (o1.x+o1.dx < o2.x) {
				dx = o2.x - (o1.x+o1.dx);
			} else if (o2.x+o2.dx < o1.x) {
				dx = o1.x - (o2.x+o2.dx);
			}
			if (o1.y+o1.dy < o2.y) {
				dy = o2.y - (o1.y+o1.dy);
			} else if (o2.y+o2.dy < o1.y) {
				dy = o1.y - (o2.y+o2.dy);
			}
			if (o1.z+o1.dz < o2.z) {
				dz = o2.z - (o1.z+o1.dz);
			} else if (o2.z+o2.dz < o1.z) {
				dz = o1.z - (o2.z+o2.dz);
			}
			return Math.sqrt(dx*dx + dy*dy + dz*dz);
		}

		return null;
	}

	width:number = 32;
	depth:number = 32;
	objects:ShrdluBlock[] = [];
	shrdluArm:ShrdluBlock = null;
	objectInArm:ShrdluBlock = null;

	center_x:number;
	center_y:number;
}

