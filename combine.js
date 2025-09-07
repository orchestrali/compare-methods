//bell places
const places = "1234567890ETABCD";
//holds stages.json; stage number and name and classes within
var stages;
//sorted list of method names
var methodNameList;
//full method collection
var bigmethodarr;
//holder for jquery/svg functions
var svg;

var searches = {
  stage1: null,
  stage2: null,
  lookup1: "name",
  lookup2: "name"
};

//set of method names matching selected stage and class
let methodList;

//form submission
var queryobj;
var query1, query2;

var method = [];
var rowArray;

$(function() {
  console.log("also tricky!");
  getlists();
  $("#container").svg({onLoad: (o) => {
    svg = o;
    svg.configure({xmlns: "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink", width: 0, height: 0});
  }});

  //nav toggle
  $("#nav-options").click(function() {
    $("#nav-options ul").slideToggle(600, "swing");
    $(".arrow").toggleClass("rotate");
  });

  $(".stage").change(stagechange);

  $(".lookupstrat").change(changestrategy);
  
  $(".placeNotation").on("keyup", pnkeyup);

  $('.methodClass').change(classchange);
  $(".methodName").click(methodnameclick);
  //when a method in the dropdown list is clicked on, make it the methodName value and hide the list
  $(".methodList").on("click", "li", function(e) {
    //console.log('method clicked 1');
    let list = $(this).parent().attr("id");
    let which = list.slice(list.length-1);
    $("#methodName"+which).val($(this).text());
    $("#methodList"+which+" li").hide();
    $(this).siblings().detach();
    e.stopPropagation();
  });
  $(".methodName").on("keyup", methodnamekeyup);

  $("#submit").on("click", submitform);
});


// INITIAL SETUP

function getlists() {
  $.get("stages.json", function(body) {
    stages = body;
    
    $.get("methodNames.json", function(list) {
      methodNameList = list;
      
      $.get("methods.json", function(arr) {
        bigmethodarr = arr;
        console.log("lists retrieved");
      });
      
    });
  });
}

// FORM ADJUSTMENTS - METHOD INFO

function stagechange(e) {
  let id = this.id;
  let which = this.id.slice(5);
  searches[id] = Number($('select#stage'+which).val());
  //console.log("stage: ", searches);
  searches["checkedClass"+which] = "";

  let lookup = searches["lookup"+which];
  $("div#searchby"+lookup+which).find(":input").prop("disabled", searches[id] === null);

  //remove methods from name dropdown
  $('ul#methodList'+which).children().detach();
  $("#methodName"+which).val("");

  //now getting classes immediately from stages file
  let classes = stages.find(o => o.num === searches[id]).classes.filter(c => !["Differential","Principle"].includes(c));

  $('select#methodClass'+which).children().detach();
  $('<option></option>').prop({disabled: true, selected: true}).appendTo('select#methodClass'+which);
  $('<option></option').text("Plain").val("Plain").appendTo("select#methodClass"+which);
  for (var i = 0; i < classes.length; ++i) {
    let text;
    if (["Bob", "Place"].includes(classes[i])) {
      text = "- " + classes[i];
    } else {
      text = classes[i];
    }
    //console.log(classes[i]);
    $('<option></option>').text(text).val(classes[i]).appendTo('select#methodClass'+which);
  }
  
  //if the placeholder and class are blank, set the placeholder
  if ($("#methodName"+which).prop("placeholder") == "" && $("select#methodClass"+which+" option:checked").text() == "") {
    $("#methodName"+which).prop("placeholder", "Select a stage and class to search methods");
  }
}


//switch between method name or pn
function changestrategy() {
  let id = this.id;
  let num = id.slice(6);
  let prev = searches[id]+num;
  searches[id] = $("#"+id+" input:checked").val();
  let current = searches[id]+num;
  
  $("div.searchstrategy"+num).find(":input").prop("disabled", true);
  $("div#searchby"+current).find(":input").prop("disabled", searches["stage"+num] === null);

  $("div#searchby"+prev).addClass("hidden");
  $("div#searchby"+current).removeClass("hidden");
  //$("div#searchby"+prev).slideUp(600, () => {
  //  $("div#searchby"+lookup).slideDown(600);
  //});
}


