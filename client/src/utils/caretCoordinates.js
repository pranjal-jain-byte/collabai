// caretCoordinates.js - Pixel Coordinate Calculation for Textarea Caret & Selections
// Accurately maps character indices in a textarea to pixel (X, Y) offsets for Google Docs-style cursors.

const STYLE_PROPERTIES = [
  'direction',
  'boxSizing',
  'width',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
  'overflowWrap',
  'wordBreak'
];

let mirrorDiv = null;

function getMirrorDiv() {
  if (mirrorDiv && document.body.contains(mirrorDiv)) {
    return mirrorDiv;
  }
  mirrorDiv = document.createElement('div');
  mirrorDiv.id = 'collabai-textarea-caret-mirror';
  mirrorDiv.style.position = 'absolute';
  mirrorDiv.style.visibility = 'hidden';
  mirrorDiv.style.top = '-9999px';
  mirrorDiv.style.left = '-9999px';
  mirrorDiv.style.pointerEvents = 'none';
  document.body.appendChild(mirrorDiv);
  return mirrorDiv;
}

export function getCaretCoordinates(element, position) {
  if (!element || typeof position !== 'number') {
    return { top: 0, left: 0, height: 20 };
  }

  const mirror = getMirrorDiv();
  const computed = window.getComputedStyle(element);

  // Copy textarea computed styles to mirror element
  for (const prop of STYLE_PROPERTIES) {
    mirror.style[prop] = computed[prop];
  }

  // Ensure exact width matches clientWidth
  mirror.style.width = `${element.clientWidth}px`;
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.overflowWrap = 'break-word';

  const text = element.value || '';
  const clampedPos = Math.max(0, Math.min(position, text.length));

  // Build content up to position and insert target marker
  const textBefore = text.slice(0, clampedPos);
  mirror.textContent = textBefore;

  const span = document.createElement('span');
  span.textContent = text.slice(clampedPos, clampedPos + 1) || '\u200b'; // Zero-width space if at end
  mirror.appendChild(span);

  const coordinates = {
    top: span.offsetTop - element.scrollTop,
    left: span.offsetLeft - element.scrollLeft,
    height: span.offsetHeight || parseInt(computed.lineHeight, 10) || 20
  };

  return coordinates;
}

// Compute bounding highlight rectangles for selection ranges
export function getSelectionRects(element, start, end) {
  if (!element || start === end || typeof start !== 'number' || typeof end !== 'number') {
    return [];
  }

  const selStart = Math.min(start, end);
  const selEnd = Math.max(start, end);
  const startCoord = getCaretCoordinates(element, selStart);
  const endCoord = getCaretCoordinates(element, selEnd);

  // Single line selection
  if (Math.abs(startCoord.top - endCoord.top) < (startCoord.height * 0.8)) {
    return [{
      top: startCoord.top,
      left: startCoord.left,
      width: Math.max(4, endCoord.left - startCoord.left),
      height: startCoord.height
    }];
  }

  // Multi-line selection
  return [
    {
      top: startCoord.top,
      left: startCoord.left,
      width: Math.max(10, element.clientWidth - startCoord.left - 20),
      height: startCoord.height
    },
    {
      top: endCoord.top,
      left: 0,
      width: Math.max(4, endCoord.left),
      height: endCoord.height
    }
  ];
}
