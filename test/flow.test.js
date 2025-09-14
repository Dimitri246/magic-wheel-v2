const assert = require('assert');
const { LoginScreen, Provider } = require('../ui/LoginScreen');
const SubscriptionScreen = require('../ui/SubscriptionScreen');
const userRepository = require('../server/UserRepository');

(async () => {
  userRepository.clearCurrentUser();
  let caught;
  try {
    await SubscriptionScreen('purchase', 'basic');
  } catch (e) {
    caught = e;
  }
  assert.ok(caught instanceof Error, 'should throw when not logged in');
  assert.strictEqual(caught.message, 'User not logged in');

  await LoginScreen(Provider.GOOGLE);
  const current = userRepository.getCurrentUser();
  assert.strictEqual(typeof current.email, 'string');
  assert.strictEqual(typeof current.token, 'string');

  const res = await SubscriptionScreen('purchase', 'premium');
  assert.strictEqual(res.status, 'purchased');
  console.log('Login and subscription flow works');
})();
