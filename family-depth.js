/**
 * This snippet allows you to get all ends in the familly tree
 */

var nbStillParents = 0;
var nbFinish = 0;
var depthMax = 0;
function getAllFamilyTreeEnds({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}={}) {
    if (fullinfo.data.parents.length == 0) {
        // finish
        var onedate = "-";
        var conclusion = infolocal.birthlikeConclusion ? infolocal.birthlikeConclusion : infolocal.deathlikeConclusion;
        if (conclusion) {
            onedate = conclusion.details.date.formalText.split("-")[0];
        } 
        console.log("Depth " + depth + ", name: " + infolocal.name + onedate + ", id:" + from);
        nbFinish += 1;
    } else if (depth == depthMax) {
        nbStillParents += 1;
    }
}

function computeDepth({from=document.location.pathname.split("/").pop(), depthmax=8}={}) {
    nbStillParents = 0;
    nbFinish = 0;
    depthMax = depthmax;
    familyTreeRecursive({callback:getAllFamilyTreeEnds, from:from, depthmax:depthmax, callbackEnd:function(){console.log("Lines terminated: " + nbFinish + ", still with parents: " + nbStillParents);}});
}

computeDepth({depthmax:10});
