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
