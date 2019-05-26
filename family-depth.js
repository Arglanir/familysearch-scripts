/**
 * This snippet allows you to get all ends in the familly tree
 */

var nbStillParents = 0;
var nbFinish = 0;
var depthMax = 0;
var result = {}; // depth => [{name, date, id}], with one special "notended"
function getAllFamilyTreeEnds({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}={}) {
    if (fullinfo.data.parents.length == 0) {
        // finish
        var onedate = "-";
        var conclusion = infolocal.birthlikeConclusion ? infolocal.birthlikeConclusion : infolocal.deathlikeConclusion;
        if (conclusion) {
            onedate = conclusion.details.date.formalText.split("-")[0];
        } 
        console.log("Depth " + depth + ", name: " + infolocal.name + onedate + ", id:" + from);
        if (!result[depth]) {
            result[depth] = [];
        }
        result[depth].push({name: infolocal.name, date: onedate, id: from});
        nbFinish += 1;
    } else if (depth == depthMax) {
        nbStillParents += 1;
        if (!result["notended"]) {
            result["notended"] = [];
        }
        result["notended"].push({name: infolocal.name, date: onedate, id: from});
    }
}

function computeDepth({from=document.location.pathname.split("/").pop(), depthmax=8}={}) {
    nbStillParents = 0;
    nbFinish = 0;
    depthMax = depthmax;
    result = {};
    familyTreeRecursive({callback:getAllFamilyTreeEnds, from:from, depthmax:depthmax, callbackEnd:function(){console.log("Lines terminated: " + nbFinish + ", still with parents: " + nbStillParents);}});
}

computeDepth({depthmax:15});

// the end results will be displayed, and at the end, you have the results in the "result" object