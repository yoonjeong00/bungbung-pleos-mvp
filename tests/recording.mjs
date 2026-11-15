import assert from 'node:assert/strict';
import {recordingCommand} from '../dist/js/recording.js';
for(const code of ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit7','Digit0','KeyM','KeyF'])assert.ok(recordingCommand({code}));
for(const flag of ['repeat','isComposing','ctrlKey','metaKey','altKey','shiftKey'])assert.equal(recordingCommand({code:'Digit1',[flag]:true}),null);
assert.equal(recordingCommand({code:'Digit1',target:{closest:()=>({tagName:'INPUT'})}}),null,'typing a name cannot restart the demo');
assert.equal(recordingCommand({code:'Space'}),null,'ordinary controls retain keyboard behavior');
console.log('PASS recording shortcuts: typing, IME, repeats and browser shortcuts are protected');
