const GoogleAuth = require('./GoogleAuth');
const AppleAuth = require('./AppleAuth');

const Provider = {
  GOOGLE: 'google',
  APPLE: 'apple'
};

class AuthRepository {
  async signIn(provider) {
    switch (provider) {
      case Provider.GOOGLE:
        return new GoogleAuth().signIn();
      case Provider.APPLE:
        return new AppleAuth().signIn();
      default:
        throw new Error('Unknown provider');
    }
  }
}

module.exports = { AuthRepository, Provider };
