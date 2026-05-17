import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heuristicAnalyze, defaultCategory, defaultTags } from '../src/analyze/heuristic.ts';

test('heuristic flags military / risk content', () => {
  const a = heuristicAnalyze({
    title: 'Missile strike hits military base, troops killed',
    summary: 'A missile attack on a military base killed several soldiers amid escalating tensions.',
    domain: 'bbc.com',
  });
  assert.ok(a.riskScore >= 40, `risk should be high, got ${a.riskScore}`);
  assert.ok(a.militaryRelevance >= 40, `military should be high, got ${a.militaryRelevance}`);
  assert.equal(a.sentiment, 'negative');
  assert.equal(a.narrativeBias, 'center');
});

test('heuristic flags market content', () => {
  const a = heuristicAnalyze({
    title: 'Fed signals rate cut as inflation eases, stocks rally',
    summary: 'The central bank hinted at a rate cut as inflation eased, lifting the stock market.',
    domain: 'investing.com',
  });
  assert.ok(a.marketImpact >= 30, `market should be elevated, got ${a.marketImpact}`);
});

test('heuristic returns clamped 0-100 scores', () => {
  const a = heuristicAnalyze({ title: 'hi', summary: '', domain: 'bbc.com' });
  for (const k of ['importanceScore', 'riskScore', 'credibility', 'geopoliticalImpact', 'marketImpact', 'militaryRelevance'] as const) {
    assert.ok(a[k] >= 0 && a[k] <= 100, `${k} out of range: ${a[k]}`);
  }
});

test('state sources get state bias', () => {
  const a = heuristicAnalyze({ title: 'x', summary: 'y', domain: 'tass.com' });
  assert.equal(a.narrativeBias, 'state');
});

test('defaultCategory routes by keywords', () => {
  assert.equal(defaultCategory({ title: 'Stock market surges', description: '', categories: [] }), 'business');
  assert.equal(defaultCategory({ title: 'Election results', description: '', categories: [] }), 'politics');
  assert.equal(defaultCategory({ title: 'Random news', description: '', categories: [] }), 'world');
  assert.equal(defaultCategory({ title: 'x', description: '', categories: ['sports'] }), 'sports');
});

test('defaultTags surfaces matched keywords', () => {
  const tags = defaultTags({ title: 'Sanctions and war push markets lower', description: '' });
  assert.ok(tags.includes('sanction') || tags.includes('war') || tags.includes('market'));
});
