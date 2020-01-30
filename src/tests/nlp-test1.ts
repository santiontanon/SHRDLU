/*
var sentences:string[] = 
	[
    "Hmm, that'll be 1.5 meters of rope, next to a commodore amiga and an MSX!",

	// from use case 1:
	"Hello David!",
    "Can you hear me?",
	"yes, I can",
	"Very well! Do not try to move yet.",
    "The reanimation process can take some time.",
    "Open your eyes and tell me what do you see.",
	"a room full of equipment and a robot",
	"Good! You are recovering faster than expected!",
    "I will give you some time to recover, and I will be back.",
    "You might feel nauseated if you try to stand up.",
    "So, take it easy.",
	"Hello again David! How are you feeling?",
	"Not too bad, and you?",
	"I have seen better days.",
    "Thanks for asking.",
    "You might be wondering why did I wake you up.",
    "Are you ready for a status report?",
	"not yet, I have some questions.",
	"By all means.",
    "Please state your questions, David.",
	"where am I?",
	"You are on station beta cassini 1, on the third planet of the beta cassini system.",
	"is there anyone else awake?",
	"No.",
	"ok, then, please go ahead with the status report",

    // from use case 2:
    "David!",
    "Wake up!",
    "What's happening?",
    "There is an emergency! I have lost contact with my avatar.",
    "I sent it to investigate a nearby cave, and there was a cave in.",
    "Could you go and see if it is possible to free it?",
    "Sure, where is this cave?",
    "About 5 kilometers North, I'll mark it in your map.",
    "One thing you should know is that you will be out of communication range with me when you get close to the cave due to some local interference.",
    "I think there is a lot of magnetic rocks in those caves.",
    "We are detecting an emergency transmission from the ship's avatar.",
    "Do you want to start a voice link?",
    "yes",
    "Link established",
    "Hello David.",
    "I need urgent assistance.",
    "I have been trapped under rocks from a cave in.",
    "Ok, I am coming.",
    "Thank you very much.",
    "Some of my hardware has been damaged and I cannot transmit data at this point.",
    "I can direct you to my position via voice.",
    "What is your current position?",
    "My coordinates are 56 west, 78 north",
    "Then you should go north for 500 meters, and then take the path down to the canyon to the west.",
    "Got it.",
    "I am going down the path to the canyon, what do I do next?",
    "Get to the bottom of the canyon and head north for 200 meters.",
    "On my way.",
    "Ok, done.",
    "I see a cave to the east, is that where you are?",
    "Yes.",
    "Ok, I am going in.",
    "Hello? Are you still there?",
    "Hello David, yes.",
    "There is a wall of rocks in front of me and I cannot find a way to tunnel through it.",
    "Ok.",
    "What can I do?",
    "You can guide me out of here.",
    "Some of my hardware got damaged and my reasoning abilities are impaired.",
    "I can rely to you what I see, and you can instruct me what to do.",
    "Sounds good, what do you see?",
    "I am standing facing west beside a pile of rocks that block my path.",
    "Can you move these rocks out of the way?",
    "I don't know.",
    "Try to move the rocks our of the way.",
    "Which rocks should I try?",
    "Which ones do you see?",
    "I see a very large rock right in front of me, and some smaller ones north of it.",
    "Ok, try to move the smaller ones out of the way",
    "Ok.",
    "Ok, done, I have moved all the smaller rocks out of the way.",
    "Good, was that enough to pass through?",
    "No.",
    "Ok, what do you see now.",
    "There is a very large rock right in front of me, and a small gap north of it.",
    "Do you fit through the gap?",
    "no.",
    "Move the large rock out of the way.",
    "Ok.",
    "I cannot move it.",
    "Ok, do you have any explosives?",
    "Yes.",
    "Will the cave collapse if you use them in the gap?",
    "There is a high probability.",
    "Ok, put the explosives in the gap, but do not detonate them.",
    "Ok.",
    "done.",
    "Now move back a safe distance and detonate them.",
    "ok",
    "done.",
    "Can you exit the cave now?",
    "No.",
    "Why not?",
    "There is a pile of rubble blocking the way.",
    "Clear the rubble away.",
    "Ok.",
    "done.",
    "Can you exit the cave now?",
    "yes.",
    "do it!",
    "ok."
    ];
*/

var o:Ontology = new Ontology();
Sort.clear();
var xmlhttp:XMLHttpRequest = new XMLHttpRequest();
xmlhttp.overrideMimeType("text/xml");
xmlhttp.open("GET", "data/shrdluontology.xml", false); 
xmlhttp.send();
o.loadSortsFromXML(xmlhttp.responseXML.documentElement);

xmlhttp = new XMLHttpRequest();
xmlhttp.overrideMimeType("text/xml");
xmlhttp.open("GET", "data/nlpatternrules.xml", false); 
xmlhttp.send();
var parser:NLParser = NLParser.fromXML(xmlhttp.responseXML.documentElement, o);
var posParser:POSParser = parser.posParser;


function NLPTokenizerUnitTest() : number
{
    var dataset_input:string[] = 
        ["yes, I can",
         "Not too bad, and you?",
         "not yet, I have some questions.",
         "There are 4 of them, two blue and two red",
         "Hmm, I guess that'll be about 1.5 meters away",
         "almost 1pm",
         "now? it's 1 O'clock",
         "I said 'yeah, let's do it!'",
         "The sign says \"hello\"",
         "the ship is etaoin's"];

    var dataset_output:string[][] = 
        [["yes",",","i","can"],
         ["not","too","bad",",","and","you","?"],
         ["not","yet",",","i","have","some","questions","."],
         ["there","are","4","of","them",",","two","blue","and","two","red"],
         ["hmm",",","i","guess","that","'ll","be","about","1.5","meters","away"],
         ["almost","1","pm"],
         ["now","?","it","'s","1","o'clock"],
         ["i","said","'","yeah",",","let","'s","do","it","!","'"],
         ["the","sign","says","\"","hello","\""],
         ["the","ship","is","etaoin","'s"]];

    var errors:number = 0;
    for(let i:number = 0;i<dataset_input.length;i++) {
        var input:string = dataset_input[i];
        var output:string[] = dataset_output[i];
        var tokens:string[] = posParser.tokenize(input);
        console.log(tokens);
        if (!compareTokenizations(tokens,output)) {
            console.log(tokens);
            console.log("  ERROR, it should be: " + output);
            errors++;
        }
    }
    return errors;
}

function compareTokenizations(a1:string[], a2:string[]) : boolean
{
    if (a1.length != a2.length) return false;
    for (var i:number = 0; i < a1.length; ++i) {
      if (a1[i] != a2[i]) return false;
    }
    return true;
}


NLPTokenizerUnitTest();
