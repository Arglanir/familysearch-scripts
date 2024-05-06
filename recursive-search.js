
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

// ConnectionPool in order not to send too many requests at the same time to FamilySearch
// This leads to 429 errors
// Control the max number of connections using connectionsPool.maxRunningJobs
var connectionsPool = new function(){
    // data and functions
    var pool = this;
    this.runningJobs = [];
    this.maxRunningJobs = 4;
    this.remainingJobs = [];
    this.stats = {finished:0};
    this.terminated = true;
    var toRunOnFinish = [];
    // add a hook on termination
    this.onFinish = function (callback) {
        toRunOnFinish.push(callback);
    }
    // starts the next job if remaining slots
    this.nextJob = function() {
        while (pool.remainingJobs.length > 0 && pool.runningJobs.length < pool.maxRunningJobs) {
            var job = pool.remainingJobs.shift();
            pool.runningJobs.push(job);
            job.perform();
        }
        // some logs to check if used and termination
        if (!pool.terminated && pool.remainingJobs.length == 0 && pool.runningJobs.length == 0) {
            console.log("Connection pool is now closed!");
            console.log(pool.stats);
            pool.terminated = true;
            while (pool.terminated && toRunOnFinish.length > 0) {
                console.log("Calling "+toRunOnFinish.length+" onFinish callbacks");
                var callback = toRunOnFinish.shift();
                try {
                    callback();
                } catch(e) {
                    console.log(e);
                }
            }
        }
    }
    // indicate a job as terminated and run the next one
    this.terminatedJob = function (job) { // called by ConnectionsPoolJobOrder.perform.finally
        var index = pool.runningJobs.indexOf(job);
        if (index >= 0) {
            pool.stats.finished++;
            pool.runningJobs.splice(index, 1);
        } else {
            console.log("impossible to find what to do with job that called " + job.urlToFetch);
        }
        pool.nextJob();
    }
    // add a new job. Use it instead of fetch() method directly
    this.add = function(url) {
        pool.terminated = false;
        var job = new ConnectionsPoolJobOrder(url);
        pool.remainingJobs.push(job);
        setTimeout(pool.nextJob, 50);
        return job;
    }
}
// store the original "fetch" method
var originalFetch = fetch;
// a job order for the connectionsPool
function ConnectionsPoolJobOrder(url) {// to be called with "new"
    // data and function stores
    var self = this;
    this.urlToFetch = url;
    this.state = 'created';
    this.andThen = [];
    this.andCatch = function() {};
    this.andFinally = function() {};
    // interface like normal fetch()
    this.then = function (aFunction) {
        self.andThen.push(aFunction);
        return self;
    };
    this.catch = function (aFunction) {
        self.andCatch = aFunction;
        return self;
    };
    this.finally = function (aFunction) {
        self.andFinally = aFunction;
        return self;
    };
    // runner!
    this.perform = function() {
        self.state = 'running';
        var current = originalFetch(self.urlToFetch);
        while(self.andThen.length > 0) {
            current = current.then(self.andThen.shift());
        }
        current = current.catch(self.andCatch);
        current = current.finally(function() {
            self.andFinally();
            self.state = 'terminated';
            connectionsPool.terminatedJob(self);
        })
    }
}
// replace the fetch method
fetch = connectionsPool.add;

/**
 *   This function allows you to get information from your ancestors, recursively
 */
function familyTreeRecursive({
    // public parameters
    // @param callback: function({depth, from, infolocal, fullinfo})
    // @param from: family search identifier XXXX-YYY
    // @param depthmax: maximal depth
    // @param callbackEnd: called at the end
    callback=function({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}){},
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
    callback=function({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}){},
    from=getCurrentId(),
    depthmax=10,
    callbackBeforePerson=function(identifier) {return true;},
    callbackEnd=function({visited=0, errors=0}){console.log("Default ended method");},
    // private parameters
    // @param depth: the current depth
    // @param currentChain: the current chain to the current 'from' (not included) [{id, name, nextisfather}]
    // @param currentalgo: shared parameters for the current process
    depth=0, currentChain=[],
    includeSpouses=false,
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
                      if (includeSpouses) {
                        // bug, the old spouse may not have children
                        var couple = fullinfo.data.spouses[i];
                        var coupleId = couple.coupleId;
                        var otherId = coupleId.replace(from, "").replace("_", "");
                        if (from=="G73C-J5W") console.log("Including spouse" + otherId);
                        var arguments = {callback:callback, depthmax:depthmax, callbackEnd:callbackEnd, currentChain:currentChain, depth:depth, currentalgo:currentalgo, shareddata:shareddata, from:otherId};
                        familyTreeGetDown(arguments);
                      }
                      if (!fullinfo.data.spouses[i].children) continue;
                      for (var j=0; j < fullinfo.data.spouses[i].children.length; j++) {
                        var child = fullinfo.data.spouses[i].children[j];
                        childCounter++;
                        //console.log("In "+from+", child " + i + "-"+j)
                        // new chain in order to tell we are in a father
                        var newChain = currentChain.slice(0);
                        newChain.push({id:from, name:infolocal.name, child:childCounter});
                        var arguments = {callback:callback, depthmax:depthmax, callbackEnd:callbackEnd, currentChain:newChain, depth:depth+1, currentalgo:currentalgo, shareddata:shareddata, includeSpouses:includeSpouses, from:child.id};
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
/** Returns some data from json */
function getFirstJsonInfo(infolocal, ...attributes) {
    if (attributes.length == 0) {
        return infolocal;
    }
    var first = attributes.shift();
    if (!first.shift) {// not an array !
        first = [first];
    }
    for (var attribute of first) {
        var newinfo = infolocal[attribute];
        if (!newinfo) continue;
        var toreturn = getFirstJsonInfo(newinfo, ...attributes);
        if (!!toreturn) return toreturn;
    }
    return false;
}

/**
 *  Returns the current id of the page (XXXX-YYY)
 */
function getCurrentId() {
    return document.location.pathname.split("/").pop();
}

// for infolocal, check test/infolocal.reference.json
// for fullinfo, check test/fullinfo.reference.json