function pnkeyup() {
  let id = this.id;
  let num = id.slice(id.length-1);
  $("#pnerrors"+num).text("");
  let allowed = ".,x-&+";
  let errs = [];
  let val = $(this).val();
  let chars = $(this).val().split("").map(c => {
    if ("etabcd".includes(c)) {
      return c.toUpperCase();
    } else if (c === "X") {
      return "x";
    } else {
      return c;
    }
  });
  let stage = searches["stage"+num];

  //stage needs to be specified
  if (!stage) {
    //shouldn't be possible
    errs.push("make sure to select a stage!");
  } else {
    allowed += places.slice(0,stage);
  }
  //unrecognized character, includes places outside stage
  if (chars.find(c => !allowed.includes(c))) {
    errs.push("unrecognized character in place notation");
  }
  //no x or - on odd stages
  let cross = chars.includes("x") ? "x" : chars.includes("-") ? "-" : null;
  if (stage%2 === 1 && cross) {
    errs.push(cross + " not allowed on odd stages");
  }
  //consecutive x or - okay but no other consecutives
  let pairs = chars.slice(0, chars.length-1);
  for (let i = 0; i < pairs.length; i++) {
    pairs[i] += chars[i+1];
  }
  let filter = pairs.filter(p => p[0] === p[1] && !["x","-"].includes(p[0]));
  if (filter.length) {
    errs.push("repeated "+filter[0][0]+" not allowed");
  }
  //first character can't be , or .
  if ([",","."].includes(chars[0])) {
    errs.push("can't begin with "+chars[0]);
  }

  if (errs.length) {
    //display them
    errs.forEach(e => {
      $("#pnerrors"+num).append(`<p>${e}</p>`);
    });
  } else {
    let res = pnlexer(chars.join(""));
    //shouldn't be any errors...
    let next = pnNumJoin(res[1]);
    if (next[0]) {
    //display errors
      $("#pnerrors"+num).append(`<p>${next[0]}</p>`);
    }
  }
  
}

function classchange() {
  let id = this.id;
  let num = id.slice(id.length-1);
  let cc = $('select#methodClass'+num+' option:checked').val();
  searches["checkedClass"+num] = cc;
  let stage = searches["stage"+num];
  //remove methods from dropdown
  $('ul#methodList'+num).children().detach();

  //if there's a stage make the search placeholder blank
  if (stage) {
    $("#methodName"+num).prop("placeholder", "");
    searches["methodList"+num] = methodNames(stage, cc);
  }

  $("#methodName"+num).val("");
  //toggleHunts();
}


function hidenamelist(n) {
  $(document.body).on('click.menuHide', function(){
    var $body = $(this);
    $("#methodList"+n+" li").hide();
    $body.off('click.menuHide');
  });
}

function searchWarning(n) {
  $('<li id="warning'+n+'"></li>').text("Select a stage and class to search methods").css("display", "list-item").appendTo($("#methodList"+n));
}


function methodnameclick(e) {
  let id = this.id;
  let num = id.slice(id.length-1);
  //body click causes methodList to be hidden
  hidenamelist(num);

  let stage = searches["stage"+num];
  let cc = searches["checkedClass"+num];
  
  //don't trigger body click
  e.stopPropagation();
  
  //check if stage and class are selected and display warning if either isn't
  if (stage == "" || cc == "") {
    if ($('li#warning'+num).length == 0) {
      searchWarning(num);
    } else if ($('li#warning'+num).length == 1) {
      $('li#warning'+num).css("display", "list-item");
    }
  }
  
  $("#methodList"+num+" li").css("display", "list-item");
}

function checkname(name, val) {
  let names = [name];
  let vals = [val];
  
  if (/[^a-z\s0-9]/.test(name)) {
    let altname = respell(name);
    if (altname != name) names.push(altname);
    names.forEach(n => {
      if (n.includes("'")) {
        
      }
    });
  }
  
  if (/[^a-z\s0-9]/.test(val)) {
    let altval = respell(val);
    if (altval != val) vals.push(altval);
  }
  
  
  let res = false;
  let i = 0, j = 0;
  do {
    res = names[i].indexOf(vals[j]) > -1;
    j++;
    if (j === vals.length) {
      j = 0;
      i++;
    }
  } while (!res && (i < names.length-1 || (i === names.length-1 && j < vals.length)));
  
  return res;
}

