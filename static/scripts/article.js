"use-strict";

globalId = 0;

_curE = null;
_curGroup = null;

function addSpanWrapper() {
  addSpan()
  var d = document.getElementById("nav-tabs-article").children[5]
  openTab(d, d.id);
}

function bindEvents() {
  $("#add-group").click(() => { addGroup(); });
  $("#del-group").click(() => { delGroup(); });
  $("#add-span").click(() => { addSpanWrapper(); });
  $("#del-span").click(() => { removeSpan(); });

  $(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
    var tabIdChunks = e.target.id.split('-');
    var navId = e.target.parentNode.id;
    $('input[name="spans"]').attr('checked', false);

    // Toggle the primary ICO tabs
    if (navId == 'nav-tabs-ico') {
      _curE = tabIdChunks[tabIdChunks.length - 1];

      // _curGroup doesn't get updated, so look for the active tab manually
      var activeTabs = $('#nav-tabs-'+_curE+' a.active');
      if (activeTabs.length == 1) {
        var activeIdChunks = activeTabs[0].id.split('-');
        _curGroup = activeIdChunks[activeIdChunks.length - 1];
      } else {
        _curGroup = null;
      }

    // Toggle the group tab
    } else if (navId == 'nav-tabs-i' ||
               navId == 'nav-tabs-c' ||
               navId == 'nav-tabs-o') {
      $('input[name=spans]').attr('checked',false);
      _curGroup = tabIdChunks[tabIdChunks.length - 1];
    }
  })

	$(document).on('change', 'input[type=radio][name=spans]', e => radioChange(e));
  $(document).on('click', '.highlight', e => highlightClick(e));
  $(document).on('dblclick', '.group-tab', e => doubleClick(e));

  $("#submit").click(submit);
  document.onmouseup = addButtonAvail; // call this function whenever the person lifts up his or her mouse
  document.onkeyup = handleKeyPress;
  console.log('good to go!');
}

function doubleClick(e) {
  var tab = e.target;
  var curName = tab.getAttribute('group-name');
  if (e.shiftKey) {
    var groupName = prompt("New group:", curName);
    if (groupName == null) {
      return;
    } else {
      createGroup(groupName);
    }
  } else {
    var groupName = prompt("Rename group:", curName);
    if (groupName == null) {
      return;
    } else {
      tab.setAttribute('group-name', groupName);
      setTabIndices();
    }
  }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setArticleHeight() {
  var headerHeight = document.getElementById('nav-tabs-article').clientHeight;
  var footerHeight = document.getElementById('annotation-container').clientHeight;
  var articleHeight = window.innerHeight - headerHeight - footerHeight - 10 - 12;
  document.getElementById('tab-contents-article').style.height = articleHeight + 'px';
}

function sanitizeStr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(' ', '-');
}

function setTabIndices() {
  var groupTabs = Array.from(document.getElementById('nav-tabs-'+_curE).children);
  $.each(groupTabs, function (nTab, tab) {
    var key = nTab+1;
    tab.setAttribute('tab-index', key);
    if (key <= 9) {
      tab.innerHTML = '<span class="hotkey">'+key+'</span> '+tab.getAttribute('group-name');
    }
    else {
      tab.innerHTML = tab.getAttribute('group-name');
    }
  });
}

function delGroup() {
  var groupTab = document.getElementById('nav-tab-'+_curE+'-'+_curGroup);
  var groupDiv = document.getElementById(_curE+'-'+_curGroup);
  var spanContainer = groupDiv.firstChild;
  var nSpans = spanContainer.childNodes.length;
  console.log(nSpans);
  if (nSpans > 0) {
    alert('Cannot delete non-empty group.');
    return
  }
  var curTabIdx = parseInt(groupTab.getAttribute('tab-index'));
  groupDiv.parentNode.removeChild(groupDiv);
  groupTab.parentNode.removeChild(groupTab);
  showGroup(_curE, curTabIdx-1);
  setTabIndices();
  setArticleHeight();
}

