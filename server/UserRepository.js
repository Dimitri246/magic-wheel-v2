class UserRepository {
  constructor() {
    this.users = new Map();
    this.currentUser = null;
  }

  create({ id, email, provider }) {
    const user = { id, email, provider, created_at: new Date() };
    this.users.set(id, user);
    return user;
  }

  find(id) {
    return this.users.get(id);
  }

  setCurrentUser({ token, email }) {
    this.currentUser = { token, email };
  }

  getCurrentUser() {
    return this.currentUser;
  }

  clearCurrentUser() {
    this.currentUser = null;
  }
}

module.exports = new UserRepository();