function respell(name) {
  //'.()!-?&,£="/₃₁²™
  //éèëøůáčöåòùûàóìäúñṟāêæâîü
  let lstr = "áàäâāåčçéèëêēe̊íìïîīñóòöôōo̊øṟřšśúùüûūů";
  let letters = {
    a: "áàäâāå",
    //ae: "æ",
    c: "čç",
    e: "éèëêēe̊",
    i: "íìïîī",
    n: "ñ",
    o: "óòöôōo̊ø",
    r: "ṟř",
    s: "šś",
    u: "úùüûūů"
  };
  let alt = "";
  for (let i = 0; i < name.length; i++) {
    if (lstr.indexOf(name[i]) > -1) {
      let l = Object.keys(letters).find(c => letters[c].indexOf(name[i]) > -1);
      alt += l;
    } else {
      alt += name[i];
    }
  }
  return alt;
}

//build filtered methodSet
function getMethods(methods, howMany) {
  let n = 0;
  let methodSet = [];
  do {
    let methodNum = Math.floor(Math.random() * (methods.length));
    methodSet.push(methods[methodNum]);
    methods.splice(methodNum, 1);
    n++
  } while (n < howMany && methods.length > 0)
    return methodSet;
}

//build the list items
function buildList(methods, display, n) {
  for (var j = 0; j < methods.length; j++) {
    $('<li></li>').text(methods[j]).css("display", display).appendTo($("#methodList"+n));
  }
}

function filterList(value,n) {
  //console.log("filtering items");
  $("#methodList"+n+" li").filter(function() {
    let text = $(this).text().toLowerCase();
    
    $(this).toggle(checkname(text, value));
  });
}

function removeItems(value,n) {
  //console.log('removing items');
  $("#methodList"+n+" li").filter(function() {
    let text = $(this).text().toLowerCase();
    return (!checkname(text, value));
  }).remove();
  $("#methodList"+n+" li").css("display", "list-item");
}

//search json methodNames file, returns array of arrays with methods
function methodNames(stage, checkedClass) {
  
  if (checkedClass == "Plain") {
    var plainClasses = ["Bob", "Place"];
    let classMethods = [];
    for (var i = 0; i < plainClasses.length; i++) {

      let methods = methodNameList.find(o => o.stage == stage).classes.find(o => o.class == plainClasses[i]).methods;
      for (var j = 0; j < methods.length; j++) {
        classMethods.push(methods[j]);
      }
    }
    //console.log("length of classMethods", classMethods.length);
    return classMethods;
  } else {
    let classMethods = methodNameList.find(o => o.stage == stage).classes.find(o => o.class == checkedClass).methods;
  //console.log("length of classMethods", classMethods.length);
    return classMethods;
  }
  
}

