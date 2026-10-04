import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const page = fs.readFileSync('dist/index.html', 'utf8');
const script = page.split('<script>')[1].split('</script>')[0];
const data = vm.runInNewContext(script.split('const $ =')[0] + ';groups');
const oldData = vm.runInNewContext(script.split('for (const addition of ')[0] + ';groups');
const words = data.flatMap(group => group.items);
const oldWords = oldData.flatMap(group => group.items);

assert.equal(data.length, oldData.length, 'no categories were added');
assert.equal(data.length, 34);
assert.equal(oldWords.length, 300);
assert.equal(words.length, 500);
assert.equal(new Set(words.map(word => word.ar)).size, 500);
assert.equal(new Set(words.map(word => word.number)).size, 500);
assert.deepEqual([...words.map(word => word.number)].sort((a, b) => a - b), Array.from({length: 500}, (_, i) => i + 1));
assert.equal(
  JSON.stringify(words.filter(word => word.number <= 300).map(word => [word.number, word.ar]).sort((a, b) => a[0] - b[0])),
  JSON.stringify(oldWords.map(word => [word.number, word.ar]).sort((a, b) => a[0] - b[0])),
  'the original 300 identifiers must stay attached to their headwords',
);
assert.ok(words.every(word => word.examples.length === 4 && word.examples.every(example => example.length === 2 && example.every(Boolean))));
assert.ok(words.every(word => new Set(word.examples.map(example => example[0])).size === 4));
console.log('Verified: 500 unique headwords, 2000 bilingual examples, unchanged categories and preserved identifiers 1–300.');
