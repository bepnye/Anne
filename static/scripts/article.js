"use-strict";

globalId = 0;

/* copied verbatim from https://stackoverflow.com/questions/3960843/ */
function getCommonAncestor(a, b)
{
    $parentsa = $(a).parents();
    $parentsb = $(b).parents();

    var found = null;

    $parentsa.each(function() {
        var thisa = this;

        $parentsb.each(function() {
            if (thisa == this)
            {
                found = this;
                return false;
            }
        });

        if (found) return false;
    });

    return found;
}

/* shamelessly ripped from SO https://stackoverflow.com/questions/7781963 */
function nextNode(node) {
    if (node.hasChildNodes()) {
        return node.firstChild;
    } else {
        while (node && !node.nextSibling) {
            node = node.parentNode;
        }
        if (!node) {
            return null;
        }
        return node.nextSibling;
    }
}

/* shamelessly ripped from SO https://stackoverflow.com/questions/7781963 */
function getInterveningNodes(startNode, endNode) {

    // Special case for a range that is contained within a single node
    if (startNode == endNode) {
      return [startNode];
    }

    // Iterate nodes until we hit the end container
    var rangeNodes = [];
    var node = startNode;
    while (node && node != endNode) {
        rangeNodes.push( node = nextNode(node) );
    }

    // Add partially selected nodes at the start of the range
    var topNode = getCommonAncestor(startNode, endNode);
    node = startNode;
    while (node && node != topNode) {
        rangeNodes.unshift(node);
        node = node.parentNode;
    }

    return rangeNodes;
}

function createTextWrapper(className = null, id = null) {
  var wrapper = document.createElement('offsets');
  if (className) { wrapper.className = className; }
  if (id) { wrapper.id = id; }
  return wrapper;
}

function wrapNodeTexts(selectedNodes, selectedTxtI, selectedTxtF, createClassWrapper) {
  var textNodes = selectedNodes.filter(n => n.nodeType == Node.TEXT_NODE);
  console.log(textNodes);
  console.log(selectedTxtI);
  console.log(selectedTxtF);
	$.each(textNodes, function (n, node) {
    var offsetNode = node.parentNode;
    var offsetNodeContainer = offsetNode.parentNode;
    var spanTxtI = parseInt(offsetNode.getAttribute('txt_i'));
    var spanTxtF = parseInt(offsetNode.getAttribute('txt_f'));
    if (spanTxtI + node.textContent.length != spanTxtF) {
      console.log('We got a problem! Text length mismatches');
    }

    var spanContentI = Math.max(selectedTxtI, spanTxtI) - spanTxtI;
    var spanContentF = Math.min(selectedTxtF, spanTxtF) - spanTxtI;

    var chunks = [[createTextWrapper,  0, spanContentI],
                  [createClassWrapper, spanContentI, spanContentF],
                  [createTextWrapper,  spanContentF, node.textContent.length]];

    var chunkNode = null;
    $.each(chunks, function (_, [createWrapper, chunkI, chunkF]) {
      var chunkText = node.textContent.substring(chunkI, chunkF);
      if (chunkText.length > 0 ) {
        chunkNode = createWrapper.call();
        chunkNode.textContent = chunkText;
        chunkNode.setAttribute('txt_i', selectedTxtI + chunkI);
        chunkNode.setAttribute('txt_f', selectedTxtI + chunkF);
        offsetNodeContainer.insertBefore(chunkNode, offsetNode);
      }
    });
    node.remove(); // the TEXT_NODE that we split to create 3 new offset nodes
    offsetNode.remove(); // the offset node that held the original TEXT_NODE
    textNodes[n] = chunkNode.childNodes[0]; // the TEXT_NODE from one of the new offset nodes
	});
  return textNodes;
}

/**
* Get the text that was highlighted by the user.
*/
function getSelectedText() {
    var text = "";

    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }

    window.getSelection().removeAllRanges();

    text = text.trim();
    return text;
}

