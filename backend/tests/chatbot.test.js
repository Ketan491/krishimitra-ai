const test = require('node:test');
const assert = require('node:assert');
const chatbot = require('../knowledge/chatbot');

test('chatbot gives crop-specific guidance for a direct crop question', () => {
  const reply = chatbot.answer('How do I grow wheat?');
  assert.match(reply, /Wheat/);
  assert.match(reply, /Sowing/);
});

test("BUGFIX regression: 'market price' must NOT be misread as the crop 'Rice'", () => {
  const reply = chatbot.answer('what is the market price today');
  assert.doesNotMatch(reply, /Rice \(Paddy\)/, 'should not misfire on the crop Rice');
  assert.match(reply, /Market/i);
});

test("BUGFIX regression: 'future of farming' must NOT be misread as the crop 'Tur'", () => {
  const reply = chatbot.answer('what is the future of farming in India');
  assert.doesNotMatch(reply, /Tur \(Pigeon Pea\)/, 'should not misfire on the crop Tur');
});

test('chatbot answers a scheme question with real scheme names', () => {
  const reply = chatbot.answer('tell me about government schemes');
  assert.match(reply, /PM-KISAN|scheme/i);
});

test('chatbot gives a helpful fallback for unrelated questions', () => {
  const reply = chatbot.answer('asdkjaslkdj random gibberish');
  assert.match(reply, /not fully sure/i);
});