function methodnamekeyup(event) {
  let id = this.id;
  let num = id.slice(id.length-1);
  
  hidenamelist(num);
  
  let stage = searches["stage"+num];
  let cc = searches["checkedClass"+num];
  let methodList = searches["methodList"+num];
  
  //value = whatever's been typed
  let value = $(this).val().toLowerCase();
  let altval = respell(value);
  //warn people to pick stage and class if they haven't
  if (stage == "" || cc == "") {
    if ($('li#warning'+num).length == 0) {
      searchWarning(num);
    } else if ($('li#warning'+num).length == 1) {
      $('li#warning'+num).css("display", "list-item");
    }
  } else if (/^[^\s]/.test(value)) {
    
    let stageName = getStageName(stage);
    
    //calculate number of methods in the class
    let numArrays = methodList.length;
    let numMethods = 0;
    for (var i = 0; i < numArrays; ++i) {
      numMethods += methodList[i].length;
    }
    
    //remove the message to pick stage and class
    $("li#warning"+num).remove();
    //remove message about unrecognized character
    $("li#badChar"+num).remove();
    //remove message about no methods
    $("li#noMethods"+num).remove();
    
    let methods = [];
    let numMatch = 0;
    //if there are fewer than 16 methods, add all to an array
    if (numMethods < 16) {
      for (var j = 0; j < numMethods; j++) {
        //chop off the stage name
        let text = methodList[0][j].substring(0,methodList[0][j].length-1-stageName.length);
        methods.push(text);
        if (checkname(text.toLowerCase(), value)) {
          numMatch++;
        }
      }
    } else {
      //if there are ≥16 methods, make an array of those that match search
      for (var j = 0; j < numArrays; ++j) {
        for (var k = 0; k < methodList[j].length; ++k) {
          let method = methodList[j][k].substring(0,methodList[j][k].length-1-stageName.length);
          if (checkname(method.toLowerCase(), value)) {
            methods.push(method);
            numMatch++;
          }
        }
      }
    }
    
    //if no methods match, say so
    if (numMatch == 0) {
      $("#methodList"+num+" li").remove();
      $('<li id="noMethods'+num+'"></li>').text("no methods match search").css("display", "list-item").appendTo($("#methodList"+num));
    } else {
      //if some methods match search
      
      //if nothing's been added to the methodList yet
      if ($("#methodList"+num+" li").length == 0) {

        //if there are fewer than 16 methods, just add all of them
        if (numMethods < 16) {
          buildList(methods, "none", num);
          //apply the filter next
          filterList(value, num);
        } else {
          //if there are <16 methods that match, display them all
          if (methods.length < 16) {
            buildList(methods, "list-item", num);
          } else {
            let methodSet = [];
            let numMethods = 15;
            //if there are 16 or more methods, add 15 at random to a different array and display those
            if (methods.indexOf("Little Bob") > -1) {
              methodSet.push("Little Bob");
              methods.splice(methods.indexOf("Little Bob"), 1);
              numMethods -= 1;
            }
            methodSet = methodSet.concat(getMethods(methods, numMethods));
            buildList(methodSet, "list-item", num);
          }
        } 
      } else {
        //if there IS a methodList already
        //var methods will already be updated with new search, if there were ≥ 16 in class
        //check how many current items match the new search
        let currentMatch = [];
        for (let i = 1; i <= $("#methodList"+num+" li").length; i++) {
          let text = $("#methodList"+num+" li:nth-child("+ i + ")").text();
          if (checkname(text.toLowerCase(), value)) {
            currentMatch.push(text);
          }
        }
        
        //console.log('methods that still match search:', currentMatch)
        //if fewer than 15 current methods match the new search, remove the ones that don't match and add new
        if (currentMatch.length < 15) {
          removeItems(value, num);
          //console.log("method array length 1", methods.length);
          //remove the current list items from the method array
          for (let i = 0; i < currentMatch.length; ++i) {
            let index = methods.indexOf(currentMatch[i]);
            //console.log("removing " + methods[index]);
            methods.splice(index, 1);

          }
          //console.log("method array length 2", methods.length);
          //get new methods from the pruned array
          let methodSet = getMethods(methods, 15-currentMatch.length);
          //console.log(methodSet);
          buildList(methodSet, "list-item", num);

        } else {
          $("#methodList"+num+" li").css("display", "list-item");
        }
        
      }
      //end of something
      
      //down arrow
      if (event.which == 40) {
        //console.log($("#methodList li.selected"));
        if ($("#methodList"+num+" li.selected")[0]) {
          //console.log($("#methodList li.selected").next());
          $("#methodList"+num+" li.selected").nextAll().filter(function (index) {
            return $(this).css("display") == "list-item";
          }).first().addClass("selected");

          $("#methodList"+num+" li.selected:first").removeClass("selected"); 
        } else {
          $("#methodList"+num+" li").filter(function (index) {
            return $(this).css("display") == "list-item";
          }).first().addClass("selected");
        }
        //up arrow
      } else if (event.which == 38) {
        if ($("#methodList"+num+" li.selected")[0]) {
          $("#methodList"+num+" li.selected").prevAll().filter(function (index) {
            return $(this).css("display") == "list-item";
          }).last().addClass("selected");
          $("#methodList"+num+" li.selected:last").removeClass("selected"); 
        }
        //enter key
      } else if (event.which == 13) {
        $("#methodName"+num).val($("li.selected").text());

        $("#methodList"+num+" li").hide();
      }
      
    }
    
  } else { // methodName value starts with whitespace char
    $("#methodList"+num+" li").remove(); 
  }
  
}


