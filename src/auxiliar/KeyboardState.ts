var KEYBOARD_SIZE:number = 256;

var KEY_CODE_BACKSPACE:number = 8;
var KEY_CODE_TAB:number = 9;
var KEY_CODE_RETURN:number = 13;
var KEY_CODE_LSHIFT:number = 16;
var KEY_CODE_ALT:number = 18;
var KEY_CODE_ESCAPE:number = 27;
var KEY_CODE_SPACE:number = 32;
var KEY_CODE_PAGEUP:number = 33;
var KEY_CODE_PAGEDOWN:number = 34;
var KEY_CODE_END:number = 35;
var KEY_CODE_HOME:number = 36;
var KEY_CODE_LEFT:number = 37;
var KEY_CODE_UP:number = 38;
var KEY_CODE_RIGHT:number = 39;
var KEY_CODE_DOWN:number = 40;
var KEY_CODE_DELETE:number = 40;

var KEY_CODE_0:number = 48;
var KEY_CODE_1:number = 49;
var KEY_CODE_2:number = 50;
var KEY_CODE_3:number = 51;
var KEY_CODE_9:number = 57;

var KEY_CODE_A:number = 65;
var KEY_CODE_B:number = 66;
var KEY_CODE_D:number = 68;
var KEY_CODE_F:number = 70;
var KEY_CODE_I:number = 73;
var KEY_CODE_J:number = 74;
var KEY_CODE_K:number = 75;
var KEY_CODE_L:number = 76;
var KEY_CODE_M:number = 77;
var KEY_CODE_N:number = 78;
var KEY_CODE_O:number = 79;
var KEY_CODE_P:number = 80;
var KEY_CODE_R:number = 82;
var KEY_CODE_S:number = 83;
var KEY_CODE_T:number = 84;
var KEY_CODE_U:number = 85;
var KEY_CODE_V:number = 86;
var KEY_CODE_W:number = 87;
var KEY_CODE_X:number = 88;
var KEY_CODE_Z:number = 90;

var KEY_CODE_COMMA:number = 188;
var KEY_CODE_DOT:number = 190;

var KEYCODE_NAMES: {[code:number]:string;} = 
    {
        8:"backspace",
        9:"tab",
        13:"enter",
        16:"shift",
        17:"control",
        18:"alt",
        19:"break",
        20:"caps lock",
        27:"escape",
        32:"space",
        33:"page up",
        34:"page down",
        35:"end",
        36:"home",
        37:"left",
        38:"up",
        39:"right",
        40:"down",
        45:"insert",
        46:"delete",

        48:"0",
        49:"1",
        50:"2",
        51:"3",
        52:"4",
        53:"5",
        54:"6",
        55:"7",
        56:"8",
        57:"9",

        65:"a",
        66:"b",
        67:"c",
        68:"d",
        69:"e",
        70:"f",
        71:"g",
        72:"h",
        73:"i",
        74:"j",
        75:"k",
        76:"l",
        77:"m",
        78:"n",
        79:"o",
        80:"p",
        81:"q",
        82:"r",
        83:"s",
        84:"t",
        85:"u",
        86:"v",
        87:"w",
        88:"x",
        89:"y",
        90:"z",
        91:"left command",
        92:"right windows",
        93:"right command",
        96:"num 0",
        97:"num 1",
        98:"num 2",
        99:"num 3",
        100:"num 4",
        101:"num 5",
        102:"num 6",
        103:"num 7",
        104:"num 8",
        105:"num 9",
        106:"*",
        107:"+",
        109:"-",
        110:".",
        111:"/",
        112:"f1",
        113:"f2",
        114:"f3",
        115:"f4",
        116:"f5",
        117:"f6",
        118:"f7",
        119:"f8",
        120:"f9",
        121:"f10",
        122:"f11",
        123:"f12",
        144:"num lock",
        145:"scroll lock",
        186:";",
        187:"=",
        188:",",
        189:"-",
        190:".",
        191:"/",
        192:"`",
        219:"[",
        220:"\\",
        221:"]",
        222:"'"
    };


class KeyboardState {
    constructor(a_repeat_period:number)
    {
        this.repeat_period = a_repeat_period;
        this.keyevents = new Array<KeyboardEvent>();

        this.keyboard = new Array<boolean>(KEYBOARD_SIZE);
        this.old_keyboard = new Array<boolean>(KEYBOARD_SIZE);
        this.time_pressed = new Array<number>(KEYBOARD_SIZE);

        for(let i = 0;i<KEYBOARD_SIZE;i++) {
            this.keyboard[i] = false;
            this.old_keyboard[i] = false;
            this.time_pressed[i] = 0;
        }
    }


    keyDown(event:KeyboardEvent) {
        this.keyboard[event.keyCode] = true;
        this.keyevents.push(event);
    }


    keyUp(event:KeyboardEvent) {
        this.keyboard[event.keyCode] = false;
    }


    cycle() {        
        for(let i:number = 0; i<KEYBOARD_SIZE; i++) {
            this.old_keyboard[i] = this.keyboard[i];
            if (!this.keyboard[i]) this.time_pressed[i] = 0;
                              else this.time_pressed[i] ++;
        }
    }


    // returns if a key has been pressed                
    // it returns true, just when the key is pressed    
    // and keeps returning yes each 4 cycles after 40  
    key_press(key:number) : boolean 
    {
        if (!this.old_keyboard[key] && this.keyboard[key]) return true;
        if (this.keyboard[key] && this.time_pressed[key]>40 && (this.time_pressed[key]%4)==0) return true;
        return false;
    }     


    key_first_press(key:number) : boolean 
    {
        if (!this.old_keyboard[key] && this.keyboard[key]) return true;
        return false;
    }     


    key_release(key:number) : boolean 
    {
        if (this.old_keyboard[key] && !this.keyboard[key]) return true;
        return false;
    }       


    consume_key_press(key:number)
    {
       this.old_keyboard[key] = this.keyboard[key]; 
    }

    clearEvents()
    {
        this.keyevents = new Array<KeyboardEvent>();
    }

    
    k_size:number;                            /* number of inputs */ 
    old_keyboard:boolean[];
    keyboard:boolean[];;
    time_pressed:number[];                    // amount of cycles that the key has been pressed
    repeat_period:number;

    keyevents:KeyboardEvent[];                // stores the keydown events
}
