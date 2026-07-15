import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { Company } from '../../companies/entities/company.entity';
import { Department } from '../../departments/entities/department.entity';
import { Team } from '../../teams/entities/team.entity';
import { User, UserRole } from '../../users/entities/user.entity';

dotenv.config({ path: join(__dirname, '../../../.env') });

const DEPARTMENTS = [
  'Finance & Accounting',
  'Risk & Compliance',
  'Operations',
  'Technology',
  'Human Resources',
  'Client Services',
];

const DEMO_USERS = [
  {
    fullName: 'Jordan Ellis',
    email: 'employee@nexara.com',
    role: UserRole.EMPLOYEE,
    teamIndex: 0,
  },
  {
    fullName: 'Samira Khan',
    email: 'manager@nexara.com',
    role: UserRole.MANAGER,
    teamIndex: 1,
  },
  {
    fullName: 'Chris Palmer',
    email: 'content@nexara.com',
    role: UserRole.CONTENT_ADMIN,
    teamIndex: 2,
  },
  {
    fullName: 'Riley Chen',
    email: 'hr@nexara.com',
    role: UserRole.HR_ADMIN,
    teamIndex: 3,
  },
];

const DEMO_PASSWORD = 'DemoPass123!';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [Company, Department, Team, User],
    ssl: true,
    extra: { ssl: { rejectUnauthorized: false } },
  });

  await dataSource.initialize();
  const companyRepo = dataSource.getRepository(Company);
  const deptRepo = dataSource.getRepository(Department);
  const teamRepo = dataSource.getRepository(Team);
  const userRepo = dataSource.getRepository(User);

  let company = await companyRepo.findOne({ where: { name: 'Nexara Group' } });
  if (!company) {
    company = await companyRepo.save(companyRepo.create({ name: 'Nexara Group' }));
    console.log('Created company: Nexara Group');
  } else {
    console.log('Company already exists: Nexara Group');
  }

  const teams: Team[] = [];
  for (const deptName of DEPARTMENTS) {
    let department = await deptRepo.findOne({
      where: { name: deptName, company: { id: company.id } },
      relations: { company: true },
    });
    if (!department) {
      department = await deptRepo.save(
        deptRepo.create({ name: deptName, company }),
      );
      console.log(`Created department: ${deptName}`);
    }

    const teamName = `${deptName} Team A`;
    let team = await teamRepo.findOne({
      where: { name: teamName, department: { id: department.id } },
      relations: { department: true },
    });
    if (!team) {
      team = await teamRepo.save(teamRepo.create({ name: teamName, department }));
      console.log(`Created team: ${teamName}`);
    }
    teams.push(team);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const demo of DEMO_USERS) {
    const existing = await userRepo.findOne({ where: { email: demo.email } });
    if (existing) {
      console.log(`User already exists: ${demo.email}`);
      continue;
    }
    const team = teams[demo.teamIndex % teams.length];
    await userRepo.save(
      userRepo.create({
        fullName: demo.fullName,
        email: demo.email,
        password: passwordHash,
        role: demo.role,
        team,
      }),
    );
    console.log(`Created user: ${demo.email} (${demo.role})`);
  }

  await dataSource.destroy();
  console.log('\nSeed complete. Demo password for all users:', DEMO_PASSWORD);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