// BASIC SUBMIT

//click submit
function submitform() {
  $(".results").remove();
  method = [];
  rowArray = [];
  let form = document.getElementById("formform");
  let data = new FormData(form);
  queryobj = {quantity: "onelead"};
  query1 = {};
  query2 = {};
  let keys1 = ["stage1","lookup1","methodClass1","methodName1","placeNotation1"];
  let keys2 = ["stage2","lookup2","methodClass2","methodName2","placeNotation2"];

  for (let key of data.entries()) {
    let i1 = keys1.indexOf(key[0]);
    let i2 = keys2.indexOf(key[0]);
    if (i1 > -1) {
      query1[key[0].slice(0,-1)] = i1 === 0 ? Number(key[1]) : key[1];
    } else if (i2 > -1) {
      query2[key[0].slice(0,-1)] = i1 === 0 ? Number(key[1]) : key[1];
    } else {
      queryobj[key[0]] = key[1];
    }
    
  }

  if (((query1.methodClass && query1.methodName) || query1.placeNotation) && ((query2.methodClass && query2.methodName) || query2.placeNotation)) {
    queryobj.method1 = query1;
    queryobj.method2 = query2;
    resultsrouter(query1, query2);
  }
  
}


function resultsrouter(q1, q2) {
  //console.log(obj);
  $("#container").contents().remove();
  //get row array
  let titles = [];
  //different process for method name or place notation
  [q1, q2].forEach(obj => {
    switch (obj.lookup) {
      case "name":
        titles.push(routermethod(obj));
        break;
      case "pn":
        titles.push(routerpn(obj));
        break;
    }
  });
  
  
  //do stuff with it
  
  
  if (titles[0] && titles[1]) {
    let huntb = method[0].hunts[0];
    if (method[0].hunts.length === 1 && method[1].hunts.length === 1 && huntb === method[1].hunts[0]) {
      //do the stuff here!!!
      let huntpp = [];
      let pp;
      let pns = [];
      for (let i = 0; i < 2; i++) {
        pp = bellplaces(rowArray[i].map(o => o.bells), huntb);
        huntpp.push(rowstring(pp));
        pns.push(method[i].plainPN);
      }
      if (huntpp[0] === huntpp[1]) {
        //continue doing stuff
        //console.log(pp);
        if ($('input[name="methodabove"]').val() === "two") pns.reverse();
        let combined = combinepn(pns[0], pns[1], pp);
        $("#container").append(`<h4>Success?</h4>`);
        console.log(combined);
        let m = findbypn(combined, Math.max(method[0].stage, method[1].stage));
        if (m) console.log(m.name);
      } else {
        let text = "hunt paths don't match";
        $("#container").append(`<h4>${text}</h4>`);
      }
      
    } else {
      let text = "hunt bells don't match";
      $("#container").append(`<h4>${text}</h4>`);
    }
    
    
    
    
  } else {
    let text = "problem with method or place notation";
      //obj.lookup === "name" ? "Method not found" : "Problem with place notation";
    $("#container").append(`<h4>${text}</h4>`);
  }
}

function routermethod(obj) {
  let m = findmethod(obj);
  let title;
  if (m) {
    
    title = m.name; //+ " - plain course";
    method.push(m);
    buildrowarr(method.length-1);
  }
  return title;
}


function routerpn(obj) {
  let res = parsePN(obj.placeNotation, obj.stage);
  let title;
  //console.log(res);
  if (res[0]) {
    //error
  } else {
    let pn = res[1];
    let m = findbypn(pn, obj.stage);
    if (m) {
      method.push(m);
      title = method.name;
    } else {
      method.push({
        stage: obj.stage,
        leadLength: pn.length,
        plainPN: pn,
        hunts: findhunts(pn, obj.stage)
      });
      title = obj.placeNotation;
    }
    let i = method.length-1;
    buildrowarr(i);
  }
  return title;
}

//get more method info
//methods json file: stage, name (title), plain, class, leadLength, leadHeadCode, hunts, pbOrder, plainPN
//stage, methodClass, methodName
function findmethod(obj) {
  let stagename = getStageName(obj.stage);
  let title = obj.methodName + " " + stagename;
  let method = bigmethodarr.find(o => o.name === title);
  return method;
}

