import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/items');
    const text = await res.text();
    console.log(text.substring(0, 100)); // Should be JSON
  } catch(e) {
    console.log(e);
  }
}
test();
