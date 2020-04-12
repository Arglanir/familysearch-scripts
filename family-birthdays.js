/** This script allows getting all descendants and close relatives from a common ancestor
Output: either a list of people (and their relationship with the ancestor) ordered by birthday.
Or a list of families, with relationships and birthdays.


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
function storeInfoAboutDescendant({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[], shareddata={persons:{}}}={}) {
    // id => {name, relationship, birth, death}
    var persons = shareddata.persons;

    if (persons[infolocal.id] && persons[infolocal.id] != "called") {
        // already fully analysed
        return "stop";
    }
    // compute a date
    var onedate = getDates(infolocal);
    // get real birthday
    var bdate = getBirthDate(infolocal);
    // death?
    var ddate = getDeathDate(infolocal);
    
    // what to display?
    var extrainfo = "";
    person = {name:infolocal.name, birth:bdate, death:ddate};
    person.male = infolocal.gender == "MALE";
    person.parents = [];

    if (fullinfo.data.spouses) {
        for (var i=0; i < fullinfo.data.spouses.length; i++) {
            var relationship = fullinfo.data.spouses[i];
            if (!relationship.current) continue;
            if (relationship.spouse1 && relationship.spouse1.id != infolocal.id) {
                person.spouse = relationship.spouse1.id;
            } else if (relationship.spouse2 && relationship.spouse2.id != infolocal.id) {
                person.spouse = relationship.spouse2.id;
            }
            var stillSpouse = true;
            if (person.spouse) {
                if (relationship.event && relationship.event.type) {
                    // FIXME: one day it may be a list, because here we only see the last event (it seems)...
                    if (relationship.event.type == "DIVORCE") {
                        //console.log("Divorce detected");
                        stillSpouse = false;
                    }
                }
            }
            person.stillSpouse = stillSpouse;
        }
    }
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
    persons[infolocal.id] = person;
    
    // call also on spouse and then his children
    if (fullinfo.data.spouses) {
        for (var i=0; i < fullinfo.data.spouses.length; i++) {
            if (fullinfo.data.spouses[i].children) {
                // FIXME: it seems that when there is no spouse, there is no children...
                for (var j=0; j < fullinfo.data.spouses[i].children.length; j++) {
                    var child = fullinfo.data.spouses[i].children[j];
                    if (!child || !child.id) continue;
                    if (persons[child.id]) continue; // do not analyse
                    persons[child.id] = "called";
                }
            }
            for (var sp in {spouse1:1, spouse2:2}) {
                if (!fullinfo.data.spouses[i] || !fullinfo.data.spouses[i][sp] || !fullinfo.data.spouses[i][sp].id) continue;
                if (fullinfo.data.spouses[i][sp].id == 'UNKNOWN') continue;
                var spid = fullinfo.data.spouses[i][sp].id;
                if (persons[spid]) continue; // do not analyse
                persons[spid] = "called";
                console.log(`Also calling for ${spid} ${fullinfo.data.spouses[i][sp].name}`);
                var newshareddata = {};
                Object.assign(newshareddata, shareddata);
                familyTreeGetDown({callback:storeInfoAboutDescendant, from:spid, depthmax:50, depth:depth, callbackEnd:displayListWhenFinished, shareddata:shareddata});
            }
        }
    }
    
    // display
    console.log(`${depth}: ${infolocal.name} https://www.familysearch.org/tree/person/details/${infolocal.id} ${bdate} ${ddate}`);
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

function displayListWhenFinished({shareddata={persons:{}}}={}) {
    var persons = shareddata.persons;
    var missingPeople = 0;
    for (var perid in persons) {
        if (persons[perid] == "called") {
            missingPeople += 1;
        }
    }
    console.log(`${missingPeople} missing people`);
    if (!missingPeople && !shareddata.finished) {
        shareddata.finished = true;
        window.persons = persons;
        
        var list = [];
        for (var id in persons) {
            var person = persons[id];
            person.id = id;
            list.push(person);
        }
        list.sort(function(first, second) {
            var ft = (first.birth || "").split('-');
            var st = (second.birth || "").split('-');
            if (ft.length == 1) {
                return -1;
            }
            if (st.length == 1) {
                return 1;
            }
            if (parseInt(st[1]) != parseInt(ft[1])) {
                return parseInt(ft[1]) - parseInt(st[1]);
            }
            if (ft.length == 2) {
                return -1;
            }
            if (st.length == 2) {
                return 1;
            }
            return parseInt(ft[2]) - parseInt(st[2]);
            
        });
        console.log(list);
        
        var todisplay = "<h3>Inconnu</h3>\n";
        var lastmonth = 0;
        var months = ["?", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
        for (var i = 0; i < list.length; i++) {
            person = list[i];
            var t = person.birth.split('-');
            var month = t.length >= 2 ? parseInt(t[1]) : 0;
            if (month != lastmonth) {
                todisplay += `<h3>${months[month]}</h3>\n`;
                lastmonth = month;
            }
            todisplay += `<a name="${person.id}"> </a>${person.name} (${person.birth.substr(1)}${person.death!='?'?' - ' + person.death.substr(1) + ' &#9829;' :''})`;
            if (person.spouse && persons[person.spouse]) {
                todisplay += ', ';
                if (person.id != persons[person.spouse].spouse || !person.stillSpouse) {
                    todisplay += 'ex-';
                }
                todisplay += (person.male ? "chéri de " : "chérie de ") +
                '<a href="#' + person.spouse + '">' + persons[person.spouse].name + '</a>';
            }
            if (person.parents) {
                var parentsKnown = person.parents.length > 0;
                for (var pi = 0; pi < person.parents.length; pi++) {
                    parentid = person.parents[pi];
                    if (!persons[parentid]) {
                        parentsKnown = false;
                        break;
                    }
                }
                if (parentsKnown) {
                    todisplay += (person.male ? ", fils de " : ", fille de ");
                    for (var pi = 0; pi < person.parents.length; pi++) {
                        if (pi > 0) {
                            if (pi == person.parents.length - 1) {
                                todisplay += " et ";
                            } else {
                                todisplay += ", ";
                                
                            }
                        }
                        parentid = person.parents[pi];
                        todisplay += '<a href="#' + parentid + '">' + persons[parentid].name + '</a>';
                    }
                }
            }
            todisplay += "<br/>\r\n";
        }
        
        download("anniversaires.html", '<html><head><meta charset="UTF-8"><title>Anniversaires</title></head><body>' + todisplay + "</body></html>");
        
        console.log("Finished!");
    }
}
/**
 *  Main method for this script
 */
function getFamilyList({from=getCurrentId(), depthmax=50}={}) {
    // reset
    var persons = {};
    // call
    familyTreeGetDown({callback:storeInfoAboutDescendant, from:from, depthmax:depthmax, callbackEnd:displayListWhenFinished, shareddata:{persons:persons}});
}
getFamilyList();