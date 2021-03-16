
var objectId = (function () {
    var allObjects = [];

    var f = function(obj) {
        var i = allObjects.indexOf(obj);
        if (i === -1) {
            allObjects.push(obj);
            i = allObjects.indexOf(obj);
        }
        return i;
    }
    f.clear = function() {
      allObjects = [];
    };
    return f;
})();

/** URL for simple information */
function familyTreeRecursive_urlSimple(from) {
    return "/service/tree/tree-data/v8/person/" + from + "/card?locale=fr&includeTempleRollupStatus=true&stillbornDataProblemEx=true&matchUsesTreeHintEx=true";
}

/** URL for full information */
function familyTreeRecursive_urlComplete(from) {
    return "/service/tree/tree-data/family-members/person/" + from;
}

/**
 *   Reads a chain and produces a string
 */
function readChildrenChain(chain) {
    var toreturn = "";
    for (var i = 0; i < chain.length-1; i++) {
        if (i > 0) toreturn += "-";
        toreturn += chain[i].child;
    }
    return toreturn;
}

/**
 *   Reads a chain and produces a string
 */
function readParentChain(chain) {
    var chains = []
    chain.forEach(function({id="", name="", nextisfather=true}){
        chains.push(nextisfather ? "F" : "M");
    });
    return chains.join('>');
}

/**
 *   This function allows you to get information from your ancestors, recursively
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
    callbackBeforePerson=function(identifier) {return true;},
    callbackEnd=function({visited=0, errors=0}){console.log("Default ended method");},
    // private parameters
    // @param depth: the current depth
    // @param currentChain: the current chain to the current 'from' (not included) [{id, name, nextisfather}]
    // @param currentalgo: shared parameters for the current process
    depth=0, currentChain=[], shareddata={},
    currentalgo={totaldone:0, currentmax:0, errors:0}}={}) {

    function familyTreeRecursiveCheckEnd() {
        if (currentalgo.totaldone == currentalgo.currentmax) {
            console.log("Ended, " + currentalgo.totaldone + " visited, "+currentalgo.errors+" errors.");
            callbackEnd({visited:currentalgo.totaldone, errors:currentalgo.errors, shareddata:shareddata})
        }
    }
    if (!callbackBeforePerson(from)) {
        return;
    }
    currentalgo.currentmax++;
    //console.log("After call:" + from + " " + objectId(currentalgo));
    fetch(familyTreeRecursive_urlSimple(from)
    )
    .then(response => {
        return response.json();
    })
    .then(function (infolocal) {
        fetch(familyTreeRecursive_urlComplete(from)).then(response => {
                return response.json();
            }).then(function (fullinfo) {
                var command = callback({depth:depth, from:from, infolocal:infolocal, fullinfo:fullinfo, chain:currentChain, shareddata:shareddata});
                if (command == "stop") {
                    // do not go deeper
                    return;
                }
                if (depth < depthmax && fullinfo.data.parents) {
                    for (var i=0; i < fullinfo.data.parents.length; i++) {
                        //console.log("In "+from+", parent " + i)
                        //console.log(fullinfo.data.parents[i]);
                        // new chain in order to tell we are in a father
                        var newChain = currentChain.slice(0);
                        newChain.push({id:from, name:infolocal.name, nextisfather:true});
                        var arguments = {callback:callback, depthmax:depthmax, callbackEnd:callbackEnd, callbackBeforePerson:callbackBeforePerson,
                                        currentChain:newChain, depth:depth+1, currentalgo:currentalgo, shareddata:shareddata};
                        //console.log("Before any call:" + from + " " + objectId(currentalgo) + " " + objectId(arguments.currentalgo));
                        // checking father (husband of couple)
                        if (typeof fullinfo.data.parents[i].husband != "undefined") {
                            arguments.from = fullinfo.data.parents[i].husband.id;
                            //console.log("Before call1:" + arguments.from + " " + objectId(currentalgo) + " " + objectId(arguments.currentalgo));
                            familyTreeRecursive(arguments);
                        }
                        if (typeof fullinfo.data.parents[i].wife != "undefined") {
                            // new parameters in order to tell we are in a mother
                            arguments.from = fullinfo.data.parents[i].wife.id;
                            arguments.currentChain = newChain = currentChain.slice(0);
                            newChain.push({id:from, name:infolocal.name, nextisfather:false});
                            arguments.currentalgo = currentalgo;
                            //console.log("Before call2:" + arguments.from + " " + objectId(currentalgo));
                            familyTreeRecursive(arguments);
                        }
                        ["spouse1", "spouse2"].forEach(function (attr) {
                            if (typeof fullinfo.data.parents[i][attr] != "undefined") {
                                // new parameters in order to tell we are in a mother or father
                                var arguments = {callback:callback, depthmax:depthmax, callbackEnd:callbackEnd, callbackBeforePerson:callbackBeforePerson,
                                                currentChain:newChain, depth:depth+1, currentalgo:currentalgo, shareddata:shareddata};
                                var attrvalue = fullinfo.data.parents[i][attr];
                                arguments.from = attrvalue.id;
                                if (arguments.from == "UNKNOWN") return;
                                arguments.currentChain = newChain = currentChain.slice(0);
                                arguments.currentalgo = currentalgo;
                                newChain.push({id:from, name:infolocal.name, nextisfather:attrvalue.gender == "MALE"});
                                //console.log("Before call3:" + arguments.from + " " + objectId(currentalgo) + " " + objectId(arguments.currentalgo));
                                familyTreeRecursive(arguments);
                            }
                        });
                    }
                }
            }).catch(function(err) {
                console.log(err);
                currentalgo.errors++;
            }).finally(function() {
                currentalgo.totaldone++;
                familyTreeRecursiveCheckEnd();
            });
        }
    ).catch(function(err) {
        console.log(err);
        currentalgo.currentmax--;
        currentalgo.errors++;
        familyTreeRecursiveCheckEnd();
    });
}

/**
 * This function allows you to get information from the descendants
 */
