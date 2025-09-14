const SubscriptionService = require('../subscription/SubscriptionService');
const userRepository = require('../server/UserRepository');

async function SubscriptionScreen(action, planId) {
  const service = new SubscriptionService();
  if (!userRepository.getCurrentUser()) {
    throw new Error('User not logged in');
  }
  if (planId === 'unlimited') {
    if (typeof window !== 'undefined') {
      window.location.href = 'premium.html';
    }
    return;
  }
  if (action === 'purchase') {
    return service.purchaseSubscription(planId);
  }
  if (action === 'restore') {
    return service.restorePurchases();
  }
  throw new Error('Unknown action');
}

module.exports = SubscriptionScreen;
