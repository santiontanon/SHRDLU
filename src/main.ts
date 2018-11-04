var canvas: HTMLCanvasElement;
var ctx: CanvasRenderingContext2D;    // current context
var app: A4EngineApp;
//var audioCtx:AudioContext = new (window.AudioContext || window.webkitAudioContext)();
var audioCtx:AudioContext = new ((<any>window).AudioContext || (<any>window).webkitAudioContext)();

var PIXEL_SIZE: number = 4;
var WINDOW_WIDTH: number = 256*PIXEL_SIZE;
var WINDOW_HEIGHT: number = 192*PIXEL_SIZE;

var d:Date = new Date();
var k:KeyboardState;
var game_time:number;
var init_time:number;

var fonts_loaded:boolean = false;

var global_mouse_x:number = 0;
var global_mouse_y:number = 0;

var show_fps:boolean = false;
var frames_per_sec:number = 0;
var fps_count_start_time:number = null;
var fps_count:number = null;

var fontFamily8px:string = "8px MSX68";
var fontFamily16px:string = "16px MSX68";
var fontFamily24px:string = "24px MSX68";
var fontFamily32px:string = "32px MSX68";
var fontFamily64px:string = "64px MSX68";

var MSX_COLOR_BLACK:string = generateRGBColor(0,0,0);
var MSX_COLOR_GREEN:string = generateRGBColor(43,221,81);
var MSX_COLOR_LIGHT_GREEN:string = generateRGBColor(81,255,118);
var MSX_COLOR_DARK_BLUE:string = generateRGBColor(81,81,255);
var MSX_COLOR_BLUE:string = generateRGBColor(118,118,255);
var MSX_COLOR_DARK_RED:string = generateRGBColor(221,81,81);
var MSX_COLOR_LIGHT_BLUE:string = generateRGBColor(81,255,255);
var MSX_COLOR_RED:string = generateRGBColor(255,81,81);
var MSX_COLOR_LIGHT_RED:string = generateRGBColor(255,118,118);

var MSX_COLOR_DARK_GREEN:string = generateRGBColor(43,187,43);

var MSX_COLOR_GREY:string = generateRGBColor(192,192,192);
var MSX_COLOR_WHITE:string = generateRGBColor(255,255,255);

window.onload = () => {
    // get the canvas and set double buffering:
    canvas = <HTMLCanvasElement>document.getElementById('cnvs');
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    app = new A4EngineApp(WINDOW_WIDTH, WINDOW_HEIGHT);
    k = new KeyboardState(-1);

    document.addEventListener('keydown', keyboardInputDown);
    document.addEventListener('keyup', keyboardInputUp);
    document.addEventListener('mousedown', mouseInput);
    document.addEventListener('mousemove', mouseMove);

    game_time = init_time = d.getTime();

    waitForResourcesLoop(0);
}


function checkIfFontsAreLoaded():boolean {
    // This is a trick, since in JavaScript, there is no way to know if a font is loaded
    // I know how wide these images should be once the fonts are loaded, so, I wait for that!
    var tmp0:HTMLImageElement = getTextTile("TEST64", fontFamily64px, 64, "white");
    var tmp1:HTMLImageElement = getTextTile("TEST32", fontFamily32px, 32, "white");
    var tmp2:HTMLImageElement = getTextTile("TEST16", fontFamily16px, 16, "white");
    var tmp3:HTMLImageElement = getTextTile("TEST8", fontFamily8px, 8, "white");
//    console.log("test64: " + tmp0.width);
//    console.log("test32: " + tmp1.width);
//    console.log("test16: " + tmp2.width);
//    console.log("test8: " + tmp3.width);
//    if (tmp1.width == 192 && tmp2.width == 96 && tmp3.width == 40) {
//    if (tmp1.width == 180 && tmp2.width == 90 && tmp3.width == 37) {
//    if (tmp1.width == 162 && tmp2.width == 81 && tmp3.width == 33) {
    if (tmp0.width == 288 && tmp1.width == 144 && tmp2.width == 72 && tmp3.width == 30) {
//    if (tmp1.width == 216 && tmp2.width == 108 && tmp3.width == 60) {
        return true;
    }
    return false;
}


function keyboardInputDown(event: KeyboardEvent) {
	k.keyDown(event);

    if (event.keyCode == KEY_CODE_F && event.getModifierState("Alt")) {
        show_fps = !show_fps;
    }

    event.preventDefault();
}


function keyboardInputUp(event: KeyboardEvent) {
	k.keyUp(event);

    event.preventDefault();
}


function mouseInput(event: MouseEvent) 
{
    var rect:ClientRect = canvas.getBoundingClientRect();
    var x:number = Math.floor((event.x-rect.left) / (rect.right-rect.left)*canvas.width);
    var y:number = Math.floor((event.y-rect.top)  / (rect.bottom-rect.top)*canvas.height);    
    app.mouseClick(x, y, event.button, event);
    BInterface.mouseClick(x, y, event.button, app);
}


function mouseMove(event: MouseEvent)
{
    var rect:ClientRect = canvas.getBoundingClientRect();
    global_mouse_x = Math.floor((event.clientX-rect.left) / (rect.right-rect.left)*canvas.width);
    global_mouse_y = Math.floor((event.clientY-rect.top)  / (rect.bottom-rect.top)*canvas.height);    
    BInterface.mouseMove(global_mouse_x, global_mouse_y);
}


function waitForResourcesLoop(timestamp: number) {

    if (app.getGame().imagesLoaded()) {
        app.getGame().finishLoadingGame(false, null, app);
        requestAnimationFrame(gameLoop);
    } else {
        requestAnimationFrame(waitForResourcesLoop);
    }
}


function gameLoop(timestamp: number) {

    if (!fonts_loaded) {
        fonts_loaded = checkIfFontsAreLoaded();
    } else {
        app.cycle(global_mouse_x, global_mouse_y, k);

        k.cycle();
        k.clearEvents();
        app.clearEvents();
        app.draw(WINDOW_WIDTH, WINDOW_HEIGHT);

        // count FPS:
        if (fps_count_start_time == null) {
            fps_count_start_time = timestamp;
        } else {
            fps_count++;
            if (timestamp > fps_count_start_time + 1000) {
                frames_per_sec = fps_count;
                fps_count = 0;
                fps_count_start_time = timestamp;
            }
        }
        if (show_fps) {
            ctx.fillStyle = "white";
            ctx.textBaseline = "bottom"; 
            ctx.textAlign = "center";
            ctx.font = fontFamily8px
            ctx.fillText("fps: " + frames_per_sec, 
                         WINDOW_WIDTH/2, WINDOW_HEIGHT-16);
        } // if

    }
 
    requestAnimationFrame(gameLoop);
}
