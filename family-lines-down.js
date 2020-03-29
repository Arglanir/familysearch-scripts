/** This script allows you to get down the lines of an ancestor to see if other people are connected
Usage: go the the page of an ancestor, then copy/paste recursive-search.js then this script.
*/


var numberOfDescendants = 0;
var descendantsDepth = 0;
var descendantsAtEachDepth = [];
var linesAtEachDepth = {};
/**
 *   Reads a chain and produces a string
 */
function readChain(chain) {
    var toreturn = "";
    for (var i = 0; i < chain.length-1; i++) {
        if (i > 0) toreturn += "-";
        toreturn += chain[i].child;
    }
    return toreturn;
}
/**
 *  Callback for familyTreeGetDown keep track of down lines
 */
function computeNumberOfDescendantsCallback({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}={}) {
    // compute a date
    var onedate = "-";
    var conclusion = infolocal.birthlikeConclusion ? infolocal.birthlikeConclusion : infolocal.deathlikeConclusion;
    if (conclusion) {
        onedate = conclusion.details.date.formalText.split("-")[0];
    }
    // display
    console.log(`${depth}: ${infolocal.name} ${onedate} (${descendantsAtEachDepth.length})`);
    // keep track
    numberOfDescendants += 1;
    descendantsDepth = depth > descendantsDepth ? depth : descendantsDepth;
    descendantsAtEachDepth[depth] += 1;
    if (isNaN(descendantsAtEachDepth[depth])) {
        descendantsAtEachDepth[depth] = 1;
    }
    if (!linesAtEachDepth[depth]) {
        linesAtEachDepth[depth]={};
    }
    linesAtEachDepth[depth][readChain(chain)] = 1;
}
/**
 *  Main method for this script
 */
function computeNumberOfDescendants({from=getCurrentId(), depthmax=50}={}) {
    // reset
    numberOfDescendants = 0;
    descendantsAtEachDepth = [];
    descendantsDepth = 0;
    linesAtEachDepth = {};
    // call
    familyTreeGetDown({callback:computeNumberOfDescendantsCallback, from:from, depthmax:depthmax, callbackEnd:function(){
        console.log("Number of descendants: " + numberOfDescendants);
        console.log("Max depth found: " + descendantsDepth);
        for (var i = 0; i < descendantsAtEachDepth.length; i++) {
            console.log(`  At depth ${i}: ${descendantsAtEachDepth[i]}`);
            for (var line in linesAtEachDepth[i]) {
                console.log(`  Lines: ${line}`);
            }
        }
    }});
}
computeNumberOfDescendants();