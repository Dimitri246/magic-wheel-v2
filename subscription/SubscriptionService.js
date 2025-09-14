class SubscriptionService {
  async purchaseSubscription(planId) {
    // Simulated purchase logic
    return { planId, status: 'purchased' };
  }

  async restorePurchases() {
    // Simulated restoration
    return [];
  }
}

module.exports = SubscriptionService;