/**
* Check that the string is already highlighted.
*
* @param highlighted represents that the user wants to add to the highlighted list.
*/
function isAlreadyHighlighted(highlighted) {
    var highlights = getFinalText();
    for (var i = 0; i < highlights.length; i++) {
        if (highlights[i].includes(highlighted)) {
            return true;
        }
    }

    return false;
}

function checkRadioBtn(name, idx) {
  var radios = document.getElementsByClassName(name);
  if (idx < 0) {
    idx = radios.length - 1;
  }
  if (radios.length > 0) {
    radios[idx].checked = true;
  }
}

function checkSpanOffset(node, targetOffset) {
  var text_i = parseInt(node.getAttribute('txt_i'));
  var text_f = parseInt(node.getAttribute('txt_f'));
  if (text_i <= targetOffset && targetOffset <= text_f) {
    return node.childNodes[0];
  }
}

function addFromTextOffsets(textStartOffset, textEndOffset, text, suffix) {
  var startNode = null;
  var endNode = null;
  $.each(document.getElementsByTagName('offsets'), function(n, node) {
    var selectedTextNode;
    if (selectedTextNode = checkSpanOffset(node, textStartOffset)) {
      startNode = selectedTextNode;
    }
    if (selectedTextNode = checkSpanOffset(node, textEndOffset)) {
      endNode = selectedTextNode;
    }
    if (startNode && endNode) {
      return false;
    }
  });
  if (startNode && endNode) {
    var selectedNodes = getInterveningNodes(startNode, endNode);
    add(selectedNodes, textStartOffset, textEndOffset, text, suffix);
  } else {
    console.log('Unable to find start/end nodes to highlight text');
    console.log(textStartOffset, textEndOffset);
  }
};

function addFromHighlight(suffix) {
  console.log('Adding for', suffix);
  var [highlighted, range] = get_Highlight_Text_And_Range();
  window.getSelection().removeAllRanges();

  if (highlighted === "") {
    return ;
  }

  if (isAlreadyHighlighted(highlighted) === true) {
      $("#warning").append("<p>Text has already been selected.</p>")
      return;
  }
  var selectedNodes = getInterveningNodes(range.startContainer, range.endContainer);
  add(selectedNodes, range.startOffset, range.endOffset, highlighted, suffix);
}

function getNewGlobalId() {
  globalId += 1;
  return globalId;
}

function findAncestor (el, cls) {
  while (el.nodeType == Node.TEXT_NODE || !(el.getAttribute('class') == cls)) {
    el = el.parentNode;
    if (!el) {
      break;
    }
  }
  return el;
}

function moveToSpan(tab, spanId) {
  openTab({'currentTarget': document.getElementById('link_'+tab)}, tab);
  var e = document.getElementById("span-"+spanId);
  var topPos = e.offsetTop;
  var tabBarHeight = document.getElementById('tab-buttons-div').offsetHeight;
  document.getElementById(tab).scrollTop = topPos - tabBarHeight - 50;
}

