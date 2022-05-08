/**
 * This snippet allows you to get all family names from your tree, and give them a weight and the location.
 * You can then use https://www.nuagesdemots.fr/ or https://www.wordclouds.com/ : import CSV file
 */


var names = {};
function extractorFamilyName(name) {
    var familyname = name.split(" ").pop();
    familyname = familyname.charAt(0).toUpperCase() + familyname.substr(1).toLowerCase();
    return [familyname]
}
function extractorFirstName(name) {
    var firstname = name.split(" ").shift();
    firstname = firstname.charAt(0).toUpperCase() + firstname.substr(1).toLowerCase();
    return [firstname]
}
// change extractor here
var extractor = extractorFamilyName; //extractorFamilyName;
function getAllFamilyNamesCallback({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}={}) {
    var name = infolocal.name;
    var familynames = extractor(name);
    var location = 0.5;
    for (var i = 0; i < chain.length; i++) {
        location += (chain[i].nextisfather ? -1 : 1) * Math.pow(.5, i+2);
    }
    for (var nm of familynames) {
        if (typeof names[nm] == "undefined" || names[nm].depth > depth) {
            names[nm] = {depth:depth, firstid:from, location:location};
        }
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

function computeFamilyNamesToCsvFile(cap) {
    var toreturn = '"weight";"word";"color";"url"\n'
    //"weight";"word";"color";"url"
    for (var name in names) {
        info = names[name];
        priority = cap - info.depth > 0 ? cap - info.depth : 1;
        toreturn += '"' + priority + '";"' + name + '";"";"' + "https://www.familysearch.org/tree/person/details/" + info.firstid +'"\n';
    }
    download("name-cloud-from-"+getCurrentId()+".csv", toreturn)
    //console.log(toreturn);
    //return toreturn;
}

function download(filename, text) {
    // https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function getAllFamilyNamesWithLinksAndColor({from=getCurrentId(), depthmax=7, cap=4}={}) {
    names = {};
    familyTreeRecursive({callback:getAllFamilyNamesCallback, from:from, depthmax:depthmax, callbackEnd:function(){computeFamilyNamesToCsvFile(cap);}});
}

// from the current id
getAllFamilyNamesWithLinksAndColor({depthmax:8, cap:6})

