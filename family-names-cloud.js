/**
 * This snippet allows you to get all family names from your tree, and give them a weight and the location.
 * You can then paste it to https://www.nuagesdemots.fr/ in the Glossary
 */


var names = {};
function getAllFamilyNamesCallback({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}={}) {
    var name = infolocal.name;
    var familyname = name.split(" ").pop();
    familyname = familyname.charAt(0).toUpperCase() + familyname.substr(1).toLowerCase();
    var location = 0.5;
    for (var i = 0; i < chain.length; i++) {
        location += (chain[i].nextisfather ? -1 : 1) * Math.pow(.5, i+2);
    }
    if (typeof names[familyname] == "undefined" || names[familyname].depth > depth) {
        names[familyname] = {depth:depth, firstid:from, location:location};
    }
}
function computeFamilyNames(cap) {
    var toreturn = ""
    for (var name in names) {
        info = names[name];
        priority = cap - info.depth > 0 ? cap - info.depth : 1;
        toreturn += priority + "  " + name + " " + "https://www.familysearch.org/tree/person/details/" + info.firstid +"\n";
    }
    console.log(toreturn);
    //return toreturn;
}

function getAllFamilyNamesWithLinksAndColor({from=document.location.pathname.split("/").pop(), depthmax=7, cap=4}={}) {
    names = {};
    familyTreeRecursive({callback:getAllFamilyNamesCallback, from:from, depthmax:depthmax, callbackEnd:function(){computeFamilyNames(cap);}});
}

getAllFamilyNamesWithLinksAndColor({depthmax:8, cap:5})