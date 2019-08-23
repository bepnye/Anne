function accept(elem) {
  var highlighted = elem.textContent;
  var suffix      = elem.getAttribute('suffix');
  var txtStart    = elem.children[0].getAttribute('xml_i');
  var txtEnd      = elem.children[0].getAttribute('xml_f');
  var globalId    = elem.getAttribute('span-id');

  $(elem).popover('dispose');
  elem.classList = "";
  elem.classList.add('highlight', 'highlight-'+suffix);
  elem.classList.add('span-'+globalId);

  addRadioButton(highlighted, suffix, txtStart, txtEnd, globalId)
}

function reject(elem) {
  var spanId = elem.getAttribute('span-id');

  $(elem).popover('dispose');
  var offsetNodes = $('.span-'+spanId).children();
  offsetNodes.unwrap();
  condenseOffsetNodes(offsetNodes);
}

function createTemporaryHighlight(suffix, spanId) {
  var wrapper  = document.createElement('span');
  var accept_  = '<button type="button" class="close" aria-hidden="true" style = "margin-right: 2px; margin-bottom: 10px;">&#10003;</button>';
  var reject_  = '<button type="button" class="close" aria-hidden="true" style = "margin-right: 2px; margin-bottom: 10px;">&times;</button>';
  var minimize = '<button onclick="$(this).closest(\'div.popover\').popover(\'hide\');" type="button" class="close" aria-hidden="true" style = "margin-right: 2px; margin-bottom: 10px;">-</button>';

// onclick="reject($(this))"
  var d1 = document.createElement('div');
  d1.innerHTML   =  minimize + reject_ + accept_;
  d1.children[1].onclick = function f() { reject(wrapper) };
  d1.children[2].onclick = function f() { accept(wrapper) };


  $(wrapper).popover({
      trigger: 'click',
      placement: 'top',
      content: d1,
      html: true,
      sanitize: false
    }).popover('show');

  wrapper.classList.add('temp-highlight');
  // add the id as a class for easy jQuery selections
  // and as an attribute for easy js lookups
  wrapper.classList.add('span-'+spanId);
  wrapper.setAttribute('span-id', spanId);
  wrapper.setAttribute('suffix', suffix);
  return wrapper;
}

function wrapNodeTemporaryTexts(selectedNodes, selectedTxtI, selectedTxtF, suffix, spanId) {
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
          var highlight = createTemporaryHighlight(suffix, spanId);
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

function add_highlighting(selectedNodes, startOffset, endOffset, highlighted, suffix) {
  var globalId = getNewGlobalId();

  console.log(selectedNodes);
  console.log(selectedNodes.map(n => n.parentNode));
  var labeledNodes = selectedNodes.filter(n => n.parentNode.classList.contains('highlight') || n.parentNode.parentNode.classList.contains('highlight'));
  if (labeledNodes.length > 0) {
    alert('Cannot overwrite existing highlight!');
    return false;
  }

  textNodes = wrapNodeTemporaryTexts(selectedNodes, startOffset, endOffset, suffix, globalId);

  var startNode = textNodes[0];
  var endNode = textNodes[textNodes.length - 1];

  var txtStart = -1;
  var txtEnd = -1;
  try {
    txtStart = parseInt(startNode.getAttribute('xml_i'));
    txtEnd   = parseInt(endNode.getAttribute('xml_f'));
  } catch {
    console.log('Unable to find txt start/end info in tag attr');
    console.log(selectedNodes);
  }
}

function temporary_highlight() {
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

  add_highlighting(selectedNodes, startOffset, endOffset, highlighted, _curE);
}
