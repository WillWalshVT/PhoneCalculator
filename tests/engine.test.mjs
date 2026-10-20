import test from 'node:test';import assert from 'node:assert/strict';import {createCalculator} from '../src/engine.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
test('complex arithmetic, engineering notation and implicit multiplication',()=>{const c=createCalculator();const v=c.evaluate('(3+4j)*(2-j)');near(v.re,10);near(v.im,5);near(c.evaluate('1e3 + 2e-3'),1000.002);near(c.evaluate('abs(3+4j)'),5);});
test('polar entry, degrees and radians',()=>{const c=createCalculator();let v=c.evaluate('5∠90');near(v.re,0);near(v.im,5);near(c.evaluate('arg(3+4j)'),53.13010235415598);near(c.evaluate('sin(30)'),.5);near(c.evaluate('asin(0.5)'),30);c.setAngle('RAD');near(c.evaluate('sin(pi/2)'),1);v=c.evaluate('polar(2,pi)');near(v.re,-2);near(v.im,0);});
test('complex logarithms, roots, trig, and conjugates',()=>{const c=createCalculator();near(c.evaluate('sqrt(-1)').im,1);near(c.evaluate('log(-1)').im,Math.PI);near(c.evaluate('conj(3+4j)').im,-4);c.setAngle('RAD');near(c.evaluate('sin(j)').im,Math.sinh(1));});
test('variables, ans, reset and independent modes',()=>{const c=createCalculator(),d=createCalculator();c.evaluate('z=3+4j');near(c.evaluate('abs(z)'),5);near(c.evaluate('ans*2'),10);c.setAngle('RAD');near(d.evaluate('sin(30)'),.5);c.reset();assert.throws(()=>c.evaluate('z'));});
test('EE helpers',()=>{const c=createCalculator();near(c.evaluate('parallel(100,100)'),50);near(c.evaluate('db(10)'),20);near(c.evaluate('db10(10)'),10);near(c.evaluate('fromdb(20)'),10);near(c.evaluate('rms(10)'),10/Math.sqrt(2));});
test('precedence, factorial, undefined and unsafe expressions',()=>{const c=createCalculator();near(c.evaluate('-2^2'),-4);near(c.evaluate('factorial(5)'),120);near(c.evaluate('5!'),120);near(c.evaluate('factorial(2+3)'),120);near(c.evaluate('combinations(5,2)'),10);for(const expression of ['1/0','factorial(10000)','import("x")','a(x)=x','[1,2,3]','sin=4','ans=2'])assert.throws(()=>c.evaluate(expression),expression);});
test('rectangular and polar formatting',()=>{const c=createCalculator();assert.equal(c.format(c.evaluate('3+4j')),'3 + 4j');assert.equal(c.format(c.evaluate('-j')),'−1j');assert.match(c.format(c.evaluate('j'),'POLAR'),/1 ∠ 90°/);});

test("state persists exact values across angle changes",()=>{const c=createCalculator();c.evaluate("z=polar(5,90)");const d=createCalculator();d.setAngle("RAD");d.restoreState(c.exportState());near(d.evaluate("im(z)"),5);});

test('engineering-scale small values remain visible',()=>{const c=createCalculator();assert.equal(c.format(c.evaluate('1e-15')),'1e-15');assert.equal(c.format(c.evaluate('1e-15j')),'1e-15j');assert.equal(c.format(c.evaluate('polar(5,90)')),'5j');});

test('invalid assignments do not corrupt variables',()=>{const c=createCalculator();c.evaluate('z=5');assert.throws(()=>c.evaluate('z=1/0'));near(c.evaluate('z'),5);});
