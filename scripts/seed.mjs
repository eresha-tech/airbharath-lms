import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../lib/db/schema.ts';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres@localhost:5433/airbharath_lms';
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding local database...');

  // 1. Create Admin & Student User
  const [adminUser] = await db.insert(schema.users).values({
    phone: '+919999999999',
    email: 'admin@airbharath.in',
    fullName: 'Captain Vikram Singh (Admin)',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400',
    role: 'admin',
  }).onConflictDoNothing().returning();

  const [studentUser] = await db.insert(schema.users).values({
    phone: '+919876543210',
    email: 'student@airbharath.in',
    fullName: 'Rahul Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    role: 'student',
  }).onConflictDoNothing().returning();

  const adminId = adminUser?.id;

  // 2. Create Sample Courses
  const [course1] = await db.insert(schema.courses).values({
    title: 'Private Pilot License (PPL) Theory & Navigation',
    slug: 'ppl-theory-navigation',
    description: 'Master aeronautical navigation, flight planning, air regulations, and meteorology essential for clearing DGCA PPL examinations.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519074069444-1ba4eff56022?w=800',
    price: '14999.00',
    accessDays: 365,
    isPublished: true,
    instructorId: adminId,
  }).returning();

  const [course2] = await db.insert(schema.courses).values({
    title: 'Commercial Pilot License (CPL) Meteorology & Flight Instruments',
    slug: 'cpl-meteorology-instruments',
    description: 'Comprehensive ground school training covering synoptic charts, jet streams, altimetry, glass cockpit systems, and ILS approach procedures.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
    price: '24999.00',
    accessDays: 730,
    isPublished: true,
    instructorId: adminId,
  }).returning();

  // 3. Create Modules & Lessons for Course 1
  if (course1) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'Module 1: Principles of Aircraft Flight & Aerodynamics',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'Module 2: Air Navigation & Radio Aids',
      orderIndex: 2,
    }).returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'Lesson 1.1: Lift, Drag, and Bernoulli\'s Principle',
          content: '<p>Welcome to Module 1! In this lesson we analyze how pressure differentials across cambered airfoils generate aerodynamic lift.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
        {
          moduleId: mod1.id,
          title: 'Lesson 1.2: Aircraft Stability & Control Surfaces',
          content: '<p>Understanding pitch, roll, and yaw stability using elevators, ailerons, and rudders.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 2,
        },
      ]);
    }

    if (mod2) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod2.id,
          title: 'Lesson 2.1: VOR & NDB Navigation Tracking',
          content: '<p>Reading radial radials from VOR stations and computing magnetic track offsets.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 1,
        },
      ]);
    }
  }

  // 4. Create Sample Job Postings
  await db.insert(schema.jobs).values([
    {
      title: 'Junior Flight Operations Executive',
      company: 'Airbharath Aviation',
      location: 'New Delhi (IGI Airport)',
      description: 'Responsible for crew scheduling, flight dispatch coordination, and route weather monitoring.',
      link: 'https://careers.airbharath.in/jobs/op-101',
      postedBy: adminId,
    },
    {
      title: 'Trainee Pilot - Cadet Program',
      company: 'IndiGo Airlines Partner',
      location: 'Gurugram / Hybrid',
      description: 'Requirement: Minimum PPL/CPL ground school training completed with 80%+ assessment score.',
      link: 'https://careers.airbharath.in/jobs/cadet-2026',
      postedBy: adminId,
    },
  ]);

  // 5. Create Sample Feed Post
  await db.insert(schema.feedPosts).values({
    content: '🎉 Welcome to the revamped Airbharath LMS platform! Access your aviation ground school courses, verified DGCA certificates, and job board updates right from your student dashboard.',
    imageUrl: 'https://images.unsplash.com/photo-1519074069444-1ba4eff56022?w=800',
    authorId: adminId,
  });

  // 6. Sample Coupon Code
  await db.insert(schema.coupons).values({
    code: 'AIRBHARATH20',
    discountType: 'percentage',
    discountValue: '20.00',
    usageLimit: 500,
  });

  console.log('✅ Local database seeded successfully!');
  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
