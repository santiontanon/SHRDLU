class SFXManagerNode {

    constructor(b:AudioBuffer, n:string)
    {
        this.buffer = b;
        this.name =n;
    }

    buffer:AudioBuffer;
    name:string;
}


class SFXManager {
    constructor()
    {
        console.log("SFXManager created.");
    }


    play(sfxName:string) 
    {
        var sfx:SFXManagerNode = this.hash[sfxName];

        if (sfx == null) {
            // load it:
            var SFXM:SFXManager = this;
            var request:XMLHttpRequest = new XMLHttpRequest();
            request.open('GET', sfxName, true);
            request.responseType = 'arraybuffer';
             // Decode asynchronously
            request.onload = function() {
              audioCtx.decodeAudioData(request.response, function(buffer) {
                sfx = new SFXManagerNode(buffer, sfxName);
                SFXM.hash[sfxName] = sfx;
                SFXM.playInternal(sfx)
              });
            }
            request.send();
        } else {
            this.playInternal(sfx);
        }
    }


    playInternal(sfx:SFXManagerNode)
    {
        // do not play the same SFX more than one during the same game cycle (to avoid volume issues)
        if (this.already_played.indexOf(sfx)==-1) {
            this.already_played.push(sfx);
            var source:AudioBufferSourceNode = audioCtx.createBufferSource();
            source.buffer = sfx.buffer;
            source.connect(audioCtx.destination);
            source.start();        
        }
    }


    // clears the list of already played SFX
    next_cycle()
    {
        this.already_played = [];
    }


    hash: { [id: string] : SFXManagerNode; } = {};
    already_played:SFXManagerNode[] = [];
}

