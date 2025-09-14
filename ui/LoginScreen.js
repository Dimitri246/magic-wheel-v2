const { AuthRepository, Provider } = require('../auth/AuthRepository');
const userRepository = require('../server/UserRepository');

async function LoginScreen(provider) {
  const repo = new AuthRepository();
  const credentials = await repo.signIn(provider);
  userRepository.setCurrentUser(credentials);
  return credentials;
}

module.exports = { LoginScreen, Provider };
