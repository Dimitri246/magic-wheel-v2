function checkRenewals(subscriptions) {
  const now = Date.now();
  return subscriptions.filter(s => new Date(s.expires_at).getTime() <= now);
}

module.exports = { checkRenewals };