function createGroup(groupName) {
  console.log('adding for', e);

  if (groupName == null) {
    groupName = prompt("Enter group name:", "...");
    if (groupName == null) {
      return;
    }
  }

  var e = _curE;

  var navTabs = document.getElementById('nav-tabs-'+e);
  var tabContents = document.getElementById('tab-contents-'+e);

  var tabIdx = navTabs.children.length + 1; // 1-based index

  var groupIdx = getNewGlobalId();
  var groupId = e + '-' + groupIdx;

  var newTab = document.createElement('a');
  newTab.classList.add('nav-item', 'nav-link', 'nav-inner', 'group-tab');
  newTab.id = 'nav-tab-'+groupId;
  newTab.setAttribute('data-toggle', 'tab');
  newTab.setAttribute('href', '#'+groupId);
  newTab.setAttribute('group-name', groupName);
  newTab.setAttribute('element', e);

  var newContent = document.createElement('div');
  newContent.classList.add('tab-pane', 'fade');
  newContent.id = groupId;
  newContent.setAttribute('role', 'tabpanel');

  var spanContainer = document.createElement('div');
  spanContainer.classList.add('selected-spans');
  spanContainer.id = groupId + '-selected';

  newContent.appendChild(spanContainer);
  navTabs.appendChild(newTab);
  tabContents.appendChild(newContent);

  setTabIndices();
  console.log(e, tabIdx);

  showGroup(e, tabIdx);
  setArticleHeight();
}

function showAnnTab(e) {
  $('#nav-tab-'+e).tab('show')
}

function showGroupId(e, id) {
  showAnnTab(e);
  $(document.querySelector('[id="nav-tab-'+e+'-'+id+'"]')).tab('show')
}

function showGroup(e, idx) {
  showAnnTab(e);
  $(document.querySelector('[tab-index="'+idx+'"][element="'+e+'"]')).tab('show')
}

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

function createHighlight(suffix, spanId) {
  var wrapper = document.createElement('span');
  wrapper.classList.add('highlight', 'highlight-'+suffix);
  // add the id as a class for easy jQuery selections
  // and as an attribute for easy js lookups
  wrapper.classList.add('span-'+spanId);
  wrapper.setAttribute('span-id', spanId);
  return wrapper;
}

function createOffset(text, i, f) {
  var node = document.createElement('offsets');
  node.setAttribute('xml_i', i);
  node.setAttribute('xml_f', f);
  node.textContent = text;
  return node;
}