//build row array
function buildrowarr(i) {
  let m = method[i];
  rowArray[i] = buildRows(rounds(m.stage), m.plainPN, 1);
  rowArray[i].unshift({rowNum: 0, bells: rounds(m.stage)});
}


// **** BELLRINGING FUNCTIONS ****

//given stage number, get its name
function getStageName(stage) {
  var stageName = stages.find(o => o.num == stage).name;
  //console.log("stage", stage);
  return stageName;
}

//build rounds
function rounds(numBells) {
  let rowZero = [];
  
  for (let i = 0; i < numBells; ++i) {
    rowZero.push(i+1);
  }
  return rowZero;
}

//convert row array to string
function rowstring(row) {
  let str = row.map(n => places[n-1]).join("");
  return str;
}


//categorize tokens in supposed place notation
function pnlexer(pn, pnstage) {
  let stagepp = places.slice(0,pnstage);
  let tokens = [];
  let err;
  
  for (let i = 0; i < pn.length; i++) {
    let token = {
      value: pn[i]
    };
    switch (pn[i]) {
      case "&": case ",": case "+":
        token.type = "grouping token";
        break;
      case ".":
        token.type = "separator";
        break;
      case "x": case "-":
        token.type = "all change";
        break;
      default:
        if (stagepp.includes(pn[i])) token.type = "number";
    }
    if (token.type) {
      tokens.push(token);
    } else {
      err = "invalid character";
    }
  }
  
  return [err, tokens];
}

function pnNumJoin(tokens) {
  let arrnj = [];
  let prevtype = "all change";
  let prev = "x";
  let err;

  //add tokens except separator to new array; if consecutive numbers combine them
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i].type;
    if (t === "number" && prevtype === "number") {
      let diff = places.indexOf(tokens[i].value) - places.indexOf(prev);
      if (arrnj[arrnj.length-1].value.includes(tokens[i].value)) {
        err = "repeated place????";
      } else if (places.indexOf(tokens[i].value) < places.indexOf(prev)) {
        err = "numbers out of order";
      } else if (diff > 2 && diff%2 === 0) {
        err = "missing internal place?";
      }
      arrnj[arrnj.length-1].value += tokens[i].value;
      prev = tokens[i].value;
    } else if (t === "separator") {
      prevtype = "separator";
      prev = ".";
    } else {
      arrnj.push(tokens[i]);
      prevtype = t;
      prev = tokens[i].value;
    }
  }

  return [err, arrnj];
}

function pnNumAbbr(tokens, pnstage) {
  //do stuff with the objects of type 'number'
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i];
    if (t.type === "number") {
      //turn value string into array of characters, convert strings in array to numbers
      let numArr = t.value.split("").map(n => places.indexOf(n)+1);

      //odd AND even bell methods:
        //if the value begins with an even number, add 1 to beginning
      if (numArr[0] % 2 === 0) {
        numArr.unshift(1);
      }
        //if consecutive places only have one place between, add that place
      if (numArr.length > 1) {
        for (let j = numArr.length-2; j > -1; j--) {
          if (numArr[j+1] - numArr[j] === 2) {
            numArr.splice(j+1, 0, numArr[j]+1);
          }
        }
      }
      
      //if the value ends with the opposite quality from the stage, add stage to end
      if (stage%2 != numArr[numArr.length-1] % 2) {
        numArr.push(pnstage);
      }
      t.value = numArr;
    }
  }
}


