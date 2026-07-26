// Test that CRDT operations converge regardless of order
import { createDocument, applyOperation, render } from './crdt.js';

function testCrdtConvergence() {
  console.log('Testing CRDT convergence...');
  
  // Create two documents
  const doc1 = createDocument();
  const doc2 = createDocument();
  
  // Define some operations
  const op1 = {
    type: 'insert',
    afterPosition: [0],
    beforePosition: [1],
    char: 'H',
    author: 'user1'
  };
  
  const op2 = {
    type: 'insert',
    afterPosition: [0, 0],
    beforePosition: [1],
    char: 'i',
    author: 'user1'
  };
  
  const op3 = {
    type: 'insert',
    afterPosition: [0, 0, 0],
    beforePosition: [1],
    char: '!',
    author: 'user2'
  };
  
  // Apply operations in different orders
  applyOperation(doc1, op1);
  applyOperation(doc1, op2);
  applyOperation(doc1, op3);
  
  applyOperation(doc2, op3);
  applyOperation(doc2, op1);
  applyOperation(doc2, op2);
  
  // Render both documents
  const text1 = render(doc1);
  const text2 = render(doc2);
  
  console.log('Document 1 rendered:', text1);
  console.log('Document 2 rendered:', text2);
  
  if (text1 === text2) {
    console.log('✓ Test passed: Documents converged to same text');
    return true;
  } else {
    console.log('✗ Test failed: Documents diverged');
    return false;
  }
}

// Test simultaneous insert at same position
function testSimultaneousInsert() {
  console.log('\nTesting simultaneous insert...');
  
  const doc1 = createDocument();
  const doc2 = createDocument();
  
  // Both try to insert at the same position
  const op1 = {
    type: 'insert',
    afterPosition: [0],
    beforePosition: [1],
    char: 'A',
    author: 'user1'
  };
  
  const op2 = {
    type: 'insert',
    afterPosition: [0],
    beforePosition: [1],
    char: 'B',
    author: 'user2'
  };
  
  applyOperation(doc1, op1);
  applyOperation(doc1, op2);
  
  applyOperation(doc2, op2);
  applyOperation(doc2, op1);
  
  const text1 = render(doc1);
  const text2 = render(doc2);
  
  console.log('Document 1 rendered:', text1);
  console.log('Document 2 rendered:', text2);
  
  if (text1 === text2) {
    console.log('✓ Test passed: Simultaneous inserts converged');
    return true;
  } else {
    console.log('✗ Test failed: Simultaneous inserts diverged');
    return false;
  }
}

// Run tests
const test1 = testCrdtConvergence();
const test2 = testSimultaneousInsert();

if (test1 && test2) {
  console.log('\n✓ All CRDT tests passed!');
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