/**
* Add the text to the on-going list.
*/
function add(selectedNodes, startOffset, endOffset, highlighted, suffix) {

    var globalId = getNewGlobalId();

    var textNodes = wrapNodeTexts(selectedNodes, startOffset, endOffset, function () {
      return createTextWrapper('text-span-'+suffix, 'span-'+globalId);
    });

    var startNode = textNodes[0];
    var endNode = textNodes[textNodes.length - 1];
    
    var xmlStart = -1;
    var xmlEnd = -1;
    try {
      xmlStart = parseInt(startNode.parentNode.getAttribute('xml_i')) + startOffset;
      xmlEnd = parseInt(endNode.parentNode.getAttribute('xml_f')) + endOffset;
    } catch {
      console.log('Unable to find xml start/end info in tag attr');
      console.log(selectedNodes);
    }
    // store the data in the corresponding box
    var divId = 'radio-'+globalId;
    var radioDiv = document.createElement('div');
    radioDiv.setAttribute('id', divId);
    radioDiv.setAttribute('xml_start', xmlStart);
    radioDiv.setAttribute('xml_end', xmlEnd);

    var tab = findAncestor(startNode, 'tabcontent').id;
    var radioInput = document.createElement('input');
    radioInput.setAttribute('type', 'radio');
    radioInput.setAttribute('tab', tab);
    radioInput.setAttribute('name', 'spans');
    radioInput.setAttribute('value', divId);
    radioInput.setAttribute('class', 'spans-'+suffix);
    radioInput.setAttribute('id', globalId);

    var radioLabel = document.createElement('label');
    radioLabel.setAttribute('for', globalId);
    radioLabel.setAttribute('onclick', 'moveToSpan("'+tab+'", '+globalId+')');
    
    radioDiv.appendChild(radioInput);
    radioDiv.appendChild(radioLabel);
    radioLabel.appendChild(document.createTextNode(highlighted));
    document.getElementById('selected-'+suffix).appendChild(radioDiv);

    try {
      // disable the add-text button, and enable the clear button
      document.getElementById("remove-but-"+suffix).disabled = false;
      // only enable the submit button if the user has selected a span
      document.getElementById("submit-but").disabled = false;
    }
    catch {
    }

    checkRadioBtn('spans-'+suffix, -1);
    $("#panel-"+suffix).scrollTop(function() { return this.scrollHeight; });

    $("#warning").empty();
}

function getActiveTab() {
  return document.getElementsByClassName("tablinks active")[0].id;
}

function addHighlightedKeyup (evt) {
  if (evt.key == "1") {
    addFromHighlight('i');
  } else if (evt.key == "2") {
    addFromHighlight('c');
  } else if (evt.key == "3") {
    addFromHighlight('o');
  }
}

/**
* Returns an array of all the text that has been highlighted by the user.
*/
function getFinalText() {
    var results = [];
    var annotations = $("#selected input");
    annotations.each(function(idx, li) {
        results.push($(li).text());
    });
    return results;
}

/**
* Returns the text of whatever the user selected for the drop-down menu.
* i.e. "Significantly increased/decreased... etc."
*/
function getCheckBoxSelection() {
  var selected = document.getElementsByName('select');
  var ans = "";
  for (var i = 0; i < selected.length; i++){
    if (selected[i].checked) {
        ans = selected[i].value;
        break;
    }
  }


  return ans;
}

/**
* Send the data to the python code.
*/
function submit() {
    var userid = document.getElementById("userid").innerHTML;
    var id = document.getElementById("id").innerHTML;
    var pid = document.getElementById("pid").innerHTML;
    var annotations = getFinalText();
    var selection = getCheckBoxSelection();
    var outcome = document.getElementById("outcome_save").innerHTML;
    var comparator = document.getElementById("comparator_save").innerHTML;
    var intervention = document.getElementById("intervention_save").innerHTML;
    var xml_file = document.getElementById("xml_file").innerHTML;

    // Modify the necessary annotations to include the whole table.
    for (var j = 0; j < annotations.length; j++) {
      // Determine if this is in a table.
      var trs = document.getElementsByTagName("tr");
      var text = annotations[j];
      for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var txt = tr.innerText;
        // Check if either are a substring of another -> if so, save it.
        if (txt != "" && (text.indexOf(txt) != -1 || txt.indexOf(text) != -1)) {
          annotations[j] = tr.innerHTML;
        }
      }
    }

    if (selection === 'Invalid Prompt') {
        $("#myModal").modal('show');
    } else if (annotations.length > 0 || selection === 'Cannot tell based on the abstract') {
        post("/submit/", {"userid": userid,
                          "pid": pid,
                          "id": id,
                          "annotations": JSON.stringify(annotations),
                          "selection": selection,
                          "outcome": outcome,
                          "comparator": comparator,
                          "intervention": intervention,
                          "xml_file": xml_file});
    }
}