function pngrouping(tokens) {
  let groupingString = tokens.filter(t => t.type === "grouping token").map(t => t.value).join("");

  if (!["","+"].includes(groupingString)) {
    let groupingTokens = [];
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "grouping token") {
        groupingTokens.push({index: i, token: tokens[i].value});
      }
    }
    let mirrorStart;
    let mirrorEnd = 0;
    let insertIndex;
    let numToReplace;
    let toBeReversed;
    switch (groupingString) {
      case ",":
        let greater = groupingTokens[0].index > 1;

        mirrorStart = greater ? 0 : 2;
        mirrorEnd = greater ? groupingTokens[0].index-1 : tokens.length-1;
        insertIndex = greater ? groupingTokens[0].index+1 : tokens.length;
        break;
      case "&,": case "&,+":
        mirrorStart = groupingTokens[0].index+1;
        mirrorEnd = groupingTokens[1].index-1;
        insertIndex = mirrorEnd+2;
        break;
      case "+,": case "+,&":
        let j = groupingString === "+," ? 1 : 2;
        mirrorStart = groupingTokens[j].index+1;
        mirrorEnd = tokens.length - 1;
        insertIndex = tokens.length;
        break;
    }

    if (mirrorEnd === 0) {
      toBeReversed = tokens.slice(mirrorStart);
    } else {
      toBeReversed = tokens.slice(mirrorStart, mirrorEnd);
    }

    toBeReversed.reverse();

    for (let j = 0; j < toBeReversed.length; j++) {
      tokens.splice(insertIndex+j, 0, toBeReversed[j]);
    }
  }
}

function parsePN(pn, pnstage) {
  let res = pnlexer(pn, pnstage);

  if (res[0]) {
    return res;
  } else {
    res = pnNumJoin(res[1]);
    if (res[0]) {
      return res;
    } else {
      let tokens = res[1];
      pnNumAbbr(tokens, pnstage);
      pngrouping(tokens);
      return [null, tokens.filter(t => t.type !== "grouping token").map(t => t.value)];
    }
  }
}

//take my processed pn and make a string
function pnstring(pn) {
  let str = "";
  let nums;
  pn.forEach(e => {
    if (e === "x") {
      str += "-";
      nums = false;
    } else {
      if (nums) str += ".";
      str += rowstring(e);
      nums = true;
    }
  });
  return str;
}

function findbypn(pn, pnstage) {
  let pnstr = pnstring(pn);
  let possible = bigmethodarr.filter(m => m.stage === pnstage && m.leadLength === pn.length);
  let match = possible.find(m => pnstring(m.plainPN) === pnstr);
  return match;
}


//build a portion of method
//given a starting row, place notation, and the number of the first row to create, create an array of rows
function buildRows(prevRow, placeNotArray, rowNum) {
  let arrayRows = [];
  let numBells = prevRow.length;
  
  //loop through place notation
  for (let i = 0; i < placeNotArray.length; ++i) {
    let row = {};
    row.rowNum = i + rowNum;
    row.bells = [];
    let direction = 1;
    
    //build one row
    for (let p = 0; p < numBells; ++p) {
      if (placeNotArray[i].indexOf(p+1) >= 0) {
        row.bells.push(prevRow[p]);
      } else {
        row.bells.push(prevRow[p+direction]);
        direction *= -1;
      }
    }
    prevRow = row.bells;
    //console.log(row.bells);
    arrayRows.push(row);
    
  }
  return arrayRows;
}

function getLH(pn, pnstage) {
  let start = rounds(pnstage);
  let lead = buildRows(start, pn, 1);
  let last = lead[lead.length-1].bells;
  return last;
}

//given pn find hunt bells
function findhunts(pn, pnstage) {
  let last = getLH(pn, pnstage);
  let hunts = [];
  for (let i = 0; i < pnstage; i++) {
    if (last[i] === i+1) {
      hunts.push(i+1);
    }
  }
  return hunts;
}

//make list of a bell's places in a set of rows
function bellplaces(rowarr, b) {
  let pp = [];
  rowarr.forEach(r => {
    let p = r.indexOf(b)+1;
    pp.push(p);
  });
  return pp;
}


function combinepn(above, below, huntpp) {
  let res = [];
  for (let i = 0; i < above.length; i++) {
    let pp = [huntpp[i], huntpp[i+1]];
    let min = Math.min(...pp);
    let max = Math.max(...pp);
    let a = above[i];
    let b = below[i];
    if (a === "x" && b === "x") {
      res.push("x");
    } else {
      let change = [];
      if (b != "x") {
        b.forEach(n => {
          //if it's equal the treble is making a place
          if (n <= min) change.push(n);
        });
      }
      if (a != "x") {
        a.forEach(n => {
          if (n > max) change.push(n);
        });
      }
      change.length ? res.push(change) : res.push("x");
    }
  }
  return res;
}






