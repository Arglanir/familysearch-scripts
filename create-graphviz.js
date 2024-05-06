/** Creates data for GraphViz for a Cousinade */
/** Need to be run inside a child of the couple you want to explore */

function storeParentsData({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}={}) {
    if (infolocal.name == "?") return;
    if (!window.persons) {
        window.persons = {};
    }
    var persons = window.persons;
    
    // get real birthday
    var bdate = getBirthDate(infolocal).replace('A+','~').replace('+','');
    // death?
    var ddate = getDeathDate(infolocal).replace('A+','~').replace('+','');
    
    var place = getFirstJsonInfo(infolocal, ['birth','death'], 'details', 'place', 'normalizedText');
    
    var person = {id:infolocal.id, name:infolocal.name, birth:bdate, death:ddate, depth:depth, place:place, living:infolocal.living};
    person.male = infolocal.gender == "MALE";
    person.parents = [];
    
    // checking parents
    if (fullinfo.data.parents) {
        for (var i=0; i < fullinfo.data.parents.length; i++) {
            var relationship = fullinfo.data.parents[i];
            if (relationship.spouse1 && relationship.spouse1.id) {
                person.parents.push(relationship.spouse1.id);
            }
            if (relationship.spouse2 && relationship.spouse2.id != infolocal.id) {
                person.parents.push(relationship.spouse2.id);
            }
        }
    }
    
    // storing
    persons[infolocal.id] = person;
    
}

