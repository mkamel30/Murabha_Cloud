import { AppDataSource } from '../data-source.js';
import { Branch } from '../entities/Branch.js';
import { User, UserRole } from '../entities/User.js';
import { hashPassword } from '../utils/auth.js';

export async function ensureInitialSeed(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const branchRepo = AppDataSource.getRepository(Branch);

  const userCount = await userRepo.count();
  if (userCount > 0) {
    return; // Already initialized
  }

  console.log('[Seed] First run detected: initializing default HQ branch and Super Admin...');

  // 1. Create Default HQ Branch
  let hqBranch = await branchRepo.findOne({ where: { code: 'HQ' } });
  if (!hqBranch) {
    hqBranch = branchRepo.create({
      code: 'HQ',
      name: 'المقر الرئيسي (HQ)',
      address: 'القاهرة - مصر',
      phone: '01000000000',
      isActive: true,
    });
    await branchRepo.save(hqBranch);
    console.log('[Seed] ✅ Created default HQ Branch');
  }

  // 2. Create Initial Operational Branch: القاهرة-الجيش
  const defaultBranchId = 'ec3638e9-2d00-4956-93fd-f9c31630fb94';
  let branch1 = await branchRepo.findOne({ where: { id: defaultBranchId } });
  if (!branch1) {
    branch1 = branchRepo.create({
      id: defaultBranchId,
      code: 'BR-GAYSH',
      name: 'القاهرة-الجيش',
      address: 'شارع الجيش - القاهرة',
      phone: '01100000001',
      isActive: true,
    });
    await branchRepo.save(branch1);
    console.log('[Seed] ✅ Created Branch: القاهرة-الجيش');
  }

  // 3. Create Super Admin User
  const defaultAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@2026!';
  const hashedPassword = await hashPassword(defaultAdminPassword);

  const superAdmin = userRepo.create({
    username: 'admin',
    name: 'مدير النظام العام',
    email: 'admin@murabha.cloud',
    password: hashedPassword,
    role: UserRole.SUPER_ADMIN,
    branchId: null, // HQ level
    isActive: true,
  });
  await userRepo.save(superAdmin);
  console.log('[Seed] ✅ Created Super Admin user: username: "admin"');
}
