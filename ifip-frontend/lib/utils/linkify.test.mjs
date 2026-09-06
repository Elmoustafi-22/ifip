import test from 'node:test';
import assert from 'node:assert/strict';
import { linkifyText } from './linkify.js';

test('linkifyText transforms bare URLs into clickable anchors', () => {
  const output = linkifyText('Visit https://example.com/course and www.example.org for details.');
  assert.equal(
    output,
    'Visit <a href="https://example.com/course" target="_blank" rel="noopener noreferrer">https://example.com/course</a> and <a href="https://www.example.org" target="_blank" rel="noopener noreferrer">www.example.org</a> for details.'
  );
});

test('linkifyText leaves plain text unchanged when no URL is present', () => {
  const output = linkifyText('Please complete the certificate task before finishing.');
  assert.equal(output, 'Please complete the certificate task before finishing.');
});
