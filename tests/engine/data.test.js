import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../../tools/data/validate.mjs';
import { data } from './helpers.js';

test('data files pass validation', () => {
  assert.deepEqual(validate(data), []);
});

test('validation catches broken data', () => {
  const broken = structuredClone(data);
  broken.crops.crops[1].id = broken.crops.crops[0].id;
  broken.crops.crops[2].phase_days = [1, 1];
  broken.crops.crops[3].sources = [];
  broken.machines.machines[0].products[2].input.item = 'no-such-crop';
  const errors = validate(broken);
  assert.ok(errors.some((e) => /duplicate id/.test(e)));
  assert.ok(errors.some((e) => /do not add up/.test(e)));
  assert.ok(errors.some((e) => /no sources/.test(e)));
  assert.ok(errors.some((e) => /not a crop/.test(e)));
});

test('every crop is cross-checked against at least two wiki pages', () => {
  const unverified = data.crops.crops.filter((c) => c.verification_status !== 'cross-checked').map((c) => c.name);
  assert.deepEqual(unverified, []);
  assert.equal(data.crops.crops.length, 44);
});