/**
* After getting a response, the user will press a button which will save their response.
*/
function submit_invalid_prompt() {
  var userid = document.getElementById("userid").innerHTML;
  var id = document.getElementById("id").innerHTML;
  var pid = document.getElementById("pid").innerHTML;
  var text = document.getElementById("response").value;
  var selection = getCheckBoxSelection();
  var outcome = document.getElementById("outcome_save").innerHTML;
  var comparator = document.getElementById("comparator_save").innerHTML;
  var intervention = document.getElementById("intervention_save").innerHTML;
  var xml_file = document.getElementById("xml_file").innerHTML;

  if (text !== '') {
    post("/submit/", {"userid": userid, "id": id, "pid": pid,
                      "annotations": JSON.stringify([text]),
                      "selection": selection,
                      "outcome": outcome,
                      "comparator": comparator,
                      "intervention": intervention,
                      "xml_file": xml_file});
  }

}

/**
* Enable the submit button iff there is selected-text or the user cannot tell
* based on the abstract.
*/
function list_change() {
  var selection = getCheckBoxSelection();
  if (selection === 'Cannot tell based on the abstract' || selection === 'Invalid Prompt') {
    document.getElementById("submit-but").disabled = false;
  } else if (getFinalText().length === 0) {
    document.getElementById("submit-but").disabled = true;
  } else {
    document.getElementById("submit-but").disabled = false;
  }
}

/**
* Clear all input and disable the submit button.
*/
function clear(suffix) {
    var selection = getCheckBoxSelection();
    //if (selection !== 'Cannot tell based on the abstract' || selection === 'Invalid prompt') {
    //  document.getElementById("submit-but").disabled = true;
    //}

    var radios = document.getElementsByClassName("spans-"+suffix);
    for (var i = 0; i < radios.length; i++){
      if (radios[i].checked) {
        var id = radios[i].value;
        document.getElementById(id).remove();
        document.getElementById(id.replace('radio', 'span')).className = 'text-span-normal';
        break; /* stop early so we remember the index of the removed button */
      }
    }
    if (radios.length == 0) {
      document.getElementById("remove-but-"+suffix).disabled = radios.length == 0;
    } else {
      checkRadioBtn('spans-'+suffix, i-1);
    }

    $("#warning").empty();
    $("#warning").hide();
}


/**
* Disable the submit button unless they've typed something.
*/
function must_type_invalid_prompt() {
    if (document.getElementById("response").value.length > 0) {
      document.getElementById("invalid-submit-but").disabled = false;
    } else {
      document.getElementById("invalid-submit-but").disabled = true;
    }
}

/**
* Gets the highlighted text without removing the selection.
*/
function get_Highlight_Text_And_Range() {
  var text = "";
  var range = null;
  if (window.getSelection) {
    selection = window.getSelection();
    text = selection.toString();
    if (text != "") {
      range = selection.getRangeAt(0);
    }
  } else if (document.selection && document.selection.type != "Control") {
    range = document.selection.createRange();
    text = range.text;
  }

  text = text.trim();
  return [text, range];
}

function get_Highlight_Text_No_Remove() {
  var [text, range] = get_Highlight_Text_And_Range();
  return text;
}

/**
* Disable/enable the add button iff text is selected.
*/
function addButtonAvail() {
  var highlighted = get_Highlight_Text_No_Remove();
  var avail = highlighted === "";
  var addBtns = document.getElementsByClassName("add-but");
  for (var i = 0; i < addBtns.length; i++) {
    addBtns[i].disabled = avail;
  }
}

function openTab(evt, name) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(name).style.display = "block";
    evt.currentTarget.className += " active";
}

function addTabContent(div, heading, content, level = 0) {
  div.innerHTML += '<h'+(level+2)+'>' + heading + '</h'+(level+2)+'>';
  $.each(content, function(i, contentNode) {
    /* contentNode is either:
         1) <p>...</p>
         2) [secTitle, [<p>...</p>, ...]] */
    if (typeof contentNode == 'string') {
      div.innerHTML += contentNode;
    } else if (typeof contentNode == 'object') {
      addTabContent(div, contentNode[0], contentNode[1], level + 1);
    } else {
      console.log('Unable parse tabContent for adding to div:\n', contentNode);
    }
  });
  return;
};
