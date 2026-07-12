import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSkillForgeSchema1718000000000 implements MigrationInterface {
  name = 'InitialSkillForgeSchema1718000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM('EMPLOYEE', 'MANAGER', 'CONTENT_ADMIN', 'HR_ADMIN');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "enrolments_status_enum" AS ENUM('Not Started', 'In Progress', 'Pending Quiz', 'Passed', 'Failed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "questions_type_enum" AS ENUM('MCQ', 'SHORT_ANSWER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "companies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "companyId" uuid,
        CONSTRAINT "PK_departments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "departmentId" uuid,
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'EMPLOYEE',
        "refreshTokenHash" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "teamId" uuid,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "estimatedDuration" character varying NOT NULL,
        "isMandatory" boolean NOT NULL DEFAULT false,
        "regulatoryDeadline" date,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_courses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "enrolments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" "enrolments_status_enum" NOT NULL DEFAULT 'Not Started',
        "enrolledAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid,
        "courseId" uuid,
        CONSTRAINT "PK_enrolments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quizzes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "passThreshold" integer NOT NULL DEFAULT 75,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "courseId" uuid,
        CONSTRAINT "PK_quizzes" PRIMARY KEY ("id"),
        CONSTRAINT "REL_quizzes_course" UNIQUE ("courseId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "questions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "questions_type_enum" NOT NULL,
        "text" text NOT NULL,
        "options" text,
        "correctAnswer" character varying NOT NULL,
        "explanation" text,
        "quizId" uuid,
        CONSTRAINT "PK_questions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "quizId"`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "refreshTokenHash" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "FK_questions_quiz"`);
    await queryRunner.query(`ALTER TABLE "quizzes" DROP CONSTRAINT IF EXISTS "FK_quizzes_course"`);
    await queryRunner.query(`ALTER TABLE "enrolments" DROP CONSTRAINT IF EXISTS "FK_enrolments_course"`);
    await queryRunner.query(`ALTER TABLE "enrolments" DROP CONSTRAINT IF EXISTS "FK_enrolments_user"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_team"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "FK_teams_department"`);
    await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "FK_departments_company"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quizzes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enrolments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);
  }
}
