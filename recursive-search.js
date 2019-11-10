/**
 *   This function allows you to get information from your family tree, recursively
 */

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
 
function familyTreeRecursive({
    // public parameters
    // @param callback: function({depth, from, infolocal, fullinfo})
    // @param from: family search identifier XXXX-YYY
    // @param depthmax: maximal depth
    // @param callbackEnd: called at the end
    callback=function(){{depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}},
    from=getCurrentId(),
    depthmax=10,
    callbackEnd=function({visited=0, errors=0}){console.log("Default ended method");},
    // private parameters
    // @param depth: the current depth
    // @param currentChain: the current chain to the current 'from' (not included) [{id, name, nextisfather}]
    // @param currentalgo: shared parameters for the current process
    depth=0, currentChain=[],
    currentalgo={totaldone:0, currentmax:0, errors:0}}={}) {
    currentalgo.currentmax++;
    //console.log("After call:" + from + " " + objectId(currentalgo));
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
                        //console.log("In "+from+", parent " + i)
                        //console.log(fullinfo.data.parents[i]);
                        // new chain in order to tell we are in a father
                        var newChain = currentChain.slice(0);
                        newChain.push({id:from, name:infolocal.name, nextisfather:true});
                        var arguments = {callback:callback, depthmax:depthmax, callbackEnd:callbackEnd, currentChain:newChain, depth:depth+1, currentalgo:currentalgo};
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
                                var arguments = {callback:callback, depthmax:depthmax, callbackEnd:callbackEnd, currentChain:newChain, depth:depth+1, currentalgo:currentalgo};
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

// example of infolocal, comming from https://www.familysearch.org/tree-data/person/L62N-WQ4/card?&stillbornDataProblemEx=true&matchUsesTreeHintEx=true
/*{
	"birthlikeConclusion": {
		"contributor": {
			"date": "21 septembre 2014",
			"id": "MM1N-W6R",
			"name": null,
			"timestamp": "2014-09-21T16:29:27+00:00"
		},
		"details": {
			"detailsType": "EventDetails",
			"date": {
				"formalText": "+1866-11-30",
				"julianDateRange": {
					"earliestDay": 2402936,
					"latestDay": 2402936
				},
				"localizedText": "30 novembre 1866",
				"modifier": null,
				"normalizedText": "30 November 1866",
				"originalText": "30 Nov 1866"
			},
			"deceasedFlag": null,
			"description": null,
			"place": {
				"geoCode": {
					"latitude": 45.95359,
					"longitude": 1.67871
				},
				"id": 0,
				"localizedText": "Montboucher, Creuse, Limousin, France",
				"normalizedText": "Montboucher, Creuse, Limousin, France",
				"originalText": "Montboucher, Sargnat, Canton de Bourganeuf, CREUSE, France"
			},
			"sourceCount": 0,
			"title": "",
			"type": "BIRTH"
		},
		"id": "79622560-b979-4204-98bf-34e4f965d5b7",
		"justification": "GEDCOM data",
		"multiValued": false,
		"type": "BIRTH"
	},
	"deathlikeConclusion": {
		"contributor": {
			"date": "8 mai 2016",
			"id": "MM1N-W6R",
			"name": null,
			"timestamp": "2016-05-08T21:15:26+00:00"
		},
		"details": {
			"detailsType": "EventDetails",
			"date": {
				"formalText": "+1929",
				"julianDateRange": {
					"earliestDay": 2425613,
					"latestDay": 2425977
				},
				"localizedText": null,
				"modifier": null,
				"normalizedText": null,
				"originalText": "1929"
			},
			"deceasedFlag": null,
			"description": null,
			"place": null,
			"sourceCount": 0,
			"title": "",
			"type": "DEATH"
		},
		"id": "f1e514fe-d22c-45c0-ae4b-c14cb21b15a0",
		"justification": null,
		"multiValued": false,
		"type": "DEATH"
	},
	"deleted": false,
	"discussionCount": 0,
	"gender": "MALE",
	"id": "L62N-WQ4",
	"inPrivateSpace": false,
	"isLiving": false,
	"memoryCount": 11,
	"name": "François Gayaudon",
	"portraitUrl": "https://sg30p0.familysearch.org/service/memories/tps/stream/L62N-WQ4/thumb200s/ZjNmNDg2ZjItYmFjMi00YmNiLTliMTEtOGI0NWRmMTc3NmY1LXByb2Q",
	"readOnly": false,
	"skeleton": false,
	"sourceCount": 4,
	"spaceId": "MMMM-MMM"
}*/

// example of fullinfo, comming from https://www.familysearch.org/tree-data/family-members/person/L62N-WQ4
/*{
	"status": "OK",
	"statusText": null,
	"data": {
		"parents": [{
			"children": [{
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "MALE",
				"id": "L62N-WQ4",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1866–1929",
				"lifeSpanDates": "",
				"lifespanBegin": 2402936,
				"lifespanEnd": 2425977,
				"lineageConclusions": [],
				"living": false,
				"name": "François Gayaudon",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "François Gayaudon",
						"nameForms": [{
							"familyPart": "Gayaudon",
							"fullText": "François Gayaudon",
							"givenPart": "François",
							"lang": "x-Latn",
							"prefixPart": null,
							"script": "ROMAN",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": true,
				"readOnly": false,
				"relationshipId": "MTMG-6CJ",
				"sourceCount": 4,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			},
			{
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "MALE",
				"id": "LBQM-1Z3",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1868–Décédé(e)",
				"lifeSpanDates": "",
				"lifespanBegin": 2403333,
				"lifespanEnd": 0,
				"lineageConclusions": [],
				"living": false,
				"name": "Antoine GAYAUDON",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Antoine GAYAUDON",
						"nameForms": [{
							"familyPart": "GAYAUDON",
							"fullText": "Antoine GAYAUDON",
							"givenPart": "Antoine",
							"lang": "fr",
							"prefixPart": null,
							"script": "FRENCH",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"relationshipId": "9SC7-BY3",
				"sourceCount": 0,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			},
			{
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "FEMALE",
				"id": "LBQM-YVT",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1870–1870",
				"lifeSpanDates": "",
				"lifespanBegin": 2404064,
				"lifespanEnd": 2404428,
				"lineageConclusions": [],
				"living": false,
				"name": "Joséphine Gayaudon",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Joséphine Gayaudon",
						"nameForms": [{
							"familyPart": "Gayaudon",
							"fullText": "Joséphine Gayaudon",
							"givenPart": "Joséphine",
							"lang": "fr",
							"prefixPart": null,
							"script": "FRENCH",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"relationshipId": "9SC7-FXB",
				"sourceCount": 0,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			},
			{
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "MALE",
				"id": "LBQ9-95S",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1872–1935",
				"lifeSpanDates": "",
				"lifespanBegin": 2404794,
				"lifespanEnd": 2428168,
				"lineageConclusions": [],
				"living": false,
				"name": "Louis Paul GAYAUDON",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Louis Paul GAYAUDON",
						"nameForms": [{
							"familyPart": "GAYAUDON",
							"fullText": "Louis Paul GAYAUDON",
							"givenPart": "Louis Paul",
							"lang": "fr",
							"prefixPart": null,
							"script": "FRENCH",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"relationshipId": "9SC7-JJG",
				"sourceCount": 0,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			},
			{
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "FEMALE",
				"id": "LBQM-GGM",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1886–1945",
				"lifeSpanDates": "",
				"lifespanBegin": 2409908,
				"lifespanEnd": 2431821,
				"lineageConclusions": [],
				"living": false,
				"name": "Marie Emilie GAYAUDON",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Marie Emilie GAYAUDON",
						"nameForms": [{
							"familyPart": "GAYAUDON",
							"fullText": "Marie Emilie GAYAUDON",
							"givenPart": "Marie Emilie",
							"lang": "fr",
							"prefixPart": null,
							"script": "FRENCH",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"relationshipId": "9SC7-TWK",
				"sourceCount": 0,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			}],
			"coupleId": "L62J-ZY8_L2ZQ-DHZ",
			"current": true,
			"dismissedSuggestions": {
				"dataQualityList": null,
				"empty": true,
				"researchSuggestionList": null
			},
			"event": {
				"formalDate": "+1866-02-12",
				"originalDate": "12 février 1866",
				"originalPlace": "Montboucher, Creuse, Limousin, France",
				"placeId": 6829484,
				"standardDate": "12 février 1866",
				"standardPlace": "Montboucher, Creuse, Limousin, France",
				"type": "MARRIAGE"
			},
			"husband": {
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "MALE",
				"id": "L62J-ZY8",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1837–1899",
				"lifeSpanDates": "",
				"lifespanBegin": 2392357,
				"lifespanEnd": 2415007,
				"living": false,
				"name": "Pierre GAYAUDON",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Pierre GAYAUDON",
						"nameForms": [{
							"familyPart": "GAYAUDON",
							"fullText": "Pierre GAYAUDON",
							"givenPart": "Pierre",
							"lang": "und",
							"prefixPart": null,
							"script": "UNSPECIFIED",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"sourceCount": 3,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			},
			"relationshipId": "MN1J-C19",
			"suggestions": null,
			"wife": {
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "FEMALE",
				"id": "L2ZQ-DHZ",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1847–Décédé(e)",
				"lifeSpanDates": "",
				"lifespanBegin": 2395919,
				"lifespanEnd": 0,
				"living": false,
				"name": "Marie Faure",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Marie Faure",
						"nameForms": [{
							"familyPart": "Faure",
							"fullText": "Marie Faure",
							"givenPart": "Marie",
							"lang": "x-Latn",
							"prefixPart": null,
							"script": "ROMAN",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"sourceCount": 3,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			}
		}],
		"spouses": [{
			"children": [{
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "FEMALE",
				"id": "L51J-VFZ",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1896–1898",
				"lifeSpanDates": "",
				"lifespanBegin": 2413881,
				"lifespanEnd": 2414655,
				"lineageConclusions": [],
				"living": false,
				"name": "Renée Louise Gayaudon",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Renée Louise Gayaudon",
						"nameForms": [{
							"familyPart": "Gayaudon",
							"fullText": "Renée Louise Gayaudon",
							"givenPart": "Renée Louise",
							"lang": "und",
							"prefixPart": null,
							"script": "UNSPECIFIED",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"relationshipId": "MB6R-ZSK",
				"sourceCount": 2,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			},
			{
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "MALE",
				"id": "LJLG-NLK",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1898–1956",
				"lifeSpanDates": "",
				"lifespanBegin": 2414654,
				"lifespanEnd": 2435673,
				"lineageConclusions": [],
				"living": false,
				"name": "Marcel Louis Pierre GAYAUDON",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Marcel Louis Pierre GAYAUDON",
						"nameForms": [{
							"familyPart": "GAYAUDON",
							"fullText": "Marcel Louis Pierre GAYAUDON",
							"givenPart": "Marcel Louis Pierre",
							"lang": "und",
							"prefixPart": null,
							"script": "UNSPECIFIED",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"relationshipId": "MP41-2R1",
				"sourceCount": 2,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			},
			{
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "FEMALE",
				"id": "KPHK-N9X",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1903–1978",
				"lifeSpanDates": "",
				"lifespanBegin": 2416265,
				"lifespanEnd": 2443874,
				"lineageConclusions": [],
				"living": false,
				"name": "Marguerite, Berthe, Louise Gayaudon",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Marguerite, Berthe, Louise Gayaudon",
						"nameForms": [{
							"familyPart": "Gayaudon",
							"fullText": "Marguerite, Berthe, Louise Gayaudon",
							"givenPart": "Marguerite, Berthe, Louise",
							"lang": "und",
							"prefixPart": null,
							"script": "UNSPECIFIED",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"relationshipId": "MKY6-3RL",
				"sourceCount": 5,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			}],
			"coupleId": "L62N-WQ4_L62N-WW1",
			"current": true,
			"dismissedSuggestions": {
				"dataQualityList": null,
				"empty": true,
				"researchSuggestionList": null
			},
			"event": {
				"formalDate": "+1895-03-31",
				"originalDate": "31 mars 1895",
				"originalPlace": "Paris, Île-de-France, France",
				"placeId": 442102,
				"standardDate": "31 mars 1895",
				"standardPlace": "Paris, Île-de-France, France",
				"type": "MARRIAGE"
			},
			"husband": {
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "MALE",
				"id": "L62N-WQ4",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1866–1929",
				"lifeSpanDates": "",
				"lifespanBegin": 2402936,
				"lifespanEnd": 2425977,
				"living": false,
				"name": "François Gayaudon",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "François Gayaudon",
						"nameForms": [{
							"familyPart": "Gayaudon",
							"fullText": "François Gayaudon",
							"givenPart": "François",
							"lang": "x-Latn",
							"prefixPart": null,
							"script": "ROMAN",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": true,
				"readOnly": false,
				"sourceCount": 4,
				"spaceId": "MMMM-MMM",
				"suggestions": {
					"dataQualityList": [{
						"category": "DATA_QUALITY",
						"contextId": null,
						"entityId": "L62N-WQ4",
						"type": {
							"canBeDismissed": false,
							"category": "DATA_QUALITY",
							"context": "PERSON",
							"name": "MISSING_DEATH_DATE_STANDARD"
						}
					}],
					"empty": false,
					"researchSuggestionList": null
				}
			},
			"relationshipId": "MXZZ-6WW",
			"suggestions": {
				"dataQualityList": null,
				"empty": false,
				"researchSuggestionList": [{
					"category": "RESEARCH_SUGGESTION",
					"contextId": null,
					"entityId": "MXZZ-6WW",
					"type": {
						"canBeDismissed": true,
						"category": "RESEARCH_SUGGESTION",
						"context": "COUPLE",
						"name": "POSSIBLE_CHILD_GAP_AT_END"
					}
				},
				{
					"category": "RESEARCH_SUGGESTION",
					"contextId": null,
					"entityId": "MXZZ-6WW",
					"type": {
						"canBeDismissed": true,
						"category": "RESEARCH_SUGGESTION",
						"context": "COUPLE",
						"name": "POSSIBLE_CHILD_GAP_IN_MIDDLE"
					}
				}]
			},
			"wife": {
				"discussionCount": 0,
				"dismissedSuggestions": {
					"dataQualityList": null,
					"empty": true,
					"researchSuggestionList": null
				},
				"gender": "FEMALE",
				"id": "L62N-WW1",
				"inPrivateSpace": false,
				"isDeleted": false,
				"isLiving": false,
				"lifeSpan": "1871–1935",
				"lifeSpanDates": "",
				"lifespanBegin": 2404701,
				"lifespanEnd": 2428168,
				"living": false,
				"name": "Marie-Adèle CHAUNIER",
				"nameConclusion": {
					"contributor": null,
					"details": {
						"detailsType": "NameDetails",
						"fullText": "Marie-Adèle CHAUNIER",
						"nameForms": [{
							"familyPart": "CHAUNIER",
							"fullText": "Marie-Adèle CHAUNIER",
							"givenPart": "Marie-Adèle",
							"lang": "und",
							"prefixPart": null,
							"script": "UNSPECIFIED",
							"suffixPart": null
						}],
						"nameType": "",
						"preferredName": true,
						"sourceCount": 0,
						"style": "EUROTYPIC"
					},
					"id": null,
					"justification": "",
					"multiValued": false,
					"type": "NAME"
				},
				"noteCount": 0,
				"obsoleteIdWasRequested": false,
				"portraitUrl": null,
				"principlePerson": false,
				"readOnly": false,
				"sourceCount": 3,
				"spaceId": "MMMM-MMM",
				"suggestions": null
			}
		}]
	},
	"statuses": null
}*/