function generateDigraphFull() {
    var persons = window.persons;
    var todisplay = 'digraph "Family Tree" {\n\trankdir=LR;\n';
    var nodes = '';
    var links = '';
    var clusters = {};
    var sizeAtDepth = {};
    for (var personId in persons) {
        var person = persons[personId];
        sizeAtDepth[person.depth] = (sizeAtDepth[person.depth]||0) + 1;
        if (person.place) {
            if (!clusters[person.place]) clusters[person.place] = [];
            clusters[person.place].push(personId);
        }
        var color = person.male ? "blue" : '"#FF00FF"';
        var name = (person.name || "Unknown").replace(/"/ig, '\\"');
        var tooltip = name;
        if (person.place) {
            tooltip = person.place.replace(/"/ig, '\\"');
        }
        nodes += `\t"${personId}" [label="${name}\\n${person.birth} - ${person.death}", tooltip="${tooltip}", color=${color}, URL="https://www.familysearch.org/tree/person/details/${personId}"];\n`;
        for (var parentid of person.parents) {
            if (!persons[parentid]) continue;
            var color2 = persons[parentid].male ? "blue" : '"#FF00FF"';
            links += `\t"${parentid}" -> "${personId}" [color=${color2}];\n`;
        }
    }
    var clustersString = "";
    for (var place in clusters) {
        var people = clusters[place];
        if (people.length < 2) continue;
        place = place.replace(/"/ig, '\\"');
        clustersString += `\tsubgraph "${place}" {\n\t\tcluster=true;\n\t\t`;
        for (var personId of people) {
            clustersString += `"${personId}"; `;
        }
        clustersString += '\n\t}\n';
    }
    todisplay += links + "\n";
    todisplay += nodes + "\n";
    //todisplay += clustersString + "\n"; // not that beautiful, links start going backwards
    todisplay += "}\n";
    console.log(sizeAtDepth);
    return todisplay;
}


function generateDigraphSimpleCouples() {
    var persons = window.persons;
    var couple2People = {}; // coupleId => [fatherid, motherid]
    var person2couple = {}; // personId => [coupleId1, coupleId2...]
    var linksToCreate = []; // {coupleId:<id>, personId:<id>},...
    var sizeAtDepth = {};
    // create couples & links
    for (var personId in persons) {
        var person = persons[personId];
        // list of father & mother
        var maleParents = [];
        var femaleParents = [];
        person.parents.forEach(identifier => {
          if (!persons[identifier]) return;
          if (persons[identifier].male) {
            maleParents.push(identifier);
          } else {
            femaleParents.push(identifier);
          }
        });
        // same number of parents
        while (maleParents.length >= 1 && femaleParents.length >= 1) {
            // create a couple
            var fatherid = maleParents.length > 1 ? maleParents.shift() : femaleParents.length > 1 ? maleParents[0] : maleParents.shift();
            var motherid = femaleParents.length > 1 ? femaleParents.shift() : maleParents.length > 1 ? femaleParents[0] : femaleParents.shift();
            var coupleId = fatherid + "+" + motherid;
            // fill maps
            couple2People[coupleId] = [fatherid, motherid];
            for (var parentId of [fatherid,motherid]) {
                if (!person2couple[parentId]) person2couple[parentId] = [];
                person2couple[parentId].push(coupleId);
            }
            // register link for latter when couple known
            linksToCreate.push({coupleId:coupleId, personId:personId});
        }
        // create non-couples if one parent is missing
        while (femaleParents.length * maleParents.length == 0 && femaleParents.length + maleParents.length > 0) {
            var coupleId = maleParents.length ? maleParents.shift() : femaleParents.shift();
            couple2People[coupleId] = [coupleId];
            if (!person2couple[coupleId]) person2couple[coupleId] = [];
            person2couple[coupleId].push(coupleId);
            linksToCreate.push({coupleId:coupleId, personId:personId});
        }
    }
    var nbCouples = Object.keys(couple2People).length;
    console.log("Created " + nbCouples + " couples")
    console.log("Created " + linksToCreate.length + " links")
    // find leaves with no child
    for (var personId in persons) {
        if (!person2couple[personId]) {
            person2couple[personId] = [personId];
            couple2People[personId] = [personId];
        }
    }
    console.log("Added " + (Object.keys(couple2People).length - nbCouples) + "only children")
    
    // now create the graph
    function simpledate(text) {
        /** method to extract only the year */
        var value = text.match(/\d{3,4}/);
        if (!!value && value.length > 0) {
            return value[0];
        }
        return "?";
    }
    var todisplay = 'digraph "Family Tree" {\n\trankdir=LR;\n';
    var nodes = '';
    var links = '';
    
    // create links
    var createdLinks = {};
    for (var link of linksToCreate) {
        // {coupleId:<id>, personId:<id>},...
        var person = persons[link.personId];
        var name = (person.name || "Unknown").replace(/"/ig, '\\"');
        // https://graphviz.org/doc/info/colors.html
        var color2 = person.male ? "blue" : 'darkorchid1';
        for (var coupleId2 of person2couple[link.personId]) {
            var linkKey = link.coupleId + "->" +coupleId2;
            if (createdLinks[linkKey]) continue;
            links += `\t"${link.coupleId}" -> "${coupleId2}" [color=${color2}, tooltip="${name}"];\n`;
            createdLinks[linkKey] = true;
        }
    }
    // create nodes
    for (var coupleId in couple2People) {
        var couple = couple2People[coupleId];
        var label = "";
        var mainId = couple2People[coupleId][0];
        var place = "";
        for (var personId of couple2People[coupleId]) {
            var person = persons[personId];
            if (person.place && !place) {place = person.place;}
            var personBirth = simpledate(person.birth);
            var personDeath = simpledate(person.death);
            personDeath = person.living ? "" : personDeath == "?" ? "†" : "†"+personDeath;
            var name = (person.name || "Unknown").replace(/\?/ig, "").trim() //.replace(/"/ig, '\\"');
            if (person.living) {
                // remove second firstnames
                var tokens = name.split(" ");
                var firstname = tokens[0];
                var lastname = tokens[tokens.length-1];
                name = firstname + (tokens.length > 1 ? " " + lastname : "")
            }
            label += `\n${name} (${personBirth} - ${personDeath})`;
        }
        // remove first \n
        label = label.substring(1).replace(/"/ig, '\\"').replace('\n','\\n');
        place = place.replace(/"/ig, '\\"');
        // create node
        nodes += `\t"${coupleId}" [label="${label}", tooltip="${place}", URL="https://www.familysearch.org/tree/person/details/${mainId}"];\n`;
    }
    todisplay += links + "\n";
    todisplay += nodes + "\n";
    todisplay += "}\n";
    console.log(sizeAtDepth);
    return todisplay;
}

generateDigraph = generateDigraphSimpleCouples
// copy/paste to http://magjac.com/graphviz-visual-editor/

function computeGraph({from=getCurrentId(), depthmax=20}={}) {
    familyTreeRecursive({callback:storeParentsData, from:from, depthmax:depthmax, callbackEnd:function(){
        console.log("Information stored in window.persons, for " + Object.keys(window.persons).length + " people");
        var startGoingDownFrom = null;
        for (var personId in window.persons) {
            if (window.persons[personId].depth == 1) {
                startGoingDownFrom = personId;
                break;
            }
        }
        console.log("Going down from " + startGoingDownFrom);
        familyTreeGetDown({callback:storeParentsData, from:startGoingDownFrom, depthmax:depthmax, includeSpouses:true, callbackEnd:function() {
            console.log("Information stored in window.persons, for " + Object.keys(window.persons).length + " people");
            console.log(generateDigraph());
        }});
    }});
}
computeGraph({});