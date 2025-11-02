import { AuthorizationError } from '../utils/errorHandler.js';

export class HierarchyService {
  async setReportingManager(trainerId, managerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new NotFoundError('Trainer not found');
    }

    const manager = await User.findById(managerId);
    if (!manager) {
      throw new NotFoundError('Manager not found');
    }

    // Remove from previous manager's subordinates
    if (trainer.reportingManager) {
      await User.findByIdAndUpdate(trainer.reportingManager, {
        $pull: { subordinates: trainerId },
      });
    }

    // Set new manager
    trainer.reportingManager = managerId;
    await trainer.save();

    // Add to new manager's subordinates
    await User.findByIdAndUpdate(managerId, {
      $addToSet: { subordinates: trainerId },
    });

    return trainer.toJSON();
  }

  async getHierarchy(managerId) {
    const manager = await User.findById(managerId)
      .populate('subordinates', 'username profile.firstName profile.lastName email');

    if (!manager) {
      throw new NotFoundError('Manager not found');
    }

    return {
      manager: manager.toJSON(),
      subordinates: manager.subordinates.map(s => s.toJSON()),
    };
  }

  async getSubordinates(managerId, recursive = false) {
    const manager = await User.findById(managerId);
    if (!manager) {
      throw new NotFoundError('Manager not found');
    }

    let subordinates = [];

    async function getDirectSubordinates(uid) {
      const user = await User.findById(uid).populate('subordinates');
      return user?.subordinates || [];
    }

    async function buildHierarchy(uid) {
      const subs = await getDirectSubordinates(uid);
      for (const sub of subs) {
        subordinates.push(sub.toJSON());
        if (recursive) {
          await buildHierarchy(sub._id);
        }
      }
    }

    await buildHierarchy(managerId);
    return subordinates;
  }

  async getHierarchyTree(managerId) {
    async function buildTree(userId) {
      const user = await User.findById(userId)
        .populate('subordinates', 'username profile.firstName profile.lastName');

      return {
        id: user._id,
        name: `${user.profile?.firstName} ${user.profile?.lastName}`,
        username: user.username,
        role: user.role,
        children: user.subordinates.length > 0 
          ? await Promise.all(user.subordinates.map(sub => buildTree(sub._id)))
          : [],
      };
    }

    return buildTree(managerId);
  }

  async updateHierarchy(hierarchyData) {
    const updates = [];

    for (const [trainerId, managerId] of Object.entries(hierarchyData)) {
      updates.push(this.setReportingManager(trainerId, managerId));
    }

    await Promise.all(updates);
    return { message: 'Hierarchy updated successfully' };
  }
}