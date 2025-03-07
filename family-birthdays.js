/** This script allows getting all descendants and close relatives from a common ancestor
Output: either a list of people (and their relationship with the ancestor) ordered by birthday.
Or a list of families, with relationships and birthdays.


*/

/**
 *  Callback for familyTreeRecursive to store people
 */
function storeInfoAboutPerson({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[], shareddata={persons:{}}}={}) {
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
    person = {name:infolocal.name, birth:bdate, death:ddate, depth:depth};
    person.male = infolocal.gender == "MALE";
    person.parents = [];

    if (fullinfo.spouses) {
        for (var i=0; i < fullinfo.spouses.length; i++) {
            var relationship = fullinfo.spouses[i];
            if (!relationship.preferred) continue;
            if (relationship.parent1 && relationship.parent1.id != infolocal.id) {
                person.spouse = relationship.parent1.id;
            } else if (relationship.parent2 && relationship.parent2.id != infolocal.id) {
                person.spouse = relationship.parent2.id;
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
    if (fullinfo.parents) {
        for (var i=0; i < fullinfo.parents.length; i++) {
            var relationship = fullinfo.parents[i];
            if (relationship.parent1 && relationship.parent1.id) {
                person.parents.push(relationship.parent1.id);
            }
            if (relationship.parent2 && relationship.parent2.id != infolocal.id) {
                person.parents.push(relationship.parent2.id);
            }
        }
    }
    persons[infolocal.id] = person;
    
    // call also on parents: not needed, done by familyTreeRecursive
    
    // display
    console.log(`${depth}: ${infolocal.name} https://www.familysearch.org/tree/person/details/${infolocal.id} ${bdate} ${ddate}`);
}

/**
 *  Callback for familyTreeGetDown keep track of down lines
 */
function storeInfoAboutDescendant({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[], shareddata={persons:{}}}={}) {
    // id => {name, relationship, birth, death}
    var persons = shareddata.persons;
    
    var returned = storeInfoAboutPerson({depth:depth, from:from, infolocal:infolocal, fullinfo:fullinfo, chain:chain, shareddata:shareddata});
    if (returned == "stop") return returned;
    
    // call also on spouse and then his children
    if (fullinfo.spouses) {
        for (var i=0; i < fullinfo.spouses.length; i++) {
            if (fullinfo.spouses[i].children) {
                // FIXME: it seems that when there is no spouse, there is no children...
                for (var j=0; j < fullinfo.spouses[i].children.length; j++) {
                    var child = fullinfo.spouses[i].children[j];
                    if (!child || !child.id) continue;
                    if (persons[child.id]) continue; // do not analyse
                    persons[child.id] = "called";
                }
            }
            for (var sp in {parent1:1, parent2:2}) {
                if (!fullinfo.spouses[i] || !fullinfo.spouses[i][sp] || !fullinfo.spouses[i][sp].id) continue;
                if (fullinfo.spouses[i][sp].id == 'UNKNOWN') continue;
                var spid = fullinfo.spouses[i][sp].id;
                if (persons[spid]) continue; // do not analyse
                persons[spid] = "called";
                console.log(`Also calling for ${spid} ${fullinfo.spouses[i][sp].name}`);
                var newshareddata = {};
                Object.assign(newshareddata, shareddata);
                familyTreeGetDown({callback:storeInfoAboutDescendant, from:spid, depthmax:50, depth:depth, callbackEnd:displayListWhenFinished, shareddata:shareddata});
            }
        }
    }
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
        var months = ["?", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        var data_for_multiple = "";
        for (var i = 0; i < list.length; i++) {
            person = list[i];
            if (person.birth != "?") {
                data_for_multiple += person.birth.replace('+','') + " " + person.name + "\n";
            }
            var t = person.birth.split('-');
            var month = t.length >= 2 ? parseInt(t[1]) : 0;
            if (month != lastmonth) {
                todisplay += `<h3 id="month-${month}">${months[month]}</h3>\n`;
                lastmonth = month;
            }
            todisplay += "<span class=\"anniv-" + (t.length >= 2 ? t[2]+"-"+t[1] : "") + "\">"
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
            todisplay += "</span><br/>\r\n";
        }
        
        var filename = shareddata.filename || "anniversaires.html";
        
        download("anniversaires.html", 
            '<!doctype html><html>\n' +
            '<!-- Généré le ' + new Date() + '-->\n' +
            '<head><meta charset="UTF-8"><title>Anniversaires</title></head><body>\n' +
            todisplay +
            "</body>" +
            `<script type="text/javascript">
var style = document.createElement('style');
style.type = 'text/css';
var today = new Date();
// display something on someone's birthday
var classname = 'anniv-' + ("0"+today.getDate()).slice(-2) + "-" + ("0"+(today.getMonth() + 1)).slice(-2);
style.innerHTML = '.'+classname+' { background-color: #FF0; } .'+classname+'::before { content: "\\\\1F973 "; } .'+classname+'::after { content: " \\\\1f389"; } ';
document.getElementsByTagName('head')[0].appendChild(style);
var annivlink = document.createElement('a');
annivlink.href = "https://arglanir.github.io/anniversaires_systeme_solaire_multiples.html?d=` + encodeURI(data_for_multiple) + `";
annivlink.innerHTML = "<hr/><b>Dans le système solaire...</b>";
document.body.appendChild(annivlink);
// scroll month to view
setTimeout(function() {document.getElementById('month-' + (today.getMonth() + 1)).scrollIntoView();}, 500);
</script>`+
            "</html>");
        
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
function getKoreanFamilyList({from=getCurrentId(), depthmax=15}={}) {
    // reset
    var persons = {};
    // call
    familyTreeRecursive({callback:storeInfoAboutPerson, from:from, depthmax:depthmax, callbackEnd:displayListWhenFinished, shareddata:{persons:persons, filename:"anniversaires_coreens.html"}});
}

//getFamilyList();
getKoreanFamilyList();