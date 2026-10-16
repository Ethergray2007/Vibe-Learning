// Regression tests for output-based judging. UI behavior is verified in a real
// browser; the old app.js DOM stub does not apply to the React interface.
import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeRedPixel} from '../core.mjs';
const image=()=>Buffer.alloc(822);
function put(b,x,y,[r,g,blue]) { const n=54+(15-y)*48+x*3;b[n]=blue;b[n+1]=g;b[n+2]=r; }
test('red target on black background is AC',()=>{const b=image();put(b,4,6,[255,0,0]);assert.equal(judgeRedPixel(b).verdict,'AC');});
test('white and blue targets are WA',()=>{for(const color of [[255,255,255],[0,0,255]]){const b=image();put(b,4,6,color);assert.equal(judgeRedPixel(b).verdict,'WA');}});
test('coordinate transposition and vertical flip are WA',()=>{for(const [x,y] of [[6,4],[4,9]]){const b=image();put(b,x,y,[255,0,0]);assert.equal(judgeRedPixel(b).verdict,'WA');}});
test('extra nonblack pixel is WA even with correct target',()=>{const b=image();put(b,4,6,[255,0,0]);put(b,15,15,[0,1,0]);const r=judgeRedPixel(b);assert.equal(r.verdict,'WA');assert.equal(r.checks[0].passed,true);assert.equal(r.checks[1].passed,false);});
