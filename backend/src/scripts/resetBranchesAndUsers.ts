import { AppDataSource, initializeDatabase } from '../data-source.js';
import { Branch } from '../entities/Branch.js';
import { User, UserRole } from '../entities/User.js';
import { saveLocalState } from '../pgMemSource.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔄 Initializing database to reset branches and users...');
  const ds = await initializeDatabase();

  const branchRepo = ds.getRepository(Branch);
  const userRepo = ds.getRepository(User);

  // 1. Clean Users: Delete all users except 'admin'
  const allUsers = await userRepo.find();
  for (const u of allUsers) {
    if (u.username !== 'admin') {
      await userRepo.remove(u);
      console.log(`🗑️ Removed user: ${u.username}`);
    }
  }

  // 2. Clean Branches: Keep HQ, set operational branch to القاهرة-الجيش
  const defaultBranchId = 'ec3638e9-2d00-4956-93fd-f9c31630fb94';
  const allBranches = await branchRepo.find();
  for (const b of allBranches) {
    if (b.code !== 'HQ' && b.id !== defaultBranchId) {
      await branchRepo.remove(b);
      console.log(`🗑️ Removed branch: ${b.name} (${b.code})`);
    }
  }

  // Ensure 'القاهرة-الجيش' exists with correct ID and active status
  let cairoGaysh = await branchRepo.findOne({ where: { id: defaultBranchId } });
  if (cairoGaysh) {
    cairoGaysh.name = 'القاهرة-الجيش';
    cairoGaysh.code = 'BR-GAYSH';
    cairoGaysh.address = 'شارع الجيش - القاهرة';
    cairoGaysh.phone = '01100000001';
    cairoGaysh.isActive = true;
    await branchRepo.save(cairoGaysh);
    console.log('✅ Updated existing branch to القاهرة-الجيش');
  } else {
    cairoGaysh = branchRepo.create({
      id: defaultBranchId,
      code: 'BR-GAYSH',
      name: 'القاهرة-الجيش',
      address: 'شارع الجيش - القاهرة',
      phone: '01100000001',
      isActive: true,
    });
    await branchRepo.save(cairoGaysh);
    console.log('✅ Created branch: القاهرة-الجيش');
  }

  // 3. Save clean state file
  await saveLocalState(ds);
  console.log('💾 Saved clean local state to disk.');

  const remainingBranches = await branchRepo.find();
  console.log('Active Branches:', remainingBranches.map(b => ({ id: b.id, code: b.code, name: b.name, isActive: b.isActive })));

  const remainingUsers = await userRepo.find();
  console.log('Active Users:', remainingUsers.map(u => ({ id: u.id, username: u.username, role: u.role })));
}

main().catch(console.error).finally(() => process.exit(0));
