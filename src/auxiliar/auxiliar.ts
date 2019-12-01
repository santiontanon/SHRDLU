function getElementChildrenByTag(xml:Element, tag:string) : Element[]
{
    var l:Element[] = [];
    for(let i:number = 0;i<xml.children.length;i++) {
        var xml2:Element = xml.children[i];
        if (xml2.tagName == tag) l.push(xml2);
    }
    return l;
}


function getFirstElementChildByTag(xml:Element, tag:string) : Element
{
    for(let i:number = 0;i<xml.children.length;i++) {
        var xml2:Element = xml.children[i];
        if (xml2.tagName == tag) return xml2;
    }
    return null;
}


// source: https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
function stringHashFunction(name:string) : number
{
    let hash:number = 0;
    var chr:number;
    if (name.length === 0) return hash;
    for (var i:number = 0; i < name.length; i++) {
        chr = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
    }
    hash |= 0; // Convert to 32bit integer
    if (hash<0) return -hash;
    return hash;
}


function stringToHTMLString(s:string) : string
{
    return s.split("\"").join("&quot;");
}


function removeListDuplicates(l:any[]) : any[]
{
    var l2:any[] = [];
    for(let element of l) {
        if (l2.indexOf(element) == -1) l2.push(element);
    }
    return l2;
}

function numberToStringTwoDigits(n:number) : string
{
    if (n < 10) return "0" + n;
    return ""+n;
}


function splitStringBySpaces(text:string, maxWidth:number) : string[]
{
    let buffer:string = "";
    let last_space:number = 0;
    let longestLine:number = 0;
    let lines:string[] = [];

    for(let i:number = 0;i<text.length;i++) {
        buffer += text.charAt(i);
        if (text.charAt(i) == ' ') last_space = i;
        if (buffer.length>=maxWidth) {
            if (last_space==0) {
                // a single word doesn't fit, just split it!
                lines.push(buffer);
                if (buffer.length>longestLine) longestLine = buffer.length;
                buffer = "";
            } else {
                let backspaces:number = i - last_space;
                buffer = buffer.substring(0,buffer.length-backspaces);
                i-=backspaces;
                lines.push(buffer);
                if (buffer.length>longestLine) longestLine = buffer.length;
                buffer = "";
                last_space = 0;
            }
        }
    }

    if (buffer != "") {
        lines.push(buffer);
        if (buffer.length>longestLine) longestLine = buffer.length;
    }

    return lines;
}


function allArrayElementsTrue(booleanArray:boolean[]) : boolean
{
    for(let i:number = 0; i<booleanArray.length; i++) {
        if (booleanArray[i] == false) return false;
    }
    return true;
}


function nTruesInArray(booleanArray:boolean[]) : number
{
    let n:number = 0;
    for(let i:number = 0; i<booleanArray.length; i++) {
        if (booleanArray[i]) n++;
    }
    return n;    
}