function wrapNodeTexts(selectedNodes, selectedTxtI, selectedTxtF, suffix, spanId) {
  var textNodes = selectedNodes.filter(n => n.nodeType == Node.TEXT_NODE);
	$.each(textNodes, function (n, node) {
    var offsetNode = node.parentNode;
    var offsetNodeContainer = offsetNode.parentNode;
    var spanTxtI = parseInt(offsetNode.getAttribute('xml_i'));
    var spanTxtF = parseInt(offsetNode.getAttribute('xml_f'));

    if (spanTxtI + node.textContent.length != spanTxtF) {
      console.log('We got a problem! Text length mismatches');
    }

    var spanContentI = Math.max(selectedTxtI, spanTxtI) - spanTxtI;
    var spanContentF = Math.min(selectedTxtF, spanTxtF) - spanTxtI;

    var chunks = [[0, spanContentI],
                  [spanContentI, spanContentF],
                  [spanContentF, node.textContent.length]];

    var chunkNode = null;
    $.each(chunks, function (nChunk, [chunkI, chunkF]) {
      if (chunkF > chunkI) {
        var chunkText = node.textContent.substring(chunkI, chunkF);
        var txt_i = spanTxtI + chunkI;
        var txt_f = spanTxtI + chunkF;
        chunkNode = createOffset(chunkText, txt_i, txt_f);
        if (nChunk == 1) { // highlighted section
          var highlight = createHighlight(suffix, spanId);
          highlight.appendChild(chunkNode);
          textNodes[n] = chunkNode;
          offsetNodeContainer.insertBefore(highlight, offsetNode);
        } else {
          offsetNodeContainer.insertBefore(chunkNode, offsetNode);
        }
      }
    });
    node.remove(); // the TEXT_NODE that we split to create 3 new offset nodes
    offsetNode.remove(); // the offset node that held the original TEXT_NODE
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

function checkSpanOffset(node, targetOffset) {
  var text_i = parseInt(node.getAttribute('xml_i'));
  var text_f = parseInt(node.getAttribute('xml_f'));
  if (text_i <= targetOffset && targetOffset <= text_f) {
    return node;
  } else {
    return null;
  }
}

function addFromOffsets(startOffset, endOffset, text, suffix) {
  var startNode = null;
  var endNode = null;
  $.each(document.getElementsByTagName('offsets'), function(n, node) {
    var selectedNode;
    if (selectedNode = checkSpanOffset(node, startOffset)) {
      startNode = selectedNode;
    }
    if (selectedNode = checkSpanOffset(node, endOffset)) {
      endNode = selectedNode;
    }
    if (startNode && endNode) {
      return false;
    }
  });
  if (startNode && endNode) {
    // descend from the <offset> nodes in to the corresponding <text> nodes
    startNode = startNode.firstChild;
    endNode = endNode.firstChild;
    var selectedNodes = getInterveningNodes(startNode, endNode);
    add(selectedNodes, startOffset, endOffset, text, suffix);
  } else {
    console.log('Unable to find start/end nodes to highlight text');
    console.log(textStartOffset, textEndOffset);
  }
};

function addFromHighlight() {
  var [highlighted, range] = get_Highlight_Text_And_Range();
  window.getSelection().removeAllRanges();

  if (highlighted === "") {
    return ;
  }

  if (!_curE || !_curGroup) {
    alert('Create a group first');
    return;
  }

  if (isAlreadyHighlighted(highlighted) === true) {
      $("#warning").append("<p>Text has already been selected.</p>")
      return;
  }

  var selectedNodes = getInterveningNodes(range.startContainer, range.endContainer);
  var textNodes = selectedNodes.filter(n => n.nodeType == Node.TEXT_NODE);

  var startNode = textNodes[0];
  var startSpanOffset = parseInt(startNode.parentNode.getAttribute('xml_i'));
  var startOffset = range.startOffset + startSpanOffset;

  var endNode = textNodes[textNodes.length - 1];
  var endSpanOffset = parseInt(endNode.parentNode.getAttribute('xml_i'));
  var endOffset = range.endOffset + endSpanOffset;

  add(selectedNodes, startOffset, endOffset, highlighted, _curE);
}

function getNewGlobalId() {
  globalId += 1;
  return globalId;
}

function findAncestor (el, cls) {
  while (el.nodeType == Node.TEXT_NODE || !(el.classList.contains(cls))) {
    el = el.parentNode;
    if (!el) {
      break;
    }
  }
  return el;
}

function highlightClick(e) {
  console.log(e.target);
  var spanId = e.target.parentNode.getAttribute('span-id');
  console.log(spanId);
  if (e.target.parentNode.classList.contains('unassigned')) {
    $('.highlight.active').removeClass('active');
    $(e.target.parentNode).addClass('active');
    uncheckAllRadio();
  } else {
    var radioInput = document.getElementById(spanId);
    var groupE = radioInput.parentNode.getAttribute('element');
    var groupId = radioInput.parentNode.getAttribute('group');
    radioInput.click();
    showGroupId(groupE, groupId);
  }
}

function uncheckAllRadio() {
  $('input[type=radio]:checked').prop('checked', false);
}

async function radioChange(e) {
  var tab = e.target.getAttribute('tab');
  var spanId = 'span-'+e.target.getAttribute('id');

  $('.highlight.active').removeClass('active');
  $('.'+spanId).addClass('active');

  // safe to try and open the tab (noop if tab is already open)
  openTab(document.getElementById('link_'+tab), tab);

  // check if we need to scroll to span
  var articleDiv = document.getElementById('tab-contents-article');

  await sleep(300);
  var span = document.getElementsByClassName(spanId)[0];
  var divTop = articleDiv.offsetTop;
  var divBot = divTop + articleDiv.offsetHeight;
  var spanTop = span.getBoundingClientRect().top;
  var spanBot = spanTop + span.offsetHeight;

  if (spanTop < divTop) {
    articleDiv.scrollTop -= (divTop - spanTop) + 5;
  } else if (spanBot > divBot) {
    articleDiv.scrollTop += (spanBot - divBot) + 5;
  }
}

/**
* Add the text to the on-going list.
*/
function add(selectedNodes, startOffset, endOffset, highlighted, suffix) {

    var globalId = getNewGlobalId();

    console.log(selectedNodes);
    console.log(selectedNodes.map(n => n.parentNode));
    var labeledNodes = selectedNodes.filter(n => n.parentNode.classList.contains('highlight') || n.parentNode.parentNode.classList.contains('highlight'));
    if (labeledNodes.length > 0) {
      alert('Cannot overwrite existing highlight!');
      return false;
    }

    textNodes = wrapNodeTexts(selectedNodes, startOffset, endOffset, suffix, globalId);

    var startNode = textNodes[0];
    var endNode = textNodes[textNodes.length - 1];

    var txtStart = -1;
    var txtEnd = -1;
    try {
      txtStart = parseInt(startNode.getAttribute('xml_i'));
      txtEnd = parseInt(endNode.getAttribute('xml_f'));
    } catch {
      console.log('Unable to find txt start/end info in tag attr');
      console.log(selectedNodes);
    }
    addRadioButton(highlighted, suffix, txtStart, txtEnd, globalId);
}

function addRadioButton(text, suffix, txtStart, txtEnd, globalId) {
    // store the data in the corresponding box
    var divId = 'radio-'+globalId;
    var radioDiv = document.createElement('div');
    radioDiv.id = divId;
    radioDiv.classList.add('selected-ico', 'selected-'+suffix);
    radioDiv.setAttribute('xml_i', txtStart);
    radioDiv.setAttribute('xml_f', txtEnd);
    radioDiv.setAttribute('element', _curE);
    radioDiv.setAttribute('group', _curGroup);

    var tab = $('.tab-pane-article.active')[0].id;
    var radioInput = document.createElement('input');
    radioInput.setAttribute('type', 'radio');
    radioInput.setAttribute('tab', tab);
    radioInput.setAttribute('name', 'spans');
    radioInput.setAttribute('value', divId);
    radioInput.setAttribute('id', globalId);

    var radioLabel = document.createElement('label');
    radioLabel.setAttribute('for', globalId);

    radioDiv.appendChild(radioInput);
    radioDiv.appendChild(radioLabel);
    radioLabel.appendChild(document.createTextNode(text));
    document.getElementById(_curE+'-'+_curGroup+'-selected').appendChild(radioDiv);

    radioInput.click();
}

function getActiveTab() {
  return document.getElementsByClassName("tablinks active")[0].id;
}

function parse_element(elem) {
  if (elem.length && elem.length > 0) {
    var children = elem;
  } else {
    var children = elem.children;
  }

  var p_elem   = [];
  for (var i = 0; i < children.length; i++) {
    if (children[i].children.length != 0) {
      p_elem.push.apply(p_elem, parse_element(children[i]));
    } else {
      p_elem.push(children[i]);
    }
  }

  return p_elem;
}

function getTextNodesIn(node) {
    var textNodes = [];
    if (node.nodeType == 3) {
        textNodes.push(node);
    } else {
        var children = node.childNodes;
        for (var i = 0, len = children.length; i < len; ++i) {
            textNodes.push.apply(textNodes, getTextNodesIn(children[i]));
        }
    }
    return textNodes;
}

function setSelectionRange(el, start, end) {
    if (document.createRange && window.getSelection) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var textNodes = getTextNodesIn(el);
        var foundStart = false;
        var charCount = 0, endCharCount;

        for (var i = 0, textNode; textNode = textNodes[i++]; ) {
            endCharCount = charCount + textNode.length;
            if (!foundStart && start >= charCount
                    && (start < endCharCount ||
                    (start == endCharCount && i <= textNodes.length))) {
                range.setStart(textNode, start - charCount);
                foundStart = true;
            }
            if (foundStart && end <= endCharCount) {
                range.setEnd(textNode, end - charCount);
                break;
            }
            charCount = endCharCount;
        }

        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

    } else if (document.selection && document.body.createTextRange) {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(true);
        textRange.moveEnd("character", end);
        textRange.moveStart("character", start);
        textRange.select();
    }
}

function deactivate_tab() {
  var docs = document.getElementById("nav-tabs-article").children;
  for (var i = 0; i < docs.length; i++) {
    docs[i].classList.remove("active");
  }

  var docs = document.getElementById("tab-contents-article").children;
  for (var i = 0; i < docs.length; i++) {
    docs[i].classList.remove("active");
    docs[i].classList.remove("show");
  }
}

function getActiveNavTab() {
  return document.getElementsByClassName("show active")[0];
}


function addSpan() {
  var cur_tab = getActiveNavTab();
  if (window.getSelection().toString()) {
    var str_ = window.getSelection().toString(); // TODO: Do something smart about stripping and lower-casing
    addFromHighlight();
    var elements = parse_element(document.getElementsByClassName("tab-pane-article"));
    for (var i = 0; i < elements.length; i++) {
      var elem = elements[i];
      var idx  = elem.textContent.indexOf(str_);
      if (idx >= 0 && elem.textContent.length != str_.length) { // IGNORE THE CASE THAT WE ALREADY DID THUS FAR
        var range = document.createRange();
        setSelectionRange(elem, idx, idx + str_.length);

        if (window.getSelection().toString()) {
          break;
        } else {
          var parent = elem.parentElement.parentElement;
          var p      = document.getElementById(parent.id.split("-").join("-tab-"));
          deactivate_tab();
          p.classList.add("active");
          parent.classList.add("active");
          parent.classList.add("show");
          break;
        }
      }
    }

    addSpan();
    deactivate_tab();
    cur_tab.classList.add("show");
    cur_tab.classList.add("active");
  } else if ($('.highlight.active').length > 0) {
    moveSpan();
  }
}

function addGroup() {
  // add new group
  var groupName = window.getSelection().toString();
  if (groupName.length > 0) {
    createGroup(groupName);
  }
  else {
    createGroup();
  }
}

function handleKeyPress (evt) {
  console.log(evt.key, evt.keyCode);
  if (evt.key == "t") {
    showAnnTab('i');
  }
  else if (evt.key == "o") {
    showAnnTab('o');
  }
  else if (isFinite(evt.key)) {
    showGroup(_curE, evt.key)
  }
  else if (evt.key == 's') {
    addSpan();
  }
  else if (evt.key == 'g') {
    addGroup();
  }
  else if (evt.key == 'd') {
    delGroup();
  }
  else if (evt.key == "e" || evt.keyCode == 8 /*backspace*/ || evt.keyCode == 46 /*delete*/) {
    removeSpan();
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

  var corefs = { 'i': {}, 'o': {} };
  var groupTabs = Array.from(document.getElementsByClassName('nav-inner'));
  groupTabs.forEach(tab => {
    var idParts = tab.id.split('-');
    var e = idParts[2];
    var groupId = idParts[3];
    var groupName = tab.textContent;
    corefs[e][groupId] = { 'name': groupName, 'spans': [] };
  });

  console.log(corefs);

  var spanDivs = Array.from(document.getElementsByClassName('selected-ico'));
  spanDivs.forEach(s => {
    console.log(s);
    var e = s.getAttribute('element');
    var groupId = s.getAttribute('group');
    var start = s.getAttribute('xml_i');
    var end   = s.getAttribute('xml_f');
    var txt = s.lastChild.textContent;
    console.log(e, groupId, start, end, txt);
    corefs[e][groupId].spans.push({'i': start, 'f': end, 'txt': txt});
  });

  console.log('submitted!', pid);
  post("/submit/", {"userid": userid, "id": id, "pid": pid, "corefs": JSON.stringify(corefs)});
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
function removeSpan() {
  var checkedRadios = $('input[type=radio]:checked');
  if (checkedRadios.length == 1) {
    var span = checkedRadios[0];
    var spanId = span.id;
    if ($('.span-'+spanId)[0].classList.contains('assigned')) {
      alert('Cannot delete preloaded spans');
      return;
    }
    var offsetNodes = $('.span-'+spanId).children();
    checkedRadios[0].parentNode.remove();
    offsetNodes.unwrap();
    condenseOffsetNodes(offsetNodes);
  }
}

function moveSpan() {
  var span0 = document.getElementsByClassName("highlight active")[0];
  var spanId = span0.getAttribute('span-id');
  console.log(spanId);

  if (!_curGroup) {
    alert('No active group to add span to');
    return;
  }

  var radioDiv = document.getElementById('radio-'+spanId);
  if (radioDiv) {
    var sourceGroup, sourceE, fluff;
    [sourceE, sourceGroup, ...fluff]= radioDiv.parentNode.id.split('-');

    if (sourceE == _curE && sourceGroup != _curGroup) {
      var targetParent = document.getElementById(_curE+'-'+_curGroup+'-selected');
      radioDiv.setAttribute('group', _curGroup);
      radioDiv.parentNode.removeChild(radioDiv);
      targetParent.appendChild(radioDiv);
    }
  } else {
    // No corresponding radio div (initially unassigned span)
    var suffix = null;
    if (span0.classList.contains('highlight-i')) {
      suffix = 'i';
    } else if (span0.classList.contains('highlight-o')) {
      suffix = 'o';
    } else {
      console.log('Not sure what the element of currently active span is!');
      return;
    }
    if (suffix != _curE) {
      alert('Wrong group type selected for current span');
      return;
    }
    span0.classList.remove('unassigned');
    span0.classList.add('assigned');
    addRadioButton(span0.firstChild.textContent, suffix,
        span0.firstChild.getAttribute('xml_i'),
        span0.firstChild.getAttribute('xml_f'),
        spanId);

    if ($('.highlight.unassigned').length == 0) {
      $('#submit').prop('disabled', false);
    }
  }
}

function condenseOffsetNodes(nodes) {
  Array.from(nodes).forEach(n => {
    while (n.previousSibling && n.previousSibling.nodeName == 'OFFSETS') {
      var pn = n.previousSibling;
      var jn = createOffset(pn.textContent + n.textContent, pn.getAttribute('xml_i'), n.getAttribute('xml_f'));
      n.parentNode.insertBefore(jn, n);
      n.remove();
      pn.remove();
      n = jn;
    }
    while (n.nextSibling && n.nextSibling.nodeName == 'OFFSETS') {
      var nn = n.nextSibling;
      var jn = createOffset(n.textContent + nn.textContent, n.getAttribute('xml_i'), nn.getAttribute('xml_f'));
      n.parentNode.insertBefore(jn, n);
      n.remove();
      nn.remove();
      n = jn;
    }
  });
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
    if (text != "") { //MAYBE DONT REMOVE THIS?
      range = selection.getRangeAt(0);
    } else {
      var clone  = window.getSelection().getRangeAt(0).cloneContents();
      var range  = window.getSelection().getRangeAt(0);
      text   = clone.textContent;
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
  $('#'+name.replace('-', '-tab-')).tab('show');
}

function addTabContent(div, heading, content, level = 0) {
  var titleDiv = document.createElement('h'+(level+3));
  titleDiv.innerHTML = heading.html;
  div.appendChild(titleDiv);
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

function addAnns(annotations) {
  var container = document.getElementById('nav-anns');
  var divMap = new Map();
  console.log(annotations);
  annotations.forEach(a => {
    var k = a.Intervention + '|' + a.Comparator;
    var annDiv = null;
    var targetE = ['Outcome'];
    if (!divMap.has(k)) {
      var div = document.createElement('div');
      div.classList.add('ann-row');
      container.appendChild(div);
      divMap.set(k, div);
      targetE = ['Intervention', 'Comparator', 'Outcome'];
    }
    appendAnn(divMap.get(k), a, targetE);
  });
}

function appendAnn(div, ann, targetE) {
  targetE.forEach(e => {

    var eSpan = document.createElement('span');
    eSpan.innerHTML = '<b>'+e+'</b>: ';

    var globalId = getNewGlobalId();
    var highlight = document.createElement('span');
    highlight.classList.add('highlight', 'unassigned', 'span-'+globalId);
    highlight.setAttribute('span-id', globalId);
    if (e == 'Outcome') {
      highlight.classList.add('highlight-o');
    } else {
      highlight.classList.add('highlight-i');
    }

    var offsets = document.createElement('offsets');
    offsets.setAttribute('xml_i', ann.Intervention + '|' + ann.Comparator + '|' + ann.Outcome);
    offsets.setAttribute('xml_f', ann.Intervention + '|' + ann.Comparator + '|' + ann.Outcome);
    offsets.textContent = ann[e];

    highlight.appendChild(offsets);
    div.appendChild(eSpan);
    div.appendChild(highlight);
    div.innerHTML += '<br/>'
  });
}
