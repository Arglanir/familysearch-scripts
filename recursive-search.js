/**
 *   This function allows you to get information from your family tree, recursively
 */
function familyTreeRecursive({
    // public parameters
    // @param callback: function({depth, from, infolocal, fullinfo})
    // @param from: family search identifier XXXX-YYY
    // @param depthmax: maximal depth
    // @param callbackEnd: called at the end
    callback=function(){{depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}},
    from=getCurrentId(),
    depthmax=10,
    callbackEnd=function({visited=0, errors=0}){},
    // private parameters
    // @param depth: the current depth
    // @param currentChain: the current chain to the current 'from' (not included) [{id, name, nextisfather}]
    // @param currentalgo: shared parameters for the current process
    depth=0, currentChain=[],
    currentalgo={totaldone:0, currentmax:0, errors:0}}={}) {
    currentalgo.currentmax++;
    fetch("/tree-data/person/" + from + "/card?&stillbornDataProblemEx=true&matchUsesTreeHintEx=true"
    )
    .then(response => {
        return response.json();
    })
    .then(function (infolocal) {
        fetch("/tree-data/family-members/person/" + from).then(response => {
                return response.json();
            }).then(function (fullinfo) {
                callback({depth:depth, from:from, infolocal:infolocal, fullinfo:fullinfo, chain:currentChain});
                if (depth < depthmax && fullinfo.data.parents) {
                    for (var i=0; i < fullinfo.data.parents.length; i++) {
                        // new chain in order to tell we are in a father
                        var newChain = currentChain.slice(0);
                        newChain.push({id:from, name:infolocal.name, nextisfather:true});
                        var arguments = {callback:callback, depthmax:depthmax, callbackEnd:callbackEnd, currentChain:newChain, depth:depth+1, currentalgo:currentalgo};
                        if (typeof fullinfo.data.parents[i].husband != "undefined") {
                            arguments.from = fullinfo.data.parents[i].husband.id;
                            familyTreeRecursive(arguments);
                        }
                        if (typeof fullinfo.data.parents[i].wife != "undefined") {
                            // new parameters in order to tell we are in a mother
                            arguments.from = fullinfo.data.parents[i].wife.id;
                            arguments.currentChain = newChain = currentChain.slice(0);
                            newChain.push({id:from, name:infolocal.name, nextisfather:false});
                            familyTreeRecursive(arguments);
                        }
                    }
                }
            }).catch(function() {
                currentalgo.errors++;
            }).finally(function() {
                currentalgo.totaldone++;
                if (currentalgo.totaldone == currentalgo.currentmax) {
                    console.log("Ended, " + currentalgo.totaldone + " visited, "+currentalgo.errors+" errors.");
                    callbackEnd({visited:currentalgo.totaldone, errors:currentalgo.errors})
                }
            });
        }
    ).catch(function(err) {
        currentalgo.currentmax--;
        currentalgo.errors++;
        if (currentalgo.totaldone == currentalgo.currentmax) {
            console.log("Ended, " + currentalgo.totaldone + " visited, "+currentalgo.errors+" errors.");
            callbackEnd({visited:currentalgo.totaldone, errors:currentalgo.errors})
        }
    });
}

/**
 *  Returns the current id of the page (XXXX-YYY)
 */
function getCurrentId() {
    return document.location.pathname.split("/").pop();
}