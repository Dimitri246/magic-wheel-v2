const assert = require('assert');
const { AuthRepository, Provider } = require('../auth/AuthRepository');

(async () => {
  const repo = new AuthRepository();
  const res = await repo.signIn(Provider.GOOGLE);
  assert.strictEqual(typeof res.email, 'string');
  assert.strictEqual(typeof res.token, 'string');
  console.log('AuthRepository.signIn returns email and token');
})();
