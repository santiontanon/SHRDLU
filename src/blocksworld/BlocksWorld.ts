var SHRDLU_BLOCKTYPE_BLOCK:string = "block";
var SHRDLU_BLOCKTYPE_PYRAMID:string = "pyramid";
var SHRDLU_BLOCKTYPE_BOX:string = "box";
var SHRDLU_BLOCKTYPE_TABLE:string = "table";



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

	constructor(type:string, color:string,
				x:number, y:number, z:number, 
				dx:number, dy:number, dz:number) {
		this.ID = "block-" + ShrdluBlock.next_ID;
		ShrdluBlock.next_ID++;
		this.type = type;
		this.color = color;
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
		}
	}


	ID:string;
	type:string;
	color:string;
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
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_TABLE, MSX_COLOR_GREY,
									 	  0, 0, 0,
									 	  32, 4, 32));

		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_RED,
										  0, 4, 10,
										  8, 12, 8));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_RED,
	 									  4, 4, 4,
	 									  4, 4, 4));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_BLUE,
									 	  8, 4, 28,
									 	  8, 12, 4));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_GREEN,
									 	  14, 4, 10,
									 	  8, 8, 8));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BLOCK, MSX_COLOR_GREEN,
									 	  12, 4, 0,
									 	  8, 8, 8));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_BOX, MSX_COLOR_WHITE,
									 	  20, 4, 20,
									 	  12, 12, 12));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_PYRAMID, MSX_COLOR_GREEN,
									 	  4, 8, 4,
									 	  4, 4, 4));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_PYRAMID, MSX_COLOR_RED,
									 	  16, 12, 4,
									 	  4, 12, 4));
		this.objects.push(new ShrdluBlock(SHRDLU_BLOCKTYPE_PYRAMID, MSX_COLOR_BLUE,
									 	  22, 4, 22,
									 	  8, 8, 8));
	}


	draw(vpx:number, vpy:number, vpw:number, vph:number)
	{
        ctx.save();
        ctx.scale(PIXEL_SIZE*2, PIXEL_SIZE*2);

        this.center_x = (vpx + vpw*0.375)/(PIXEL_SIZE*2);
        this.center_y = (vpy + vph*0.6)/(PIXEL_SIZE*2);

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


	width:number = 32;
	depth:number = 32;
	objects:ShrdluBlock[] = [];

	center_x:number;
	center_y:number;
}

