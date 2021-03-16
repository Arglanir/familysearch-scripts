// https://www.familysearch.org/service/tree/tree-data/changes/person/GSZG-FCV
// result.data.contactNames {id:name}


// main function
function computeWorkers({from=getCurrentId(), depthmax=8}={}) {
    var result = window.familyworkerresult = {remaining:0, endofrecursivity:false}; //{username : {chainline: id+name}}

    function recordWorker({depth=0, from='UNKNOWN', currentalgo={}, infolocal={}, chain=[]}={}) {
        if (!from || from == 'UNKNOWN') return;
        var chainline = readParentChain(chain);
        result.remaining++;
        fetch("https://www.familysearch.org/service/tree/tree-data/changes/person/" + from)
        .then(response => {
            return response.json();
        })
        .then(function (changes) {
            for (const idp in changes.data.contactNames) {
                var name = changes.data.contactNames[idp];
                if (!result[name]) {
                    result[name] = {};
                    console.log("Found worker " + name + " in " + from + " " + infolocal.name + " " + chainline);
                } else {
                    var found = false;
                    for (const exitingchain in result[name]) {
                        if (chainline.startsWith(exitingchain)) {
                            found = true; break;
                        }
                    }
                    if (found) {
                        continue;
                    }
                }
                result[name][chainline] = from;
            }
        }).finally(function() {
            result.remaining--;
            if (result.endofrecursivity && result.remaining == 0) {
                console.log("End of processing!")
                console.log(result);
            }
        })

    }
    familyTreeRecursive({callback:recordWorker, from:from, depthmax:depthmax, callbackEnd:function(){
        result.endofrecursivity = true;
    }});
}

computeWorkers({depthmax:20});