function familyTreeGetDown({
    // public parameters
    // @param callback: function({depth, from, infolocal, fullinfo})
    // @param from: family search identifier XXXX-YYY
    // @param depthmax: maximal depth
    // @param callbackEnd: called at the end
    callback=function(){{depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}},
    from=getCurrentId(),
    depthmax=10,
    callbackBeforePerson=function(identifier) {return true;},
    callbackEnd=function({visited=0, errors=0}){console.log("Default ended method");},
    // private parameters
    // @param depth: the current depth
    // @param currentChain: the current chain to the current 'from' (not included) [{id, name, nextisfather}]
    // @param currentalgo: shared parameters for the current process
    depth=0, currentChain=[],
    shareddata={},
    currentalgo={totaldone:0, currentmax:0, errors:0}}={}) {
    if (!callbackBeforePerson(from)) {
        return;
    }
    currentalgo.currentmax++;
    //console.log("After call:" + from + " " + objectId(currentalgo));
    fetch(familyTreeRecursive_urlSimple(from)
    )
    .then(response => {
        return response.json();
    })
    .then(function (infolocal) {
        fetch(familyTreeRecursive_urlComplete(from)).then(response => {
                return response.json();
            }).then(function (fullinfo) {
                var command = callback({depth:depth, from:from, infolocal:infolocal, fullinfo:fullinfo, chain:currentChain,shareddata:shareddata});
                if (command == "stop") {
                    // do not go deeper
                    return;
                }
                if (depth < depthmax && fullinfo.data.spouses) {
                    var childCounter = 0;
                    for (var i=0; i < fullinfo.data.spouses.length; i++) {
                      if (!fullinfo.data.spouses[i].children) continue;
                      for (var j=0; j < fullinfo.data.spouses[i].children.length; j++) {
                        var child = fullinfo.data.spouses[i].children[j];
                        childCounter++;
                        //console.log("In "+from+", child " + i + "-"+j)
                        // new chain in order to tell we are in a father
                        var newChain = currentChain.slice(0);
                        newChain.push({id:from, name:infolocal.name, child:childCounter});
                        var arguments = {callback:callback, depthmax:depthmax, callbackEnd:callbackEnd, currentChain:newChain, depth:depth+1, currentalgo:currentalgo, shareddata:shareddata,
                        from:child.id};
                        familyTreeGetDown(arguments);
                    }
                  }
                }
            }).catch(function(e) {
                console.log(e);
                currentalgo.errors++;
            }).finally(function() {
                currentalgo.totaldone++;
                if (currentalgo.totaldone == currentalgo.currentmax) {
                    console.log("Ended, " + currentalgo.totaldone + " visited, "+currentalgo.errors+" errors.");
                    callbackEnd({visited:currentalgo.totaldone, errors:currentalgo.errors, shareddata:shareddata})
                }
            });
        }
    ).catch(function(err) {
        console.log(err);
        currentalgo.currentmax--;
        currentalgo.errors++;
        if (currentalgo.totaldone == currentalgo.currentmax) {
            console.log("Ended, " + currentalgo.totaldone + " visited, "+currentalgo.errors+" errors.");
            callbackEnd({visited:currentalgo.totaldone, errors:currentalgo.errors, shareddata:shareddata})
        }
    });
}

function getYearDate(conclusion) {
    if (conclusion && conclusion.details && conclusion.details.date && conclusion.details.date.formalText) {
        return conclusion.details.date.formalText.split("-")[0]; // year only
    }
    return "?";
}
function getFullDate(conclusion) {
    if (conclusion && conclusion.details && conclusion.details.date && conclusion.details.date.formalText) {
        return conclusion.details.date.formalText; // year only
    }
    return "?";
}

function getDates(infolocal) {
    return getYearDate(infolocal.birthlikeConclusion ? infolocal.birthlikeConclusion : infolocal.birth) + "-"+
        getYearDate(infolocal.deathlikeConclusion ? infolocal.deathlikeConclusion : infolocal.death);
}
function getBirthDate(infolocal) {
    return getFullDate(infolocal.birthlikeConclusion ? infolocal.birthlikeConclusion : infolocal.birth);
}
function getDeathDate(infolocal) {
    return getFullDate(infolocal.deathlikeConclusion ? infolocal.deathlikeConclusion : infolocal.death);
}

/**
 *  Returns the current id of the page (XXXX-YYY)
 */
function getCurrentId() {
    return document.location.pathname.split("/").pop();
}

// for infolocal, check test/infolocal.reference.json
// for fullinfo, check test/fullinfo.reference.json
