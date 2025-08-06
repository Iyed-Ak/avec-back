const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    enum: ['logout', 'password_change', 'admin_revoked', 'security_breach'],
    default: 'logout'
  },
  revokedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

tokenBlacklistSchema.index({ token: 1, expiresAt: 1 });
tokenBlacklistSchema.index({ adminId: 1, revokedAt: -1 });

tokenBlacklistSchema.statics.isTokenBlacklisted = async function(token) {
  try {
    const blacklistedToken = await this.findOne({ 
      token,
      expiresAt: { $gt: new Date() }
    });
    return !!blacklistedToken;
  } catch (error) {
    console.error('Erreur vérification blacklist:', error);
    return false;
  }
};

tokenBlacklistSchema.statics.blacklistToken = async function(tokenData) {
  try {
    const blacklistEntry = new this(tokenData);
    await blacklistEntry.save();
    
    console.log(`[SECURITY] Token blacklisté - Admin: ${tokenData.adminEmail} - Raison: ${tokenData.reason} - ${new Date().toISOString()}`);
    
    return blacklistEntry;
  } catch (error) {
    if (error.code === 11000) {
      console.log(`[SECURITY] Token déjà blacklisté - ${new Date().toISOString()}`);
      return null;
    }
    throw error;
  }
};

tokenBlacklistSchema.statics.blacklistAllUserTokens = async function(adminId, reason = 'admin_revoked', revokedBy = null) {
  try {
    const Admin = mongoose.model('Admin');
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      throw new Error('Admin non trouvé');
    }
    
    const blacklistEntry = new this({
      token: `ALL_TOKENS_${adminId}_${Date.now()}`,
      adminId,
      adminEmail: admin.email,
      reason,
      revokedBy,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    });
    
    await blacklistEntry.save();
    
    console.log(`[SECURITY] Tous les tokens blacklistés pour admin: ${admin.email} - Raison: ${reason} - ${new Date().toISOString()}`);
    
    return blacklistEntry;
  } catch (error) {
    console.error('Erreur blacklist tous tokens:', error);
    throw error;
  }
};

tokenBlacklistSchema.statics.cleanupExpiredTokens = async function() {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    if (result.deletedCount > 0) {
      console.log(`[SECURITY] ${result.deletedCount} tokens expirés supprimés de la blacklist - ${new Date().toISOString()}`);
    }
    
    return result.deletedCount;
  } catch (error) {
    console.error('Erreur nettoyage blacklist:', error);
    return 0;
  }
};

tokenBlacklistSchema.statics.getBlacklistStats = async function() {
  try {
    const total = await this.countDocuments();
    const active = await this.countDocuments({ expiresAt: { $gt: new Date() } });
    const expired = total - active;
    
    const reasonStats = await this.aggregate([
      { $match: { expiresAt: { $gt: new Date() } } },
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ]);
    
    return {
      total,
      active,
      expired,
      byReason: reasonStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Erreur stats blacklist:', error);
    return { total: 0, active: 0, expired: 0, byReason: {} };
  }
};

if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    try {
      const TokenBlacklist = mongoose.model('TokenBlacklist');
      await TokenBlacklist.cleanupExpiredTokens();
    } catch (error) {
      console.error('Erreur nettoyage automatique blacklist:', error);
    }
  }, 60 * 60 * 1000); // 1 heure
}

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
