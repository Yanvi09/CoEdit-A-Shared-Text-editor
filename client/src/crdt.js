// CRDT Character data model
// Each character in the document is represented by this structure
export class Character {
  constructor(id, position, char, deleted = false, author) {
    this.id = id; // Unique identifier for this character
    this.position = position; // Fractional position for ordering
    this.char = char; // The actual character
    this.deleted = deleted; // Tombstone flag for deletions
    this.author = author; // Who inserted this character
  }
}

// Document state is an array of Character objects
export function createDocument() {
  return [];
}

// Generate a unique ID for characters
let idCounter = 0;
export function generateId() {
  return `${Date.now()}-${idCounter++}`;
}

// Compare two position arrays
// Returns -1 if pos1 < pos2, 1 if pos1 > pos2, 0 if equal
function comparePositions(pos1, pos2) {
  const maxLength = Math.max(pos1.length, pos2.length);
  for (let i = 0; i < maxLength; i++) {
    const val1 = pos1[i] ?? 0;
    const val2 = pos2[i] ?? 0;
    if (val1 < val2) return -1;
    if (val1 > val2) return 1;
  }
  return 0;
}

// Calculate a position strictly between two positions
// Uses a recursive midpoint algorithm with tie-breaking by client ID
function midpoint(afterPos, beforePos, clientId) {
  // Start with the minimum position
  const result = [];
  
  // Find the first differing element
  const maxLength = Math.max(afterPos.length, beforePos.length);
  for (let i = 0; i < maxLength; i++) {
    const afterVal = afterPos[i] ?? 0;
    const beforeVal = beforePos[i] ?? 0;
    
    if (afterVal + 1 < beforeVal) {
      // There's room for a new number between them
      result.push(afterVal + 1);
      return result;
    } else if (afterVal + 1 === beforeVal) {
      // No room, need to go deeper
      result.push(afterVal);
    } else {
      // afterVal >= beforeVal, this shouldn't happen in valid inputs
      result.push(afterVal);
    }
  }
  
  // If we couldn't find a midpoint, append the client ID for tie-breaking
  // Use a hash of the client ID to ensure consistent ordering
  const clientHash = clientId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  result.push(clientHash % 100);
  return result;
}

// Insert a character at a position between afterPos and beforePos
export function insert(doc, afterPos, beforePos, char, author, clientId) {
  const position = midpoint(afterPos, beforePos, author);
  const id = generateId();
  const newChar = new Character(id, position, char, false, author);
  doc.push(newChar);
  return newChar;
}

// Remove a character by setting its deleted flag (tombstone)
export function remove(doc, id) {
  const char = doc.find(c => c.id === id);
  if (char) {
    char.deleted = true;
  }
  return char;
}

// Apply an operation to the document
export function applyOperation(doc, op) {
  if (op.type === 'insert') {
    return insert(doc, op.afterPosition, op.beforePosition, op.char, op.author);
  } else if (op.type === 'remove') {
    return remove(doc, op.id);
  }
  return null;
}

// Render the document to a string
// Filters out deleted characters and sorts by position
export function render(doc) {
  const activeChars = doc.filter(c => !c.deleted);
  activeChars.sort((a, b) => comparePositions(a.position, b.position));
  return activeChars.map(c => c.char).join('');
}
