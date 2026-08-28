'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'death-watchdog.js'), 'utf8');
let scheduledCheck = null;
const listeners = new Map();
let ticks = 0;

const context = {
    ChronoDeathBridge: { tick() { ticks += 1; } },
    setInterval(callback, delay) {
        assert.equal(delay, 100);
        scheduledCheck = callback;
        return 1;
    },
    addEventListener(event, callback) {
        listeners.set(event, callback);
    }
};
context.globalThis = context;

vm.runInNewContext(source, context);
assert.equal(typeof scheduledCheck, 'function');
scheduledCheck();
listeners.get('error')();
listeners.get('unhandledrejection')();
listeners.get('pageshow')();
assert.equal(ticks, 4);

console.log('independent death watchdog test passed');
